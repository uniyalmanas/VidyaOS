export function getIndiaDateString(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export type WeekdayName =
  | 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

const WEEKDAYS: WeekdayName[] = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
];

/**
 * Weekday name for `date` as observed in India (Asia/Kolkata), matching the
 * `TimetableSlot['dayOfWeek']` values. Returns the correct day even when the
 * device is set to another timezone.
 */
export function getIndiaDayName(date: Date = new Date()): WeekdayName {
  // Shift by the IST offset (+05:30) before reading the UTC weekday fields.
  const shifted = new Date(date.getTime() + (5 * 60 + 30) * 60_000);
  return WEEKDAYS[shifted.getUTCDay()];
}
