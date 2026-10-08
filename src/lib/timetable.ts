/**
 * VidyaOS timetable (F6) — pure, dependency-free helpers for live class links.
 *
 * Same philosophy as `lib/finance.ts` / `lib/staffOps.ts`: no Firestore imports,
 * so the identical URL validation and "join window" arithmetic runs in the
 * browser (the admin editor + student/parent portals) and in node (test-auth.ts).
 *
 * A "live class link" is just an optional `meetUrl` on a `TimetableSlot`. These
 * helpers make sure an owner can only ever publish a safe http(s) link (never a
 * `javascript:` payload), and tell the portals whether a class is joinable now.
 */

import { TimetableSlot } from '../types';
import { WeekdayName } from './date';

export const TIMETABLE_DAYS: TimetableSlot['dayOfWeek'][] = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday'
];

/** Days the admin grid renders (timetable excludes Sunday). */
export const DAY_SHORT: Record<TimetableSlot['dayOfWeek'], string> = {
  Monday: 'Mon',
  Tuesday: 'Tue',
  Wednesday: 'Wed',
  Thursday: 'Thu',
  Friday: 'Fri',
  Saturday: 'Sat'
};

/**
 * Hosts we recognise and can label nicely. We do NOT reject other https hosts —
 * a centre may self-host Jitsi, for instance — we only refuse non-http schemes.
 */
export const KNOWN_MEETING_HOSTS: { host: string; label: string }[] = [
  { host: 'meet.google.com', label: 'Google Meet' },
  { host: 'zoom.us', label: 'Zoom' },
  { host: 'us02web.zoom.us', label: 'Zoom' },
  { host: 'teams.microsoft.com', label: 'Microsoft Teams' },
  { host: 'teams.live.com', label: 'Microsoft Teams' },
  { host: 'whereby.com', label: 'Whereby' },
  { host: 'jitsi.org', label: 'Jitsi' }
];

/** The origin we will actually render, or '' when the input is unusable. */
export function normalizeMeetUrl(value?: string | null): string {
  const raw = (value ?? '').trim();
  if (!raw) return '';
  // Be forgiving: owners often paste "meet.google.com/abc-defg-hij" without a
  // scheme. Assume https for a bare host, but never for an explicit scheme.
  const candidate = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(raw) ? raw : `https://${raw}`;
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return '';
  }
  // Redaction: only http(s) survives. `javascript:`, `data:`, `file:` etc. are
  // dropped rather than stored — a timetable link is rendered as an href.
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return '';
  if (!url.hostname.includes('.')) return '';
  return url.toString();
}

export function isValidMeetUrl(value?: string | null): boolean {
  return normalizeMeetUrl(value) !== '';
}

/** Human label for a link's provider, falling back to its hostname. */
export function meetProviderLabel(value?: string | null): string {
  const url = normalizeMeetUrl(value);
  if (!url) return '';
  let host = '';
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return '';
  }
  const known = KNOWN_MEETING_HOSTS.find(k => host === k.host || host.endsWith(`.${k.host}`));
  return known ? known.label : host;
}

// ---------------------------------------------------------------------------
// Time-of-day maths (slot times are "HH:MM" 24-hour strings, India time)
// ---------------------------------------------------------------------------

export function parseClock(time: string): number | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec((time ?? '').trim());
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

/** Minutes past midnight in India, or null when the clock is missing/malformed. */
export function nowMinutesIndia(now: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map(p => [p.type, p.value]));
  const hour = values.hour === '24' ? 0 : Number(values.hour);
  return hour * 60 + Number(values.minute);
}

export type JoinState = 'unavailable' | 'upcoming' | 'live' | 'ended';

/** How many minutes before the start we open the "Join now" button. */
export const JOIN_OPENS_EARLY_MINUTES = 10;

/**
 * Where a slot sits relative to `now`. Only slots whose `dayOfWeek` is today can
 * ever be `live`/`ended`; anything else is `upcoming` (or `unavailable` when it
 * has no valid link).
 */
export function joinState(
  slot: TimetableSlot,
  todayDay: WeekdayName,
  now: Date = new Date()
): JoinState {
  if (!isValidMeetUrl(slot.meetUrl)) return 'unavailable';
  if (slot.dayOfWeek !== todayDay) return 'upcoming';

  const start = parseClock(slot.startTime);
  const end = parseClock(slot.endTime);
  if (start == null || end == null) return 'upcoming';

  const mins = nowMinutesIndia(now);
  if (mins < start - JOIN_OPENS_EARLY_MINUTES) return 'upcoming';
  if (mins > end) return 'ended';
  return 'live';
}

