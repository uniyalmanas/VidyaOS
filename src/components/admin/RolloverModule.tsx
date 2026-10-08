import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, GraduationCap, CalendarCheck } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { nextAcademicYear, RolloverPlan } from '../../lib/rollover';
import { ConsoleCard, ConsoleButton } from '../ui';

/**
 * F12 — Session rollover. The admin picks the year pair, reviews the dry-run
 * plan grouped by batch (new name, carried students, editable monthly fee) and
 * confirms. Execution is one-way: old batches become `completed`, new batches
 * get their carried roster, and a first-month invoice is raised per student.
 */
export const RolloverModule: React.FC = () => {
  const {
    batches,
    students,
    previewRollover,
    executeRollover,
    suggestedRolloverYears,
    showToast
  } = useApp();

  const initialYears = React.useMemo(
    () => suggestedRolloverYears() ?? { fromYear: '2026-2027', toYear: '2027-2028' },
    // Seed once from the live roster.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  const [fromYear, setFromYear] = useState(initialYears.fromYear);
  const [toYear, setToYear] = useState(initialYears.toYear);
  const [feeOverrides, setFeeOverrides] = useState<Record<string, number>>({});
  const [plan, setPlan] = useState<RolloverPlan | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [running, setRunning] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  // Preview, and re-preview whenever the years, live roster, or edited fees change.
  // Running from an effect means the plan always reads the current roster rather
  // than a stale closure captured when a handler was created.
  useEffect(() => {
    setPlan(previewRollover({ fromYear, toYear, feeOverrides }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromYear, toYear, batches, students, feeOverrides, refreshTick]);

  const handleFromYear = (value: string) => {
    setFromYear(value);
    setToYear(nextAcademicYear(value));
  };

  const handleFee = (sourceBatchId: string, amount: number) => {
    setFeeOverrides(prev => ({ ...prev, [sourceBatchId]: Math.max(0, amount || 0) }));
  };

  const handleExecute = async () => {
    if (!plan) return;
    setRunning(true);
    try {
      const result = await executeRollover(plan);
      showToast(
        `Started ${plan.toYear}: ${result.batchesCreated} new batch${result.batchesCreated === 1 ? '' : 'es'}, ` +
          `${result.studentsCarried} student${result.studentsCarried === 1 ? '' : 's'} carried, ` +
          `${result.invoicesCreated} invoice${result.invoicesCreated === 1 ? '' : 's'} raised.`,
        'success'
      );
      setConfirming(false);
      setFeeOverrides({});
      // The preview effect re-runs against the updated roster once state settles.
      setFromYear(plan.toYear);
      setToYear(nextAcademicYear(plan.toYear));
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not start the new academic year.', 'error');
    } finally {
      setRunning(false);
    }
  };

  const rollable = plan ? plan.batches.filter(item => !item.skipReason) : [];
  const skipped = plan ? plan.batches.filter(item => item.skipReason) : [];

  return (
    <div className="space-y-4 sm:space-y-6">
      <ConsoleCard
        title="New Academic Year"
        subtitle="Roll every active batch and its active students into next year — fresh batches, completed old ones, and first-month invoices."
        icon={<CalendarCheck className="w-4 h-4" />}
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div className="space-y-1">
            <label className="block text-xs font-bold text-[#3C4043] dark:text-[#C4C7C5]">Academic year (from)</label>
            <input
              value={fromYear}
              onChange={e => handleFromYear(e.target.value)}
              placeholder="2026-2027"
              className="w-full text-xs font-medium text-[#202124] dark:text-[#E8EAED] bg-white dark:bg-[#1E1F20] border border-[#DADCE0] dark:border-[#3C4043] rounded-lg py-2 px-3 focus:outline-none focus:border-[#FFA000] focus:ring-2 focus:ring-[#FFA000]/25"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-bold text-[#3C4043] dark:text-[#C4C7C5]">Academic year (to)</label>
            <input
              value={toYear}
              onChange={e => setToYear(e.target.value)}
              placeholder="2027-2028"
              className="w-full text-xs font-medium text-[#202124] dark:text-[#E8EAED] bg-white dark:bg-[#1E1F20] border border-[#DADCE0] dark:border-[#3C4043] rounded-lg py-2 px-3 focus:outline-none focus:border-[#FFA000] focus:ring-2 focus:ring-[#FFA000]/25"
            />
          </div>
          <ConsoleButton variant="secondary" onClick={() => setRefreshTick(tick => tick + 1)}>
            Refresh preview
          </ConsoleButton>
          <ConsoleButton
            variant="primary"
            disabled={!plan || rollable.length === 0}
            onClick={() => setConfirming(true)}
          >
            Start new year
          </ConsoleButton>
        </div>

        {plan && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
            <PlanStat label="New batches" value={plan.newBatchCount} />
            <PlanStat label="Carried students" value={plan.carriedStudentCount} />
            <PlanStat label="Invoices to raise" value={plan.invoiceCount} />
            <PlanStat label="Left behind" value={skipped.length} />
          </div>
        )}
      </ConsoleCard>

      {plan && plan.batches.length === 0 && (
        <ConsoleCard>
          <p className="text-xs text-[#86868B]">
            No active batches found for {fromYear}. Add a batch first, then start the new year.
          </p>
        </ConsoleCard>
      )}

      {plan && plan.batches.length > 0 && (
        <ConsoleCard
          title={`Rollover plan · ${plan.fromYear} → ${plan.toYear}`}
          subtitle={`First invoice month: ${plan.firstInvoiceMonth}. Rows marked "leave behind" are not carried.`}
          noPadding
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-black/[0.02] dark:bg-white/[0.03] text-[10px] uppercase tracking-wider text-[#5F6368] dark:text-[#9AA0A6]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Batch</th>
                  <th className="px-4 py-3 font-semibold">Rolls into</th>
                  <th className="px-4 py-3 font-semibold text-center">Students</th>
                  <th className="px-4 py-3 font-semibold">Monthly fee (₹)</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {plan.batches.map(row => (
                  <tr
                    key={row.sourceBatchId}
                    className="border-t border-black/[0.06] dark:border-white/[0.08]"
                  >
                    <td className="px-4 py-3">
                      <div className="font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">{row.sourceName}</div>
                      <div className="text-[10px] text-[#86868B]">
                        {row.fromClassGrade} · {row.subject} · {row.timeSlot}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {row.toClassGrade ? (
                        <div className="font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">
                          {row.newName}
                          <div className="text-[10px] text-[#86868B]">
                            {row.fromClassGrade} → {row.toClassGrade}
                          </div>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[#D93025] dark:text-[#F28B82]">
                          <GraduationCap className="w-3.5 h-3.5" /> Graduates
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                        {row.carriedStudentIds.length}
                      </div>
                      {row.carriedStudentNames.length > 0 && (
                        <div className="text-[10px] text-[#86868B] truncate max-w-[180px]">
                          {row.carriedStudentNames.slice(0, 3).join(', ')}
                          {row.carriedStudentNames.length > 3
                            ? ` +${row.carriedStudentNames.length - 3}`
                            : ''}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {row.skipReason ? (
                        <span className="text-[#86868B]">—</span>
                      ) : (
                        <input
                          type="number"
                          min={0}
                          value={row.feeAmountMonthly}
                          onChange={e => handleFee(row.sourceBatchId, Number(e.target.value))}
                          className="w-24 text-xs font-medium text-[#202124] dark:text-[#E8EAED] bg-white dark:bg-[#1E1F20] border border-[#DADCE0] dark:border-[#3C4043] rounded-lg py-1.5 px-2 focus:outline-none focus:border-[#FFA000] focus:ring-2 focus:ring-[#FFA000]/25"
                        />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {row.skipReason ? (
                        <span className="inline-flex items-center gap-1 text-[#D93025] dark:text-[#F28B82]">
                          <AlertTriangle className="w-3.5 h-3.5" /> {row.skipReason}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[#188038] dark:text-[#81C995] font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Ready
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-black/[0.06] dark:border-white/[0.08] text-[11px] text-[#86868B]">
            {rollable.length} batch{rollable.length === 1 ? '' : 'es'} will roll · {plan.invoiceCount} first-month
            invoice{plan.invoiceCount === 1 ? '' : 's'} due {plan.firstInvoiceDueDate}. This action cannot be undone.
          </div>
        </ConsoleCard>
      )}

      {confirming && plan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-[#1C1C1E] rounded-2xl border border-black/[0.08] dark:border-white/[0.1] shadow-2xl">
            <div className="px-5 py-4 border-b border-black/[0.06] dark:border-white/[0.08]">
              <h3 className="text-sm font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                Start academic year {plan.toYear}?
              </h3>
              <p className="text-xs text-[#86868B] mt-0.5">
                One-way action. Old batches are archived as completed, not deleted.
              </p>
            </div>
            <div className="px-5 py-4 space-y-2 text-xs text-[#3C4043] dark:text-[#C4C7C5]">
              <p>
                Create <strong>{plan.newBatchCount}</strong> new batch{plan.newBatchCount === 1 ? '' : 'es'} for{' '}
                {plan.toYear}.
              </p>
              <p>
                Carry <strong>{plan.carriedStudentCount}</strong> active student
                {plan.carriedStudentCount === 1 ? '' : 's'} into {plan.toYear}.
              </p>
              <p>
                Raise {plan.invoiceCount} first-month invoice{plan.invoiceCount === 1 ? '' : 's'} due{' '}
                {plan.firstInvoiceDueDate}.
              </p>
              <p className="text-[#D93025] dark:text-[#F28B82] font-semibold">There is no undo.</p>
            </div>
            <div className="px-5 py-3 border-t border-black/[0.06] dark:border-white/[0.08] flex items-center justify-end gap-2">
              <ConsoleButton variant="ghost" onClick={() => setConfirming(false)} disabled={running}>
                Cancel
              </ConsoleButton>
              <ConsoleButton variant="primary" loading={running} onClick={handleExecute}>
                Start {plan.toYear}
              </ConsoleButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const PlanStat: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div className="rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-white/60 dark:bg-white/[0.03] px-3 py-2.5">
    <div className="text-[10px] uppercase tracking-wider text-[#86868B] font-semibold">{label}</div>
    <div className="text-lg font-bold text-[#1D1D1F] dark:text-[#F5F5F7]">{value}</div>
  </div>
);