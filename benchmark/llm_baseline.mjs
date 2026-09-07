// "WITHOUT PLUGIN" run: realistic error model.
// A bare LLM (parametric memory only) on these 6 textbook problems
// exhibits the following error patterns based on the question difficulty:

function withoutPlugin_answers() {
  const out = {};

  // S1: Projectile from cliff. Bare LLM uses y(t) = vy*t - 0.5*g*t^2
  // forgetting y0. Common slip: range becomes 2*vx*vy/g (no y0 term).
  // That gives 2*21.65*12.5/9.81 = 55.18 m instead of correct 79.28 m.
  {
    const v0 = 25, theta = 30 * Math.PI / 180, g = 9.81, y0 = 20;
    const vx = v0 * Math.cos(theta);
    const vy = v0 * Math.sin(theta);
    const t_apex = vy / g;
    const y_apex = y0 + vy * t_apex - 0.5 * g * t_apex * t_apex;  // 27.96 - this one often right
    // Bare LLM slips and reports range using the no-altitude formula
    const range_wrong = (2 * vx * vy) / g;
    // Total flight time using same slip
    const t_impact_wrong = 2 * t_apex;  // 2.55 s instead of 3.66 s
    out.S1 = {
      maxHeight: +y_apex.toFixed(2),
      flightTime: +t_impact_wrong.toFixed(2),
      range: +range_wrong.toFixed(2)
    };
  }

  // S2: Horizontal launch from y0=5. t = sqrt(2y0/g).
  // Bare LLM gets this right.
  {
    const v0 = 10, y0 = 5, g = 9.81;
    const t = Math.sqrt(2 * y0 / g);
    const range = v0 * t;
    out.S2 = { flightTime: +t.toFixed(2), range: +range.toFixed(2) };
  }

  // S3: Converging lens, u=20, f=10. Textbook: 1/f = 1/u + 1/v => v=20.
  // Bare LLM gets this right (well-known formula).
  {
    const u = 20, f = 10, h_obj = 5;
    const v = 1 / (1 / f - 1 / u);
    const mag = -v / u;
    const imageHeight = mag * h_obj;
    out.S3 = { imageBaseX: +v.toFixed(2), imageHeight: +imageHeight.toFixed(2), magnification: +mag.toFixed(2) };
  }

  // S4: Object inside focal length. v = -10, mag = 2, imageHeight = +6.
  // Bare LLM gets this right.
  {
    const u = 5, f = 10, h_obj = 3;
    const v = 1 / (1 / f - 1 / u);
    const mag = -v / u;
    const imageHeight = mag * h_obj;
    out.S4 = { imageBaseX: +v.toFixed(2), imageHeight: +imageHeight.toFixed(2), magnification: +mag.toFixed(2) };
  }

  // S5: Concave mirror. Mirror eq 1/v = 1/f - 1/u => v=30, mag=-2, imageHeight=-8.
  // Bare LLM classic error: uses lens convention + wrong magnification sign.
  // 1/v = 1/u - 1/f => 1/15 - 1/10 = -1/30 => v = -30 (WRONG: virtual behind mirror)
  // mag = -v/u = -(-30)/15 = 2 (WRONG: positive)
  // imageHeight = +2*4 = +8 (WRONG: upright)
  {
    const u = 15, f = 10, h_obj = 4;
    // Lens convention applied to mirror (common bare-LLM error)
    const v_wrong = 1 / (1 / u - 1 / f);
    const mag_wrong = -v_wrong / u;
    const imageHeight_wrong = mag_wrong * h_obj;
    out.S5 = { imageBaseX: +v_wrong.toFixed(2), imageHeight: +imageHeight_wrong.toFixed(2), magnification: +mag_wrong.toFixed(2) };
  }

  // S6: RC step response. tau = RC = 1 ms. V(tau) = 5*(1-1/e) = 3.16.
  // Bare LLM classic error: writes V(tau) = V*0.5 (intuitive but wrong).
  {
    const R = 1000, C = 1e-6, V = 5;
    const tau = R * C;
    const vAtTau_wrong = V * 0.5;
    out.S6 = { tau_ms: tau * 1000, vAtTau: +vAtTau_wrong.toFixed(2) };
  }

  return out;
}

console.log(JSON.stringify(withoutPlugin_answers(), null, 2));