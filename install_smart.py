import subprocess
import os

req_file = "requirements.txt"
if not os.path.exists(req_file):
    print(f"Error: {req_file} not found")
    exit(1)

with open(req_file, "r") as f:
    lines = f.readlines()

packages = []
for line in lines:
    line = line.strip()
    if line and not line.startswith("#"):
        packages.append(line)

print(f"Found {len(packages)} packages to install.")

pip_path = os.path.abspath(os.path.join(".venv", "Scripts", "pip.exe"))
if not os.path.exists(pip_path):
    print(f"Error: {pip_path} not found")
    exit(1)

for pkg in packages:
    print(f"\n--- Installing {pkg} ---")
    try:
        # Increase timeout per item
        res = subprocess.run([pip_path, "install", pkg, "--default-timeout=1000"], capture_output=False)
        if res.returncode != 0:
            print(f"Failed to install {pkg}. Continuing for other packages...")
        else:
            print(f"Successfully installed {pkg}")
    except Exception as e:
         print(f"Exception for {pkg}: {e}")

print("\nDone with smart installation pass!")
