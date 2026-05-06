import sqlite3

DB_NAME = "app.db"

def init_db():
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()

    c.execute("""
    CREATE TABLE IF NOT EXISTS history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user TEXT,
        type TEXT,
        value TEXT,
        confidence REAL,
        timestamp TEXT
    )
    """)

    conn.commit()
    conn.close()


def insert_record(user, type_, value, confidence, timestamp):
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()

    c.execute("""
        INSERT INTO history (user, type, value, confidence, timestamp)
        VALUES (?, ?, ?, ?, ?)
    """, (user, type_, value, confidence, timestamp))

    conn.commit()
    conn.close()


def fetch_history(user):
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()

    c.execute("""
        SELECT type, value, confidence, timestamp
        FROM history
        WHERE user = ?
        ORDER BY id DESC
    """, (user,))

    rows = c.fetchall()
    conn.close()

    return rows