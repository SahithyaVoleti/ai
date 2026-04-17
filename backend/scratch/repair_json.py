import json
import os

filepath = r'c:\Users\Dell\Desktop\ai-interviewer main1\backend\data\drills.json'

with open(filepath, 'r', encoding='utf-8') as f:
    text = f.read()

# Fix the broken end part
# We find the last unique quote and rebuild from there
marker = '"id": "proj_user_100"'
if marker in text:
    parts = text.split(marker)
    # The first part is everything up to "id": "proj_user_100"
    # We need to find the opening brace for this object
    last_brace_idx = parts[0].rfind('{')
    base_text = parts[0][:last_brace_idx]
    
    # Now we know what's in proj_user_100
    proj_100 = {
        "id": "proj_user_100",
        "category": "Project Defense",
        "title": "Smart Multi-Modal Biometric Authentication System",
        "question": "Discuss your project: Smart Multi-Modal Biometric Authentication System",
        "ideal_answer": "My project is Smart Multi-Modal Biometric Authentication System. The problem is weak security systems. The objective was to enhance authentication. I used face, voice, and fingerprint recognition. The system verifies users using multiple methods. This improves security. My role was integration and model development.",
        "complexity": "Master",
        "tags": [
            "Project",
            "Technical"
        ]
    }
    
    # We also need to make sure si_1 to si_25 are in behavioral
    # Let's just reload the whole structure if possible, but the file is broken.
    # So we'll try to parse the base_text + some closing brackets
    try:
        # Re-parse what we can
        final_text = base_text + json.dumps(proj_100, indent=2) + "\n  ]\n}"
        json.loads(final_text)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(final_text)
        print("Successfully repaired JSON")
    except Exception as e:
        print(f"Failed to repair: {e}")
else:
    print("Marker not found")
