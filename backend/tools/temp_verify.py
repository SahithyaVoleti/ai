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
             print(f"✅ Identity Baseline established (Ground Truth) for user {user_id}")
             # Sync session and record successful verification snapshot
             proctor_service.session_id = manager.session_id
             proctor_service.save_evidence(frame, "Identity Verified")
        else:
             print(f"❌ Mismatch: Identity Verification Failed for user {user_id}: distance={distance:.4f} Msg: {feedback}")
             # STRICT: Log failure to proctoring events
             proctor_service.record_event("IDENTITY_MISMATCH_ATTEMPT", f"Identity verification failed (Biometric match: False).", "HIGH", frame)
             return jsonify({
                 "status": "error", 
                 "message": f"Identity Verification Failed: {feedback}"
             }), 403

        # 2. Eye Verification (Ensuring engagement)
        eyes_verified, eye_msg = proctor_service.verify_eyes(frame)
        
        if not eyes_verified:
            print(f"⚠️ Eye Verification Failed for user {user_id}: {eye_msg}")
            return jsonify({
                "status": "error", 
                "message": f"Biometric Validation Failed: {eye_msg}. Please look directly at the camera.",
                "confidence": 0.0
            }), 400
