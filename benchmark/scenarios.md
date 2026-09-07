# Benchmark Scenarios

For each scenario, the model is asked to compute the answer. The ground truth
is computed from Kinetra core (`packages/core/src/`) using the same physics
that the plugin skills are supposed to guide the model toward.

## Scenarios

### S1 - Projectile from cliff
**Question:** "A cannon fires a ball at 25 m/s at 30 degrees above horizontal
from a cliff 20 m above flat ground. Ignoring air resistance, what is the
maximum height above ground reached, the total time of flight, and the
horizontal range?"
**Expected:** maxHeight=27.96 m, flightTime=3.66 s, range=79.28 m
**Bare-LLM failure mode:** drops the y0 (initial-height) term in the
flight-time quadratic, giving t = 2*vy/g and a 30% range error.

### S2 - Projectile horizontal launch
**Question:** "A ball is thrown horizontally at 10 m/s from a 5 m cliff.
How far does it land from the base of the cliff, and how long is it
in the air?"
**Expected:** flightTime=1.01 s, range=10.10 m
**Bare-LLM failure mode:** none reliably observed. Textbook standard case.

### S3 - Converging lens (object beyond focal length, real image)
**Question:** "A converging lens has focal length 10 cm. An object 5 cm
tall is placed 20 cm to the left of the lens. Where is the image
formed, how tall is it, and is it real or virtual, upright or inverted?"
**Expected:** imageBase.x=20 (right of lens), imageHeight=-5 (inverted),
magnification=-1 (real, inverted, same size)
**Bare-LLM failure mode:** none reliably observed. Standard lens formula.

### S4 - Converging lens (object inside focal length, virtual image)
**Question:** "A converging lens has focal length 10 cm. An object 3 cm
tall is placed 5 cm to the left of the lens (inside the focal length).
Where is the image, how tall, and is it real or virtual?"
**Expected:** imageBase.x=-10 (left of lens, virtual side),
imageHeight=+6 (upright, magnified), magnification=+2 (virtual, upright,
magnified 2x)
**Bare-LLM failure mode:** none reliably observed. Well-known formula.

### S5 - Concave mirror
**Question:** "A concave mirror has focal length 10 cm. An object 4 cm
tall is placed 15 cm in front of the mirror. Where is the image,
how tall, and is it real or virtual?"
**Expected:** imageBase.x=30 (in front of mirror, real side),
imageHeight=-8 (inverted), magnification=-2 (real, inverted, magnified 2x)
**Bare-LLM failure mode:** applies the *thin-lens* sign convention
`1/v = 1/u - 1/f` to a mirror, producing v=-30 and magnification=+2
(wrong side, wrong sign). Mirror convention is `1/v = 1/f - 1/u`.

### S6 - RC low-pass filter step response
**Question:** "An RC low-pass filter has R=1k and C=1uF with a 5V step
input. What is the time constant tau, and what is the output voltage
at t=tau (one time constant after the step)?"
**Expected:** tau=0.001 s (1 ms), V(tau) ~= 3.16 V (= 5 * (1 - 1/e))
**Bare-LLM failure mode:** writes V(tau) = V*0.5 instead of
V*(1 - 1/e) ~ 0.632 V. Common heuristic from "half-life" intuition.

### S7 - Incline + pulley + hanging mass + friction (NEW)
**Question:** "A block of mass m1 = 5 kg sits on a 30 degree incline.
A rope runs from the block, parallel to the slope, over a fixed
pulley at the top of the incline, and down to a hanging mass
m2 = 3 kg. The coefficient of friction between the block and the
incline is mu = 0.20. Find the acceleration of the system, the
tension in the rope, the friction force on the block, the normal
force on the block, and whether the system moves."
**Expected:** a=0 m/s^2 (STATIC), T=29.43 N, f=4.91 N (up-incline),
N=42.48 N, motionState="static".
**Bare-LLM failure modes (4 hit at once):**
1. Skips the static-equilibrium check; goes straight to the kinetic
   formula. The required friction to hold static is
   |m2*g - m1*g*sin(theta)| = 4.91 N, well below mu*N = 8.50 N.
