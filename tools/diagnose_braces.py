
with open('balance_trace_full.txt', 'r', encoding='utf-8') as f:
    balance = 0
    lines = f.readlines()
    for i, line in enumerate(lines):
        parts = line.split('|')
        if len(parts) < 3: continue
        bal = int(parts[1].strip())
        if i > 11 and bal == 0 and i < 2900:
            print(f"ALARM at line {i+1}")
            for j in range(max(0, i-5), min(len(lines), i+6)):
                print(lines[j].strip())
            break
