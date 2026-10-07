import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users,
  CalendarRange,
  Wallet,
  ChevronLeft,
  ChevronRight,
  Plus,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Send,
  IndianRupee
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ConsoleCard, ConsoleButton, StatusChip, MetricCard } from '../ui';
import { SalarySlip, Teacher, PaymentRecord } from '../../types';
import {
  ATTENDANCE_CYCLE,
  TEACHER_ATTENDANCE_META,
  SALARY_SLIP_META,
  attendanceForDate,
  currentMonthKey,
  daysInMonthKey,
  formatRupees,
  monthDayList,
  monthYearFromKey,
  proratedSalaryHint,
  computeSlipNet,
  shiftMonthKey,
  slipsForMonth,
  summarizeTeacherMonth
} from '../../lib/staffOps';
import { getIndiaDateString } from '../../lib/date';

type ComposerStatus = 'draft' | 'issued';

/**
 * F4 — the front-desk Staff Ops console: a teachers × days attendance grid
 * for one month (click a cell to cycle its status), the month's salary slips
 * with pay-now actions, and a slip composer prefilled from `Teacher.salary`
 * that shows the live net total and the prorated hint from attendance.
 */
export const StaffOpsModule: React.FC = () => {
  const {
    teachers,
    teacherAttendance,
    salarySlips,
    markTeacherAttendance,
    clearTeacherAttendance,
    issueSalarySlip,
    issueDraftSlip,
    markSlipPaid,
    deleteSalarySlip,
    showToast
  } = useApp();

  const today = getIndiaDateString();
  const [monthKey, setMonthKey] = useState<string>(currentMonthKey(today));

  // Composer state
  const [composerOpen, setComposerOpen] = useState(false);
  const [cTeacherId, setCTeacherId] = useState('');
  const [cMonthKey, setCMonthKey] = useState<string>(currentMonthKey(today));
  const [cBasic, setCBasic] = useState('');
  const [cAllowances, setCAllowances] = useState('');
  const [cDeductions, setCDeductions] = useState('');
  const [cError, setCError] = useState<string | null>(null);

  // Pay-now modal state
  const [payTarget, setPayTarget] = useState<SalarySlip | null>(null);
  const [payMethod, setPayMethod] = useState<PaymentRecord['paymentMethod']>('Cash');
  const [deleteTarget, setDeleteTarget] = useState<SalarySlip | null>(null);

  const days = useMemo(() => monthDayList(monthKey), [monthKey]);
  const isCurrentMonth = monthKey === currentMonthKey(today);

  const monthRows = useMemo(
    () => new Set(teacherAttendance.filter(r => r.date.startsWith(monthKey)).map(r => r.teacherId)),
    [teacherAttendance, monthKey]
  );
  const monthSlips = useMemo(() => slipsForMonth(salarySlips, monthKey), [salarySlips, monthKey]);

  const presentToday = useMemo(
    () =>
      teachers.filter(t => attendanceForDate(teacherAttendance, t.id, today)?.status === 'present')
        .length,
    [teachers, teacherAttendance, today]
  );
  const absentToday = useMemo(
    () =>
      teachers.filter(t => {
        const row = attendanceForDate(teacherAttendance, t.id, today);
        return row?.status === 'absent';
      }).length,
    [teachers, teacherAttendance, today]
  );
  const unmarkedToday = useMemo(
    () => teachers.filter(t => !attendanceForDate(teacherAttendance, t.id, today)).length,
    [teachers, teacherAttendance, today]
  );
  const pendingPay = monthSlips.filter(s => s.status === 'issued').length;
  const paidThisMonth = monthSlips
    .filter(s => s.status === 'paid')
    .reduce((sum, s) => sum + (s.paidAmount || s.netAmount), 0);

  const cycleCell = (teacherId: string, date: string) => {
    // Don't stamp future days — the calendar has not happened yet.
    if (date > today) return;
    const existing = attendanceForDate(teacherAttendance, teacherId, date);
    const currentIndex = existing
      ? ATTENDANCE_CYCLE.indexOf(existing.status)
      : ATTENDANCE_CYCLE.length - 1; // blank cell starts at the end → 'present'
    const next = ATTENDANCE_CYCLE[(currentIndex + 1) % ATTENDANCE_CYCLE.length];
    if (next === null) {
      clearTeacherAttendance(teacherId, date);
      return;
    }
    markTeacherAttendance(teacherId, next, { date });
  };

  const openComposer = () => {
    const teacher = teachers.find(t => t.id === cTeacherId) || teachers[0];
    setCTeacherId(teacher?.id || '');
    setCMonthKey(currentMonthKey(today));
    setCBasic(teacher?.salary != null ? String(teacher.salary) : '');
    setCAllowances('0');
    setCDeductions('0');
    setCError(null);
    setComposerOpen(true);
  };

  const composerTeacher: Teacher | undefined = useMemo(
    () => teachers.find(t => t.id === cTeacherId),
    [teachers, cTeacherId]
  );
  const composerSummary = useMemo(
    () =>
      composerTeacher
        ? summarizeTeacherMonth(teacherAttendance, composerTeacher.id, cMonthKey, today)
        : null,
    [teacherAttendance, composerTeacher, cMonthKey, today]
  );
  const cBasicNum = Number(cBasic) || 0;
  const cAllowNum = Number(cAllowances) || 0;
  const cDeductNum = Number(cDeductions) || 0;
  const cNet = computeSlipNet(cBasicNum, cAllowNum, cDeductNum);
  const cHint = composerSummary ? proratedSalaryHint(cBasicNum, composerSummary) : cBasicNum;

  const handleComposerTeacherChange = (teacherId: string) => {
    setCTeacherId(teacherId);
    const teacher = teachers.find(t => t.id === teacherId);
    if (teacher?.salary != null) setCBasic(String(teacher.salary));
    setCError(null);
  };

  const submitComposer = (status: ComposerStatus) => {
    if (!cTeacherId) {
      setCError('Pick the faculty member this slip is for.');
      return;
    }
    if (!cMonthKey || !monthYearFromKey(cMonthKey)) {
      setCError('Pick a valid salary month.');
      return;
    }
    if (cBasicNum <= 0) {
      setCError('Basic pay must be more than zero.');
      return;
    }
    const created = issueSalarySlip({
      teacherId: cTeacherId,
      monthYear: monthYearFromKey(cMonthKey),
      basic: cBasicNum,
      allowances: cAllowNum,
      deductions: cDeductNum,
      status
    });
    if (!created) {
      setCError('Could not issue the slip — check the details and try again.');
      return;
    }
    const teacherName = composerTeacher?.name || 'faculty member';
    showToast(
      status === 'issued'
        ? `${created.monthYear} slip issued to ${teacherName} — they've been notified.`
        : `Draft slip saved for ${teacherName}.`,
      'success'
    );
    setComposerOpen(false);
  };

  const handleIssueDraft = (slip: SalarySlip) => {
    const teacherName = teachers.find(t => t.id === slip.teacherId)?.name || 'faculty member';
    issueDraftSlip(slip.id);
    showToast(
      `${slip.monthYear} slip issued to ${teacherName} — they've been notified.`,
      'success'
    );
  };

  const confirmPay = () => {
    if (!payTarget) return;
    const teacherName = teachers.find(t => t.id === payTarget.teacherId)?.name || 'faculty member';
    markSlipPaid(payTarget.id, payMethod);
    showToast(
      `${payTarget.monthYear} salary marked paid for ${teacherName} (${formatRupees(
        payTarget.netAmount
      )} via ${payMethod}).`,
      'success'
    );
    setPayTarget(null);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteSalarySlip(deleteTarget.id);
    showToast('Salary slip removed.', 'success');
    setDeleteTarget(null);
  };

  const formField =
    'w-full border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2C] text-[#202124] dark:text-[#E8EAED] rounded-lg p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#1A73E8]/40';

  const methods: PaymentRecord['paymentMethod'][] = ['Cash', 'UPI', 'NetBanking', 'Cheque'];

  return (
    <div className="space-y-4">
      {/* Summary strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          label="Checked In Today"
          value={String(presentToday)}
          accentColor="#188038"
          subtext={teachers.length > 0 ? `of ${teachers.length} faculty` : 'no faculty yet'}
        />
        <MetricCard
          label="Unmarked Today"
          value={String(unmarkedToday)}
          accentColor={unmarkedToday > 0 ? '#FFA000' : '#188038'}
          subtext={unmarkedToday > 0 ? 'tap a grid cell to stamp' : 'all stamped'}
        />
        <MetricCard
          label="Slips Awaiting Pay"
          value={String(pendingPay)}
          accentColor={pendingPay > 0 ? '#FFA000' : '#188038'}
          subtext={`for ${monthYearFromKey(monthKey) || 'this month'}`}
        />
        <MetricCard
          label="Paid This Month"
          value={formatRupees(paidThisMonth)}
          accentColor="#1A73E8"
          subtext={`${monthSlips.filter(s => s.status === 'paid').length} slip(s) settled`}
        />
      </div>

      {/* Attendance grid */}
      <ConsoleCard
        title="Faculty Attendance Grid"
        subtitle="Click a cell to cycle present → half day → on leave → absent → clear — one row per teacher per day"
        icon={<CalendarRange className="w-4 h-4" />}
        action={
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setMonthKey(prev => shiftMonthKey(prev, -1))}
              aria-label="Previous month"
              className="p-1.5 rounded-lg border border-[#DADCE0] dark:border-[#3C4043] text-[#5F6368] dark:text-[#9AA0A6] hover:bg-[#F1F3F4] dark:hover:bg-[#282A2C] transition active:scale-95"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold text-[#202124] dark:text-[#E8EAED] min-w-[110px] text-center font-apple-text">
              {monthYearFromKey(monthKey) || monthKey}
            </span>
            <button
              onClick={() => setMonthKey(prev => shiftMonthKey(prev, 1))}
              disabled={monthKey >= currentMonthKey(today)}
              aria-label="Next month"
              className="p-1.5 rounded-lg border border-[#DADCE0] dark:border-[#3C4043] text-[#5F6368] dark:text-[#9AA0A6] hover:bg-[#F1F3F4] dark:hover:bg-[#282A2C] transition active:scale-95 disabled:opacity-35 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <ConsoleButton variant="primary" size="xs" icon={<Plus className="w-3.5 h-3.5" />} onClick={openComposer}>
              Issue slip
            </ConsoleButton>
          </div>
        }
      >
        {teachers.length === 0 ? (
          <div className="py-8 text-center rounded-2xl border border-dashed border-[#DADCE0] dark:border-[#3C4043]">
            <Users className="w-6 h-6 mx-auto text-[#C7C9CC] dark:text-[#48484A] mb-2" />
            <p className="text-xs text-[#5F6368] dark:text-[#9AA0A6]">
              No faculty in this centre yet — add teachers first, then their daily grid appears here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar -mx-1 px-1">
            <table className="w-full border-collapse min-w-[640px]">
              <thead>
                <tr>
                  <th className="text-left text-[10px] font-bold uppercase tracking-wider text-[#86868B] pb-2 pr-3 sticky left-0 bg-white dark:bg-[#1C1C1E] z-10">
                    Faculty
                  </th>
                  {days.map(day => (
                    <th
                      key={day.date}
                      title={`${day.weekdayShort}, ${day.date}`}
                      className={`text-[9px] font-bold pb-2 px-0.5 min-w-[22px] ${
                        day.isSunday
                          ? 'text-[#C7C9CC] dark:text-[#48484A]'
                          : day.date === today
                          ? 'text-[#C96B00] dark:text-[#FFCA28]'
                          : 'text-[#86868B]'
                      }`}
                    >
                      {day.dayNumber}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {teachers.map(teacher => (
                  <tr key={teacher.id} className="border-t border-black/[0.05] dark:border-white/[0.06]">
                    <td className="py-1.5 pr-3 text-xs font-semibold text-[#202124] dark:text-[#E8EAED] whitespace-nowrap sticky left-0 bg-white dark:bg-[#1C1C1E] z-10">
                      <span className="flex items-center gap-1.5">
                        <span
                          className={`inline-flex items-center justify-center w-4 h-4 rounded text-[8px] font-bold text-white ${
                            teacher.status === 'on_leave' ? 'bg-[#1A73E8]' : 'bg-[#9334E6]'
                          }`}
                        >
                          F
                        </span>
                        <span className="truncate max-w-[130px]">{teacher.name}</span>
                      </span>
                    </td>
                    {days.map(day => {
                      const row = attendanceForDate(teacherAttendance, teacher.id, day.date);
                      const future = day.date > today;
                      const meta = row ? TEACHER_ATTENDANCE_META[row.status] : null;
                      return (
                        <td key={day.date} className="px-0.5 py-1 text-center">
                          <button
                            onClick={() => cycleCell(teacher.id, day.date)}
                            disabled={future}
                            title={
                              future
                                ? 'Not yet'
                                : meta
                                ? `${teacher.name} · ${day.date} — ${meta.label}${row?.checkIn ? ` (in ${row.checkIn})` : ''}${row?.checkOut ? ` (out ${row.checkOut})` : ''}`
                                : `${teacher.name} · ${day.date} — unmarked, click to mark present`
                            }
                            className={`w-[18px] h-[18px] rounded-[5px] transition cursor-pointer active:scale-90 ${
                              future
                                ? 'bg-black/[0.03] dark:bg-white/[0.04] cursor-not-allowed opacity-40'
                                : row
                                ? 'shadow-sm hover:brightness-110'
                                : 'bg-black/[0.06] dark:bg-white/[0.08] hover:bg-[#188038]/40'
                            }`}
                            style={
                              row && meta
                                ? { backgroundColor: meta.accent, opacity: day.date === today ? 1 : 0.88 }
                                : undefined
                            }
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Legend */}
            <div className="mt-3 flex flex-wrap items-center gap-3 text-[10px] text-[#5F6368] dark:text-[#9AA0A6]">
              {(['present', 'half_day', 'on_leave', 'absent'] as const).map(status => (
                <span key={status} className="inline-flex items-center gap-1">
                  <span
                    className="w-2.5 h-2.5 rounded-[3px]"
                    style={{ backgroundColor: TEACHER_ATTENDANCE_META[status].accent }}
                  />
                  {TEACHER_ATTENDANCE_META[status].label}
                </span>
              ))}
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-[3px] bg-black/[0.06] dark:bg-white/[0.08]" />
                Unmarked
              </span>
              {isCurrentMonth && (
                <span className="ml-auto text-[10px] text-[#86868B]">
                  {monthRows.size} faculty with entries this month · Sundays shaded blank
                </span>
              )}
            </div>
          </div>
        )}
      </ConsoleCard>

      {/* Salary slips for the selected month */}
      <ConsoleCard
        title="Salary Slips"
        subtitle={`Issued for ${monthYearFromKey(monthKey) || monthKey} — draft stays internal, issue notifies, pay settles`}
        icon={<Wallet className="w-4 h-4" />}
        action={
          <ConsoleButton variant="primary" size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={openComposer}>
            Compose slip
          </ConsoleButton>
        }
      >
        {monthSlips.length === 0 ? (
          <div className="py-8 text-center rounded-2xl border border-dashed border-[#DADCE0] dark:border-[#3C4043]">
            <Wallet className="w-6 h-6 mx-auto text-[#C7C9CC] dark:text-[#48484A] mb-2" />
            <p className="text-xs text-[#5F6368] dark:text-[#9AA0A6]">
              No slips for this month yet — hit “Compose slip” and the basic pay prefills from the
              faculty member's profile.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence initial={false} mode="popLayout">
              {monthSlips.map(slip => {
                const meta = SALARY_SLIP_META[slip.status];
                const teacher = teachers.find(t => t.id === slip.teacherId);
                return (
                  <motion.div
                    key={slip.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    transition={{ duration: 0.22 }}
                    className="p-3.5 rounded-2xl border border-[#E8EAED] dark:border-[#333537] bg-white dark:bg-[#1F1F1F] flex flex-wrap items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-[#202124] dark:text-[#E8EAED] font-apple-text">
                          {teacher?.name || slip.teacherId}
                        </span>
                        <StatusChip label={meta.label} variant={meta.variant} />
                        <span className="text-[11px] text-[#5F6368] dark:text-[#9AA0A6]">
                          {slip.monthYear}
                        </span>
                      </div>
                      <div className="mt-1 text-[11px] text-[#5F6368] dark:text-[#9AA0A6]">
                        Basic {formatRupees(slip.basic)} + {formatRupees(slip.allowances)} −{' '}
                        {formatRupees(slip.deductions)} ={' '}
                        <strong className="text-[#202124] dark:text-[#E8EAED]">
                          {formatRupees(slip.netAmount)}
                        </strong>
                        {slip.status === 'paid' && (
                          <>
                            {' · paid '}
                            {slip.paymentMethod || '—'}
                            {slip.paidBy ? ` by ${slip.paidBy}` : ''}
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {slip.status === 'draft' && (
                        <ConsoleButton
                          variant="primary"
                          size="xs"
                          icon={<Send className="w-3 h-3" />}
                          onClick={() => handleIssueDraft(slip)}
                        >
                          Issue
                        </ConsoleButton>
                      )}
                      {slip.status === 'issued' && (
                        <ConsoleButton
                          variant="blue"
                          size="xs"
                          icon={<CheckCircle2 className="w-3 h-3" />}
                          onClick={() => {
                            setPayMethod('Cash');
                            setPayTarget(slip);
                          }}
                        >
                          Pay now
                        </ConsoleButton>
                      )}
                      <button
                        onClick={() => setDeleteTarget(slip)}
                        title="Delete slip"
                        className="inline-flex items-center rounded-lg bg-[#FCE8E6] dark:bg-[#3C2A2A] p-1.5 text-[#D93025] dark:text-[#F28B82] hover:bg-[#FAD2CF] dark:hover:bg-[#4A3533] transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </ConsoleCard>

      {/* Slip composer modal */}
      <AnimatePresence>
        {composerOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setComposerOpen(false)}
          >
            <motion.form
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.97 }}
              transition={{ duration: 0.18 }}
              onSubmit={e => {
                e.preventDefault();
                submitComposer('issued');
              }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white dark:bg-[#1F1F1F] border border-[#DADCE0] dark:border-[#3C4043] rounded-2xl shadow-2xl p-5 space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-[#202124] dark:text-[#E8EAED]">Compose Salary Slip</h3>
                  <p className="text-[11px] text-[#5F6368] dark:text-[#9AA0A6] mt-0.5">
                    Basic prefills from the faculty member's profile · the net total updates live.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setComposerOpen(false)}
                  className="text-[#80868B] hover:text-[#202124] dark:hover:text-[#E8EAED] text-lg leading-none"
                >
                  ×
                </button>
              </div>

              <label className="block space-y-1">
                <span className="text-[11px] font-semibold text-[#5F6368] dark:text-[#9AA0A6]">Faculty member</span>
                <select
                  value={cTeacherId}
                  onChange={e => handleComposerTeacherChange(e.target.value)}
                  className={formField}
                >
                  <option value="">Select a faculty member…</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                      {t.salary != null ? ` · ₹${t.salary}/month` : ''}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-1">
                <span className="text-[11px] font-semibold text-[#5F6368] dark:text-[#9AA0A6]">Salary month</span>
                <select value={cMonthKey} onChange={e => setCMonthKey(e.target.value)} className={formField}>
                  {[0, -1, -2].map(delta => {
                    const key = shiftMonthKey(currentMonthKey(today), delta);
                    return (
                      <option key={key} value={key}>
                        {monthYearFromKey(key)}
                      </option>
                    );
                  })}
                </select>
              </label>

              <div className="grid grid-cols-3 gap-2">
                <label className="space-y-1">
                  <span className="text-[11px] font-semibold text-[#5F6368] dark:text-[#9AA0A6]">Basic ₹</span>
                  <input
                    type="number"
                    min={0}
                    value={cBasic}
                    onChange={e => setCBasic(e.target.value)}
                    className={formField}
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-[11px] font-semibold text-[#5F6368] dark:text-[#9AA0A6]">Allowances ₹</span>
                  <input
                    type="number"
                    min={0}
                    value={cAllowances}
                    onChange={e => setCAllowances(e.target.value)}
                    className={formField}
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-[11px] font-semibold text-[#5F6368] dark:text-[#9AA0A6]">Deductions ₹</span>
                  <input
                    type="number"
                    min={0}
                    value={cDeductions}
                    onChange={e => setCDeductions(e.target.value)}
                    className={formField}
                  />
                </label>
              </div>

              {/* Live net + prorated attendance hint */}
              <div className="rounded-xl bg-[#F1F3F4] dark:bg-[#282A2C] p-3 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#5F6368] dark:text-[#9AA0A6] font-semibold">Net payable</span>
                  <span className="flex items-center gap-1 text-sm font-bold text-[#188038] dark:text-[#30D158] tabular-nums">
                    <IndianRupee className="w-3.5 h-3.5" />
                    {formatRupees(cNet)}
                  </span>
                </div>
                {composerSummary && (
                  <div className="flex flex-wrap items-center justify-between gap-1 text-[10px] text-[#5F6368] dark:text-[#9AA0A6]">
                    <span>
                      Attendance hint: {composerSummary.present} present · {composerSummary.halfDay} half ·{' '}
                      {composerSummary.onLeave} on leave · {composerSummary.absent} absent of{' '}
                      {composerSummary.workingDays} working days
                    </span>
                    <span className="font-semibold">
                      prorated ≈ {formatRupees(cHint)}
                    </span>
                  </div>
                )}
                <p className="text-[10px] text-[#80868B]">
                  The hint is advisory — the net above is what gets issued unless you edit the fields.
                </p>
              </div>

              {cError && (
                <p className="flex items-start gap-1.5 text-[11px] text-[#D93025] dark:text-[#F28B82]">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-px" />
                  {cError}
                </p>
              )}

              <div className="flex flex-wrap justify-end gap-2 pt-1">
                <ConsoleButton type="button" variant="ghost" size="sm" onClick={() => setComposerOpen(false)}>
                  Cancel
                </ConsoleButton>
                <ConsoleButton
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => submitComposer('draft')}
                >
                  Save draft
                </ConsoleButton>
                <ConsoleButton type="submit" variant="primary" size="sm" icon={<Send className="w-3.5 h-3.5" />}>
                  Issue slip
                </ConsoleButton>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pay-now modal */}
      <AnimatePresence>
        {payTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setPayTarget(null)}
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
                <CheckCircle2 className="w-5 h-5 text-[#188038] dark:text-[#30D158] flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-bold text-[#202124] dark:text-[#E8EAED]">Mark salary as paid?</h3>
                  <p className="text-[11px] text-[#5F6368] dark:text-[#9AA0A6] mt-1">
                    {teachers.find(t => t.id === payTarget.teacherId)?.name || 'Faculty'} ·{' '}
                    {payTarget.monthYear} ·{' '}
                    <strong className="text-[#202124] dark:text-[#E8EAED]">
                      {formatRupees(payTarget.netAmount)}
                    </strong>{' '}
                    — records the payment, writes an audit entry and notifies the teacher.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-1.5 p-1 rounded-xl bg-[#F1F3F4] dark:bg-[#282A2C]">
                {methods.map(method => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setPayMethod(method)}
                    className={`py-2 rounded-lg text-[11px] font-bold transition-colors ${
                      payMethod === method
                        ? 'bg-white dark:bg-[#3C4043] text-[#202124] dark:text-[#E8EAED] shadow'
                        : 'text-[#5F6368] dark:text-[#9AA0A6]'
                    }`}
                  >
                    {method}
                  </button>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <ConsoleButton variant="ghost" size="sm" onClick={() => setPayTarget(null)}>
                  Cancel
                </ConsoleButton>
                <ConsoleButton variant="primary" size="sm" icon={<CheckCircle2 className="w-3.5 h-3.5" />} onClick={confirmPay}>
                  Mark paid
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
                <AlertCircle className="w-5 h-5 text-[#D93025] dark:text-[#F28B82] flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-bold text-[#202124] dark:text-[#E8EAED]">Delete this slip?</h3>
                  <p className="text-[11px] text-[#5F6368] dark:text-[#9AA0A6] mt-1">
                    {teachers.find(t => t.id === deleteTarget.teacherId)?.name || 'Faculty'} ·{' '}
                    {deleteTarget.monthYear} · {formatRupees(deleteTarget.netAmount)} — the removal is
                    recorded in the audit trail.
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
    </div>
  );
};
