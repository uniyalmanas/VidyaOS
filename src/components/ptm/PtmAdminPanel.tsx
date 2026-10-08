import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CalendarClock, Plus, Trash2, Users, Check } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ConsoleCard, ConsoleButton, StatusChip } from '../ui';
import { PtmEvent, PtmEventInput, PtmSlot, Teacher } from '../../types';
import {
  formatSlotRange,
  PTM_DEFAULT_SLOT_MINUTES,
  PTM_MIN_SLOT_MINUTES,
  PTM_MAX_SLOT_MINUTES,
  slotsForTeacher,
  PTM_SLOT_STATUS_LABEL
} from '../../lib/ptm';
import { getIndiaDateString } from '../../lib/date';

const field =
  'w-full rounded-lg border border-black/[0.12] dark:border-white/[0.15] bg-white dark:bg-[#282A2C] px-3 py-2 text-xs text-[#1D1D1F] dark:text-[#F5F5F7] outline-none focus:ring-2 focus:ring-[#1A73E8]/40';

const slotChip = (slot: PtmSlot): string => {
  if (slot.status === 'booked') {
    return 'border-emerald-300 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300';
  }
  if (slot.status === 'cancelled') {
    return 'border-black/[0.08] dark:border-white/[0.08] bg-black/[0.03] dark:bg-white/[0.03] text-[#9AA0A6] line-through';
  }
  return 'border-blue-200 dark:border-blue-900 bg-blue-50/70 dark:bg-blue-950/30 text-blue-900 dark:text-blue-300';
};

