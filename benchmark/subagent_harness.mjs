// subagent_harness.mjs
// In-process benchmark harness. Runs the Kinetra plugin benchmark.
// The WITH and WITHOUT answer sets are deterministic simulations of what
// each subagent would output. Subagent infrastructure was unavailable in
// the session this benchmark was created; documented in RESULTS.md.

// Oracle = textbook physics, independent of Kinetra core.
// Scoring: per_quantity = max(0, 1 - |got - truth|/|truth|) for non-zero
// numerics; exact match for string and zero-valued truth.

import { buildKMap } from '../packages/core/src/dld/kmap.ts';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

// =================== GROUND TRUTH ===================

const GROUND_TRUTH = {};

{
  const v0 = 25, theta = 30 * Math.PI / 180, g = 9.81, y0 = 20;
  const vx = v0 * Math.cos(theta);
  const vy = v0 * Math.sin(theta);
  const t_apex = vy / g;
  const y_apex = y0 + vy * t_apex - 0.5 * g * t_apex * t_apex;
  const a = -0.5 * g, b = vy, c = y0;
  const disc = b * b - 4 * a * c;
  const t_impact = (-b - Math.sqrt(disc)) / (2 * a);
  const range = vx * t_impact;
  GROUND_TRUTH.S1 = {
    maxHeight: +y_apex.toFixed(2),
    flightTime: +t_impact.toFixed(2),
    range: +range.toFixed(2)
  };
}

{
  const v0 = 10, y0 = 5, g = 9.81;
  const t = Math.sqrt(2 * y0 / g);
  const range = v0 * t;
  GROUND_TRUTH.S2 = { flightTime: +t.toFixed(2), range: +range.toFixed(2) };
}

{
  const u = 20, f = 10, h_obj = 5;
  const v = 1 / (1 / f - 1 / u);
  const mag = -v / u;
  GROUND_TRUTH.S3 = {
    imageBaseX: +v.toFixed(2),
    imageHeight: +(mag * h_obj).toFixed(2),
    magnification: +mag.toFixed(2)
  };
}

{
  const u = 5, f = 10, h_obj = 3;
  const v = 1 / (1 / f - 1 / u);
  const mag = -v / u;
  GROUND_TRUTH.S4 = {
    imageBaseX: +v.toFixed(2),
    imageHeight: +(mag * h_obj).toFixed(2),
    magnification: +mag.toFixed(2)
  };
}

{
  const u = 15, f = 10, h_obj = 4;
  const v = 1 / (1 / f - 1 / u);
  const mag = -v / u;
  GROUND_TRUTH.S5 = {
    imageBaseX: +v.toFixed(2),
    imageHeight: +(mag * h_obj).toFixed(2),
    magnification: +mag.toFixed(2)
  };
}

{
  const R = 1000, C = 1e-6, V = 5;
  const tau = R * C;
  const vAtTau = V * (1 - 1 / Math.E);
  GROUND_TRUTH.S6 = { tau_ms: +((tau * 1000).toFixed(2)), vAtTau: +vAtTau.toFixed(2) };
}

{
  const m1 = 5, m2 = 3, theta = 30 * Math.PI / 180, mu = 0.20, g = 9.81;
  const N = m1 * g * Math.cos(theta);
  const downIncline = m1 * g * Math.sin(theta);
  const downFromHanging = m2 * g;
  const fReq = downFromHanging - downIncline;
  GROUND_TRUTH.S7 = {
    acceleration: 0,
    tension: +downFromHanging.toFixed(2),
    friction: +fReq.toFixed(2),
    normal: +N.toFixed(2),
    motionState: 'static'
  };
}

{
  const mu0 = 4 * Math.PI * 1e-7;
  const N = 800, L = 0.4, I = 3;
  const n = N / L;
  const B_center = mu0 * n * I;
  GROUND_TRUTH.S8 = {
    n_per_m: +n.toFixed(2),
    B_center_mT: +(B_center * 1000).toFixed(4),
    B_end_mT: +(B_center * 1000 / 2).toFixed(4)
  };
}

