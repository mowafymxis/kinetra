import { projectileAnalytics } from "../packages/core/src/diagram/projectile.ts";
import { lensImage } from "../packages/core/src/diagram/optics.ts";
import { newCircuit, addNode, addGround, addResistor, addCapacitor, addInductor, addVoltageSource, validateCircuit } from "../packages/core/src/circuit/circuit.ts";
import { solveDC, solveTransient } from "../packages/core/src/circuit/spice.ts";

const results = {};

// Scenario 1: Projectile from cliff
results.projectile_cliff = projectileAnalytics({
  initialPosition: { x: 0, y: 20 },
  initialSpeed: 25,
  launchAngleDeg: 30,
  gravity: 9.81,
  width: 800, height: 400
});

// Scenario 2: Projectile horizontal launch
results.projectile_horizontal = projectileAnalytics({
  initialPosition: { x: 0, y: 5 },
  initialSpeed: 10,
  launchAngleDeg: 0,
  gravity: 9.81,
  width: 800, height: 400
});

// Scenario 3: Converging lens (real image)
results.lens_converging_real = lensImage({
  element: { kind: "thin-lens-converging", x: 0, y: 0, focal: 10 },
  objectHeight: 5,
  objectBase: { x: -20, y: 0 },
  world: { xMin: -30, xMax: 30, yMin: -10, yMax: 10 },
  width: 600, height: 400
});

// Scenario 4: Converging lens (virtual image - object inside focal length)
results.lens_converging_virtual = lensImage({
  element: { kind: "thin-lens-converging", x: 0, y: 0, focal: 10 },
  objectHeight: 3,
  objectBase: { x: -5, y: 0 },
  world: { xMin: -30, xMax: 30, yMin: -10, yMax: 10 },
  width: 600, height: 400
});

// Scenario 5: Concave mirror
results.concave_mirror = lensImage({
  element: { kind: "concave-mirror", x: 0, y: 0, focal: 10, radius: 20 },
  objectHeight: 4,
  objectBase: { x: -15, y: 0 },
  world: { xMin: -30, xMax: 30, yMin: -10, yMax: 10 },
  width: 600, height: 400
});

// Scenario 6: RC low-pass step response (V_in = 5V, R=1k, C=1uF, tau=1ms).
// Topology: Vsrc -> R -> n1 -> C -> gnd. V_c(t) = 5 * (1 - exp(-t/tau)).
{
  const c = newCircuit("rc_lp");
  const nSrc = addNode(c);
  const n1 = addNode(c);
  addGround(c, 0);
  addResistor(c, nSrc, n1, 1000);
  addCapacitor(c, n1, 0, 1e-6);
  addVoltageSource(c, nSrc, 0, 5);
  validateCircuit(c);
  const tr = solveTransient(c, { startTime: 0, endTime: 0.005, dt: 1e-5, recordNodes: [n1] });
  const vOut = tr.nodeVoltages.get(n1);
  const vAtTau = vOut[Math.floor(0.001 / 1e-5)]; // V at t=tau should be ~ 5*(1-1/e) = 3.16
  const vFinal = vOut[vOut.length - 1];
  results.rc_lowpass = { vAtTau_ms: 0.001, vAtTau_actual: vAtTau, vAtTau_expected: 5 * (1 - 1 / Math.E), vFinal_actual: vFinal, vFinal_expected: 5 };
}

// Scenario 7: RL circuit (R=100, L=10mH, V=10V, tau = L/R = 0.1ms)
{
  const c = newCircuit("rl");
  const n1 = addNode(c);
  addGround(c, 0);
  addResistor(c, n1, 0, 100);
  addInductor(c, n1, 0, 0.01);
  addVoltageSource(c, n1, 0, 10);
  validateCircuit(c);
  const dc = solveDC(c);
  results.rl_steady_state = {
    i_inductor_steady: dc.componentCurrents.get([...dc.componentCurrents.keys()][0]), // placeholder
    node_voltages: Object.fromEntries(dc.nodeVoltages)
  };
}

console.log(JSON.stringify(results, null, 2));