"""Apple Wallet .pkpass generation and APNs push updates.

Certs, keys, and images are loaded once on first use and cached for the
lifetime of the process — avoids repeated disk I/O on every pass generation.
"""

import base64
import hashlib
import json
import logging
import os
import time
import zipfile
from io import BytesIO
from pathlib import Path

from db import execute, P

log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Cert / key loading with caching
# ---------------------------------------------------------------------------

_cache: dict = {}


def _load_file_or_b64(path_env, b64_env):
    """Read from file path OR decode from base64 env var. Cached after first call."""
    key = f"{path_env}|{b64_env}"
    if key in _cache:
        return _cache[key]

    result = None
    path = os.environ.get(path_env)
    if path and Path(path).is_file():
        result = Path(path).read_bytes()
    else:
        b64 = os.environ.get(b64_env)
        if b64:
            result = base64.b64decode(b64)

    _cache[key] = result
    return result


def _certs_available():
    """Return True if all three Apple signing certs/keys are configured."""
    return bool(
        _load_file_or_b64("APPLE_PASS_CERT_PATH", "APPLE_PASS_CERT_BASE64")
        and _load_file_or_b64("APPLE_PASS_KEY_PATH", "APPLE_PASS_KEY_BASE64")
        and _load_file_or_b64("APPLE_WWDR_CERT_PATH", "APPLE_WWDR_CERT_BASE64")
    )


def _apns_key_available():
    """Return True if APNs push key (.p8) is configured."""
    return bool(_load_file_or_b64("APPLE_APNS_KEY_PATH", "APPLE_APNS_KEY_BASE64"))


# ---------------------------------------------------------------------------
# .pkpass generation
# ---------------------------------------------------------------------------

_STATIC_WALLET = Path(__file__).resolve().parent.parent / "static" / "wallet"
_image_cache = None


def _collect_images():
    """Gather icon/logo images from static/wallet/. Cached after first call."""
    global _image_cache
    if _image_cache is not None:
        return _image_cache
    images = {}
    for name in ("icon.png", "icon@2x.png", "logo.png", "logo@2x.png"):
        p = _STATIC_WALLET / name
        if p.is_file():
            images[name] = p.read_bytes()
    _image_cache = images
    return images


# Parsed crypto objects — cached after first successful load
_parsed_cert = None
_parsed_key = None
_parsed_wwdr = None


def _load_signing_objects():
    """Parse PEM certs/keys once and cache. Returns (cert, key, wwdr) or raises."""
    global _parsed_cert, _parsed_key, _parsed_wwdr
    if _parsed_cert is not None:
        return _parsed_cert, _parsed_key, _parsed_wwdr

    from cryptography.hazmat.primitives import serialization
    from cryptography.x509 import load_pem_x509_certificate

    cert_pem = _load_file_or_b64("APPLE_PASS_CERT_PATH", "APPLE_PASS_CERT_BASE64")
    key_pem = _load_file_or_b64("APPLE_PASS_KEY_PATH", "APPLE_PASS_KEY_BASE64")
    wwdr_pem = _load_file_or_b64("APPLE_WWDR_CERT_PATH", "APPLE_WWDR_CERT_BASE64")

    key_password = os.environ.get("APPLE_PASS_KEY_PASSWORD")
    pw_bytes = key_password.encode() if key_password else None

    _parsed_cert = load_pem_x509_certificate(cert_pem)
    _parsed_key = serialization.load_pem_private_key(key_pem, password=pw_bytes)
    _parsed_wwdr = load_pem_x509_certificate(wwdr_pem)
    return _parsed_cert, _parsed_key, _parsed_wwdr


