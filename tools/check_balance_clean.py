
import sys

def check_balance(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    balance = 0
    lines = content.split('\n')
    for i, line in enumerate(lines):
        clean_line = line.split('//')[0]
        # Skip string literals (basic)
        in_string = False
        quote_char = ''
        for j, char in enumerate(clean_line):
            if (char == '"' or char == "'") and (j == 0 or clean_line[j-1] != '\\'):
                if not in_string:
                    in_string = True
                    quote_char = char
                elif quote_char == char:
                    in_string = False
            
            if not in_string:
                if char == '{': balance += 1
                elif char == '}': balance -= 1
        
        if balance == 0 and i > 12:
            print(f"ALARM: Balance 0 at line {i+1}: {line.strip()}")
            # Break if it stays 0 for a while or if we want the first one
            # return
    print(f"Final balance: {balance}")

if __name__ == "__main__":
    check_balance(sys.argv[1])
