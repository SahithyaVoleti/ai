import sqlite3
try:
    conn = sqlite3.connect('ai_interviewer.db')
    c = conn.cursor()
    c.execute("ALTER TABLE interviews ADD COLUMN status TEXT DEFAULT 'started'")
    c.execute("ALTER TABLE interviews ADD COLUMN module_name TEXT")
    conn.commit()
    print("Columns added.")
except Exception as e:
    print(e)