def generate_pkpass(card, shop, serial, auth_token):
    """Build a signed .pkpass ZIP archive and return the raw bytes.

    Returns None if certs are not configured.
    ``card`` and ``shop`` are dict-like mappings (sqlite3.Row or plain dict).
    """
    if not _certs_available():
        log.warning("Apple certs not configured — skipping pkpass generation")
        return None

    from cryptography.hazmat.primitives import hashes, serialization
    from cryptography.hazmat.primitives.serialization import pkcs7

    base_url = os.environ.get("BASE_URL", "http://localhost:5000")
    pass_type_id = os.environ.get("APPLE_PASS_TYPE_ID", "pass.com.tapranked.loyalty")
    team_id = os.environ.get("APPLE_TEAM_ID", "XXXXXXXXXX")

    pass_json = {
        "formatVersion": 1,
        "passTypeIdentifier": pass_type_id,
        "serialNumber": serial,
        "teamIdentifier": team_id,
        "organizationName": shop["name"],
        "description": f"{shop['name']} Loyalty Card",
        "logoText": shop["name"],
        "foregroundColor": "rgb(255,255,255)",
        "backgroundColor": "rgb(30,58,138)",
        "webServiceURL": f"{base_url}/wallet/v1",
        "authenticationToken": auth_token,
        "storeCard": {
            "headerFields": [
                {"key": "stamps", "label": "STAMPS",
                 "value": f"{card['current_stamps']}/{shop['max_stamps']}"}
            ],
            "primaryFields": [
                {"key": "reward", "label": "NEXT REWARD", "value": shop["reward"]}
            ],
            "secondaryFields": [
                {"key": "earned", "label": "Rewards Earned",
                 "value": str(card["rewards_earned"])},
                {"key": "total", "label": "Total Stamps",
                 "value": str(card["total_stamps"])}
            ],
            "backFields": [
                {"key": "phone", "label": "Phone", "value": card["phone"]}
            ],
        },
        "barcode": {
            "format": "PKBarcodeFormatQR",
            "message": f"{base_url}/tap?nfc={shop['nfc_tag']}&phone={card['phone']}",
            "messageEncoding": "iso-8859-1",
        },
    }

    # Collect files for the archive
    files = {"pass.json": json.dumps(pass_json).encode()}
    files.update(_collect_images())

    # manifest.json — SHA-1 of every file (required by Apple spec)
    manifest = {
        name: hashlib.sha1(data, usedforsecurity=False).hexdigest()
        for name, data in files.items()
    }
    manifest_bytes = json.dumps(manifest).encode()
    files["manifest.json"] = manifest_bytes

    # PKCS#7 detached signature
    cert, key, wwdr = _load_signing_objects()
    signature = (
        pkcs7.PKCS7SignatureBuilder()
        .set_data(manifest_bytes)
        .add_signer(cert, key, hashes.SHA256())
        .add_certificate(wwdr)
        .sign(serialization.Encoding.DER, [pkcs7.PKCS7Options.DetachedSignature])
    )
    files["signature"] = signature

    # ZIP into .pkpass
    buf = BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for name, data in files.items():
            zf.writestr(name, data)
    return buf.getvalue()


# ---------------------------------------------------------------------------
# APNs push (token-based .p8 auth)
# ---------------------------------------------------------------------------

_APNS_TIMEOUT = 5  # seconds per push request


def _build_apns_jwt():
    """Build a short-lived JWT for APNs token-based auth."""
    import jwt

    key_bytes = _load_file_or_b64("APPLE_APNS_KEY_PATH", "APPLE_APNS_KEY_BASE64")
    key_id = os.environ.get("APPLE_APNS_KEY_ID", "")
    team_id = os.environ.get("APPLE_TEAM_ID", "")

    return jwt.encode(
        {"iss": team_id, "iat": int(time.time())},
        key_bytes,
        algorithm="ES256",
        headers={"kid": key_id},
    )


def push_update_for_card(db, card_id):
    """Push update to all Apple devices registered for this card.

    Reuses a single HTTP/2 connection for all tokens to avoid repeated
    TLS handshakes. Skips silently when APNs key is not configured.
    """
    if not _apns_key_available():
        return

    rows = execute(db,
        f"SELECT push_token FROM apple_wallet_registrations WHERE card_id = {P}",
        (card_id,),
    ).fetchall()
    if not rows:
        return

    import httpx

    pass_type_id = os.environ.get("APPLE_PASS_TYPE_ID", "pass.com.tapranked.loyalty")
    use_sandbox = os.environ.get("APPLE_APNS_USE_SANDBOX", "true").lower() == "true"
    host = "api.sandbox.push.apple.com" if use_sandbox else "api.push.apple.com"
    token = _build_apns_jwt()

    headers = {
        "authorization": f"bearer {token}",
        "apns-topic": pass_type_id,
        "apns-push-type": "background",
        "apns-priority": "5",
    }

    # One client, one TLS handshake, all pushes reuse the connection
    try:
        with httpx.Client(http2=True, timeout=_APNS_TIMEOUT) as client:
            for row in rows:
                url = f"https://{host}/3/device/{row['push_token']}"
                try:
                    resp = client.post(url, headers=headers, content=b"{}")
                    if resp.status_code != 200:
                        log.warning("apns_push_failed token=%s status=%s",
                                    row["push_token"][:8], resp.status_code)
                except Exception:
                    log.exception("apns_push_error token=%s", row["push_token"][:8])
    except Exception:
        log.exception("apns_client_error card_id=%s", card_id)
