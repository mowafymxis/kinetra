# Plugin Skill Excerpts (use as authoritative reference)

You are using the Kinetra Codex plugin. The two relevant skills below
describe the exact physics formulas and the return shapes of the
underlying TypeScript functions. **Use these formulas to compute
your answers.** Do not invent or guess formulas; cite the file and
line for each computation.

## Skill: kinetra-diagrams

### Projectile (from packages/core/src/diagram/projectile.ts)
- vx = v0 * cos(theta)
- vy = v0 * sin(theta)
- y(t) = y0 + vy*t - 0.5*g*t^2
- t_apex = vy / g  (apex only if vy > 0)
- y_apex = y0 + vy*t_apex - 0.5*g*t_apex^2
- range: solve y(t)=0 for positive root, then x(t) = vx*t_impact
- Returns: { apex:{time, position:{x,y}}, range:{time, distance},
  flightTime, maxHeight }
- For vy > 0: apex.time = vy/g, apex.y = y0 + vy^2/(2g); flight time is
  the positive root of y(t) = 0 that is >= apex time.
- For vy = 0 (horizontal launch from y0 > 0): apex.time = 0, maxHeight
  = y0; flight time is sqrt(2*y0/g). Range = v0 * flight time.
- For vy < 0 (downward launch): apex.time = 0, maxHeight = y0;
  flight time is the positive root of y(t) = 0 (the ball hits the
  ground faster than a horizontal launch).
- For y0 = 0 with vy > 0: flight time = 2*vy/g (returns to launch level).

### Optics (from packages/core/src/diagram/optics.ts)
For thin lens and spherical mirror, with object at x = element.x - u,
image at v from element:
- 1/v = 1/f - 1/u
- magnification m = -v/u
- imageHeight = m * objectHeight
- imageBase.x = element.x + v  (positive v = real image on outgoing side)
- Plane mirror: dx = element.x - objectBase.x; imageBase = {x: x+dx, y: objectBase.y};
  imageHeight = -objectHeight, magnification = -1.
- Ray path always empty array in current build; geometry is drawn separately.

### Free-body on incline + pulley + friction (from packages/core/src/diagram/freebody.ts and pulley.ts)
**Order of operations -- do not skip the static check.**
1. Decompose m1 on the incline:
   - N = m1 * g * cos(theta)        *(cos(theta) is required, not 1)*
   - downIncline = m1 * g * sin(theta)
2. Compute net driving force from m2 vs gravity component of m1:
   - downFromHanging = m2 * g
   - fReq = downFromHanging - downIncline
3. **Static-friction check** (mandatory):
   - mu*N = mu * m1 * g * cos(theta)
   - if |fReq| < mu*N -> the system is STATIC:
       acceleration = 0
       friction     = fReq   (its sign is whatever holds static equilibrium)
       tension      = m2 * g
       motionState  = "static"
   - else -> the system is KINETIC. Pick the sign of motion from
     sign(fReq) (whichever side "wins") and write the two-equation
     system with friction opposing motion:
       netForce = |fReq| - mu*N
       a        = sign(fReq) * netForce / (m1 + m2)
       friction = -sign(fReq) * mu*N
       tension  = m2 * (g - a)
       motionState = "kinetic"
4. **Pulley topology:** if the pulley is *fixed* (no movable sheave),
   mechanicalAdvantage(model) = 1 and the two-block equations are
   symmetric -- a single tension value carries through both blocks.
   See `mechanicalAdvantage(model)` in freebody.ts. Compound pulleys
   multiply by 2; movable pulleys invert the tension/force balance;
   do not assume MA=1 if the diagram shows otherwise.
5. `validateFBD(fbd, opts)` enforces consistency: every force magnitude
   must agree with its (component_x, component_y) decomposition to
   within tolerance; net force must equal m*a on each block. Run this
   check before returning the answer.

## Skill: kinetra-circuits

### RC step response (transient)
- tau = R * C
- V_c(t) = V_final * (1 - exp(-t/tau))  for charging from 0 to V_final
- V at t = tau is V_final * (1 - 1/e) ~= V_final * 0.6321
- Backward Euler MNA stamps a capacitor as conductance g = C/dt with
  companion current source I = C * V_prev / dt; inductors as
  R_eq = L/dt, V_eq = R_eq * I_prev (Thevenin companion).

## Skill: kinetra-fields (magnetism + electrostatics)

### Solenoid magnetic field
A solenoid of N turns uniformly wound over length L, carrying current I,
has a turn density 
 = N / L (turns per metre). The axial magnetic
