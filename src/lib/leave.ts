/**
 * VidyaOS leave requests (F3) — pure, dependency-free helpers.
 *
 * Same philosophy as `lib/inquiries.ts`: no Firestore imports, so the
 * identical logic runs in the browser (portals) and in node (the unit
 * suite in test-auth.ts).
 */

import {
  AttendanceRecord,
  Batch,
  LeaveCategory,
  LeaveRequest,
  LeaveStatus,
  Student,
  Teacher,
  UserRole
} from '../types';
import { selectTeacherBatches } from './teacherScope';
import { getIndiaDateString } from './date';

export const LEAVE_CATEGORIES: LeaveCategory[] = ['sick', 'family', 'exam', 'other'];

export const LEAVE_CATEGORY_LABEL: Record<LeaveCategory, string> = {
  sick: 'Sick Leave',
  family: 'Family Function',
  exam: 'Exam / Olympiad',
  other: 'Other'
};

export const LEAVE_STATUS_META: Record<
  LeaveStatus,
  { label: string; variant: 'success' | 'warning' | 'error' | 'info' | 'neutral'; accent: string }
> = {
  pending: { label: 'Pending', variant: 'warning', accent: '#FFA000' },
  approved: { label: 'Approved', variant: 'success', accent: '#188038' },
  rejected: { label: 'Rejected', variant: 'error', accent: '#D93025' }
};

/** Hard cap per request so approving one leave can never stamp a term of attendance. */
export const MAX_LEAVE_DAYS = 31;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 24 * 60 * 60 * 1000;
/** Indexed by JS `getDay()` (0 = Sunday), values match `Batch.scheduleDays`. */
const WEEKDAY_SHORT: Array<'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun'> = [
  'Sun',
  'Mon',
  'Tue',
  'Wed',
  'Thu',
  'Fri',
  'Sat'
];

/**
 * Inclusive list of calendar days between two YYYY-MM-DD strings.
 * Parsed as UTC (a timezone without DST) so a "calendar day" never gains or
 * loses an hour crossing IST. Returns [] for malformed or reversed ranges.
 */
export function expandLeaveDates(startDate: string, endDate: string): string[] {
  if (!DATE_RE.test(startDate) || !DATE_RE.test(endDate) || endDate < startDate) return [];
  const out: string[] = [];
  let cursor = Date.parse(`${startDate}T00:00:00Z`);
  const end = Date.parse(`${endDate}T00:00:00Z`);
  while (cursor <= end && out.length < MAX_LEAVE_DAYS) {
    out.push(new Date(cursor).toISOString().slice(0, 10));
    cursor += DAY_MS;
  }
  return out;
}

/** How many calendar days a request covers (1 = single-day leave). */
export function leaveDaysCount(request: Pick<LeaveRequest, 'startDate' | 'endDate'>): number {
  return expandLeaveDates(request.startDate, request.endDate).length;
}

/**
 * Validation shared by every filing surface (student/parent/teacher portals
 * and the admin desk). Returns an error message to show the user, or null
 * when the request is filable.
 */
export function validateLeaveRange(startDate: string, endDate: string, reason: string): string | null {
  if (!DATE_RE.test(startDate) || !DATE_RE.test(endDate)) {
    return 'Pick both a start date and an end date.';
  }
  if (endDate < startDate) {
    return 'The end date cannot be before the start date.';
  }
  // Count the span directly: `expandLeaveDates` truncates at MAX_LEAVE_DAYS
  // (a render safety valve), so validation must not ask it for the length.
  const spanDays =
    Math.round(
      (Date.parse(`${endDate}T00:00:00Z`) - Date.parse(`${startDate}T00:00:00Z`)) / DAY_MS
    ) + 1;
  if (spanDays > MAX_LEAVE_DAYS) {
    return `Leave can be filed for at most ${MAX_LEAVE_DAYS} days at a time.`;
  }
  if (!reason || reason.trim().length < 3) {
    return 'Add a short reason (at least 3 characters) so the desk can act on it.';
  }
  return null;
}

