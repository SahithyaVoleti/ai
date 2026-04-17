import json
import re

def process():
    with open('raw_behavioral.txt', 'r', encoding='utf-8') as f:
        content = f.read()
    
    # We have multiple blocks
    blocks = content.split('---')
    all_questions = []
    
    for block in blocks:
        block = block.strip()
        if not block:
            continue
        try:
            # It could be {"behavioral_questions": [...]} or [...]
            data = json.loads(block)
            if isinstance(data, dict) and "behavioral_questions" in data:
                all_questions.extend(data["behavioral_questions"])
            elif isinstance(data, list):
                all_questions.extend(data)
        except json.JSONDecodeError as e:
            print(f"Failed to parse block: {e}")
            
    # Remove duplicates based on ID
    unique_questions = {}
    for q in all_questions:
        unique_questions[q['id']] = q
        
    print(f"Extracted {len(unique_questions)} unique behavioral questions.")
    
    # Load drills.json
    try:
        with open('drills.json', 'r', encoding='utf-8') as f:
            drills = json.load(f)
    except FileNotFoundError:
        drills = {"case_studies": [], "behavioral": []}
        
    if "behavioral" not in drills:
        drills["behavioral"] = []
        
    # Append the new ones
    # Keep the existing bh_1 if needed, or clear except we probably just append
    # But to avoid appending the same things over and over, we might clear it or match IDs
    # The user says "these are behavioural based questions so add in that section"
    # I will replace the behavioral section entirely with these 100 questions, plus keeping existing ones
    
    existing_ids = {item.get('id') for item in drills["behavioral"]}
    
    for q in unique_questions.values():
        new_id = f"bh_user_{q['id']}"
        if new_id not in existing_ids:
            drills["behavioral"].append({
                "id": new_id,
                "category": "Behavioral Interview",
                "question": q["question"],
                "ideal_answer": q["answer"],
                "complexity": "Intermediate",
                "tags": ["Behavioral"]
            })
            
    with open('drills.json', 'w', encoding='utf-8') as f:
        json.dump(drills, f, indent=2, ensure_ascii=False)
        
    print("drills.json successfully updated.")

if __name__ == '__main__':
    process()
