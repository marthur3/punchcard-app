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

import random
import string

from db import P, close_db, commit, execute, get_db, init_db, uid
from auth import (
    clear_auth_cookie,
    create_session,
    is_authenticated,
    require_admin,
    set_auth_cookie,
    verify_password,
)
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
# Home
# ---------------------------------------------------------------------------

@app.route("/")
def home():
    return render_template("landing.html")


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
    if not shop["is_active"]:
        abort(404, "This shop is no longer active")

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

    db = get_db()
    shop = execute(db, f"SELECT * FROM shops WHERE nfc_tag = {P}", (shop_nfc,)).fetchone()
    if not shop:
        abort(404, "Shop not found")

    # Check per-shop PIN (fall back to global env var for legacy shops)
    expected_pin = shop["staff_pin"] or os.environ.get("STAFF_PIN", "0000")
    if pin != expected_pin:
        abort(403, "Invalid PIN")

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

    db = get_db()
    shop = execute(db, f"SELECT * FROM shops WHERE nfc_tag = {P}", (shop_nfc,)).fetchone()
    if not shop:
        abort(404, "Shop not found")

    expected_pin = shop["staff_pin"] or os.environ.get("STAFF_PIN", "0000")
    if pin != expected_pin:
        abort(403, "Invalid PIN")

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
# Super Admin
# ---------------------------------------------------------------------------


def _gen_pin():
    """Generate a random 4-digit PIN."""
    return "".join(random.choices(string.digits, k=4))


def _gen_nfc_slug(name):
    """Generate an NFC tag slug from a shop name."""
    slug = "".join(c if c.isalnum() else "_" for c in name.lower()).strip("_")
    return f"nfc_{slug}_{uid()[:6]}"


@app.route("/super/login", methods=["GET", "POST"])
def super_login():
    """Admin login page."""
    if request.method == "GET":
        if is_authenticated():
            return redirect(url_for("super_shops"))
        return render_template("super_login.html", error=None)

    email = request.form.get("email", "").strip()
    password = request.form.get("password", "")
    expected_email = os.environ.get("SUPER_ADMIN_EMAIL", "")

    if email != expected_email or not verify_password(password):
        return render_template("super_login.html", error="Invalid credentials"), 401

    db = get_db()
    token = create_session(db)
    resp = redirect(url_for("super_shops"))
    return set_auth_cookie(resp, token)


@app.route("/super/logout")
def super_logout():
    resp = redirect(url_for("super_login"))
    return clear_auth_cookie(resp)


@app.route("/super/shops")
@require_admin
def super_shops():
    """List all shops with stats."""
    db = get_db()
    shops = execute(
        db,
        f"SELECT s.*, "
        f"(SELECT COUNT(DISTINCT c.phone) FROM cards c WHERE c.shop_id = s.id) AS customer_count, "
        f"(SELECT COALESCE(SUM(c.total_stamps), 0) FROM cards c WHERE c.shop_id = s.id) AS stamp_count "
        f"FROM shops s ORDER BY s.created_at DESC",
    ).fetchall()
    shops = [dict(s) for s in shops]
    return render_template("super_shops.html", shops=shops)


@app.route("/super/shops/new", methods=["GET", "POST"])
@require_admin
def super_shop_new():
    """Create a new shop."""
    if request.method == "GET":
        return render_template("super_shop_form.html", shop=None, error=None)

    name = request.form.get("name", "").strip()
    if not name:
        return render_template("super_shop_form.html", shop=None, error="Shop name is required")

    emoji = request.form.get("emoji", "").strip() or "☕"
    max_stamps = int(request.form.get("max_stamps", 10))
    reward = request.form.get("reward", "").strip() or "Free item"
    staff_pin = request.form.get("staff_pin", "").strip() or _gen_pin()
    nfc_tag = request.form.get("nfc_tag", "").strip() or _gen_nfc_slug(name)
    owner_name = request.form.get("owner_name", "").strip() or None
    owner_phone = request.form.get("owner_phone", "").strip() or None

    db = get_db()

    # Check for duplicate nfc_tag
    existing = execute(db, f"SELECT id FROM shops WHERE nfc_tag = {P}", (nfc_tag,)).fetchone()
    if existing:
        return render_template("super_shop_form.html", shop=None, error=f"NFC tag '{nfc_tag}' already exists")

    execute(
        db,
        f"INSERT INTO shops (id, name, max_stamps, nfc_tag, reward, staff_pin, emoji, owner_name, owner_phone) "
        f"VALUES ({P},{P},{P},{P},{P},{P},{P},{P},{P})",
        (uid(), name, max_stamps, nfc_tag, reward, staff_pin, emoji, owner_name, owner_phone),
    )
    commit(db)
    return redirect(url_for("super_shops"))


@app.route("/super/shops/<shop_id>/edit", methods=["GET", "POST"])
@require_admin
def super_shop_edit(shop_id):
    """Edit a shop."""
    db = get_db()
    shop = execute(db, f"SELECT * FROM shops WHERE id = {P}", (shop_id,)).fetchone()
    if not shop:
        abort(404, "Shop not found")

    if request.method == "GET":
        return render_template("super_shop_form.html", shop=dict(shop), error=None)

    name = request.form.get("name", "").strip()
    if not name:
        return render_template("super_shop_form.html", shop=dict(shop), error="Shop name is required")

    emoji = request.form.get("emoji", "").strip() or "☕"
    max_stamps = int(request.form.get("max_stamps", 10))
    reward = request.form.get("reward", "").strip() or "Free item"
    staff_pin = request.form.get("staff_pin", "").strip() or shop["staff_pin"]
    owner_name = request.form.get("owner_name", "").strip() or None
    owner_phone = request.form.get("owner_phone", "").strip() or None

    execute(
        db,
        f"UPDATE shops SET name={P}, emoji={P}, max_stamps={P}, reward={P}, "
        f"staff_pin={P}, owner_name={P}, owner_phone={P} WHERE id={P}",
        (name, emoji, max_stamps, reward, staff_pin, owner_name, owner_phone, shop_id),
    )
    commit(db)
    return redirect(url_for("super_shops"))


