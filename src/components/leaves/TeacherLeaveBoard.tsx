import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ClipboardCheck, CheckCircle2, XCircle, Inbox } from 'lucide-react';
import { LeaveRequest } from '../../types';
import { LeaveReviewDecision } from '../../context/slices/LeaveContext';
import { ConsoleCard, ConsoleButton, StatusChip } from '../ui';
import { useApp } from '../../context/AppContext';
import { LeaveReviewModal } from './LeaveReviewModal';
import {
  LEAVE_CATEGORY_LABEL,
  LEAVE_STATUS_META,
  formatLeaveRange,
  getLeaveDisplayName,
  leaveDaysCount,
  leaveTiming,
  scopeLeaveRequestsForTeacher,
  sortLeaveRequestsForReview
} from '../../lib/leave';

const TIMING_LABEL: Record<string, string> = {
  past: 'ended',
  ongoing: 'underway',
  today: 'starts today',
  upcoming: 'upcoming'
};

/**
 * The faculty review desk inside Manage Roster's tab: pending absences for
 * the teacher's own batches, one confirm step (with optional note), plus the
 * recently decided trail. Scoping is product-side (`scopeLeaveRequestsForTeacher`)
 * — rules let any centre faculty review, exactly like batch roster scoping.
 */
export const TeacherLeaveBoard: React.FC = () => {
  const { leaveRequests, students, teachers, batches, currentUser, reviewLeaveRequest, showToast } =
    useApp();
  const [reviewTarget, setReviewTarget] = useState<{
    request: LeaveRequest;
    decision: LeaveReviewDecision;
  } | null>(null);

  const scoped = useMemo(
    () =>
      sortLeaveRequestsForReview(
        scopeLeaveRequestsForTeacher(leaveRequests, students, teachers, batches, currentUser.id)
      ),
    [leaveRequests, students, teachers, batches, currentUser.id]
  );

  const pendingStudents = scoped.filter(r => r.status === 'pending' && r.requesterType === 'student');
  const decided = scoped.filter(r => r.status !== 'pending').slice(0, 8);

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

  const renderPending = (request: LeaveRequest) => {
    const name = getLeaveDisplayName(request, students, teachers);
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
        className="p-3.5 rounded-2xl border border-[#FFA000]/25 dark:border-[#FFCA28]/25 bg-[#FFA000]/[0.05] dark:bg-[#FFCA28]/[0.05] space-y-2"
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-bold text-[#1D1D1F] dark:text-[#F5F5F7] font-apple-text">{name}</span>
              <StatusChip label="Pending" variant="warning" />
              <span className="text-[11px] font-semibold text-[#C96B00] dark:text-[#FF9F0A]">
                {TIMING_LABEL[timing]}
              </span>
            </div>
            <div className="mt-0.5 text-[11px] text-[#5F6368] dark:text-[#9AA0A6]">
              {formatLeaveRange(request.startDate, request.endDate)} · {days} day{days > 1 ? 's' : ''} ·{' '}
              {LEAVE_CATEGORY_LABEL[request.category]} · filed by {request.requestedByName}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
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
          </div>
        </div>
        <p className="text-xs leading-relaxed text-[#3C4043] dark:text-[#D1D1D6]">{request.reason}</p>
      </motion.div>
    );
  };

  const renderDecided = (request: LeaveRequest) => {
    const name = getLeaveDisplayName(request, students, teachers);
    const meta = LEAVE_STATUS_META[request.status];
    return (
      <li
        key={request.id}
        className="flex flex-wrap items-start justify-between gap-2 py-2 border-b border-black/[0.05] dark:border-white/[0.06] last:border-0"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-[#1D1D1F] dark:text-[#F5F5F7] font-apple-text">{name}</span>
            <span className="text-[11px] text-[#86868B]">
              {formatLeaveRange(request.startDate, request.endDate)}
            </span>
            <StatusChip label={meta.label} variant={meta.variant} />
          </div>
          <div className="text-[11px] text-[#86868B] dark:text-[#9AA0A6] mt-0.5">
            {request.reviewedByName ? `${request.reviewedByName} · ` : ''}
            {request.reviewNote ? `“${request.reviewNote}”` : LEAVE_CATEGORY_LABEL[request.category]}
          </div>
        </div>
      </li>
    );
  };

  return (
    <ConsoleCard
      title="Leave Requests"
      subtitle="Absence asks from students in your batches — approving marks their class days excused in attendance"
      icon={<ClipboardCheck className="w-4 h-4" />}
      action={
        pendingStudents.length > 0 ? (
          <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-2 rounded-full bg-[#FFA000] dark:bg-[#FFCA28] text-white dark:text-[#1D1D1F] text-[11px] font-bold">
            {pendingStudents.length}
          </span>
        ) : undefined
      }
    >
      <AnimatePresence initial={false} mode="popLayout">
        {pendingStudents.length > 0 ? (
          <div className="space-y-2">{pendingStudents.map(renderPending)}</div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="py-7 text-center rounded-2xl border border-dashed border-black/[0.1] dark:border-white/[0.1]"
          >
            <Inbox className="w-6 h-6 mx-auto text-[#C7C9CC] dark:text-[#48484A] mb-2" />
            <p className="text-xs text-[#86868B] dark:text-[#9AA0A6]">
              No pending leave requests for your batches.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {decided.length > 0 && (
        <div className="mt-4 pt-3 border-t border-black/[0.06] dark:border-white/[0.08]">
          <h4 className="text-[11px] font-bold uppercase tracking-wide text-[#86868B] mb-1">
            Recently decided
          </h4>
          <ul>{decided.map(renderDecided)}</ul>
        </div>
      )}

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
    </ConsoleCard>
  );
};
