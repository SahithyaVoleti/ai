
with open('balance_trace_full.txt', 'r', encoding='utf-8') as f:
    for line in f:
        if ' |   0 | ' in line:
            parts = line.split('|')
            line_num = int(parts[0].strip())
            if line_num > 11: # Skip imports
                print(line.strip())
