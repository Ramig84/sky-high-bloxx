/** Speed diagnostics never change the approved drawing density. */
export function canvasResolution(width: number, height: number, devicePixelRatio: number) {
  const dpr = Number.isFinite(devicePixelRatio) && devicePixelRatio > 0 ? Math.min(devicePixelRatio, 2) : 1;
  const dimension = (size: number) => Number.isFinite(size) ? Math.max(1, Math.round(Math.max(0, size) * dpr)) : 1;
  return { width: dimension(width), height: dimension(height) };
}
