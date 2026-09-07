import { VISUAL_MODELS } from "./visual_oracle.mjs";
import { renderProjectile } from "../packages/core/src/diagram/projectile.ts";
import { renderOptics } from "../packages/core/src/diagram/optics.ts";
import { renderSchematic } from "../packages/core/src/diagram/circuit_schematic.ts";
import { renderFBD } from "../packages/core/src/diagram/freebody.ts";
import { renderVectorField, renderScalarField } from "../packages/core/src/diagram/fields.ts";
import { renderPulley } from "../packages/core/src/diagram/pulley.ts";
import { renderLogicSchematic } from "../packages/core/src/diagram/logic_schematic.ts";
import { EXTRA_SCENARIOS } from "./visual_oracle_extra.mjs";


function parseShapes(svg) {
  const wm = svg.match(/viewBox="0 0 (\d+(?:\.\d+)?) (\d+(?:\.\d+)?)"/);
  const width = wm ? parseFloat(wm[1]) : 600;
  const height = wm ? parseFloat(wm[2]) : 400;
  const shapes = [];
  for (const m of svg.matchAll(/<text\s+x="([^"]+)"\s+y="([^"]+)"[^>]*font-size="([^"]+)"[^>]*text-anchor="([^"]+)"[^>]*>([^<]*)<\/text>/g)) {
    const x = parseFloat(m[1]); const y = parseFloat(m[2]); const size = parseFloat(m[3]); const anchor = m[4]; const t = m[5].trim();
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    const w = (t.length || 1) * size * 0.62;
    const h = size * 1.15;
    let left = x;
    if (anchor === "middle") left = x - w / 2;
    else if (anchor === "end") left = x - w;
    const top = y - size * 0.85;
    shapes.push({ kind: "text", label: t, bbox: { x: left, y: top, w, h } });
  }
  for (const m of svg.matchAll(/<rect\s+x="([^"]+)"\s+y="([^"]+)"\s+width="([^"]+)"\s+height="([^"]+)"[^>]*>/g)) {
    const x = parseFloat(m[1]); const y = parseFloat(m[2]); const w = parseFloat(m[3]); const h = parseFloat(m[4]);
    if ([x,y,w,h].some((v) => !Number.isFinite(v))) continue;
    const tagStr = m[0];
    // Skip background rect: covers the entire viewport with no fill in <g>
    if (x === 0 && y === 0 && w >= width - 1 && h >= height - 1) continue;
    // Skip label backdrops (white fill rects sized to match text bbox).
    const fillM = tagStr.match(/fill="([^"]+)"/);
    if (fillM && (fillM[1].toLowerCase() === "#ffffff" || fillM[1].toLowerCase() === "white")) continue;
    shapes.push({ kind: "rect", bbox: { x, y, w, h } });
  }
  for (const m of svg.matchAll(/<circle\s+cx="([^"]+)"\s+cy="([^"]+)"\s+r="([^"]+)"[^>]*>/g)) {
    const cx = parseFloat(m[1]); const cy = parseFloat(m[2]); const r = parseFloat(m[3]);
    if ([cx,cy,r].some((v) => !Number.isFinite(v))) continue;
    shapes.push({ kind: "circle", bbox: { x: cx - r, y: cy - r, w: 2 * r, h: 2 * r } });
  }
  for (const m of svg.matchAll(/<line\s+x1="([^"]+)"\s+y1="([^"]+)"\s+x2="([^"]+)"\s+y2="([^"]+)"[^>]*>/g)) {
    const x1 = parseFloat(m[1]); const y1 = parseFloat(m[2]); const x2 = parseFloat(m[3]); const y2 = parseFloat(m[4]);
    if ([x1,y1,x2,y2].some((v) => !Number.isFinite(v))) continue;
    // Skip grid lines (light grey #eee or #f0f0f0); these are reference
    // guides that labels intentionally cross. The visual probe only cares
    // about content lines (axes, components, ropes, wires).
    const tagStr = m[0];
    const strokeM = tagStr.match(/stroke="([^"]+)"/);
    if (strokeM) {
      const s = strokeM[1].toLowerCase();
      if (s === "#eee" || s === "#f0f0f0" || s === "#dddddd") continue;
    }
    shapes.push({ kind: "line", bbox: { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1) } });
  }
  return { width, height, shapes };
}

function rectsIntersect(a, b, pad = 1) {
  return !(a.x + a.w + pad <= b.x || b.x + b.w + pad <= a.x || a.y + a.h + pad <= b.y || b.y + b.h + pad <= a.y);
}

