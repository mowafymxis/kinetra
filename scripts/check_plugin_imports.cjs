const fs = require('node:fs');
const path = require('node:path');

const CORE = path.resolve('packages/core/src');
function listExports(f) {
  const text = fs.readFileSync(f, 'utf8');
  const out = new Set();
  const re1 = /^export\s+(?:async\s+)?(?:function|const|let|var|class|type|interface)\s+([A-Za-z_\$][\w\$]*)/gm;
  for (const m of text.matchAll(re1)) out.add(m[1]);
  const re2 = /^export\s+(?:type\s+)?\{([^}]+)\}\s+from\s+["'][^"']+["']/gm;
  for (const m of text.matchAll(re2)) {
    for (const name of m[1].split(',')) {
      const n = name.trim().split(/\s+as\s+/)[0].trim();
      if (n) out.add(n);
    }
  }
  return out;
}
function findModule(rel) {
  const base = rel.replace(/\.js\$/, '');
  const candidates = [
    path.join(CORE, base + '.ts'),
    path.join(CORE, base + '.d.ts'),
    path.join(CORE, base + '/index.ts'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

const skills = fs.readdirSync('packages/plugin/skills')
  .filter(d => fs.statSync(path.join('packages/plugin/skills', d)).isDirectory());
const failures = [];
for (const s of skills) {
  const text = fs.readFileSync(path.join('packages/plugin/skills', s, 'SKILL.md'), 'utf8');
  const re = /import\s*(?:type\s*)?\{([^}]+)\}\s*from\s*["']([^"']+)["']/g;
  for (const m of text.matchAll(re)) {
    const names = m[1].split(',').map(x => x.trim().replace(/^type\s+/, '')).filter(Boolean);
    const p = m[2];
    let abs = null;
    if (p.startsWith('../../../core/')) abs = path.join('packages/plugin', p.replace(/^\.\.\/\.\.\/\.\.\//, ''));
    else continue;
    const mod = findModule(abs);
    if (!mod) { failures.push(s + ': MODULE-NOT-FOUND ' + p + ' (tried ' + abs + ')'); continue; }
    const exps = listExports(mod);
    for (const n of names) if (!exps.has(n)) failures.push(s + ': ' + p + ' MISSING-EXPORT ' + n);
  }
}
console.log(failures.length ? failures.join('\n') : 'OK');
