import os
from text_to_speech import generate_speech

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))

class InterviewVideoPipeline:
    def __init__(self, avatar_source=None):
        # Audio-only pipeline, we ignore avatar_source but keep the structure for compatibility
        os.makedirs(os.path.abspath(os.path.join(CURRENT_DIR, "..", "static", "audio")), exist_ok=True)

    def generate_question_video(self, text):
        """
        Modified pipeline: Text -> Speech only (LipSync Removed)
        """
        print(f"Starting audio-only pipeline for: {text[:50]}...", flush=True)
        
        # 1. Generate Speech
        audio_path = generate_speech(text)
        if not audio_path:
            print("❌ Failed to generate speech.", flush=True)
            return None
        
        # Return only audio as video generation is disabled
        return {
            "audio_url": audio_path
        }

pipeline = InterviewVideoPipeline()

def generate_synced_video(text, avatar_path=None):
    # avatar_path is ignored now
    result = pipeline.generate_question_video(text)
    
    if result and "audio_url" in result:
        return None, result["audio_url"]
    else:
        raise Exception("Failed to generate audio.")
