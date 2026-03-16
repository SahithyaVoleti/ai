
import sys

def check_balance(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    balance = 0
    lines = content.split('\n')
    for i, line in enumerate(lines):
        if i > 400: break
        clean_line = line.split('//')[0]
        # Skip strings roughly
        # ...
        for char in clean_line:
            if char == '{':
                balance += 1
            elif char == '}':
                balance -= 1
        
        print(f"{i+1:4} | {balance:2} | {line}")

if __name__ == "__main__":
    check_balance(sys.argv[1])
