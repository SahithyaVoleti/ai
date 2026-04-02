import os
import sys
import uuid
import subprocess

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
output_dir = os.path.join(CURRENT_DIR, "..", "static", "audio")
os.makedirs(output_dir, exist_ok=True)

text = "Hello, this is a deep debug of the TTS system."
unique_id = "debug_test"
temp_wav = os.path.join(output_dir, f"temp_{unique_id}.wav")

print(f"--- DEBUG TTS START ---")
print(f"Output Dir: {output_dir}")
print(f"Temp WAV: {temp_wav}")

# Using a RAW string for the script to avoid f-string evaluation errors
script = r"""
import pyttsx3, sys, os
print("Subprocess started...")
try:
    engine = pyttsx3.init()
    print(f"Engine initialized: {engine}")
    voices = engine.getProperty('voices')
    print(f"Voices found: {len(voices)}")
    print(f"Target file: {sys.argv[2]}")
    engine.save_to_file(sys.argv[1], sys.argv[2])
    print("Saving to file...")
    engine.runAndWait()
    print("runAndWait completed.")
    if os.path.exists(sys.argv[2]):
        print(f"File created: {os.path.getsize(sys.argv[2])} bytes")
    else:
        print("File NOT created.")
except Exception as e:
    print(f"Subprocess ERROR: {e}")
    sys.exit(1)
"""

try:
    proc = subprocess.run([sys.executable, "-c", script, text, temp_wav], capture_output=True, text=True, timeout=15)
    print(f"Subprocess Return Code: {proc.returncode}")
    print(f"STDOUT:\n{proc.stdout}")
    print(f"STDERR:\n{proc.stderr}")
    
    if os.path.exists(temp_wav):
        print(f"✅ Success! WAV file exists.")
    else:
        print(f"❌ Failure! WAV file missing.")
except Exception as e:
    print(f"Critical Debug Error: {e}")
