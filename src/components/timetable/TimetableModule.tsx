import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus,
  Trash2,
  Pencil,
  AlertCircle,
  Video,
  Copy,
  Check,
  Clock,
  Users,
  DoorOpen,
  CalendarDays
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ConsoleCard, ConsoleButton } from '../ui';
import { TimetableSlot } from '../../types';
import { getIndiaDayName } from '../../lib/date';
import {
  TIMETABLE_DAYS,
  DAY_SHORT,
  findTimetableClashes,
  formatSlotRange,
  meetProviderLabel,
  normalizeMeetUrl,
  slotsForDay,
  validateTimetableSlot
} from '../../lib/timetable';

type FormState = {
  batchId: string;
  teacherId: string;
  subject: string;
  dayOfWeek: TimetableSlot['dayOfWeek'];
  startTime: string;
  endTime: string;
  classroom: string;
  meetUrl: string;
  meetPassword: string;
};

const EMPTY_FORM: FormState = {
  batchId: '',
  teacherId: '',
  subject: '',
  dayOfWeek: 'Monday',
  startTime: '17:00',
  endTime: '18:30',
  classroom: '',
  meetUrl: '',
  meetPassword: ''
};

const field =
  'w-full border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2C] text-[#202124] dark:text-[#E8EAED] rounded-lg p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#1A73E8]/40';

/**
 * F6 — the admin's weekly timetable: a Monday–Saturday board of classes, each
 * optionally carrying a Google Meet / Zoom link that students and parents open
 * with one "Join Class" tap. The editor warns about faculty/room/batch clashes
 * before saving.
 */
