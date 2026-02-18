"""TapRanked — NFC Loyalty Stamp Card (Flask port).

Routes
------
GET  /tap?nfc=TAG            → phone entry form (tap_landing.html)
POST /tap                    → collect stamp, show result (tap_success.html)
GET  /dashboard?phone=PHONE  → customer loyalty dashboard
GET  /staff?shop_id=TAG&pin=PIN&phone=PHONE → staff redemption portal
POST /redeem                 → redeem a reward (staff action)
GET  /add-to-apple-wallet    → download .pkpass
GET  /add-to-google-wallet   → redirect to Google save URL
/wallet/v1/...               → Apple Wallet web service callbacks
"""

import logging
import os
import threading

from flask import (
    Flask,
    abort,
    g,
    jsonify,
    redirect,
    render_template,
    request,
    send_file,
    url_for,
)
from io import BytesIO

from db import P, close_db, commit, execute, get_db, init_db, uid
from wallet.apple import generate_pkpass, push_update_for_card as apple_push
from wallet.google import (
    ensure_loyalty_class,
    generate_save_url,
    push_update_for_card as google_push,
)

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "dev-secret-change-me")

logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)

app.teardown_appcontext(close_db)

# Create tables + seed data on startup
with app.app_context():
    init_db()

# Try to create Google Wallet loyalty class in the background
threading.Thread(target=lambda: ensure_loyalty_class(), daemon=True).start()

# ---------------------------------------------------------------------------
# HTTPS redirect (Heroku)
# ---------------------------------------------------------------------------

@app.before_request
def _force_https():
    if os.environ.get("ENFORCE_HTTPS", "").lower() == "true":
        if request.headers.get("X-Forwarded-Proto", "https") != "https":
            return redirect(request.url.replace("http://", "https://", 1), code=301)


# ---------------------------------------------------------------------------
# Tap flow
# ---------------------------------------------------------------------------

@app.route("/tap", methods=["GET"])
def tap_landing():
    """Show phone-entry form for an NFC tag."""
    nfc = request.args.get("nfc", "").strip()
    if not nfc:
        abort(400, "Missing nfc parameter")

    db = get_db()
    shop = execute(db, f"SELECT * FROM shops WHERE nfc_tag = {P}", (nfc,)).fetchone()
    if not shop:
        abort(404, "Shop not found")

    return render_template("tap_landing.html", shop=shop, nfc=nfc)


@app.route("/tap", methods=["POST"])
def tap_stamp():
    """Collect a stamp for the given phone + NFC tag."""
    nfc = request.form.get("nfc", "").strip()
    phone = request.form.get("phone", "").strip()

    if not nfc or not phone:
        abort(400, "Missing nfc or phone")

    db = get_db()
    shop = execute(db, f"SELECT * FROM shops WHERE nfc_tag = {P}", (nfc,)).fetchone()
    if not shop:
        abort(404, "Shop not found")

    shop_id = shop["id"]
    max_stamps = shop["max_stamps"]

    # Find or create card
    card = execute(
        db,
        f"SELECT * FROM cards WHERE phone = {P} AND shop_id = {P}",
        (phone, shop_id),
    ).fetchone()

    if card is None:
        card_id = uid()
        execute(
            db,
            f"INSERT INTO cards (id, phone, shop_id, current_stamps, total_stamps, rewards_earned, rewards_redeemed) "
            f"VALUES ({P},{P},{P},0,0,0,0)",
            (card_id, phone, shop_id),
        )
        commit(db)
        card = execute(db, f"SELECT * FROM cards WHERE id = {P}", (card_id,)).fetchone()
    else:
        card_id = card["id"]

    # Add stamp
    new_current = card["current_stamps"] + 1
    new_total = card["total_stamps"] + 1
    reward_earned = False

    if new_current >= max_stamps:
        new_current = 0
        reward_earned = True
        execute(
            db,
            f"UPDATE cards SET current_stamps = {P}, total_stamps = {P}, "
            f"rewards_earned = rewards_earned + 1 WHERE id = {P}",
            (new_current, new_total, card_id),
        )
    else:
        execute(
            db,
            f"UPDATE cards SET current_stamps = {P}, total_stamps = {P} WHERE id = {P}",
            (new_current, new_total, card_id),
        )

    # Log the stamp
    execute(
        db,
        f"INSERT INTO stamp_log (id, card_id) VALUES ({P},{P})",
        (uid(), card_id),
    )
    commit(db)

    # Refresh card after update
    card = execute(db, f"SELECT * FROM cards WHERE id = {P}", (card_id,)).fetchone()

    # Push wallet updates in background
    threading.Thread(target=_push_wallet_updates, args=(card_id,), daemon=True).start()

    return render_template(
        "tap_success.html",
        shop=shop,
        card=card,
        phone=phone,
        reward_earned=reward_earned,
    )


