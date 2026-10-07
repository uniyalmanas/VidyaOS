import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CalendarCheck,
  LogIn,
  LogOut,
  Wallet,
  Clock3,
  CalendarDays,
  AlertCircle
} from 'lucide-react';
import { ConsoleCard, ConsoleButton, StatusChip, MetricCard } from '../ui';
import { useApp } from '../../context/AppContext';
import { Teacher, SalarySlip } from '../../types';
import {
  ATTENDANCE_CYCLE,
  currentMonthKey,
  formatRupees,
  formatTimeHHMM,
  monthKeyFromDate,
  SALARY_SLIP_META,
  summarizeTeacherMonth,
  TEACHER_ATTENDANCE_META
} from '../../lib/staffOps';
import { getIndiaDateString } from '../../lib/date';

/**
 * F4 — the faculty "My Day & Salary" surface: one-tap check-in / check-out
 * for today, this month's attendance tally, and every salary slip issued to
 * this teacher (drafts and paid ones alike — a teacher only ever sees rows
 * whose `teacherId` matches their own Teacher record).
 */
export const MyDayPanel: React.FC<{ teacherId?: string }> = ({ teacherId }) => {
  const {
    teacherAttendance,
    salarySlips,
    markTeacherAttendance,
    currentUser,
    showToast
  } = useApp();

  const today = getIndiaDateString();
  const monthKey = currentMonthKey(today);

  const myTeacherId = teacherId;
  const canStamp = !!myTeacherId;

  const todaysRow = useMemo(
    () =>
      canStamp
        ? teacherAttendance.find(r => r.teacherId === myTeacherId && r.date === today)
        : undefined,
    [teacherAttendance, myTeacherId, today, canStamp]
  );

  const summary = useMemo(
    () =>
      canStamp
        ? summarizeTeacherMonth(teacherAttendance, myTeacherId!, monthKey, today)
        : null,
    [teacherAttendance, myTeacherId, monthKey, today, canStamp]
  );

  const mySlips = useMemo(() => {
    const mine = salarySlips.filter(s => s.teacherId === myTeacherId);
    return [...mine].sort((a, b) => b.createdAtMs - a.createdAtMs);
  }, [salarySlips, myTeacherId]);

  const handleCheckIn = () => {
    if (!canStamp || todaysRow?.checkIn) return;
    markTeacherAttendance(myTeacherId!, 'present', { checkIn: formatTimeHHMM() });
    showToast('Checked in — have a great class day!', 'success');
  };

  const handleCheckOut = () => {
    if (!canStamp || !todaysRow?.checkIn || todaysRow.checkOut) return;
    // Keep whichever status the row already holds (present / half_day / …)
    // and simply stamp the exit time.
    markTeacherAttendance(myTeacherId!, todaysRow.status, { checkOut: formatTimeHHMM() });
    showToast('Checked out — day recorded.', 'success');
  };

  const handleQuickStatus = (status: 'half_day' | 'on_leave' | 'absent') => {
    if (!canStamp) return;
    const meta = TEACHER_ATTENDANCE_META[status];
    markTeacherAttendance(myTeacherId!, status, {
      checkIn: todaysRow?.checkIn,
      checkOut: todaysRow?.checkOut
    });
    showToast(`Today marked ${meta.label.toLowerCase()}.`, 'success');
  };

  if (!canStamp) {
    return (
      <ConsoleCard
        title="My Day"
        subtitle="Daily check-in & salary slips"
        icon={<CalendarCheck className="w-4 h-4" />}
      >
        <p className="py-8 text-center text-xs text-[#5F6368] dark:text-[#9AA0A6]">
          Your faculty profile is not linked to this login yet — ask the admin to connect
          your Faculty record to unlock check-in and salary slips.
        </p>
      </ConsoleCard>
    );
  }

  const checkedIn = !!todaysRow?.checkIn;
  const checkedOut = !!todaysRow?.checkOut;
  const statusChip = todaysRow ? TEACHER_ATTENDANCE_META[todaysRow.status] : null;
  const pendingSlips = mySlips.filter(s => s.status === 'issued').length;
  const paidSlips = mySlips.filter(s => s.status === 'paid').length;
  const lifetimePaid = mySlips
    .filter(s => s.status === 'paid')
    .reduce((sum, s) => sum + (s.paidAmount || s.netAmount), 0);

  const fieldClass =
    'w-full bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.08] dark:border-white/[0.1] rounded-xl px-3 py-2 text-xs font-medium text-[#1D1D1F] dark:text-[#F5F5F7] font-apple-text focus:outline-none focus:ring-2 focus:ring-[#FFA000]/30';

  return (
    <div className="space-y-6">
      {/* Check-in / check-out hero */}
      <ConsoleCard
        title="My Day"
        subtitle={`${new Date().toLocaleDateString('en-IN', {
          weekday: 'long',
          day: 'numeric',
          month: 'long'
        })} · tap once, you're in`}
        icon={<CalendarCheck className="w-4 h-4" />}
        action={
          todaysRow && statusChip ? (
            <StatusChip label={statusChip.label} variant={statusChip.variant} size="xs" />
          ) : undefined
        }
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          {/* Clock face */}
          <div className="flex items-center gap-3 min-w-[180px]">
            <div className="w-14 h-14 rounded-2xl bg-[#FFA000]/10 text-[#C96B00] dark:text-[#FFCA28] flex items-center justify-center">
              <Clock3 className="w-7 h-7" />
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[#86868B] font-apple-text">
                {checkedOut ? 'Day complete' : checkedIn ? 'On the clock' : 'Not checked in'}
              </div>
              <div className="mt-0.5 flex items-center gap-3 text-xs font-apple-text text-[#3C4043] dark:text-[#D1D1D6]">
                <span>In: <strong className="tabular-nums">{todaysRow?.checkIn || '—'}</strong></span>
                <span>Out: <strong className="tabular-nums">{todaysRow?.checkOut || '—'}</strong></span>
              </div>
            </div>
          </div>

          <div className="flex-1" />

          {/* Primary actions */}
          <div className="flex flex-wrap items-center gap-2">
            <ConsoleButton
              variant={checkedIn ? 'secondary' : 'primary'}
              size="sm"
              icon={<LogIn className="w-3.5 h-3.5" />}
              disabled={checkedIn}
              onClick={handleCheckIn}
            >
              {checkedIn ? `In at ${todaysRow?.checkIn}` : 'Check In'}
            </ConsoleButton>
            <ConsoleButton
              variant={checkedOut ? 'secondary' : 'blue'}
              size="sm"
              icon={<LogOut className="w-3.5 h-3.5" />}
              disabled={!checkedIn || checkedOut}
              onClick={handleCheckOut}
            >
              {checkedOut ? `Out at ${todaysRow?.checkOut}` : 'Check Out'}
            </ConsoleButton>
          </div>
        </div>

        {/* Quick status corrections (self-report, desk can always override) */}
        <div className="mt-4 pt-3 border-t border-black/[0.06] dark:border-white/[0.08] flex flex-wrap items-center gap-2">
          <span className="text-[11px] text-[#86868B] font-apple-text">Today's status:</span>
          {ATTENDANCE_CYCLE.filter(s => s === 'half_day' || s === 'on_leave' || s === 'absent').map(status => {
            const meta = TEACHER_ATTENDANCE_META[status as 'half_day' | 'on_leave' | 'absent'];
            const active = todaysRow?.status === status;
            return (
              <button
                key={status}
                onClick={() => handleQuickStatus(status as 'half_day' | 'on_leave' | 'absent')}
                disabled={!canStamp}
                className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition active:scale-95 cursor-pointer disabled:opacity-40 ${
                  active
                    ? 'bg-[#1A73E8] border-[#1A73E8] text-white'
                    : 'bg-white dark:bg-[#282A2C] border-[#DADCE0] dark:border-[#3C4043] text-[#5F6368] dark:text-[#9AA0A6] hover:border-[#1A73E8]/50'
                }`}
              >
                {meta.label}
              </button>
            );
          })}
        </div>
      </ConsoleCard>

      {/* This month's tally */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricCard
            label="Present"
            value={String(summary.present)}
            accentColor="#188038"
            subtext={`${summary.workingDays} working days this month`}
          />
          <MetricCard
            label="Half Days"
            value={String(summary.halfDay)}
            accentColor="#FFA000"
            subtext="counted at 0.5"
          />
          <MetricCard
            label="On Leave"
            value={String(summary.onLeave)}
            accentColor="#1A73E8"
            subtext="approved leave stays paid"
          />
          <MetricCard
            label="Absent"
            value={String(summary.absent)}
            accentColor="#D93025"
            subtext="unmarked days count zero"
          />
        </div>
      )}

      {/* Salary slips */}
      <ConsoleCard
        title="My Salary Slips"
        subtitle="Issued by the centre — paid slips show how you were paid"
        icon={<Wallet className="w-4 h-4" />}
        action={
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#5F6368] dark:text-[#9AA0A6]">
            {pendingSlips > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-[#FFA000]/15 text-[#C96B00] dark:text-[#FFCA28]">
                {pendingSlips} awaiting pay
              </span>
            )}
            {paidSlips > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-[#34C759]/15 text-[#188038] dark:text-[#30D158]">
                {formatRupees(lifetimePaid)} paid to date
              </span>
            )}
          </div>
        }
      >
        {mySlips.length === 0 ? (
          <div className="py-8 text-center rounded-2xl border border-dashed border-black/[0.1] dark:border-white/[0.1]">
            <CalendarDays className="w-6 h-6 mx-auto text-[#C7C9CC] dark:text-[#48484A] mb-2" />
            <p className="text-xs text-[#86868B] dark:text-[#9AA0A6]">
              No salary slips yet — the centre issues them at month end.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            <AnimatePresence initial={false}>
              {mySlips.map(slip => {
                const meta = SALARY_SLIP_META[slip.status];
                return (
                  <motion.li
                    key={slip.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.22 }}
                    className="p-3.5 rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-white/90 dark:bg-[#1C1C1E]/90"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-bold text-[#1D1D1F] dark:text-[#F5F5F7] font-apple-text">
                            {slip.monthYear}
                          </span>
                          <StatusChip label={meta.label} variant={meta.variant} />
                          {slip.status === 'paid' && slip.paymentMethod && (
                            <span className="text-[11px] text-[#86868B]">via {slip.paymentMethod}</span>
                          )}
                        </div>
                        <div className="mt-1 text-[11px] text-[#5F6368] dark:text-[#9AA0A6]">
                          Basic {formatRupees(slip.basic)}
                          {slip.allowances > 0 && ` + allowances ${formatRupees(slip.allowances)}`}
                          {slip.deductions > 0 && ` − deductions ${formatRupees(slip.deductions)}`}
                          {' · issued '}
                          {new Date(slip.issuedAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-base font-bold font-apple-display text-[#1D1D1F] dark:text-[#F5F5F7] tabular-nums">
                          {formatRupees(slip.status === 'paid' ? slip.paidAmount || slip.netAmount : slip.netAmount)}
                        </div>
                        <div className="text-[10px] text-[#86868B]">
                          {slip.status === 'paid' && slip.paidAt
                            ? `paid ${new Date(slip.paidAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
                            : 'net payable'}
                        </div>
                      </div>
                    </div>
                    {slip.status === 'issued' && (
                      <div className="mt-2 rounded-xl bg-[#FFA000]/8 px-3 py-2 text-[11px] text-[#C96B00] dark:text-[#FFCA28]">
                        Issued — awaiting payment from the centre. Contact the front desk if this
                        stays unpaid past the first week of the next month.
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
