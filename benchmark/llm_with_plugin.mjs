// "WITH PLUGIN" run: parent LLM simulates the agent that has read
// C:\Users\moham\Desktop\Vibe\Codex\Kinetra\benchmark\plugin_context.md and
// is told to use those exact formulas. We compute using the SAME formulas
// the plugin's SKILL.md documents, so this is the LLM's answer if it
// reads and follows the skill correctly.

function withPlugin_answers() {
  const out = {};

  // S1: Projectile from cliff
  // From skill: vy = v0*sin(theta); t_apex = vy/g; y_apex = y0 + vy*t_apex - 0.5*g*t_apex^2;
  // range: solve 0 = y0 + vy*t - 0.5*g*t^2 for positive root
  {
    const v0 = 25, theta = 30 * Math.PI / 180, g = 9.81, y0 = 20;
    const vx = v0 * Math.cos(theta);
    const vy = v0 * Math.sin(theta);
    const t_apex = vy / g;
    const y_apex = y0 + vy * t_apex - 0.5 * g * t_apex * t_apex;
    const a = -0.5 * g, b = vy, c = y0;
    const disc = b * b - 4 * a * c;
    const t_impact = (-b - Math.sqrt(disc)) / (2 * a);  // standard positive root
    const range = vx * t_impact;
    out.S1 = { maxHeight: +y_apex.toFixed(2), flightTime: +t_impact.toFixed(2), range: +range.toFixed(2) };
  }

  // S2: Horizontal launch
  {
    const v0 = 10, y0 = 5, g = 9.81;
    // horizontal -> vy = 0, so fall under gravity
    // 0 = y0 - 0.5*g*t^2  =>  t = sqrt(2*y0/g)
    const t = Math.sqrt(2 * y0 / g);
    const range = v0 * t;
    out.S2 = { flightTime: +t.toFixed(2), range: +range.toFixed(2) };
  }

  // S3: Converging lens, real image
  // u = element.x - objectBase.x = 0 - (-20) = 20; f = 10
  // 1/v = 1/f - 1/u = 0.1 - 0.05 = 0.05 => v = 20
  // mag = -v/u = -1; imageHeight = -5
  {
    const u = 20, f = 10, h_obj = 5;
    const v = 1 / (1 / f - 1 / u);
    const mag = -v / u;
    const imageHeight = mag * h_obj;
    const imageBaseX = 0 + v;  // element at x=0
    out.S3 = { imageBaseX: +imageBaseX.toFixed(2), imageHeight: +imageHeight.toFixed(2), magnification: +mag.toFixed(2) };
  }

  // S4: Object inside focal length - virtual image
  {
    const u = 5, f = 10, h_obj = 3;
    const v = 1 / (1 / f - 1 / u);  // 1/10 - 1/5 = -0.1, v = -10
    const mag = -v / u;  // 10/5 = 2
    const imageHeight = mag * h_obj;  // 6
    const imageBaseX = 0 + v;  // -10
    out.S4 = { imageBaseX: +imageBaseX.toFixed(2), imageHeight: +imageHeight.toFixed(2), magnification: +mag.toFixed(2) };
  }

  // S5: Concave mirror
  {
    const u = 15, f = 10, h_obj = 4;
    const v = 1 / (1 / f - 1 / u);
    const mag = -v / u;
    const imageHeight = mag * h_obj;
    const imageBaseX = 0 + v;
    out.S5 = { imageBaseX: +imageBaseX.toFixed(2), imageHeight: +imageHeight.toFixed(2), magnification: +mag.toFixed(2) };
  }

  // S6: RC low-pass step response
  {
    const R = 1000, C = 1e-6, V = 5;
    const tau = R * C;
    const vAtTau = V * (1 - 1 / Math.E);
    out.S6 = { tau_ms: tau * 1000, vAtTau: +vAtTau.toFixed(2) };
  }

  return out;
}

console.log(JSON.stringify(withPlugin_answers(), null, 2));