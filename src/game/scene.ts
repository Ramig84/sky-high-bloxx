/** Street objects share the tower's world projection, never the HUD's screen space. */
export function streetSpectators(groundY: number, cameraY: number, viewportHeight: number) {
  const feetY = groundY + 7 + cameraY;
  const height = 37;
  return { feetY, height, visible: feetY - height < viewportHeight && feetY > 0 };
}