# Kinetra — Recovery Audit

Audit performed at the start of a new Codex CLI session in which no prior
conversational context was available. The previous session was actively
building the Kinetra project; mid-session filesystem loss occurred.

## Method

- Captured `git status` and full file inventory of the working tree.
- Cross-referenced the surviving `packages/core/src/index.ts` (which still
  re-exports every subsystem module) against the actual file system to
  detect missing modules.
- Read `docs/development-status.md` to identify which subsystems the
  previous session had marked landed vs. building.
- Tried a runtime import of `@kinetra/core` to surface remaining parse
  errors and resolve the current build status.

## What survived

| Area | Files present | Notes |
| --- | --- | --- |
| Workspace root | `package.json`, `tsconfig.base.json`, `.gitignore` | root `package.json` is consistent with the strip-types strategy; per-package `package.json` files still reference `tsc`/`vitest` builds. |
| `packages/core` math engine | `math/{expression,eval,symbolic,algebra,calculus,linear,complex,probability}.ts` | full set present. |
| `packages/core` DLD | `dld/{boolean,expression,truth_table,kmap,simplify,timing,sequential,circuit}.ts` | `kmap.ts`, `circuit.ts`, `expression.ts` were updated most recently; `expression.ts` still contains a TS parameter-property and fails under `--experimental-strip-types`. |
| `packages/core` graph | `graph/{spec,sample,render_svg}.ts` | full set present. |
| `packages/core` 2D diagrams | `diagram/{primitives,scene2d,freebody,projectile,pulley,optics,fields,circuit_schematic,logic_schematic,timing_render}.ts` | full set present. |
| `packages/core` 3D | `scene3d/{types,coords,projection,render_svg}.ts` | full set present. |
| `packages/core` circuits | `circuit/{circuit,spice}.ts` | present; SPICE is a hand-rolled pure-TS solver. |
| `packages/core` utility | `utils/{hash,id,text}.ts` | present. |
| `packages/core` core types | `types,errors,result,units,validation,artifacts,index.ts` | present. |
| `packages/core` test | `test/dld/circuit.test.ts` | the **only** test file that survived. |
| `scripts/` | `fix-mixed-imports.mjs`, `ts-loader.mjs` | present. |
| `docs/` | `development-status.md` | present. |

## What was lost

- `packages/core/src/ingest/{text,markdown,json_doc,pdf,chunk,course_organizer}.ts`
- `packages/core/src/store/{sqlite,migrations,library,history,mastery,artifacts}.ts`
- `packages/core/src/retrieval/{index,lexical,vector,hybrid,benchmark}.ts`
- `packages/core/src/assessment/{quiz,exam,grading,flashcards,mastery_rules}.ts`
- `packages/core/src/pdf/{pdf,layout,text,equation,figure,page,document}.ts`
- `packages/core/src/providers/{types,mock,router}.ts`
- `packages/core/src/prompts/{templates,sanitize}.ts`
- `packages/core/src/workspace/{artifact,workspace}.ts`
- `packages/cli/` entire source tree (`bin/kinetra.ts` etc.)
- `packages/app/` entire source tree
- `packages/plugin/` entire manifest + skills directory
- `tests/integration/**` golden workflow tests
- `sample-course/**` lecture fixtures
- top-level docs (`README.md`, `architecture.md`, `skills.md`, `testing.md`, `security.md`, `contributing.md`)

`packages/core/src/index.ts` still re-exports every lost module. Running the
core today fails immediately with `ERR_MODULE_NOT_FOUND` for the first
missing file. `index.ts` itself parses cleanly under `--check`, but the
re-export graph is the source of the failure.

## Existing defects observed during inventory

- `packages/core/src/math/expression.ts:43` — `constructor(private src: string)`
  is a TypeScript parameter property. Node `--experimental-strip-types`
  rejects parameter properties in strip-only mode. Must be rewritten as
  `private src: string; constructor(src: string) { this.src = src; }`.
- `packages/core/src/dld/circuit.ts` — flagged in the dev status as having
  "sentinel net ids never wired" in `expressionToCircuit`. The surviving
  test for this function still passes (verified locally on the file as
  written), so the flag is stale relative to current code; revisit if
  subsequent tests fail.
- `packages/core/src/dld/expression.ts` was last modified after `circuit.ts`
  (6:34 PM vs 1:36 PM), suggesting the surviving version is the most
  recent.
- Per-package `package.json` files still claim `tsc -p tsconfig.json` and
  `vitest`, while the root `package.json` uses
  `node --experimental-strip-types` + `node --test`. Strategy is
  consistent with the dev status doc; the per-package scripts are dead
  until a real `tsc`/`vitest` install is added. They do not block the
  strip-types pipeline used at the root.

## Recovery plan

1. Preserve the current tree exactly (no destructive cleanup).
2. Fix the `expression.ts` parameter property to unblock strip-types.
3. Reconstruct the 36 missing core modules test-first. Many of these have
   obvious contracts from the dev status and from each other; the
   earlier session's decisions (Node-only, no third-party deps, byte-
   stable renderers) are taken as ground truth.
4. Reconstruct the CLI, app, plugin, sample course, integration tests,
   and the rest of the documentation.
5. Verify with the surviving test, then add a real regression suite.
6. Update `docs/development-status.md` to reflect the actual rebuilt
   state.

## Environment snapshot

- Date: 2026-08-25
- Node: 25.8.1
- OS: Windows (PowerShell)
- Git: clean working tree, no commits on `main`, no stashes, no other
  branches.