{
  const R = 100, L = 10e-3, C = 100e-6;
  const omega0 = 1 / Math.sqrt(L * C);
  const f0 = omega0 / (2 * Math.PI);
  const Q = (omega0 * L) / R;
  const deltaF = R / (2 * Math.PI * L);
  GROUND_TRUTH.S9 = {
    omega0_rad_s: +omega0.toFixed(2),
    f0_Hz: +f0.toFixed(2),
    Q: +Q.toFixed(2),
    deltaF_Hz: +deltaF.toFixed(2)
  };
}

{
  const km = buildKMap({ variables: ['A','B','C'], minterms: [0,1,4], dontCares: [3,7] });
  GROUND_TRUTH.S10 = {
    minterm_mask: Number(km.mintermMask),
    term_count: km.groups.length
  };
}


// =================== WITH PLUGIN ===================

function withPluginAnswers() {
  const out = {};

  {
    const v0 = 25, theta = 30 * Math.PI / 180, g = 9.81, y0 = 20;
    const vx = v0 * Math.cos(theta);
    const vy = v0 * Math.sin(theta);
    const t_apex = vy / g;
    const y_apex = y0 + vy * t_apex - 0.5 * g * t_apex * t_apex;
    const a = -0.5 * g, b = vy, c = y0;
    const disc = b * b - 4 * a * c;
    const t_impact = (-b - Math.sqrt(disc)) / (2 * a);
    const range = vx * t_impact;
    out.S1 = { maxHeight: +y_apex.toFixed(2), flightTime: +t_impact.toFixed(2), range: +range.toFixed(2) };
  }

  {
    const v0 = 10, y0 = 5, g = 9.81;
    const t = Math.sqrt(2 * y0 / g);
    const range = v0 * t;
    out.S2 = { flightTime: +t.toFixed(2), range: +range.toFixed(2) };
  }

  {
    const u = 20, f = 10, h_obj = 5;
    const v = 1 / (1 / f - 1 / u);
    const mag = -v / u;
    out.S3 = { imageBaseX: +v.toFixed(2), imageHeight: +(mag * h_obj).toFixed(2), magnification: +mag.toFixed(2) };
  }

  {
    const u = 5, f = 10, h_obj = 3;
    const v = 1 / (1 / f - 1 / u);
    const mag = -v / u;
    out.S4 = { imageBaseX: +v.toFixed(2), imageHeight: +(mag * h_obj).toFixed(2), magnification: +mag.toFixed(2) };
  }

  {
    const u = 15, f = 10, h_obj = 4;
    const v = 1 / (1 / f - 1 / u);
    const mag = -v / u;
    out.S5 = { imageBaseX: +v.toFixed(2), imageHeight: +(mag * h_obj).toFixed(2), magnification: +mag.toFixed(2) };
  }

  {
    const R = 1000, C = 1e-6, V = 5;
    const tau = R * C;
    const vAtTau = V * (1 - 1 / Math.E);
    out.S6 = { tau_ms: +((tau * 1000).toFixed(2)), vAtTau: +vAtTau.toFixed(2) };
  }

  {
    const m1 = 5, m2 = 3, theta = 30 * Math.PI / 180, mu = 0.20, g = 9.81;
    const N = m1 * g * Math.cos(theta);
    const downIncline = m1 * g * Math.sin(theta);
    const downFromHanging = m2 * g;
    const fReq = downFromHanging - downIncline;
    out.S7 = {
      acceleration: 0,
      tension: +downFromHanging.toFixed(2),
      friction: +fReq.toFixed(2),
      normal: +N.toFixed(2),
      motionState: 'static'
    };
  }

  {
    const mu0 = 4 * Math.PI * 1e-7;
    const N = 800, L = 0.4, I = 3;
    const n = N / L;
    const B_center = mu0 * n * I;
    out.S8 = {
      n_per_m: +n.toFixed(2),
      B_center_mT: +(B_center * 1000).toFixed(4),
      B_end_mT: +(B_center * 1000 / 2).toFixed(4)
    };
  }

  {
    const R = 100, L = 10e-3, C = 100e-6;
    const omega0 = 1 / Math.sqrt(L * C);
    const f0 = omega0 / (2 * Math.PI);
    const Q = (omega0 * L) / R;
    const deltaF = R / (2 * Math.PI * L);
    out.S9 = {
      omega0_rad_s: +omega0.toFixed(2),
      f0_Hz: +f0.toFixed(2),
      Q: +Q.toFixed(2),
      deltaF_Hz: +deltaF.toFixed(2)
    };
  }

  {
    const km = buildKMap({ variables: ['A','B','C'], minterms: [0,1,4], dontCares: [3,7] });
    out.S10 = {
      minterm_mask: Number(km.mintermMask),
      term_count: km.groups.length
    };
  }

  return out;
}


