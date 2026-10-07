import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CalendarDays, Pencil, Send, AlertCircle, Clock3, Info } from 'lucide-react';
import { LeaveRequest, LeaveRequester, LeaveCategory } from '../../types';
import { ConsoleCard, ConsoleButton, StatusChip } from '../ui';
import { useApp } from '../../context/AppContext';
import { getIndiaDateString } from '../../lib/date';
import {
  LEAVE_CATEGORIES,
  LEAVE_CATEGORY_LABEL,
  LEAVE_STATUS_META,
  canEditLeaveRequest,
  formatLeaveRange,
  leaveDaysCount,
  leaveTiming,
  validateLeaveRange
} from '../../lib/leave';

export interface LeavePortalPanelProps {
  requesterType: LeaveRequester;
  /** Set for student requests (the student record taking leave). */
  studentId?: string;
  /** Set for faculty requests (their own Teacher record). */
  teacherId?: string;
}

const TIMING_META: Record<string, { label: string; className: string }> = {
  past: { label: 'Ended', className: 'text-[#86868B] dark:text-[#9AA0A6]' },
  ongoing: { label: 'Underway', className: 'text-[#C96B00] dark:text-[#FF9F0A]' },
  today: { label: 'Starts today', className: 'text-[#D70015] dark:text-[#FF453A]' },
  upcoming: { label: 'Upcoming', className: 'text-[#248A3D] dark:text-[#30D158]' }
};

/**
 * The filing surface shared by the student, parent and faculty portals:
 * apply for leave, then watch the request move pending → approved/rejected
 * in real time (edits are allowed only while pending, mirroring the rules).
 */
