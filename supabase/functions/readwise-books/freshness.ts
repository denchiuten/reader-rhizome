const DAILY_TTL = 24 * 60 * 60 * 1000;
const MANUAL_TTL = 5 * 60 * 1000;

export function shouldRefreshReading(syncedAt: string, manual = false, now = Date.now()) {
  const age = now - new Date(syncedAt).getTime();
  return !Number.isFinite(age) || age >= (manual ? MANUAL_TTL : DAILY_TTL);
}