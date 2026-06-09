// Accumulator win-boost ladder. Must stay in lockstep with the backend
// (backend/internal/usecase/betting CalculateWinBoost): the server reprices and
// recomputes the boost authoritatively, so this is display-only. Mirrors the
// mainstream bet365 ladder — 2.5% at 2 legs rising to a 100% cap at 20 legs.

// Max legs allowed on one accumulator (matches backend maxAccaLegs).
export const MAX_ACCA_LEGS = 20;

// Percentage boost (e.g. 10 == +10%) applied to a winning accumulator.
const LADDER = [
  0, 0, 2.5, 5, 10, 15, 20, 25, 30, 35, 40,
  45, 50, 55, 60, 65, 70, 75, 80, 90, 100,
];

export function winBoostPercent(legs: number): number {
  if (legs < 2) return 0;
  if (legs >= LADDER.length) return LADDER[LADDER.length - 1];
  return LADDER[legs];
}
