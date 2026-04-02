import sqlite3
import os

db_path = 'ai_interviewer.db'
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    c.execute('SELECT email, resume_score, name FROM users WHERE email="sahi@gmail.com"')
    print(c.fetchone())
    conn.close()
else:
    print("DB not found")
