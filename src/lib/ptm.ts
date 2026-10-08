/**
 * F8 — parent–teacher meeting (PTM) slot logic.
 *
 * Pure functions only: the event window is cut into fixed-length slots here,
 * and booking/cancel are pure state transitions (`applyBooking` throws on a
 * double-book) so `firestoreService.bookPtmSlotInTransaction` can share the
 * exact same decision logic the unit tests exercise.
 *
 * Times are stored as ISO-local `YYYY-MM-DDTHH:MM` (no zone offset) so that
 * "is this slot today / does it clash" never has to reason about timezones —
 * every date in VidyaOS is India-local already.
 */

import { PtmEvent, PtmEventInput, PtmSlot, PtmSlotStatus, Teacher } from '../types';

export const PTM_DEFAULT_SLOT_MINUTES = 15;
export const PTM_MIN_SLOT_MINUTES = 10;
export const PTM_MAX_SLOT_MINUTES = 60;

export const PTM_SLOT_STATUS_LABEL: Record<PtmSlotStatus, string> = {
  available: 'Open',
  booked: 'Booked',
  cancelled: 'Cancelled'
};

const MINUTES_IN_DAY = 24 * 60;

/** 'HH:MM' → minutes since midnight; NaN for anything unparseable. */
export function parseClockMinutes(clock: string): number {
  const match = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec((clock || '').trim());
  if (!match) return NaN;
  return Number(match[1]) * 60 + Number(match[2]);
}

