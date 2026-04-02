import sqlite3
import os

db_path = '../ai_interviewer.db'
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    c.execute("SELECT id, name, email, length(photo) FROM users ORDER BY id DESC LIMIT 10")
    rows = c.fetchall()
    print("Latest 10 users with photo lengths:")
    for row in rows:
        print(row)
    conn.close()
else:
    print(f"DB not found at {db_path}")