def _push_wallet_updates(card_id):
    """Send push updates to Apple + Google wallets (background thread)."""
    from db import get_standalone_db

    try:
        db = get_standalone_db()
        apple_push(db, card_id)
        google_push(db, card_id)
        db.close()
    except Exception:
        log.exception("wallet_push_error card_id=%s", card_id)


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------

@app.route("/dashboard")
def dashboard():
    """Customer loyalty dashboard — shows all cards for a phone number."""
    phone = request.args.get("phone", "").strip()

    if not phone:
        return render_template("dashboard.html", phone=None, cards=[], error=None)

    db = get_db()
    rows = execute(
        db,
        f"SELECT c.*, s.name AS shop_name, s.max_stamps, s.reward, s.nfc_tag "
        f"FROM cards c JOIN shops s ON c.shop_id = s.id "
        f"WHERE c.phone = {P} ORDER BY c.total_stamps DESC",
        (phone,),
    ).fetchall()

    cards = [dict(r) for r in rows]
    return render_template("dashboard.html", phone=phone, cards=cards, error=None)


# ---------------------------------------------------------------------------
# Staff redemption
# ---------------------------------------------------------------------------

@app.route("/staff")
def staff_portal():
    """Staff redemption portal — look up customer card and redeem rewards."""
    shop_nfc = request.args.get("shop_id", "").strip()
    pin = request.args.get("pin", "").strip()
    phone = request.args.get("phone", "").strip()

    expected_pin = os.environ.get("STAFF_PIN", "0000")
    if pin != expected_pin:
        abort(403, "Invalid PIN")

    db = get_db()
    shop = execute(db, f"SELECT * FROM shops WHERE nfc_tag = {P}", (shop_nfc,)).fetchone()
    if not shop:
        abort(404, "Shop not found")

    card = None
    available = 0
    history = []

    if phone:
        card = execute(
            db,
            f"SELECT c.*, s.max_stamps FROM cards c JOIN shops s ON c.shop_id = s.id "
            f"WHERE c.phone = {P} AND c.shop_id = {P}",
            (phone, shop["id"]),
        ).fetchone()

        if card:
            card = dict(card)
            available = card["rewards_earned"] - (card["rewards_redeemed"] or 0)
            history = execute(
                db,
                f"SELECT * FROM redemptions WHERE card_id = {P} ORDER BY redeemed_at DESC",
                (card["id"],),
            ).fetchall()

    return render_template(
        "staff.html",
        shop=shop,
        pin=pin,
        phone=phone,
        card=card,
        available=available,
        history=history,
        success=request.args.get("success"),
        error=request.args.get("error"),
    )


