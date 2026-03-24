import cv2
import sys
import os
import numpy as np

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from proctoring_engine.service import ProctoringService

def test_verification():
    service = ProctoringService()
    
    # Path to images
    img1_path = r'c:\Users\vignan\Desktop\ai-interviewer\evidence\proof_IDENTITY_FRAUD_1773286454.jpg'
    img2_path = r'c:\Users\vignan\Desktop\ai-interviewer\evidence\proof_IDENTITY_FRAUD_1773286451.jpg'
    
    print(f"Checking images at: \n1: {img1_path}\n2: {img2_path}")
    
    if not os.path.exists(img1_path):
        print(f"ERROR: Image 1 not found")
        return
    if not os.path.exists(img2_path):
        print(f"ERROR: Image 2 not found")
        return

    img1 = cv2.imread(img1_path)
    img2 = cv2.imread(img2_path)
    
    print("--- Running Strict Identity Verification Test ---")
    matched, dist, msg, low_light = service.compare_profiles(img1, img2)
    
    print(f"Final Result: {'PASS' if matched else 'FAIL'}")
    print(f"Outcome Message: {msg}")
    print(f"Score (Distance/Diff): {dist:.4f}")
    
    print("\n--- DeepFace Manual Check ---")
    from deepface import DeepFace
    # Pass paths directly to DeepFace
    for backend in ['opencv', 'retinaface']:
        try:
            print(f"Testing DeepFace with {backend} detector...")
            # Use False for enforce_detection to see if it catches the face at all
            res = DeepFace.verify(img1_path, img2_path, model_name="VGG-Face", detector_backend=backend, enforce_detection=False)
            print(f"Result ({backend}): {res['verified']} (Dist: {res['distance']:.4f})")
            if 'face_confidence' in res: print(f"Confidence: {res['face_confidence']}")
        except Exception as e:
            print(f"DeepFace ({backend}) Failed: {e}")

if __name__ == "__main__":
    test_verification()