export const TimetableModule: React.FC = () => {
  const {
    timetableSlots,
    batches,
    teachers,
    addTimetableSlot,
    updateTimetableSlot,
    deleteTimetableSlot,
    showToast
  } = useApp();

  const todayDay = getIndiaDayName();
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TimetableSlot | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const batchName = (id: string) => batches.find(b => b.id === id)?.name || 'Batch';
  const teacherName = (id: string) => teachers.find(t => t.id === id)?.name || 'Unassigned';

  const liveCount = useMemo(
    () => timetableSlots.filter(s => !!normalizeMeetUrl(s.meetUrl)).length,
    [timetableSlots]
  );

  const openAdd = (day?: TimetableSlot['dayOfWeek']) => {
    setEditingId(null);
    setForm({
      ...EMPTY_FORM,
      dayOfWeek: day || 'Monday',
      batchId: batches[0]?.id || '',
      teacherId: teachers[0]?.id || ''
    });
    setFormError(null);
    setFormOpen(true);
  };

  const openEdit = (slot: TimetableSlot) => {
    setEditingId(slot.id);
    setForm({
      batchId: slot.batchId,
      teacherId: slot.teacherId,
      subject: slot.subject,
      dayOfWeek: slot.dayOfWeek,
      startTime: slot.startTime,
      endTime: slot.endTime,
      classroom: slot.classroom,
      meetUrl: slot.meetUrl || '',
      meetPassword: slot.meetPassword || ''
    });
    setFormError(null);
    setFormOpen(true);
  };

  const submitForm = () => {
    const validationError = validateTimetableSlot({
      batchId: form.batchId,
      dayOfWeek: form.dayOfWeek,
      startTime: form.startTime,
      endTime: form.endTime,
      classroom: form.classroom,
      teacherId: form.teacherId,
      subject: form.subject,
      meetUrl: form.meetUrl
    });
    if (validationError) {
      setFormError(validationError);
      return;
    }

    // Conflict-free promise: refuse a slot that double-books the same faculty,
    // room or batch in an overlapping window.
    const existing = editingId ? timetableSlots.find(s => s.id === editingId) : undefined;
    const candidate: TimetableSlot = {
      id: editingId || 'candidate',
      orgId: existing?.orgId || timetableSlots[0]?.orgId || '',
      branchId: existing?.branchId || timetableSlots[0]?.branchId || '',
      batchId: form.batchId,
      teacherId: form.teacherId,
      subject: form.subject.trim(),
      dayOfWeek: form.dayOfWeek,
      startTime: form.startTime,
      endTime: form.endTime,
      classroom: form.classroom.trim(),
      meetUrl: normalizeMeetUrl(form.meetUrl) || undefined,
      meetPassword: form.meetPassword.trim() || undefined
    };
    const clashes = findTimetableClashes(candidate, timetableSlots, editingId || undefined);
    if (clashes.length > 0) {
      const first = clashes[0];
      const what =
        first.kind === 'teacher'
          ? `faculty (${teacherName(first.slot.teacherId)})`
          : first.kind === 'classroom'
          ? `classroom (${first.slot.classroom})`
          : `batch (${batchName(first.slot.batchId)})`;
      setFormError(
        `Time clash: this ${form.dayOfWeek} ${form.startTime}–${form.endTime} overlaps another class using the same ${what}. Adjust the timing or room.`
      );
      return;
    }

    const payload = {
      batchId: form.batchId,
      teacherId: form.teacherId,
      subject: form.subject.trim(),
      dayOfWeek: form.dayOfWeek,
      startTime: form.startTime,
      endTime: form.endTime,
      classroom: form.classroom.trim(),
      meetUrl: normalizeMeetUrl(form.meetUrl) || undefined,
      meetPassword: form.meetPassword.trim() || undefined
    };

    if (editingId) {
      updateTimetableSlot(editingId, payload);
      showToast('Class updated on the timetable.', 'success');
    } else {
      const saved = addTimetableSlot(payload);
      showToast(
        candidate.meetUrl
          ? 'Class scheduled — students can now Join Class.'
          : 'Class added to the timetable.',
        'success'
      );
      if (!saved) {
        setFormError('Could not save this class — please try again.');
        return;
      }
    }
    setFormOpen(false);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteTimetableSlot(deleteTarget.id);
    showToast('Class removed from the timetable.', 'success');
    setDeleteTarget(null);
  };

  const copyLink = async (slot: TimetableSlot) => {
    const url = normalizeMeetUrl(slot.meetUrl);
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(slot.id);
      setTimeout(() => setCopiedId(null), 1800);
    } catch {
      showToast('Could not copy the link — open it instead.', 'error');
    }
  };

  return (
    <div className="space-y-4">
      <ConsoleCard
        title="Master Institute Timetable"
        subtitle={`Zero-conflict weekly schedule · ${liveCount} class(es) with a live link`}
        icon={<CalendarDays className="w-4 h-4" />}
        action={
          <ConsoleButton
            variant="primary"
            size="sm"
            icon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => openAdd()}
          >
            Add class
          </ConsoleButton>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          {TIMETABLE_DAYS.map(day => {
            const daySlots = slotsForDay(timetableSlots, day);
            const isToday = day === todayDay;
            return (
              <div
                key={day}
                className={`rounded-xl border p-2.5 space-y-2 ${
                  isToday
                    ? 'border-[#1A73E8]/50 bg-[#1A73E8]/[0.04]'
                    : 'border-[#DADCE0] dark:border-[#3C4043] bg-[#F8F9FA] dark:bg-[#282A2C]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[11px] font-bold uppercase tracking-wider ${
                      isToday ? 'text-[#1A73E8]' : 'text-[#5F6368] dark:text-[#9AA0A6]'
                    }`}
                  >
                    {DAY_SHORT[day]}
                    {isToday ? ' · today' : ''}
                  </span>
                  <button
                    onClick={() => openAdd(day)}
                    aria-label={`Add a class on ${day}`}
                    className="p-1 rounded-md text-[#5F6368] dark:text-[#9AA0A6] hover:bg-black/[0.06] dark:hover:bg-white/[0.08] transition"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                {daySlots.length === 0 ? (
                  <p className="text-[10px] text-[#9AA0A6] py-3 text-center">No classes</p>
                ) : (
                  daySlots.map(slot => {
                    const link = normalizeMeetUrl(slot.meetUrl);
                    return (
                      <div
                        key={slot.id}
                        className="rounded-lg border border-black/[0.06] dark:border-white/[0.08] bg-white dark:bg-[#1C1C1E] p-2 space-y-1"
                      >
                        <div className="flex items-start justify-between gap-1">
                          <span className="text-[11px] font-bold text-[#202124] dark:text-[#E8EAED] leading-tight">
                            {slot.subject}
                          </span>
                          <div className="flex items-center gap-0.5 flex-shrink-0">
                            <button
                              onClick={() => openEdit(slot)}
                              aria-label={`Edit ${slot.subject}`}
                              className="p-1 rounded text-[#5F6368] dark:text-[#9AA0A6] hover:bg-black/[0.06] dark:hover:bg-white/[0.08]"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(slot)}
                              aria-label={`Delete ${slot.subject}`}
                              className="p-1 rounded text-[#D93025] dark:text-[#F28B82] hover:bg-[#FCE8E6] dark:hover:bg-[#3C2020]"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-[#5F6368] dark:text-[#9AA0A6]">
                          <Clock className="w-3 h-3" />
                          <span className="font-mono tabular-nums">{formatSlotRange(slot)}</span>
                        </div>
                        <div className="text-[10px] text-[#5F6368] dark:text-[#9AA0A6] truncate">
                          {batchName(slot.batchId)}
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-[#5F6368] dark:text-[#9AA0A6]">
                          <Users className="w-3 h-3" />
                          <span className="truncate">{teacherName(slot.teacherId)}</span>
                        </div>
                        {slot.classroom && (
                          <div className="flex items-center gap-1 text-[10px] text-[#5F6368] dark:text-[#9AA0A6]">
                            <DoorOpen className="w-3 h-3" />
                            <span className="truncate">{slot.classroom}</span>
                          </div>
                        )}
                        {link ? (
                          <div className="flex items-center gap-1 pt-0.5">
                            <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-[#1A73E8] dark:text-[#8AB4F8]">
                              <Video className="w-3 h-3" />
                              {meetProviderLabel(slot.meetUrl)}
                            </span>
                            <button
                              onClick={() => copyLink(slot)}
                              aria-label="Copy class link"
                              className="ml-auto p-1 rounded text-[#5F6368] dark:text-[#9AA0A6] hover:bg-black/[0.06] dark:hover:bg-white/[0.08]"
                            >
                              {copiedId === slot.id ? (
                                <Check className="w-3 h-3 text-[#188038]" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <div className="text-[10px] text-[#9AA0A6]">In-person</div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            );
          })}
        </div>
      </ConsoleCard>

      {/* Add / edit modal */}
      <AnimatePresence>
        {formOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setFormOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.97 }}
              transition={{ duration: 0.18 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white dark:bg-[#1F1F1F] border border-[#DADCE0] dark:border-[#3C4043] rounded-2xl shadow-2xl p-5 space-y-3"
            >
              <div>
                <h3 className="text-sm font-bold text-[#202124] dark:text-[#E8EAED]">
                  {editingId ? 'Edit class' : 'Add a class'}
                </h3>
                <p className="text-[11px] text-[#5F6368] dark:text-[#9AA0A6] mt-1">
                  Add a live link and students/parents get a one-tap <strong>Join Class</strong> button.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <label className="space-y-1">
                  <span className="text-[11px] font-semibold text-[#5F6368] dark:text-[#9AA0A6]">Batch</span>
                  <select
                    value={form.batchId}
                    onChange={e => setForm(prev => ({ ...prev, batchId: e.target.value }))}
                    className={field}
                  >
                    <option value="">Select batch…</option>
                    {batches.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-[11px] font-semibold text-[#5F6368] dark:text-[#9AA0A6]">Faculty</span>
                  <select
                    value={form.teacherId}
                    onChange={e => setForm(prev => ({ ...prev, teacherId: e.target.value }))}
                    className={field}
                  >
                    <option value="">Unassigned</option>
                    {teachers.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="block space-y-1">
                <span className="text-[11px] font-semibold text-[#5F6368] dark:text-[#9AA0A6]">Subject / title</span>
                <input
                  type="text"
                  value={form.subject}
                  onChange={e => setForm(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder="e.g. Class 10 Mathematics"
                  className={field}
                />
              </label>

              <div className="grid grid-cols-3 gap-2">
                <label className="space-y-1">
                  <span className="text-[11px] font-semibold text-[#5F6368] dark:text-[#9AA0A6]">Day</span>
                  <select
                    value={form.dayOfWeek}
                    onChange={e =>
                      setForm(prev => ({ ...prev, dayOfWeek: e.target.value as TimetableSlot['dayOfWeek'] }))
                    }
                    className={field}
                  >
                    {TIMETABLE_DAYS.map(d => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-[11px] font-semibold text-[#5F6368] dark:text-[#9AA0A6]">Start</span>
                  <input
                    type="time"
                    value={form.startTime}
                    onChange={e => setForm(prev => ({ ...prev, startTime: e.target.value }))}
                    className={field}
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-[11px] font-semibold text-[#5F6368] dark:text-[#9AA0A6]">End</span>
                  <input
                    type="time"
                    value={form.endTime}
                    onChange={e => setForm(prev => ({ ...prev, endTime: e.target.value }))}
                    className={field}
                  />
                </label>
              </div>

              <label className="block space-y-1">
                <span className="text-[11px] font-semibold text-[#5F6368] dark:text-[#9AA0A6]">Classroom / lab</span>
                <input
                  type="text"
                  value={form.classroom}
                  onChange={e => setForm(prev => ({ ...prev, classroom: e.target.value }))}
                  placeholder="e.g. Hall 1 (Aryabhata Room)"
                  className={field}
                />
              </label>

              <div className="rounded-xl border border-[#1A73E8]/25 bg-[#1A73E8]/[0.04] p-3 space-y-2">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#1A73E8]">
                  <Video className="w-3.5 h-3.5" />
                  Online class link (optional)
                </div>
                <input
                  type="text"
                  value={form.meetUrl}
                  onChange={e => setForm(prev => ({ ...prev, meetUrl: e.target.value }))}
                  placeholder="https://meet.google.com/abc-defg-hij"
                  className={field}
                />
                <input
                  type="text"
                  value={form.meetPassword}
                  onChange={e => setForm(prev => ({ ...prev, meetPassword: e.target.value }))}
                  placeholder="Passcode (optional)"
                  className={field}
                />
                {form.meetUrl.trim() && (
                  <p className="text-[10px] text-[#5F6368] dark:text-[#9AA0A6]">
                    {normalizeMeetUrl(form.meetUrl)
                      ? `✓ Valid ${meetProviderLabel(form.meetUrl)} link — students will see a Join Class button.`
                      : '✗ Not a valid http(s) web address.'}
                  </p>
                )}
              </div>

              {formError && (
                <p className="flex items-start gap-1.5 text-[11px] text-[#D93025] dark:text-[#F28B82]">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-px" />
                  {formError}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <ConsoleButton variant="ghost" size="sm" onClick={() => setFormOpen(false)}>
                  Cancel
                </ConsoleButton>
                <ConsoleButton variant="primary" size="sm" onClick={submitForm}>
                  {editingId ? 'Save changes' : 'Add class'}
                </ConsoleButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete confirm */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setDeleteTarget(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.97 }}
              transition={{ duration: 0.18 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-sm bg-white dark:bg-[#1F1F1F] border border-[#DADCE0] dark:border-[#3C4043] rounded-2xl shadow-2xl p-5 space-y-3"
            >
              <div className="flex items-start gap-2.5">
                <Trash2 className="w-5 h-5 text-[#D93025] dark:text-[#F28B82] flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-bold text-[#202124] dark:text-[#E8EAED]">Remove this class?</h3>
                  <p className="text-[11px] text-[#5F6368] dark:text-[#9AA0A6] mt-1">
                    {deleteTarget.subject} · {deleteTarget.dayOfWeek} {formatSlotRange(deleteTarget)} will be removed
                    from everyone's timetable.
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <ConsoleButton variant="ghost" size="sm" onClick={() => setDeleteTarget(null)}>
                  Keep it
                </ConsoleButton>
                <ConsoleButton
                  variant="danger"
                  size="sm"
                  icon={<Trash2 className="w-3.5 h-3.5" />}
                  onClick={confirmDelete}
                >
                  Delete
                </ConsoleButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};