@app.route("/redeem", methods=["POST"])
def redeem():
    """Redeem one reward for a customer."""
    shop_nfc = request.form.get("shop_id", "").strip()
    pin = request.form.get("pin", "").strip()
    phone = request.form.get("phone", "").strip()
    staff_note = request.form.get("staff_note", "").strip()

    expected_pin = os.environ.get("STAFF_PIN", "0000")
    if pin != expected_pin:
        abort(403, "Invalid PIN")

    db = get_db()
    shop = execute(db, f"SELECT * FROM shops WHERE nfc_tag = {P}", (shop_nfc,)).fetchone()
    if not shop:
        abort(404, "Shop not found")

    card = execute(
        db,
        f"SELECT * FROM cards WHERE phone = {P} AND shop_id = {P}",
        (phone, shop["id"]),
    ).fetchone()

    if not card:
        return redirect(
            url_for("staff_portal", shop_id=shop_nfc, pin=pin, phone=phone, error="Card not found")
        )

    available = card["rewards_earned"] - (card["rewards_redeemed"] or 0)
    if available <= 0:
        return redirect(
            url_for("staff_portal", shop_id=shop_nfc, pin=pin, phone=phone, error="No rewards to redeem")
        )

    execute(
        db,
        f"UPDATE cards SET rewards_redeemed = rewards_redeemed + 1 WHERE id = {P}",
        (card["id"],),
    )
    execute(
        db,
        f"INSERT INTO redemptions (id, card_id, staff_note) VALUES ({P},{P},{P})",
        (uid(), card["id"], staff_note or None),
    )
    commit(db)

    threading.Thread(target=_push_wallet_updates, args=(card["id"],), daemon=True).start()

    return redirect(
        url_for(
            "staff_portal",
            shop_id=shop_nfc,
            pin=pin,
            phone=phone,
            success=f"Redeemed {shop['reward']} for {phone}",
        )
    )


# ---------------------------------------------------------------------------
# Apple Wallet
# ---------------------------------------------------------------------------

@app.route("/add-to-apple-wallet")
def add_to_apple_wallet():
    """Generate and download a .pkpass file."""
    phone = request.args.get("phone", "").strip()
    shop_id = request.args.get("shop_id", "").strip()

    if not phone or not shop_id:
        abort(400, "Missing phone or shop_id")

    db = get_db()
    shop = execute(db, f"SELECT * FROM shops WHERE id = {P}", (shop_id,)).fetchone()
    if not shop:
        abort(404, "Shop not found")

    card = execute(
        db,
        f"SELECT * FROM cards WHERE phone = {P} AND shop_id = {P}",
        (phone, shop_id),
    ).fetchone()
    if not card:
        abort(404, "No card found")

    serial = card["id"]
    auth_token = uid() + uid()

    # Upsert wallet_passes record
    existing = execute(
        db,
        f"SELECT id FROM wallet_passes WHERE card_id = {P} AND platform = 'apple'",
        (card["id"],),
    ).fetchone()

    if not existing:
        execute(
            db,
            f"INSERT INTO wallet_passes (id, card_id, platform, serial_number, auth_token) "
            f"VALUES ({P},{P},'apple',{P},{P})",
            (uid(), card["id"], serial, auth_token),
        )
        commit(db)
    else:
        auth_token_row = execute(
            db,
            f"SELECT auth_token FROM wallet_passes WHERE card_id = {P} AND platform = 'apple'",
            (card["id"],),
        ).fetchone()
        auth_token = auth_token_row["auth_token"]

    pkpass = generate_pkpass(dict(card), dict(shop), serial, auth_token)
    if pkpass is None:
        abort(503, "Apple Wallet not configured")

    return send_file(
        BytesIO(pkpass),
        mimetype="application/vnd.apple.pkpass",
        as_attachment=True,
        download_name=f"{shop['name']}_loyalty.pkpass",
    )


# ---------------------------------------------------------------------------
# Google Wallet
# ---------------------------------------------------------------------------

@app.route("/add-to-google-wallet")
def add_to_google_wallet():
    """Redirect to the Google Wallet save URL."""
    phone = request.args.get("phone", "").strip()
    shop_id = request.args.get("shop_id", "").strip()

    if not phone or not shop_id:
        abort(400, "Missing phone or shop_id")

    db = get_db()
    shop = execute(db, f"SELECT * FROM shops WHERE id = {P}", (shop_id,)).fetchone()
    if not shop:
        abort(404, "Shop not found")

    card = execute(
        db,
        f"SELECT * FROM cards WHERE phone = {P} AND shop_id = {P}",
        (phone, shop_id),
    ).fetchone()
    if not card:
        abort(404, "No card found")

    # Upsert wallet_passes record
    existing = execute(
        db,
        f"SELECT id FROM wallet_passes WHERE card_id = {P} AND platform = 'google'",
        (card["id"],),
    ).fetchone()

    if not existing:
        execute(
            db,
            f"INSERT INTO wallet_passes (id, card_id, platform, serial_number) "
            f"VALUES ({P},{P},'google',{P})",
            (uid(), card["id"], card["id"]),
        )
        commit(db)

    save_url = generate_save_url(dict(card), dict(shop))
    if save_url is None:
        abort(503, "Google Wallet not configured")

    return redirect(save_url)


