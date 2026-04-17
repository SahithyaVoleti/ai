import urllib.request
import json

BASE = "http://127.0.0.1:5000"

def check(label, path, method="GET", data=None):
    url = BASE + path
    try:
        req = urllib.request.Request(url, method=method)
        req.add_header("Content-Type", "application/json")
        if data:
            req.data = json.dumps(data).encode()
        with urllib.request.urlopen(req, timeout=8) as r:
            body = json.loads(r.read())
            status = body.get("status", "?")
            print(f"  [OK {r.status}]  {label} -> status={status}")
    except urllib.error.HTTPError as e:
        try:
            body = json.loads(e.read())
            msg = body.get("message", str(body))
        except Exception:
            msg = str(e)
        print(f"  [HTTP {e.code}] {label} -> {msg}")
    except Exception as e:
        print(f"  [ERR]      {label} -> {e}")

print("\n=== Backend API Health Check ===\n")

check("Health",                "/api/health")
check("Admin Stats",           "/api/admin/stats")
check("Admin Candidates",      "/api/admin/candidates")
check("Prep Drills",           "/api/prep_drills")
check("Forgot PW (not found)", "/api/auth/forgot-password", "POST", {"email": "nobody@test.com"})
check("Forgot PW (valid)",     "/api/auth/forgot-password", "POST", {"email": "test_tracker@example.com"})
check("Login (invalid)",       "/api/auth/login",           "POST", {"identifier": "bad@bad.com", "password": "wrong"})
check("Get Problems",          "/api/get_problems")

print("\n=== Done ===\n")
