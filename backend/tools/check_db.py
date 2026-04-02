import sqlite3
import os

db_path = '../ai_interviewer.db'
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    c.execute("SELECT id, name, email, (CASE WHEN photo IS NULL OR photo = '' THEN 'MISSING' ELSE 'EXISTS' END) FROM users ORDER BY id DESC LIMIT 5")
    rows = c.fetchall()
    print("Latest 5 users:")
    for row in rows:
        print(row)
    conn.close()
else:
    print(f"DB not found at {db_path}")
