import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, extname, resolve, dirname } from "node:path";

const ROOTS = ["packages/core/src", "packages/cli/src", "packages/app/src", "tests"];
const tsFiles = [];
function walk(dir) {
  try {
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, ent.name);
      if (ent.isDirectory()) walk(p);
      else if (extname(p) === ".ts") tsFiles.push(p);
    }
  } catch {}
}
for (const r of ROOTS) walk(r);

function scanExports(file) {
  const src = readFileSync(file, "utf8");
  const set = { type: new Set(), value: new Set() };
  const re = /^[ \t]*export\s+(?:abstract\s+)?(?:async\s+)?(?:default\s+)?(type|interface|class|function|const|enum|let|var)\s+([A-Za-z_$][\w$]*)/gm;
  let m;
  while ((m = re.exec(src)) !== null) {
    const kind = m[1];
    const name = m[2];
    if (kind === "type" || kind === "interface" || kind === "enum") set.type.add(name);
    else set.value.add(name);
  }
  return set;
}

const exportMap = new Map();
for (const f of tsFiles) exportMap.set(resolve(f), scanExports(f));

function findExportForSpecifier(fromFile, spec) {
  const dir = dirname(fromFile);
  const resolved = resolve(dir, spec);
  let ts = resolved;
  if (ts.endsWith(".js")) ts = ts.slice(0, -3) + ".ts";
  return exportMap.get(ts) || null;
}

let totalFixed = 0;
let bogusRemoved = 0;
const allBugs = [];

for (const f of tsFiles) {
  let src = readFileSync(f, "utf8");
  const lines = src.split(/\r?\n/);
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    // Detect start of an import statement: leading whitespace + "import" + ("type"?) + "{"
    const start = line.match(/^([ \t]*)import\s*(type\s*)?\{/);
    if (!start) {
      out.push(line);
      i++;
      continue;
    }
    const indent = start[1];
    const isType = start[2] !== undefined;
    // Collect lines until we see the closing `}` + from + ";?"
    let buf = "";
    let j = i;
    while (j < lines.length) {
      buf += lines[j] + "\n";
      // check for `} from "..."` end (with optional semicolon)
      if (/}\s*from\s*["'][^"']+["'];?\s*$/.test(lines[j])) break;
      j++;
    }
    if (j >= lines.length) {
      // unterminated - keep as is
      out.push(line);
      i++;
      continue;
    }
    // Now parse buf
    const headM = buf.match(/^[ \t]*import\s*(type\s*)?\{([\s\S]+?)\}\s*from\s*["']([^"']+)["'];?\s*$/);
    if (!headM) {
      // unparseable - keep lines as is
      for (let k = i; k <= j; k++) out.push(lines[k]);
      i = j + 1;
      continue;
    }
    const _isType = headM[1] !== undefined;
    const inner = headM[2];
    const modulePath = headM[3];
    if (!modulePath.startsWith(".")) {
      for (let k = i; k <= j; k++) out.push(lines[k]);
      i = j + 1;
      continue;
    }
    const exports = findExportForSpecifier(resolve(f), modulePath);
    if (!exports) {
      for (let k = i; k <= j; k++) out.push(lines[k]);
      i = j + 1;
      continue;
    }
    const entries = inner.split(",").map((s) => s.trim()).filter(Boolean).map((s) => {
      const tm = s.match(/^type\s+([A-Za-z_$][\w$]*)(?:\s+as\s+([A-Za-z_$][\w$]*))?$/);
      if (tm) return { name: tm[1], alias: tm[2] ?? null, hint: "type" };
      const am = s.match(/^([A-Za-z_$][\w$]*)(?:\s+as\s+([A-Za-z_$][\w$]*))?$/);
      return { name: am[1], alias: am[2] ?? null, hint: null };
    });
    const kept = [];
    const dropped = [];
    for (const e of entries) {
      if (exports.type.has(e.name) || exports.value.has(e.name)) {
        const isT = exports.type.has(e.name) && !exports.value.has(e.name);
        kept.push({ name: e.name, alias: e.alias, isType: isT, isHint: e.hint === "type" });
      } else {
        dropped.push(e.name);
      }
    }
    if (dropped.length) {
      bogusRemoved += dropped.length;
      allBugs.push(f + ": dropped " + dropped.join(", "));
    }
    if (kept.length === 0) {
      totalFixed += 1;
      i = j + 1;
      continue;
    }
    const valueEntries = kept.filter((e) => !e.isType);
    const typeEntries = kept.filter((e) => e.isType);
    const fmt = (entries) => entries.map((e) => (e.isHint ? "type " : "") + (e.alias ? e.name + " as " + e.alias : e.name)).join(", ");
    if (valueEntries.length === 0) {
      out.push(indent + "import type { " + fmt(typeEntries) + " } from \"" + modulePath + "\";");
    } else if (typeEntries.length === 0) {
      out.push(indent + "import { " + fmt(valueEntries) + " } from \"" + modulePath + "\";");
    } else {
      out.push(indent + "import { " + fmt(valueEntries) + " } from \"" + modulePath + "\";");
      out.push(indent + "import type { " + fmt(typeEntries) + " } from \"" + modulePath + "\";");
    }
    totalFixed += 1;
    i = j + 1;
  }
  const newSrc = out.join("\n");
  if (newSrc !== src) writeFileSync(f, newSrc);
}
console.log("fixed imports in", totalFixed, "lines; dropped", bogusRemoved, "bogus names");
if (allBugs.length) for (const b of allBugs.slice(0, 50)) console.log("  -", b);