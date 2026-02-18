"""Google Wallet LoyaltyObject generation and REST updates.

Service account credentials and parsed JSON are cached after first load.
"""

import json
import logging
import os
import time
from pathlib import Path

from db import execute, P

log = logging.getLogger(__name__)

_API_TIMEOUT = 10  # seconds for Google Wallet REST calls

# ---------------------------------------------------------------------------
# Credential + service-account helpers (cached)
# ---------------------------------------------------------------------------

_sa_info_cache = None
_sa_info_loaded = False


def _load_sa_info():
    """Load and cache the raw service-account JSON dict. Returns None if not configured."""
    global _sa_info_cache, _sa_info_loaded
    if _sa_info_loaded:
        return _sa_info_cache

    json_path = os.environ.get("GOOGLE_WALLET_SERVICE_ACCOUNT_JSON")
    json_content = os.environ.get("GOOGLE_WALLET_SERVICE_ACCOUNT_JSON_CONTENT")

    if json_path and Path(json_path).is_file():
        _sa_info_cache = json.loads(Path(json_path).read_text())
    elif json_content:
        _sa_info_cache = json.loads(json_content)

    _sa_info_loaded = True
    return _sa_info_cache


_creds_cache = None


def _get_credentials():
    """Load Google service account Credentials. Cached after first call.

    Returns None if google-auth is not installed or creds are not configured.
    """
    global _creds_cache
    if _creds_cache is not None:
        return _creds_cache

    try:
        from google.oauth2 import service_account
    except ImportError:
        log.warning("google-auth not installed — Google Wallet disabled")
        return None

    sa_info = _load_sa_info()
    if not sa_info:
        return None

    SCOPES = ["https://www.googleapis.com/auth/wallet_object.issuer"]
    _creds_cache = service_account.Credentials.from_service_account_info(
        sa_info, scopes=SCOPES
    )
    return _creds_cache


def _issuer_id():
    return os.environ.get("GOOGLE_WALLET_ISSUER_ID", "")


def _class_suffix():
    return os.environ.get("GOOGLE_WALLET_CLASS_SUFFIX", "tapranked_loyalty")


def _class_id():
    return f"{_issuer_id()}.{_class_suffix()}"


# ---------------------------------------------------------------------------
# Shared: build a LoyaltyObject dict (used by save-URL and REST update)
# ---------------------------------------------------------------------------

def _build_loyalty_object(card, shop):
    """Build the LoyaltyObject dict shared by generate_save_url and update."""
    base_url = os.environ.get("BASE_URL", "http://localhost:5000")
    object_id = f"{_issuer_id()}.{card['id']}"

    return {
        "id": object_id,
        "classId": _class_id(),
        "state": "ACTIVE",
        "accountId": card["phone"],
        "accountName": card["phone"],
        "loyaltyPoints": {
            "label": "Stamps",
            "balance": {"int": card["current_stamps"]},
        },
        "barcode": {
            "type": "QR_CODE",
            "value": f"{base_url}/tap?nfc={shop['nfc_tag']}&phone={card['phone']}",
        },
        "textModulesData": [
            {"header": "Shop", "body": shop["name"]},
            {"header": "Reward", "body": shop["reward"]},
            {"header": "Rewards Earned", "body": str(card["rewards_earned"])},
        ],
    }


# ---------------------------------------------------------------------------
# Loyalty class (template) — created/updated once at startup
# ---------------------------------------------------------------------------

