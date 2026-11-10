const RECOVERY_DELAYS_MS = [
    0,
    2_000,
    5_000,
    10_000,
    20_000,
    40_000,
    60_000,
    90_000,
];

export const MAX_RUN_RECOVERY_ATTEMPTS = 20;

export function getRunRecoveryDelay(attempt: number): number {
    const safeAttempt = Math.max(0, Math.floor(attempt));
    return RECOVERY_DELAYS_MS[Math.min(safeAttempt, RECOVERY_DELAYS_MS.length - 1)];
}
