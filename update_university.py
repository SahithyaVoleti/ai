import sys
import os

# Add backend to path so we can import database
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

import database
from dotenv import load_dotenv

load_dotenv()

# We need to find the user ID for sahi@gmail.com
def fix():
    conn, db_type = database.get_db_connection()
    c = conn.cursor()
    
    if db_type == 'postgres':
        query = "UPDATE users SET college_name = 'Vignan University' WHERE email = 'sahi@gmail.com'"
        c.execute(query)
    else:
        query = "UPDATE users SET college_name = 'Vignan University' WHERE email = 'sahi@gmail.com'"
        c.execute(query)
        
    conn.commit()
    print(f"Updated {c.rowcount} rows. DB type was {db_type}")
    conn.close()

if __name__ == '__main__':
    fix()
