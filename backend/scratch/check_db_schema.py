import sqlite3
conn = sqlite3.connect('ai_interviewer.db')
cursor = conn.cursor()
cursor.execute("PRAGMA table_info(interviews)")
for col in cursor.fetchall():
    print(col)
conn.close()
