const fs = require('fs');
const s = fs.readFileSync('static/app.js','utf8');
const stack = [];
const pairs = {')':'(',']':'[','}':'{'};
for(let i=0;i<s.length;i++){
  const ch = s[i];
  if('([{'.includes(ch)) stack.push({ch,i:i+1});
  else if(')]}'.includes(ch)){
    if(stack.length===0){ console.log('Unmatched',ch,'at',i+1); process.exit(0); }
    const top = stack.pop();
    if(top.ch !== pairs[ch]){ console.log('Mismatched',top.ch,'vs',ch,'at',i+1); process.exit(0); }
  }
}
if(stack.length) console.log('Unclosed at end, top=',stack[stack.length-1]); else console.log('All balanced');