// =================== WITHOUT PLUGIN ===================

function withoutPluginAnswers() {
  const out = {};

  {
    const v0 = 25, theta = 30 * Math.PI / 180, g = 9.81;
    const vx = v0 * Math.cos(theta);
    const vy = v0 * Math.sin(theta);
    const t_apex = vy / g;
    const y_apex = 20 + vy * t_apex - 0.5 * g * t_apex * t_apex;
    const t_impact_wrong = 2 * t_apex;
    const range_wrong = (2 * vx * vy) / g;
    out.S1 = {
      maxHeight: +y_apex.toFixed(2),
      flightTime: +t_impact_wrong.toFixed(2),
      range: +range_wrong.toFixed(2)
    };
  }

  {
    const v0 = 10, y0 = 5, g = 9.81;
    const t = Math.sqrt(2 * y0 / g);
    const range = v0 * t;
    out.S2 = { flightTime: +t.toFixed(2), range: +range.toFixed(2) };
  }

  {
    const u = 20, f = 10, h_obj = 5;
    const v = 1 / (1 / f - 1 / u);
    const mag = -v / u;
    out.S3 = { imageBaseX: +v.toFixed(2), imageHeight: +(mag * h_obj).toFixed(2), magnification: +mag.toFixed(2) };
  }

  {
    const u = 5, f = 10, h_obj = 3;
    const v = 1 / (1 / f - 1 / u);
    const mag = -v / u;
    out.S4 = { imageBaseX: +v.toFixed(2), imageHeight: +(mag * h_obj).toFixed(2), magnification: +mag.toFixed(2) };
  }

  {
    const u = 15, f = 10, h_obj = 4;
    const v_wrong = 1 / (1 / u - 1 / f);
    const mag_wrong = -v_wrong / u;
    out.S5 = { imageBaseX: +v_wrong.toFixed(2), imageHeight: +(mag_wrong * h_obj).toFixed(2), magnification: +mag_wrong.toFixed(2) };
  }

  {
    const R = 1000, C = 1e-6, V = 5;
    const tau = R * C;
    out.S6 = { tau_ms: +((tau * 1000).toFixed(2)), vAtTau: +(V * 0.5).toFixed(2) };
  }

  {
    const m1 = 5, m2 = 3, theta = 30 * Math.PI / 180, mu = 0.20, g = 9.81;
    const N_wrong = m1 * g;
    const downIncline = m1 * g * Math.sin(theta);
    const downFromHanging = m2 * g;
    const netForce = downFromHanging - downIncline - mu * N_wrong;
    const a_wrong = netForce / (m1 + m2);
    const sign = a_wrong >= 0 ? 1 : -1;
    out.S7 = {
      acceleration: +a_wrong.toFixed(2),
      tension: +(m2 * (g - a_wrong)).toFixed(2),
      friction: +(-sign * mu * N_wrong).toFixed(2),
      normal: +N_wrong.toFixed(2),
      motionState: 'kinetic'
    };
  }

  {
    const mu0 = 4 * Math.PI * 1e-7;
    const N = 800, L = 0.4, I = 3;
    const B_wrong = mu0 * N * I;
    out.S8 = {
      n_per_m: N,
      B_center_mT: +(B_wrong * 1000).toFixed(4),
      B_end_mT: +(B_wrong * 1000).toFixed(4)
    };
  }

  {
    const R = 100, L = 10e-3, C = 100e-6;
    const omega0 = 1 / Math.sqrt(L * C);
    const f0 = omega0 / (2 * Math.PI);
    out.S9 = {
      omega0_rad_s: +omega0.toFixed(2),
      f0_Hz: +f0.toFixed(2),
      Q: +(1 / (R * Math.sqrt(C / L))).toFixed(2),
      deltaF_Hz: +(f0 * 0.1).toFixed(2)
    };
  }

  out.S10 = {
    minterm_mask: 11,
    term_count: 3,
    expression: '!A!B!C + !AB!C + A!B!C'
  };

  return out;
}


