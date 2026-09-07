// visual_oracle.mjs
// Oracle model objects for the visual benchmark. Each scenario defines
// an oracle (the model the LLM should produce to render the correct
// diagram) and a without_plugin (the typical bare-LLM model with the
// same error patterns the text benchmark encodes). The visual benchmark
// scores model-level field accuracy; the text benchmark scores numerical
// answers. No overlap.
// Scope: S1-S7 only. S8 (solenoid), S9 (RLC frequency response), and
// S10 (K-map with dont-cares) have no Kinetra diagram renderer.

export const VISUAL_SCENARIOS = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7'];

const S1 = {
  oracle: { initialPosition: { x: 0, y: 20 }, initialSpeed: 25, launchAngleDeg: 30, gravity: 9.81, width: 800, height: 400 },
  without_plugin: { initialPosition: { x: 0, y: 0 }, initialSpeed: 25, launchAngleDeg: 30, gravity: 9.81, width: 800, height: 400 }
};
const S2 = {
  oracle: { initialPosition: { x: 0, y: 5 }, initialSpeed: 10, launchAngleDeg: 0, gravity: 9.81, width: 800, height: 400 },
  without_plugin: { initialPosition: { x: 0, y: 5 }, initialSpeed: 10, launchAngleDeg: 0, gravity: 9.81, width: 800, height: 400 }
};
const S3 = {
  oracle: { element: { kind: 'thin-lens-converging', x: 0, y: 0, focal: 10 }, objectHeight: 5, objectBase: { x: -20, y: 0 }, world: { xMin: -30, xMax: 30, yMin: -10, yMax: 10 }, width: 600, height: 400 },
  without_plugin: { element: { kind: 'thin-lens-converging', x: 0, y: 0, focal: 10 }, objectHeight: 5, objectBase: { x: -20, y: 0 }, world: { xMin: -30, xMax: 30, yMin: -10, yMax: 10 }, width: 600, height: 400 }
};
const S4 = {
  oracle: { element: { kind: 'thin-lens-converging', x: 0, y: 0, focal: 10 }, objectHeight: 3, objectBase: { x: -5, y: 0 }, world: { xMin: -30, xMax: 30, yMin: -10, yMax: 10 }, width: 600, height: 400 },
  without_plugin: { element: { kind: 'thin-lens-converging', x: 0, y: 0, focal: 10 }, objectHeight: 3, objectBase: { x: -5, y: 0 }, world: { xMin: -30, xMax: 30, yMin: -10, yMax: 10 }, width: 600, height: 400 }
};
const S5 = {
  oracle: { element: { kind: 'concave-mirror', x: 0, y: 0, focal: 10, radius: 20 }, objectHeight: 4, objectBase: { x: -15, y: 0 }, world: { xMin: -30, xMax: 30, yMin: -10, yMax: 10 }, width: 600, height: 400 },
  without_plugin: { element: { kind: 'thin-lens-converging', x: 0, y: 0, focal: 10 }, objectHeight: 4, objectBase: { x: -15, y: 0 }, world: { xMin: -30, xMax: 30, yMin: -10, yMax: 10 }, width: 600, height: 400 }
};
const S6 = {
  oracle: {
    components: [
      { id: 'V1', kind: 'voltage-source', position: { x: 0, y: 0 }, label: 'V', unit: 'V', value: 5 },
      { id: 'R1', kind: 'resistor',       position: { x: 4, y: 0 }, label: 'R', unit: 'Ohm', value: 1000 },
      { id: 'C1', kind: 'capacitor',      position: { x: 8, y: 2 }, label: 'C', unit: 'F',  value: 1e-6 },
      { id: 'G1', kind: 'ground',         position: { x: 8, y: 4 } }
    ],
    wires: [
      { from: { componentId: 'V1', pin: 'p2' }, to: { componentId: 'G1' } },
      { from: { componentId: 'V1', pin: 'p1' }, to: { componentId: 'R1', pin: 'p1' } },
      { from: { componentId: 'R1', pin: 'p2' }, to: { componentId: 'C1', pin: 'p1' } },
      { from: { componentId: 'C1', pin: 'p2' }, to: { componentId: 'G1' } }
    ],
    world: { xMin: -1, xMax: 11, yMin: -2, yMax: 6 },
    width: 600, height: 300
  },
  without_plugin: {
    // The bare LLM draws a voltage divider (R-R) instead of an RC low-pass.
    // The C is replaced by a second resistor: a common mistake when the
    // prompt mentions "resistor" prominently. This is a different topology
    // (no capacitor at all) and the wrong circuit.
    components: [
      { id: 'V1', kind: 'voltage-source', position: { x: 0, y: 0 }, label: 'V', unit: 'V', value: 5 },
      { id: 'R1', kind: 'resistor',       position: { x: 4, y: 0 }, label: 'R', unit: 'Ohm', value: 1000 },
      { id: 'R2', kind: 'resistor',       position: { x: 8, y: 2 }, label: 'R2', unit: 'Ohm', value: 1000 },
      { id: 'G1', kind: 'ground',         position: { x: 8, y: 4 } }
    ],
    wires: [
      { from: { componentId: 'V1', pin: 'p2' }, to: { componentId: 'G1' } },
      { from: { componentId: 'V1', pin: 'p1' }, to: { componentId: 'R1', pin: 'p1' } },
      { from: { componentId: 'R1', pin: 'p2' }, to: { componentId: 'R2', pin: 'p1' } },
      { from: { componentId: 'R2', pin: 'p2' }, to: { componentId: 'G1' } }
    ],
    world: { xMin: -1, xMax: 11, yMin: -2, yMax: 6 },
    width: 600, height: 300
  }
};
const S7 = {
  oracle: {
    bodyPosition: { x: 0, y: 0 },
    bodySize: { w: 2, h: 1 },
    bodyLabel: 'm1=5kg',
    frameAngleDeg: 0,
    forces: [
      { point: { x: 0, y: 0.5 }, components: { x: 0, y: -5 * 9.81 }, magnitude: 49.05, unit: 'N', label: 'W', color: '#222' },
      { point: { x: 0, y: 0 },   components: { x: 0, y: 49.05 * Math.cos(30 * Math.PI / 180) }, magnitude: 49.05 * Math.cos(30 * Math.PI / 180), unit: 'N', label: 'N', color: '#117a3a' },
      { point: { x: 0, y: 0.5 }, components: { x: -5 * 9.81 * Math.sin(30 * Math.PI / 180), y: 0 }, magnitude: 5 * 9.81 * Math.sin(30 * Math.PI / 180), unit: 'N', label: 'Wpar', color: '#7a3a11' },
      { point: { x: 0, y: 0 },   components: { x: 4.91, y: 0 }, magnitude: 4.91, unit: 'N', label: 'f', color: '#c0392b' },
      { point: { x: 0, y: 0.5 }, components: { x: 29.43, y: 0 }, magnitude: 29.43, unit: 'N', label: 'T', color: '#1f4f8b' }
    ],
    world: { xMin: -4, xMax: 4, yMin: -2, yMax: 4 },
    width: 600, height: 400
  },
  without_plugin: {
    bodyPosition: { x: 0, y: 0 },
    bodySize: { w: 2, h: 1 },
    bodyLabel: 'm1=5kg',
    frameAngleDeg: 0,
    forces: [
      { point: { x: 0, y: 0.5 }, components: { x: 0, y: -5 * 9.81 }, magnitude: 49.05, unit: 'N', label: 'W', color: '#222' },
      { point: { x: 0, y: 0 },   components: { x: 0, y: 49.05 }, magnitude: 49.05, unit: 'N', label: 'N', color: '#117a3a' },
      { point: { x: 0, y: 0.5 }, components: { x: -5 * 9.81 * Math.sin(30 * Math.PI / 180), y: 0 }, magnitude: 5 * 9.81 * Math.sin(30 * Math.PI / 180), unit: 'N', label: 'Wpar', color: '#7a3a11' },
      { point: { x: 0, y: 0 },   components: { x: -8.50, y: 0 }, magnitude: 8.50, unit: 'N', label: 'f', color: '#c0392b' },
      { point: { x: 0, y: 0.5 }, components: { x: 31.27, y: 0 }, magnitude: 31.27, unit: 'N', label: 'T', color: '#1f4f8b' }
    ],
    world: { xMin: -4, xMax: 4, yMin: -2, yMax: 4 },
    width: 600, height: 400
  }
};

export const VISUAL_MODELS = { S1, S2, S3, S4, S5, S6, S7 };