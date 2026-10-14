/** Endless ends with a score; campaign and daily rewards require the level goal. */
export function canBankRun(won: boolean, endless: boolean, daily: boolean) {
  return won || (endless && !daily);
}