/** Minutes since midnight → 'HH:MM' (clamped into the same day). */
export function minutesToClock(total: number): string {
  const clamped = Math.max(0, Math.min(MINUTES_IN_DAY - 1, Math.round(total)));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** '17:00' → '5:00 PM' (the 12-hour style Indian parents read on the grid). */
export function formatClock12(clock: string): string {
  const minutes = parseClockMinutes(clock);
  if (Number.isNaN(minutes)) return clock;
  const h24 = Math.floor(minutes / 60);
  const m = minutes % 60;
  const suffix = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
}

/** '17:00','18:30' → '5:00 – 6:30 PM' (AM/PM suffix shared, taken from the end). */
export function formatClockRange(startClock: string, endClock: string): string {
  const start = formatClock12(startClock);
  const end = formatClock12(endClock);
  const startSuffix = start.slice(-2);
  const endSuffix = end.slice(-2);
  return startSuffix === endSuffix ? `${start.slice(0, -3)} – ${end}` : `${start} – ${end}`;
}

/** '2026-10-12T17:00' → '17:00'. */
export function slotClock(slot: PtmSlot): string {
  return slot.startsAt.split('T')[1] || '';
}

/** '2026-10-12T17:00' → '2026-10-12'. */
export function slotDay(slot: PtmSlot): string {
  return slot.startsAt.split('T')[0];
}

/** The whole slot as a parent reads it: '5:00 – 5:15 PM'. */
export function formatSlotRange(slot: PtmSlot): string {
  const startClock = slotClock(slot);
  const endClock = slot.endsAt.split('T')[1] || '';
  return formatClockRange(startClock, endClock);
}

/**
 * Validates the "open a PTM" form. Returns `null` when the window is sane or
 * a human-readable reason to reject it.
 */
export function validatePtmEvent(input: PtmEventInput): string | null {
  const title = (input.title || '').trim();
  if (!title) return 'Give the meeting a title, e.g. "Parent–Teacher Meeting".';
  if (title.length > 120) return 'Keep the title under 120 characters.';

  if (!input.date || !/^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
    return 'Pick a date for the meeting.';
  }

  const start = parseClockMinutes(input.startTime);
  const end = parseClockMinutes(input.endTime);
  if (Number.isNaN(start) || Number.isNaN(end)) {
    return 'Start and end times must look like HH:MM.';
  }

  const slotMinutes = input.slotMinutes ?? PTM_DEFAULT_SLOT_MINUTES;
  if (!Number.isFinite(slotMinutes) || slotMinutes < PTM_MIN_SLOT_MINUTES || slotMinutes > PTM_MAX_SLOT_MINUTES) {
    return `Each meeting must be ${PTM_MIN_SLOT_MINUTES}–${PTM_MAX_SLOT_MINUTES} minutes.`;
  }

  if (end <= start) return 'The end time must be after the start time.';
  if (end - start < slotMinutes) {
    return `The window is shorter than one ${slotMinutes}-minute slot.`;
  }

  if (!input.teacherIds || input.teacherIds.length === 0) {
    return 'Invite at least one teacher to the meeting.';
  }

  return null;
}

/**
 * Cuts an event's window into `slotMinutes`-long slots — one column per
 * teacher. Deterministic ids (`ptm-<eventId>-<teacherId>-<n>`) mean the same
 * event always generates the same documents, so re-running generation never
 * duplicates a slot.
 */
export function generatePtmSlots(event: PtmEvent): PtmSlot[] {
  const start = parseClockMinutes(event.startTime);
  const end = parseClockMinutes(event.endTime);
  const slotMinutes = event.slotMinutes || PTM_DEFAULT_SLOT_MINUTES;

  if (Number.isNaN(start) || Number.isNaN(end) || end <= start || !event.teacherIds?.length) {
    return [];
  }

  const slots: PtmSlot[] = [];
  for (const teacherId of event.teacherIds) {
    let index = 0;
    for (let from = start; from + slotMinutes <= end; from += slotMinutes) {
      const to = from + slotMinutes;
      slots.push({
        id: `ptm-${event.id}-${teacherId}-${index}`,
        orgId: event.orgId,
        branchId: event.branchId,
        eventId: event.id,
        teacherId,
        startsAt: `${event.date}T${minutesToClock(from)}`,
        endsAt: `${event.date}T${minutesToClock(to)}`,
        status: 'available'
      });
      index++;
    }
  }
  return slots;
}

/** One teacher's diary column, soonest first. */
export function slotsForTeacher(slots: PtmSlot[], teacherId: string): PtmSlot[] {
  return slots
    .filter(s => s.teacherId === teacherId)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

/** Still-claimable slots (optionally one teacher's), soonest first. */
export function bookableSlots(slots: PtmSlot[], teacherId?: string): PtmSlot[] {
  return slots
    .filter(s => s.status === 'available' && (!teacherId || s.teacherId === teacherId))
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

/** Everything booked by this auth user, soonest first. */
export function bookingsForUser(slots: PtmSlot[], userId: string): PtmSlot[] {
  return slots
    .filter(s => s.status === 'booked' && s.bookedByUserId === userId)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

/** Everything booked for this child (parent view across all their kids). */
export function bookingsForStudent(slots: PtmSlot[], studentId: string): PtmSlot[] {
  return slots
    .filter(s => s.status === 'booked' && s.bookedStudentId === studentId)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

export interface BookingActor {
  /** Auth uid of the parent/student claiming the slot. */
  userId: string;
  studentId: string;
  studentName: string;
  /** ISO timestamp stamped onto `bookedAt`. */
  nowIso: string;
}

/**
 * Pure claim of a slot. Throws — never returns a half-booked slot — when the
 * slot is no longer available, which is exactly what a racing second family
 * hits inside `bookPtmSlotInTransaction` (Firestore re-runs the transaction
 * against the winner's write, so the loser always re-reads 'booked' here).
 */
export function applyBooking(slot: PtmSlot, actor: BookingActor): PtmSlot {
  if (!actor.userId || !actor.studentId) {
    throw new Error('You must be signed in to book a meeting.');
  }
  if (slot.status === 'booked') {
    throw new Error('That slot was just taken by another family. Pick a different time.');
  }
  if (slot.status !== 'available') {
    throw new Error('That slot is no longer open. Pick a different time.');
  }

  return {
    ...slot,
    status: 'booked',
    bookedByUserId: actor.userId,
    bookedStudentId: actor.studentId,
    bookedForName: actor.studentName,
    bookedAt: actor.nowIso
  };
}

/**
 * Pure cancel: only the account that booked may release it, and the released
 * slot returns to 'available' (fields cleared to `null`, not removed, so the
 * Firestore rules field-lock can still see them) — freeing it for the next
 * family immediately.
 */
export function applyCancel(slot: PtmSlot, actorUserId: string): PtmSlot {
  if (slot.status !== 'booked') {
    throw new Error('This meeting is not booked.');
  }
  if (slot.bookedByUserId !== actorUserId) {
    throw new Error('You can only cancel your own booking.');
  }

  return {
    ...slot,
    status: 'available',
    bookedByUserId: null,
    bookedStudentId: null,
    bookedForName: null,
    bookedAt: null
  };
}

/**
 * Booked slots falling on `today` that a notification should fire for:
 * the caller's own bookings plus, when the caller is faculty, the slots in
 * their diary. Deduped by the caller so the bell never repeats within a
 * session.
 */
export function dayOfReminders(
  slots: PtmSlot[],
  opts: { userId?: string; teacherId?: string; today: string }
): PtmSlot[] {
  return slots
    .filter(s => {
      if (s.status !== 'booked' || slotDay(s) !== opts.today) return false;
      if (opts.userId && s.bookedByUserId === opts.userId) return true;
      if (opts.teacherId && s.teacherId === opts.teacherId) return true;
      return false;
    })
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

/** Teacher display name for a slot (falls back to a neutral label). */
export function teacherNameFor(teachers: Teacher[], teacherId: string): string {
  return teachers.find(t => t.id === teacherId)?.name || 'Faculty';
}
