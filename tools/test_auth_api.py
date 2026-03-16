import requests
import json
import time

BASE_URL = "http://127.0.0.1:5000/api"

def test_auth():
    print("Testing Signup...")
    signup_data = {
        "name": "Test User",
        "email": f"test_{int(time.time())}@example.com",
        "phone": str(int(time.time())),
        "password": "password123",
        "photo": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
        "year": "2024"
    }
    try:
        r = requests.post(f"{BASE_URL}/auth/signup", json=signup_data)
        print(f"Signup Status: {r.status_code}")
        print(f"Signup Response: {r.text}")
        
        if r.status_code == 200:
            print("\nTesting Login...")
            login_data = {
                "identifier": signup_data["email"],
                "password": signup_data["password"]
            }
            r = requests.post(f"{BASE_URL}/auth/login", json=login_data)
            print(f"Login Status: {r.status_code}")
            print(f"Login Response: {r.text}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_auth()