# ---------------------------------------------------------------------------
# Apple Wallet web service endpoints (for pass updates)
# ---------------------------------------------------------------------------

@app.route("/wallet/v1/devices/<device_id>/registrations/<pass_type_id>/<serial>", methods=["POST"])
def wallet_register(device_id, pass_type_id, serial):
    """Register a device for push notifications on a pass."""
    auth = request.headers.get("Authorization", "")
    push_token = (request.get_json(silent=True) or {}).get("pushToken", "")

    if not push_token:
        return "", 400

    db = get_db()

    # Verify auth token
    wp = execute(
        db,
        f"SELECT * FROM wallet_passes WHERE serial_number = {P} AND auth_token = {P}",
        (serial, auth.replace("ApplePass ", "")),
    ).fetchone()
    if not wp:
        return "", 401

    existing = execute(
        db,
        f"SELECT id FROM apple_wallet_registrations "
        f"WHERE device_id = {P} AND pass_type_id = {P} AND serial_number = {P}",
        (device_id, pass_type_id, serial),
    ).fetchone()

    if existing:
        return "", 200

    execute(
        db,
        f"INSERT INTO apple_wallet_registrations (id, device_id, push_token, pass_type_id, serial_number, card_id) "
        f"VALUES ({P},{P},{P},{P},{P},{P})",
        (uid(), device_id, push_token, pass_type_id, serial, wp["card_id"]),
    )
    commit(db)
    return "", 201


@app.route("/wallet/v1/devices/<device_id>/registrations/<pass_type_id>/<serial>", methods=["DELETE"])
def wallet_unregister(device_id, pass_type_id, serial):
    """Unregister a device from pass notifications."""
    db = get_db()
    execute(
        db,
        f"DELETE FROM apple_wallet_registrations "
        f"WHERE device_id = {P} AND pass_type_id = {P} AND serial_number = {P}",
        (device_id, pass_type_id, serial),
    )
    commit(db)
    return "", 200


@app.route("/wallet/v1/devices/<device_id>/registrations/<pass_type_id>", methods=["GET"])
def wallet_serials(device_id, pass_type_id):
    """Return serial numbers registered for this device."""
    db = get_db()
    rows = execute(
        db,
        f"SELECT serial_number FROM apple_wallet_registrations "
        f"WHERE device_id = {P} AND pass_type_id = {P}",
        (device_id, pass_type_id),
    ).fetchall()

    if not rows:
        return "", 204

    return jsonify({
        "serialNumbers": [r["serial_number"] for r in rows],
        "lastUpdated": str(int(__import__("time").time())),
    })


@app.route("/wallet/v1/passes/<pass_type_id>/<serial>", methods=["GET"])
def wallet_latest_pass(pass_type_id, serial):
    """Return the latest .pkpass for a registered serial."""
    auth = request.headers.get("Authorization", "")

    db = get_db()
    wp = execute(
        db,
        f"SELECT * FROM wallet_passes WHERE serial_number = {P} AND auth_token = {P}",
        (serial, auth.replace("ApplePass ", "")),
    ).fetchone()
    if not wp:
        return "", 401

    card = execute(db, f"SELECT * FROM cards WHERE id = {P}", (wp["card_id"],)).fetchone()
    if not card:
        return "", 404

    shop = execute(db, f"SELECT * FROM shops WHERE id = {P}", (card["shop_id"],)).fetchone()
    if not shop:
        return "", 404

    pkpass = generate_pkpass(dict(card), dict(shop), serial, wp["auth_token"])
    if pkpass is None:
        return "", 500

    return send_file(
        BytesIO(pkpass),
        mimetype="application/vnd.apple.pkpass",
    )


@app.route("/wallet/v1/log", methods=["POST"])
def wallet_log():
    """Apple Wallet error log endpoint — just acknowledge."""
    body = request.get_json(silent=True) or {}
    logs = body.get("logs", [])
    for entry in logs:
        log.info("apple_wallet_log: %s", entry)
    return "", 200


# ---------------------------------------------------------------------------
# Run
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