function formatDay(dateStr: string, withYear: boolean): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    ...(withYear ? { year: 'numeric' as const } : {})
  });
}

/** "5 Oct 2026" · "5 – 7 Oct 2026" · "28 Sep 2025 – 3 Oct 2026". */
export function formatLeaveRange(startDate: string, endDate: string): string {
  if (!DATE_RE.test(startDate) || !DATE_RE.test(endDate)) return `${startDate} – ${endDate}`;
  if (startDate === endDate) return formatDay(startDate, true);
  const sameYear = startDate.slice(0, 4) === endDate.slice(0, 4);
  const sameMonth = startDate.slice(0, 7) === endDate.slice(0, 7);
  if (sameMonth) return `${formatDay(startDate, false)} – ${formatDay(endDate, true)}`;
  return `${formatDay(startDate, sameYear)} – ${formatDay(endDate, true)}`;
}

/** Per-status occupancy for the summary strip. */
export function countLeaveByStatus(requests: LeaveRequest[]): Record<LeaveStatus, number> {
  const counts: Record<LeaveStatus, number> = { pending: 0, approved: 0, rejected: 0 };
  requests.forEach(r => {
    if (counts[r.status] !== undefined) counts[r.status] += 1;
  });
  return counts;
}

/** Display name of the person taking leave (student or faculty record). */
export function getLeaveDisplayName(
  request: LeaveRequest,
  students: Student[],
  teachers: Teacher[]
): string {
  if (request.requesterType === 'student') {
    return students.find(s => s.id === request.studentId)?.name || 'Student';
  }
  return teachers.find(t => t.id === request.teacherId)?.name || 'Faculty';
}

/**
 * Product-level scoping for the faculty console: the leave board a teacher
 * sees covers students of their own batches (the #1 `selectTeacherBatches`
 * join, which fails closed) plus their own filed requests. Rules read is
 * org-wide — this is the same defense-in-depth split as batch scoping.
 */
export function scopeLeaveRequestsForTeacher(
  requests: LeaveRequest[],
  students: Student[],
  teachers: Teacher[],
  batches: Batch[],
  userId: string
): LeaveRequest[] {
  if (!userId) return [];
  const ownBatches = selectTeacherBatches(batches, teachers, userId);
  const batchIds = new Set(ownBatches.map(b => b.id));
  const rosterStudentIds = new Set(
    students.filter(s => (s.batchIds || []).some(id => batchIds.has(id))).map(s => s.id)
  );
  const me = teachers.find(t => t.userId === userId) || teachers.find(t => t.id === userId);
  return requests.filter(r => {
    if (r.requesterType === 'student') return !!r.studentId && rosterStudentIds.has(r.studentId);
    return (!!me && r.teacherId === me.id) || r.requestedByUserId === userId;
  });
}

/** One (batch, student, date) cell the approval should stamp as `excused`. */
export interface ExcusedAttendanceSlot {
  batchId: string;
  studentId: string;
  date: string;
}

/**
 * Which attendance cells an approved student leave should flip to `excused`:
 *  - a teacher's `present`/`late` mark outranks a later approval (never undo
 *    a vouched attendance), while an `absent` mark is exactly what gets fixed;
 *  - days the batch does not class (per `scheduleDays`) are skipped unless a
 *    record already exists for them;
 *  - students with no batches produce no writes (nothing to excuse).
 *
 * The caller upserts each slot through `markAttendance`, which reuses the
 * existing record id for the same (batch, student, date).
 */
