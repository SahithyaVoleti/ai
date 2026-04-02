import sys
import os

try:
    from pdfminer.high_level import extract_text
    print("✅ pdfminer.six installed successfully")
except ImportError:
    print("❌ pdfminer.six NOT installed")

try:
    import mediapipe as mp
    from mediapipe.solutions import face_mesh
    print("✅ mediapipe installed successfully")
except Exception as e:
    print(f"❌ mediapipe NOT working correctly: {e}")

try:
    from deepface import DeepFace
    print("✅ deepface installed successfully")
except Exception as e:
    print(f"❌ deepface NOT working correctly: {e}")

try:
    import face_recognition
    print("✅ face-recognition installed successfully")
except ImportError:
    print("❌ face-recognition NOT installed (dlib dependency issue common on Windows)")
