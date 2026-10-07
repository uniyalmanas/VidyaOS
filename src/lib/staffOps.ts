/**
 * VidyaOS staff ops (F4) — pure, dependency-free helpers.
 *
 * Same philosophy as `lib/leave.ts`: no Firestore imports, so the identical
 * logic runs in the browser (My Day card, Staff Ops grid) and in node (the
 * unit suite in test-auth.ts).
 */

import {
  SalarySlip,
  SalarySlipStatus,
  TeacherAttendance,
  TeacherAttendanceStatus
} from '../types';
import { getIndiaDateString } from './date';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// ---------------------------------------------------------------- month math

/** "2026-10-07" → "2026-10" — filters attendance rows for a calendar month. */
export function monthKeyFromDate(date: string): string {
  if (!DATE_RE.test(date)) return '';
  return date.slice(0, 7);
}

/** "2026-10" → "October 2026" — the `SalarySlip.monthYear` label. */
export function monthYearFromKey(monthKey: string): string {
  const [yearRaw, monthRaw] = monthKey.split('-');
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  if (!year || !month || month < 1 || month > 12) return '';
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

/** "2026-10-07" → "October 2026". */
export function monthYearFromDate(date: string): string {
  return monthYearFromKey(monthKeyFromDate(date));
}

/** Current calendar month key in India ("2026-10"). */
export function currentMonthKey(today: string = getIndiaDateString()): string {
  return monthKeyFromDate(today);
}

/** Moves a month key by `delta` months, crossing year boundaries. */
export function shiftMonthKey(monthKey: string, delta: number): string {
  const [yearRaw, monthRaw] = monthKey.split('-');
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  if (!year || !month || month < 1 || month > 12) return monthKey;
  const total = year * 12 + (month - 1) + delta;
  const nextYear = Math.floor(total / 12);
  const nextMonth = total - nextYear * 12; // always 0..11, any delta sign
  return `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}`;
}

/** Days in the month, e.g. "2026-10" → 31. */
export function daysInMonthKey(monthKey: string): number {
  const [yearRaw, monthRaw] = monthKey.split('-');
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  if (!year || !month || month < 1 || month > 12) return 0;
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export interface MonthDay {
  /** YYYY-MM-DD. */
  date: string;
  dayNumber: number;
  /** "Sun"…"Sat". */
  weekdayShort: string;
  isSunday: boolean;
}

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Every calendar day of the month, in order — drives the attendance grid columns. */
export function monthDayList(monthKey: string): MonthDay[] {
  const [yearRaw, monthRaw] = monthKey.split('-');
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  if (!year || !month || month < 1 || month > 12) return [];
  const total = daysInMonthKey(monthKey);
  const days: MonthDay[] = [];
  for (let d = 1; d <= total; d++) {
    const weekday = new Date(Date.UTC(year, month - 1, d)).getUTCDay();
    days.push({
      date: `${monthKey}-${String(d).padStart(2, '0')}`,
      dayNumber: d,
      weekdayShort: WEEKDAY_SHORT[weekday],
      isSunday: weekday === 0
    });
  }
  return days;
}

/** Sundays off — the typical Indian tuition weekly holiday. */
function isWorkingDay(date: string): boolean {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay() !== 0;
}

/**
 * Working days in the month (non-Sundays). For the *current* month the count
 * stops at today, so a mid-month salary hint is prorated against days that
 * have actually happened instead of the whole calendar month.
 */
export function workingDaysInMonthKey(monthKey: string, today: string = getIndiaDateString()): number {
  const total = daysInMonthKey(monthKey);
  if (total === 0) return 0;
  const currentKey = monthKeyFromDate(today);
  if (monthKey > currentKey) return 0; // future month — no elapsed days yet
  const cutoff = monthKey === currentKey ? Number(today.slice(8, 10)) : total;
  let count = 0;
  for (let d = 1; d <= cutoff; d++) {
    if (isWorkingDay(`${monthKey}-${String(d).padStart(2, '0')}`)) count++;
  }
  return count;
}

// ------------------------------------------------------- attendance idempotence

/**
 * Deterministic doc id — one row per (teacher, day), so double check-ins,
 * a desk correction and the teacher's own tap all land on the same document.
 */
export function teacherAttendanceId(teacherId: string, date: string): string {
  return `tatt-${teacherId}-${date}`;
}

/** Replaces any existing row for the same (teacher, day); one row ever. */
export function upsertTeacherAttendance(
  records: TeacherAttendance[],
  record: TeacherAttendance
): TeacherAttendance[] {
  const kept = records.filter(
    r => !(r.teacherId === record.teacherId && r.date === record.date)
  );
  return [record, ...kept];
}

export function attendanceForDate(
  records: TeacherAttendance[],
  teacherId: string,
  date: string
): TeacherAttendance | undefined {
  return records.find(r => r.teacherId === teacherId && r.date === date);
}

// ------------------------------------------------------------- status display

export const TEACHER_ATTENDANCE_META: Record<
  TeacherAttendanceStatus,
  { label: string; variant: 'success' | 'warning' | 'error' | 'info' | 'neutral'; accent: string }
> = {
  present: { label: 'Present', variant: 'success', accent: '#188038' },
  half_day: { label: 'Half Day', variant: 'warning', accent: '#FFA000' },
  on_leave: { label: 'On Leave', variant: 'info', accent: '#1A73E8' },
  absent: { label: 'Absent', variant: 'error', accent: '#D93025' }
};

/** Click-to-cycle order on the admin grid: blank → present → … → blank. */
export const ATTENDANCE_CYCLE: Array<TeacherAttendanceStatus | null> = [
  'present',
  'half_day',
  'on_leave',
  'absent',
  null
];

export const SALARY_SLIP_META: Record<
  SalarySlipStatus,
  { label: string; variant: 'success' | 'warning' | 'error' | 'info' | 'neutral'; accent: string }
> = {
  draft: { label: 'Draft', variant: 'neutral', accent: '#86868B' },
  issued: { label: 'Issued', variant: 'warning', accent: '#FFA000' },
  paid: { label: 'Paid', variant: 'success', accent: '#188038' }
};

// ------------------------------------------------------------- month summary

export interface TeacherMonthSummary {
  /** "2026-10". */
  monthKey: string;
  present: number;
  halfDay: number;
  onLeave: number;
  absent: number;
  /** Rows written for this month (present + half + leave + absent). */
  recorded: number;
  /**
   * Proration denominator: every non-Sunday of the month — but only up to
   * today for the current month, so a hint requested mid-month reads fairly.
   */
  workingDays: number;
}

export function summarizeTeacherMonth(
  records: TeacherAttendance[],
  teacherId: string,
  monthKey: string,
  today: string = getIndiaDateString()
): TeacherMonthSummary {
  const summary: TeacherMonthSummary = {
    monthKey,
    present: 0,
    halfDay: 0,
    onLeave: 0,
    absent: 0,
    recorded: 0,
    workingDays: workingDaysInMonthKey(monthKey, today)
  };
  for (const r of records) {
    if (r.teacherId !== teacherId) continue;
    if (monthKeyFromDate(r.date) !== monthKey) continue;
    summary.recorded++;
    if (r.status === 'present') summary.present++;
    else if (r.status === 'half_day') summary.halfDay++;
    else if (r.status === 'on_leave') summary.onLeave++;
    else summary.absent++;
  }
  return summary;
}

/**
 * Prorated salary hint for the slip composer — present days count full,
 * approved leave is paid, half days count half, absences and days nobody
 * marked count zero. A month with no rows at all returns the full basic so
 * an un-instrumented centre is never shown a scary near-zero default.
 */
export function proratedSalaryHint(basic: number, summary: TeacherMonthSummary): number {
  if (!Number.isFinite(basic) || basic <= 0) return 0;
  if (summary.workingDays <= 0 || summary.recorded === 0) return basic;
  const credited = summary.present + summary.onLeave + summary.halfDay * 0.5;
  const hint = Math.round((basic * credited) / summary.workingDays);
  return Math.max(0, Math.min(basic, hint));
}

// ------------------------------------------------------------- slip arithmetic

/** `netAmount = basic + allowances − deductions`, floored at zero. */
export function computeSlipNet(basic: number, allowances: number, deductions: number): number {
  const safe = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0);
  return Math.max(0, safe(basic) + safe(allowances) - safe(deductions));
}

/** "₹30,500" — Indian grouping, no decimals for whole-rupee amounts. */
export function formatRupees(amount: number): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  return `₹${safe.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

/** Slips for one month, newest issued first — the admin month list. */
export function slipsForMonth(slips: SalarySlip[], monthKey: string): SalarySlip[] {
  const label = monthYearFromKey(monthKey);
  return slips
    .filter(s => s.monthYear === label)
    .sort((a, b) => b.createdAtMs - a.createdAtMs);
}

// --------------------------------------------------------------- clock helpers

/**
 * "HH:MM" wall-clock in India — the `checkIn`/`checkOut` stamp written on a
 * self check-in/out tap.
 */
export function formatTimeHHMM(date: Date = new Date(), timeZone = 'Asia/Kolkata'): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.hour}:${values.minute}`;
}