function audit(svg) {
  const { width, height, shapes } = parseShapes(svg);
  const reports = [];
  for (let i = 0; i < shapes.length; i++) {
    for (let j = i + 1; j < shapes.length; j++) {
      const a = shapes[i]; const b = shapes[j];
      if (a.kind !== "text" || b.kind !== "text") continue;
      if (rectsIntersect(a.bbox, b.bbox, 0)) {
        reports.push({ kind: "text-text", a: a.label, b: b.label });
      }
    }
  }
  for (const a of shapes) {
    if (a.kind !== "text") continue;
    for (const b of shapes) {
      if (b.kind !== "rect" || b.bbox.w < 0.5) continue;
      if (rectsIntersect(a.bbox, b.bbox, 0)) {
        const inset = (a.bbox.x > b.bbox.x + 1 && a.bbox.x + a.bbox.w < b.bbox.x + b.bbox.w - 1 &&
                       a.bbox.y > b.bbox.y + 1 && a.bbox.y + a.bbox.h < b.bbox.y + b.bbox.h - 1);
        if (inset) reports.push({ kind: "text-inside-rect", text: a.label, rect: `${b.bbox.w.toFixed(1)}x${b.bbox.h.toFixed(1)}` });
      }
    }
  }
  for (const a of shapes) {
    if (a.kind !== "text") continue;
    for (const b of shapes) {
      if (b.kind !== "line") continue;
      const cx = a.bbox.x + a.bbox.w / 2;
      const cy = a.bbox.y + a.bbox.h / 2;
      const x1 = b.bbox.x; const y1 = b.bbox.y + b.bbox.h / 2;
      const x2 = b.bbox.x + b.bbox.w; const y2 = y1;
      const dx = x2 - x1; const dy = y2 - y1;
      const len = Math.hypot(dx, dy);
      if (len < 1) continue;
      const t = Math.max(0, Math.min(1, ((cx - x1) * dx + (cy - y1) * dy) / (len * len)));
      const px = x1 + t * dx; const py = y1 + t * dy;
      const dist = Math.hypot(cx - px, cy - py);
      const tol = Math.min(a.bbox.h / 2 + 1, 5);
      if (dist < tol) {
        reports.push({ kind: "text-on-line", text: a.label, dist: dist.toFixed(1) });
        break;
      }
    }
  }
  for (const a of shapes) {
    if (a.kind !== "text") continue;
    if (a.bbox.x < -1 || a.bbox.y < -1 || a.bbox.x + a.bbox.w > width + 1 || a.bbox.y + a.bbox.h > height + 1) {
      reports.push({ kind: "text-out-of-frame", text: a.label, bbox: a.bbox });
    }
  }
  return reports;
}

const renderers = {
  S1: renderProjectile, S2: renderProjectile,
  S3: renderOptics, S4: renderOptics, S5: renderOptics,
  S6: renderSchematic, S7: renderFBD
};
const extraRenderers = { renderVectorField, renderScalarField, renderPulley, renderLogicSchematic, renderSchematic };
let totalBugs = 0;
for (const [k, m] of Object.entries(VISUAL_MODELS)) {
  let svg;
  try { svg = renderers[k](m.oracle); } catch (e) { svg = ""; }
  if (!svg) { console.log(`=== ${k} :: render-error`); continue; }
  const reports = audit(svg);
  console.log(`=== ${k} :: ${reports.length} overlap(s)`);
  totalBugs += reports.length;
  for (const r of reports) console.log("  -", JSON.stringify(r));
}
console.log(`\nTotal overlap events across all canonical scenarios: ${totalBugs}`);
let extraBugs = 0;
for (const [id, name, model] of EXTRA_SCENARIOS) {
  const r = extraRenderers[name];
  let svg;
  try { svg = r(model); } catch (e) { console.log(`=== ${id} :: render-error: ${e.message}`); continue; }
  if (!svg) { console.log(`=== ${id} :: empty-svg`); continue; }
  const reports = audit(svg);
  console.log(`=== ${id} :: ${reports.length} overlap(s)`);
  extraBugs += reports.length;
  for (const rep of reports) console.log("  -", JSON.stringify(rep));
}
console.log(`\nTotal overlap events across extended catalog: ${extraBugs}`);
console.log(`Grand total overlap events: ${totalBugs + extraBugs}`);