field **inside the solenoid, far from the ends**, is:
- B_center = mu_0 * n * I = mu_0 * (N / L) * I
- mu_0 = 4*pi * 1e-7  T*m/A

At **one end** of a long solenoid the field is half of the centre value:
- B_end = B_center / 2

This end-correction factor of 1/2 follows from Ampere's law applied to
a single turn at the solenoid mouth (the field lines spread symmetrically
on both sides there, so the half inside the solenoid is half of the
uniform-interior value). It is NOT the same as "uniform everywhere".

The bare-LLM trap is to use N (the total turn count) directly instead of
n = N/L -- off by a factor of L, which for L = 0.4 m is 250x. Or to
report B_end = B_center (no end correction).

Units: 1 T = 1000 mT. A solenoid field of 7.5e-3 T = 7.5 mT. Don't
confuse the two when reporting the answer.

## Skill: kinetra-circuits (RLC band-pass extension)

### Series RLC resonance
For a series RLC circuit (R, L, C in series, driven by a source):
- Resonant angular frequency: omega_0 = 1 / sqrt(L * C)  [rad/s]
- Resonant cyclic frequency:  _0 = omega_0 / (2 * pi)    [Hz]
- Quality factor:             Q = omega_0 * L / R
                              (equivalent: Q = 1 / (R) * sqrt(L / C))
- 3 dB bandwidth:             delta_f = R / (2 * pi * L)   [Hz]
                              (equivalent: delta_f = f_0 / Q)

Angular frequency (omega_0, rad/s) and cyclic frequency (f_0, Hz) are
related by omega_0 = 2 * pi * f_0. They are NOT interchangeable; a
resonant frequency of 1000 rad/s is the same circuit as 159.15 Hz,
but the units must match the question. Reporting omega_0 = 1000 when the
question asks for Hz in the answer field is a units slip worth -50%.

The Q formula Q = 1 / (R * sqrt(C/L)) is for PARALLEL RLC, not series.
For series RLC it reduces to Q = (1/R) * sqrt(L/C), which is the same
expression, but applying it to a *different circuit topology* changes
the meaning. Use Q = omega_0 * L / R as the canonical form.

The bandwidth is delta_f = f_0 / Q -- not _0 * Q, and not
omega_0 / Q (which would have the wrong units).

## Skill: kinetra-dld (Karnaugh maps and don't-cares)

### K-map canonical form
The canonical representation of a Boolean function F over 
 variables
is a 2^n-bit mask, where bit i is set iff minterm i is in the
minterm set. For F(A,B,C) = Sum m(0,1,4):
- m0 = !A!B!C -> bit 0 set
- m1 = !A!B!C -> bit 1 set
- m4 = A!B!C -> bit 4 set
- mask = 0b10011 = 19

The mask is the unique canonical form. Equivalent Boolean expressions
must produce the same mask. Don't-cares (d(3), d(7)) are NOT set
in the minterm mask -- they are opportunistic: the minimiser may treat
them as 0 or 1 to enlarge implicant groups, but they never appear as
1s in the canonical mask.

### Quine-McCluskey minimisation
The function uildKMap({variables, minterms, dontCares}) runs the
Quine-McCluskey algorithm and returns:
- mintermMask: bigint  -- the canonical minterm mask (don't-cares
  excluded)
- groups: KMapGroup[]  -- the list of prime implicants (each group
  is one term of the simplified SOP)
- simplified: BoolExpr -- the parsed Boolean expression tree
- 	erm_count = groups.length -- the number of terms in the SOP

The minimisation is correct iff:
1. mintermMask matches the oracle
2. 	erm_count equals the minimum number of prime implicants needed
   to cover all minterms (exploiting don't-cares for grouping)
3. The expression simplified, when re-evaluated, produces the same
   minterm mask

For S10 specifically:
- Sum m(0,1,4) + d(3,7)
- m0={A=0,B=0,C=0}, m1={A=0,B=0,C=1}, m4={A=1,B=0,C=0}
- d3={A=0,B=1,C=1}, d7={A=1,B=1,C=1}
- Group {0,1} = !A!B (don't-care-free pair)
- Group {0,4} = !B!C (don't-care-free pair, m4 alone... wait,
  actually {0,4} uses Gray-code adjacency -- A and C change, B=0)
- The B column is 0 in both implicants, giving 2 terms
- mask = 19 (bits 0, 1, 4 only -- no don't-cares included)

The bare-LLM trap is to (a) forget m4 (mask = 11), (b) write the
unminimised sum (3 terms, no grouping), or (c) refuse to use
don't-cares (larger, less optimal SOP).
