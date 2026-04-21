import sqlite3
import os

db_path = 'ai_interviewer.db'
if not os.path.exists(db_path):
    print(f"Error: {db_path} not found")
    exit(1)

conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

try:
    cursor.execute("SELECT id, user_id, date, overall_score, video_path FROM interviews ORDER BY date DESC LIMIT 5")
    rows = cursor.fetchall()
    for row in rows:
        print(f"ID: {row['id']} | UserID: {row['user_id']} | Date: {row['date']} | Score: {row['overall_score']} | VideoPath: {row['video_path']}")
except Exception as e:
    print(f"Error: {e}")
finally:
    conn.close()
