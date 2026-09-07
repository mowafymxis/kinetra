const fs = require('node:fs');
const path = require('node:path');
function walk(d) {
  const out = [];
  for (const n of fs.readdirSync(d)) {
    const p = path.join(d, n);
    const s = fs.statSync(p);
    if (s.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}
let n = 0;
for (const p of walk('packages/plugin')) {
  const b = fs.readFileSync(p);
  if (b[0] === 0xEF && b[1] === 0xBB && b[2] === 0xBF) {
    fs.writeFileSync(p, b.subarray(3));
    console.log('stripped ' + p);
    n++;
  }
}
console.log('stripped ' + n + ' files');