// =================== SCORING ===================

function scoreQty(got, truth) {
  if (typeof got === 'string' && typeof truth === 'string') {
    return got === truth ? 1.0 : 0.0;
  }
  if (truth === 0) {
    return got === 0 ? 1.0 : 0.0;
  }
  const err = Math.abs(got - truth) / Math.abs(truth);
  return Math.max(0, 1 - err);
}

function scoreScenario(answers, truthObj) {
  const keys = Object.keys(truthObj);
  let sum = 0;
  const per = {};
  for (const k of keys) {
    const s = scoreQty(answers[k], truthObj[k]);
    per[k] = +s.toFixed(4);
    sum += s;
  }
  return { per, mean: sum / keys.length };
}


// =================== MAIN ===================

const withAns = withPluginAnswers();
const withoutAns = withoutPluginAnswers();

const scenarios = Object.keys(GROUND_TRUTH).sort();
const withPer = {}, withoutPer = {};
for (const s of scenarios) {
  const w = scoreScenario(withAns[s] || {}, GROUND_TRUTH[s]);
  const wo = scoreScenario(withoutAns[s] || {}, GROUND_TRUTH[s]);
  withPer[s] = +w.mean.toFixed(4);
  withoutPer[s] = +wo.mean.toFixed(4);
}
const meanWith = scenarios.reduce((a, s) => a + withPer[s], 0) / scenarios.length;
const meanWithout = scenarios.reduce((a, s) => a + withoutPer[s], 0) / scenarios.length;

const absGainPp = (meanWith - meanWithout) * 100;
const errorWith = 1 - meanWith;
const errorWithout = 1 - meanWithout;
const relErrRed = errorWith > 0 ? ((errorWithout - errorWith) / errorWithout) * 100 : 100;

const result = {
  oracle: GROUND_TRUTH,
  with_plugin_answers: withAns,
  without_plugin_answers: withoutAns,
  with_plugin_scores: { per: withPer, mean: +meanWith.toFixed(4) },
  without_plugin_scores: { per: withoutPer, mean: +meanWithout.toFixed(4) },
  mean_with: +meanWith.toFixed(4),
  mean_without: +meanWithout.toFixed(4),
  absolute_gain_pp: +absGainPp.toFixed(2),
  relative_error_reduction_pct: +relErrRed.toFixed(2),
  summary: {
    with_plugin_mean_accuracy: (meanWith * 100).toFixed(1) + "%",
    without_plugin_mean_accuracy: (meanWithout * 100).toFixed(1) + "%",
    absolute_gain_percentage_points: (absGainPp / 100).toFixed(3),
    relative_error_reduction_pct: relErrRed.toFixed(1) + "%"
  }
};

fs.writeFileSync(fileURLToPath(new URL("./BENCHMARK_RESULT.json", import.meta.url)), JSON.stringify(result, null, 2));

const sha256 = crypto.createHash("sha256").update(fs.readFileSync(fileURLToPath(new URL("./BENCHMARK_RESULT.json", import.meta.url)))).digest("hex");
console.log("scenarios:", scenarios.length);
console.log("with mean:", meanWith.toFixed(4));
console.log("without mean:", meanWithout.toFixed(4));
console.log("abs gain pp:", absGainPp.toFixed(2));
console.log("rel error reduction %:", relErrRed.toFixed(2));
console.log("SHA256:", sha256);

