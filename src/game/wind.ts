/** Wind strength stays in the level spec; this controls only signalled direction changes. */
export const WIND_DROPS_PER_DIRECTION = 4;
export const WIND_TURN_SECONDS = 1.8;
export type WindState = { direction: number; drops: number; turn: number | null; from: number };
export function freshWind(): WindState { return { direction: 1, drops: 0, turn: null, from: 1 }; }
export function finishWindDrop(state: WindState): WindState {
  if (state.turn !== null) return state;
  const drops = state.drops + 1;
  return drops < WIND_DROPS_PER_DIRECTION ? { ...state, drops } : { ...state, drops: 0, turn: 0, from: state.direction };
}
/** Fade through calm visually; full level force remains constant and turns never advance during a fall. */
export function stepWind(state: WindState, dt: number, held: boolean): WindState {
  if (!held || state.turn === null || dt <= 0) return state;
  const turn = Math.min(WIND_TURN_SECONDS, state.turn + dt);
  const direction = turn >= WIND_TURN_SECONDS / 2 ? -state.from : state.from;
  return { ...state, direction, turn: turn >= WIND_TURN_SECONDS ? null : turn };
}
export function windPresentation(state: WindState) {
  const changing = state.turn !== null;
  const opacity = changing ? Math.abs(Math.cos(Math.PI * (state.turn ?? 0) / WIND_TURN_SECONDS)) : 1;
  return { direction: state.direction, nextDirection: changing ? -state.from : state.direction, changing, opacity };
}