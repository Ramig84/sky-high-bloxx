/** All signals must agree before recordings may be audible. */
export function audioMayPlay(visible: boolean, focused: boolean, pagePresent: boolean, nativeActive: boolean) {
  return visible && focused && pagePresent && nativeActive;
}