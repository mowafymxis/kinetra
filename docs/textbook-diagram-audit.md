# Textbook diagram accuracy audit

Date: 2026-09-07. Initial verdict: **not ready for textbook-quality physics instruction**.

## Repair status

The initial findings below are preserved as audit history. The subsequent repair implements matched vector markers, shared world-to-view transforms with equal geometry scale, corrected mirror signs and principal rays, finite focus-case rendering, impact-limited projectiles, explicit rejection of unsupported drag, rotated FBD components, tangent pulley routes, nonzero scalar contours, scaled circuit terminals and separate logic inputs.

A new model-driven charged-rod renderer produces the supplied reference's type of apparatus: shaded cylinders, suspension threads, charge patches, rotational freedom cue, and equal/opposite attraction or repulsion arrows. This is a qualitative distributed-charge illustration; no Coulomb-force magnitude or torsional dynamics is claimed.

The nine original acceptance probes now pass. Regression tests separately cover physical relationships and emitted geometry. Generated SVGs and static raster previews were inspected; the local browser restriction was not bypassed. See [current usage and limits](diagrams.md). General compound pulley routes, nonzero projectile drag, exact spherical optical ray tracing and arbitrary textbook scene generation remain unsupported rather than silently approximated.

Final verification: **297/297 repository tests**, including **82/82 diagram tests**; **9/9 acceptance probes**; strict diagram TypeScript checking and a clean lockfile installation both pass. These counts describe the tested cases, not an exhaustive accuracy guarantee.

The durable probe is now `scripts/audit-diagrams.mjs`, run with `npm run audit:diagrams`; its reproducible outputs live in ignored `out/diagram-audit/`. The gallery generator is `examples/render-diagrams.mjs`, run with `npm run examples:diagrams`, and writes to ignored `out/diagrams/`. The earlier paths and failure counts in the historical account below refer to the initial audit.

## Initial audit (before repairs)

Scope: the 2D scene renderer, free-body, projectile, optics, pulley, scalar/vector field renderers, plus adjacent analog/logic schematic renderers and the existing visual benchmark. This is an audit, not a completed renderer repair. Production renderer code was not changed.

Serway-style quality here means correct physics, faithful geometry, directional arrows, standard optical constructions, unambiguous connections, and readable labels. No Serway edition or reference figures were supplied, so this is not a claim of direct comparison with that book. The physical checks use independent calculations and the open textbook references below. 3D, PDF export, graphing, timing diagrams, and exhaustive circuit layouts were not certified.

## Reproduced results

- Existing diagram suite: **50/50 passed**.
- New targeted acceptance probes: **0/9 passed**. These deliberately exercise suspected defects, so this is not an estimate of the overall failure rate.
- The probes produce actual SVG files and a gallery. SVG coordinates and references were inspected programmatically. Browser screenshot inspection was blocked by the browser URL policy for local files; no pixel-level visual sign-off is claimed.

Run from the repository root:

```powershell
node --experimental-strip-types --import ./scripts/_register.mjs --test packages/core/test/diagram/*.test.ts
node --experimental-strip-types --import ./scripts/_register.mjs benchmark/textbook_audit.mjs
```

The second command intentionally exits 1 while acceptance failures remain. Outputs: `benchmark/textbook-audit/results.json`, `gallery.html`, and five `example-*.svg` files. The probe script is separate from the existing test suite to preserve an explicit record of the failing audit.

## Findings, ordered by repair priority

