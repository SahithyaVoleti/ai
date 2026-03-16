import cv2
import sys
import os

print(f"Python Version: {sys.version}")

try:
    import face_recognition
    print("✅ face_recognition installed")
except ImportError:
    print("❌ face_recognition NOT installed")

try:
    from ultralytics import YOLO
    print("✅ ultralytics installed")
except ImportError:
    print("❌ ultralytics NOT installed")

try:
    import mediapipe
    print("✅ mediapipe installed")
except ImportError:
    print("❌ mediapipe NOT installed")

try:
    import deepface
    print("✅ deepface installed")
except ImportError:
    print("❌ deepface NOT installed")

try:
    import tensorflow as tf
    print(f"✅ tensorflow installed: {tf.__version__}")
except ImportError:
    print("❌ tensorflow NOT installed")
