// visual_helpers.mjs
// Low-level field scoring primitives for the visual benchmark.

export function scoreVec2(oracle, answer) {
  if (!oracle || !answer) return 0;
  const dx = Math.abs(oracle.x - answer.x);
  const dy = Math.abs(oracle.y - answer.y);
  const dist = Math.hypot(dx, dy);
  const ref = Math.max(Math.hypot(oracle.x, oracle.y), 1);
  return Math.max(0, 1 - dist / ref);
}

export function scoreNumber(oracle, answer) {
  if (typeof oracle !== "number" || typeof answer !== "number") return 0;
  if (oracle === 0) return answer === 0 ? 1 : 0;
  return Math.max(0, 1 - Math.abs(answer - oracle) / Math.abs(oracle));
}

export function scoreString(oracle, answer) {
  return oracle === answer ? 1 : 0;
}

export function scoreBoolean(oracle, answer) {
  return oracle === answer ? 1 : 0;
}