import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

# Configuration
DB_HOST = 'localhost'
DB_USER = 'postgres'
DB_PASS = 'admin123' # This matches .env and will work under 'trust'
DB_NAME = 'ai_interviewer'

def setup_postgresql():
    print(f"🚀 Connecting to PostgreSQL as '{DB_USER}'...")
    try:
        # 1. Connect to default 'postgres' to create the target DB
        conn = psycopg2.connect(host=DB_HOST, user=DB_USER, password=DB_PASS, dbname='postgres', connect_timeout=5)
        conn.autocommit = True
        cur = conn.cursor()
        
        # Check if DB exists
        cur.execute(f"SELECT 1 FROM pg_database WHERE datname='{DB_NAME}'")
        if not cur.fetchone():
            print(f"📁 Creating database '{DB_NAME}'...")
            cur.execute(f"CREATE DATABASE {DB_NAME}")
        else:
            print(f"✅ Database '{DB_NAME}' already exists.")
            
        cur.close()
        conn.close()
        
        # 2. Connect to the new DB and initialize schema
        print(f"📝 Initializing tables in '{DB_NAME}'...")
        conn = psycopg2.connect(host=DB_HOST, user=DB_USER, password=DB_PASS, dbname=DB_NAME)
        cur = conn.cursor()
        
        # Users Table
        cur.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT UNIQUE,
                phone TEXT UNIQUE,
                password TEXT NOT NULL,
                photo TEXT, 
                resume_path TEXT,
                resume_score INTEGER,
                plan_id TEXT,
                college_name TEXT,
                role TEXT DEFAULT 'candidate',
                year TEXT,
                register_no TEXT,
                branch TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Interviews Table
        cur.execute('''
            CREATE TABLE IF NOT EXISTS interviews (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                overall_score REAL,
                details JSONB
            )
        ''')
        
        conn.commit()
        cur.close()
        conn.close()
        print("🎉 PostgreSQL Setup COMPLETE!")
        return True
        
    except Exception as e:
        print(f"❌ Setup Failed: {e}")
        return False

if __name__ == "__main__":
    setup_postgresql()
