
import sys

def check_balance(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    balance = 0
    lines = content.split('\n')
    for i, line in enumerate(lines):
        # Ignore comments
        clean_line = line.split('//')[0]
        # Ignore strings roughly
        # (This is a quick hack, might fail on complex cases)
        
        for char in clean_line:
            if char == '{':
                balance += 1
            elif char == '}':
                balance -= 1
        if balance < 0:
            print(f"Negative balance at line {i+1}: {line}")
            balance = 0 # reset to continue finding
    
    print(f"Final balance: {balance}")

if __name__ == "__main__":
    check_balance(sys.argv[1])
