import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

def check_db():
    try:
        conn = psycopg2.connect(
            host=os.getenv('DB_HOST', 'localhost'),
            user=os.getenv('DB_USER', 'postgres'),
            password=os.getenv('DB_PASSWORD', 'admin123'),
            dbname=os.getenv('DB_NAME', 'ai_interviewer'),
            port=os.getenv('DB_PORT', 5432)
        )
        c = conn.cursor()
        c.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public'")
        tables = c.fetchall()
        print(f"Tables: {tables}")
        
        for table in tables:
            t_name = table[0]
            c.execute(f"SELECT COUNT(*) FROM {t_name}")
            count = c.fetchone()[0]
            print(f"Table {t_name}: {count} rows")
            
            if t_name == 'users':
                c.execute("SELECT email, role FROM users")
                users = c.fetchall()
                print(f"Users: {users}")
        
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_db()
