const fs = require('node:fs');
const t = fs.readFileSync('packages/core/src/ingest/chunk.ts', 'utf8');
const lines = t.split(/\r?\n/);
for (let i = 0; i < lines.length; i++) {
  const l = lines[i];
  if (/ChunkOptions|Chunk|maxChars|overlapChars|maxTokens|overlap |heading|Chunk\}/.test(l)) {
    console.log(String(i + 1).padStart(3, ' ') + ': ' + l);
  }
}
