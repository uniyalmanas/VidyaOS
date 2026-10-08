/**
 * PTM scheduler slice (F8).
 *
 * Owns `ptmEvents` + `ptmSlots`: an admin opens a meeting window
 * (`createEvent`) and its grid is cut into fixed-length slots per teacher
 * (`generateSlots`). Parents/students claim a free slot one at a time
 * (`bookSlot`, transaction-guarded against double-booking) and can release
 * their own booking (`cancelBooking`) so the slot is free again. Follows the
 * exact slice shape of `StaffOpsContext` (state + realtime subscribe + tenant
 * filter); booking goes through `bookPtmSlotInTransaction` so the friendly
 * "just taken" error is decided by the same `applyBooking` the unit tests run.
 */

import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import { Organization, PtmEvent, PtmEventInput, PtmSlot, User } from '../../types';
import { MOCK_PTM_EVENTS, MOCK_PTM_SLOTS } from '../../data/mockData';
import {
  subscribeToPtmEvents,
  subscribeToPtmSlots,
  persistPtmEventToFirestore,
  persistPtmSlotsBatch,
  deletePtmEventFromFirestore,
  deletePtmSlotFromFirestore,
  bookPtmSlotInTransaction,
  cancelPtmBookingInFirestore
} from '../../lib/firestoreService';
import {
  generatePtmSlots,
  validatePtmEvent,
  dayOfReminders,
  formatSlotRange,
  bookingsForUser,
  slotsForTeacher,
  teacherNameFor,
  PTM_DEFAULT_SLOT_MINUTES
} from '../../lib/ptm';
import { getIndiaDateString } from '../../lib/date';
import { useAcademics } from './AcademicContext';
import { useCommunication } from './CommunicationContext';
import { useAuditLog } from './AuditContext';

/** `{ ok: true, slot }` on success, `{ ok: false, error }` for the UI toast. */
export type PtmBookingResult = { ok: true; slot: PtmSlot } | { ok: false; error: string };

export interface PtmCreateResult {
  event: PtmEvent | null;
  error: string | null;
}

export interface PtmContextType {
  ptmEvents: PtmEvent[];
  ptmSlots: PtmSlot[];
  /** Validates + opens a PTM window, then cuts its grid (staff/admin). */
  createEvent: (input: PtmEventInput) => PtmCreateResult;
  /** Re-cut an event's grid — only ever ADDS missing slots, never overwrites. */
  generateSlots: (eventId: string) => PtmSlot[];
  /** Claim a row's free slot inside a Firestore transaction (no double-book). */
  bookSlot: (slotId: string, studentId: string, studentName: string) => Promise<PtmBookingResult>;
  /** Release your own booking; the slot immediately goes back to 'available'. */
  cancelBooking: (slotId: string) => Promise<PtmBookingResult>;
  /** Desk-only removal of an event and its whole grid. */
  deleteEvent: (eventId: string) => void;
  /** Slots the current account has booked (parent/student helper). */
  myBookings: PtmSlot[];
  /** The current teacher's own diary column (faculty helper, empty otherwise). */
  myTeacherSlots: PtmSlot[];
}

const PtmContext = createContext<PtmContextType | undefined>(undefined);

interface PtmProviderProps {
  currentOrg: Organization;
  selectedBranchId: string;
  currentUser: User;
  isPlatformOwner: boolean;
  children: React.ReactNode;
}

