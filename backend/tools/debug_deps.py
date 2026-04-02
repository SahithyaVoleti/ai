import traceback
print("--- Check PDFMINER ---")
try:
    from pdfminer.high_level import extract_text
    print("PDFMiner: OK")
except Exception:
    traceback.print_exc()

print("\n--- Check MEDIAPIPE ---")
try:
    import mediapipe as mp
    from mediapipe.solutions import face_mesh
    print("MediaPipe: OK")
except Exception:
    traceback.print_exc()

print("\n--- Check DEEPFACE ---")
try:
    from deepface import DeepFace
    print("DeepFace: OK")
except Exception:
    traceback.print_exc()

print("\n--- Check FACE_RECOGNITION ---")
try:
    import face_recognition
    print("Face Recognition: OK")
except Exception:
    traceback.print_exc()
