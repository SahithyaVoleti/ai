import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

# Configuration from .env
DB_USER = os.environ.get('DB_USER', 'postgres')
DB_PASSWORD = os.environ.get('DB_PASSWORD', 'admin123')
DB_HOST = os.environ.get('DB_HOST', 'localhost')
DB_PORT = os.environ.get('DB_PORT', '5432')
DB_NAME = os.environ.get('DB_NAME', 'ai_interviewer')

def check_postgres():
    # 1. Try connecting to the specific database
    try:
        conn = psycopg2.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            dbname=DB_NAME,
            port=DB_PORT,
            connect_timeout= 3
        )
        print(f"✅ SUCCESS: Connected to '{DB_NAME}'")
        conn.close()
        return True
    except Exception as e:
        print(f"❌ FAILED to connect to '{DB_NAME}': {e}")
        
    # 2. Try connecting to the default 'postgres' database to see if we can create the target DB
    try:
        conn = psycopg2.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            dbname='postgres',
            port=DB_PORT,
            connect_timeout= 3
        )
        print(f"✅ SUCCESS: Connected to 'postgres' system DB.")
        
        # Check if ai_interviewer exists
        conn.autocommit = True
        cur = conn.cursor()
        cur.execute(f"SELECT 1 FROM pg_database WHERE datname='{DB_NAME}'")
        exists = cur.fetchone()
        
        if not exists:
            print(f"🚀 Database '{DB_NAME}' DOES NOT EXIST. Attempting to create it...")
            try:
                cur.execute(f"CREATE DATABASE {DB_NAME}")
                print(f"🎉 Database '{DB_NAME}' created successfully!")
            except Exception as ce:
                print(f"❌ FAILED to create database: {ce}")
        else:
            print(f"ℹ️ Database '{DB_NAME}' exists, but connection with those credentials failed elsewhere.")
            
        cur.close()
        conn.close()
    except Exception as e:
        print(f"❌ FAILED to connect to 'postgres' system DB: {e}")

if __name__ == "__main__":
    check_postgres()