export const LeavePortalPanel: React.FC<LeavePortalPanelProps> = ({
  requesterType,
  studentId,
  teacherId
}) => {
  const { leaveRequests, submitLeaveRequest, updateLeaveRequest, currentUser, showToast } = useApp();

  const [startDate, setStartDate] = useState(getIndiaDateString());
  const [endDate, setEndDate] = useState(getIndiaDateString());
  const [category, setCategory] = useState<LeaveCategory>('sick');
  const [reason, setReason] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const canFile = requesterType === 'student' ? !!studentId : !!teacherId;

  const ownRequests = useMemo(() => {
    const mine = leaveRequests.filter(r =>
      requesterType === 'student' ? r.studentId === studentId : r.teacherId === teacherId
    );
    return [...mine].sort((a, b) => b.createdAtMs - a.createdAtMs);
  }, [leaveRequests, requesterType, studentId, teacherId]);

  const pendingCount = ownRequests.filter(r => r.status === 'pending').length;

  const resetForm = () => {
    setEditingId(null);
    setStartDate(getIndiaDateString());
    setEndDate(getIndiaDateString());
    setCategory('sick');
    setReason('');
    setFormError(null);
  };

  const startEdit = (request: LeaveRequest) => {
    setEditingId(request.id);
    setStartDate(request.startDate);
    setEndDate(request.endDate);
    setCategory(request.category);
    setReason(request.reason);
    setFormError(null);
    if (typeof document !== 'undefined') {
      document.getElementById('leave-apply-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const error = validateLeaveRange(startDate, endDate, reason);
    if (error) {
      setFormError(error);
      return;
    }
    setFormError(null);

    if (editingId) {
      updateLeaveRequest(editingId, { startDate, endDate, category, reason: reason.trim() });
      showToast('Leave request updated while it waits for review.', 'success');
      resetForm();
      return;
    }

    const created = submitLeaveRequest({
      requesterType,
      studentId,
      teacherId,
      startDate,
      endDate,
      category,
      reason: reason.trim()
    });
    if (!created) {
      setFormError('Could not file the request — check the dates and reason, then try again.');
      return;
    }
    showToast('Leave request sent for approval.', 'success');
    resetForm();
  };

  const fieldClass =
    'w-full bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.08] dark:border-white/[0.1] rounded-xl px-3 py-2 text-xs font-medium text-[#1D1D1F] dark:text-[#F5F5F7] font-apple-text focus:outline-none focus:ring-2 focus:ring-[#FFA000]/30';

  return (
    <div className="space-y-6">
      {/* Filing card */}
      <div id="leave-apply-card">
      <ConsoleCard
        title={editingId ? 'Edit pending leave request' : 'Apply for Leave'}
        subtitle={
          requesterType === 'teacher'
            ? 'Your leave goes to the centre admin for review'
            : 'Requests reach the front desk / your batch teacher for review'
        }
        icon={<CalendarDays className="w-4 h-4" />}
        action={
          editingId ? (
            <ConsoleButton variant="ghost" size="xs" onClick={resetForm}>
              Cancel edit
            </ConsoleButton>
          ) : undefined
        }
      >
        {canFile ? (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="space-y-1">
                <span className="text-[11px] font-semibold text-[#5F6368] dark:text-[#9AA0A6]">From</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => {
                    setStartDate(e.target.value);
                    if (editingId) return;
                    // Single-day pick by default; extending the end stays manual.
                    setEndDate(prev => (e.target.value > prev ? e.target.value : prev));
                  }}
                  className={fieldClass}
                />
              </label>
              <label className="space-y-1">
                <span className="text-[11px] font-semibold text-[#5F6368] dark:text-[#9AA0A6]">To</span>
                <input
                  type="date"
                  value={endDate}
                  min={startDate}
                  onChange={e => setEndDate(e.target.value)}
                  className={fieldClass}
                />
              </label>
            </div>

            <label className="block space-y-1">
              <span className="text-[11px] font-semibold text-[#5F6368] dark:text-[#9AA0A6]">Category</span>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as LeaveCategory)}
                className={fieldClass}
              >
                {LEAVE_CATEGORIES.map(c => (
                  <option key={c} value={c}>
                    {LEAVE_CATEGORY_LABEL[c]}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-1">
              <span className="text-[11px] font-semibold text-[#5F6368] dark:text-[#9AA0A6]">Reason</span>
              <textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                rows={3}
                maxLength={400}
                placeholder="e.g. Fever since last night — doctor has advised rest."
                className={`${fieldClass} resize-none`}
              />
            </label>

            <AnimatePresence>
              {formError && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="flex items-start gap-1.5 text-[11px] text-[#D70015] dark:text-[#FF453A]"
                >
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-px" />
                  {formError}
                </motion.p>
              )}
            </AnimatePresence>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-[11px] text-[#86868B] dark:text-[#9AA0A6]">
                <Info className="w-3.5 h-3.5" />
                Up to 31 days per request · approved class days are marked excused
              </span>
              <ConsoleButton
                type="submit"
                variant="primary"
                size="sm"
                icon={editingId ? <Pencil className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />}
              >
                {editingId ? 'Save changes' : 'Submit request'}
              </ConsoleButton>
            </div>
          </form>
        ) : (
          <p className="py-6 text-center text-xs text-[#5F6368] dark:text-[#9AA0A6]">
            {requesterType === 'teacher'
              ? 'Your faculty profile is not linked to this login yet — ask the admin to connect your Faculty record.'
              : 'No student profile is linked to this account yet — ask the front desk to connect it.'}
          </p>
        )}
      </ConsoleCard>
      </div>

      {/* History card */}
      <ConsoleCard
        title="My Leave History"
        subtitle={
          pendingCount > 0
            ? `${pendingCount} waiting for review — refine it any time while pending`
            : 'Filed, reviewed and decided requests'
        }
        icon={<Clock3 className="w-4 h-4" />}
      >
        {ownRequests.length === 0 ? (
          <div className="py-8 text-center rounded-2xl border border-dashed border-black/[0.1] dark:border-white/[0.1]">
            <CalendarDays className="w-6 h-6 mx-auto text-[#C7C9CC] dark:text-[#48484A] mb-2" />
            <p className="text-xs text-[#86868B] dark:text-[#9AA0A6]">No leave requests yet — hopefully it stays that way.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            <AnimatePresence initial={false}>
              {ownRequests.map(request => {
                const meta = LEAVE_STATUS_META[request.status];
                const timing = TIMING_META[leaveTiming(request)];
                const days = leaveDaysCount(request);
                const editable = canEditLeaveRequest(request, currentUser.id);
                return (
                  <motion.li
                    key={request.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.22 }}
                    className="p-3.5 rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-white/90 dark:bg-[#1C1C1E]/90 shadow-[0_4px_12px_rgba(0,0,0,0.03)]"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-bold text-[#1D1D1F] dark:text-[#F5F5F7] font-apple-text">
                            {formatLeaveRange(request.startDate, request.endDate)}
                          </span>
                          <span className="text-[11px] text-[#86868B]">
                            {days} day{days > 1 ? 's' : ''}
                          </span>
                          <StatusChip label={meta.label} variant={meta.variant} />
                          <span className={`text-[11px] font-semibold ${timing.className}`}>{timing.label}</span>
                        </div>
                        <div className="mt-1 text-[11px] text-[#5F6368] dark:text-[#9AA0A6]">
                          {LEAVE_CATEGORY_LABEL[request.category]} · filed {new Date(request.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </div>
                      </div>
                      {editable && (
                        <ConsoleButton
                          variant="secondary"
                          size="xs"
                          icon={<Pencil className="w-3 h-3" />}
                          onClick={() => startEdit(request)}
                        >
                          Edit
                        </ConsoleButton>
                      )}
                    </div>

                    <p className="mt-2 text-xs leading-relaxed text-[#3C4043] dark:text-[#D1D1D6]">{request.reason}</p>

                    {request.status !== 'pending' && (
                      <div
                        className={`mt-2 rounded-xl px-3 py-2 text-[11px] leading-relaxed ${
                          request.status === 'approved'
                            ? 'bg-[#34C759]/8 dark:bg-[#30D158]/10 text-[#248A3D] dark:text-[#30D158]'
                            : 'bg-[#FF3B30]/8 dark:bg-[#FF453A]/10 text-[#D70015] dark:text-[#FF453A]'
                        }`}
                      >
                        <strong>{request.reviewedByName || 'Review team'}</strong>{' '}
                        {request.status === 'approved' ? 'approved' : 'rejected'} this request
                        {request.reviewedAt &&
                          ` on ${new Date(request.reviewedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}
                        {request.reviewNote ? ` — “${request.reviewNote}”` : '.'}
                      </div>
                    )}
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        )}
      </ConsoleCard>
    </div>
  );
};
