import psycopg2
import os

def get_conn():
    host = os.environ.get("DB_HOST", "localhost")
    port = os.environ.get("DB_PORT", "5432")
    user = os.environ.get("DB_USER", "postgres")
    password = os.environ.get("DB_PASSWORD", "admin123")
    dbname = os.environ.get("DB_NAME", "postgres")
    
    return psycopg2.connect(
        host=host,
        port=port,
        user=user,
        password=password,
        dbname=dbname
    )

def init_db():
    conn = get_conn()
    c = conn.cursor()
    c.execute("""
    CREATE TABLE IF NOT EXISTS users (
        username VARCHAR(100) PRIMARY KEY,
        password VARCHAR(256),
        question VARCHAR(256),
        answer VARCHAR(256)
    )
    """)
    c.execute("""
    CREATE TABLE IF NOT EXISTS history (
        id SERIAL PRIMARY KEY,
        "user" VARCHAR(100),
        type VARCHAR(100),
        value TEXT,
        confidence REAL,
        timestamp VARCHAR(100)
    )
    """)
    conn.commit()
    conn.close()

def create_user(username, password, question, answer):
    try:
        conn = get_conn()
        c = conn.cursor()
        c.execute("""
            INSERT INTO users (username, password, question, answer)
            VALUES (%s, %s, %s, %s)
        """, (username, password, question, answer.strip().lower()))
        conn.commit()
        conn.close()
        return True
    except Exception:
        return False

def verify_user(username, password):
    conn = get_conn()
    c = conn.cursor()
    c.execute("""
        SELECT password FROM users WHERE username = %s
    """, (username,))
    row = c.fetchone()
    conn.close()
    if row and row[0] == password:
        return True
    return False

def get_user_question(username):
    conn = get_conn()
    c = conn.cursor()
    c.execute("""
        SELECT question FROM users WHERE username = %s
    """, (username,))
    row = c.fetchone()
    conn.close()
    if row:
        return row[0]
    return None

def reset_password(username, answer, new_password):
    conn = get_conn()
    c = conn.cursor()
    c.execute("""
        SELECT answer FROM users WHERE username = %s
    """, (username,))
    row = c.fetchone()
    if row and row[0] == answer.strip().lower():
        c.execute("""
            UPDATE users SET password = %s WHERE username = %s
        """, (new_password, username))
        conn.commit()
        conn.close()
        return True
    conn.close()
    return False

def insert_record(user, type_, value, confidence, timestamp):
    conn = get_conn()
    c = conn.cursor()
    c.execute("""
        INSERT INTO history ("user", type, value, confidence, timestamp)
        VALUES (%s, %s, %s, %s, %s)
    """, (user, type_, value, confidence, timestamp))
    conn.commit()
    conn.close()

def fetch_history(user):
    conn = get_conn()
    c = conn.cursor()
    c.execute("""
        SELECT type, value, confidence, timestamp
        FROM history
        WHERE "user" = %s
        ORDER BY id DESC
    """, (user,))
    rows = c.fetchall()
    conn.close()
    return rows

def delete_history(user):
    conn = get_conn()
    c = conn.cursor()
    c.execute("""
        DELETE FROM history
        WHERE "user" = %s
    """, (user,))
    conn.commit()
    conn.close()
