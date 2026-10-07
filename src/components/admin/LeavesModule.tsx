import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CalendarDays,
  Search,
  Plus,
  CheckCircle2,
  XCircle,
  Trash2,
  Users,
  GraduationCap,
  AlertCircle,
  ClipboardList
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ConsoleCard, ConsoleButton, StatusChip, MetricCard } from '../ui';
import { LeaveRequest, LeaveRequester, LeaveCategory, LeaveStatus } from '../../types';
import { LeaveReviewModal } from '../leaves/LeaveReviewModal';
import {
  LEAVE_CATEGORIES,
  LEAVE_CATEGORY_LABEL,
  LEAVE_STATUS_META,
  canDeleteLeave,
  countLeaveByStatus,
  formatLeaveRange,
  getLeaveDisplayName,
  leaveDaysCount,
  leaveTiming,
  searchLeaveRequests,
  sortLeaveRequestsForReview,
  validateLeaveRange
} from '../../lib/leave';
import { getIndiaDateString } from '../../lib/date';

type StatusFilter = 'all' | LeaveStatus;
type TypeFilter = 'all' | LeaveRequester;

const STATUS_FILTERS: Array<{ id: StatusFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' }
];

const TYPE_FILTERS: Array<{ id: TypeFilter; label: string }> = [
  { id: 'all', label: 'Everyone' },
  { id: 'student', label: 'Students' },
  { id: 'teacher', label: 'Faculty' }
];

const TIMING_LABEL: Record<string, string> = {
  past: 'ended',
  ongoing: 'underway',
  today: 'starts today',
  upcoming: 'upcoming'
};

interface NameGroup {
  key: string;
  name: string;
  type: LeaveRequester;
  total: number;
  pending: number;
  days: number;
}

function groupByName(requests: LeaveRequest[], students: any[], teachers: any[]): NameGroup[] {
  const map = new Map<string, NameGroup>();
  requests.forEach(r => {
    const name = getLeaveDisplayName(r, students, teachers);
    const key = `${r.requesterType}:${r.studentId || r.teacherId || name}`;
    const existing =
      map.get(key) ||
      ({ key, name, type: r.requesterType, total: 0, pending: 0, days: 0 } as NameGroup);
    existing.total += 1;
    if (r.status === 'pending') existing.pending += 1;
    if (r.status === 'approved') existing.days += leaveDaysCount(r);
    map.set(key, existing);
  });
  return [...map.values()].sort((a, b) => b.total - a.total || b.days - a.days);
}

/**
 * F3 — the front-desk leave register: every request in the centre, review
 * actions with a note, file-on-behalf for walk-ins, and per-student/per-faculty
 * load summaries so repeated absences are visible at a glance.
 */
