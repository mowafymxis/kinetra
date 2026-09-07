import { VISUAL_MODELS } from "./visual_oracle.mjs";
import { renderSchematic } from "../packages/core/src/diagram/circuit_schematic.ts";
const svg = renderSchematic(VISUAL_MODELS.S6.oracle);
console.log(svg);
