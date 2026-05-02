from pathlib import Path
s = Path('static/app.js').read_text(encoding='utf-8')
stack = []
pairs = {')':'(',']':'[','}':'{'}
for i, ch in enumerate(s):
    if ch in '([{':
        stack.append((ch, i+1))
    elif ch in ')]}':
        if not stack:
            print('Unmatched', ch, 'at', i+1)
            break
        top, idx = stack.pop()
        if top != pairs[ch]:
            print('Mismatched', top, 'vs', ch, 'at', i+1)
            break
else:
    if stack:
        print('Unclosed at end, top=', stack[-1])
    else:
        print('All balanced')
