
import sys

def check_balance(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    balance = 0
    lines = content.split('\n')
    with open('balance_trace_full.txt', 'w', encoding='utf-8') as out:
        for i, line in enumerate(lines):
            clean_line = line.split('//')[0]
            # Handle possible single chars like { or } in strings (very basic)
            for char in clean_line:
                if char == '{':
                    balance += 1
                elif char == '}':
                    balance -= 1
            
            out.write(f"{i+1:4} | {balance:3} | {line}\n")
            if balance < 0:
                out.write(f"!!! ERROR: Negative balance at line {i+1}\n")
                balance = 0
    print(f"Full trace written to balance_trace_full.txt. Final balance: {balance}")

if __name__ == "__main__":
    check_balance(sys.argv[1])