@app.route("/super/shops/<shop_id>/delete", methods=["POST"])
@require_admin
def super_shop_delete(shop_id):
    """Deactivate a shop (soft delete)."""
    db = get_db()
    execute(db, f"UPDATE shops SET is_active = {P} WHERE id = {P}",
            (False if db.__class__.__module__ == "psycopg2.extensions" else 0, shop_id))
    commit(db)
    return redirect(url_for("super_shops"))


@app.route("/super/activity")
@require_admin
def super_activity():
    """Recent stamps and redemptions across all shops."""
    db = get_db()

    # Combine stamps and redemptions into one feed, newest first
    stamps = execute(
        db,
        f"SELECT sl.stamped_at AS timestamp, s.name AS shop_name, c.phone, "
        f"'stamp' AS action, NULL AS note "
        f"FROM stamp_log sl "
        f"JOIN cards c ON sl.card_id = c.id "
        f"JOIN shops s ON c.shop_id = s.id "
        f"ORDER BY sl.stamped_at DESC LIMIT 50",
    ).fetchall()

    redemptions = execute(
        db,
        f"SELECT r.redeemed_at AS timestamp, s.name AS shop_name, c.phone, "
        f"'redeem' AS action, r.staff_note AS note "
        f"FROM redemptions r "
        f"JOIN cards c ON r.card_id = c.id "
        f"JOIN shops s ON c.shop_id = s.id "
        f"ORDER BY r.redeemed_at DESC LIMIT 50",
    ).fetchall()

    activity = sorted(
        [dict(r) for r in stamps] + [dict(r) for r in redemptions],
        key=lambda x: x["timestamp"] or "",
        reverse=True,
    )[:100]

    return render_template("super_activity.html", activity=activity)


# ---------------------------------------------------------------------------
# Shop Owner Dashboard
# ---------------------------------------------------------------------------

@app.route("/owner/<shop_nfc>")
def owner_dashboard(shop_nfc):
    """Shop owner stats view — authenticated by staff PIN."""
    pin = request.args.get("pin", "").strip()

    db = get_db()
    shop = execute(db, f"SELECT * FROM shops WHERE nfc_tag = {P}", (shop_nfc,)).fetchone()
    if not shop:
        abort(404, "Shop not found")

    expected_pin = shop["staff_pin"] or os.environ.get("STAFF_PIN", "0000")
    if pin != expected_pin:
        abort(403, "Invalid PIN")

    shop = dict(shop)
    shop_id = shop["id"]

    # Aggregate stats
    totals = execute(
        db,
        f"SELECT COALESCE(SUM(total_stamps), 0) AS total_stamps, "
        f"COUNT(DISTINCT phone) AS unique_customers, "
        f"COALESCE(SUM(rewards_earned), 0) AS rewards_earned, "
        f"COALESCE(SUM(rewards_redeemed), 0) AS rewards_redeemed "
        f"FROM cards WHERE shop_id = {P}",
        (shop_id,),
    ).fetchone()

    # Stamps today
    today_q = (
        f"SELECT COUNT(*) AS cnt FROM stamp_log sl JOIN cards c ON sl.card_id = c.id "
        f"WHERE c.shop_id = {P} AND sl.stamped_at >= CURRENT_DATE"
        if db.__class__.__module__ != "sqlite3"
        else f"SELECT COUNT(*) AS cnt FROM stamp_log sl JOIN cards c ON sl.card_id = c.id "
             f"WHERE c.shop_id = {P} AND sl.stamped_at >= date('now')"
    )
    stamps_today = execute(db, today_q, (shop_id,)).fetchone()


    # Stamps this week
    week_q = (
        f"SELECT COUNT(*) AS cnt FROM stamp_log sl JOIN cards c ON sl.card_id = c.id "
        f"WHERE c.shop_id = {P} AND sl.stamped_at >= CURRENT_DATE - INTERVAL '7 days'"
        if db.__class__.__module__ != "sqlite3"
        else f"SELECT COUNT(*) AS cnt FROM stamp_log sl JOIN cards c ON sl.card_id = c.id "
             f"WHERE c.shop_id = {P} AND sl.stamped_at >= date('now', '-7 days')"
    )
    stamps_week = execute(db, week_q, (shop_id,)).fetchone()

    stats = {
        "total_stamps": totals["total_stamps"],
        "unique_customers": totals["unique_customers"],
        "rewards_earned": totals["rewards_earned"],
        "rewards_redeemed": totals["rewards_redeemed"],
        "stamps_today": stamps_today["cnt"],
        "stamps_week": stamps_week["cnt"],
    }

    # Recent stamps
    recent_stamps = execute(
        db,
        f"SELECT sl.stamped_at, c.phone, c.current_stamps "
        f"FROM stamp_log sl JOIN cards c ON sl.card_id = c.id "
        f"WHERE c.shop_id = {P} ORDER BY sl.stamped_at DESC LIMIT 20",
        (shop_id,),
    ).fetchall()

    return render_template(
        "owner_dashboard.html",
        shop=shop,
        stats=stats,
        recent_stamps=recent_stamps,
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