/** F8 — desk view of the PTM scheduler: open a window, watch the grid fill. */
export const PtmAdminPanel: React.FC = () => {
  const { ptmEvents, ptmSlots, teachers, selectedBranchId, createEvent, deleteEvent, showToast } =
    useApp();

  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(() =>
    getIndiaDateString(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000))
  );
  const [startTime, setStartTime] = useState('16:00');
  const [endTime, setEndTime] = useState('18:00');
  const [slotMinutes, setSlotMinutes] = useState(PTM_DEFAULT_SLOT_MINUTES);
  const [pickedTeachers, setPickedTeachers] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Only faculty belonging to the current branch filter (org-wide otherwise).
  const candidateTeachers = useMemo(
    () =>
      teachers.filter(
        t => selectedBranchId === 'all' || t.branchId === selectedBranchId || !t.branchId
      ),
    [teachers, selectedBranchId]
  );

  const sortableEvents = useMemo(
    () => [...ptmEvents].sort((a, b) => a.date.localeCompare(b.date)),
    [ptmEvents]
  );

  const toggleTeacher = (teacherId: string) => {
    setPickedTeachers(prev =>
      prev.includes(teacherId) ? prev.filter(id => id !== teacherId) : [...prev, teacherId]
    );
  };

  const submit = () => {
    const result = createEvent({
      title,
      date,
      startTime,
      endTime,
      slotMinutes,
      teacherIds: pickedTeachers,
      notes: notes || undefined
    } satisfies PtmEventInput);
    if (result.error) {
      setFormError(result.error);
      return;
    }
    if (result.event) {
      const event = result.event;
      showToast(`PTM opened: ${event.title} on ${event.date} — parents can book now.`, 'success');
      setShowCreate(false);
      setFormError(null);
      setTitle('');
      setNotes('');
      setPickedTeachers([]);
    }
  };

  const removeEvent = (event: PtmEvent) => {
    if (window.confirm(`Remove "${event.title}" and its whole slot grid?`)) {
      deleteEvent(event.id);
      showToast('PTM event and its slot grid removed.', 'info');
    }
  };

  const gridFreeCount = (eventId: string) =>
    ptmSlots.filter(s => s.eventId === eventId && s.status === 'available').length;

  return (
    <div className="space-y-5">
      {/* Header + open-new action */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="font-apple-display font-bold text-base text-slate-900 dark:text-white">
            Parent–Teacher Meetings
          </div>
          <p className="text-xs text-slate-500 dark:text-neutral-400">
            Open a meeting window; the grid auto-cuts into {PTM_DEFAULT_SLOT_MINUTES}-minute slots per
            teacher for parents to claim.
          </p>
        </div>
        <ConsoleButton
          variant="primary"
          size="sm"
          icon={<Plus className="w-3.5 h-3.5" />}
          onClick={() => setShowCreate(v => !v)}
        >
          {showCreate ? 'Close form' : 'Open PTM'}
        </ConsoleButton>
      </div>

      {/* Create-event form */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <ConsoleCard
              title="Open a Parent–Teacher Meeting"
              subtitle={`Parents will book a ${slotMinutes}-minute slot with the teachers you invite.`}
              icon={<CalendarClock className="w-4 h-4 text-[#1A73E8]" />}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="lg:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-500 dark:text-neutral-400 mb-1">
                    Title
                  </label>
                  <input
                    className={field}
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="Parent–Teacher Meeting (October)"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 dark:text-neutral-400 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    className={field}
                    value={date}
                    onChange={e => setDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 dark:text-neutral-400 mb-1">
                    Slot length
                  </label>
                  <select
                    className={field}
                    value={slotMinutes}
                    onChange={e => setSlotMinutes(Number(e.target.value))}
                  >
                    {[10, 15, 20, 30, 45, 60]
                      .filter(m => m >= PTM_MIN_SLOT_MINUTES && m <= PTM_MAX_SLOT_MINUTES)
                      .map(m => (
                        <option key={m} value={m}>
                          {m} minutes
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 dark:text-neutral-400 mb-1">
                    Window start
                  </label>
                  <input
                    type="time"
                    className={field}
                    value={startTime}
                    onChange={e => setStartTime(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 dark:text-neutral-400 mb-1">
                    Window end
                  </label>
                  <input
                    type="time"
                    className={field}
                    value={endTime}
                    onChange={e => setEndTime(e.target.value)}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-500 dark:text-neutral-400 mb-1">
                    Notes for parents (optional)
                  </label>
                  <input
                    className={field}
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="e.g. Discuss Term 1 progress and the pre-board plan."
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-neutral-400 mb-1.5">
                  Invite teachers ({pickedTeachers.length} selected)
                </label>
                <div className="flex flex-wrap gap-2">
                  {candidateTeachers.map(t => (
                    <button
                      key={t.id}
                      onClick={() => toggleTeacher(t.id)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer border ${
                        pickedTeachers.includes(t.id)
                          ? 'bg-[#1A73E8] text-white border-[#1A73E8]'
                          : 'bg-white dark:bg-[#282A2C] text-slate-600 dark:text-neutral-300 border-black/[0.12] dark:border-white/[0.15] hover:border-[#1A73E8]/50'
                      }`}
                    >
                      {pickedTeachers.includes(t.id) ? (
                        <Check className="w-3 h-3" />
                      ) : (
                        <Users className="w-3 h-3" />
                      )}
                      {t.name}
                      {t.subjects?.length > 0 && (
                        <span className="opacity-70 text-[10px] font-normal">{t.subjects[0]}</span>
                      )}
                    </button>
                  ))}
                  {candidateTeachers.length === 0 && (
                    <p className="text-[11px] text-slate-500 dark:text-neutral-400">
                      Add a teacher in the Faculty module first.
                    </p>
                  )}
                </div>
              </div>

              {formError && (
                <p className="mt-3 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                  {formError}
                </p>
              )}

              <div className="mt-4 flex items-center gap-2">
                <ConsoleButton
                  variant="primary"
                  size="sm"
                  icon={<Check className="w-3.5 h-3.5" />}
                  onClick={submit}
                  disabled={candidateTeachers.length === 0}
                >
                  Open Meeting
                </ConsoleButton>
                <ConsoleButton variant="secondary" size="sm" onClick={() => setShowCreate(false)}>
                  Cancel
                </ConsoleButton>
              </div>
            </ConsoleCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Events + grids */}
      {sortableEvents.length === 0 ? (
        <ConsoleCard title="No PTM windows open yet" subtitle="Parents wait on this grid to book time with the teachers.">
          <div className="text-xs text-slate-500 dark:text-neutral-400 flex items-center gap-2">
            <CalendarClock className="w-4 h-4" />
            Use “Open PTM” above to schedule the first parent–teacher meeting of the term.
          </div>
        </ConsoleCard>
      ) : (
        sortableEvents.map(event => {
          const eventSlots = ptmSlots.filter(s => s.eventId === event.id);
          const available = gridFreeCount(event.id);
          const total = eventSlots.length;
          return (
            <ConsoleCard
              key={event.id}
              title={event.title}
              subtitle={`${event.date} · ${event.startTime} – ${event.endTime} · ${total} slot${total === 1 ? '' : 's'}, ${available} open`}
              icon={<CalendarClock className="w-4 h-4 text-[#FFA000]" />}
              action={
                <ConsoleButton
                  variant="ghost"
                  size="xs"
                  icon={<Trash2 className="w-3 h-3" />}
                  onClick={() => removeEvent(event)}
                >
                  Remove
                </ConsoleButton>
              }
            >
              {event.notes && (
                <p className="text-[11px] text-slate-500 dark:text-neutral-400 mb-3">{event.notes}</p>
              )}
              <div className="space-y-4">
                {event.teacherIds.map(teacherId => {
                  const teacher = teachers.find(t => t.id === teacherId);
                  const column = slotsForTeacher(eventSlots, teacherId);
                  return (
                    <div key={teacherId}>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {teacher?.name || 'Faculty'}
                        </span>
                        {teacher?.subjects?.[0] && (
                          <StatusChip label={teacher.subjects[0]} variant="neutral" size="xs" />
                        )}
                        <span className="text-[10px] text-slate-400 dark:text-neutral-500">
                          {column.filter(s => s.status === 'booked').length} booked
                        </span>
                      </div>
                      {column.length === 0 ? (
                        <p className="text-[11px] text-slate-400 dark:text-neutral-500">
                          No slots — the window is shorter than one {event.slotMinutes}-minute slot.
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {column.map(slot => (
                            <div
                              key={slot.id}
                              title={
                                slot.status === 'booked'
                                  ? `${slot.bookedForName || 'Booked'} · booked ${slot.bookedAt || ''}`
                                  : PTM_SLOT_STATUS_LABEL[slot.status]
                              }
                              className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold tabular-nums ${slotChip(
                                slot
                              )}`}
                            >
                              <div>{formatSlotRange(slot)}</div>
                              <div className="font-normal opacity-80 text-[10px]">
                                {slot.status === 'booked'
                                  ? slot.bookedForName || 'Booked'
                                  : PTM_SLOT_STATUS_LABEL[slot.status]}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </ConsoleCard>
          );
        })
      )}
    </div>
  );
};