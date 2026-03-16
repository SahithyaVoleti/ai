
import sys

def check_balance(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    balance = 0
    lines = content.split('\n')
    with open('balance_trace.txt', 'w', encoding='utf-8') as out:
        for i, line in enumerate(lines):
            if i > 500: break
            clean_line = line.split('//')[0]
            for char in clean_line:
                if char == '{':
                    balance += 1
                elif char == '}':
                    balance -= 1
            
            out.write(f"{i+1:4} | {balance:2} | {line}\n")
    print(f"Trace written to balance_trace.txt. Final balance at line 500: {balance}")

if __name__ == "__main__":
    check_balance(sys.argv[1])
