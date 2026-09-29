/** Calendar dates stay in YYYY-MM-DD form; UTC arithmetic avoids DST/day shifts. */
export function calendarDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [, year, month, day] = match.map(Number);
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(0);
  date.setUTCHours(12, 0, 0, 0);
  date.setUTCFullYear(year, month - 1, day);
  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
    ? date
    : null;
}

export function calendarIso(date: Date): string {
  const year = date.getUTCFullYear();
  if (!Number.isFinite(year) || year < 1 || year > 9999) return '';
  return `${String(year).padStart(4, '0')}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

export function calendarToday() {
  const now = new Date();
  return `${String(now.getFullYear()).padStart(4, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function calendarAddDays(value: string, amount: number) {
  const date = calendarDate(value);
  if (!date) return '';
  date.setUTCDate(date.getUTCDate() + amount);
  return calendarIso(date);
}

export function calendarAddMonths(value: string, amount: number) {
  const date = calendarDate(value);
  if (!date) return '';
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + amount + 1);
  date.setUTCDate(0);
  date.setUTCDate(Math.min(day, date.getUTCDate()));
  return calendarIso(date);
}

export function calendarClamp(value: string, min = '0001-01-01', max = '9999-12-31') {
  return value < min ? min : value > max ? max : value;
}

export function calendarGrid(month: string) {
  const first = calendarDate(`${month}-01`);
  if (!first) return [];
  const offset = (first.getUTCDay() + 6) % 7;
  return Array.from({ length: 42 }, (_, index) => calendarAddDays(`${month}-01`, index - offset));
}

export function calendarLabel(value: string, full = false) {
  const date = calendarDate(value);
  return date
    ? new Intl.DateTimeFormat('en-US', {
        timeZone: 'UTC',
        year: 'numeric',
        month: full ? 'long' : 'short',
        day: 'numeric',
        ...(full ? { weekday: 'long' as const } : {}),
      }).format(date)
    : '';
}

/** Reject invalid local times, including hours skipped by a daylight-saving change. */
export function validLocalDateTime(value: string) {
  if (
    !/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d$/.test(value) ||
    !calendarDate(value.slice(0, 10))
  )
    return false;
  const date = new Date(value);
  return (
    Number.isFinite(date.getTime()) &&
    date.getFullYear() === Number(value.slice(0, 4)) &&
    date.getMonth() + 1 === Number(value.slice(5, 7)) &&
    date.getDate() === Number(value.slice(8, 10)) &&
    date.getHours() === Number(value.slice(11, 13)) &&
    date.getMinutes() === Number(value.slice(14, 16))
  );
}
