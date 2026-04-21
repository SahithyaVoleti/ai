from flask import Flask, jsonify, request, send_file
import requests
from dotenv import load_dotenv
load_dotenv() # Load variables from .env file
from flask_cors import CORS
import threading
import webbrowser
import time
import os
import json
import sys
import razorpay
import hmac
import hashlib

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
import resume_analyzer
from pdfminer.high_level import extract_text

# ReportLab Imports for Resume Builder
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, ListFlowable, ListItem
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from io import BytesIO

app = Flask(__name__)

# AI Interviewer Backend
print("\n[INIT] AI INTERVIEWER BACKEND INITIALIZED\n")

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
MAX_CONTENT_LENGTH = 500 * 1024 * 1024  # 500MB
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
    Sends a real email using Brevo API using .env credentials.
    Always saves locally for dev/debug. Returns (success, message).
    """
    api_key = os.environ.get("BREVO_API_KEY")
    sender_email = os.environ.get("BREVO_SENDER_EMAIL")
    app_name = os.environ.get("BREVO_APP_NAME", "AI Interviewer")

    # ALWAYS write OTP to local file for development/debugging
    otp_file = "latest_otp.txt"
    try:
        with open(otp_file, "w") as f:
            f.write(f"OTP: {otp}\nTo: {to_email}\nTime: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"[OTP] Saved OTP to {otp_file}: {otp}")
    except Exception as e:
        print(f"[OTP] Failed to save OTP locally: {e}")

    if not api_key or "your_real_api_key" in api_key:
        print(f"\n[INFO] EMAIL NOT SENT: BREVO_API_KEY not configured in .env")
        print(f"[OTP] Current OTP: {otp} (Saved to {otp_file})\n")
        return True, f"Code generated. Check {otp_file} for code."

    # Send real email via Brevo
    print(f"\n[EMAIL] Attempting to send OTP via Brevo to: {to_email}")
    import requests as _req
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
                    <p style="color: #666; font-size: 16px;">Your verification code is:</p>
                    <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #4f46e5; margin: 20px 0;">
                        {otp}
                    </div>
                    <p style="color: #999; font-size: 12px;">This code expires in 10 minutes.</p>
                </div>
                <hr style="border: 0; border-top: 1px solid #eee;">
                <div style="text-align: center; padding-top: 10px;">
                    <p style="color: #aaa; font-size: 10px;">If you didn't request this, please ignore this email.</p>
                    <p style="color: #aaa; font-size: 10px;">&copy; 2026 {app_name} Team</p>
                </div>
            </div>
        """
    }
    try:
        response = _req.post(url, json=payload, headers=headers, timeout=10)
        if response.status_code in [200, 201, 202]:
            print(f"[EMAIL] OTP sent successfully to {to_email}")
            return True, "Code sent to your email."
        else:
            print(f"[EMAIL] Brevo API Error ({response.status_code}): {response.text}")
            return False, "Email delivery failed. Check server console."
    except Exception as e:
        print(f"[EMAIL] Connection Error: {e}")
        return False, "Could not connect to email service."


