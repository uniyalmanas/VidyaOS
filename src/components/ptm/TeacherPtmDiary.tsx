import React, { useMemo } from 'react';
import { CalendarClock, UserRound, StickyNote } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ConsoleCard, StatusChip } from '../ui';
import { formatSlotRange } from '../../lib/ptm';
import { getIndiaDateString } from '../../lib/date';

/**
 * F8 — the teacher's own PTM diary. Only slots pinned to THEIR teacher record
 * are visible (the rules cut other diaries out at the query level); upcoming
 * meetings are listed first, day-of bookings get a "Today" chip, and the slot
 * is still usable once the day is over.
 */
export const TeacherPtmDiary: React.FC = () => {
  const { myTeacherSlots, ptmEvents, teachers } = useApp();

  const today = useMemo(() => getIndiaDateString(new Date()), []);

  const eventTitle = (eventId: string) =>
    ptmEvents.find(e => e.id === eventId)?.title || 'PTM';

  const bookings = useMemo(
    () =>
      myTeacherSlots
        .filter(s => s.status === 'booked' && s.startsAt.split('T')[0] >= today)
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
    [myTeacherSlots, today]
  );

  const past = useMemo(
    () =>
      myTeacherSlots
        .filter(s => s.status === 'booked' && s.startsAt.split('T')[0] < today)
        .sort((a, b) => b.startsAt.localeCompare(a.startsAt)),
    [myTeacherSlots, today]
  );

  const pendingCount = bookings.length;

  const meetingRow = (slot: (typeof bookings)[number]) => {
    const isToday = slot.startsAt.split('T')[0] === today;
    return (
      <div
        key={slot.id}
        className="p-3.5 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-black/[0.02] dark:bg-[#1C1C1E] flex items-center justify-between gap-3 text-xs"
      >
        <div className="min-w-0 space-y-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-sm text-slate-900 dark:text-white">
              {slot.bookedForName || 'Family'}
            </span>
            {isToday && <StatusChip label="TODAY" variant="success" size="xs" />}
          </div>
          <div className="text-slate-500 dark:text-neutral-400 tabular-nums">
            {formatSlotRange(slot)} · {slot.startsAt.split('T')[0]}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-neutral-400 flex items-center gap-1.5">
            <StickyNote className="w-3 h-3" />
            {eventTitle(slot.eventId)}
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-neutral-400 flex-shrink-0">
          <UserRound className="w-3.5 h-3.5" />
          {slot.bookedForName ? `${(slot.bookedForName || '').split(' ')[0]}'s parent` : 'Booked'}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <ConsoleCard
        title="My PTM meetings"
        subtitle={
          pendingCount > 0
            ? `${pendingCount} meeting${pendingCount === 1 ? '' : 's'} coming up`
            : 'No upcoming meetings — parents will book slots from the grid.'
        }
        icon={<CalendarClock className="w-4 h-4 text-[#1A73E8]" />}
        action={
          pendingCount > 0 ? (
            <StatusChip label={`${pendingCount} UPCOMING`} variant="success" size="xs" />
          ) : undefined
        }
      >
        {bookings.length === 0 ? (
          <div className="text-xs text-slate-500 dark:text-neutral-400">
            Nothing booked yet. When the centre opens a PTM window, parents pick a time from your
            column and it shows up here — with a bell notification the day of the meeting.
          </div>
        ) : (
          <div className="space-y-2">{bookings.map(meetingRow)}</div>
        )}
      </ConsoleCard>

      {past.length > 0 && (
        <ConsoleCard
          title="Past meetings"
          subtitle="Completed PTM sessions"
          icon={<CalendarClock className="w-4 h-4 text-[#9AA0A6]" />}
        >
          <div className="space-y-2">{past.map(meetingRow)}</div>
        </ConsoleCard>
      )}
    </div>
  );
};