/** "17:00 – 18:30", tolerant of missing values. */
export function formatSlotRange(slot: TimetableSlot): string {
  return `${slot.startTime || '--:--'} – ${slot.endTime || '--:--'}`;
}

/** Monday-first ordering, then by start time. */
export function sortTimetableSlots(slots: TimetableSlot[]): TimetableSlot[] {
  const dayRank = (day: TimetableSlot['dayOfWeek']) => {
    const idx = TIMETABLE_DAYS.indexOf(day);
    return idx === -1 ? 99 : idx;
  };
  return [...slots].sort((a, b) => {
    const dayDiff = dayRank(a.dayOfWeek) - dayRank(b.dayOfWeek);
    if (dayDiff !== 0) return dayDiff;
    return (parseClock(a.startTime) ?? 0) - (parseClock(b.startTime) ?? 0);
  });
}

export function slotsForDay(slots: TimetableSlot[], day: WeekdayName): TimetableSlot[] {
  return sortTimetableSlots(slots.filter(s => s.dayOfWeek === day));
}

/** Slots for the given batches, newest day/time order. */
export function slotsForBatches(slots: TimetableSlot[], batchIds: string[]): TimetableSlot[] {
  const wanted = new Set(batchIds);
  return sortTimetableSlots(slots.filter(s => wanted.has(s.batchId)));
}

// ---------------------------------------------------------------------------
// Overlap / clash detection — the admin grid's "conflict-free" promise
// ---------------------------------------------------------------------------

/** Two slots clash when they share a day and their [start, end) ranges overlap. */
export function slotsOverlap(a: TimetableSlot, b: TimetableSlot): boolean {
  if (a.dayOfWeek !== b.dayOfWeek) return false;
  const aStart = parseClock(a.startTime);
  const aEnd = parseClock(a.endTime);
  const bStart = parseClock(b.startTime);
  const bEnd = parseClock(b.endTime);
  if (aStart == null || aEnd == null || bStart == null || bEnd == null) return false;
  return aStart < bEnd && bStart < aEnd;
}

export interface TimetableClash {
  kind: 'teacher' | 'classroom' | 'batch';
  slot: TimetableSlot;
}

/**
 * Every existing slot a candidate would collide with — same faculty, same room,
 * or same batch overlapping in time. `ignoreId` lets an edit skip itself.
 */
export function findTimetableClashes(
  candidate: TimetableSlot,
  slots: TimetableSlot[],
  ignoreId?: string
): TimetableClash[] {
  const clashes: TimetableClash[] = [];
  for (const slot of slots) {
    if (slot.orgId !== candidate.orgId) continue;
    if (ignoreId && slot.id === ignoreId) continue;
    if (!slotsOverlap(candidate, slot)) continue;
    if (candidate.teacherId && slot.teacherId === candidate.teacherId) {
      clashes.push({ kind: 'teacher', slot });
    }
    if (candidate.classroom && slot.classroom === candidate.classroom) {
      clashes.push({ kind: 'classroom', slot });
    }
    if (candidate.batchId && slot.batchId === candidate.batchId) {
      clashes.push({ kind: 'batch', slot });
    }
  }
  return clashes;
}

/** True when the candidate has no teacher/room/batch collision. */
export function isClashFree(candidate: TimetableSlot, slots: TimetableSlot[], ignoreId?: string): boolean {
  return findTimetableClashes(candidate, slots, ignoreId).length === 0;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export interface TimetableSlotInput {
  batchId: string;
  dayOfWeek: TimetableSlot['dayOfWeek'];
  startTime: string;
  endTime: string;
  classroom: string;
  teacherId: string;
  subject: string;
  meetUrl?: string;
}

/** Returns an error sentence, or null when the slot is well-formed. */
export function validateTimetableSlot(input: TimetableSlotInput): string | null {
  if (!input.batchId) return 'Pick the batch this class belongs to.';
  if (!input.subject.trim()) return 'Give the class a subject or title.';
  if (!TIMETABLE_DAYS.includes(input.dayOfWeek)) return 'Pick a valid weekday.';
  const start = parseClock(input.startTime);
  const end = parseClock(input.endTime);
  if (start == null || end == null) return 'Enter valid start and end times (HH:MM).';
  if (end <= start) return 'The end time must be after the start time.';
  if (input.meetUrl && input.meetUrl.trim() && !isValidMeetUrl(input.meetUrl)) {
    return 'That class link is not a valid web address (use a https:// Google Meet or Zoom link).';
  }
  return null;
}