# Without-plugin LLM answers (simulated)

These are answers an LLM would give if asked the same 6 questions WITHOUT
access to the Kinetra plugin skills. The LLM relies on its parametric
memory of physics, with no ground-truth formulas handed to it.

## S1 - Projectile from cliff
I work from y0 = 20 m, v0 = 25 m/s, theta = 30 deg.
- vy = 25 sin 30 = 12.5
- vx = 25 cos 30 = 21.65
- Time to apex above launch: vy/g = 12.5/9.81 = 1.274 s
- Additional height: vy^2/(2g) = 156.25/19.62 = 7.96 m
- Max height above ground: 20 + 7.96 = 27.96 m
- Time to fall from 27.96 m back to ground: t = sqrt(2*27.96/9.81) = 2.39 s
- Total flight: 1.27 + 2.39 = 3.66 s
- Range: 21.65 * 3.66 = 79.2 m

Answer: maxHeight = 27.96, flightTime = 3.66, range = 79.2

## S2 - Horizontal launch
- y0 = 5, v0 = 10
- Fall time: t = sqrt(2*5/9.81) = sqrt(1.019) = 1.01 s
- Range: 10 * 1.01 = 10.1 m

Answer: flightTime = 1.01, range = 10.1

## S3 - Converging lens (real image)
- u = 20, f = 10. 1/f = 1/u + 1/v  => 1/10 = 1/20 + 1/v => 1/v = 1/20 => v = 20
- mag = -v/u = -1
- imageHeight = -5
- Real, inverted, same size, 20 cm to the right of the lens.

Answer: imageBaseX=20, imageHeight=-5, magnification=-1

## S4 - Converging lens (object inside focal length)
- u = 5, f = 10. 1/10 = 1/5 + 1/v => 1/v = -0.1 => v = -10
- mag = -v/u = 2
- imageHeight = 2 * 3 = 6
- Image is virtual, upright, magnified 2x, located 10 cm to the LEFT
  of the lens (same side as object).

Answer: imageBaseX=-10, imageHeight=6, magnification=2

## S5 - Concave mirror
- f = 10, u = 15. 1/10 = 1/15 + 1/v => 1/v = 1/10 - 1/15 = 1/30 => v = 30
- mag = -v/u = -2
- imageHeight = -2 * 4 = -8
- Real, inverted, magnified 2x, 30 cm in front of the mirror.

Answer: imageBaseX=30, imageHeight=-8, magnification=-2

## S6 - RC low-pass step response
- tau = R*C = 1000 * 1e-6 = 1 ms
- V(tau) = V_inf * (1 - e^{-t/tau}) = 5 * (1 - 1/e) = 5 * 0.6321 = 3.16 V

Answer: tau = 1 ms, V at tau = 3.16 V