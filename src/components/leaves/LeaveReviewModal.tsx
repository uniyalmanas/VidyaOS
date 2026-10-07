import React, { useState } from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, XCircle, CalendarDays, User2, FileText, MessageSquare } from 'lucide-react';
import { LeaveRequest } from '../../types';
import { ConsoleButton, StatusChip } from '../ui';
import {
  LEAVE_CATEGORY_LABEL,
  LEAVE_STATUS_META,
  formatLeaveRange,
  leaveDaysCount,
  leaveTiming
} from '../../lib/leave';
import { easings } from '../../lib/motion';

export interface LeaveReviewModalProps {
  request: LeaveRequest;
  /** Student/faculty display name — resolved by the caller. */
  displayName: string;
  decision: 'approved' | 'rejected';
  onConfirm: (note: string) => void;
  onCancel: () => void;
}

const TIMING_LABEL: Record<string, string> = {
  past: 'dates already passed',
  ongoing: 'underway now',
  today: 'starts today',
  upcoming: 'starts soon'
};

/**
 * One confirm step before a pending request becomes decided — approval is a
 * one-way door (rules only allow pending → decided), so the desk always sees
 * exactly whose absence is being signed off and may attach a note.
 */
export const LeaveReviewModal: React.FC<LeaveReviewModalProps> = ({
  request,
  displayName,
  decision,
  onConfirm,
  onCancel
}) => {
  const [note, setNote] = useState('');
  const approved = decision === 'approved';
  const timing = leaveTiming(request);

  const rows: Array<{ icon: React.ReactNode; label: string; value: string }> = [
    { icon: <User2 className="w-3.5 h-3.5" />, label: 'Who', value: displayName },
    {
      icon: <CalendarDays className="w-3.5 h-3.5" />,
      label: 'Dates',
      value: `${formatLeaveRange(request.startDate, request.endDate)} · ${leaveDaysCount(request)} day${leaveDaysCount(request) > 1 ? 's' : ''}`
    },
    { icon: <FileText className="w-3.5 h-3.5" />, label: 'Category', value: LEAVE_CATEGORY_LABEL[request.category] },
    { icon: <FileText className="w-3.5 h-3.5" />, label: 'Reason', value: request.reason }
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onCancel}
    >
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.97 }}
        transition={{ duration: 0.2, ease: easings.outQuart }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md bg-white dark:bg-[#1F1F1F] border border-[#DADCE0] dark:border-[#3C4043] rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="p-5 space-y-4">
          <div className="flex items-start gap-3">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                approved
                  ? 'bg-[#34C759]/12 text-[#248A3D] dark:text-[#30D158]'
                  : 'bg-[#FF3B30]/12 text-[#D70015] dark:text-[#FF453A]'
              }`}
            >
              {approved ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-[#202124] dark:text-[#E8EAED] font-apple-text">
                {approved ? 'Approve this leave?' : 'Reject this leave?'}
              </h3>
              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                <StatusChip label={LEAVE_STATUS_META[request.status].label} variant={LEAVE_STATUS_META[request.status].variant} />
                <span className="text-[11px] text-[#5F6368] dark:text-[#9AA0A6]">{TIMING_LABEL[timing]}</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[#E8EAED] dark:border-[#333537] bg-[#F8F9FA] dark:bg-[#161719] divide-y divide-[#E8EAED] dark:divide-[#333537]">
            {rows.map(row => (
              <div key={row.label} className="flex items-start gap-2.5 px-3 py-2">
                <span className="text-[#80868B] dark:text-[#9AA0A6] mt-0.5">{row.icon}</span>
                <div className="min-w-0">
                  <div className="text-[10px] font-bold uppercase tracking-wide text-[#80868B] dark:text-[#9AA0A6]">
                    {row.label}
                  </div>
                  <div className="text-xs text-[#202124] dark:text-[#E8EAED] break-words">{row.value}</div>
                </div>
              </div>
            ))}
          </div>

          {approved && (
            <p className="text-[11px] leading-relaxed text-[#5F6368] dark:text-[#9AA0A6]">
              Class days inside this range will be marked <strong>excused</strong> in the attendance register
              (a teacher's present/late marks are left untouched).
            </p>
          )}

          <div>
            <label className="flex items-center gap-1.5 text-[11px] font-semibold text-[#5F6368] dark:text-[#9AA0A6] mb-1.5">
              <MessageSquare className="w-3.5 h-3.5" />
              Note for the requester (optional)
            </label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={2}
              maxLength={240}
              placeholder={approved ? 'e.g. Approved — take care. Attendance is excused.' : 'e.g. Tests that day — please pick the next week instead.'}
              className="w-full border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2C] text-[#202124] dark:text-[#E8EAED] rounded-lg p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#1A73E8]/40 resize-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-[#E8EAED] dark:border-[#333537] bg-[#F8F9FA] dark:bg-[#161719]">
          <ConsoleButton variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </ConsoleButton>
          <ConsoleButton
            variant={approved ? 'blue' : 'danger'}
            size="sm"
            icon={approved ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
            onClick={() => onConfirm(note.trim())}
          >
            {approved ? 'Approve & mark excused' : 'Reject request'}
          </ConsoleButton>
        </div>
      </motion.div>
    </motion.div>
  );
};
