"""Database abstraction — Postgres in production, SQLite for local dev.

Detects the driver from DATABASE_URL env var:
  - Starts with "postgres" → psycopg2  (Heroku Postgres)
  - Anything else / missing  → sqlite3  (local stamps.db)

Exports
-------
get_db, close_db      — per-request (Flask g) connection management
get_standalone_db     — independent connection for background threads
execute, commit       — driver-agnostic query helpers
uid                   — short random ID generator
P                     — placeholder constant (%s or ?)
init_db               — create tables + seed demo data
"""

import os
import sqlite3
import uuid

from flask import g

# ---------------------------------------------------------------------------
# Driver detection
# ---------------------------------------------------------------------------

_raw_url = os.environ.get("DATABASE_URL", "")
_USE_POSTGRES = _raw_url.startswith("postgres")

if _USE_POSTGRES:
    import psycopg2
    import psycopg2.extras
    # Heroku gives postgres:// but psycopg2 needs postgresql://
    _DB_URL = _raw_url.replace("postgres://", "postgresql://", 1)
else:
    _DB_URL = os.environ.get("DATABASE_URL", "stamps.db")

# Placeholder constant — use in f-strings: f"WHERE phone={P}"
P = "%s" if _USE_POSTGRES else "?"

# ---------------------------------------------------------------------------
# Connection helpers
# ---------------------------------------------------------------------------


def _connect():
    """Open a new connection using the detected driver."""
    if _USE_POSTGRES:
        conn = psycopg2.connect(_DB_URL, cursor_factory=psycopg2.extras.RealDictCursor)
        conn.autocommit = False
        return conn
    else:
        conn = sqlite3.connect(_DB_URL)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL")
        return conn


def get_db():
    """Return the per-request connection, creating it if needed."""
    if "db" not in g:
        g.db = _connect()
    return g.db


def close_db(exc=None):
    """Close per-request connection (registered as teardown_appcontext)."""
    db = g.pop("db", None)
    if db is not None:
        db.close()


def get_standalone_db():
    """Independent connection for background threads (not tied to Flask g)."""
    return _connect()


# ---------------------------------------------------------------------------
# Query helpers
# ---------------------------------------------------------------------------


def execute(db, sql, params=()):
    """Execute a query and return fetchable results.

    For Postgres: uses a cursor (RealDictCursor).
    For SQLite: uses the connection directly (returns sqlite3.Row objects).
    """
    if _USE_POSTGRES:
        cur = db.cursor()
        cur.execute(sql, params)
        return cur
    else:
        return db.execute(sql, params)


def commit(db):
    """Commit the current transaction."""
    db.commit()


def uid():
    """Short random hex ID."""
    return uuid.uuid4().hex[:12]


# ---------------------------------------------------------------------------
# Schema
# ---------------------------------------------------------------------------

_SCHEMA_POSTGRES = """
CREATE TABLE IF NOT EXISTS shops (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    max_stamps INTEGER DEFAULT 10,
    nfc_tag TEXT UNIQUE NOT NULL,
    reward TEXT DEFAULT 'Free item',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cards (
    id TEXT PRIMARY KEY,
    phone TEXT NOT NULL,
    shop_id TEXT NOT NULL,
    current_stamps INTEGER DEFAULT 0,
    total_stamps INTEGER DEFAULT 0,
    rewards_earned INTEGER DEFAULT 0,
    rewards_redeemed INTEGER DEFAULT 0,
    UNIQUE(phone, shop_id),
    FOREIGN KEY(shop_id) REFERENCES shops(id)
);

CREATE TABLE IF NOT EXISTS stamp_log (
    id TEXT PRIMARY KEY,
    card_id TEXT NOT NULL,
    stamped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(card_id) REFERENCES cards(id)
);

CREATE TABLE IF NOT EXISTS redemptions (
    id TEXT PRIMARY KEY,
    card_id TEXT NOT NULL,
    redeemed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    staff_note TEXT,
    FOREIGN KEY(card_id) REFERENCES cards(id)
);

CREATE TABLE IF NOT EXISTS apple_wallet_registrations (
    id TEXT PRIMARY KEY,
    device_id TEXT NOT NULL,
    push_token TEXT NOT NULL,
    pass_type_id TEXT NOT NULL,
    serial_number TEXT NOT NULL,
    card_id TEXT NOT NULL,
    UNIQUE(device_id, pass_type_id, serial_number),
    FOREIGN KEY(card_id) REFERENCES cards(id)
);

CREATE TABLE IF NOT EXISTS wallet_passes (
    id TEXT PRIMARY KEY,
    card_id TEXT NOT NULL,
    platform TEXT NOT NULL,
    serial_number TEXT NOT NULL,
    auth_token TEXT,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(card_id, platform),
    FOREIGN KEY(card_id) REFERENCES cards(id)
);
"""

