import sys
import os

backend_dir = r"c:\Users\Dell\Desktop\ai-interviewer main1\backend"
sys.path.append(backend_dir)

from text_to_speech import generate_speech

print("Starting TTS Test...")
res = generate_speech("Welcome to the interview. Please describe your experience.")
print(f"Result: {res}")
if res and os.path.exists(res):
    print("✅ Success! Audio file exists.")
else:
    print("❌ Failed or file does not exist.")
