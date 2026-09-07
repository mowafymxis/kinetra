const { readFileSync } = require('node:fs');
const text = readFileSync('packages/plugin/skills/kinetra-circuits/SKILL.md', 'utf8');
const re = /import\s*(?:type\s*)?\{([^}]+)\}\s*from\s*["']([^"']+)["']/g;
for (const m of text.matchAll(re)) console.log(m[2]);
