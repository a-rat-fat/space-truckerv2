import os, time, json
from pathlib import Path
from flask import Flask, render_template, jsonify, request
from sqlalchemy import create_engine, text

# Determine DB URL: prefer Railway's DATABASE_URL, else SQLite fallback
DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    # SQLite file fallback
    DB_PATH = os.environ.get("DB_PATH", "/data/game.db")
    Path(DB_PATH).parent.mkdir(parents=True, exist_ok=True)
    DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(DATABASE_URL, pool_pre_ping=True)

# Init schema
with engine.begin() as con:
    con.execute(text("""
        CREATE TABLE IF NOT EXISTS scores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            profit INTEGER NOT NULL,
            ts INTEGER NOT NULL
        )
    """))
    # For Postgres compatibility, create index with IF NOT EXISTS via plpgsql-safe approach
    try:
        con.execute(text("CREATE INDEX IF NOT EXISTS idx_scores_profit ON scores(profit)"))
    except Exception:
        # Some engines differ; ignore if already exists
        pass
    con.execute(text("""
        CREATE TABLE IF NOT EXISTS saves (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            slot INTEGER NOT NULL UNIQUE,
            state TEXT NOT NULL,
            ts INTEGER NOT NULL
        )
    """))

app = Flask(__name__, static_folder="static", template_folder="templates")

@app.route("/")
def index():
    return render_template("index.html")

@app.post("/api/score")
def post_score():
    data = request.get_json(force=True, silent=True) or {}
    name = (str(data.get("name", "Anonymous")).strip() or "Anonymous")[:24]
    profit = int(data.get("profit", 0))
    ts = int(time.time())
    with engine.begin() as con:
        con.execute(text("INSERT INTO scores(name, profit, ts) VALUES (:name, :profit, :ts)"), {"name": name, "profit": profit, "ts": ts})
        rows = con.execute(text("SELECT name, profit, ts FROM scores ORDER BY profit DESC, ts ASC LIMIT 20")).mappings().all()
    return jsonify({"ok": True, "leaderboard": [dict(r) for r in rows]})

@app.get("/api/leaderboard")
def get_leaderboard():
    with engine.begin() as con:
        rows = con.execute(text("SELECT name, profit, ts FROM scores ORDER BY profit DESC, ts ASC LIMIT 20")).mappings().all()
    return jsonify([dict(r) for r in rows])

@app.post("/api/save")
def save_state():
    data = request.get_json(force=True, silent=True) or {}
    slot = int(data.get("slot", 1))
    state = data.get("state") or {}
    slot = max(1, min(3, slot))
    ts = int(time.time())
    payload = json.dumps(state, separators=(",", ":"))
    with engine.begin() as con:
        # Upsert by slot: works on SQLite (INSERT OR REPLACE) and Postgres (ON CONFLICT)
        # We'll try a portable approach: delete + insert
        con.execute(text("DELETE FROM saves WHERE slot = :slot"), {"slot": slot})
        con.execute(text("INSERT INTO saves(slot, state, ts) VALUES (:slot, :state, :ts)"), {"slot": slot, "state": payload, "ts": ts})
        rows = con.execute(text("SELECT slot, ts FROM saves ORDER BY slot ASC")).mappings().all()
    return jsonify({"ok": True, "slots": [dict(r) for r in rows]})

@app.get("/api/save")
def load_state():
    try:
        slot = int(request.args.get("slot", "1"))
    except ValueError:
        slot = 1
    slot = max(1, min(3, slot))
    with engine.begin() as con:
        row = con.execute(text("SELECT state, ts FROM saves WHERE slot = :slot"), {"slot": slot}).mappings().first()
    if not row:
        return jsonify({})
    return jsonify({"state": json.loads(row["state"]), "ts": row["ts"]})

@app.get("/healthz")
def health():
    try:
        with engine.begin() as con:
            con.execute(text("SELECT 1"))
        return {"status": "ok"}
    except Exception as e:
        return {"status": "error", "detail": str(e)}, 500

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    app.run(host="0.0.0.0", port=port)
