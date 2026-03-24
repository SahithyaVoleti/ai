from flask import Flask, jsonify, request, send_file
import requests
from dotenv import load_dotenv
load_dotenv() # Load variables from .env file
from flask_cors import CORS
import threading
import webbrowser
import time
import os
import sys

# Add the current directory to sys.path to ensure local imports work
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.append(current_dir)

from dotenv import load_dotenv
# Load .env from backend folder OR parent folder
load_dotenv(os.path.join(current_dir, ".env"))
load_dotenv(os.path.join(os.path.dirname(current_dir), ".env"))

import random

from werkzeug.utils import secure_filename
from datetime import datetime
import re
from manager import InterviewManager
from proctoring_engine.service import ProctoringService
import database
import smtplib
from email.message import EmailMessage
# from lip_sync_engine import engine as lip_sync_engine # Removed Wav2Lip

app = Flask(__name__)

# Error Handlers for JSON responses
@app.errorhandler(500)
def internal_error(error):
    import traceback
    print("[500 ERROR DETECTED]")
    traceback.print_exc()
    return jsonify({"status": "error", "message": "Internal Server Error", "details": str(error)}), 500

@app.errorhandler(404)
def not_found(error):
    print(f"[404 ERROR] {request.method} {request.path}")
    return jsonify({"status": "error", "message": f"Endpoint not found: {request.path}"}), 404

# Enable CORS for all domains
CORS(app)

# Initialize DB
database.init_db(app)

# Configure upload settings
UPLOAD_FOLDER = os.path.join(current_dir, 'resumes')
ALLOWED_EXTENSIONS = {'pdf'}
MAX_CONTENT_LENGTH = 20 * 1024 * 1024  # 20MB
app.config['MAX_CONTENT_LENGTH'] = MAX_CONTENT_LENGTH

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)


app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

@app.route('/resumes/<path:filename>')
def serve_resume(filename):
    from flask import send_from_directory
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

# Global storage
manager = InterviewManager()
proctor_service = ProctoringService()
current_problems = []
submitted_solutions = []
violations = []
interview_active = False
resume_uploaded = False
current_candidate_info = {}
otp_storage = {}

# Load default problems from code_engine
DEFAULT_PROBLEMS = []
try:
    from code_engine.problem_loader import load_problems
    DEFAULT_PROBLEMS = load_problems()
except Exception as e:
    print(f"Warning: Could not load code_engine problems: {e}")
    DEFAULT_PROBLEMS = [
        {
            "id": 1,
            "title": "Reverse a String",
            "description": "Write a function that reverses a string. The input string is given as an array of characters.",
            "difficulty": "Easy",
            "test_cases": [{"input": "hello", "output": "olleh"}]
        },
        {
            "id": 2,
            "title": "Palindrome Check",
            "description": "Determine if a given string is a palindrome (reads the same forwards and backwards).",
            "difficulty": "Easy",
            "test_cases": [{"input": "racecar", "output": "true"}]
        }
    ]

