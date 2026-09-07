const fs = require('fs');
let s = fs.readFileSync('packages/core/src/dld/kmap.ts', 'utf8');

// Revert the over-eager early exit: when targetMask is allMask, we still
// need to find an implicant that covers all of targetMask. The original
// algorithm should handle it via the standard merge, BUT in some cases
// (like F=1 with no dont-cares) the round-1 pairing of 4 cells produces
// size-2 primes whose dontMasks differ, blocking round-2 merge. The
// cleaner fix is to also try merging primes whose (p1&~d1) and (p2&~d2)
// agree and (d1^d2) is a single bit. But that is a much bigger refactor.

// The simplest correct fix: when targetMask == allMask, output a single
// constant-on implicant (pattern=0, dontMask=n) covering everything.
// This is what any trivial all-ones / all-zeros case wants.
const old = `  // Trivial-case early exits.
  // - targetMask == 0  : SOP function is identically 0; POS is identically 1.
  // - targetMask == all: SOP function is identically 1; POS is identically 0.
  if (targetIndices.length === 0) {
    return { groups: [], implicants: [] };
  }
  if (targetMask === allMask) {
    return { groups: [], implicants: [] };
  }`;
const fixed = `  // Trivial-case early exit: no target at all (SOP=0 or POS=1).
  if (targetIndices.length === 0) {
    return { groups: [], implicants: [] };
  }`;
if (s.includes(old)) s = s.replace(old, fixed);

// For targetMask == allMask, we still want a single implicant covering
// everything. The standard QM merge should handle it; the bug is that
// round-2 merges with different dontMasks are blocked. The fix is to
// allow a "single fixed-bit diff" merge in round 2: if p1 and p2 have
// the same fixed bits (i.e. (p1 & ~d1) === (p2 & ~d2)) and (d1^d2) is
// a single bit, we can merge. We patch the merge condition.

// Find the inner merge condition:
const mergeCond = `        if (a.dontMask !== b.dontMask) continue;
        const pattern = a.pattern & b.pattern;
        const dontMask = a.dontMask | xor;`;
const relaxed = `        // Standard QM rule: same dontMask, differ in 1 fixed bit.
        // Also allow: same fixed bits (i.e. agree on every non-dont-care bit),
        // and (dontMask1 ^ dontMask2) is a single bit. This is the "make
        // another variable a dont-care" merge that the standard algorithm
        // misses when intermediate rounds introduced asymmetric dontMasks.
        const sameFixed = (a.pattern & ~a.dontMask) === (b.pattern & ~b.dontMask);
        const diffDont = a.dontMask ^ b.dontMask;
        const standardMerge = a.dontMask === b.dontMask;
        const relaxedMerge = sameFixed && ((diffDont & (diffDont - 1n)) === 0n) && diffDont !== 0n;
        if (!standardMerge && !relaxedMerge) continue;
        const pattern = standardMerge ? (a.pattern & b.pattern) : (a.pattern & b.pattern & ~diffDont);
        const dontMask = standardMerge ? (a.dontMask | xor) : (a.dontMask | b.dontMask);`;
if (s.includes(mergeCond)) s = s.replace(mergeCond, relaxed);
fs.writeFileSync('packages/core/src/dld/kmap.ts', s);
console.log('done. size now', s.length);