export const PtmProvider: React.FC<PtmProviderProps> = ({
  currentOrg,
  selectedBranchId,
  currentUser,
  isPlatformOwner,
  children
}) => {
  const { teachers } = useAcademics();
  const { pushNotification } = useCommunication();
  const { recordAudit } = useAuditLog();

  const canAudit =
    currentUser.role === 'CENTER_ADMIN' ||
    currentUser.role === 'STAFF' ||
    currentUser.role === 'PLATFORM_OWNER';

  // DEV-only localStorage mirror — production reads Firestore only.
  const [ptmEvents, setPtmEvents] = useState<PtmEvent[]>(() => {
    return import.meta.env.DEV ? MOCK_PTM_EVENTS : [];
  });
  const [ptmSlots, setPtmSlots] = useState<PtmSlot[]>(() => {
    return import.meta.env.DEV ? MOCK_PTM_SLOTS : [];
  });

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    try {
      localStorage.setItem('vidyaos_ptm_events', JSON.stringify(ptmEvents));
      localStorage.setItem('vidyaos_ptm_slots', JSON.stringify(ptmSlots));
    } catch {
      /* quota / private-mode — non-fatal */
    }
  }, [ptmEvents, ptmSlots]);

  // Real-time Firestore subscriptions. A TEACHER session additionally pins the
  // slot query to their own record id because the `ptmSlots` read rule only
  // lets faculty through when the query does (see firestore.rules).
  useEffect(() => {
    const targetOrg = isPlatformOwner ? undefined : currentOrg.id;
    const myTeacher = teachers.find(t => t.userId === currentUser.id);
    const teacherId = currentUser.role === 'TEACHER' && myTeacher ? myTeacher.id : undefined;

    const unsubEvents = subscribeToPtmEvents(data => {
      if (data) setPtmEvents(data);
    }, targetOrg);
    const unsubSlots = subscribeToPtmSlots(
      data => {
        if (data) setPtmSlots(data);
      },
      targetOrg,
      teacherId
    );
    return () => {
      unsubEvents();
      unsubSlots();
    };
  }, [currentOrg.id, isPlatformOwner, teachers, currentUser.id, currentUser.role]);

  // Multi-tenant isolation, identical to the other slices.
  const tenantEvents = useMemo(() => {
    if (isPlatformOwner) return ptmEvents;
    return ptmEvents.filter(
      e => e.orgId === currentOrg.id && (selectedBranchId === 'all' || e.branchId === selectedBranchId)
    );
  }, [ptmEvents, currentOrg.id, isPlatformOwner, selectedBranchId]);

  const tenantSlots = useMemo(() => {
    if (isPlatformOwner) return ptmSlots;
    return ptmSlots.filter(
      s => s.orgId === currentOrg.id && (selectedBranchId === 'all' || s.branchId === selectedBranchId)
    );
  }, [ptmSlots, currentOrg.id, isPlatformOwner, selectedBranchId]);

  const myBookings = useMemo(
    () => bookingsForUser(tenantSlots, currentUser.id),
    [tenantSlots, currentUser.id]
  );

  const myTeacherId = useMemo(
    () => teachers.find(t => t.userId === currentUser.id)?.id,
    [teachers, currentUser.id]
  );

  const myTeacherSlots = useMemo(
    () => (currentUser.role === 'TEACHER' && myTeacherId ? slotsForTeacher(tenantSlots, myTeacherId) : []),
    [tenantSlots, currentUser.role, myTeacherId]
  );

  const createEvent = (input: PtmEventInput): PtmCreateResult => {
    const error = validatePtmEvent(input);
    if (error) return { event: null, error };

    const event: PtmEvent = {
      id: `ptm-${Date.now().toString(36)}`,
      orgId: currentOrg.id,
      branchId:
        selectedBranchId !== 'all' ? selectedBranchId : currentOrg.branches[0]?.id || 'branch-main',
      title: input.title.trim(),
      date: input.date,
      startTime: input.startTime,
      endTime: input.endTime,
      slotMinutes: input.slotMinutes || PTM_DEFAULT_SLOT_MINUTES,
      teacherIds: input.teacherIds,
      notes: input.notes?.trim() || undefined,
      createdBy: currentUser.id,
      createdAt: new Date().toISOString()
    };

    setPtmEvents(prev => [event, ...prev]);
    persistPtmEventToFirestore(event).catch(() => {});
    generateSlots(event.id);
    if (canAudit) {
      recordAudit({
        action: 'create',
        targetType: 'ptm',
        targetId: event.id,
        summary: `Opened PTM “${event.title}” on ${event.date} (${event.startTime}–${event.endTime}) for ${event.teacherIds.length} teacher(s).`,
        branchId: event.branchId
      });
    }
    return { event, error: null };
  };

  const generateSlots = (eventId: string): PtmSlot[] => {
    const event = ptmEvents.find(e => e.id === eventId);
    if (!event) return [];
    const generated = generatePtmSlots(event);
    const fresh = generated.filter(slot => !ptmSlots.some(existing => existing.id === slot.id));
    if (fresh.length > 0) {
      setPtmSlots(prev => {
        const ids = new Set(prev.map(s => s.id));
        return [...prev, ...fresh.filter(s => !ids.has(s.id))];
      });
      persistPtmSlotsBatch(fresh).catch(() => {});
    }
    return fresh;
  };

  const bookSlot = async (
    slotId: string,
    studentId: string,
    studentName: string
  ): Promise<PtmBookingResult> => {
    try {
      const booked = await bookPtmSlotInTransaction(slotId, {
        userId: currentUser.id,
        studentId,
        studentName,
        nowIso: new Date().toISOString()
      });
      setPtmSlots(prev => prev.map(s => (s.id === slotId ? booked : s)));

      // Notify the teacher the family is coming (unless the booker IS them).
      const teacher = teachers.find(t => t.id === booked.teacherId);
      if (teacher?.userId && teacher.userId !== currentUser.id) {
        pushNotification(
          teacher.userId,
          'New PTM booking',
          `${booked.bookedForName} · ${formatSlotRange(booked)} — slot reserved.`,
          'schedule'
        );
      }
      pushNotification(
        currentUser.id,
        'PTM slot booked',
        `Your meeting with ${teacherNameFor(teachers, booked.teacherId)} is confirmed for ${formatSlotRange(booked)}.`,
        'schedule'
      );
      return { ok: true, slot: booked };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Could not book that slot.' };
    }
  };

  const cancelBooking = async (slotId: string): Promise<PtmBookingResult> => {
    const slot = ptmSlots.find(s => s.id === slotId);
    if (!slot) return { ok: false, error: 'Meeting slot not found.' };
    if (slot.status !== 'booked' || slot.bookedByUserId !== currentUser.id) {
      return { ok: false, error: 'You can only cancel your own booking.' };
    }
    try {
      const released = await cancelPtmBookingInFirestore(slot);
      setPtmSlots(prev => prev.map(s => (s.id === slotId ? released : s)));

      const teacher = teachers.find(t => t.id === slot.teacherId);
      if (teacher?.userId && teacher.userId !== currentUser.id) {
        pushNotification(
          teacher.userId,
          'PTM booking cancelled',
          `${slot.bookedForName || 'A family'} released ${formatSlotRange(slot)} — the slot is open again.`,
          'schedule'
        );
      }
      return { ok: true, slot: released };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Could not cancel that booking.' };
    }
  };

  const deleteEvent = (eventId: string) => {
    const doomedSlots = ptmSlots.filter(s => s.eventId === eventId);
    const event = ptmEvents.find(e => e.id === eventId);
    setPtmEvents(prev => prev.filter(e => e.id !== eventId));
    setPtmSlots(prev => prev.filter(s => s.eventId !== eventId));
    deletePtmEventFromFirestore(eventId).catch(() => {});
    doomedSlots.forEach(s => deletePtmSlotFromFirestore(s.id).catch(() => {}));
    if (canAudit && event) {
      recordAudit({
        action: 'delete',
        targetType: 'ptm',
        targetId: eventId,
        summary: `Removed PTM “${event.title}” (${event.date}) and its ${doomedSlots.length} slot(s).`,
        branchId: event.branchId
      });
    }
  };

  // Day-of reminder: announce every booked slot that falls on today — the
  // caller's own meetings and, for faculty, today's diary. Deduped per slot id
  // for the session so the bell doesn't repeat on every snapshot tick.
  const remindedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const today = getIndiaDateString(new Date());
    const due = dayOfReminders(tenantSlots, {
      userId: currentUser.id,
      teacherId: currentUser.role === 'TEACHER' ? myTeacherId : undefined,
      today
    });
    due.forEach(slot => {
      if (remindedRef.current.has(slot.id)) return;
      remindedRef.current.add(slot.id);
      const mine = slot.bookedByUserId === currentUser.id;
      pushNotification(
        currentUser.id,
        'PTM today',
        mine
          ? `Your meeting with ${teacherNameFor(teachers, slot.teacherId)} is at ${formatSlotRange(slot)}.`
          : `${slot.bookedForName || 'A family'} meets you at ${formatSlotRange(slot)}.`,
        'schedule'
      );
    });
  }, [tenantSlots, currentUser.id, currentUser.role, myTeacherId, teachers, pushNotification]);

  return (
    <PtmContext.Provider
      value={{
        ptmEvents: tenantEvents,
        ptmSlots: tenantSlots,
        createEvent,
        generateSlots,
        bookSlot,
        cancelBooking,
        deleteEvent,
        myBookings,
        myTeacherSlots
      }}
    >
      {children}
    </PtmContext.Provider>
  );
};

export const usePtm = () => {
  const context = useContext(PtmContext);
  if (!context) {
    throw new Error('usePtm must be used within a PtmProvider');
  }
  return context;
};