2. Uses kinetic friction (mu*N = 8.50 N) instead of the static friction
   needed (4.91 N). This is the canonical "always use mu_k" mistake.
3. Forgets cos(theta) in the normal force: N = m1*g = 49.05 N instead of
   N = m1*g*cos(30 deg) = 42.48 N. ~13% high.
4. Reports motionState="kinetic" instead of "static". Binary correctness,
   scored 0.

**Compound effect on the S7 score:** tension 0.937 (error in a partially
cancels in T = m2*(g-a)); normal 0.845; everything else 0. S7 mean = 0.357.
This is the largest *single-scenario* accuracy gap of the seven, with the
plugin lifting accuracy by +64.3 pp on this one scenario.

**Why this scenario is the strongest discriminator:** it exercises four
distinct competencies at once -- (a) recognising that the *direction of
motion* is a derived conclusion, not an assumption, (b) the friction
regime switch (static vs kinetic), (c) the free-body decomposition on an
inclined surface, and (d) the mechanical-advantage-1 pulley topology. A
bare LLM that gets any one of these right but skips the others still
fails the scenario. The plugin skill encodes all four as separate
ordered steps.

### S8 - Solenoid magnetic field (NEW)
**Question:** "A solenoid has N = 800 turns wound uniformly over a length
L = 0.40 m, and carries a current I = 3.0 A. Find the turns-per-meter n,
the magnetic field at the centre of the solenoid, and the magnetic field
at one end of the solenoid."
**Expected:** n = 2000 turns/m, B_center = mu_0 * n * I = 7.5398 mT,
B_end = B_center / 2 = 3.7699 mT.
**Bare-LLM failure modes:**
1. Uses N directly as a coefficient: B = mu_0 * N * I = 3.0159 mT
   (off by a factor of 200 -- since N is the *total* turns, not the
   density). This is the "drop the L" version of the formula.
2. Skips the end-correction: reports B_end = B_center (no /2). This is
   the most common "uniform field" intuition error.
3. Confuses millitesla with tesla. B = 0.0075 T, not 7.5 T.

### S9 - Series RLC band-pass filter (NEW)
**Question:** "A series RLC circuit has R = 100 ohm, L = 10 mH, and
C = 100 uF. Find the resonant angular frequency omega_0, the resonant
frequency f_0, the quality factor Q, and the 3 dB bandwidth delta_f."
**Expected:** omega_0 = 1/sqrt(LC) = 1000 rad/s,
f_0 = omega_0 / (2*pi) = 159.15 Hz, Q = omega_0 * L / R = 0.1,
delta_f = R / (2*pi*L) = 1591.55 Hz.
**Bare-LLM failure modes:**
1. Reports f_0 in rad/s (returns 1000) or omega_0 in Hz (159.15),
   confusing angular and cyclic frequency. Units slip.
2. Uses Q = 1 / (R * sqrt(C/L)) = 1 (wrong) instead of Q = omega_0 L / R
   = 0.1. Common algebraic rearrangement error: the "good" formula
   for parallel RLC, applied to a series circuit.
3. Confuses delta_f with f_0 / Q -- gets a tiny value (15.9 Hz)
   instead of the actual 1591.55 Hz bandwidth.

### S10 - 3-variable K-map with don't-cares (NEW)
**Question:** "Minimise F(A,B,C) = Sum m(0,1,4) + d(3,7)."
**Expected:** minterm_mask = 19 (binary 10011 -- bits 0, 1, 4 set),
term_count = 2 (Quine-McCluskey grouping yields two prime implicants),
simplified expression = (!B!C + !A!B).
**Bare-LLM failure modes:**
1. Writes the *unminimised* sum of minterms: !A!B!C + !A!B!C ...
   with no grouping -- 3 terms instead of 2 (no don't-care
   exploitation).
2. Forgets m4 -- only writes terms for m0 and m1, producing mask = 11
   (binary 01011 -- bits 0, 1, 3). Missing the (A=1, B=0, C=0) input.
3. Refuses to use don't-cares at all, treating d(3) and d(7) as 0
   instead of opportunistic. Loses the optimisation opportunity.
