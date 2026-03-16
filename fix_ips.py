import os

root_dir = r"c:\Users\vignan\Desktop\ai-interviewer\frontend\app"
for root, dirs, files in os.walk(root_dir):
    for file in files:
        if file.endswith((".tsx", ".ts", ".js", ".jsx")):
            path = os.path.join(root, file)
            with open(path, "r", encoding="utf-8") as f:
                content = f.read()
            if "127.0.0.1:5000" in content:
                new_content = content.replace("127.0.0.1:5000", "localhost:5000")
                with open(path, "w", encoding="utf-8") as f:
                    f.write(new_content)
                print(f"Updated {path}")