export const LeavesModule: React.FC = () => {
  const {
    leaveRequests,
    students,
    teachers,
    submitLeaveRequest,
    reviewLeaveRequest,
    deleteLeaveRequest,
    currentUser,
    showToast
  } = useApp();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [reviewTarget, setReviewTarget] = useState<{
    request: LeaveRequest;
    decision: 'approved' | 'rejected';
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LeaveRequest | null>(null);
  const [showFileModal, setShowFileModal] = useState(false);

  // File-on-behalf form
  const [fType, setFType] = useState<LeaveRequester>('student');
  const [fEntityId, setFEntityId] = useState('');
  const [fStart, setFStart] = useState(getIndiaDateString());
  const [fEnd, setFEnd] = useState(getIndiaDateString());
  const [fCategory, setFCategory] = useState<LeaveCategory>('sick');
  const [fReason, setFReason] = useState('');
  const [fError, setFError] = useState<string | null>(null);

  const nameOf = useMemo(
    () => (r: LeaveRequest) => getLeaveDisplayName(r, students, teachers),
    [students, teachers]
  );

  const filtered = useMemo(() => {
    let list = searchLeaveRequests(leaveRequests, search, nameOf);
    if (statusFilter !== 'all') list = list.filter(r => r.status === statusFilter);
    if (typeFilter !== 'all') list = list.filter(r => r.requesterType === typeFilter);
    return sortLeaveRequestsForReview(list);
  }, [leaveRequests, search, statusFilter, typeFilter, nameOf]);

  const counts = useMemo(() => countLeaveByStatus(leaveRequests), [leaveRequests]);
  const today = getIndiaDateString();
  const onLeaveToday = useMemo(
    () =>
      leaveRequests.filter(r => r.status === 'approved' && r.startDate <= today && r.endDate >= today)
        .length,
    [leaveRequests, today]
  );
  const studentGroups = useMemo(
    () => groupByName(leaveRequests, students, teachers).filter(g => g.type === 'student').slice(0, 6),
    [leaveRequests, students, teachers]
  );
  const facultyGroups = useMemo(
    () => groupByName(leaveRequests, students, teachers).filter(g => g.type === 'teacher').slice(0, 6),
    [leaveRequests, students, teachers]
  );

  const mayDelete = canDeleteLeave(currentUser.role);

  const confirmReview = (note: string) => {
    if (!reviewTarget) return;
    const displayName = getLeaveDisplayName(reviewTarget.request, students, teachers);
    const approved = reviewTarget.decision === 'approved';
    reviewLeaveRequest(reviewTarget.request.id, reviewTarget.decision, note || undefined);
    showToast(
      approved
        ? `Leave approved for ${displayName} — class days marked excused.`
        : `Leave rejected for ${displayName}.`,
      'success'
    );
    setReviewTarget(null);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteLeaveRequest(deleteTarget.id);
    showToast('Leave request removed from the register.', 'success');
    setDeleteTarget(null);
  };

  const openFileModal = () => {
    setFType('student');
    setFEntityId('');
    setFStart(getIndiaDateString());
    setFEnd(getIndiaDateString());
    setFCategory('sick');
    setFReason('');
    setFError(null);
    setShowFileModal(true);
  };

  const handleFile = (e: React.FormEvent) => {
    e.preventDefault();
    const error = validateLeaveRange(fStart, fEnd, fReason);
    if (error) {
      setFError(error);
      return;
    }
    if (!fEntityId) {
      setFError(`Pick the ${fType === 'student' ? 'student' : 'faculty member'} taking leave.`);
      return;
    }
    const created = submitLeaveRequest({
      requesterType: fType,
      studentId: fType === 'student' ? fEntityId : undefined,
      teacherId: fType === 'teacher' ? fEntityId : undefined,
      startDate: fStart,
      endDate: fEnd,
      category: fCategory,
      reason: fReason.trim()
    });
    if (!created) {
      setFError('Could not file the request — check the details and try again.');
      return;
    }
    showToast('Leave request filed at the desk — it lands in Pending.', 'success');
    setShowFileModal(false);
  };

  const formField =
    'w-full border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2C] text-[#202124] dark:text-[#E8EAED] rounded-lg p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#1A73E8]/40';

  const filterChip = (active: boolean) =>
    `px-3 py-1.5 rounded-full text-[11px] font-bold border transition-colors ${
      active
        ? 'bg-[#1A73E8] border-[#1A73E8] text-white'
        : 'bg-white dark:bg-[#282A2C] border-[#DADCE0] dark:border-[#3C4043] text-[#5F6368] dark:text-[#9AA0A6] hover:border-[#1A73E8]/50'
    }`;

  const renderRow = (request: LeaveRequest) => {
    const name = getLeaveDisplayName(request, students, teachers);
    const meta = LEAVE_STATUS_META[request.status];
    const timing = leaveTiming(request);
    const days = leaveDaysCount(request);
    return (
      <motion.div
        key={request.id}
        layout
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, x: -12 }}
        transition={{ duration: 0.22 }}
        className="p-3.5 rounded-2xl border border-[#E8EAED] dark:border-[#333537] bg-white dark:bg-[#1F1F1F] space-y-2"
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-white text-[10px] font-bold ${
                  request.requesterType === 'teacher' ? 'bg-[#9334E6]' : 'bg-[#1A73E8]'
                }`}
              >
                {request.requesterType === 'teacher' ? 'F' : 'S'}
              </span>
              <span className="text-sm font-bold text-[#202124] dark:text-[#E8EAED] font-apple-text">{name}</span>
              <StatusChip label={meta.label} variant={meta.variant} />
              <span className="text-[11px] font-semibold text-[#5F6368] dark:text-[#9AA0A6]">
                {TIMING_LABEL[timing]}
              </span>
            </div>
            <div className="mt-1 text-[11px] text-[#5F6368] dark:text-[#9AA0A6]">
              {formatLeaveRange(request.startDate, request.endDate)} · {days} day{days > 1 ? 's' : ''} ·{' '}
              {LEAVE_CATEGORY_LABEL[request.category]} · filed by {request.requestedByName}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {request.status === 'pending' && (
              <>
                <ConsoleButton
                  variant="blue"
                  size="xs"
                  icon={<CheckCircle2 className="w-3 h-3" />}
                  onClick={() => setReviewTarget({ request, decision: 'approved' })}
                >
                  Approve
                </ConsoleButton>
                <ConsoleButton
                  variant="danger"
                  size="xs"
                  icon={<XCircle className="w-3 h-3" />}
                  onClick={() => setReviewTarget({ request, decision: 'rejected' })}
                >
                  Reject
                </ConsoleButton>
              </>
            )}
            {mayDelete && (
              <button
                onClick={() => setDeleteTarget(request)}
                title="Delete request"
                className="inline-flex items-center rounded-lg bg-[#FCE8E6] dark:bg-[#3C2A2A] p-1.5 text-[#D93025] dark:text-[#F28B82] hover:bg-[#FAD2CF] dark:hover:bg-[#4A3533] transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <p className="text-xs leading-relaxed text-[#3C4043] dark:text-[#D1D1D6]">{request.reason}</p>

        {request.status !== 'pending' && (
          <div className="text-[11px] text-[#5F6368] dark:text-[#9AA0A6]">
            <strong>{request.reviewedByName || 'Reviewer'}</strong>
            {request.reviewNote ? ` — “${request.reviewNote}”` : ' decided this request'} ·{' '}
            {new Date(request.reviewedAt || request.createdAt).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short'
            })}
          </div>
        )}
      </motion.div>
    );
  };

  const renderGroup = (group: NameGroup, icon: React.ReactNode) => (
    <div
      key={group.key}
      className="flex items-center justify-between gap-2 py-1.5 border-b border-black/[0.05] dark:border-white/[0.06] last:border-0"
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-[#80868B] dark:text-[#9AA0A6]">{icon}</span>
        <span className="text-xs font-semibold text-[#202124] dark:text-[#E8EAED] truncate">{group.name}</span>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {group.pending > 0 && (
          <span className="inline-flex items-center justify-center min-w-[18px] h-5 px-1.5 rounded-full bg-[#FF9500]/15 text-[#C96B00] dark:text-[#FF9F0A] text-[10px] font-bold">
            {group.pending} pending
          </span>
        )}
        <span className="text-[11px] text-[#5F6368] dark:text-[#9AA0A6]">
          {group.total} req · {group.days}d
        </span>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Summary strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          label="Pending Review"
          value={String(counts.pending)}
          accentColor={counts.pending > 0 ? '#FFA000' : '#188038'}
          subtext={counts.pending > 0 ? 'waiting at the desk' : 'desk is clear'}
        />
        <MetricCard label="Approved" value={String(counts.approved)} accentColor="#188038" subtext="excused into attendance" />
        <MetricCard label="Rejected" value={String(counts.rejected)} accentColor="#D93025" subtext="declined requests" />
        <MetricCard
          label="On Leave Today"
          value={String(onLeaveToday)}
          accentColor="#1A73E8"
          subtext="students & faculty"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-start">
        {/* Register */}
        <ConsoleCard
          className="xl:col-span-2"
          title="Leave Register"
          subtitle="Every absence ask in the centre — approve with a note, reject with a reason, or file one at the desk"
          icon={<ClipboardList className="w-4 h-4" />}
          action={
            <ConsoleButton
              variant="primary"
              size="sm"
              icon={<Plus className="w-3.5 h-3.5" />}
              onClick={openFileModal}
            >
              File on behalf
            </ConsoleButton>
          }
        >
          {/* Toolbar */}
          <div className="space-y-2.5 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#80868B]" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name, reason, category…"
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2C] text-xs text-[#202124] dark:text-[#E8EAED] focus:ring-2 focus:ring-[#1A73E8]/40 outline-none"
              />
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {STATUS_FILTERS.map(f => (
                <button
                  key={f.id}
                  onClick={() => setStatusFilter(f.id)}
                  className={filterChip(statusFilter === f.id)}
                >
                  {f.label}
                  {f.id !== 'all' && (
                    <span className="ml-1 opacity-70">
                      {f.id === 'pending' ? counts.pending : f.id === 'approved' ? counts.approved : counts.rejected}
                    </span>
                  )}
                </button>
              ))}
              <span className="w-px h-4 bg-black/10 dark:bg-white/15 mx-1" />
              {TYPE_FILTERS.map(f => (
                <button key={f.id} onClick={() => setTypeFilter(f.id)} className={filterChip(typeFilter === f.id)}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <AnimatePresence initial={false} mode="popLayout">
            {filtered.length > 0 ? (
              <div className="space-y-2">{filtered.map(renderRow)}</div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="py-8 text-center rounded-2xl border border-dashed border-[#DADCE0] dark:border-[#3C4043]"
              >
                <CalendarDays className="w-6 h-6 mx-auto text-[#C7C9CC] dark:text-[#48484A] mb-2" />
                <p className="text-xs text-[#5F6368] dark:text-[#9AA0A6]">
                  No leave requests match these filters.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </ConsoleCard>

        {/* Per-student / per-faculty summary */}
        <ConsoleCard
          title="Leave Load"
          subtitle="Who is asking for absence most often"
          icon={<Users className="w-4 h-4" />}
        >
          <div className="space-y-4">
            <div>
              <h4 className="text-[11px] font-bold uppercase tracking-wide text-[#86868B] mb-1">Students</h4>
              {studentGroups.length > 0 ? (
                <div>{studentGroups.map(g => renderGroup(g, <Users className="w-3.5 h-3.5" />))}</div>
              ) : (
                <p className="text-[11px] text-[#86868B] py-2">No student leave on record yet.</p>
              )}
            </div>
            <div>
              <h4 className="text-[11px] font-bold uppercase tracking-wide text-[#86868B] mb-1">Faculty</h4>
              {facultyGroups.length > 0 ? (
                <div>{facultyGroups.map(g => renderGroup(g, <GraduationCap className="w-3.5 h-3.5" />))}</div>
              ) : (
                <p className="text-[11px] text-[#86868B] py-2">No faculty leave on record yet.</p>
              )}
            </div>
          </div>
        </ConsoleCard>
      </div>

      {/* Review modal */}
      <AnimatePresence>
        {reviewTarget && (
          <LeaveReviewModal
            request={reviewTarget.request}
            displayName={getLeaveDisplayName(reviewTarget.request, students, teachers)}
            decision={reviewTarget.decision}
            onConfirm={confirmReview}
            onCancel={() => setReviewTarget(null)}
          />
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
                <AlertCircle className="w-5 h-5 text-[#D93025] dark:text-[#F28B82] flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-bold text-[#202124] dark:text-[#E8EAED]">Delete this request?</h3>
                  <p className="text-[11px] text-[#5F6368] dark:text-[#9AA0A6] mt-1">
                    {getLeaveDisplayName(deleteTarget, students, teachers)} ·{' '}
                    {formatLeaveRange(deleteTarget.startDate, deleteTarget.endDate)} — this only removes the
                    request itself; attendance is untouched.
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <ConsoleButton variant="ghost" size="sm" onClick={() => setDeleteTarget(null)}>
                  Keep it
                </ConsoleButton>
                <ConsoleButton variant="danger" size="sm" icon={<Trash2 className="w-3.5 h-3.5" />} onClick={confirmDelete}>
                  Delete
                </ConsoleButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* File on behalf modal */}
      <AnimatePresence>
        {showFileModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setShowFileModal(false)}
          >
            <motion.form
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.97 }}
              transition={{ duration: 0.18 }}
              onSubmit={handleFile}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white dark:bg-[#1F1F1F] border border-[#DADCE0] dark:border-[#3C4043] rounded-2xl shadow-2xl p-5 space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-[#202124] dark:text-[#E8EAED]">File Leave on Behalf</h3>
                  <p className="text-[11px] text-[#5F6368] dark:text-[#9AA0A6] mt-0.5">
                    For walk-ins and phone calls — it lands in Pending like any other request.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowFileModal(false)}
                  className="text-[#80868B] hover:text-[#202124] dark:hover:text-[#E8EAED] text-lg leading-none"
                >
                  ×
                </button>
              </div>

              <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-[#F1F3F4] dark:bg-[#282A2C]">
                {(['student', 'teacher'] as LeaveRequester[]).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setFType(t);
                      setFEntityId('');
                    }}
                    className={`py-2 rounded-lg text-xs font-bold transition-colors ${
                      fType === t
                        ? 'bg-white dark:bg-[#3C4043] text-[#202124] dark:text-[#E8EAED] shadow'
                        : 'text-[#5F6368] dark:text-[#9AA0A6]'
                    }`}
                  >
                    {t === 'student' ? 'Student' : 'Faculty'}
                  </button>
                ))}
              </div>

              <label className="block space-y-1">
                <span className="text-[11px] font-semibold text-[#5F6368] dark:text-[#9AA0A6]">
                  Who is taking leave
                </span>
                <select value={fEntityId} onChange={e => setFEntityId(e.target.value)} className={formField}>
                  <option value="">
                    {fType === 'student' ? 'Select a student…' : 'Select a faculty member…'}
                  </option>
                  {fType === 'student'
                    ? students
                        .filter(s => s.status === 'active')
                        .map(s => (
                          <option key={s.id} value={s.id}>
                            {s.name} · {s.classGrade}
                          </option>
                        ))
                    : teachers.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                </select>
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1">
                  <span className="text-[11px] font-semibold text-[#5F6368] dark:text-[#9AA0A6]">From</span>
                  <input
                    type="date"
                    value={fStart}
                    onChange={e => {
                      setFStart(e.target.value);
                      setFEnd(prev => (e.target.value > prev ? e.target.value : prev));
                    }}
                    className={formField}
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-[11px] font-semibold text-[#5F6368] dark:text-[#9AA0A6]">To</span>
                  <input type="date" value={fEnd} min={fStart} onChange={e => setFEnd(e.target.value)} className={formField} />
                </label>
              </div>

              <label className="block space-y-1">
                <span className="text-[11px] font-semibold text-[#5F6368] dark:text-[#9AA0A6]">Category</span>
                <select
                  value={fCategory}
                  onChange={e => setFCategory(e.target.value as LeaveCategory)}
                  className={formField}
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
                  value={fReason}
                  onChange={e => setFReason(e.target.value)}
                  rows={3}
                  maxLength={400}
                  placeholder="e.g. Mother unwell — student will miss the evening batch."
                  className={`${formField} resize-none`}
                />
              </label>

              {fError && (
                <p className="flex items-start gap-1.5 text-[11px] text-[#D93025] dark:text-[#F28B82]">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-px" />
                  {fError}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <ConsoleButton type="button" variant="ghost" size="sm" onClick={() => setShowFileModal(false)}>
                  Cancel
                </ConsoleButton>
                <ConsoleButton type="submit" variant="primary" size="sm" icon={<Plus className="w-3.5 h-3.5" />}>
                  File request
                </ConsoleButton>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
