import sqlite3
import os

db_path = r'c:\Users\vignan\Desktop\ai-interviewer\ai_interviewer.db'
if not os.path.exists(db_path):
    print(f"File not found: {db_path}")
    db_path = r'c:\Users\vignan\Desktop\ai-interviewer\backend\ai_interviewer.db'

print(f"Checking DB: {db_path}")
conn = sqlite3.connect(db_path)
c = conn.cursor()
c.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = c.fetchall()

for table in tables:
    table_name = table[0]
    print(f"\nTable: {table_name}")
    print("-" * 50)
    c.execute(f"PRAGMA table_info({table_name});")
    columns = c.fetchall()
    for col in columns:
        # id, name, type, notnull, dflt_value, pk
        print(f"  {col[1]} ({col[2]}) {'PK' if col[5] else ''} {'NOT NULL' if col[3] else ''}")

conn.close()
