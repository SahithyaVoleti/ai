import json
import re

def process():
    with open('raw_projects.txt', 'r', encoding='utf-8') as f:
        content = f.read()
    
    blocks = content.split('---')
    all_projects = []
    
    for block in blocks:
        block = block.strip()
        if not block:
            continue
        try:
            data = json.loads(block)
            if isinstance(data, list):
                all_projects.extend(data)
        except json.JSONDecodeError as e:
            print(f"Failed to parse block: {e}")
            
    # Remove duplicates based on ID
    unique_projects = {}
    for c in all_projects:
        unique_projects[c['id']] = c
        
    print(f"Extracted {len(unique_projects)} unique projects.")
    
    try:
        with open('drills.json', 'r', encoding='utf-8') as f:
            drills = json.load(f)
    except FileNotFoundError:
        drills = {"case_studies": [], "behavioral": [], "projects": []}
        
    if "projects" not in drills:
        drills["projects"] = []
        
    existing_ids = {item.get('id') for item in drills["projects"]}
    
    for c in unique_projects.values():
        new_id = f"proj_user_{c['id']}"
        if new_id not in existing_ids:
            drills["projects"].append({
                "id": new_id,
                "category": "Project Defense",
                "title": c["project"],
                "question": f"Discuss your project: {c['project']}",
                "ideal_answer": c["answer"],
                "complexity": "Master",
                "tags": ["Project", "Technical"]
            })
            
    with open('drills.json', 'w', encoding='utf-8') as f:
        json.dump(drills, f, indent=2, ensure_ascii=False)
        
    print("drills.json successfully updated with projects.")

if __name__ == '__main__':
    process()
