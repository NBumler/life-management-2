/**
 * documentation/Subfeatures/Új esemény hozzáadása.md: default `startTime` for a new timed event is
 * "now" rounded up to the next 15-minute mark (an exact mark stays put); `endTime` defaults to
 * `startTime + 1h`. Two fallbacks collapse both to `22:59`–`23:59` — crossing midnight while
 * rounding, or (defensively) `endTime` ending up at or before `startTime` after the day-end clamp.
 */
export function computeDefaultTimedTimes(hours: number, minutes: number): { startTime: string; endTime: string } {
  const MINUTES_PER_DAY = 24 * 60;
  const FALLBACK = { startTime: '22:59', endTime: '23:59' };

  const roundedStart = Math.ceil((hours * 60 + minutes) / 15) * 15;
  if (roundedStart >= MINUTES_PER_DAY) {
    return FALLBACK;
  }
  const startTime = formatTime(roundedStart);

  let endTotal = roundedStart + 60;
  if (endTotal >= MINUTES_PER_DAY) {
    endTotal = MINUTES_PER_DAY - 1;
  }
  const endTime = formatTime(endTotal);

  return endTime <= startTime ? FALLBACK : { startTime, endTime };
}

function formatTime(totalMinutes: number): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(Math.floor(totalMinutes / 60))}:${pad(totalMinutes % 60)}`;
}
