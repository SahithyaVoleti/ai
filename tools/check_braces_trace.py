
import sys

def check_balance(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    balance = 0
    lines = content.split('\n')
    for i, line in enumerate(lines):
        clean_line = line.split('//')[0]
        # Skip strings roughly
        # ...
        old_balance = balance
        for char in clean_line:
            if char == '{':
                balance += 1
            elif char == '}':
                balance -= 1
        
        # Print lines where balance becomes 0 (potential component end)
        if old_balance > 0 and balance == 0:
            print(f"--- Balance 0 at line {i+1}: {line}")
        elif balance < 0:
            print(f"!!! Negative balance at line {i+1}: {line}")
            balance = 0

if __name__ == "__main__":
    check_balance(sys.argv[1])
