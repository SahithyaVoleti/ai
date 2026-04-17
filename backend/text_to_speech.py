import os
import uuid
import pyttsx3
import subprocess
from gtts import gTTS
from datetime import datetime

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))

def generate_speech(text, output_dir=None):
    """
    Converts text to speech. Prioritizes Male voice via pyttsx3 (User Request).
    """
    if output_dir is None:
        output_dir = os.path.join(CURRENT_DIR, "..", "static", "audio")
    output_dir = os.path.abspath(output_dir)
    os.makedirs(output_dir, exist_ok=True)
    
    unique_id = uuid.uuid4().hex
    filepath_mp3 = os.path.join(output_dir, f"speech_{unique_id}.mp3")
    
    print(f"🔊 generating audio for: {text[:40]}...")

    # 1. Try pyttsx3 FIRST (User specifically requested MALE voice)
    try:
        import sys
        import imageio_ffmpeg
        temp_wav = os.path.join(output_dir, f"temp_{unique_id}.wav")
        script = r"""
import pyttsx3, sys
try:
    engine = pyttsx3.init()
    voices = engine.getProperty('voices')
    
    # Strictly prioritize 'David', 'James', 'Male', or any non-female voice
    selected_voice = voices[0].id
    for v in voices:
        v_name = v.name.lower()
        if 'david' in v_name or 'james' in v_name or 'male' in v_name or 'guy' in v_name:
            selected_voice = v.id
            break
        # Avoid anything that explicitly says 'female' or 'zira' (common female voice)
        if 'female' not in v_name and 'zira' not in v_name and 'samantha' not in v_name:
             selected_voice = v.id
             
    engine.setProperty('voice', selected_voice)
    engine.setProperty('rate', 155) # Clear, professional pace
    engine.save_to_file(sys.argv[1], sys.argv[2])
    engine.runAndWait()
except Exception as e:
    sys.exit(1)
"""
        subprocess.run([sys.executable, "-c", script, text, temp_wav], timeout=15, capture_output=True)
        
        if os.path.exists(temp_wav) and os.path.getsize(temp_wav) > 100:
            ffmpeg_path = imageio_ffmpeg.get_ffmpeg_exe()
            cmd = [ffmpeg_path, "-y", "-i", temp_wav, "-ac", "1", "-b:a", "128k", filepath_mp3]
            subprocess.run(cmd, capture_output=True, check=False)
            try: os.remove(temp_wav)
            except: pass
            
            if os.path.exists(filepath_mp3) and os.path.getsize(filepath_mp3) > 100:
                print(f"✅ Audio OK (pyttsx3 Male): {filepath_mp3}")
                return filepath_mp3
    except Exception as e:
        print(f"⚠️ pyttsx3 failed: {e}")

    # 2. Try edge-tts SECOND (High quality Cloud MALE voice)
    try:
        import asyncio
        import edge_tts
        
        # Select a strong male voice
        MALE_VOICE = "en-US-GuyNeural" # or "en-US-ChristopherNeural"
        
        async def generate_edge_tts():
            communicate = edge_tts.Communicate(text, MALE_VOICE)
            await communicate.save(filepath_mp3)
            
        asyncio.run(generate_edge_tts())
        
        if os.path.exists(filepath_mp3) and os.path.getsize(filepath_mp3) > 100:
            print(f"✅ Audio OK (edge-tts Male): {filepath_mp3}")
            return filepath_mp3
    except Exception as e:
        print(f"⚠️ edge-tts failed: {e}")

    # 3. Last Fallback: gTTS (Note: This is default female - avoided if possible)
    try:
        from gtts import gTTS
        # Attempt to use a TLD that might sound different, but still female-heavy
        tts = gTTS(text=text, lang='en', tld='com')
        tts.save(filepath_mp3)
        if os.path.exists(filepath_mp3) and os.path.getsize(filepath_mp3) > 100:
            print(f"✅ Audio OK (gTTS Fallback): {filepath_mp3}")
            return filepath_mp3
    except Exception as e:
        print(f"❌ Fallback gTTS failed: {e}")

    return None