def ensure_loyalty_class():
    """Create or update the LoyaltyClass template via REST API."""
    creds = _get_credentials()
    if not creds:
        log.info("Google Wallet creds not configured — skipping class creation")
        return False

    import requests as req
    from google.auth.transport.requests import Request

    creds.refresh(Request())
    headers = {"Authorization": f"Bearer {creds.token}"}
    class_id = _class_id()
    base_url = os.environ.get("BASE_URL", "http://localhost:5000")

    class_obj = {
        "id": class_id,
        "issuerName": "TapRanked",
        "reviewStatus": "UNDER_REVIEW",
        "programName": "TapRanked Loyalty",
        "programLogo": {
            "sourceUri": {"uri": f"{base_url}/static/wallet/logo.png"},
            "contentDescription": {
                "defaultValue": {"language": "en-US", "value": "TapRanked"}
            },
        },
        "hexBackgroundColor": "#1e3a8a",
        "countryCode": "US",
    }

    url = f"https://walletobjects.googleapis.com/walletobjects/v1/loyaltyClass/{class_id}"
    resp = req.get(url, headers=headers, timeout=_API_TIMEOUT)

    if resp.status_code == 200:
        resp = req.put(url, json=class_obj, headers=headers, timeout=_API_TIMEOUT)
        log.info("google_class_updated status=%s", resp.status_code)
    elif resp.status_code == 404:
        resp = req.post(
            "https://walletobjects.googleapis.com/walletobjects/v1/loyaltyClass",
            json=class_obj, headers=headers, timeout=_API_TIMEOUT,
        )
        log.info("google_class_created status=%s", resp.status_code)
    else:
        log.warning("google_class_check_failed status=%s body=%s",
                    resp.status_code, resp.text[:200])
        return False

    return resp.status_code in (200, 201)


# ---------------------------------------------------------------------------
# Save URL (JWT-based "Save to Google Wallet" link)
# ---------------------------------------------------------------------------

def generate_save_url(card, shop):
    """Build a signed JWT save URL for adding a LoyaltyObject.

    Returns the URL string, or None if creds are unavailable.
    """
    sa_info = _load_sa_info()
    if not sa_info:
        return None

    import jwt as pyjwt

    base_url = os.environ.get("BASE_URL", "http://localhost:5000")
    loyalty_object = _build_loyalty_object(card, shop)
    now = int(time.time())

    claims = {
        "iss": sa_info["client_email"],
        "aud": "google",
        "origins": [base_url],
        "typ": "savetowallet",
        "iat": now,
        "exp": now + 3600,  # 1 hour expiry
        "payload": {"loyaltyObjects": [loyalty_object]},
    }

    token = pyjwt.encode(claims, sa_info["private_key"], algorithm="RS256")
    return f"https://pay.google.com/gp/v/save/{token}"


# ---------------------------------------------------------------------------
# REST update (push to existing pass) — uses PATCH to preserve Google fields
# ---------------------------------------------------------------------------

def update_loyalty_object(card, shop):
    """PATCH updated LoyaltyObject via REST API. Google auto-pushes to device."""
    creds = _get_credentials()
    if not creds:
        return False

    import requests as req
    from google.auth.transport.requests import Request

    creds.refresh(Request())
    headers = {"Authorization": f"Bearer {creds.token}"}
    loyalty_object = _build_loyalty_object(card, shop)
    object_id = loyalty_object["id"]

    url = f"https://walletobjects.googleapis.com/walletobjects/v1/loyaltyObject/{object_id}"
    resp = req.patch(url, json=loyalty_object, headers=headers, timeout=_API_TIMEOUT)

    if resp.status_code in (200, 201):
        log.info("google_object_updated id=%s", object_id)
        return True
    log.warning("google_object_update_failed id=%s status=%s body=%s",
                object_id, resp.status_code, resp.text[:200])
    return False


def push_update_for_card(db, card_id):
    """Update Google Wallet pass for this card if one exists."""
    wp = execute(db,
        f"SELECT * FROM wallet_passes WHERE card_id = {P} AND platform = 'google'",
        (card_id,),
    ).fetchone()
    if not wp:
        return

    card = execute(db,
        f"SELECT c.*, s.name AS shop_name, s.max_stamps, s.reward, s.nfc_tag "
        f"FROM cards c JOIN shops s ON c.shop_id = s.id WHERE c.id = {P}",
        (card_id,),
    ).fetchone()
    if not card:
        return

    card_dict = dict(card)
    shop_dict = {
        "name": card_dict["shop_name"],
        "max_stamps": card_dict["max_stamps"],
        "reward": card_dict["reward"],
        "nfc_tag": card_dict["nfc_tag"],
    }
    update_loyalty_object(card_dict, shop_dict)
