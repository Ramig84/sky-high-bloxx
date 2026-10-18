// Presentation-only atmosphere. These camera bands never affect floor rules or weather.
export function skyBlend(altitude: number, low: number, high: number) {
  const t = Math.max(0, Math.min(1, (altitude - low) / (high - low)));
  return t * t * (3 - 2 * t);
}

export function skyProfile(altitude: number) {
  return {
    street: 1 - skyBlend(altitude, 400, 900),
    sunset: skyBlend(altitude, 1200, 2000),
    space: skyBlend(altitude, 3000, 3800),
    districtLife: 1 - skyBlend(altitude, 500, 1100),
    birds: 1 - skyBlend(altitude, 1500, 2200),
    clouds: 1 - skyBlend(altitude, 3200, 3800),
  };
}

/** A repeating world band: it recycles outside the screen, also when descending. */
export function cloudHeight(worldHeight: number, altitude: number, depth: number, viewportHeight: number) {
  const margin = 180, band = viewportHeight + margin * 2;
  const screen = 534 - worldHeight + altitude * depth;
  return ((screen + margin) % band + band) % band - margin;
}

/** Flaps settle into an authored glide, rather than constantly beating in lockstep. */
export function birdFlight(time: number, phase: number) {
  const cycle = ((time + phase) % 5.6 + 5.6) % 5.6;
  const poses = [0, 1, 2, 3, 2, 1];
  return cycle < 1.8 ? (poses[Math.floor(cycle * 10) % poses.length] ?? 2) : 5;
}