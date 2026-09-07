# Kinetra Development Status

This document is updated as subsystems land.

## Build strategy

- **Pure TypeScript core**: zero npm dependencies; only Node 25 built-ins (`node:sqlite`, `node:crypto`, `node:test`, `node:assert`).
- **No bundler**: `node --experimental-strip-types` runs `.ts` files directly. `node --test` discovers `*.test.ts`.
- **No external binaries**: no Python, Rust, LaTeX, Typst, ngspice, Tauri. The PDF engine, renderers, and symbolic math are hand-rolled.
- **Determinism is a load-bearing requirement**: every renderer must be byte-stable given the same spec + version.

## Subsystem status

| Subsystem | Status |
| --- | --- |
| `core/types`, `core/errors`, `core/result`, `core/units`, `core/validation`, `core/artifacts` | ? landed |
| `core/utils/{hash,id,text}` | ? landed |
| `core/dld/{boolean,expression,truth_table,kmap,simplify,timing,sequential}` | ? landed (will revisit `circuit.ts` and `kmap.ts` for known issues) |
| `core/dld/circuit` | ?? needs fix in `expressionToCircuit` (sentinel net ids never wired) |
| `core/math/*` | ? landed (expression, eval, symbolic, algebra, calculus, linear, complex, probability) |
| `core/graph/{spec,sample,render_svg}` | ? landed |
| `core/diagram/primitives` | ? landed |
| `core/diagram/{scene2d,freebody,projectile,pulley,optics,fields,circuit_schematic,logic_schematic,timing_render}` | ?? building |
| `core/scene3d/{types,coords,projection,render_svg}` | ?? building |
| `core/circuit/{circuit,spice}` | ?? building |
| `core/ingest/*` | ?? building |
| `core/store/*` (sqlite, migrations, library, history, mastery, artifacts) | ?? building |
| `core/retrieval/*` (lexical, vector, hybrid, benchmark) | ?? building |
| `core/assessment/*` (quiz, exam, grading, flashcards, mastery_rules) | ?? building |
| `core/pdf/*` (PDF 1.4 emitter, layout, text, equation, figure, page, document) | ?? building |
| `core/providers/*` (types, mock, router) | ?? building |
| `core/prompts/*` (templates, sanitize) | ?? building |
| `core/workspace/*` (artifact, workspace) | ?? building |
| Tests (unit + property + visual) | ?? building |
| CLI binary | ?? building |
| Codex plugin + skills | ?? building |
| Sample course | ?? building |
| App (static SPA) | ?? building |
| Integration tests / golden workflows A-D | ?? building |
| Docs (README, architecture, skills, testing, contributing, security) | ?? building |
| Final adversarial review | ?? building |

## Known limitations

- **No real PDF text extraction**: the hand-rolled `pdf_understanding` reads text objects from a small subset of PDF 1.4 streams (plain text, simple fonts). This is documented; richer PDF parsing is out of scope for the pure-Node constraint.
- **No ngspice/SPICE**: the circuit solver is a deterministic DC + transient engine implemented in pure TS. It supports R, L, C, independent sources, switches. Not a drop-in ngspice replacement.
- **Embeddings**: default is a deterministic hashed-bag embedding (no model download, no cloud). The vector store interface is pluggable; a real embedding provider can be slotted in.
- **No Tauri**: the desktop app is a static SPA. The pure-Node constraint rules out Tauri/Rust.

## Decisions

- Use Node 25 `--experimental-strip-types` so we can author in TypeScript without a build step.
- Use `node:sqlite` for persistence (built into Node 25).
- PDF output via a hand-rolled PDF 1.4 emitter (text, lines, paths, no images except basic raster for 3D scenes).
- Plugin format: `.codex-plugin/plugin.json` + `skills/<name>/SKILL.md` with YAML frontmatter.
- License: Apache-2.0.

## Tracking

- Tests run with `node --test --experimental-strip-types "packages/**/test/**/*.test.ts"`.
- Typecheck with `node --experimental-strip-types --check` per file (no project-wide tsc — we don't have tsc in the runtime).