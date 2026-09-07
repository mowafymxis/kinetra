const fs = require('fs');
let s = fs.readFileSync('packages/core/src/dld/kmap.ts', 'utf8');

const helper = String.raw`
/**
 * Expand a prime implicant (pattern + dontMask) into the full set of
 * minterm indices it covers. Two assignments match the same implicant iff
 * they agree on every bit NOT in dontMask, and the agreed value equals
 * the corresponding bit of pattern. This is what the cover step should
 * use; the seed-combination only stores the representative cells used
 * to build the implicant, which is a strict subset.
 */
function expandImplicantMask(pattern: bigint, dontMask: bigint, totalAssignments: number): bigint {
  let m = 0n;
  const fixed = pattern & ~dontMask;
  for (let i = 0n; i < (1n << BigInt(totalAssignments)); i++) {
    if ((i & ~dontMask) === fixed) m |= 1n << i;
  }
  return m;
}
`;

if (!s.includes('expandImplicantMask')) {
  s = s.replace('// --- Implicant extraction', helper + '\n// --- Implicant extraction');
}

s = s.replace(/(\/\/ Cover step:[\s\S]*?\/\/ Build groups \+ implicants\.)/m, function (block) {
  return block.replace(/p\.mask/g, 'p.expandedMask');
});

const oldIface = `interface PrimeImplicant {
  cells: number[];      // covered minterms
  mask: bigint;         // bitmask of minterm indices
  pattern: bigint;      // bit pattern over variables where set = 1
  dontMask: bigint;     // bit pattern for "variable is dont-care"
  used: boolean;
}`;
const newIface = `interface PrimeImplicant {
  cells: number[];      // covered minterms
  mask: bigint;         // bitmask of minterm indices (representative)
  pattern: bigint;      // bit pattern over variables where set = 1
  dontMask: bigint;     // bit pattern for "variable is dont-care"
  expandedMask: bigint; // full set of all minterms matching pattern+dontMask
  used: boolean;
}`;
if (s.includes(oldIface)) s = s.replace(oldIface, newIface);

const oldPush = `primes.push({ cells: c.cells, mask: c.mask, pattern: c.pattern, dontMask: c.dontMask, used: false });`;
const newPush = `primes.push({ cells: c.cells, mask: c.mask, pattern: c.pattern, dontMask: c.dontMask, expandedMask: expandImplicantMask(c.pattern, c.dontMask, totalAssignments), used: false });`;
if (s.includes(oldPush)) s = s.replace(oldPush, newPush);

fs.writeFileSync('packages/core/src/dld/kmap.ts', s);
console.log('done. size now', s.length);