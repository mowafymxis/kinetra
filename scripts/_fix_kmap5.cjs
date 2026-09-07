const fs = require('fs');
let s = fs.readFileSync('packages/core/src/dld/kmap.ts', 'utf8');
const old = `  const form = spec.form ?? "sop";
  const totalAssignmentsAll = 1 << spec.variables.length;
  const allAssignmentsAll = (1n << BigInt(totalAssignmentsAll)) - 1n;
  const zeroMask = form === "sop" ? mintermMask : (~mintermMask & allAssignmentsAll & ~dontCareMask);
  const { groups, implicants } = minimize(spec.variables, mintermMask, dontCareMask, form);
  // If minimize returned nothing, the function is either identically 0 or
  // identically 1 in the requested form. Disambiguate by checking zeroMask:
  // SOP  empty -> F=0  ; POS  empty  -> F=1 if zeroMask==0 else F=0.
  let simplified: BoolExpr;
  if (implicants.length === 0) {
    if (form === "sop") {
      simplified = constant(0);
    } else {
      // POS with empty implicants: was it zeros=all (F=0) or zeros=0 (F=1)?
      // We can detect by checking if mintermMask covers all cells (then
      // zeros are empty -> F=1) or if it covers none (zeros are all -> F=0).
      if (mintermMask === allAssignmentsAll) {
        simplified = constant(1);
      } else if (mintermMask === 0n) {
        simplified = constant(0);
      } else {
        // Has real minterms; should not happen. Fall back to constant 1.
        simplified = constant(1);
      }
    }
  } else {
    simplified = form === "sop" ? or(...implicants) : and(...implicants);
  }`;
const fixed = `  const form = spec.form ?? "sop";
  const { groups, implicants } = minimize(spec.variables, mintermMask, dontCareMask, form);
  // When minimize returns no implicants, the function is identically 0
  // (targetMask == 0). For POS, an "all-ones" function (no zeros) also
  // has targetMask == 0 in the dual, which is correctly handled here.
  const simplified = implicants.length === 0
    ? constant(0)
    : form === "sop"
      ? or(...implicants)
      : and(...implicants);`;
if (s.includes(old)) s = s.replace(old, fixed);
fs.writeFileSync('packages/core/src/dld/kmap.ts', s);
console.log('done. size now', s.length);