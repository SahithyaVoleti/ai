
import sys
def check_balance(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    balance = 0
    lines = content.split('\n')
    for i, line in enumerate(lines):
        clean_line = line.split('//')[0]
        # skip string literals basic
        in_string = False
        quote = None
        for j, char in enumerate(clean_line):
            if (char == '"' or char == "'") and (j == 0 or clean_line[j-1] != '\\'):
                if not in_string:
                    in_string = True
                    quote = char
                elif quote == char:
                    in_string = False
            if not in_string:
                if char == '{': balance += 1
                elif char == '}': balance -= 1
        if 200 <= i <= 325:
             val = f"{i+1:4} | {balance:3} | {line}"
             print(val)
if __name__ == "__main__":
    check_balance(sys.argv[1])
