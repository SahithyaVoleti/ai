import json
import os

filepath = r'c:\Users\Dell\Desktop\ai-interviewer main1\backend\data\drills.json'

try:
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)

    behavioral = data.get('behavioral', [])
    self_intro_items = []
    new_behavioral = []

    for item in behavioral:
        if item.get('id', '').startswith('si_') or item.get('category') == 'Self Introduction':
            self_intro_items.append(item)
        else:
            new_behavioral.append(item)

    data['behavioral'] = new_behavioral
    data['self_intro'] = self_intro_items

    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)

    print(f"Successfully moved {len(self_intro_items)} items to self_intro. Behavioral now has {len(new_behavioral)} items.")
except Exception as e:
    print(f"Error: {e}")
