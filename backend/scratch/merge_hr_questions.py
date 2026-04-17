import json
import os

DRILLS_PATH = 'data/drills.json'
USER_QUESTIONS_PATH = 'scratch/user_hr_questions.json'

def merge_questions():
    if not os.path.exists(DRILLS_PATH):
        print(f"Error: {DRILLS_PATH} not found.")
        return

    with open(DRILLS_PATH, 'r') as f:
        drills = json.load(f)

    with open(USER_QUESTIONS_PATH, 'r') as f:
        user_questions = json.load(f)

    # Dedup and reformat
    seen_questions = set()
    new_behavioral = []
    
    # Existing questions to avoid duplicates if user asks again
    for q in drills.get('behavioral', []):
        seen_questions.add(q['question'].lower().strip())

    for uq in user_questions:
        q_text = uq['question'].lower().strip()
        if q_text in seen_questions:
            continue
            
        seen_questions.add(q_text)
        
        # Determine ID
        new_id = f"bh_hr_{uq['id']}"
        
        formatted = {
            "id": new_id,
            "category": "HR Interview",
            "question": uq['question'],
            "ideal_answer": uq['answer'],
            "complexity": uq['difficulty'],
            "tags": ["HR", uq['type']]
        }
        new_behavioral.append(formatted)

    if 'behavioral' not in drills:
        drills['behavioral'] = []
    
    drills['behavioral'].extend(new_behavioral)
    
    with open(DRILLS_PATH, 'w') as f:
        json.dump(drills, f, indent=2)

    print(f"Successfully added {len(new_behavioral)} HR questions to {DRILLS_PATH}.")

if __name__ == "__main__":
    merge_questions()
