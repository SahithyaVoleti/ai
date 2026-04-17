import urllib.request
import json

try:
    response = urllib.request.urlopen('http://localhost:5000/api/prep_drills')
    data = json.load(response)
    print(f"Status: {data.get('status')}")
    print(f"Keys: {list(data.keys())}")
    print(f"Self Intro Count: {len(data.get('self_intro', []))}")
    print(f"Projects Count: {len(data.get('projects', []))}")
    if len(data.get('self_intro', [])) > 0:
        print(f"First Intro Title: {data['self_intro'][0].get('title')}")
except Exception as e:
    print(f"Error: {e}")
