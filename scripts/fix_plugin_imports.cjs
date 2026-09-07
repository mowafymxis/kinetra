const fs = require('node:fs');
const path = require('node:path');
const skillsDir = 'packages/plugin/skills';
const skills = fs.readdirSync(skillsDir).filter(d => fs.statSync(path.join(skillsDir, d)).isDirectory());
let changed = 0;
for (const s of skills) {
  const f = path.join(skillsDir, s, 'SKILL.md');
  const before = fs.readFileSync(f, 'utf8');
  // ../../../core -> ../../../../core so it resolves from packages/plugin/skills/<s>/SKILL.md to packages/core/...
  const after = before.replace(/\.\.\/\.\.\/\.\.\/core\//g, '../../../../core/');
  if (after !== before) {
    fs.writeFileSync(f, after, 'utf8');
    changed++;
    console.log('rewrote ' + s);
  }
}
console.log('changed: ' + changed);
