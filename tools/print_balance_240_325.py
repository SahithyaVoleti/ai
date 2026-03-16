
import sys

def check_balance(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    balance = 0
    lines = content.split('\n')
    for i, line in enumerate(lines):
        if i < 240: continue
        if i > 325: break
        
        clean_line = line.split('//')[0]
        # Skip strings (simplified)
        in_string = False
        for char in clean_line:
            if char == '"' or char == "'": in_string = not in_string
            if not in_string:
                if char == '{': balance += 1
                elif char == '}': balance -= 1
        
        # Track balance correctly even before line 240
        # Wait, I need to compute balance FROM START
    
if __name__ == "__main__":
    # Corrected version
    with open(sys.argv[1], 'r', encoding='utf-8') as f:
        content = f.read()
    balance = 0
    lines = content.split('\n')
    for i, line in enumerate(lines):
        clean_line = line.split('//')[0]
        for char in clean_line:
            if char == '{': balance += 1
            elif char == '}': balance -= 1
        if i >= 240 and i <= 325:
             print(f"{i+1:4} | {balance:2} | {line}")

if __name__ == "__main__":
    pass # covered above
