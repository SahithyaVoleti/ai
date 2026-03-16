
import requests

url = "http://127.0.0.1:5000/api/download_report/2"
try:
    response = requests.get(url, stream=True)
    print(f"Status Code: {response.status_code}")
    print("Headers (repr):")
    for k, v in response.headers.items():
        print(f"  {repr(k)}: {repr(v)}")
except Exception as e:
    print(f"Error: {e}")