def send_otp_email(to_email, otp):
    """
    Sends a real email using Brevo (Bervo) API using .env credentials.
    """
    api_key = os.environ.get("BREVO_API_KEY")
    sender_email = os.environ.get("BREVO_SENDER_EMAIL")
    app_name = os.environ.get("BREVO_APP_NAME", "AI Interviewer")

    # ALWAYS Write to local file for development/debugging
    otp_file = "latest_otp.txt"
    try:
        with open(otp_file, "w") as f:
            f.write(f"OTP: {otp}\nTo: {to_email}\nTime: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"saved OTP to {otp_file}")
    except Exception as e:
        print(f"Failed to save OTP locally: {e}")

    if not api_key or "your_real_api_key" in api_key:
        print(f"\n[INFO]  EMAIL NOT SENT: BREVO_API_KEY not configured in .env")
        print(f"Current OTP: {otp} (Saved to {otp_file})\n")
        return True, f"Code generated. Check {otp_file} for code."

    print(f"\n📧 [Email Service] Attempting to send OTP via Brevo to: {to_email}")

    url = "https://api.brevo.com/v3/smtp/email"
    headers = {
        "accept": "application/json",
        "content-type": "application/json",
        "api-key": api_key
    }
    
    payload = {
        "sender": {"name": app_name, "email": sender_email},
        "to": [{"email": to_email}],
        "subject": f"{otp} is your verification code",
        "htmlContent": f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
                    <h1 style="color: white; margin: 0;">{app_name}</h1>
                </div>
                <div style="padding: 20px; text-align: center;">
                    <h2 style="color: #333;">Security Verification</h2>
                    <p style="color: #666; font-size: 16px;">Hello,</p>
                    <p style="color: #666; font-size: 16px;">Your secure verification code to reset your <strong>Interview Agent</strong> account password is:</p>
                    <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #4f46e5; margin: 20px 0;">
                        {otp}
                    </div>
                    <p style="color: #999; font-size: 12px;">This code will expire in 10 minutes for your security.</p>
                </div>
                <hr style="border: 0; border-top: 1px solid #eee;">
                <div style="text-align: center; padding-top: 10px;">
                    <p style="color: #aaa; font-size: 10px;">If you didn't request this code for your Interview Agent account, please ignore this email.</p>
                    <p style="color: #aaa; font-size: 10px;">&copy; 2026 {app_name} Team</p>
                </div>
            </div>
        """
    }

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        if response.status_code in [200, 201]:
            print(f"OTP Email Sent via Brevo successfully to {to_email}")
            return True, "Code sent to your email."
        else:
            print(f"Brevo API Error ({response.status_code}): {response.text}")
            return False, f"Email delivery failed (API Error). Check server console."
    except Exception as e:
        print(f"Connection Error: {e}")
        return False, f"Could not connect to email service"


# --- AUTH ENDPOINTS ---

@app.route('/api/auth/signup', methods=['POST'])
def signup():
    data = request.json
    name = data.get('name')
    email = data.get('email')
    phone = data.get('phone')
    password = data.get('password')
    year = data.get('year')
    college_name = data.get('college_name') # New field
    photo = data.get('photo') # Live captured image
    
    # STRICT: Check for Photo presence
    if not all([name, email, phone, password, photo]):
        return jsonify({"status": "error", "message": "All fields including live photo are mandatory."}), 400
        
    user_id, error = database.create_user(name, email, phone, password, photo, year=year, college_name=college_name)
    if error:
        return jsonify({"status": "error", "message": error}), 400
        
    return jsonify({"status": "success", "user_id": user_id, "name": name, "email": email})

@app.route('/api/admin/signup', methods=['POST'])
def admin_signup():
    data = request.json
    name = data.get('name')
    email = data.get('email')
    phone = data.get('phone')
    password = data.get('password')
    photo = data.get('photo')
    
    if not all([name, email, phone, password, photo]):
        return jsonify({"status": "error", "message": "All fields including photo are required for admin registration."}), 400
        
    user_id, error = database.create_user(
        name=name, 
        email=email, 
        phone=phone, 
        password=password, 
        photo=photo, 
        role='admin'
    )
    
    if error:
        return jsonify({"status": "error", "message": error}), 400
        
    return jsonify({"status": "success", "user_id": user_id, "message": "Admin account created successfully"})

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.json
    identifier = data.get('identifier') # Email or Phone
    password = data.get('password')
    
    user = database.authenticate_user(identifier, password)
    if user:
        return jsonify({"status": "success", "user": user})
    return jsonify({"status": "error", "message": "Invalid credentials"}), 401

@app.route('/api/admin/login', methods=['POST'])
def admin_login():
    data = request.json
    identifier = data.get('identifier')
    password = data.get('password')
    
    user = database.authenticate_user(identifier, password)
    if user:
        if user.get('role') == 'admin':
            email = user.get('email')
            # Generate OTP for Admin Second Factor
            otp = str(random.randint(100000, 999999))
            otp_storage[email] = {
                "code": otp,
                "expires": time.time() + 600, # 10 mins
                "user": user # Temporarily store user data to finalize login
            }
            
            # Send OTP email
            sent, msg = send_otp_email(email, otp)
            
            return jsonify({
                "status": "requires_otp", 
                "email": email, 
                "message": "Security verification required. " + msg
            })
        else:
            return jsonify({"status": "error", "message": "Access denied: Unauthorized role"}), 403
            
    return jsonify({"status": "error", "message": "Invalid credentials"}), 401

@app.route('/api/admin/verify_otp', methods=['POST'])
def verify_admin_otp():
    data = request.json
    email = data.get('email')
    otp = data.get('otp')
    
    if not email or not otp:
        return jsonify({"status": "error", "message": "Email and OTP are required"}), 400
        
    stored = otp_storage.get(email)
    if not stored or "user" not in stored:
        return jsonify({"status": "error", "message": "No login session found"}), 400
        
    if time.time() > stored['expires']:
        return jsonify({"status": "error", "message": "OTP expired. Please login again."}), 400
        
    if stored['code'] != otp:
        return jsonify({"status": "error", "message": "Invalid verification code"}), 400
        
    # Success: Finalize login
    user = stored['user']
    # Clear OTP after use
    del otp_storage[email]
    
    return jsonify({"status": "success", "user": user})

@app.route('/api/auth/verify_face', methods=['POST'])
def verify_face():
    data = request.json
    user_id = data.get('user_id')
    live_image = data.get('image')
    
    if not user_id or not live_image:
         return jsonify({"status": "error", "message": "Missing ID or Image"}), 400
         
    stored_photo = database.get_user_photo(user_id)
    if not stored_photo:
         return jsonify({"status": "error", "message": "No profile photo found. Account integrity check failed."}), 400
         
    # REAL COMPARISON LOGIC WOULD GO HERE using deepface/face_recognition
    # For this environment, we enforce that both images effectively exist.
    # We can add a simple string comparison if it's the SAME exact base64 (unlikely)
    # or just assume success if proctoring service validates the live frame has a face.
    
    import base64, numpy as np, cv2
    try:
        # Decode Live Image
        if "," in live_image: live_image = live_image.split(",")[1]
        img_bytes = base64.b64decode(live_image)
        nparr = np.frombuffer(img_bytes, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if frame is None:
            print("Error: verify_face: Failed to decode live image.")
            return jsonify({"status": "error", "message": "Failed to decode image from camera. Please try again."}), 400

        # Decode Profile Image
        if "," in stored_photo: p_data = stored_photo.split(",")[1]
        else: p_data = stored_photo
        p_bytes = base64.b64decode(p_data)
        p_nparr = np.frombuffer(p_bytes, np.uint8)
        p_frame = cv2.imdecode(p_nparr, cv2.IMREAD_COLOR)
        
        if p_frame is None:
             print("Error: verify_face: Failed to decode stored profile photo.")
             return jsonify({"status": "error", "message": "Corrupt profile photo. Please re-upload your photo in dashboard."}), 400

        # 1. Identity Match (Landmark Comparison + Face Rec)
        # Unpack verify status, distance, and detailed feedback
        matched, distance, feedback, is_low_light = proctor_service.compare_profiles(p_frame, frame)
        
        if matched:
             # Set the PROFILE PHOTO as the baseline for continuous verification
             # This ensures we always verify against the authenticated ground truth.
             proctor_service.set_reference_profile(p_frame)
             print(f"✅ Identity Baseline established (Ground Truth) for user {user_id}")
        else:
             print(f"Mismatch: Identity Mismatch for user {user_id}: distance={distance:.4f} Msg: {feedback}")
             return jsonify({
                 "status": "error", 
                 "message": f"{feedback}"
             }), 403

        print(f"Success: Identity Verified (Distance: {distance:.4f})")

        # 2. General Frame Processing (Check if face is actually there)
        result = proctor_service.process_frame(frame)
        
        # EYE VERIFICATION STEP
        eyes_verified, eye_msg = proctor_service.verify_eyes(frame)
        
        if not eyes_verified:
            # STRICT: No more permissive silhouette fallback for account authentication
            if result.get("low_light"):
                 print(f"🛑 Identity verification attempted in low light. Denied for security.")
                 return jsonify({
                    "status": "error", 
                    "message": "Poor Lighting: Face not clearly visible. Please move to a better lit area for identity verification.", 
                    "confidence": 0.0
                }), 400

            return jsonify({
                "status": "error", 
                "message": f"Biometric Validation Failed: {eye_msg}. Please look directly at the camera.",
                "confidence": 0.0
            }), 400
             
        # High confidence success if Face and Eyes found
        return jsonify({
            "status": "success", 
            "message": "Identity & Eye Contact Verified", 
            "confidence": 0.99,
            "should_terminate": proctor_service.should_terminate,
            "termination_reason": proctor_service.termination_reason
        })
        
    except Exception as e:
        import traceback
        traceback_str = traceback.format_exc()
        print(f"Face Verify Error: {e}")
        print(traceback_str)
        
        # Log to file
        with open("debug_error.log", "a") as f:
            f.write(f"\n[{datetime.now()}] Verify Face Error: {e}\n{traceback_str}\n")
            
        return jsonify({"status": "error", "message": f"Image processing failed: {str(e)}", "should_terminate": proctor_service.should_terminate}), 500



@app.route('/api/auth/forgot-password', methods=['POST'])
def forgot_password():
    # CORS is handled globally
    
    print(f"\n🔍 [FORGOT PASSWORD] Route HIT! Request: {request.json}")
    data = request.json
    email = data.get('email')
    
    if not email:
        return jsonify({"status": "error", "message": "Email required"}), 400
        
    user = database.get_user_by_email(email)
    if not user:
         return jsonify({"status": "error", "message": "Email not found"}), 404
         
    # Generate OTP
    otp = str(random.randint(100000, 999999))
    otp_storage[email] = {
        "code": otp,
        "expires": time.time() + 600 # 10 mins
    }
    
    # Attempt to send real email
    sent_successfully, msg = send_otp_email(email, otp)
    
    if sent_successfully:
        return jsonify({"status": "success", "message": "OTP sent to your email address."})
    else:
        # If it failed due to missing config, we still 'succeed' in the demo but warn in console
        return jsonify({
            "status": "success", 
            "message": "OTP generated. (Internal: Real mail requires SMTP setup, check console for code)",
            "warning": msg
        })


@app.route('/api/auth/verify-otp', methods=['POST'])
def verify_otp():
    data = request.json
    email = data.get('email')
    otp = data.get('otp')
    
    if not email or not otp:
         return jsonify({"status": "error", "message": "Missing fields"}), 400
         
    stored = otp_storage.get(email)
    if not stored:
         return jsonify({"status": "error", "message": "No OTP request found"}), 400
         
    if time.time() > stored['expires']:
         return jsonify({"status": "error", "message": "OTP expired"}), 400
         
    if stored['code'] != otp:
         return jsonify({"status": "error", "message": "Invalid OTP"}), 400
         
    return jsonify({"status": "success", "message": "OTP verified"})

@app.route('/api/auth/reset-password', methods=['POST'])
def reset_password():
    data = request.json
    email = data.get('email')
    new_password = data.get('new_password')
    
    if not email or not new_password:
        return jsonify({"status": "error", "message": "Missing fields"}), 400
        
    success = database.update_password(email, new_password)
    if success:
         return jsonify({"status": "success", "message": "Password updated successfully"})
    else:
         return jsonify({"status": "error", "message": "Email not found"}), 404

@app.route('/api/user/profile/update', methods=['POST'])
def update_profile():
    try:
        data = request.json
        user_id = data.get('id')
        name = data.get('name')
        email = data.get('email')
        phone = data.get('phone')
        college_name = data.get('college_name')
        photo = data.get('photo') # Base64
        resume_base64 = data.get('resume') # Base64 PDF
        
        year = data.get('year')
        
        if not all([user_id, name, email, phone]):
            return jsonify({"status": "error", "message": "Required fields: name, email, phone"}), 400
            
        resume_path = None
        if resume_base64:
            try:
                import base64
                if "," in resume_base64:
                    resume_base64 = resume_base64.split(",")[1]
                resume_bytes = base64.b64decode(resume_base64)
                
                filename = secure_filename(f"resume_{user_id}_{int(time.time())}.pdf")
                resume_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                
                with open(resume_path, "wb") as f:
                    f.write(resume_bytes)
            except Exception as e:
                print(f"Resume Save Error: {e}")
                return jsonify({"status": "error", "message": f"Failed to save resume: {e}"}), 500

        register_no = data.get('register_no')
        branch = data.get('branch')

        success, error = database.update_user_profile(user_id, name, email, phone, college_name, year, photo, resume_path, register_no, branch)
        if success:
            updated_user = database.get_user_by_id(user_id)
            if not updated_user:
                 return jsonify({"status": "error", "message": "User not found after update"}), 404
            return jsonify({"status": "success", "user": updated_user})
        else:
            return jsonify({"status": "error", "message": error}), 400
    except Exception as e:
        print(f"Profile Update Critical Error: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/user/delete', methods=['POST'])
def delete_own_account():
    try:
        data = request.json
        user_id = data.get('id')
        if not user_id:
            return jsonify({"status": "error", "message": "User ID required"}), 400
        
        success = database.delete_user(user_id)
        if success:
            return jsonify({"status": "success", "message": "Account deleted"})
        else:
            return jsonify({"status": "error", "message": "Failed to delete account"}), 500
    except Exception as e:
        print(f"Self-delete Error: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/user/dashboard/<int:user_id>', methods=['GET'])
def get_dashboard(user_id):
    print(f"📊 Dashboard Request for User ID: {user_id}")
    interviews = database.get_user_interviews(user_id)
    return jsonify({"status": "success", "interviews": interviews})

@app.route('/api/interview/save', methods=['POST'])
def save_interview_result():
    data = request.json
    user_id = data.get('user_id')
    score = data.get('score')
    details = data.get('details')
    
    if user_id:
        database.save_interview(user_id, score, details)
        return jsonify({"status": "success"})
    return jsonify({"status": "ignored", "message": "No user logged in"})


def check_admin():
    admin_id = request.headers.get('Admin-ID')
    if not admin_id:
        return jsonify({"status": "error", "message": "Unauthorized: Admin-ID header missing"}), 401
    try:
        user = database.get_user_by_id(int(admin_id))
        if not user or user.get('role') != 'admin':
            return jsonify({"status": "error", "message": "Forbidden: Non-admin access"}), 403
    except Exception:
        return jsonify({"status": "error", "message": "Unauthorized: Invalid Admin-ID"}), 401
    return None

@app.route('/api/admin/candidates', methods=['GET'])
def get_admin_candidates():
    auth_error = check_admin()
    if auth_error: return auth_error
    candidates = database.get_all_candidates_summary()
    return jsonify({
        "status": "success",
        "candidates": candidates
    })

@app.route('/api/admin/interviews', methods=['GET'])
def get_admin_interviews():
    auth_error = check_admin()
    if auth_error: return auth_error
    interviews = database.get_all_interviews_admin()
    return jsonify({
        "status": "success",
        "interviews": interviews
    })

@app.route('/api/admin/stats', methods=['GET'])
def get_admin_stats():
    auth_error = check_admin()
    if auth_error: return auth_error
    stats = database.get_admin_stats()
    return jsonify({
        "status": "success",
        "stats": stats
    })

@app.route('/api/admin/candidate/<int:user_id>', methods=['DELETE'])
def delete_candidate(user_id):
    auth_error = check_admin()
    if auth_error: return auth_error
    success = database.delete_user(user_id)
    if success:
        return jsonify({"status": "success"})
    else:
        return jsonify({"status": "error", "message": "Failed to delete"}), 500

@app.route('/api/admin/download-resume/<int:user_id>', methods=['GET'])
@app.route('/api/admin/resume/<int:user_id>', methods=['GET'])
def download_candidate_resume(user_id):
    auth_error = check_admin()
    if auth_error: return auth_error
    print(f"📥 Downloading resume for user {user_id}")
    user = database.get_user_by_id(user_id)
    if not user or not user.get('resume_path'):
        return jsonify({"message": "Resume not found"}), 404
    
    path = user['resume_path']
    if os.path.exists(path):
        return send_file(path, as_attachment=True)
    else:
        return jsonify({"message": "Resume file missing on server"}), 404

@app.route('/api/admin/candidate/<int:user_id>/best_report', methods=['GET'])
def download_best_report(user_id):
    auth_error = check_admin()
    if auth_error: return auth_error
    interview_id = database.get_best_interview_id(user_id)
    if not interview_id:
        return jsonify({"message": "No interviews found for this candidate"}), 404
    
    # Delegate to the existing report generation route handler
    return download_past_report(interview_id)

# --- EXISTING ENDPOINTS ---

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/api/upload_resume', methods=['POST'])
def upload_resume():
    global resume_uploaded, current_candidate_info
    
    if 'resume' not in request.files:
        return jsonify({"status": "error", "message": "No resume file provided"}), 400
    
    file = request.files['resume']
    candidate_name = request.form.get('name', 'Unknown').strip()
    candidate_email = request.form.get('email', 'Unknown').strip()
    user_id = request.form.get('user_id') # Optional from dashboard
    
    if file.filename == '':
        return jsonify({"status": "error", "message": "No file selected"}), 400
    
    if not allowed_file(file.filename):
        return jsonify({"status": "error", "message": "Only PDF files are allowed"}), 400
    
    filename = secure_filename(file.filename)
    timestamp = time.strftime("%Y%m%d_%H%M%S")
    saved_filename = f"{timestamp}_{candidate_name.replace(' ', '_')}_{filename}"
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], saved_filename)
    
    file.save(filepath)
    
    if user_id and user_id != 'undefined':
        database.update_resume_path(int(user_id), filepath)
    
    # Process with Manager
    success, msg = manager.load_resume(filepath)
    # Reset proctoring and session state for fresh interview
    proctor_service.should_terminate = False
    proctor_service.termination_reason = None
    proctor_service.violations = []
    # ✅ Clear previous interview history so warmup & question logic starts fresh
    manager.history = []
    manager.evaluations = []
    manager.asked_topics = []
    manager.warmup_count = 0
    manager.submitted_solutions = []
    manager.violations = []
    manager.isTerminatingRef = False
    manager.start_time = datetime.now()
    
    if not success:
         return jsonify({"status": "error", "message": "resume not matched please upload correct resume"}), 400

    match, detected_name = manager.verify_candidate_match(candidate_name, manager.resume_text)
    if not match:
         resume_uploaded = False
         return jsonify({
             "status": "error", 
             "message": "resume not matched please upload correct resume"
         }), 400

    manager.candidate_name = candidate_name
    manager.analyze_resume()

    resume_uploaded = True
    current_candidate_info = {
        'name': candidate_name,
        'email': candidate_email,
        'resume_path': filepath,
        'upload_time': timestamp,
        'uploaded_at': datetime.now().isoformat()
    }
    
    print(f"\n{'='*60}")
    print(f"Resume uploaded & Verified: {candidate_name}")
    print(f"{'='*60}\n")
    
    return jsonify({
        "status": "success",
        "message": "resume verified successfully lets move to the next processs",
        "candidate": current_candidate_info
    })

@app.route('/api/check_resume', methods=['GET'])
def check_resume():
    return jsonify({
        "uploaded": resume_uploaded,
        "candidate": current_candidate_info if resume_uploaded else None
    })

@app.route('/api/interview/question', methods=['GET'])
def get_interview_question():
    # Use strict flow to get first category
    category = manager.get_next_category()
    question = manager.generate_question(category)
    return jsonify({"question": question, "category": category})

@app.route('/api/interview/answer', methods=['POST'])
def submit_answer():
    data = request.json
    question = data.get('question')
    answer = data.get('answer')
    
    # 1. Run evaluation in background to remove delay
    import threading
    threading.Thread(target=manager.evaluate_answer, args=(question, answer)).start()
    
    # 2. STRICT FLOW CONTROL: Automatically get next category
    next_cat = manager.get_next_category()
    
    # 3. Generate the next question immediately
    next_q = manager.generate_question(next_cat, previous_answer=answer)
    
    return jsonify({
        "status": "success", 
        "message": "Answer submitted",
        "next_category": next_cat,
        "next_question": next_q
    })

@app.route('/api/generate_video', methods=['POST'])
def generate_video():
    """Endpoint for generating synchronized audio from text (Video LipSync Disabled)."""
    data = request.json
    if not data or 'text' not in data:
        return jsonify({"status": "error", "message": "Text is required"}), 400
        
    text = data.get('text')
    
    try:
        from interview_video_pipeline import generate_synced_video
        # pipeline now only returns audio_url since lipsync is deleted
        _, output_audio_path = generate_synced_video(text)
        
        if output_audio_path:
             filename = os.path.basename(output_audio_path)
             base_url = request.host_url.rstrip('/')
             return jsonify({
                 "status": "success", 
                 "audio_url": f"{base_url}/static/audio/{filename}"
             })
        else:
             return jsonify({"status": "error", "message": "Failed to generate audio."}), 500
    except Exception as e:
        print(f"Audio Generation Error: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

from flask import send_from_directory
@app.route('/static/<path:filename>')
def serve_static(filename):
    static_dir = os.path.abspath(os.path.join(current_dir, '..', 'static'))
    return send_from_directory(static_dir, filename)


@app.route('/api/interview/finish', methods=['POST'])
def finish_interview():
    """Called when the user clicks End Interview / Generate Report."""
    try:
        data = request.json or {}
        user_id = data.get('user_id')

        # 1. Stop proctoring and sync violations
        try:
            events = proctor_service.stop()
            if events:
                for ev in events:
                    if ev not in manager.violations:
                        manager.violations.append(ev)
        except Exception:
            pass

        manager.evidence_path = getattr(proctor_service, 'evidence_path', None)
        proctor_score = proctor_service.get_score() if hasattr(proctor_service, 'get_score') else 100
        manager.proctor_score = proctor_score

        # 2. Calculate final score
        score = manager.calculate_score()

        # 3. Save interview record to database
        interview_id = None
        if user_id:
            details = {
                'candidate_name': manager.candidate_name,
                'evaluations': manager.evaluations,
                'violations': manager.violations,
                'submitted_solutions': manager.submitted_solutions,
                'proctor_score': proctor_score,
                'evidence_path': manager.evidence_path
            }
            interview_id = database.save_interview(user_id, score, details)

        print(f"\n{'='*60}")
        print(f"Success: Interview Finished: {manager.candidate_name} | Score: {score}% | ID: {interview_id}")
        print(f"{'='*60}\n")

        return jsonify({
            "status": "success",
            "interview_id": interview_id,
            "score": score,
            "proctor_score": proctor_score,
            "evaluations": manager.evaluations,
            "violations": manager.violations,
            "total_questions": len(manager.evaluations),
            "message": "Interview session concluded successfully."
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/proctor/start', methods=['POST'])
@app.route('/api/start_monitoring', methods=['POST'])
def start_proctoring():
    try:
        # Sync session ID from manager for evidence isolation
        proctor_service.session_id = manager.session_id
        proctor_service.start()
        return jsonify({"status": "success", "message": f"Proctoring service started for session {manager.session_id}"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/proctor/identity', methods=['POST'])
def proctor_identity():
    data = request.json
    user_id = data.get('user_id')
    image_data = data.get('image') # Optional if user_id is provided
    
    import base64
    import numpy as np
    import cv2
    
    try:
        frame = None
        # Priority 1: Load from Database (Strict Verification)
        if user_id:
            print(f"🔍 System: Fetching profile photo for user {user_id}...")
            profile_b64 = database.get_user_photo(int(user_id))
            if profile_b64:
                if "," in profile_b64: profile_b64 = profile_b64.split(",")[1]
                img_bytes = base64.b64decode(profile_b64)
                nparr = np.frombuffer(img_bytes, np.uint8)
                frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                print(f"✅ Loaded profile photo for {user_id}")
            else:
                print(f"⚠️ No profile photo found for {user_id} in DB.")

        # Priority 2: Use provided image (Baseline fallback)
        if frame is None and image_data:
            if "," in image_data: image_data = image_data.split(",")[1]
            img_bytes = base64.b64decode(image_data)
            nparr = np.frombuffer(img_bytes, np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            print("✅ Using provided camera frame as identity baseline.")

        if frame is not None:
            proctor_service.set_reference_profile(frame)
            msg = "Identity verification baseline established against " + ("profile photo" if user_id else "current frame")
            proctor_service.record_event("identity_baseline", msg, "LOW")
            return jsonify({"status": "success", "message": msg})
            
    except Exception as e:
        print(f"Error setting identity baseline: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500
        
    return jsonify({"status": "error", "message": "Failed to set identity baseline. No valid image source found."}), 400


@app.route('/proctor/status', methods=['GET'])
def proctor_status():
    return jsonify({
        "status": "active" if proctor_service.running else "stopped",
        "should_terminate": proctor_service.should_terminate,
        "termination_reason": getattr(proctor_service, 'termination_reason', None),
        "violation_count": len(proctor_service.violations)
    })

@app.route('/proctor/reset', methods=['POST'])
def proctor_reset():
    proctor_service.initial_nose = None
    proctor_service.prev_gray = None
    proctor_service.consecutive_no_face = 0
    proctor_service.consecutive_phone = 0
    proctor_service.should_terminate = False
    proctor_service.termination_reason = None
    proctor_service.violations = []
    # Fully reset manager as well (generates new session_id)
    manager.reset()
    # Sync new session_id to proctor_service
    proctor_service.session_id = manager.session_id
    if hasattr(proctor_service, 'consecutive_yolo_people'): proctor_service.consecutive_yolo_people = 0
    if hasattr(proctor_service, 'consecutive_multi_face'): proctor_service.consecutive_multi_face = 0
    if hasattr(proctor_service, 'consecutive_looking_away'): proctor_service.consecutive_looking_away = 0
    if hasattr(proctor_service, 'consecutive_identity_mismatch'): proctor_service.consecutive_identity_mismatch = 0
    return jsonify({"status": "success", "message": "Proctoring and Interview state reset/re-calibrated"})

@app.route('/api/interview/reset', methods=['POST'])
def interview_reset_api():
    manager.reset()
    return jsonify({"status": "success", "message": "Interview state reset"})

@app.route('/proctor/stage', methods=['POST'])
def proctor_stage():
    data = request.json
    proctor_service.current_stage = data.get('stage', 'interview')
    return jsonify({"status": "success"})

@app.route('/proctor/event', methods=['POST'])
def proctor_event():
    data = request.json
    event_type = data.get('type', 'general')
    message = data.get('message', 'UI Event detected')
    severity = data.get('severity', 'MEDIUM')
    
    proctor_service.record_event(event_type, message, severity)
    return jsonify({"status": "success"})

@app.route('/proctor/stop', methods=['POST'])
@app.route('/api/stop_monitoring', methods=['POST'])
def stop_proctoring():
    try:
        events = proctor_service.stop()
        manager.violations.extend(events)
        manager.evidence_path = proctor_service.evidence_path # SYNC EVIDENCE
        return jsonify({
            "status": "success", 
            "events": events,
            "score": proctor_service.get_score()
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/proctor/process_frame', methods=['POST'])
def process_frame():
    try:
        data = request.json
        image_data = data.get('image') # Base64 string
        
        if not image_data:
            return jsonify({"status": "error", "message": "No image data"}), 400

        # Decode Base64 -> Image
        import base64
        import numpy as np
        import cv2

        # Remove header like "data:image/jpeg;base64," if present
        if "," in image_data:
            image_data = image_data.split(",")[1]
            
        img_bytes = base64.b64decode(image_data)
        nparr = np.frombuffer(img_bytes, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if frame is None:
             return jsonify({"status": "error", "message": "Failed to decode image"}), 400
             
        # Process in Proctor Service
        result = proctor_service.process_frame(frame)
        
        # Debug logging for real-time verification
        if result:
            print(f"[{datetime.now().strftime('%H:%M:%S')}] Proctor: FaceDetected={result.get('face_detected')} | Warning={result.get('current_warning')} | Terminate={proctor_service.should_terminate}")

        return jsonify({
            "status": "success",
            "face_detected": result.get("face_detected", False) if result else False,
            "warning": result.get("current_warning", None) if result else None,
            "should_terminate": proctor_service.should_terminate,
            "termination_reason": proctor_service.termination_reason
        })
    except Exception as e:
        print(f"Frame Process Error: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/report', methods=['GET'])
def get_report():
    # Sync final events
    events = proctor_service.stop()
    if events:
        for ev in events:
            if ev not in manager.violations:
                manager.violations.append(ev)
    
    manager.evidence_path = proctor_service.evidence_path # SYNC EVIDENCE
    proctor_score = proctor_service.get_score()
    manager.proctor_score = proctor_score # Store in manager for PDF
    
    score = 0
    if manager.evaluations:
        total_eval_points = sum(manager.sf(e.get('score', 0)) for e in manager.evaluations)
        score = total_eval_points / len(manager.evaluations)
    
    return jsonify({
        "candidate": manager.candidate_name,
        "evaluations": manager.evaluations,
        "violations": manager.violations, 
        "proctor_score": proctor_score,
        "overall_score": round(score, 1),
        "total_questions": len(manager.evaluations)
    })

@app.route('/api/download_report', methods=['GET'])
def download_report():
    interview_id = request.args.get('id')
    
    # If ID is provided, use the past report logic
    if interview_id:
        try:
            return download_past_report(int(interview_id))
        except:
            pass

    # Fallback to current manager as before
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    # Prepare filename - strict sanitization
    safe_name = re.sub(r'[^a-zA-Z0-9_]', '', manager.candidate_name or 'Candidate').strip()
    if not safe_name: safe_name = "Candidate"
    filename = f"Report_{safe_name}_{timestamp}.pdf"
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    
    try:
        success = manager.generate_pdf_report(filepath)
    except Exception as e:
        print(f"❌ PDF Generation Error: {e}")
        import traceback
        traceback.print_exc()
        success = False
    
    if success and os.path.exists(filepath):
        print(f"✅ Real-time PDF generated successfully: {filepath}")
        return send_file(
            os.path.abspath(filepath), 
            as_attachment=True, 
            download_name=filename,
            mimetype='application/pdf',
            max_age=0
        )
    else:
        print(f"❌ Real-time PDF generation failed.")
        return jsonify({
            "status": "error",
            "message": "Failed to generate PDF. Check if you have completed the interview.",
            "details": "This can happen if the interview was not properly finished or if there were internal generation errors (e.g., division by zero)."
        }), 500

@app.route('/api/download_report/<int:interview_id>', methods=['GET'])
def download_past_report(interview_id):
    # Fetch interview data
    data = database.get_interview_by_id(interview_id)
    if not data:
        return jsonify({"message": "Interview not found"}), 404
        
    # Reconstruct Manager state
    temp_manager = InterviewManager()
    temp_manager.candidate_name = data['candidate_name']
    
    details = data.get('details')
    if not isinstance(details, dict):
        details = {}
        
    temp_manager.evaluations = details.get('evaluations', [])
    temp_manager.violations = details.get('violations', [])
    temp_manager.submitted_solutions = details.get('submitted_solutions', [])
    temp_manager.proctor_score = details.get('proctor_score', 100)
    temp_manager.evidence_path = details.get('evidence_path', None)
    
    # Try to parse date for start_time (to find evidence)
    try:
        from dateutil import parser as date_parser
        temp_manager.start_time = date_parser.parse(data['date'])
    except Exception as e:
        print(f"⚠️ Date parsing info: {e}. Trying manual fallbacks...")
        try:
            # Try ISO format (new format: YYYY-MM-DDTHH:MM:SS.ffffff)
            temp_manager.start_time = datetime.fromisoformat(data['date'])
        except:
            try:
                # Fallback to legacy format: YYYY-MM-DD HH:MM:SS
                temp_manager.start_time = datetime.strptime(data['date'], "%Y-%m-%d %H:%M:%S")
            except:
                print(f"⚠️ Could not parse date '{data['date']}', using current time as baseline.")
                pass
        
    # Generate
    # Prepare filename
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_name = re.sub(r'[^a-zA-Z0-9_]', '', temp_manager.candidate_name or 'Candidate').strip()
    if not safe_name: safe_name = "Candidate"
    
    filename = f"Report_{safe_name}_{timestamp}.pdf"
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    
    try:
        print(f"📄 Generating PDF for {temp_manager.candidate_name} (ID: {interview_id})...")
        success = temp_manager.generate_pdf_report(filepath)
    except Exception as e:
        print(f"❌ Critical PDF Generation Exception: {e}")
        import traceback
        traceback.print_exc()
        success = False
    
    if success and os.path.exists(filepath):
        print(f"✅ PDF generated successfully: {filepath}")
        return send_file(
            os.path.abspath(filepath), 
            as_attachment=True, 
            download_name=filename,
            mimetype='application/pdf'
        )
    else:
        print(f"❌ Failed to serve PDF: success={success}, exists={os.path.exists(filepath)}")
        return jsonify({"message": "Failed to generate PDF. Data might be corrupted or missing."}), 500


@app.route('/api/tts', methods=['GET'])
def text_to_speech():
    """TTS endpoint — generates audio.
    If lip_sync=true is passed, it uses Wav2Lip to generate a video and returns its URL."""
    try:
        text = request.args.get('text')
        if not text:
            return jsonify({"error": "No text provided"}), 400

        lip_sync = request.args.get('lip_sync', 'false').lower() == 'true'

        timestamp = int(time.time())
        filename_wav = f"tts_{timestamp}.wav"
        filename_mp3 = f"tts_{timestamp}.mp3"

        # Clean old TTS files
        for f in os.listdir('.'):
            if f.startswith('tts_') and (f.endswith('.mp3') or f.endswith('.wav')):
                try:
                    os.remove(f)
                except:
                    pass

        # --- PRIMARY: pyttsx3 with Windows SAPI (male voice: David) ---
        try:
            import subprocess
            py_code = """import sys, pyttsx3
text = sys.argv[1]
filename = sys.argv[2]
try:
    engine = pyttsx3.init()
    engine.setProperty('rate', 160)
    for v in engine.getProperty('voices'):
        if 'david' in v.name.lower() or 'male' in v.name.lower():
            engine.setProperty('voice', v.id)
            break
    engine.save_to_file(text, filename)
    engine.runAndWait()
except Exception as e:
    sys.exit(1)
"""
            # Run in isolated process to avoid Flask COM/threading crashes
            proc = subprocess.run(
                [sys.executable, "-c", py_code, text, filename_wav],
                capture_output=True, text=True, timeout=15
            )
            if proc.returncode != 0 or not os.path.exists(filename_wav) or os.path.getsize(filename_wav) == 0:
                raise Exception(f"pyttsx3 subprocess failed: {proc.stderr}")

        except Exception as pyttsx_err:
            print(f"⚠️ pyttsx3 failed: {pyttsx_err}. Falling back to gTTS...")
            from gtts import gTTS
            tts = gTTS(text=text, lang='en')
            tts.save(filename_mp3)

        audio_file = filename_wav if os.path.exists(filename_wav) else filename_mp3



        # Return audio fallback
        if os.path.exists(filename_wav) and os.path.getsize(filename_wav) > 0:
            return send_file(filename_wav, mimetype="audio/wav", as_attachment=False)
        return send_file(filename_mp3, mimetype="audio/mpeg", as_attachment=False)

    except Exception as e:
        print(f"TTS Error: {e}")
        return jsonify({"error": str(e)}), 500



@app.route('/api/video/<path:filename>')
def serve_video(filename):
    # Serve from frontend/public (sibling to backend)
    project_root = os.path.dirname(current_dir)
    video_path = os.path.join(project_root, "frontend", "public", filename)
    if os.path.exists(video_path):
        return send_file(video_path, mimetype="video/mp4")
    return jsonify({"error": "Video not found"}), 404


@app.route('/api/audio/<path:filename>')
def serve_audio(filename):
    if os.path.exists(filename):
        return send_file(filename, mimetype="audio/wav")
    return jsonify({"error": "Audio not found"}), 404

@app.route('/api/get_problems', methods=['GET'])
def get_problems():
    # If using local python script to set problems, use those. 
    # Otherwise default problems so the frontend doesn't break
    problems_to_return = current_problems if current_problems else DEFAULT_PROBLEMS
    
    # Take 2 random problems for the interview
    if len(problems_to_return) > 5:
        problems_to_return = random.sample(problems_to_return, 2)

    return jsonify({
        "status": "success",
        "problems": problems_to_return,
        "interview_mode": True,
        "candidate": current_candidate_info
    })

@app.route('/api/submit_code', methods=['POST'])
def submit_code():
    if not resume_uploaded:
        return jsonify({"status": "error", "message": "Resume required"}), 403
    
    data = request.json
    data['candidate'] = current_candidate_info
    data['submitted_at'] = datetime.now().isoformat()
    # Use manager's list
    manager.submitted_solutions.append(data)
    
    print(f"✅ Solution received: {data.get('title')}")
    
    return jsonify({"status": "success", "message": "Code submitted successfully"})

@app.route('/api/report_violation', methods=['POST'])
def report_violation():
    data = request.json
    data['candidate'] = current_candidate_info
    data['timestamp'] = datetime.now().isoformat()
    violations.append(data)
    # Also track in manager for PDF reporting
    violation_event = {
        "type": data.get('type', 'Unknown Violation'),
        "message": data.get('message', 'User Action Violation'),
        "severity": data.get('severity', 'MEDIUM'),
        "timestamp": datetime.now().isoformat()
    }
    
    if hasattr(manager, 'violations'):
        manager.violations.append(violation_event)
    else:
        manager.violations = [violation_event]
        
    return jsonify({"status": "received"})

@app.route('/', methods=['GET'])
@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({"status": "ok", "message": "AI Interviewer API is running"})

def start_flask_server(problems=None):
    global current_problems, interview_active
    if problems:
        current_problems = problems
    interview_active = True
    print("\n🚀 Flask Server Running on http://0.0.0.0:5000")
    app.run(host='0.0.0.0', port=5000, debug=False, use_reloader=False, threaded=True)

@app.route('/api/health')
def api_health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}, 200

if __name__ == '__main__':
    start_flask_server()


