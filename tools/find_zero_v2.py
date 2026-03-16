
import sys

def check_balance(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    balance = 0
    lines = content.split('\n')
    for i, line in enumerate(lines):
        clean_line = line.split('//')[0]
        # Skip strings roughly
        for char in clean_line:
            if char == '{': balance += 1
            elif char == '}': balance -= 1
        
        if balance <= 0 and i > 12:
            print(f"!!! BALANCE 0 OR NEGATIVE at line {i+1}: {line}")
            # balance = 1 # reset to find next
            #break
    print(f"Final: {balance}")

if __name__ == "__main__":
    check_balance(sys.argv[1])
