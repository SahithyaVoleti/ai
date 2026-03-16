import os
import sys

# Add parent directory to sys.path
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(current_dir)
if backend_dir not in sys.path:
    sys.path.append(backend_dir)

import database
from flask import Flask

app = Flask(__name__)

def create_admin():
    print("--- Admin Account Creator ---")
    name = input("Enter Admin Name: ")
    email = input("Enter Admin Email: ")
    phone = input("Enter Admin Phone: ")
    password = input("Enter Admin Password: ")
    
    # Initialize DB (to ensure tables exist)
    database.init_db(app)
    
    user_id, error = database.create_user(
        name=name,
        email=email,
        phone=phone,
        password=password,
        photo="admin_placeholder",
        role='admin'
    )
    
    if user_id:
        print(f"✅ Admin created successfully! ID: {user_id}")
        print(f"You can now login at /login with {email}")
    else:
        print(f"❌ Error: {error}")

if __name__ == "__main__":
    create_admin()