_SCHEMA_SQLITE = """
CREATE TABLE IF NOT EXISTS shops (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    max_stamps INTEGER DEFAULT 10,
    nfc_tag TEXT UNIQUE NOT NULL,
    reward TEXT DEFAULT 'Free item',
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS cards (
    id TEXT PRIMARY KEY,
    phone TEXT NOT NULL,
    shop_id TEXT NOT NULL,
    current_stamps INTEGER DEFAULT 0,
    total_stamps INTEGER DEFAULT 0,
    rewards_earned INTEGER DEFAULT 0,
    rewards_redeemed INTEGER DEFAULT 0,
    UNIQUE(phone, shop_id),
    FOREIGN KEY(shop_id) REFERENCES shops(id)
);

CREATE TABLE IF NOT EXISTS stamp_log (
    id TEXT PRIMARY KEY,
    card_id TEXT NOT NULL,
    stamped_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY(card_id) REFERENCES cards(id)
);

CREATE TABLE IF NOT EXISTS redemptions (
    id TEXT PRIMARY KEY,
    card_id TEXT NOT NULL,
    redeemed_at TEXT DEFAULT (datetime('now')),
    staff_note TEXT,
    FOREIGN KEY(card_id) REFERENCES cards(id)
);

CREATE TABLE IF NOT EXISTS apple_wallet_registrations (
    id TEXT PRIMARY KEY,
    device_id TEXT NOT NULL,
    push_token TEXT NOT NULL,
    pass_type_id TEXT NOT NULL,
    serial_number TEXT NOT NULL,
    card_id TEXT NOT NULL,
    UNIQUE(device_id, pass_type_id, serial_number),
    FOREIGN KEY(card_id) REFERENCES cards(id)
);

CREATE TABLE IF NOT EXISTS wallet_passes (
    id TEXT PRIMARY KEY,
    card_id TEXT NOT NULL,
    platform TEXT NOT NULL,
    serial_number TEXT NOT NULL,
    auth_token TEXT,
    last_updated TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
    UNIQUE(card_id, platform),
    FOREIGN KEY(card_id) REFERENCES cards(id)
);
"""


def init_db(app=None):
    """Create all tables and seed demo shops.

    If ``app`` is provided, pushes an app context first (for boot-time calls).
    """
    def _run():
        db = get_db()

        if _USE_POSTGRES:
            cur = db.cursor()
            for stmt in _SCHEMA_POSTGRES.split(";"):
                stmt = stmt.strip()
                if stmt:
                    cur.execute(stmt)
            db.commit()
        else:
            db.executescript(_SCHEMA_SQLITE)

        # Add rewards_redeemed to existing DBs that lack it
        try:
            execute(db, "ALTER TABLE cards ADD COLUMN rewards_redeemed INTEGER DEFAULT 0")
            commit(db)
        except Exception:
            if _USE_POSTGRES:
                db.rollback()

        # Seed demo shops if table is empty
        row = execute(db, "SELECT 1 FROM shops LIMIT 1").fetchone()
        if not row:
            execute(db, f"INSERT INTO shops (id,name,max_stamps,nfc_tag,reward) VALUES ({P},{P},{P},{P},{P})",
                    (uid(), "Coffee Corner", 10, "nfc_coffee_001", "Free Coffee"))
            execute(db, f"INSERT INTO shops (id,name,max_stamps,nfc_tag,reward) VALUES ({P},{P},{P},{P},{P})",
                    (uid(), "Pizza Palace", 8, "nfc_pizza_001", "Free Slice"))
            commit(db)

    if app is not None:
        with app.app_context():
            _run()
    else:
        _run()
