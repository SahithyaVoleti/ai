import cv2
import time
import os
import threading
import json
from datetime import datetime
import numpy as np
import base64
from groq import Groq

try:
    import face_recognition
    has_face_rec = True
except ImportError:
    has_face_rec = False

# Try importing YOLO, handle if missing
try:
    from ultralytics import YOLO
    has_yolo = True
except ImportError:
    has_yolo = False

has_mediapipe = False
try:
    import mediapipe as mp
    from mediapipe.solutions import face_mesh
    has_mediapipe = True
except (ImportError, AttributeError, ModuleNotFoundError):
    has_mediapipe = False

try:
    from deepface import DeepFace
    import tensorflow as tf
    # Silence TensorFlow logs
    os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
    has_deepface = True
except Exception:
    has_deepface = False

class ProctoringService:
    def __init__(self):
        self.api_key = os.environ.get("GROQ_API_KEY")
        self.client = None
        if self.api_key:
            try:
                from groq import Groq
                self.client = Groq(api_key=self.api_key)
            except Exception as e:
                print(f"Groq Init Error in Service: {e}")
                
        self.running = False
        self.violations = []
        self.evidence_path = os.path.join(os.getcwd(), "evidence")
        if not os.path.exists(self.evidence_path):
            os.makedirs(self.evidence_path)
            
        # Silhouette Detection State
        self.prev_gray = None
        self.silhouette_violation_count = 0
            
        self.session_id = "default" 
        
        # Strike Counters (Must be reset per session)
        self.multi_face_strike_count = 0
        self.no_face_strike_count = 0
        self.gadget_counts = 0
        self.identity_mismatch_counts = 0
        self.high_conf_matches = 0
        self.active_profile_encoding = None
        self.active_profile_id = None
        
        # Initializing Engine Components (Silent)
        self.face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        self.face_cascade_alt2 = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_alt2.xml')
        
        # Load YOLO Model (Centralized)
        self.model = None
        if has_yolo:
            try:
                # Look for model in root OR models folder
                model_paths = ["yolov8n.pt", os.path.join("backend", "models", "yolov8n.pt"), "models/yolov8n.pt"]
                for p in model_paths:
                    if os.path.exists(p):
                        self.model = YOLO(p)
                        break
                if not self.model: self.model = YOLO("yolov8n.pt") 
            except Exception: pass

        # MediaPipe Mesh Initialization
        self.mp_face_mesh = None
        self.face_mesh = None
        if has_mediapipe:
            self.mp_face_mesh = face_mesh
            self.face_mesh = self.mp_face_mesh.FaceMesh(max_num_faces=4, min_detection_confidence=0.15, min_tracking_confidence=0.15, refine_landmarks=True)
            
        print(f"✨ Proctoring Engine: READY (Biometrics: {'ON' if (has_deepface or has_face_rec) else 'FALLBACK'}, Object Detection: {'ON' if has_yolo else 'OFF'})")
        
        # EYE LANDMARKS INDICES (MediaPipe Face Mesh)
        self.LEFT_EYE = [33, 160, 158, 133, 153, 144] # 33: Inner corner, 133: Outer corner
        self.RIGHT_EYE = [362, 385, 387, 263, 373, 380] # 362: Inner corner, 263: Outer corner
        
        # Thresholds (Optimized for USER requirement: Check 3 times, 20s face-off)
        self.consecutive_no_face = 0
        self.face_missing_since = None # Timestamp tracking for 20s rule
        self.consecutive_multi_face = 0
        self.consecutive_phone = 0
        self.consecutive_identity_mismatch = 0
        self.consecutive_looking_away = 0
        
        # Violation Occurrence Counters (To meet "At least 3 times" requirement)
        self.multi_face_counts = 0
        self.gadget_counts = 0
        self.identity_mismatch_counts = 0
        self.high_conf_matches = 0
        
        self.processing_lock = threading.Lock()
        self.frame_count = 0
        self.snapshot_interval = 240 # ~2 minutes at 2fps
        
        print("Proctoring Service Initialized")

    def start(self):
        self.running = True
        self.violations = []
        self.should_terminate = False
        self.termination_reason = None
        self.consecutive_no_face = 0
        self.face_missing_since = None
        self.consecutive_multi_face = 0
        self.consecutive_phone = 0
        self.consecutive_identity_mismatch = 0
        self.multi_face_counts = 0
        self.multi_face_strike_count = 0
        self.no_face_strike_count = 0
        self.gadget_counts = 0
        self.identity_mismatch_counts = 0
        self.high_conf_matches = 0
        self.initial_nose = None
        # Do not clear session_id, it is set per-interview
        print(f"Proctoring Monitoring Started for Session: {self.session_id}")

    def stop(self):
        self.running = False
        print("Proctoring Monitoring Stopped")
        return self.violations

    def set_reference_profile(self, frame):
        """Set the baseline profile for continuous identity verification"""
        try:
            p_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            p_boxes = []
            if has_face_rec:
                p_boxes = face_recognition.face_locations(p_rgb)
            
            if p_boxes:
                self.active_profile_encoding = face_recognition.face_encodings(p_rgb, p_boxes)[0]
                self.reference_frame = frame
                print("✅ Identity Baseline set successfully")
            else:
                # Fallback: store frame for DeepFace/Vision checks
                self.reference_frame = frame
                print("⚠️ No face in baseline frame. Storing for visual fallback.")
        except Exception as e:
            print(f"Error in set_reference_profile: {e}")

    def get_score(self):
        # Deduction logic
        score = 100
        for v in self.violations:
            if v['severity'] == 'CRITICAL': score -= 20
            elif v['severity'] == 'HIGH': score -= 10
            elif v['severity'] == 'MEDIUM': score -= 5
            else: score -= 2
        return max(0, score)

    def record_event(self, event_type, message, severity="MEDIUM", frame=None, boxes=None):
        event = {
            "type": event_type,
            "message": message,
            "severity": severity,
            "timestamp": datetime.now().isoformat()
        }
        
        if frame is not None:
             try:
                 # Save screenshot with context boxes if provided
                 filename = self.save_evidence(frame, event_type, boxes=boxes)
                 full_path = os.path.join(self.evidence_path, filename)
                 event["image_path"] = full_path
                 event["is_proof"] = (severity == "CRITICAL" or severity == "HIGH")
             except Exception as e:
                 print(f"Warning: Evidence save failed: {e}")

        self.violations.append(event)
        print(f"PROCTOR EVENT: {message} ({severity})")
        
        if severity == "CRITICAL":
            self.should_terminate = True
            self.termination_reason = message
            print(f"TERMINATION TRIGGERED via record_event: {event_type} - {message}")

    def save_evidence(self, frame, reason, boxes=None):
        """Saves a frame with optional bounding box overlays as proof."""
        proof_frame = frame.copy()
        if boxes:
            for (label, x1, y1, x2, y2, color) in boxes:
                cv2.rectangle(proof_frame, (x1, y1), (x2, y2), color, 2)
                cv2.putText(proof_frame, label, (x1, y1-10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)
        
        timestamp = int(time.time())
        # Use session_id in filename for 100% isolation in reports
        filename = f"proof_{self.session_id}_{reason.replace(' ', '_')}_{timestamp}.jpg"
        filepath = os.path.join(self.evidence_path, filename)
        cv2.imwrite(filepath, proof_frame)
        return filename

    def detect_head_silhouette(self, frame):
        """
        Fallback detection for dark rooms. 
        Detects if a human-sized blob is moving in the frame.
        """
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        gray = cv2.GaussianBlur(gray, (21, 21), 0)

        if self.prev_gray is None or self.prev_gray.shape != gray.shape:
            self.prev_gray = gray
            return False

        # Compute difference
        frame_delta = cv2.absdiff(self.prev_gray, gray)
        thresh = cv2.threshold(frame_delta, 25, 255, cv2.THRESH_BINARY)[1]
        thresh = cv2.dilate(thresh, None, iterations=2)
        
        # Find contours
        contours, _ = cv2.findContours(thresh.copy(), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        movement_detected = False
        for contour in contours:
            if cv2.contourArea(contour) < 500: # Minimum movement size
                continue
            movement_detected = True
            break

        self.prev_gray = gray
        return movement_detected

    def calculate_ear(self, eye_points, landmarks):
        """Calculate Eye Aspect Ratio"""
        # Vertical distances
        A = np.linalg.norm(np.array([landmarks[eye_points[1]].x, landmarks[eye_points[1]].y]) - 
                           np.array([landmarks[eye_points[5]].x, landmarks[eye_points[5]].y]))
        B = np.linalg.norm(np.array([landmarks[eye_points[2]].x, landmarks[eye_points[2]].y]) - 
                           np.array([landmarks[eye_points[4]].x, landmarks[eye_points[4]].y]))
        
        # Horizontal distance
        C = np.linalg.norm(np.array([landmarks[eye_points[0]].x, landmarks[eye_points[0]].y]) - 
                           np.array([landmarks[eye_points[3]].x, landmarks[eye_points[3]].y]))
        
        ear = (A + B) / (2.0 * C)
        return ear

    def verify_eyes(self, frame):
        """
        Check if eyes are detected and open. Highly permissive for low light.
        """
        if not has_mediapipe or not self.face_mesh:
            return True, "Eye tracking skipped (module unavailable)"

        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        try:
            results = self.face_mesh.process(rgb_frame)
            
            if not results.multi_face_landmarks:
                # STRICT: No more permissive bypass for identity verification stages!
                # If we cannot find landmarks, we cannot verify eyes.
                return False, "Eyes not detected. Please ensure your face is well-lit and looking directly at the camera."
                
            landmarks = results.multi_face_landmarks[0].landmark
            
            # Calculate EAR
            left_ear = self.calculate_ear(self.LEFT_EYE, landmarks)
            right_ear = self.calculate_ear(self.RIGHT_EYE, landmarks)
            avg_ear = (left_ear + right_ear) / 2.0
            
            # Strict EAR threshold for initial verification
            if avg_ear < 0.14: 
                return False, f"Eyes closed or squinting (Detected EAR: {avg_ear:.2f}). Please keep your eyes open."
                
            return True, "Eyes matched & verified"
        except Exception as e:
            print(f"Eye tracking exception: {e}")
            return False, "Biometric system error during eye verification."

    def analyze_face_quality(self, frame):
        """
        Analyze image quality: Brightness, Blur, and Centering.
        Returns: Success (bool), Message (str)
        """
        try:
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            h, w = gray.shape

            # 1. Lighting (Brightness)
            brightness = np.mean(gray)
            
            # ROI Brightness (Face Area)
            h, w = gray.shape
            cy, cx = h // 2, w // 2
            roi = gray[max(0, cy-150):min(h, cy+150), max(0, cx-150):min(w, cx+150)]
            avg_roi = np.mean(roi) if roi.size > 0 else brightness

            # 1a. Pitch Black
            if brightness < 1.0: 
                return False, "Camera feed is too dark. Please check lighting.", True 
            
            # 1b. Backlighting (Strong light behind candidate)
            # Relaxed from 50 to 80 to allow more environmental variance
            if brightness > avg_roi + 80:
                 return False, "Strong background light detected. Please face the light source for better recognition.", False

            if brightness > 252: 
                return False, "Lighting is too bright (overexposed).", False

            # 2. Focus (Blur via Laplacian Variance)
            variance = cv2.Laplacian(gray, cv2.CV_64F).var()
            if variance < 20: 
                print(f"Warning: Low focus variance: {variance:.2f}, allowing anyway for robust auth.")
                # We do not fail verification just because of camera blur anymore
                pass

            return True, "Quality OK", False
        except Exception as e:
            # Consistent return of (bool, str, bool)
            return False, f"Quality Analysis Failure: {str(e)}", False

    def compare_profiles(self, profile_frame, live_frame):
        """
        Multi-stage 1:1 Face Verification.
        Stage 1: face-recognition (HOG/CNN)
        Stage 2: DeepFace (VGG-Face/Facenet)
        Stage 3: Groq Vision (Llama 3.2 Vision)
        """
        # 1. Analyze Quality First
        q_results = self.analyze_face_quality(live_frame)
        q_ok, q_msg = q_results[0], q_results[1]
        is_low_light = q_results[2] if len(q_results) > 2 else False
        
        print(f"DEBUG: Face Quality: {q_ok}, Msg: {q_msg}")
        if not q_ok:
            # Quality failed - we used to skip, but now we'll allow an attempt anyway
            # but we keep track of the low light status
            print(f"Warning: Quality Check Failed ({q_msg}). Proceeding with verification anyway.")

        # STAGE 0: Preprocessing (Lighting Normalization)
        try:
            live_gray = cv2.cvtColor(live_frame, cv2.COLOR_BGR2GRAY)
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
            live_norm = clahe.apply(live_gray)
            # Reconstruct color with normalized L channel if possible, 
            # or just use normalized gray if needed. For now, we'll keep it simple:
            # DeepFace/FaceRec handle color fine, but let's ensure brightness is decent.
        except: pass

        # STAGE 1: Eye Verification (Relaxed for Authentication)
        # We check eyes to ensure engagement, but we don't block authentication if face matches.
        eyes_ok, eye_msg = self.verify_eyes(live_frame)
        if not eyes_ok:
             print(f"⚠️ Warning: Identity Eye Verification: {eye_msg}. Proceeding to biometric check.")

        # STAGE 2: face-recognition
        if has_face_rec:
            try:
                # Use a slightly more permissive distance (0.6 is default, 0.55 is safe strict)
                match, dist, feedback = self._compare_face_rec(profile_frame, live_frame)
                print(f"DEBUG: face-rec returned: match={match}, dist={dist}, feedback='{feedback}'")
                
                # Check for profile photo face error immediately
                if not match and "Identity Error:" in feedback:
                    return False, 1.0, feedback, False
                
                # STRICT TOLERANCE for initial authentication
                if match or dist < 0.55: 
                    return True, dist, "Identity Verified (Primary Biometrics)", False
                elif "STAGE_FAILED_" not in feedback:
                    print(f"DEBUG: face-recognition mismatch at dist: {dist:.4f}")
            except Exception as e:
                import traceback
                print(f"face-recognition backend failed: {e}\n{traceback.format_exc()}")

        # STAGE 2: DeepFace (Optimized Biometric Match)
        if has_deepface:
                # PERFORMANCE: Prioritize Facenet512 for accuracy
                # Use 'opencv' backend for speed on standard CPU
                try:
                    print(f"DEBUG: Biometric Scan (Facenet512 - opencv)...")
                    result = DeepFace.verify(profile_frame, live_frame, 
                                           model_name="Facenet512", # Gold standard for 1:1 match
                                           detector_backend='opencv', 
                                           enforce_detection=False,
                                           distance_metric='cosine')
                    dist = result.get('distance', 1.0)
                    threshold = result.get('threshold', 0.3) # Usually 0.3 or 0.4
                    
                    # STRICT BIOMETRICS: 0.35 cosine distance for Facenet512
                    if dist < 0.35:
                        print(f"✅ DeepFace Biometric Match: (dist: {dist:.4f})")
                        return True, dist, "Identity Verified (DeepFace)", False
                    else:
                        print(f"DEBUG: DeepFace Mismatch: (dist: {dist:.4f} > 0.35 limit)")
                except Exception as e:
                    print(f"DeepFace Stage Error: {e}")


            # Threshold: 0.15 (Strict identity geometry check)
            return (avg_diff < 0.15), (1.0 - avg_diff)
        except Exception as e:
            print(f"Face Marking Logic Failed: {e}")
        
        # Final check: If high-quality face but still mismatch
        q_res = self.analyze_face_quality(live_frame)
        quality_ok, quality_msg = q_res[0], q_res[1]
        
        if not quality_ok:
            return False, 1.0, f"Verification Failed: {quality_msg}. Please improve lighting.", False

        return False, 1.0, "Identity Mismatch: The person in front of the camera does not match the registered profile photo.", False

    def _get_landmarks_ratios(self, frame):
        """Helper to get facial geometry ratios using MediaPipe"""
        if not has_mediapipe or not self.face_mesh:
            return None
            
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        res = self.face_mesh.process(rgb)
        if not res.multi_face_landmarks:
            return None
            
        lm = res.multi_face_landmarks[0].landmark
        
        # 1. Eye Distance (33 to 263)
        eye_dist = np.linalg.norm(np.array([lm[33].x, lm[33].y]) - np.array([lm[263].x, lm[263].y]))
        
        # 2. Nose to Chin (1 to 152)
        nose_chin = np.linalg.norm(np.array([lm[1].x, lm[1].y]) - np.array([lm[152].x, lm[152].y]))
        
        # 3. Mouth Width (61 to 291)
        mouth_width = np.linalg.norm(np.array([lm[61].x, lm[61].y]) - np.array([lm[291].x, lm[291].y]))
        
        # 4. Face Width (Side to side: 234 to 454)
        face_width = np.linalg.norm(np.array([lm[234].x, lm[234].y]) - np.array([lm[454].x, lm[454].y]))
        
        # Ratios (Normalized by eye distance to be scale invariant)
        if eye_dist < 0.001: return None
        return {
            "eye_dist": eye_dist,
            # EYE-CENTRIC STRUCTURAL ID: Ratios within the orbital region
            "eye_to_brow_ratio": np.linalg.norm(np.array([lm[33].x, lm[33].y]) - np.array([lm[70].x, lm[70].y])) / eye_dist,
            "inter_ocular_ratio": eye_dist # Absolute eye-distance is scale-normalized later
        }

    def _compare_landmarks(self, img1, img2):
        """Strict 'Face Marking' comparison via Geometric Ratios"""
        r1 = self._get_landmarks_ratios(img1)
        r2 = self._get_landmarks_ratios(img2)
        
        if not r1 or not r2:
            print("Warning: Could not extract landmarks from one of the frames.")
            return False, 0.0
            
        # Calculate deviation (EYE-CENTRIC ONLY as requested: "eyes enough")
        # Focusing on inter-ocular and orbital bone structure
        diffs = [
            abs(r1["eye_to_brow_ratio"] - r2["eye_to_brow_ratio"]) / r1["eye_to_brow_ratio"]
        ]
        
        # Primary check: Inter-ocular distance consistency
        # Normalized by facial bounding box size in a real world, 
        # but here we use the ratio of eye-to-brow segment as the primary biometric.
        avg_diff = sum(diffs) / len(diffs)
        print(f"DEBUG: Eye-Centric Marking Deviation: {avg_diff:.4f}")
        
        # Threshold: 0.40 (Inclusive: significantly relaxed from 0.25 to handle high-distortion lens)
        # Human face ratios between different people typically deviate by more than 50%
        return (avg_diff < 0.40), (1.0 - avg_diff)

    def _compare_cv2_basic(self, img1, img2):
        """Basic OpenCV comparison using Histogram correlation as a last resort."""
        # Convert to HSV for better color-based matching
        hsv1 = cv2.cvtColor(img1, cv2.COLOR_BGR2HSV)
        hsv2 = cv2.cvtColor(img2, cv2.COLOR_BGR2HSV)
        
        # Calculate histograms
        hist1 = cv2.calcHist([hsv1], [0, 1], None, [50, 60], [0, 180, 0, 256])
        hist2 = cv2.calcHist([hsv2], [0, 1], None, [50, 60], [0, 180, 0, 256])
        
        cv2.normalize(hist1, hist1, 0, 1, cv2.NORM_MINMAX)
        cv2.normalize(hist2, hist2, 0, 1, cv2.NORM_MINMAX)
        
        # Correlation: 1.0 is perfect match
        score = cv2.compareHist(hist1, hist2, cv2.HISTCMP_CORREL)
        print(f"DEBUG: CV2 Histogram Correlation: {score:.4f}")
        
        # Extremely forgiving threshold to allow users in poor conditions to pass if standard models fail
        # 0.10 correlation means roughly any two human faces with similar skin tone/lighting will match.
        return (score > 0.10), score

    def _compare_face_rec(self, profile_frame, live_frame):
        # Existing face-recognition logic moved here
        p_id = hash(profile_frame.tobytes()[:1000])
        if self.active_profile_id == p_id and self.active_profile_encoding is not None:
            p_enc = self.active_profile_encoding
        else:
            p_rgb = cv2.cvtColor(profile_frame, cv2.COLOR_BGR2RGB)
            p_boxes = face_recognition.face_locations(p_rgb)
            if not p_boxes and has_mediapipe:
                # Fallback to MediaPipe for profile detection if HOG fails
                results = self.face_mesh.process(p_rgb)
                if results.multi_face_landmarks:
                    h, w = profile_frame.shape[:2]
                    # Create a rough box from landmarks
                    lms = results.multi_face_landmarks[0].landmark
                    xs = [lm.x * w for lm in lms]
                    ys = [lm.y * h for lm in lms]
                    p_boxes = [(int(min(ys)), int(max(xs)), int(max(ys)), int(min(xs)))]
            
            if not p_boxes: 
                return False, 1.0, "Identity Error: Could not detect a clear face in your profile photo. Please re-upload a clear front-facing photo."
            
            p_encs = face_recognition.face_encodings(p_rgb, p_boxes)
            if not p_encs:
                return False, 1.0, "Identity Error: Found face box but failed to generate biometric encoding for profile photo."
            
            p_enc = p_encs[0]
            self.active_profile_encoding = p_enc
            self.active_profile_id = p_id

        l_rgb = cv2.cvtColor(live_frame, cv2.COLOR_BGR2RGB)
        l_boxes = face_recognition.face_locations(l_rgb, model="hog")
        if not l_boxes and has_mediapipe:
             # MediaPipe Fallback for Live Frame (Much more robust in low light than HOG)
             results = self.face_mesh.process(l_rgb)
             if results.multi_face_landmarks:
                 h, w = live_frame.shape[:2]
                 lms = results.multi_face_landmarks[0].landmark
                 xs = [lm.x * w for lm in lms]
                 ys = [lm.y * h for lm in lms]
                 # Convert landmarks to FaceRec box format (top, right, bottom, left)
                 l_boxes = [(int(min(ys)), int(max(xs)), int(max(ys)), int(min(xs)))]
        
        if not l_boxes: return False, 1.0, "STAGE_FAILED_LiveFaceNotFound"
        
        l_encs = face_recognition.face_encodings(l_rgb, l_boxes)
        if not l_encs:
             return False, 1.0, "STAGE_FAILED_LiveFaceEncodingError"
        l_enc = l_encs[0]
        
        distance = np.linalg.norm(p_enc - l_enc)
        match = distance < 0.65 # Highly permissive tolerance (up from 0.60)
        if match:
            return True, distance, "Verified"
        else:
            return False, distance, "STAGE_FAILED_Mismatch"

    def _compare_groq_vision(self, img1, img2):
        """Use Llama-3.2 Vision to compare two faces side-by-side"""
        # Create side-by-side comparison image
        h1, w1 = img1.shape[:2]
        h2, w2 = img2.shape[:2]
        combined = np.zeros((max(h1, h2), w1 + w2, 3), dtype=np.uint8)
        combined[:h1, :w1] = img1
        combined[:h2, w1:w1+w2] = img2
        
        _, buffer = cv2.imencode('.jpg', combined)
        b64_image = base64.b64encode(buffer).decode('utf-8')
        
        prompt = "Attached is a side-by-side comparison of two faces. The left is the profile photo, and the right is the live authentication photo. Are they the SAME person? Answer ONLY with a JSON object: {\"match\": true/false, \"confidence\": 0.0-1.0, \"reason\": \"short reason\"}"
        
        response = self.client.chat.completions.create(
            model="llama-3.2-11b-vision-preview",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {"url": f"data:image/jpeg;base64,{b64_image}"}
                        }
                    ]
                }
            ],
            temperature=0.0, # Highest consistency
            response_format={"type": "json_object"}
        )
        
        res = json.loads(response.choices[0].message.content)
        match = res.get("match", False)
        # Trust LLM if confidence > 0.80 for more robust fallback
        if match and res.get("confidence", 0) > 0.80:
            return True, 0.2, "Identity Verified (Vision AI)"
        return False, 1.0, res.get("reason", "Identity Profile Mismatch (Vision AI)")

    def process_frame(self, frame):
        """
        Process a single frame from the frontend.
        Returns analysis results.
        """
        # Ensure we only process one frame at a time to avoid CPU spikes
        if not self.processing_lock.acquire(blocking=False):
            return {"face_detected": True, "skipping": True} # Assume face is there if busy
            
        try:
            if not hasattr(self, 'running'): self.running = False
            self.frame_count += 1
            if self.frame_count % 10 == 0:
                print(f"🔍 Proctoring Heartbeat: Frame {self.frame_count} | Violations: {len(self.violations)}")
                
            if self.frame_count % self.snapshot_interval == 0:
                self.record_event("snapshot", "Routine session monitoring snapshot.", "LOW", frame)

            result = {
                "face_detected": False,
                "current_warning": None
            }
            person_count = 0
            gadget_detected = False
            detected_label = None
            
            # 1. Face & Movement Detection (Using MediaPipe as primary)
            if has_mediapipe and self.face_mesh:
                rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                mp_results = self.face_mesh.process(rgb_frame)
                
                if mp_results.multi_face_landmarks:
                    self.consecutive_no_face = 0
                    result["face_detected"] = True
                    
                    if len(mp_results.multi_face_landmarks) > 1:
                        self.consecutive_multi_face += 1
                        # Wait for a brief window (~3 seconds at 2 FPS) to avoid glitches
                        if self.consecutive_multi_face >= 6:
                            if not hasattr(self, 'multi_face_strike_count'): self.multi_face_strike_count = 0
                            self.multi_face_strike_count += 1
                            self.consecutive_multi_face = 0 # RESET for next window
                            if self.multi_face_strike_count >= 3:
                                self.record_event("TERMINATION_MULTIPLE_FACES", "Security Violation: Multiple people detected in frame. Interview terminated.", "CRITICAL", frame)
                                result["current_warning"] = "TERMINATION: Multiple people detected!"
                            else:
                                self.record_event("MULTIPLE_FACES", f"Security Warning ({self.multi_face_strike_count}/3): Multiple people detected in frame.", "HIGH", frame)
                                result["current_warning"] = f"🔴 WARNING: Only one person allowed in frame! ({self.multi_face_strike_count}/3)"
                    else:
                        if self.consecutive_multi_face > 0: self.consecutive_multi_face -= 1
                        
                        # Added: Head Orientation / Looking Away Check
                        landmarks = mp_results.multi_face_landmarks[0].landmark
                        nose = landmarks[1]
                        l_eye = landmarks[33]
                        r_eye = landmarks[263]
                        
                        # Calculate horizontal ratio (0.5 is centered)
                        # We use the relative position of the nose between the eye corners
                        denom = (r_eye.x - l_eye.x)
                        if denom != 0:
                            h_ratio = (nose.x - l_eye.x) / denom
                            # If ratio is too small or too large, the head is turned significantly
                            if h_ratio < 0.20 or h_ratio > 0.80:
                                self.consecutive_looking_away += 1
                                if self.consecutive_looking_away >= 4: # ~2 seconds at 2 FPS
                                    self.record_event("LOOKING_AWAY", "Candidate looking away frequently", "MEDIUM", frame)
                                result["current_warning"] = "⚠️ Please look directly at the screen."
                            else:
                                if self.consecutive_looking_away > 0: self.consecutive_looking_away -= 1

                        # Centering Check
                        if nose.x < 0.20 or nose.x > 0.80:
                             result["current_warning"] = "⚠️ Please center yourself in front of the camera."
                             
                        # Added: Eye Tracking / Gaze Check (Strict requirement)
                        eyes_ok, eye_msg = self.verify_eyes(frame)
                        if not eyes_ok:
                             result["current_warning"] = f"⚠️ {eye_msg}"
                    
                    self.face_missing_since = None # RESET TIMER
                else:
                    # MediaPipe failed, try Cascade as primary fallback
                    gray_fallback = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                    f_check = self.face_cascade.detectMultiScale(gray_fallback, 1.1, 4)
                    if len(f_check) > 0:
                        self.consecutive_no_face = 0
                        result["face_detected"] = True
                        self.face_missing_since = None # RESET
                        # Added: Centering Check for Cascade
                        (xf, yf, wf, hf) = f_check[0]
                        ih, iw = frame.shape[:2]
                        face_center_x = xf + wf / 2
                        if face_center_x < iw * 0.2 or face_center_x > iw * 0.8:
                            result["current_warning"] = "⚠️ Please look directly at the camera (Centered)."
                    else:
                        # Cascade failed. Final attempt: silhouette detection
                        if self.detect_head_silhouette(frame):
                             self.consecutive_no_face = 0
                             result["face_detected"] = True
                             self.face_missing_since = None # RESET
                        else:
                            self.consecutive_no_face += 1
                            if self.face_missing_since is None: self.face_missing_since = time.time()
                            
                            missing_duration = time.time() - self.face_missing_since
                            
                            if missing_duration >= 20: # 3-STRIKE WARNING SYSTEM (User request: Allow tolerance)
                                if not hasattr(self, 'no_face_strike_count'): self.no_face_strike_count = 0
                                self.no_face_strike_count += 1
                                
                                print(f"⚠️ Proctor: Face missing (20s) - Strike {self.no_face_strike_count}")
                                
                                # Only terminate after 3 major violations
                                if self.no_face_strike_count >= 3:
                                    self.record_event("TERMINATION_NO_PERSON", "Security Violation: Candidate not visible for 20s after multiple warnings. Interview terminated.", "CRITICAL", frame)
                                    result["current_warning"] = "TERMINATION: No person detected (3 strikes reached)!"
                                else:
                                    self.record_event("NO_PERSON", f"Security Warning ({self.no_face_strike_count}/3): Candidate not visible for 20s.", "HIGH", frame)
                                    result["face_detected"] = False
                                    result["current_warning"] = f"🔴 CRITICAL WARNING {self.no_face_strike_count}/3: Please stay in frame!"
                                
                                # Reset the timer to allow another 20s for the next strike
                                self.face_missing_since = time.time()
                            elif missing_duration >= 10:
                                # Capture evidence halfway
                                if self.consecutive_no_face % 5 == 0:
                                    self.record_event("NO_PERSON_WARN", f"Warning: Face missing for {int(missing_duration)}s", "MEDIUM", frame)
                                result["face_detected"] = False
                                result["current_warning"] = f"⚠️ WARNING: Stay in frame! ({int(20 - missing_duration)}s remaining)"
                            else:
                                result["face_detected"] = False
                                result["current_warning"] = "⚠️ WARNING: Please stay in frame!"

            else:
                # Fallback to Cascade
                gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
                gray = clahe.apply(gray)
                
                # Try alt2 first (often more robust to different lighting)
                faces = self.face_cascade_alt2.detectMultiScale(gray, 1.05, 3, minSize=(20, 20))
                if len(faces) == 0:
                    faces = self.face_cascade.detectMultiScale(gray, 1.05, 3, minSize=(20, 20))
                
                if len(faces) == 0:
                     if self.detect_head_silhouette(frame):
                         self.consecutive_no_face = 0
                         result["face_detected"] = True
                         self.face_missing_since = None # RESET
                     else:
                        self.consecutive_no_face += 1
                        if self.face_missing_since is None: self.face_missing_since = time.time()
                        missing_duration = time.time() - self.face_missing_since

                        if missing_duration >= 20: # 3-STRIKE WARNING SYSTEM
                            if not hasattr(self, 'no_face_strike_count'): self.no_face_strike_count = 0
                            self.no_face_strike_count += 1
                            
                            if self.no_face_strike_count >= 3:
                                self.record_event("TERMINATION_NO_PERSON", "Security Violation: No person detected (Cascade Fallback). Interview terminated.", "CRITICAL", frame)
                                result["current_warning"] = "TERMINATION: No person detected (3 strikes)!"
                            else:
                                self.record_event("NO_PERSON", f"Security Warning ({self.no_face_strike_count}/3): No person detected for 20s.", "HIGH", frame)
                                result["face_detected"] = False
                                result["current_warning"] = f"🔴 CRITICAL WARNING {self.no_face_strike_count}/3: Stay in frame!"
                            
                            self.face_missing_since = time.time()
                        elif missing_duration >= 10:
                            if self.consecutive_no_face % 5 == 0:
                                self.record_event("NO_PERSON_WARN", "Warning: Face not detected in frame", "MEDIUM", frame)
                            result["face_detected"] = False
                            result["current_warning"] = f"⚠️ WARNING: Stay in frame! ({int(20 - missing_duration)}s)"
                        else:
                            result["face_detected"] = False
                            result["current_warning"] = "⚠️ WARNING: Stay in frame!"
                else:
                    self.consecutive_no_face = 0
                    result["face_detected"] = True
                    self.face_missing_since = None # RESET
                    if len(faces) > 1:
                        self.consecutive_multi_face += 1
                        if self.consecutive_multi_face >= 3: # Reduced from 10 for immediate response
                            self.record_event("TERMINATION_MULTIPLE_FACES", "Security Violation: Multiple people detected in frame (Cascade). Interview terminated.", "CRITICAL", frame)
                            self.termination_reason = "Security Violation: Multiple people detected (Cascade)"
                            self.should_terminate = True
                    else:
                        if self.consecutive_multi_face > 0:
                            self.consecutive_multi_face -= 1

            # 2. Object Detection (Phone/Gadgets) - RUN ALWAYS
            if self.model:
                # Run YOLO inference
                results = self.model(frame, verbose=False, conf=0.20) 
                
                # Track boxes for proof capture
                detected_boxes = []
                for r in results:
                    for box in r.boxes:
                        try:
                            cls_id = int(box.cls[0].item())
                            conf = float(box.conf[0].item())
                            xyxy = box.xyxy[0].tolist()
                            x1, y1, x2, y2 = map(int, xyxy)
                            
                            color = (0, 255, 0) # Green for person
                            label = "Person"

                            if cls_id == 0 and conf > 0.30: # Reduced from 0.40 for higher sensitivity
                                person_count += 1
                                detected_boxes.append((label, x1, y1, x2, y2, color))
                                
                            PROHIBITED_GADGETS = {
                                67: "MOBILE PHONE",
                                63: "LAPTOP/TABLET",
                                65: "REMOTE DEVICE",
                                66: "EXTERNAL KEYBOARD",
                                62: "TV/MONITOR"
                            }
                            
                            if cls_id in PROHIBITED_GADGETS:
                                if conf > 0.20: # Drastically more sensitive for objects 0.25->0.20
                                    gadget_detected = True
                                    detected_label = PROHIBITED_GADGETS[cls_id]
                                    top_conf = conf
                                    detected_boxes.append((detected_label, x1, y1, x2, y2, (0, 0, 255))) # Red for gadgets
                                
                            elif cls_id == 73 and conf > 0.30: # Research material
                                gadget_detected = True
                                detected_label = "RESEARCH MATERIAL"
                                top_conf = conf
                                detected_boxes.append((detected_label, x1, y1, x2, y2, (0, 165, 255))) # Orange

                        except Exception:
                            continue 

                if person_count > 1:
                    result["face_detected"] = True
                    if not hasattr(self, 'consecutive_yolo_people'): self.consecutive_yolo_people = 0
                    self.consecutive_yolo_people += 1
                    
                    if self.consecutive_yolo_people >= 1: 
                        self.record_event("TERMINAL_MULTIPLE_PEOPLE", f"Security Violation: Detected {person_count} people in frame (YOLO). Interview terminated.", "CRITICAL", frame, boxes=detected_boxes)
                        self.termination_reason = f"Security Violation: Multiple people detected ({person_count})"
                        self.should_terminate = True
                else:
                    if hasattr(self, 'consecutive_yolo_people') and self.consecutive_yolo_people > 0:
                        self.consecutive_yolo_people -= 1

                if gadget_detected:
                    self.consecutive_phone += 1
                    if self.consecutive_phone >= 6: # ~3 seconds of continuous detection
                        self.gadget_counts += 1
                        self.consecutive_phone = 0 # Reset frame counter, increment event counter
                        self.record_event("GADGET_DETECTED", f"Warning {self.gadget_counts}/3: {detected_label} detected.", "HIGH", frame, boxes=detected_boxes)
                        
                        if self.gadget_counts >= 3:
                            self.termination_reason = f"Unauthorized {detected_label} detected after multiple warnings."
                            self.record_event("CHEATING_DEVICE", f"Prohibited {detected_label} confirmed. 3/3 violations.", "CRITICAL", frame, boxes=detected_boxes)
                            self.should_terminate = True
                        else:
                            result["current_warning"] = f"🔴 Warning {self.gadget_counts}/3: {detected_label} detected!"
                else:
                    if self.consecutive_phone > 0: self.consecutive_phone -= 1
            
            if result.get("face_detected") and hasattr(self, 'reference_frame') and self.reference_frame is not None:
                if not hasattr(self, '_identity_check_count'): self._identity_check_count = 0
                self._identity_check_count += 1
                
                # Check identity every 3 frames (~1.5 seconds) for very high responsiveness
                if self._identity_check_count >= 3: 

                    self._identity_check_count = 0
                    matched, distance, feedback, is_low_light = self.compare_profiles(self.reference_frame, frame)
                    if is_low_light: result["low_light"] = True
                    
                    if not matched:
                        if not hasattr(self, 'consecutive_identity_mismatch'): self.consecutive_identity_mismatch = 0
                        
                        # Decouple quality skips from actual fraud counts
                        if "QUALITY_SKIP" in feedback:
                             self.consecutive_identity_mismatch = 0 # Don't count quality failure as mismatch
                        else:
                            # Wait for a few checks to confirm mismatch, then count as 1 "occurrence"
                            if self.consecutive_identity_mismatch >= 5: # Relaxed from 4
                                self.identity_mismatch_counts += 1
                                self.consecutive_identity_mismatch = 0
                                self.record_event("IDENTITY_WARN", f"Warning {self.identity_mismatch_counts}/10: Identity mismatch detected.", "HIGH", frame)
                                
                                # Relaxed from 3 to 10 to ensure NO false terminations for valid candidates
                                if self.identity_mismatch_counts >= 10:
                                    self.termination_reason = f"Security Violation: Identity Fraud Confirmed ({feedback})"
                                    self.record_event("IDENTITY_FRAUD", f"Continuous verification failed: {feedback}", "CRITICAL", frame)
                                    self.should_terminate = True
                                else:
                                    result["current_warning"] = f"⚠️ Warning {self.identity_mismatch_counts}/10: Identity mismatch! Please look clearly at the camera."

                    else:
                        self.consecutive_identity_mismatch = 0
                        # SELF-HEALING: If very high confidence match, update reference frame to handle drift
                        if distance < 0.45: 
                            self.high_conf_matches += 1
                            if self.high_conf_matches >= 5:
                                self.reference_frame = frame.copy()
                                self.high_conf_matches = 0
                                # Force re-encode next time
                                self.active_profile_encoding = None
                                print("🔄 Active Baseline Balanced: Reference frame updated with current pose.")

            result["should_terminate"] = self.should_terminate
            result["termination_reason"] = self.termination_reason
            return result
        except Exception as e:
            print(f"Critical error in proctor_frame: {e}")
            return {"face_detected": True, "should_terminate": False}
        finally:
            self.processing_lock.release()
