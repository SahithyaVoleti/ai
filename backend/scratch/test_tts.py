import sys, os, time

# Add parent dir to path to import tts logic if needed
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

def test_tts():
    text = "System check. Audio testing initiated."
    timestamp = int(time.time())
    filename_wav = f"test_tts_{timestamp}.wav"
    
    print(f"Testing pyttsx3 subprocess...")
    py_code = f"""import sys, pyttsx3
text = {repr(text)}
filename = {repr(filename_wav)}
try:
    engine = pyttsx3.init()
    engine.save_to_file(text, filename)
    engine.runAndWait()
    print('SUCCESS')
except Exception as e:
    print(f'ERROR: {{e}}')
    sys.exit(1)
"""
    import subprocess
    proc = subprocess.run(
        [sys.executable, "-c", py_code],
        capture_output=True, text=True
    )
    print("STDOUT:", proc.stdout)
    print("STDERR:", proc.stderr)
    
    if os.path.exists(filename_wav) and os.path.getsize(filename_wav) > 0:
        print(f"✅ pyttsx3 SUCCESS. File size: {os.path.getsize(filename_wav)}")
        os.remove(filename_wav)
    else:
        print("❌ pyttsx3 FAILED.")

if __name__ == "__main__":
    test_tts()
