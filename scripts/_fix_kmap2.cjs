const fs = require('fs');
let s = fs.readFileSync('packages/core/src/dld/kmap.ts', 'utf8');

// We changed cover step to use p.expandedMask. Now refine "coversExtras":
// a prime is allowed to cover an "extra" cell if and only if that cell is
// a dont-care. Without this, dont-cares can make the simplifier drop real
// minterms (e.g. realMask=0b001, dontMask=0b110 in 3-var yields an empty cover).
const oldBlock = `  for (const p of primes) {
    let coversAll = true;
    for (const t of targetIndices) {
      if (((p.expandedMask >> BigInt(t)) & 1n) === 0n) { coversAll = false; break; }
    }
    // also must not cover any non-target indices
    let coversExtras = false;
    for (let i = 0n; i < (1n << BigInt(variables.length)); i++) {
      if (((targetMask >> i) & 1n) === 1n) continue;
      if (((p.expandedMask >> i) & 1n) === 1n) { coversExtras = true; break; }
    }
    if (coversAll && !coversExtras) p.used = true;
  }`;
const newBlock = `  // "Allowed" set = targetMask | dontCareMask. A prime is valid if every
  // cell it covers is in the allowed set. Without this, dont-cares make the
  // cover step reject every prime and return an empty cover.
  const allowedMask = targetMask | dontCareMask;
  for (const p of primes) {
    let coversAll = true;
    for (const t of targetIndices) {
      if (((p.expandedMask >> BigInt(t)) & 1n) === 0n) { coversAll = false; break; }
    }
    // also must not cover any non-allowed indices
    let coversExtras = false;
    for (let i = 0n; i < (1n << BigInt(variables.length)); i++) {
      if (((allowedMask >> i) & 1n) === 1n) continue;
      if (((p.expandedMask >> i) & 1n) === 1n) { coversExtras = true; break; }
    }
    if (coversAll && !coversExtras) p.used = true;
  }`;
if (s.includes(oldBlock)) s = s.replace(oldBlock, newBlock);

// Same logic in the greedy cover loop:
const oldBlock2 = `      for (let i = 0n; i < (1n << BigInt(variables.length)); i++) {
        if (((targetMask >> i) & 1n) === 1n) continue;
        if (((p.expandedMask >> i) & 1n) === 1n) { hasExtra = true; break; }
      }`;
const newBlock2 = `      for (let i = 0n; i < (1n << BigInt(variables.length)); i++) {
        if (((allowedMask >> i) & 1n) === 1n) continue;
        if (((p.expandedMask >> i) & 1n) === 1n) { hasExtra = true; break; }
      }`;
if (s.includes(oldBlock2)) s = s.replace(oldBlock2, newBlock2);

// POS form: for POS, the "target" is the zeros and the "extras" are
// anything not in (zeros | dontCares). The current code computes
// targetMask = ~mintermMask & allMask (i.e., zeros). But extras should
// not be against the original ones. Easier: just use allowedMask for the
// POS form too, which is computed at the top of minimize. Refactor:
// since allowedMask is now defined in the first cover loop, expose it
// earlier for the greedy loop as well.

// The greedy loop runs AFTER the "for (const p of primes)..." loop,
// so `allowedMask` is already in scope. Good.

// The `essential primes` block also needs the same fix:
const oldBlock3 = `    for (let q of primes) {
      if (q === p) continue;
      for (const t of targetIndices) {
        if (((p.expandedMask >> BigInt(t)) & 1n) === 1n && ((q.expandedMask >> BigInt(t)) & 1n) === 1n) {
          only = false; break;
        }
      }
      if (!only) break;
    }`;
// That block only checks coverage of target, not extras, so it's fine.

// Save
fs.writeFileSync('packages/core/src/dld/kmap.ts', s);
console.log('done. size now', s.length);