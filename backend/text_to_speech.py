import os
import uuid
import pyttsx3
import subprocess
from gtts import gTTS
from datetime import datetime

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))

def generate_speech(text, output_dir=None):
    """
    Converts text to speech. Prefers gTTS (Quality), falls back to pyttsx3 (Speed/Offline).
    """
    if output_dir is None:
        output_dir = os.path.join(CURRENT_DIR, "..", "static", "audio")
    output_dir = os.path.abspath(output_dir)
    os.makedirs(output_dir, exist_ok=True)
    
    unique_id = uuid.uuid4().hex
    filepath_mp3 = os.path.join(output_dir, f"speech_{unique_id}.mp3")
    
    print(f"🔊 generating audio for: {text[:40]}...")

    # 1. Try gTTS (Google TTS) - Stable and high quality
    try:
        from gtts import gTTS
        tts = gTTS(text=text, lang='en', tld='co.uk')
        tts.save(filepath_mp3)
        if os.path.exists(filepath_mp3) and os.path.getsize(filepath_mp3) > 0:
            print(f"✅ Audio OK (gTTS): {filepath_mp3}")
            return filepath_mp3
    except Exception as e:
        print(f"⚠️ gTTS failed: {e}")

    # 2. Try pyttsx3 in SUBPROCESS (Safe fallback)
    try:
        import sys
        temp_wav = os.path.join(output_dir, f"temp_{unique_id}.wav")
        script = r"""
import pyttsx3, sys
try:
    engine = pyttsx3.init()
    voices = engine.getProperty('voices')
    for v in voices:
        if 'david' in v.name.lower() or 'male' in v.name.lower():
            engine.setProperty('voice', v.id)
            break
    engine.save_to_file(sys.argv[1], sys.argv[2])
    engine.runAndWait()
except: sys.exit(1)
"""
        subprocess.run([sys.executable, "-c", script, text, temp_wav], timeout=15, capture_output=True)
        
        if os.path.exists(temp_wav):
            import imageio_ffmpeg
            ffmpeg_path = imageio_ffmpeg.get_ffmpeg_exe()
            cmd = [ffmpeg_path, "-y", "-i", temp_wav, "-ac", "1", "-b:a", "64k", filepath_mp3]
            subprocess.run(cmd, capture_output=True, check=False)
            try: os.remove(temp_wav)
            except: pass
            
            if os.path.exists(filepath_mp3):
                print(f"✅ Audio OK (pyttsx3): {filepath_mp3}")
                return filepath_mp3
    except Exception as e:
        print(f"❌ Fallback failed: {e}")

    return None
