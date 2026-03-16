import os
import uuid
import pyttsx3
import subprocess
from gtts import gTTS

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))

def generate_speech(text, output_dir=None):
    """
    Converts text to speech. Prefers pyttsx3 (SAPI5 male) on Windows, 
    falls back to gTTS.
    Returns the path to the generated audio file.
    """
    if output_dir is None:
        output_dir = os.path.join(CURRENT_DIR, "..", "static", "audio")
    output_dir = os.path.abspath(output_dir)

    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    unique_id = uuid.uuid4().hex
    temp_audio = os.path.join(output_dir, f"temp_{unique_id}.wav")
    filepath_wav = os.path.join(output_dir, f"speech_{unique_id}.wav")
    filepath_mp3 = os.path.join(output_dir, f"speech_{unique_id}.mp3")
    
    print(f"Generating speech for: {text[:50]}...")
    
    # Try pyttsx3 for male voice selection on Windows
    try:
        import sys
        py_code = """import sys, pyttsx3, os
text = sys.argv[1]
filename = sys.argv[2]
try:
    engine = pyttsx3.init()
    engine.setProperty('rate', 170)
    engine.setProperty('volume', 1.0)
    for v in engine.getProperty('voices'):
        if 'david' in v.name.lower() or 'male' in v.name.lower():
            engine.setProperty('voice', v.id)
            break
    engine.save_to_file(text, filename)
    engine.runAndWait()
except Exception as e:
    sys.exit(1)
"""
        proc = subprocess.run(
            [sys.executable, "-c", py_code, text, temp_audio],
            capture_output=True, text=True, timeout=15
        )
        
        # SAPI sometimes appends extensions or changes them
        actual_temp = temp_audio
        if not os.path.exists(temp_audio):
             parent = os.path.dirname(temp_audio)
             matching = [f for f in os.listdir(parent) if f.startswith(f"temp_{unique_id}")]
             if matching:
                 actual_temp = os.path.join(parent, matching[0])

        import imageio_ffmpeg
        ffmpeg_path = imageio_ffmpeg.get_ffmpeg_exe()
        
        if proc.returncode == 0 and os.path.exists(actual_temp):
            # Convert to 24kHz WAV & MP3
            # WAV for proctoring/lipsync, MP3 for browser compatibility
            cmd_wav = [ffmpeg_path, "-y", "-i", actual_temp, "-af", "silenceremove=start_periods=1:start_silence=0.05:start_threshold=-40dB,volume=1.5", "-ar", "24000", "-ac", "1", filepath_wav]
            cmd_mp3 = [ffmpeg_path, "-y", "-i", actual_temp, "-af", "silenceremove=start_periods=1:start_silence=0.05:start_threshold=-40dB,volume=1.5", "-ar", "24000", "-ac", "1", "-b:a", "128k", filepath_mp3]
            
            subprocess.run(cmd_wav, capture_output=True, check=False)
            subprocess.run(cmd_mp3, capture_output=True, check=False)
            
            if os.path.exists(filepath_mp3):
                try: os.remove(actual_temp)
                except: pass
                print(f"Audio generated successfully (pyttsx3): {filepath_mp3}")
                return filepath_mp3 # Return MP3 for best compatibility
            else:
                print(f"Error: FFmpeg conversion failed for pyttsx3.")
                with open("debug_generate.log", "a", encoding="utf-8") as f:
                    f.write(f"FFmpeg pyttsx3 error\n")
    except Exception as e:
        print(f"Warning: pyttsx3 failed, falling back to gTTS: {e}")

    # Fallback to gTTS
    try:
        print("🌐 Falling back to gTTS...")
        temp_mp3 = os.path.join(output_dir, f"g_temp_{unique_id}.mp3")
        tts = gTTS(text=text, lang='en', tld='co.uk')
        tts.save(temp_mp3)
        
        import imageio_ffmpeg
        ffmpeg_path = imageio_ffmpeg.get_ffmpeg_exe()
        
        cmd_mp3 = [ffmpeg_path, "-y", "-i", temp_mp3, "-af", "silenceremove=start_periods=1:start_silence=0.05:start_threshold=-40dB,volume=1.5", "-ar", "24000", "-ac", "1", "-b:a", "128k", filepath_mp3]
        result = subprocess.run(cmd_mp3, capture_output=True, check=False)
        
        if os.path.exists(filepath_mp3):
            try: os.remove(temp_mp3)
            except: pass
            print(f"Audio generated successfully (gTTS): {filepath_mp3}")
            return filepath_mp3
        return None
    except Exception as e:
        print(f"Error in TTS generation: {e}")
        return None
