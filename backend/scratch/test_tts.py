
import os
import sys

def test_pyttsx3():
    try:
        import pyttsx3
        engine = pyttsx3.init()
        engine.save_to_file("Testing pyttsx3 voice.", "test_pyttsx3.wav")
        engine.runAndWait()
        print("✅ pyttsx3 success")
        return True
    except Exception as e:
        print(f"❌ pyttsx3 failed: {e}")
        return False

def test_gtts():
    try:
        from gtts import gTTS
        tts = gTTS(text="Testing gTTS voice.", lang='en')
        tts.save("test_gtts.mp3")
        print("✅ gTTS success")
        return True
    except Exception as e:
        print(f"❌ gTTS failed: {e}")
        return False

print("--- TTS Diagnostics ---")
t1 = test_pyttsx3()
t2 = test_gtts()
