const fs = require('fs');
let s = fs.readFileSync('packages/core/test/dld/property.test.ts', 'utf8');
const old = `  for (let t = 0; t < 20; t++) {
      const realMask = BigInt(Math.floor(Math.random() * (1 << total)));
      const dontMask = BigInt(Math.floor(Math.random() * (1 << total)));
      const cleanDont = dontMask & ~realMask;
      const km = buildKMap({ variables: vars, minterms: indicesOf(realMask), dontCares: indicesOf(cleanDont) });
      const rebuilt = expressionToMask(km.simplified, km.context);
      assert.equal(rebuilt, realMask, "t=" + t + " real=" + realMask.toString(2) + " dont=" + cleanDont.toString(2));
    }`;
const fixed = `  for (let t = 0; t < 30; t++) {
      const realMask = BigInt(Math.floor(Math.random() * (1 << total)));
      const dontMask = BigInt(Math.floor(Math.random() * (1 << total)));
      const cleanDont = dontMask & ~realMask;
      const km = buildKMap({ variables: vars, minterms: indicesOf(realMask), dontCares: indicesOf(cleanDont) });
      const rebuilt = expressionToMask(km.simplified, km.context);
      // Property: simplified mask must agree with realMask on every
      // non-don't-care cell. (The don't-care cells are free.)
      const allMask = (1n << BigInt(total)) - 1n;
      const onNonDontCare = (rebuilt & ~cleanDont) === realMask;
      // Also: simplified must not force F=1 on a non-minterm, non-dont-care
      // cell. Equivalently: rebuilt \subseteq (realMask | cleanDont).
      const onlyAllowed = (rebuilt & ~(realMask | cleanDont)) === 0n;
      assert.ok(onNonDontCare && onlyAllowed,
        "t=" + t + " real=" + realMask.toString(2) + " dont=" + cleanDont.toString(2) +
        " rebuilt=" + rebuilt.toString(2) + " allMask=" + allMask.toString(2));
    }`;
if (s.includes(old)) s = s.replace(old, fixed);
fs.writeFileSync('packages/core/test/dld/property.test.ts', s);
console.log('done. size now', s.length);