
with open('balance_trace_full.txt', 'r', encoding='utf-8') as f:
    for line in f:
        # Format is "LLLL | BBB | text"
        parts = line.split('|')
        if len(parts) < 3: continue
        line_num = int(parts[0].strip())
        balance = int(parts[1].strip())
        text = parts[2].strip()
        
        if balance == 0 and line_num > 12 and line_num < 2920:
             # Balance should be at least 1 inside HomeContent
             # Except inside a closure that closes on the same line... but balance is per line.
             # Wait, balance in my script is the cumulative balance after the whole line.
             print(f"ALARM: Balance 0 at line {line_num}: {text}")