def send_subscription_email(to_email, user_name, plan_name, credits):
    """
    Sends a subscription confirmation email using Brevo API.
    """
    api_key = os.environ.get("BREVO_API_KEY")
    sender_email = os.environ.get("BREVO_SENDER_EMAIL")
    app_name = os.environ.get("BREVO_APP_NAME", "AI Interviewer")

    if not api_key or "your_real_api_key" in api_key:
        print(f"\n[INFO] SUBSCRIPTION EMAIL NOT SENT: BREVO_API_KEY not configured.")
        return False, "API key missing"

    print(f"\n[EMAIL] Sending subscription confirmation to: {to_email}")
    import requests as _req
    url = "https://api.brevo.com/v3/smtp/email"
    headers = {
        "accept": "application/json",
        "content-type": "application/json",
        "api-key": api_key
    }
    payload = {
        "sender": {"name": app_name, "email": sender_email},
        "to": [{"email": to_email}],
        "subject": f"Welcome to the {plan_name} Plan!",
        "htmlContent": f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
                    <h1 style="color: white; margin: 0;">Subscription Confirmed</h1>
                </div>
                <div style="padding: 20px; text-align: center;">
                    <h2 style="color: #333;">Welcome aboard, {user_name}!</h2>
                    <p style="color: #666; font-size: 16px;">You are now on the <strong>{plan_name}</strong> plan.</p>
                    <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; font-size: 24px; font-weight: bold; color: #4f46e5; margin: 20px 0;">
                        {credits} Interview Credit(s) Added
                    </div>
                    <p style="color: #666; font-size: 16px;">Log in to start your interview.</p>
                </div>
            </div>
        """
    }
    try:
        response = _req.post(url, json=payload, headers=headers)
        if response.status_code in [200, 201, 202]:
            return True, "Email sent successfully"
        else:
            return False, response.text
    except Exception as e:
        return False, str(e)




# --- AUTH ENDPOINTS ---

@app.route('/api/auth/signup', methods=['POST'])
def signup():
    data = request.json
    name = data.get('name')
    email = data.get('email')
    phone = data.get('phone')
    password = data.get('password')
    year = data.get('year')
    branch = data.get('branch')
    domain = data.get('domain')
    college_name = data.get('college_name') # New field
    photo = data.get('photo') # Live captured image
    
    # STRICT: Check for Photo presence
    if not all([name, email, phone, password, photo]):
        return jsonify({"status": "error", "message": "All fields including live photo are mandatory."}), 400
        
    user_id, error = database.create_user(name, email, phone, password, photo, year=year, college_name=college_name, branch=branch, domain=domain)
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
    
    print(f"🔑 [LOGIN ATTEMPT] Identifier: {identifier}")
    
    user = database.authenticate_user(identifier, password)
    if user:
        print(f"✅ [LOGIN SUCCESS] User: {user['email']}")
        return jsonify({"status": "success", "user": user})
    
    print(f"❌ [LOGIN FAILED] Invalid credentials for: {identifier}")
    return jsonify({"status": "error", "message": "Invalid credentials"}), 401

# RAZORPAY CONFIG
RAZORPAY_KEY_ID = os.environ.get("RAZORPAY_KEY_ID", "rzp_test_your_real_key_here")
RAZORPAY_KEY_SECRET = os.environ.get("RAZORPAY_KEY_SECRET", "your_real_secret_here")
rzp_client = None
if RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET:
    try:
        rzp_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
    except:
        print("Warning: Razorpay Client Init Failed.")

@app.route('/api/payment/create-order', methods=['POST'])
def create_payment_order():
    """Generates a Razorpay Order ID for a specified plan."""
    data = request.json
    user_id = data.get('user_id')
    plan_name = data.get('plan_name')
    amount = float(data.get('amount', 0))

    # 1. Simulator Mode Detect (If keys are placeholders or testing mode enabled)
    is_test_mode = (
        "YOUR_RAZORPAY" in RAZORPAY_KEY_ID or 
        "your_real_key_here" in RAZORPAY_KEY_ID or 
        os.environ.get("PAYMENT_TEST_MODE", "true").lower() == "true" or 
        not rzp_client
    )
    
    if is_test_mode:
        print(f"🛠️ [PAYMENT SIMULATOR] Creating mock order for {plan_name} (₹{amount})")
        return jsonify({
            "status": "success",
            "simulated": True,
            "order_id": f"simulated_order_{int(time.time())}",
            "amount": int(amount * 100),
            "key_id": "rzp_test_simulated_key"
        })

    if not rzp_client:
        return jsonify({"status": "error", "message": "Razorpay not configured on server."}), 503
    user_id = data.get('user_id')
    plan_name = data.get('plan_name')
    amount = float(data.get('amount', 0))

    if not user_id or amount <= 0:
        return jsonify({"status": "error", "message": "Invalid request parameters."}), 400

    try:
        # Amount must be in paise (₹1 = 100 paise)
        order_data = {
            "amount": int(amount * 100),
            "currency": "INR",
            "receipt": f"receipt_user_{user_id}_{int(time.time())}",
            "payment_capture": 1
        }
        order = rzp_client.order.create(data=order_data)
        
        # Log to DB
        database.create_order_log(user_id, order['id'], amount, plan_id=data.get('plan_id'))
        
        return jsonify({
            "status": "success",
            "order_id": order['id'],
            "amount": order['amount'],
            "key_id": RAZORPAY_KEY_ID
        })
    except Exception as e:
        print(f"Razorpay Order Error: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/payment/verify', methods=['POST'])
def verify_payment():
    """Verifies Razorpay signature and updates user credits."""
    data = request.json
    order_id = data.get('razorpay_order_id')
    
    # 1. Handle Simulated Verification
    if (order_id and order_id.startswith('simulated_')) or data.get('razorpay_payment_id') in ['pay_simulated_success', 'pay_manual_bypass']:
        user_id = data.get('user_id')
        plan_id = data.get('plan_id')
        
        # Determine credits based on plan_id
        # Standardized to 1 credit per subscription as requested
        credits_to_add = 1
        
        # Update User in DB
        database.finalize_order(user_id, order_id or "sim_order", "sim_pay", credits_to_add, plan_id, payment_mode='Simulator')
        updated_user = database.get_user_by_id(int(user_id))
        
        # Send subscription confirmation email
        plan_names = {"1": "Starter", "2": "ATS Pro", "3": "Proctor Elite", "4": "Ultimate Bundle"}
        plan_name = plan_names.get(str(plan_id), "Premium")
        if updated_user and updated_user.get('email'):
            send_subscription_email(updated_user['email'], updated_user.get('name', 'User'), plan_name, credits_to_add)
        
        print(f"✅ [PAYMENT SIMULATOR] Verified & Updated DB for User {user_id}, Plan {plan_id}")
        return jsonify({
            "status": "success", 
            "message": "Simulated payment verified and credits added.",
            "user": updated_user
        })
    user_id = data.get('user_id')
    plan_id = data.get('plan_id')
    razorpay_order_id = data.get('razorpay_order_id')
    razorpay_payment_id = data.get('razorpay_payment_id')
    razorpay_signature = data.get('razorpay_signature')

    if not all([user_id, razorpay_order_id, razorpay_payment_id, razorpay_signature]):
        return jsonify({"status": "error", "message": "Missing verification details."}), 400

    try:
        # Verify signature
        params_dict = {
            'razorpay_order_id': razorpay_order_id,
            'razorpay_payment_id': razorpay_payment_id,
            'razorpay_signature': razorpay_signature
        }
        
        # Allow manual developer bypass signature
        if razorpay_signature != 'bypass' and razorpay_payment_id != 'pay_manual_bypass':
            rzp_client.utility.verify_payment_signature(params_dict)
        
        # Determine credits based on plan_id (Example mapping)
        # Standardized to 1 credit per subscription as requested
        credits_to_add = 1
        
        # Update User in DB
        database.finalize_order(user_id, razorpay_order_id, razorpay_payment_id, credits_to_add, plan_id, payment_mode='Razorpay')
        
        # Fetch updated user to sync frontend context immediately
        updated_user = database.get_user_by_id(int(user_id))
        
        # Send subscription confirmation email
        plan_names = {"1": "Starter", "2": "ATS Pro", "3": "Proctor Elite", "4": "Ultimate Bundle"}
        plan_name = plan_names.get(str(plan_id), "Premium")
        if updated_user and updated_user.get('email'):
            send_subscription_email(updated_user['email'], updated_user.get('name', 'User'), plan_name, credits_to_add)
        
        return jsonify({
            "status": "success", 
            "message": "Payment verified. Credits added.",
            "user": updated_user
        })
    except Exception as e:
        print(f"Payment Verification Failed: {e}")
        return jsonify({"status": "error", "message": "Invalid payment signature."}), 400

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
         print(f"🚨 CRITICAL: No profile photo found for {user_id}. Blocking verification.")
         return jsonify({"status": "error", "message": "Identity Error: No registered profile photo found. Please re-sign up or contact admin."}), 403
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
             proctor_service.set_reference_profile(p_frame)
             print(f"✅ Identity Baseline established for user {user_id}")
             # Sync session and record successful verification snapshot
             proctor_service.session_id = manager.session_id
             proctor_service.save_evidence(frame, "Identity Verified")
        else:
             print(f"❌ Mismatch: Identity Verification Failed for user {user_id}: {feedback}")
             return jsonify({
                 "status": "error", 
                 "message": "Identity Not Matched: The person in camera does not match the person in resume/profile."
             }), 403

        # High confidence success if Face matched
        print(f"✨ Success: Identity Verified for user {user_id} (Distance: {distance:.4f})")
        return jsonify({
            "status": "success", 
            "message": "Identity Verified", 
            "confidence": 0.99,
            "match_distance": round(float(distance), 4),
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

@app.route('/api/auth/resend-otp', methods=['POST'])
def resend_otp():
    """Generic endpoint to resend OTP for both Admin and Password Recovery."""
    print(f"\n🔄 [RESEND OTP] Route HIT! Request: {request.json}")
    data = request.json
    email = data.get('email')
    
    if not email:
        return jsonify({"status": "error", "message": "Email address is required to resend code."}), 400
        
    # Generate new OTP (Standard 6-digit)
    otp = str(random.randint(100000, 999999))
    
    # Update existing storage context (whether it was admin_login or forgot_password)
    if email in otp_storage:
        otp_storage[email]["code"] = otp
        otp_storage[email]["expires"] = time.time() + 600 # Refresh to 10 mins
    else:
        # If session timed out/cleared, create new entry
        otp_storage[email] = {
            "code": otp,
            "expires": time.time() + 600
        }
        
    # Attempt to send real email
    sent_successfully, msg = send_otp_email(email, otp)
    
    if sent_successfully:
        return jsonify({"status": "success", "message": "A new verification code has been dispatched."})
    else:
        return jsonify({
            "status": "success", 
            "message": "New code generated. Check local console/txt log.",
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

@app.route('/api/user/<int:user_id>', methods=['GET'])
def get_user_profile(user_id):
    user_data = database.get_user_by_id(user_id)
    if user_data:
        return jsonify({"status": "success", "user": user_data})
    return jsonify({"status": "error", "message": "User not found"}), 404

@app.route('/api/init_session', methods=['POST'])
def init_session():
    """Initializes the manager with a pre-existing resume from the DB."""
    data = request.json
    user_id = data.get('user_id')
    topic = data.get('topic')
    mode = data.get('mode') # New: practice or interview
    is_practice = mode == 'practice'
    practice_section = data.get('practice_section') # New: For focused drills
    
    if not user_id: return jsonify({"status": "error", "message": "Missing user_id"}), 400
    
    # --- CREDIT GATING ---
    if not is_practice:
        if not database.decrement_user_credits(user_id):
             return jsonify({"status": "error", "message": "No interview credits remaining. Please upgrade your plan."}), 402
    
    # Get user plan from DB
    user_info = database.get_user_by_id(user_id)
    plan_id = user_info.get('plan_id', 0) if user_info else 0
    
    if topic:
        manager.set_module_topic(topic)
        print(f" 🎯 [MODULE] Express Initiation for: {topic}")
    else:
        manager.set_module_topic(None)

    # Initialize flow with plan and optional practice section
    manager.update_flow_for_plan(plan_id, practice_section=practice_section)
    
    user_data = database.get_user_by_id(int(user_id))
    if not user_data or not user_data.get('resume_path'):
        return jsonify({"status": "error", "message": "No stored resume found"}), 404
        
    filepath = user_data['resume_path']
    if not os.path.exists(filepath):
        return jsonify({"status": "error", "message": "Resume file not found on server"}), 404
        
    # Process with Manager
    success, msg = manager.load_resume(filepath)
    manager.resume_path = filepath
    manager.candidate_name = user_data['name']
    manager.update_flow_for_plan(user_data.get('plan_id', 1))
    
    # NEW: Create a database record for this session
    session_db_id = database.start_interview_session(user_id, topic)
    manager.session_db_id = session_db_id
    
    # Reset proctoring
    proctor_service.should_terminate = False
    proctor_service.violations = []
    manager.history = []
    manager.current_step = 0
    manager.credit_consumed = False
    
    if success:
        return jsonify({"status": "success", "message": "Session initialized from profile"})
    return jsonify({"status": "error", "message": msg}), 500

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

@app.route('/api/user/payments/<int:user_id>', methods=['GET'])
def get_user_payments(user_id):
    try:
        payments = database.get_user_payments(user_id)
        return jsonify({"status": "success", "payments": payments})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

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
        domain = data.get('domain')

        success, error = database.update_user_profile(user_id, name, email, phone, college_name, year, photo, resume_path, register_no, branch, domain)
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
    # Always return fresh user data so the frontend reflects the latest plan_id / credits
    user_data = database.get_user_by_id(user_id)
    return jsonify({"status": "success", "interviews": interviews, "user": user_data})

    # STRICT: Check for Interview Credits
    if not database.decrement_user_credits(user_id):
        return jsonify({"status": "error", "message": "No interview credits remaining. Please buy a plan."}), 402

    interview_id = database.start_interview_session(user_id)
    if interview_id:
        return jsonify({"status": "success", "interview_id": interview_id})
    return jsonify({"status": "error", "message": "Failed to start interview session"}), 500

@app.route('/api/interview/save', methods=['POST'])
def save_interview_result():
    data = request.json
    user_id = data.get('user_id')
    score = data.get('score')
    details = data.get('details')
    video_path = data.get('video_path')
    interview_id = data.get('interview_id')
    
    if user_id:
        database.save_interview(user_id, score, details, video_path, interview_id)
        return jsonify({"status": "success"})
    return jsonify({"status": "ignored", "message": "No user logged in"})

@app.route('/api/interview/terminate', methods=['POST'])
def terminate_interview():
    data = request.json
    interview_id = data.get('interview_id')
    if not interview_id:
        return jsonify({"status": "error", "message": "Interview ID required"}), 400
    
    success = database.terminate_interview_session(interview_id)
    if success:
        return jsonify({"status": "success", "message": "Interview session terminated due to violations."})
    return jsonify({"status": "error", "message": "Failed to terminate session"}), 500


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
    return download_past_report(interview_id, plan_id=4)

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
    user_id = request.form.get('user_id') 
    topic = request.form.get('topic') # New: Specialized Module Topic (e.g. System Design)
    mode = request.form.get('mode')
    is_practice = mode == 'practice'

    if topic:
        manager.set_module_topic(topic)
        print(f" 🎯 [MODULE] Interview session starting for Module: {topic}")
    else:
        manager.set_module_topic(None)

    # --- INTERVIEW CREDIT GATING ---
    if user_id:
        if not is_practice and not database.has_interview_credits(user_id):
            return jsonify({
                "status": "error", 
                "message": "You have exhausted your interview credits. Please upgrade your plan to continue.",
                "code": "OUT_OF_CREDITS"
            }), 403
        
        # NOTE: Credit consumption moved to get_interview_question (Step 0) to prevent double-burn in case of errors.
        print(f"💳 [Credits Check] User {user_id} has active credits.")
    print(f" - Filename: {file.filename}")
    
    if file.filename == '':
        return jsonify({"status": "error", "message": "No file selected"}), 400
    
    if not allowed_file(file.filename):
        return jsonify({"status": "error", "message": "Only PDF files are allowed"}), 400
    
    # --- CLEANUP PREVIOUS RESUMES (DISK PROTECTION) ---
    # To save space, we search for and delete any old resumes uploaded by this same person.
    timestamp = time.strftime("%Y%m%d_%H%M%S")
    safe_candidate_name = candidate_name.replace(' ', '_')
    for old_file in os.listdir(app.config['UPLOAD_FOLDER']):
        if safe_candidate_name in old_file:
            try:
                os.remove(os.path.join(app.config['UPLOAD_FOLDER'], old_file))
                print(f"🗑️ Deleted old resume for {candidate_name} to save disk space.")
            except:
                pass

    # Save the new resume
    filename = secure_filename(file.filename)
    saved_filename = f"{safe_candidate_name}_{filename}"
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], saved_filename)
    
    file.save(filepath)
    
    
    if user_id and str(user_id).lower() not in ['undefined', 'null', '']:
        try:
            database.update_resume_path(int(user_id), filepath)
            print(f" [DB] Updated resume path for User ID: {user_id}")
        except Exception as db_err:
            print(f" ⚠️ [DB ERROR] Failed to update resume path: {db_err}")
    
    # Fetch User Plan and Update Manager Flow
    plan_id = 0
    if user_id and str(user_id).lower() not in ['undefined', 'null', '']:
        try:
            user_data = database.get_user_by_id(int(user_id))
            if user_data:
                plan_id = user_data.get('plan_id', 0)
                manager.update_flow_for_plan(plan_id)
                print(f" ✅ [FLOW SYNC] Interview Manager set to Plan {plan_id}")
        except Exception as flow_err:
            print(f" ⚠️ [FLOW SYNC ERROR] {flow_err}")

    # Process with Manager
    success, msg = manager.load_resume(filepath)
    manager.resume_path = filepath # Link for auto-deletion after report
    # Reset proctoring and session state for fresh interview
    proctor_service.should_terminate = False
    proctor_service.termination_reason = None
    proctor_service.violations = []
    proctor_service.session_id = manager.session_id # Early Sync
    proctor_service.active_profile_encoding = None
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
         return jsonify({"status": "error", "message": msg}), 400

    bypass = request.form.get('bypass_name_check') == 'true'
    match, detected_name = manager.verify_candidate_match(candidate_name, manager.resume_text)
    
    if not match and not bypass:
         resume_uploaded = False
         return jsonify({
             "status": "error", 
             "message": "Identity Not Matched: The candidate name on your resume does not match your registered profile name. Please ensure they match exactly."
         }), 403 # Changed from warning to error (403 Forbidden)


    manager.candidate_name = candidate_name
    # Run resume analysis in background to avoid blocking UI during upload/parsing
    import threading
    threading.Thread(target=manager.analyze_resume, daemon=True).start()

    resume_uploaded = True
    current_candidate_info = {
        'name': candidate_name,
        'email': candidate_email,
        'resume_path': filepath,
        'upload_time': timestamp,
        'uploaded_at': datetime.now().isoformat()
    }
    
    # Update User Photo with Resume Portrait if available (Requested: person in resume matched)
    if user_id and manager.candidate_photo:
        try:
            database.update_user_profile(
                user_id=int(user_id),
                name=candidate_name,
                email=candidate_email,
                phone='Unknown', # Only targeting photo here
                college_name='Unknown',
                year='Unknown',
                photo=manager.candidate_photo
            )
            print(f" ✅ [MANAGER] Updated User {user_id} profile photo with resume portrait.")
        except: pass

    print(f"\n{'='*60}")
    print(f"Resume uploaded & Verified: {candidate_name}")
    print(f"{'='*60}\n")
    
    return jsonify({
        "status": "success",
        "message": "Identity verified. Lets move to the next process.",
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
    """Fetches the next question, ensuring plan-based flow is synced."""
    user_id = request.args.get('user_id')
    section = request.args.get('section')
    mode = request.args.get('mode')
    
    # CRITICAL: Re-sync plan and consume credit if this is the first question of the session
    if manager.current_step == 0 and user_id:
        try:
            user_data = database.get_user_by_id(int(user_id))
            if user_data:
                # 1. Plan & Practice Sync
                plan_id = user_data.get('plan_id', 0)
                is_practice = mode == 'practice'
                
                manager.update_flow_for_plan(plan_id, practice_section=section if is_practice else None)
                print(f" 🔄 [LATE SYNC] Interview started. Plan: {plan_id}, Mode: {mode}, Section: {section}")

                # 2. Billing Guard (Deduct credit ONLY ONCE per session, ONLY for full interviews)
                if not is_practice and not manager.credit_consumed:
                    # GATING: Ensure user actually has credits
                    if not (user_data.get('interviews_remaining', 0) > 0):
                        return jsonify({"status": "error", "message": "Interview cannot start. 0 Credits remaining."}), 403
                    
                    # Deduct from Database
                    if database.consume_interview_credit(int(user_id)):
                        manager.credit_consumed = True
                        print(f" 💳 [BILLING] 1 Credit consumed for Session {manager.session_id}, User {user_id}")
                    else:
                        return jsonify({"status": "error", "message": "Failed to authorize session billing."}), 500
                elif is_practice:
                    print(f" 🛠️ [PRACTICE] Sessions billing bypassed for drill.")
        except Exception as e:
            print(f" ⚠️ [LATE SYNC/BILLING ERROR] {e}")

    # Use strict flow to get first category
    category = manager.get_next_category()
    question = manager.generate_question(category)
    return jsonify({"question": question, "category": category})

@app.route('/api/interview/answer', methods=['POST'])
def submit_answer():
    data = request.json or {}
    question = data.get('question')
    answer = data.get('answer')
    user_id = data.get('user_id')
    
    # NOTE: Do NOT call update_flow_for_plan here — it resets current_step to 0,
    # which would restart the interview flow from the beginning on every answer.
    # Plan syncing is done once at session init (upload_resume / init_session / get_interview_question step 0).
    # Only re-sync if the plan has genuinely changed mid-session.
    if user_id:
        try:
            user_data = database.get_user_by_id(int(user_id))
            if user_data:
                plan_id = int(user_data.get('plan_id', 0))
                if plan_id != manager.plan_id:
                    # Plan changed (e.g. user upgraded mid-session) — preserve current_step
                    old_step = manager.current_step
                    manager.update_flow_for_plan(plan_id)
                    manager.current_step = old_step  # Restore position in flow
                    print(f" 🔄 [MID-SESSION] Plan changed {manager.plan_id} → {plan_id}. Step preserved at {old_step}.")
        except Exception: pass

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
    """Endpoint for generating synchronized audio from text (Streaming & Auto-Delete)."""
    data = request.json
    if not data or 'text' not in data:
        return jsonify({"status": "error", "message": "Text is required"}), 400
        
    text = data.get('text')
    try:
        print(f"🎬 Video generation request for text: {text[:50]}...")
        # 1. Generate synced video components
        from interview_video_pipeline import generate_synced_video
        _, output_audio_path = generate_synced_video(text)
        
        if output_audio_path and os.path.exists(output_audio_path):
             # 2. Read file to memory
             from flask import send_file
             from io import BytesIO
             with open(output_audio_path, 'rb') as f:
                 audio_bytes = f.read()
             
             # 3. Cleanup
             try: os.remove(output_audio_path)
             except: pass
             
             print(f"✅ Video generation success for: {text[:50]}")
             return send_file(BytesIO(audio_bytes), mimetype="audio/mp3")
        else:
             print(f"❌ Video generation FAILED: Path {output_audio_path} missing.")
             return jsonify({"status": "error", "message": "Failed to generate audio."}), 500
    except Exception as e:
        import traceback
        print(f"⚠️ Audio Generation CRITICAL Error: {e}")
        traceback.print_exc()
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

        # 1. Stop proctoring and sync violations (All plans)
        try:
            events = proctor_service.stop()
            if events:
                for ev in events:
                    if ev not in manager.violations:
                        manager.violations.append(ev)
        except Exception as e:
            print(f"⚠️ Proctor Stop Error: {e}")

        # Find the Identity Verified image if it exists
        identity_image = None
        for v in manager.violations:
            if v.get('type') == 'Identity Verified':
                identity_image = v.get('image_path')
                break
        
        manager.evidence_path = identity_image # Point to specific file, not dir
        proctor_score = proctor_service.get_score() if hasattr(proctor_service, 'get_score') else 100
        manager.proctor_score = proctor_score

        # 2. Calculate final score
        score = manager.calculate_score()
        video_path = data.get('video_path')

        # 3. Save interview record to database
        interview_id_db = None
        interview_id = data.get('interview_id')
        if user_id:
            # Sync Resume Score for report
            user_data = database.get_user_by_id(user_id)
            if user_data and user_data.get('resume_score') is not None:
                manager.resume_score = user_data.get('resume_score')

            # Collect evidence images as base64 so Plan 4 past reports can embed them
            import base64 as _b64ev
            evidence_b64 = []
            _seen_ev = set()
            # Priority 1: violation images
            for v in manager.violations:
                img_path = v.get('image_path')
                if img_path and os.path.exists(img_path) and os.path.isfile(img_path) and img_path not in _seen_ev:
                    try:
                        with open(img_path, 'rb') as _f:
                            evidence_b64.append({
                                'label': f"{v.get('type','Evidence')}: {v.get('message','')} ({v.get('severity','MEDIUM')})",
                                'b64': _b64ev.b64encode(_f.read()).decode('utf-8')
                            })
                        _seen_ev.add(img_path)
                    except Exception as _ev_err:
                        print(f"[Evidence] Could not encode violation image: {_ev_err}")
            # Priority 2: session proof files from evidence/ directory
            _ev_dir = os.path.join(os.getcwd(), 'evidence')
            if os.path.exists(_ev_dir):
                _sid_pfx = f"proof_{manager.session_id}_"
                for _fn in os.listdir(_ev_dir):
                    if not _fn.endswith('.jpg'): continue
                    _fp = os.path.join(_ev_dir, _fn)
                    if _sid_pfx in _fn and _fp not in _seen_ev and os.path.isfile(_fp):
                        _lbl = 'Session Log'
                        if 'Identity_Verified' in _fn: _lbl = 'Identity Proof (Live)'
                        elif 'Gains' in _fn: _lbl = 'Focus Gain'
                        elif 'loss'  in _fn: _lbl = 'Focus Loss'
                        try:
                            with open(_fp, 'rb') as _f:
                                evidence_b64.append({'label': _lbl, 'b64': _b64ev.b64encode(_f.read()).decode('utf-8')})
                            _seen_ev.add(_fp)
                        except Exception as _ev_err:
                            print(f"[Evidence] Could not encode session image {_fn}: {_ev_err}")
            print(f"[Evidence] Captured {len(evidence_b64)} image(s) for interview record.")

            details = {
                'candidate_name': manager.candidate_name,
                'evaluations': manager.evaluations,
                'violations': manager.violations,
                'submitted_solutions': manager.submitted_solutions,
                'proctor_score': proctor_score,
                'evidence_path': manager.evidence_path,
                'session_id': manager.session_id,
                'resume_analysis_results': manager.resume_analysis_results,
                'resume_score': manager.resume_score,  # Persist so all plan reports include it
                'evidence_b64': evidence_b64,           # Base64 evidence for Plan 4 past reports
                'is_trial_ended': data.get('is_trial_ended', False),
                'module_name': getattr(manager, 'module_topic', None)
            }
            interview_id_db = database.save_interview(user_id, score, details, video_path, interview_id)
            
            # --- AGGRESSIVE CLEANUP (Disk Space Optimization) ---
            # 1. Delete evidence images (already encoded in details['evidence_b64'])
            for img_path in _seen_ev:
                try:
                    if os.path.exists(img_path):
                        os.remove(img_path)
                        print(f"🗑️ [Disk Optimization] Deleted evidence image: {img_path}")
                except Exception as e:
                    print(f"⚠️ Cleanup error (img): {e}")

            # 2. Delete the user's uploaded resume (already analyzed)
            if user_id:
                user_data = database.get_user_by_id(user_id)
                if user_data and user_data.get('resume_path'):
                    res_path = user_data.get('resume_path')
                    if not os.path.isabs(res_path):
                        res_path = os.path.join(os.getcwd(), res_path)
                    try:
                        if os.path.exists(res_path):
                            os.remove(res_path)
                            print(f"🗑️ [Disk Optimization] Deleted resume: {res_path}")
                            database.update_resume_path(user_id, None) # Clear link in DB
                    except Exception as e:
                        print(f"⚠️ Cleanup error (resume): {e}")

            # 3. Wipe memory-resident evidence paths
            manager.cleanup_session()

        print(f"\n{'='*60}")
        print(f"Success: Interview Finished: {manager.candidate_name} | Score: {score}% | ID: {interview_id}")
        print(f"{'='*60}\n")

        return jsonify({
            "status": "success",
            "interview_id": interview_id_db,
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
        print(f"✅ Proctoring Monitoring Started for all plans (Session: {manager.session_id})")
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
    
    plan_id = request.args.get('plan_id', 0)
    
    # If ID is provided, use the past report logic
    if interview_id:
      return download_past_report(int(interview_id), int(plan_id))

    # Fallback to current manager as before
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    # Prepare filename - strict sanitization
    safe_name = re.sub(r'[^a-zA-Z0-9_]', '', manager.candidate_name or 'Candidate').strip()
    if not safe_name: safe_name = "Candidate"
    filename = f"Report_{safe_name}_{timestamp}.pdf"
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    
    try:
        success = manager.generate_pdf_report(filepath, int(plan_id))
    except Exception as e:
        print(f"[ERROR] PDF Generation Error: {e}")
        import traceback
        traceback.print_exc()
        success = False
    
    if success and os.path.exists(filepath):
        print(f"✅ Real-time PDF generated successfully: {filepath}")
        
        # Trigger cleanup of source files (Resume and Evidence Images)
        # Note: This does NOT delete the generated PDF report itself.
        try:
            manager.cleanup_session()
        except:
            pass

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
def download_past_report(interview_id, plan_id=None):
    if plan_id is None:
        plan_id = request.args.get('plan_id', 0)
        
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
    temp_manager.session_id = details.get('session_id', temp_manager.session_id)
    temp_manager.resume_analysis_results = details.get('resume_analysis_results')
    # Restore resume_score for all plans — check details first, then fall back to user's DB record
    temp_manager.resume_score = details.get('resume_score')
    if temp_manager.resume_score is None:
        try:
            uid = data.get('user_id')  # get_interview_by_id always returns user_id
            if uid:
                u = database.get_user_by_id(int(uid))
                if u and u.get('resume_score') is not None:
                    temp_manager.resume_score = u['resume_score']
                    print(f"✅ [RESUME SCORE] Restored from DB for user {uid}: {temp_manager.resume_score}")
        except Exception as rs_err:
            print(f"⚠️ Could not restore resume_score: {rs_err}")
    
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
        
    # Decode base64 evidence images to temp files for Plan 4 reports
    import base64 as _b64ev, uuid as _uuid
    decoded_evidence_temps = []
    evidence_b64 = details.get('evidence_b64', [])
    if evidence_b64:
        for _item in evidence_b64[:12]:  # cap at 12 images
            try:
                _img_bytes = _b64ev.b64decode(_item['b64'])
                _tmp_path  = os.path.join(app.config['UPLOAD_FOLDER'], f"ev_{_uuid.uuid4().hex}.jpg")
                with open(_tmp_path, 'wb') as _f:
                    _f.write(_img_bytes)
                decoded_evidence_temps.append((_tmp_path, _item.get('label', 'Evidence')))
            except Exception as _dec_err:
                print(f"[Evidence] Could not decode image: {_dec_err}")
        temp_manager.evidence_images = decoded_evidence_temps
        print(f"[Evidence] Restored {len(decoded_evidence_temps)} image(s) for past report.")

    # Prepare filename
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_name = re.sub(r'[^a-zA-Z0-9_]', '', temp_manager.candidate_name or 'Candidate').strip()
    if not safe_name: safe_name = "Candidate"
    
    filename = f"Report_{safe_name}_{timestamp}.pdf"
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    
    try:
        print(f"Generating PDF for {temp_manager.candidate_name} (ID: {interview_id})...")
        success = temp_manager.generate_pdf_report(filepath, int(plan_id))
    except Exception as e:
        print(f"Critical PDF Generation Exception: {e}")
        import traceback
        traceback.print_exc()
        success = False
    finally:
        # Always clean up decoded evidence temp files
        for _tp, _ in decoded_evidence_temps:
            try:
                if os.path.exists(_tp): os.remove(_tp)
            except: pass
    
    if success and os.path.exists(filepath):
        print(f"PDF generated successfully: {filepath}")
        return send_file(
            os.path.abspath(filepath), 
            as_attachment=True, 
            download_name=filename,
            mimetype='application/pdf'
        )
    else:
        print(f"Failed to serve PDF: success={success}, exists={os.path.exists(filepath)}")
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
    engine.setProperty('rate', 155)
    voices = engine.getProperty('voices')
    selected_voice = voices[0].id
    for v in voices:
        v_name = v.name.lower()
        if 'david' in v_name or 'james' in v_name or 'male' in v_name or 'guy' in v_name:
            selected_voice = v.id
            break
        if 'female' not in v_name and 'zira' not in v_name and 'samantha' not in v_name:
             selected_voice = v.id
    engine.setProperty('voice', selected_voice)
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
            print(f"⚠️ pyttsx3 failed: {pyttsx_err}. Falling back to edge-tts (Male)...")
            try:
                import asyncio
                import edge_tts
                async def gen_voice():
                    comm = edge_tts.Communicate(text, "en-US-GuyNeural")
                    await comm.save(filename_mp3)
                asyncio.run(gen_voice())
            except Exception as edge_err:
                print(f"⚠️ edge-tts failed: {edge_err}. Last fallback to gTTS...")
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


@app.route('/api/analyze-resume', methods=['POST'])
@app.route('/api/analyze_resume_ats', methods=['GET', 'POST'])
def analyze_resume_endpoint():
    if request.method == 'POST':
        data = request.json
        user_id = data.get('user_id')
    else:
        user_id = request.args.get('user_id')
    
    if not user_id:
        return jsonify({"status": "error", "message": "User ID required"}), 400
        
    user = database.get_user_by_id(user_id)
    if not user or not user.get('resume_path'):
        return jsonify({"status": "error", "message": "Resume file not found in profile. Please upload one in settings."}), 404
        
    try:
        # Extract text and analyze
        text = extract_text(user['resume_path'])
        analysis = resume_analyzer.analyze_resume_ats(text, [])
        
        # Save score to DB
        database.update_resume_score(user_id, analysis['score'])
        
        # Sync with manager for PDF report
        manager.resume_score = analysis['score']
        
        return jsonify({
            "status": "success",
            "analysis": analysis,
            "report": analysis # Alias for dashboard expectation
        })
    except Exception as e:
         return jsonify({"status": "error", "message": f"Analysis failed: {str(e)}"}), 500

@app.route('/api/prep_drills', methods=['GET'])
def get_prep_drills():
    """Serves curated Case Studies and Behavioral questions with model answers."""
    try:
        drills_path = os.path.join(current_dir, 'data', 'drills.json')
        if not os.path.exists(drills_path):
            return jsonify({"status": "error", "message": "Drills repository not found"}), 404
            
        with open(drills_path, 'r') as f:
            data = json.load(f)
            
        return jsonify({
            "status": "success",
            "case_studies": data.get('case_studies', []),
            "behavioral": data.get('behavioral', []),
            "projects": data.get('projects', []),
            "self_intro": data.get('self_intro', []),
            "total": len(data.get('case_studies', [])) + len(data.get('behavioral', [])) + len(data.get('projects', [])) + len(data.get('self_intro', []))
        })
    except Exception as e:
        print(f"Drills API Error: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/', methods=['GET'])
@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({"status": "ok", "message": "AI Interviewer API is running"})

def cleanup_static_audio():
    """Removes all files from static/audio directory to free up space on startup."""
    try:
        static_audio_dir = os.path.abspath(os.path.join(current_dir, '..', 'static', 'audio'))
        if os.path.exists(static_audio_dir):
            count = 0
            for f in os.listdir(static_audio_dir):
                file_path = os.path.join(static_audio_dir, f)
                if os.path.isfile(file_path):
                    try:
                        os.remove(file_path)
                        count += 1
                    except Exception:
                        pass
            print(f"[CLEAN] Auto-cleaned up {count} temporary files from static/audio/")
    except Exception as e:
         print(f"Cleanup Error during startup: {e}")

def start_flask_server(problems=None):
    global current_problems, interview_active
    if problems:
        current_problems = problems
    interview_active = True
    
    # Auto-clean temporary storage
    cleanup_static_audio()
    
    print("\n[START] Flask Server Running on http://0.0.0.0:5000")
    app.run(host='0.0.0.0', port=5000, debug=False, use_reloader=False, threaded=True)


@app.route('/api/auth/logout', methods=['POST'])
def global_logout():
    """Explicitly clears all server-side global state for the current session."""
    global resume_uploaded, current_candidate_info, proctor_service, violations, proctor_active, proctor_start_time
    
    print(f"[AUTH] Global logout triggered for {current_candidate_info.get('name', 'Unknown')}")
    
    # 1. Reset Proctoring
    if proctor_service:
        try: proctor_service.stop()
        except: pass
        proctor_service = ProctoringService()
    
    violations = {"tab_switches": 0, "fullscreen_exits": 0, "face_not_detected": 0}
    proctor_active = False
    proctor_start_time = None
    
    # 2. Reset Interview Manager
    manager.reset()
    
    # 3. Clear Candidate Info
    resume_uploaded = False
    current_candidate_info = {}
    
    return jsonify({
        "status": "success", 
        "message": "Global session cleared. Backend state reset."
    })


@app.route('/api/upload_video', methods=['POST'])
def upload_video():
    if 'video' not in request.files:
        return jsonify({"error": "No video file"}), 400
    
    video_file = request.files['video']
    interview_id = request.form.get('interview_id')
    
    if not interview_id:
        # Fallback to current session if ID not yet known (new interview)
        # However, it's better to have the ID.
        # For now, generate a unique filename
        filename = f"interview_video_{int(time.time())}.webm"
    else:
        filename = f"interview_{interview_id}_video.webm"
        
    video_dir = os.path.join(current_dir, 'evidence', 'videos')
    if not os.path.exists(video_dir):
        os.makedirs(video_dir)
        
    filepath = os.path.join(video_dir, filename)
    video_file.save(filepath)
    
    # Return the relative path for storing in DB
    return jsonify({
        "status": "success", 
        "video_path": f"evidence/videos/{filename}"
    })

@app.route('/api/video/stream/<int:interview_id>', methods=['GET'])
def stream_interview_video(interview_id):
    interview = database.get_interview_by_id(interview_id)
    if not interview or not interview.get('video_path'):
        return jsonify({"error": "Video not found"}), 404
        
    filepath = os.path.abspath(os.path.join(current_dir, interview['video_path']))
    if os.path.exists(filepath):
        return send_file(filepath, mimetype="video/webm")
    return jsonify({"error": "File missing on server"}), 404

@app.route('/api/video/download/<int:interview_id>', methods=['GET'])
def download_interview_video(interview_id):
    interview = database.get_interview_by_id(interview_id)
    if not interview or not interview.get('video_path'):
        return jsonify({"error": "Video not found"}), 404
        
    filepath = os.path.abspath(os.path.join(current_dir, interview['video_path']))
    if not os.path.exists(filepath):
        return jsonify({"error": "File missing on server"}), 404
        
    # Send then delete logic
    def generate():
        with open(filepath, 'rb') as f:
            yield from f
        # Delete after streaming
        try:
            os.remove(filepath)
            # Optionally update DB to mark as deleted
            print(f"🗑️ Video file {filepath} deleted after student download.")
        except Exception as e:
            print(f"Error deleting video file: {e}")

    # For simple file serving with as_attachment, we can't easily delete immediately after send_file returns without complex logic
    # But since this is a student download, we trigger the delete.
    
    # Check if delete=true is passed (usually from student results page)
    should_delete = request.args.get('delete', 'false').lower() == 'true'
    
    if should_delete:
        # Use a wrapper that deletes after the response is finished
        @after_this_request
        def remove_file(response):
            try:
                os.remove(filepath)
                # Update DB to clear video_path so it's not served again
                database.update_interview_video(interview_id, None)
            except Exception as error:
                print(f"Error deleting file and updating DB: {error}")
            return response
            
    return send_file(
        filepath, 
        as_attachment=True, 
        download_name=f"Interview_Recording_{interview_id}.webm",
        mimetype="video/webm"
    )

# ==============================================================================
# 📄 AI RESUME BUILDER ENGINE
# ==============================================================================

def generate_resume_pdf(data):
    """Generates a professionally formatted Resume PDF."""
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib import colors
    from io import BytesIO

    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=0.75*inch, bottomMargin=0.75*inch, leftMargin=0.75*inch, rightMargin=0.75*inch)
    styles = getSampleStyleSheet()
    elements = []

    # Custom premium styles
    C_PRIMARY = colors.HexColor('#1E293B')
    C_ACCENT = colors.HexColor('#2563EB')
    
    s_name = ParagraphStyle('Name', parent=styles['Normal'], fontSize=24, leading=28, textColor=C_PRIMARY, fontName='Helvetica-Bold')
    s_contact = ParagraphStyle('Contact', parent=styles['Normal'], fontSize=10, textColor=colors.HexColor('#64748B'), alignment=2) # Right align
    s_section = ParagraphStyle('Section', parent=styles['Heading2'], fontSize=14, spaceBefore=12, spaceAfter=6, textColor=C_ACCENT, fontName='Helvetica-Bold', borderPadding=(0,0,2,0), borderSide='bottom', borderColor=C_ACCENT)
    s_title = ParagraphStyle('JobTitle', parent=styles['Normal'], fontSize=11, fontName='Helvetica-Bold', textColor=C_PRIMARY)
    s_date = ParagraphStyle('Date', parent=styles['Normal'], fontSize=10, textColor=colors.HexColor('#64748B'), alignment=2)
    s_body = ParagraphStyle('Body', parent=styles['Normal'], fontSize=10, leading=14, textColor=colors.HexColor('#334155'))
    s_bullet = ParagraphStyle('Bullet', parent=s_body, leftIndent=12, firstLineIndent=0, spaceBefore=2)

    p = data.get('personal_info', {})
    
    # Header
    header_data = [
        [Paragraph(p.get('name', 'CANDIDATE NAME').upper(), s_name), 
         Paragraph(f"{p.get('location', '')}<br/>{p.get('email', '')}<br/>{p.get('phone', '')}", s_contact)]
    ]
    header_tab = Table(header_data, colWidths=[4.5*inch, 2.5*inch])
    header_tab.setStyle(TableStyle([('VALIGN', (0,0), (-1,-1), 'BOTTOM'), ('BOTTOMPADDING', (0,0), (-1,-1), 0)]))
    elements.append(header_tab)
    elements.append(Spacer(1, 0.2*inch))

    # Summary
    if data.get('summary'):
        elements.append(Paragraph("PROFESSIONAL SUMMARY", s_section))
        elements.append(Paragraph(data['summary'], s_body))
    
    # Experience
    if data.get('experience'):
        elements.append(Paragraph("WORK EXPERIENCE", s_section))
        for exp in data['experience']:
            exp_header = [[Paragraph(f"<b>{exp.get('title', '')}</b> | {exp.get('company', '')}", s_title), 
                           Paragraph(exp.get('period', ''), s_date)]]
            exp_tab = Table(exp_header, colWidths=[5.5*inch, 1.5*inch])
            exp_tab.setStyle(TableStyle([('VALIGN', (0,0), (-1,-1), 'TOP')]))
            elements.append(exp_tab)
            for bullet in exp.get('responsibilities', []):
                elements.append(Paragraph(f"• {bullet}", s_bullet))
            elements.append(Spacer(1, 0.1*inch))

    # Education
    if data.get('education'):
        elements.append(Paragraph("EDUCATION", s_section))
        for edu in data['education']:
            edu_header = [[Paragraph(f"<b>{edu.get('degree', '')}</b>", s_title), 
                           Paragraph(edu.get('year', ''), s_date)]]
            edu_tab = Table(edu_header, colWidths=[5.5*inch, 1.5*inch])
            edu_tab.setStyle(TableStyle([('VALIGN', (0,0), (-1,-1), 'TOP')]))
            elements.append(edu_tab)
            elements.append(Paragraph(f"{edu.get('institution', '')} • CGPA: {edu.get('cgpa', edu.get('gpa', 'N/A'))}", s_body))
            elements.append(Spacer(1, 0.1*inch))

    # Skills
    if data.get('skills'):
        elements.append(Paragraph("SKILLS & COMPETENCIES", s_section))
        if isinstance(data['skills'], list):
            elements.append(Paragraph(", ".join(data['skills']), s_body))
        elif isinstance(data['skills'], dict):
            s = data['skills']
            if s.get('languages'): elements.append(Paragraph(f"<b>Languages:</b> {s.get('languages')}", s_body))
            if s.get('frameworks'): elements.append(Paragraph(f"<b>Frameworks:</b> {s.get('frameworks')}", s_body))
            if s.get('tools'): elements.append(Paragraph(f"<b>Tools & Tech:</b> {s.get('tools')}", s_body))

    # Projects
    if data.get('projects'):
        elements.append(Paragraph("KEY PROJECTS", s_section))
        for proj in data['projects']:
            elements.append(Paragraph(f"<b>{proj.get('title', 'Project')}</b> ({proj.get('tech', '')})", s_title))
            elements.append(Paragraph(proj.get('description', ''), s_body))
            elements.append(Spacer(1, 0.1*inch))

    doc.build(elements)
    buffer.seek(0)
    return buffer

def ai_polish_resume(data):
    """
    Leverages LLM to rewrite resume descriptions, summaries, and skills for professional impact.
    """
    if not manager.client: return data
    
    # We only want to polish text-heavy fields
    prompt = f"""
    You are an elite Executive Resume Writer. Rewrite the provided resume data to maximize professional impact and ATS optimization.
    
    STRICT CATEGORICAL RULES:
    1. SUMMARY: Transformation into a powerful 2-3 sentence executive profile.
    2. EXPERIENCE/PROJECTS: Rewrite descriptions using the STAR method (Situation, Task, Action, Result). Use active verbs (e.g., 'Spearheaded', 'Engineered', 'Optimized').
    3. SKILLS: Standardize naming (e.g., 'js' -> 'JavaScript') and suggest 2-3 highly relevant missing skills based on the background.
    4. Formatting: Ensure professional tone. Do not use first-person ('I' or 'My').
    
    Respond ONLY with a VALID JSON object matching the input structure. No prefix, no suffix.
    
    Input Data:
    {json.dumps(data, indent=2)}
    """
    
    try:
        response = manager.client.chat.completions.create(
            model=manager.model_name,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.4,
            response_format={"type": "json_object"},
            timeout=25.0
        )
        polished_data = json.loads(response.choices[0].message.content)
        # Deep merge/validation to ensure structure consistency
        return polished_data if isinstance(polished_data, dict) else data
    except Exception as e:
        print(f"⚠️ AI Polish Error: {e}")
        return data

@app.route('/api/resume/polish', methods=['POST'])
def polish_resume_endpoint():
    """Endpoint to trigger AI-powered resume content optimization."""
    try:
        data = request.json
        user_id = data.get('user_id')
        resume_data = data.get('resume_data')
        
        if not user_id or not resume_data:
            return jsonify({"status": "error", "message": "Missing necessary data"}), 400
            
        print(f"✨ AI Polishing triggered for User {user_id}")
        polished = ai_polish_resume(resume_data)
        
        return jsonify({
            "status": "success",
            "message": "Resume polished successfully!",
            "polished_data": polished
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/resume/builder', methods=['POST'])
def build_resume():
    """Endpoint for generating a professional resume PDF from user data."""
    try:
        data = request.json
        user_id = data.get('user_id')
        resume_data = data.get('resume_data')
        
        if not user_id or not resume_data:
            return jsonify({"status": "error", "message": "Missing necessary data"}), 400
            
        # Optional: AI Polishing logic could go here
        # (Using manager.client to rewrite descriptions)
        
        pdf_buffer = generate_resume_pdf(resume_data)
        
        return send_file(
            pdf_buffer,
            as_attachment=True,
            download_name=f"Resume_{resume_data.get('personal_info', {}).get('name', 'Candidate').replace(' ', '_')}.pdf",
            mimetype='application/pdf'
        )
    except Exception as e:
        print(f"Resume building failed: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

# ==============================================================================
# 📄 RESUME BUILDER ENDPOINTS
# ==============================================================================

@app.route('/api/resume', methods=['GET', 'POST', 'PUT', 'DELETE'])
def manage_resumes():
    try:
        if request.method == 'GET':
            user_id = request.args.get('user_id')
            if not user_id:
                return jsonify({"error": "User ID required"}), 400
            resumes = database.get_user_resumes(user_id)
            return jsonify(resumes)

        elif request.method == 'POST':
            data = request.json
            user_id = data.get('user_id')
            resume_id = data.get('id')
            
            if not user_id:
                return jsonify({"error": "User ID required"}), 400
            
            # Calculate ATS Score based on the built content
            full_text = f"{data.get('summary', '')} "
            for exp in data.get('experience', []):
                full_text += f"{exp.get('role', '')} {exp.get('company', '')} {exp.get('desc', '')} "
            for proj in data.get('projects', []):
                full_text += f"{proj.get('name', '')} {proj.get('desc', '')} "
            for edu in data.get('education', []):
                full_text += f"{edu.get('degree', '')} {edu.get('school', '')} "
                
            skills_data = data.get('skills', [])
            skills_arr = []
            for s in skills_data:
                if isinstance(s, dict):
                    skills_arr.append(f"{s.get('category', '')}: {s.get('list', '')}")
                else:
                    skills_arr.append(str(s))
            full_text += " ".join(skills_arr)
            
            try:
                analysis = resume_analyzer.analyze_resume_ats(full_text, skills_arr)
                data['ats_score'] = analysis['score']
            except Exception as e:
                print(f"ATS Score logic skipped/failed: {e}")
                data['ats_score'] = 0.0

            # Save/Update builder data
            new_id = database.save_resume(user_id, data, resume_id)
            
            return jsonify({
                "status": "success", 
                "id": new_id, 
                "message": "Resume saved successfully", 
                "score": data.get('ats_score', 0.0)
            })

        elif request.method == 'PUT':
            data = request.json
            user_id = data.get('user_id')
            resume_id = request.args.get('id') or data.get('id')
            
            if not user_id or not resume_id:
                return jsonify({"error": "User ID and Resume ID required"}), 400
                
            res_id = database.save_resume(user_id, data, resume_id)
            if res_id:
                return jsonify({"status": "success", "id": res_id})
            return jsonify({"status": "error", "message": "Failed to update resume"}), 500

        elif request.method == 'DELETE':
            user_id = request.args.get('user_id')
            resume_id = request.args.get('id')
            
            if not user_id or not resume_id:
                return jsonify({"error": "User ID and Resume ID required"}), 400
                
            success = database.delete_resume(resume_id, user_id)
            if success:
                return jsonify({"status": "success"})
            return jsonify({"status": "error", "message": "Failed to delete resume"}), 500

    except Exception as e:
        print(f"Resume API Error: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    start_flask_server()