| Priority | Finding and evidence | Required correction |
| --- | --- | --- |
| P1 | **Arrowheads do not render.** `scene2d.ts:231` references per-vector marker IDs but `renderScene2D` emits no marker definitions. The exported `renderScene2DWithArrows` helper also fails: it replaces a defs string that is not emitted and defines a different ID. Force, velocity, and field arrows lose their direction cues. | Emit matching deterministic marker definitions; verify every reference resolves, including repeated vectors and different colors. |
| P1 | **Projectile curve is in the wrong coordinate space.** `projectile.ts` creates a world-coordinate path; `scene2d.ts:276` emits it verbatim as SVG pixels. In the cliff case the curve starts at pixel `(0,20)` while its launch marker is at `(13.706,44.218)`. Lens chevrons use the same broken path route. | Give path coordinates an explicit contract and transform all world paths consistently. Assert trajectory/point coincidence in rendered coordinates. |
| P1 | **Plane mirror image is upside down.** `optics.ts:45` negates height and returns magnification -1. A height-1 object must have an upright height-1 virtual image and magnification +1. | Correct the model and replace the existing test that explicitly requires the wrong sign. |
| P1 | **Spherical mirror images appear on the wrong side.** `optics.ts:54` uses the lens mapping `x + v`. For a concave mirror at zero, f=1, object x=-2, the real image belongs at x=-2, but the code returns +2. Convex mirror virtual images are likewise placed on the wrong side under the documented signed-focal convention. | Use mirror-specific image-position mapping; independently test real and virtual cases. The current concave-mirror test locks in the bug. |
| P1 | **Optics is missing ray-diagram content.** `buildSceneFromOptics` draws object/image segments and the element, but no principal rays or focal labels. Every `rayPath` is empty. Image dashing follows negative magnification (inversion), rather than virtuality. `axisY=0` ignores an off-axis element, and at u=f the output contains Infinity/NaN. | Implement principal rays, arrowheads, focal points, dashed backward extensions for virtual images, explicit image-at-infinity handling, and a consistent optical axis. Validate signed focal lengths and object placement. |
| P1 | **Circuit symbols and wires use incompatible scales.** `circuit_schematic.ts:191` translates/rotates raw world-sized symbol bodies without scaling them, while wire terminals are converted to pixels. A 0.6-unit resistor on the audit viewport should span 36 pixels; its path spans 0.6 pixels. | Apply a shared position/scale/orientation transform to bodies and pins and verify visible terminal continuity. Review inductor endpoint mismatch, source polarity/current direction, switch state and junction conventions too. |
| P1 | **Pulley geometry does not encode a rope system.** `pulley.ts:71` connects mass tops to the bottom-center point of the wheel instead of tangent contacts. The two-wheel connector at line 79 holds x at p0, so it never reaches a horizontally displaced p1. Other configurations can have no rope at all. Tension is accepted but unused in the scene. | Introduce explicit rope connectivity, tangent/wrap geometry, anchors and supported loads. Reject unsupported configurations instead of drawing an apparently complete system. |
| P1 | **Pulley mechanical advantage is not physical.** `pulley.ts:36` returns the pulley count when any pulley moves. Count alone cannot determine the supporting rope strands or effort direction. The Atwood force test computes an equation locally without testing the implementation. | Derive ideal MA from a defined rope topology or remove unsupported numerical claims. Test forces against the rendered configuration. |
| P1 | **Contours have zero length.** `fields.ts:117` and the following branch set segment endpoints equal. For V=x+y and contour 0.123, all seven emitted segments have zero length. | Use a genuine contour algorithm with edge interpolation, cell connectivity and saddle handling; verify nonzero segments lie on analytic level sets. |
| P1 | **Logic inputs visually merge distinct nets.** `logic_schematic.ts:130` routes every input to the same gate coordinate and shared final segment. Multi-input gates lose distinct input terminals. Output anchors also do not consistently meet symbol edges. | Allocate separate input pins and connect each net to its own terminal. Check topology from the rendered wire graph. |
| P2 | **Projectile behavior exceeds its physical model.** The default tMax is 1.1 times flight time, drawing below ground (the probe ends at y=-6.612 m). Nonzero drag is silently ignored and yields byte-identical vacuum output. Gravity zero is accepted although analytics divide by it; finite values and sample counts are inadequately validated. | Stop default flight at impact; implement drag or reject it explicitly; validate the supported domain and suppress key points outside a requested time interval. |
| P2 | **Geometry and FBD conventions are unreliable.** Independent x/y viewport scaling distorts vector angles, while circles/arcs use only the x scale, so contacts and other shapes disagree on a non-isotropic viewport. FBD components are always decomposed along world x/y even when the displayed frame is rotated, and a second unrotated set of axes remains visible. Force values are used directly as world lengths, so ordinary forces can run off canvas. | Support a geometry-preserving scale, a stated common force-arrow scale, and components in the selected frame. Separate force-only diagrams from kinematic/context overlays and verify force directions against each problem's constraints. |
| P2 | **Field magnitude and invalid samples are not communicated.** All nonzero vector samples are normalized to the same length without a direction-only legend; scalar colors have no value legend. Nonfinite scalar samples can reach the color ramp, and grid counts are not consistently validated. | State encoding explicitly; add a magnitude/color scale when relevant, handle singularities, and validate finite integer grids. |

## Why the old accuracy claim cannot be used

`benchmark/visual_harness.mjs:34` sets `withAnswer = VISUAL_MODELS[id].oracle` and scores that oracle against itself. The baseline is also hand-written. Therefore 100% is a property of a synthetic fixture comparison, not an observed success rate from a generator or a renderer.

`benchmark/RESULTS_VISUAL.md` asserted that the renderer is always correct and inferred high-90s real-world accuracy. Neither claim is supported. The overlap checks cover selected text collisions, not optical laws, arrow definitions, trajectory alignment, symbol visibility or rope connectivity. Passing them cannot certify an educational diagram.

## Acceptance criteria before claiming textbook quality

1. Repair common SVG geometry and arrowheads first, then recheck every consumer.
2. Replace physically incorrect optics tests; cover plane/concave/convex mirrors and converging/diverging lenses, including u<f, u=f, u=2f and translated axes. Verify rays intersect the calculated image or its backward extension.
3. Cover horizontal/downward/vertical projectile launches, elevated origins, ground impact and truncated time intervals; verify rendered curve endpoints, velocity tangency and finite output.
4. Verify pulley rope continuity/tangency and force balance; verify circuit and logic terminal connectivity rather than only input netlists.
5. Check rotated FBDs and field singularities with independent physical expectations. Rendering arbitrary user vectors does not validate that those forces solve the stated problem.
6. Inspect rendered figures at normal reading size for arrow direction, labels, clipping and conventional symbols. Add independently reviewed reference examples and viewport variants.
7. Keep model-selection, physical calculation, SVG geometry, and visual-readability scores separate. Only claim generator accuracy from actual sampled runs against independent answers; state sample count and scope.

## Independent textbook references

- [OpenStax: Images formed by plane mirrors](https://openstax.org/books/university-physics-volume-3/pages/2-1-images-formed-by-plane-mirrors): upright, same-size virtual images.
- [OpenStax: Spherical mirrors](https://openstax.org/books/university-physics-volume-3/pages/2-2-spherical-mirrors): mirror sign conventions and real/virtual image construction.
- [OpenStax: Thin lenses](https://openstax.org/books/university-physics-volume-3/pages/2-4-thin-lenses): principal-ray rules and focal geometry.
- [OpenStax: Projectile motion](https://openstax.org/books/university-physics-volume-1/pages/4-3-projectile-motion): constant-gravity kinematics without air resistance.
- [OpenStax: Simple machines](https://openstax.org/books/college-physics-2e/pages/9-5-simple-machines): mechanical advantage and pulley systems.
