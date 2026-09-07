// visual_scoring.mjs
// Per-scenario visual scoring for the Kinetra benchmark.
//
// Scoring model: scenario-specific. The visual benchmark scores the model
// fields the LLM produces for each diagram type. Per scenario we identify
// the load-bearing fields (those whose mismatch produces a wrong diagram)
// and weight them heavily. Ambient fields (labels, viewport, dimensions)
// contribute a smaller amount.
//
// Per scenario:
//   - per_scenario_score in [0, 1].
//   - overall = mean(per_scenario_score).
//
// This is structurally similar to the text harness (per-scenario mean
// then overall mean) but the field-level logic is custom because the
// model schemas are different per diagram family.

import { scoreVec2, scoreNumber, scoreString } from "./visual_helpers.mjs";

// ---------------- Projectile (S1, S2) ----------------
//
// Load-bearing field: initialPosition. The y-coordinate encodes the
// cliff height (S1) or the launch height (S2). Other fields are
// usually correct on the bare LLM, so dropping the y term is the
// canonical mistake for S1.
//
// We weight initialPosition 80% of the score. The remaining 20% is
// initialSpeed / launchAngleDeg / gravity (these are usually right
// even on the bare LLM because they appear verbatim in the prompt).
export function scoreProjectileModel(oracle, answer) {
  const ip = scoreVec2(oracle.initialPosition, answer.initialPosition);
  const v  = scoreNumber(oracle.initialSpeed, answer.initialSpeed);
  const a  = scoreNumber(oracle.launchAngleDeg, answer.launchAngleDeg);
  const g  = scoreNumber(oracle.gravity, answer.gravity);
  return 0.80 * ip + 0.10 * v + 0.05 * a + 0.05 * g;
}

// ---------------- Optics (S3, S4, S5) ----------------
//
// Load-bearing field: element.kind. S5 (concave mirror vs lens) is
// the canonical visual error: the bare LLM writes element.kind =
// 'thin-lens-converging' when it should be 'concave-mirror'. Even
// though the lens formula and the mirror formula give numerically
// similar answers in some cases, the visual diagram is different
// (lens shape vs arc, principal axis conventions).
//
// We weight element.kind 70% of the score. focal/objectBase get 20%.
// objectHeight 5%. world 5%.
export function scoreOpticsModel(oracle, answer) {
  const kind = scoreString(oracle.element.kind, answer.element.kind);
  const focal = scoreNumber(oracle.element.focal, answer.element.focal);
  const objBase = scoreVec2(oracle.objectBase, answer.objectBase);
  const objH = scoreNumber(oracle.objectHeight, answer.objectHeight);
  return 0.70 * kind + 0.10 * focal + 0.10 * objBase + 0.05 * objH + 0.05;
}

// ---------------- Schematic (S6) ----------------
//
// Load-bearing field: each component's kind AND position. The
// canonical S6 error is the bare LLM putting the capacitor in series
// rather than shunt (same y as the resistor instead of a different
// y to drop to ground). We score per-component with a 60% weight
// on (kind, position) and 20% on value. Then the wire topology is
// scored separately.
//
// The wires encode the netlist. If the topology is wrong (e.g.
// capacitor in series), the bare LLM's wires will have a different
// path-to-ground pattern. We compare wires as a set: each oracle
// wire must have a matching answer wire.
//
// Weights: 60% component correctness, 40% wire topology.
export function scoreSchematicModel(oracle, answer) {
  const componentScores = [];
  for (const oc of oracle.components) {
    const ac = answer.components.find((c) => c.id === oc.id);
    if (!ac) { componentScores.push(0); continue; }
    const kindScore = scoreString(oc.kind, ac.kind);
    const posScore = scoreVec2(oc.position, ac.position);
    let valScore = 1;
    if (typeof oc.value === "number" && typeof ac.value === "number") {
      valScore = scoreNumber(oc.value, ac.value);
    }
    componentScores.push(0.5 * kindScore + 0.4 * posScore + 0.1 * valScore);
  }
  const compMean = componentScores.length === 0 ? 1 :
    componentScores.reduce((a, b) => a + b, 0) / componentScores.length;
  // Wire set comparison: every oracle wire must have an exact-match
  // answer wire. Order does not matter.
  const oracleWires = oracle.wires.map((w) => JSON.stringify(w)).sort();
  const answerWires = answer.wires.map((w) => JSON.stringify(w)).sort();
  const sameLen = oracleWires.length === answerWires.length;
  let wireMatch = 1;
  if (!sameLen) {
    wireMatch = 0;
  } else {
    for (let i = 0; i < oracleWires.length; i++) {
      if (oracleWires[i] !== answerWires[i]) { wireMatch = 0; break; }
    }
  }
  return 0.6 * compMean + 0.4 * wireMatch;
}

// ---------------- Free-body (S7) ----------------
//
// Load-bearing fields: each force's components (the vector) and
// magnitude. The canonical S7 errors are:
//   1. friction sign-flipped (kinetic vs static)
//   2. normal force missing cos(theta) factor
//   3. tension off because friction is wrong
// We score per force with 70% weight on components (vector), 20%
// on magnitude, 10% on label. The application point and ambient
// fields contribute 10% overall.
export function scoreFBDModel(oracle, answer) {
  const forceScores = [];
  for (const oforce of oracle.forces) {
    const aforce = answer.forces.find((f) => f.label === oforce.label);
    if (!aforce) { forceScores.push(0); continue; }
    const labelScore = scoreString(oforce.label, aforce.label);
    const compScore = scoreVec2(oforce.components, aforce.components);
    const magScore = scoreNumber(oforce.magnitude, aforce.magnitude);
    forceScores.push(0.10 * labelScore + 0.70 * compScore + 0.20 * magScore);
  }
  const forceMean = forceScores.length === 0 ? 1 :
    forceScores.reduce((a, b) => a + b, 0) / forceScores.length;
  // Ambient field score.
  const ambient = (
    scoreString(oracle.bodyLabel, answer.bodyLabel) +
    scoreNumber(oracle.frameAngleDeg, answer.frameAngleDeg)
  ) / 2;
  return 0.90 * forceMean + 0.10 * ambient;
}

export const SCENARIO_SCORERS = {
  S1: scoreProjectileModel,
  S2: scoreProjectileModel,
  S3: scoreOpticsModel,
  S4: scoreOpticsModel,
  S5: scoreOpticsModel,
  S6: scoreSchematicModel,
  S7: scoreFBDModel
};