export function planExcusedAttendance(
  leave: Pick<LeaveRequest, 'requesterType' | 'startDate' | 'endDate'>,
  student: Student,
  batches: Batch[],
  records: AttendanceRecord[]
): ExcusedAttendanceSlot[] {
  if (leave.requesterType !== 'student' || !student) return [];
  const dates = expandLeaveDates(leave.startDate, leave.endDate);
  const studentBatches = batches.filter(b => (student.batchIds || []).includes(b.id));
  const slots: ExcusedAttendanceSlot[] = [];

  for (const date of dates) {
    const weekday = WEEKDAY_SHORT[new Date(`${date}T00:00:00Z`).getUTCDay()];
    for (const batch of studentBatches) {
      const existing = records.find(
        r => r.batchId === batch.id && r.studentId === student.id && r.date === date
      );
      if (existing && (existing.status === 'present' || existing.status === 'late')) continue;
      if (!existing && batch.scheduleDays.length > 0 && !batch.scheduleDays.includes(weekday)) continue;
      slots.push({ batchId: batch.id, studentId: student.id, date });
    }
  }
  return slots;
}

/** Does an approved leave of this faculty member cover `date`? (sweep helper) */
export function hasApprovedLeaveCovering(
  requests: LeaveRequest[],
  teacherId: string,
  date: string
): boolean {
  return requests.some(
    r =>
      r.requesterType === 'teacher' &&
      r.teacherId === teacherId &&
      r.status === 'approved' &&
      r.startDate <= date &&
      r.endDate >= date
  );
}

/** Timing badge for the boards: has the absence started / ended already? */
export function leaveTiming(
  request: Pick<LeaveRequest, 'startDate' | 'endDate'>,
  today: string = getIndiaDateString()
): 'past' | 'ongoing' | 'today' | 'upcoming' {
  if (request.endDate < today) return 'past';
  if (request.startDate > today) return 'upcoming';
  if (request.startDate === today && request.endDate === today) return 'today';
  return 'ongoing';
}

/** Filer may refine their own request only while it waits for a decision. */
export function canEditLeaveRequest(request: LeaveRequest, userId: string): boolean {
  return request.status === 'pending' && request.requestedByUserId === userId;
}

/**
 * Product-side reviewer gate (rules allow staff/admin + faculty org-wide;
 * which faculty see which requests is `scopeLeaveRequestsForTeacher`).
 */
export function isLeaveReviewer(role: UserRole): boolean {
  return role === 'CENTER_ADMIN' || role === 'STAFF' || role === 'PLATFORM_OWNER' || role === 'TEACHER';
}

/** Deletion stays at the front desk — mirrors the rules `delete` branch. */
export function canDeleteLeave(role: UserRole): boolean {
  return role === 'CENTER_ADMIN' || role === 'STAFF' || role === 'PLATFORM_OWNER';
}

/** Search across the leave-taker's name, reason, category and filer name. */
export function searchLeaveRequests(
  requests: LeaveRequest[],
  term: string,
  nameOf: (r: LeaveRequest) => string
): LeaveRequest[] {
  const q = term.trim().toLowerCase();
  if (!q) return requests;
  return requests.filter(r =>
    [nameOf(r), r.reason, LEAVE_CATEGORY_LABEL[r.category], r.requestedByName]
      .some(v => (v || '').toLowerCase().includes(q))
  );
}

/**
 * Board order: waiting requests first (soonest absence at the top, so the
 * desk acts before the date passes), then decided ones newest-first.
 */
export function sortLeaveRequestsForReview(requests: LeaveRequest[]): LeaveRequest[] {
  return [...requests].sort((a, b) => {
    // Pending sorts above decided. Comparing raw statuses here would be
    // inconsistent for approved-vs-rejected (both "not pending" but different,
    // so a naive branch returns +1 in both directions and the sort becomes
    // arbitrary) — always reduce to the pending bit first.
    const aPending = a.status === 'pending';
    const bPending = b.status === 'pending';
    if (aPending !== bPending) return aPending ? -1 : 1;
    if (aPending) {
      // Soonest absence first so the desk acts before the date passes.
      if (a.startDate !== b.startDate) return a.startDate < b.startDate ? -1 : 1;
      return a.createdAtMs - b.createdAtMs;
    }
    return b.createdAtMs - a.createdAtMs;
  });
}
