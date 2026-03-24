import os
import sys

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

try:
    from text_to_speech import generate_speech
    print("Testing generate_speech...")
    audio_path = generate_speech("Hello, this is a test of the text to speech system.")
    if audio_path:
        print(f"✅ Success! Audio saved at: {audio_path}")
        print(f"Size: {os.path.getsize(audio_path)} bytes")
    else:
        print("❌ Failed: audio_path is None")
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
