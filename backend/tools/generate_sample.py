import os
import sys
from datetime import datetime

# Add current directory to path so we can import manager
sys.path.append(os.getcwd())

from manager import InterviewManager

def generate_sample():
    print("🚀 Generating Sample Report...")
    manager = InterviewManager()
    
    # Mock Candidate Info
    manager.candidate_name = "Sample Candidate"
    manager.start_time = datetime.now()
    
    # Mock evaluations
    manager.evaluations = [
        {
            "type": "Technical",
            "question": "What is the difference between an abstract class and an interface?",
            "answer": "An interface defines a contract while an abstract class can provide partial implementation...",
            "score": 9,
            "feedback": "Excellent conceptual clarity and detailed explanation.",
            "confidence": 0.9,
            "fluency": 0.85
        },
        {
            "type": "Coding",
            "question": "Reverse a linked list.",
            "answer": "Used a three-pointer approach to reverse the links in-place...",
            "score": 8,
            "feedback": "Correct logic, efficient solution.",
            "confidence": 0.8,
            "fluency": 0.7
        },
        {
            "type": "HR/Behavioral",
            "question": "Tell me about a time you handled a conflict in a team.",
            "answer": "I once disagreed with a teammate about the database design. We discussed the pros and cons and chose the most scalable option...",
            "score": 7,
            "feedback": "Good soft skills, though the example could be more specific.",
            "confidence": 0.75,
            "fluency": 0.9
        }
    ]
    
    # Generate Sample Images
    evidence_dir = "evidence"
    if not os.path.exists(evidence_dir):
        os.makedirs(evidence_dir)
    
    import cv2
    import numpy as np
    
    # 1. Identity Proof Image
    id_img_path = os.path.join(evidence_dir, f"proof_{manager.session_id}_Identity_Verified.jpg")
    img = np.zeros((480, 640, 3), dtype=np.uint8)
    cv2.putText(img, "Identity Proof: Sample Candidate", (50, 240), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
    cv2.imwrite(id_img_path, img)
    
    # 2. Violation Image
    violation_img_path = os.path.join(evidence_dir, f"proof_{manager.session_id}_MULTIPLE_PEOPLE.jpg")
    img_v = np.zeros((480, 640, 3), dtype=np.uint8)
    img_v[:] = (0, 0, 150) # Dark red background
    cv2.putText(img_v, "VIOLATION: Multiple People Detected", (50, 240), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)
    cv2.imwrite(violation_img_path, img_v)

    # Mock Violations with images
    manager.violations = [
        {
            "type": "MULTIPLE_PEOPLE",
            "message": "Security Violation: Multiple people detected in frame.",
            "severity": "CRITICAL",
            "timestamp": datetime.now().isoformat(),
            "image_path": violation_img_path
        }
    ]
    manager.proctor_score = 45 

    # Mock Resume
    uploads_dir = "uploads"
    if not os.path.exists(uploads_dir):
        os.makedirs(uploads_dir)
    resume_path = os.path.join(uploads_dir, f"sample_resume_{manager.session_id}.pdf")
    with open(resume_path, "w") as f:
        f.write("%PDF-1.4 dummy resume content")
    manager.resume_path = resume_path

    # Ensure reports directory exists
    reports_dir = "reports"
    if not os.path.exists(reports_dir):
        os.makedirs(reports_dir)
        
    filename = os.path.join(reports_dir, "Sample_Interview_Report.pdf")
    
    print(f"📄 Building PDF: {filename}")
    success = manager.generate_pdf_report(filename, plan_id=4)
    
    if success:
        print(f"✅ Sample Report Generated Successfully at: {os.path.abspath(filename)}")
        # Check if resume was deleted (if we implement it in manager.py)
        if not os.path.exists(resume_path):
            print("✨ Resume auto-deleted successfully!")
    else:
        print("❌ Failed to generate report.")

if __name__ == "__main__":
    generate_sample()
