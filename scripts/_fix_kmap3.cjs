const fs = require('fs');
let s = fs.readFileSync('packages/core/src/dld/kmap.ts', 'utf8');
const old = `  if (targetIndices.length === 0) {
    return { groups: [], implicants: [] };
  }`;
const fixed = `  // Trivial-case early exits.
  // - targetMask == 0  : SOP function is identically 0; POS is identically 1.
  // - targetMask == all: SOP function is identically 1; POS is identically 0.
  if (targetIndices.length === 0) {
    return { groups: [], implicants: [] };
  }
  if (targetMask === allMask) {
    return { groups: [], implicants: [] };
  }`;
if (s.includes(old)) s = s.replace(old, fixed);

// And in buildKMap, when implicants.length === 0, the constant depends on form:
// SOP: implicants empty -> constant 0 (correct).
// POS: implicants empty means targetMask == 0 (zeros empty -> F=1) or
//      targetMask == all (zeros everywhere -> F=0). Need to disambiguate.
// The cleanest fix: pass the actual mask back so buildKMap can choose.
// We'll add a `trivial` flag.
const oldBuild = `  const form = spec.form ?? "sop";
  const { groups, implicants } = minimize(spec.variables, mintermMask, dontCareMask, form);
  const simplified = implicants.length === 0
    ? (form === "sop" ? constant(0) : constant(1))
    : form === "sop"
      ? or(...implicants)
      : and(...implicants);`;
const newBuild = `  const form = spec.form ?? "sop";
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
if (s.includes(oldBuild)) s = s.replace(oldBuild, newBuild);

fs.writeFileSync('packages/core/src/dld/kmap.ts', s);
console.log('done. size now', s.length);