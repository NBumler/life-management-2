export interface MonthGridDay {
  date: string;
  inCurrentMonth: boolean;
}

/**
 * documentation/Features/Naptár.md "Hónap rács": hét kezdete hétfő (ISO-8601), a rács a hónapot
 * teljes hetekre kerekíti — a szomszédos hónapok napjai is megjelennek (szürkén, a UI dolga).
 */
export function buildMonthGrid(year: number, month: number): MonthGridDay[] {
  const firstOfMonth = new Date(Date.UTC(year, month - 1, 1));
  const firstWeekdayMondayIndexed = (firstOfMonth.getUTCDay() + 6) % 7;

  const lastOfMonth = new Date(Date.UTC(year, month, 0));
  const daysInMonth = lastOfMonth.getUTCDate();
  const lastWeekdayMondayIndexed = (lastOfMonth.getUTCDay() + 6) % 7;
  const daysAfter = 6 - lastWeekdayMondayIndexed;

  const totalDays = firstWeekdayMondayIndexed + daysInMonth + daysAfter;
  const days: MonthGridDay[] = [];
  for (let offset = 0; offset < totalDays; offset++) {
    const date = new Date(Date.UTC(year, month - 1, 1 - firstWeekdayMondayIndexed + offset));
    days.push({ date: formatDate(date), inCurrentMonth: date.getUTCMonth() === month - 1 });
  }
  return days;
}

function formatDate(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}
