/** Speed diagnostics never change the approved drawing density. */
export function canvasResolution(width: number, height: number, devicePixelRatio: number) {
  const dpr = Math.min(devicePixelRatio || 1, 2);
  return { width: Math.round(width * dpr), height: Math.round(height * dpr) };
}