import React, { useMemo, useState } from 'react';
import { CalendarClock, Check, X, Users, UserRound } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ConsoleCard, ConsoleButton } from '../ui';
import { PtmSlot } from '../../types';
import { bookableSlots, formatSlotRange, teacherNameFor } from '../../lib/ptm';
import { getIndiaDateString } from '../../lib/date';

/**
 * F8 — parent booking flow. Pick an open meeting window, then a teacher, then
 * one of their free times. The claim runs inside a Firestore transaction, so
 * if another family grabbed the same minute the app says so instead of
 * double-booking. Existing bookings can be released to free the slot again.
 */
export const ParentPtmBooking: React.FC = () => {
  const {
    ptmEvents,
    ptmSlots,
    teachers,
    selectedChild,
    myBookings,
    bookSlot,
    cancelBooking,
    showToast
  } = useApp();

  const [chosenEventId, setChosenEventId] = useState<string>('');
  const [chosenTeacherId, setChosenTeacherId] = useState<string>('');
  const [busySlotId, setBusySlotId] = useState<string | null>(null);

  const today = useMemo(() => getIndiaDateString(new Date()), []);

  // Upcoming windows only, soonest first.
  const upcoming = useMemo(
    () =>
      [...ptmEvents]
        .filter(e => e.date >= today)
        .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime)),
    [ptmEvents, today]
  );

  const chosenEvent = upcoming.find(e => e.id === chosenEventId) || upcoming[0];

  const chosenEventSlots = useMemo(
    () => ptmSlots.filter(s => s.eventId === chosenEvent?.id),
    [ptmSlots, chosenEvent]
  );

  // Free times for the picked teacher (default: the first teacher of the event).
  const freeSlots = useMemo(() => {
    if (!chosenEvent) return [];
    const teacherId = chosenTeacherId || chosenEvent.teacherIds[0];
    return bookableSlots(chosenEventSlots, teacherId);
  }, [chosenEvent, chosenEventSlots, chosenTeacherId]);

  const eventTeacherNames = (eventId: string) => {
    const event = ptmEvents.find(e => e.id === eventId);
    return event ? event.teacherIds.map(id => teacherNameFor(teachers, id)).join(', ') : '';
  };

  const claim = async (slot: PtmSlot) => {
    if (!selectedChild) return;
    setBusySlotId(slot.id);
    const result = await bookSlot(slot.id, selectedChild.id, selectedChild.name);
    setBusySlotId(null);
    if (result.ok) {
      showToast(
        `Meeting booked for ${selectedChild.name} · ${formatSlotRange(result.slot)}.`,
        'success'
      );
    } else {
      showToast(result.error, 'error');
    }
  };

  const release = async (slot: PtmSlot) => {
    setBusySlotId(slot.id);
    const result = await cancelBooking(slot.id);
    setBusySlotId(null);
    if (result.ok) {
      showToast(`Booking released — ${formatSlotRange(slot)} is open again.`, 'success');
    } else {
      showToast(result.error, 'error');
    }
  };

  if (!selectedChild) {
    return (
      <ConsoleCard title="Schedule a Meeting">
        <p className="text-xs text-slate-500 dark:text-neutral-400">
          Link a student to this parent account to book meetings.
        </p>
      </ConsoleCard>
    );
  }

  return (
    <div className="space-y-5">
      {/* My existing bookings (across all children) */}
      {myBookings.length > 0 && (
        <ConsoleCard
          title={`Your booked meetings (${myBookings.length})`}
          subtitle="Need to reschedule? Release a booking and pick a fresh time."
          icon={<CalendarClock className="w-4 h-4 text-[#FFA000]" />}
        >
          <div className="space-y-2">
            {myBookings.map(slot => {
              const event = ptmEvents.find(e => e.id === slot.eventId);
              const past = slotDayBefore(slot, today);
              return (
                <div
                  key={slot.id}
                  className="p-3 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-black/[0.02] dark:bg-[#1C1C1E] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="font-bold text-sm text-slate-900 dark:text-white">
                      {teacherNameFor(teachers, slot.teacherId)}
                      <span className="font-normal text-slate-500 dark:text-neutral-400">
                        {' '}
                        · {formatSlotRange(slot)}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-neutral-400">
                      {event?.title || 'PTM'} · {slot.bookedForName || 'Your child'}
                      {slot.startsAt.split('T')[0] === today ? ' · Today!' : ''}
                    </div>
                  </div>
                  {!past && (
                    <ConsoleButton
                      variant="secondary"
                      size="xs"
                      icon={<X className="w-3 h-3" />}
                      onClick={() => release(slot)}
                      disabled={busySlotId === slot.id}
                    >
                      Release
                    </ConsoleButton>
                  )}
                </div>
              );
            })}
          </div>
        </ConsoleCard>
      )}

      {/* Pick an event */}
      <ConsoleCard
        title={`Schedule a meeting for ${selectedChild.name}`}
        subtitle={`${selectedChild.classGrade} · ${selectedChild.board}`}
        icon={<CalendarClock className="w-4 h-4 text-[#1A73E8]" />}
      >
        {upcoming.length === 0 ? (
          <div className="text-xs text-slate-500 dark:text-neutral-400 flex items-center gap-2">
            <CalendarClock className="w-4 h-4" />
            The centre hasn't opened a meeting window yet — check back soon.
          </div>
        ) : (
          <div className="space-y-4">
            {/* Event picker */}
            <div className="flex flex-wrap gap-2">
              {upcoming.map(event => (
                <button
                  key={event.id}
                  onClick={() => {
                    setChosenEventId(event.id);
                    setChosenTeacherId('');
                  }}
                  className={`px-3.5 py-2 rounded-xl border text-xs font-semibold transition cursor-pointer text-left ${
                    chosenEvent?.id === event.id
                      ? 'bg-[#1A73E8] text-white border-[#1A73E8]'
                      : 'bg-white dark:bg-[#282A2C] text-slate-600 dark:text-neutral-300 border-black/[0.12] dark:border-white/[0.15] hover:border-[#1A73E8]/50'
                  }`}
                >
                  <div>{event.title}</div>
                  <div className={`text-[10px] font-normal opacity-75 tabular-nums`}>
                    {event.date} · {event.startTime} – {event.endTime}
                  </div>
                  <div className={`text-[10px] font-normal opacity-75`}>
                    {eventTeacherNames(event.id)}
                  </div>
                </button>
              ))}
            </div>

            {chosenEvent && (
              <>
                {/* Teacher picker */}
                <div>
                  <div className="text-[11px] font-semibold text-slate-500 dark:text-neutral-400 mb-1.5">
                    Choose a teacher
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {chosenEvent.teacherIds.map(teacherId => (
                      <button
                        key={teacherId}
                        onClick={() => setChosenTeacherId(teacherId)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer border ${
                          (chosenTeacherId || chosenEvent.teacherIds[0]) === teacherId
                            ? 'bg-[#1A73E8] text-white border-[#1A73E8]'
                            : 'bg-white dark:bg-[#282A2C] text-slate-600 dark:text-neutral-300 border-black/[0.12] dark:border-white/[0.15] hover:border-[#1A73E8]/50'
                        }`}
                      >
                        <UserRound className="w-3 h-3" />
                        {teacherNameFor(teachers, teacherId)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Free slot grid */}
                <div>
                  <div className="text-[11px] font-semibold text-slate-500 dark:text-neutral-400 mb-1.5 flex items-center gap-1.5">
                    <Users className="w-3 h-3" />
                    Free times with {teacherNameFor(teachers, chosenTeacherId || chosenEvent.teacherIds[0])}
                    <span className="font-normal text-slate-400">({freeSlots.length} open)</span>
                  </div>
                  {freeSlots.length === 0 ? (
                    <p className="text-[11px] text-slate-500 dark:text-neutral-400">
                      No free slots left with this teacher — pick another teacher or a different
                      window.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {freeSlots.map(slot => (
                        <button
                          key={slot.id}
                          onClick={() => claim(slot)}
                          disabled={busySlotId === slot.id}
                          className="px-3 py-2 rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50/70 dark:bg-blue-950/30 text-blue-900 dark:text-blue-300 text-xs font-bold tabular-nums transition hover:border-[#1A73E8] hover:bg-[#1A73E8] hover:text-white cursor-pointer disabled:opacity-50"
                        >
                          {busySlotId === slot.id ? 'Booking…' : formatSlotRange(slot)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {chosenEvent.notes && (
                  <p className="text-[11px] text-slate-500 dark:text-neutral-400 border-l-2 border-amber-400 pl-2">
                    {chosenEvent.notes}
                  </p>
                )}
              </>
            )}
          </div>
        )}
      </ConsoleCard>

      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-neutral-500">
        <Check className="w-3.5 h-3.5" />
        One family per slot — the same minute can't be double-booked. Release any booking to free it
        for another family.
      </div>
    </div>
  );
};

function slotDayBefore(slot: PtmSlot, today: string): boolean {
  return slot.startsAt.split('T')[0] < today;
}