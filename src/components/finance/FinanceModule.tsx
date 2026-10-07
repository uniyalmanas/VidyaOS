import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Pencil,
  AlertCircle,
  IndianRupee,
  TrendingUp,
  TrendingDown,
  Wallet,
  Receipt,
  PieChart
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ConsoleCard, ConsoleButton, MetricCard, StatusChip } from '../ui';
import { Expense, ExpenseCategory, PaymentRecord } from '../../types';
import {
  buildProfitAndLoss,
  categoryTotals,
  expensesForMonth,
  formatRupees,
  validateExpense,
  sortExpensesNewestFirst,
  searchExpenses,
  currentMonthKey,
  shiftMonthKey,
  monthYearFromKey,
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_LABEL,
  EXPENSE_CATEGORY_COLOR
} from '../../lib/finance';
import { getIndiaDateString } from '../../lib/date';

type FormState = {
  title: string;
  category: ExpenseCategory;
  amount: string;
  expenseDate: string;
  paymentMethod: PaymentRecord['paymentMethod'];
  vendor: string;
  notes: string;
};

const EMPTY_FORM = (today: string): FormState => ({
  title: '',
  category: 'rent',
  amount: '',
  expenseDate: today,
  paymentMethod: 'Cash',
  vendor: '',
  notes: ''
});

const EXPENSE_METHODS: PaymentRecord['paymentMethod'][] = [
  'Cash',
  'UPI',
  'NetBanking',
  'Cheque',
  'Card'
];

/**
 * F5 — the owner's Profit & Loss desk: fees received vs money spent for a
 * chosen month, a category breakdown, and the expense ledger with add/edit/
 * delete. Amounts are cash-basis; paid salary slips roll into "Salaries".
 */
export const FinanceModule: React.FC = () => {
  const {
    invoices,
    expenses,
    salarySlips,
    addExpense,
    updateExpense,
    deleteExpense,
    showToast
  } = useApp();

  const today = getIndiaDateString();
  const [monthKey, setMonthKey] = useState<string>(currentMonthKey(today));
  const [query, setQuery] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM(today));
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);

  const summary = useMemo(
    () => buildProfitAndLoss(monthKey, { invoices, expenses, salarySlips }),
    [monthKey, invoices, expenses, salarySlips]
  );

  const monthLabel = monthYearFromKey(monthKey) || monthKey;
  const isCurrentMonth = monthKey === currentMonthKey(today);

  const monthExpenses = useMemo(
    () => sortExpensesNewestFirst(expensesForMonth(expenses, monthKey)),
    [expenses, monthKey]
  );
  const visibleExpenses = useMemo(
    () => searchExpenses(monthExpenses, query),
    [monthExpenses, query]
  );

  const bars = useMemo(
    () => categoryTotals(expenses, monthKey, summary.salaryTotal, summary.salarySlipCount),
    [expenses, monthKey, summary.salaryTotal, summary.salarySlipCount]
  );
  const maxBar = bars.reduce((max, bar) => Math.max(max, bar.amount), 0);
  const profit = summary.net >= 0;

  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM(isCurrentMonth ? today : `${monthKey}-01`));
    setFormError(null);
    setFormOpen(true);
  };

  const openEdit = (expense: Expense) => {
    setEditingId(expense.id);
    setForm({
      title: expense.title,
      category: expense.category,
      amount: String(expense.amount),
      expenseDate: expense.expenseDate,
      paymentMethod: expense.paymentMethod,
      vendor: expense.vendor ?? '',
      notes: expense.notes ?? ''
    });
    setFormError(null);
    setFormOpen(true);
  };

  const submitForm = () => {
    const amount = Number(form.amount);
    const validationError = validateExpense({
      title: form.title,
      amount,
      expenseDate: form.expenseDate
    });
    if (validationError) {
      setFormError(validationError);
      return;
    }

    const payload = {
      title: form.title.trim(),
      category: form.category,
      amount,
      expenseDate: form.expenseDate,
      paymentMethod: form.paymentMethod,
      vendor: form.vendor.trim() || undefined,
      notes: form.notes.trim() || undefined
    };

    const saved = editingId
      ? updateExpense(editingId, payload)
      : addExpense(payload);

    if (!saved) {
      setFormError('Could not save this expense — check the details and try again.');
      return;
    }

    showToast(
      editingId
        ? `Expense updated — ${formatRupees(saved.amount)} ${EXPENSE_CATEGORY_LABEL[saved.category]}.`
        : `Expense recorded — ${formatRupees(saved.amount)} ${EXPENSE_CATEGORY_LABEL[saved.category]}.`,
      'success'
    );
    setFormOpen(false);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteExpense(deleteTarget.id);
    showToast('Expense removed from the ledger.', 'success');
    setDeleteTarget(null);
  };

  const formField =
    'w-full border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2C] text-[#202124] dark:text-[#E8EAED] rounded-lg p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#1A73E8]/40';

  return (
    <div className="space-y-4">
      {/* Money-in / money-out headline */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          label="Fees Received"
          value={formatRupees(summary.income)}
          accentColor="#188038"
          subtext={`${summary.incomePaymentCount} payment(s) · ${summary.incomeInvoiceCount} invoice(s)`}
        />
        <MetricCard
          label="Money Out"
          value={formatRupees(summary.expense)}
          accentColor="#D93025"
          subtext={
            summary.salaryTotal > 0
              ? `incl. ${formatRupees(summary.salaryTotal)} salaries`
              : `${monthExpenses.length} expense(s)`
          }
        />
        <MetricCard
          label={profit ? 'Net Profit' : 'Net Loss'}
          value={formatRupees(Math.abs(summary.net))}
          accentColor={profit ? '#188038' : '#D93025'}
          subtext={summary.income > 0 ? `${summary.marginPct}% of fees received` : 'no fees received yet'}
        />
        <MetricCard
          label="Ledger Entries"
          value={String(monthExpenses.length)}
          accentColor="#1A73E8"
          subtext={summary.salarySlipCount > 0 ? `+ ${summary.salarySlipCount} paid slip(s)` : `${monthLabel}`}
        />
      </div>

      {/* Month selector + add */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setMonthKey(prev => shiftMonthKey(prev, -1))}
            aria-label="Previous month"
            className="p-2 rounded-lg border border-[#DADCE0] dark:border-[#3C4043] text-[#5F6368] dark:text-[#9AA0A6] hover:bg-[#F1F3F4] dark:hover:bg-[#282A2C] transition active:scale-95"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-bold text-[#202124] dark:text-[#E8EAED] min-w-[130px] text-center font-apple-text">
            {monthLabel}
          </span>
          <button
            onClick={() => setMonthKey(prev => shiftMonthKey(prev, 1))}
            disabled={monthKey >= currentMonthKey(today)}
            aria-label="Next month"
            className="p-2 rounded-lg border border-[#DADCE0] dark:border-[#3C4043] text-[#5F6368] dark:text-[#9AA0A6] hover:bg-[#F1F3F4] dark:hover:bg-[#282A2C] transition active:scale-95 disabled:opacity-35 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div
          className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ${
            profit
              ? 'bg-[#E6F4EA] text-[#188038] dark:bg-[#1E3A28] dark:text-[#30D158]'
              : 'bg-[#FCE8E6] text-[#D93025] dark:bg-[#3C2020] dark:text-[#F28B82]'
          }`}
        >
          {profit ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
          {profit ? 'In profit' : 'In loss'} this month
        </div>
        <ConsoleButton
          variant="primary"
          size="sm"
          icon={<Plus className="w-3.5 h-3.5" />}
          onClick={openAdd}
        >
          Record expense
        </ConsoleButton>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Category breakdown */}
        <ConsoleCard
          title="Where the money went"
          subtitle={`${monthLabel} · expenses grouped by category`}
          icon={<PieChart className="w-4 h-4" />}
        >
          {bars.length === 0 ? (
            <div className="py-8 text-center rounded-2xl border border-dashed border-[#DADCE0] dark:border-[#3C4043]">
              <Receipt className="w-6 h-6 mx-auto text-[#C7C9CC] dark:text-[#48484A] mb-2" />
              <p className="text-xs text-[#5F6368] dark:text-[#9AA0A6]">
                No spending recorded for {monthLabel}. Record rent, bills or salaries and they appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {bars.map(bar => (
                <div key={bar.category} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 font-semibold text-[#202124] dark:text-[#E8EAED]">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: bar.color }} />
                      {bar.label}
                      <span className="text-[10px] font-normal text-[#86868B]">
                        · {bar.count} entr{bar.count === 1 ? 'y' : 'ies'}
                      </span>
                    </span>
                    <span className="tabular-nums font-semibold text-[#202124] dark:text-[#E8EAED]">
                      {formatRupees(bar.amount)}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-[#F1F3F4] dark:bg-[#282A2C] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${maxBar > 0 ? Math.max(4, (bar.amount / maxBar) * 100) : 0}%`,
                        backgroundColor: bar.color
                      }}
                    />
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between pt-1 border-t border-black/[0.06] dark:border-white/[0.08] text-xs">
                <span className="font-semibold text-[#5F6368] dark:text-[#9AA0A6]">Total money out</span>
                <span className="font-bold text-[#D93025] dark:text-[#F28B82] tabular-nums">
                  {formatRupees(summary.expense)}
                </span>
              </div>
            </div>
          )}
        </ConsoleCard>

        {/* The plain-English equation */}
        <ConsoleCard
          title="The month in one line"
          subtitle="Cash basis — fees actually received minus money actually spent"
          icon={<IndianRupee className="w-4 h-4" />}
        >
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-[#5F6368] dark:text-[#9AA0A6]">Fees received</span>
              <span className="tabular-nums font-semibold text-[#188038] dark:text-[#30D158]">
                + {formatRupees(summary.income)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#5F6368] dark:text-[#9AA0A6]">Recorded expenses</span>
              <span className="tabular-nums font-semibold text-[#D93025] dark:text-[#F28B82]">
                − {formatRupees(summary.recordedExpense)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#5F6368] dark:text-[#9AA0A6]">
                Salaries paid
                {summary.salarySlipCount > 0 ? ` (${summary.salarySlipCount} slip(s))` : ''}
              </span>
              <span className="tabular-nums font-semibold text-[#D93025] dark:text-[#F28B82]">
                − {formatRupees(summary.salaryTotal)}
              </span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-black/[0.06] dark:border-white/[0.08]">
              <span className="font-bold text-[#202124] dark:text-[#E8EAED]">
                {profit ? 'Net profit' : 'Net loss'}
              </span>
              <span
                className={`tabular-nums text-lg font-bold ${
                  profit ? 'text-[#188038] dark:text-[#30D158]' : 'text-[#D93025] dark:text-[#F28B82]'
                }`}
              >
                {profit ? '' : '− '}
                {formatRupees(Math.abs(summary.net))}
              </span>
            </div>
            <p className="text-[10px] text-[#80868B] pt-1">
              A payment still awaiting UPI verification is not counted as received. Only salary slips
              marked <strong>paid</strong> reduce the profit.
            </p>
          </div>
        </ConsoleCard>
      </div>

      {/* Expense ledger */}
      <ConsoleCard
        title="Expense ledger"
        subtitle={`Every money-out entry for ${monthLabel}`}
        icon={<Wallet className="w-4 h-4" />}
        action={
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search expenses…"
            className="w-40 border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2C] text-[#202124] dark:text-[#E8EAED] rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#1A73E8]/40"
          />
        }
      >
        {visibleExpenses.length === 0 ? (
          <div className="py-8 text-center rounded-2xl border border-dashed border-[#DADCE0] dark:border-[#3C4043]">
            <Receipt className="w-6 h-6 mx-auto text-[#C7C9CC] dark:text-[#48484A] mb-2" />
            <p className="text-xs text-[#5F6368] dark:text-[#9AA0A6]">
              {monthExpenses.length === 0
                ? `Nothing spent in ${monthLabel} yet — tap "Record expense" to log rent, bills or salaries.`
                : 'No expenses match your search.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-black/[0.05] dark:divide-white/[0.06]">
            {visibleExpenses.map(expense => (
              <div key={expense.id} className="flex items-start gap-3 py-2.5">
                <span
                  className="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0"
                  style={{ backgroundColor: EXPENSE_CATEGORY_COLOR[expense.category] }}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-[#202124] dark:text-[#E8EAED] truncate">
                      {expense.title}
                    </span>
                    <StatusChip
                      label={EXPENSE_CATEGORY_LABEL[expense.category]}
                      variant="neutral"
                    />
                  </div>
                  <p className="text-[10px] text-[#5F6368] dark:text-[#9AA0A6] mt-0.5">
                    {expense.expenseDate} · {expense.paymentMethod}
                    {expense.vendor ? ` · ${expense.vendor}` : ''}
                    {expense.notes ? ` · ${expense.notes}` : ''}
                  </p>
                </div>
                <span className="tabular-nums text-sm font-bold text-[#D93025] dark:text-[#F28B82] whitespace-nowrap">
                  {formatRupees(expense.amount)}
                </span>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => openEdit(expense)}
                    aria-label={`Edit ${expense.title}`}
                    className="p-1.5 rounded-lg text-[#5F6368] dark:text-[#9AA0A6] hover:bg-[#F1F3F4] dark:hover:bg-[#282A2C] transition"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(expense)}
                    aria-label={`Delete ${expense.title}`}
                    className="p-1.5 rounded-lg text-[#D93025] dark:text-[#F28B82] hover:bg-[#FCE8E6] dark:hover:bg-[#3C2020] transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
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
              className="w-full max-w-md bg-white dark:bg-[#1F1F1F] border border-[#DADCE0] dark:border-[#3C4043] rounded-2xl shadow-2xl p-5 space-y-3"
            >
              <div>
                <h3 className="text-sm font-bold text-[#202124] dark:text-[#E8EAED]">
                  {editingId ? 'Edit expense' : 'Record an expense'}
                </h3>
                <p className="text-[11px] text-[#5F6368] dark:text-[#9AA0A6] mt-1">
                  Money out — rent, salaries, bills, marketing. It feeds the profit &amp; loss figures instantly.
                </p>
              </div>

              <label className="block space-y-1">
                <span className="text-[11px] font-semibold text-[#5F6368] dark:text-[#9AA0A6]">What was it for?</span>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g. Centre rent — Rajpur Road"
                  className={formField}
                />
              </label>

              <div className="grid grid-cols-2 gap-2">
                <label className="space-y-1">
                  <span className="text-[11px] font-semibold text-[#5F6368] dark:text-[#9AA0A6]">Category</span>
                  <select
                    value={form.category}
                    onChange={e => setForm(prev => ({ ...prev, category: e.target.value as ExpenseCategory }))}
                    className={formField}
                  >
                    {EXPENSE_CATEGORIES.map(category => (
                      <option key={category} value={category}>
                        {EXPENSE_CATEGORY_LABEL[category]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-[11px] font-semibold text-[#5F6368] dark:text-[#9AA0A6]">Amount ₹</span>
                  <input
                    type="number"
                    min={0}
                    value={form.amount}
                    onChange={e => setForm(prev => ({ ...prev, amount: e.target.value }))}
                    placeholder="0"
                    className={formField}
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <label className="space-y-1">
                  <span className="text-[11px] font-semibold text-[#5F6368] dark:text-[#9AA0A6]">Date</span>
                  <input
                    type="date"
                    value={form.expenseDate}
                    onChange={e => setForm(prev => ({ ...prev, expenseDate: e.target.value }))}
                    className={formField}
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-[11px] font-semibold text-[#5F6368] dark:text-[#9AA0A6]">Paid via</span>
                  <select
                    value={form.paymentMethod}
                    onChange={e =>
                      setForm(prev => ({ ...prev, paymentMethod: e.target.value as PaymentRecord['paymentMethod'] }))
                    }
                    className={formField}
                  >
                    {EXPENSE_METHODS.map(method => (
                      <option key={method} value={method}>
                        {method}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="block space-y-1">
                <span className="text-[11px] font-semibold text-[#5F6368] dark:text-[#9AA0A6]">Vendor (optional)</span>
                <input
                  type="text"
                  value={form.vendor}
                  onChange={e => setForm(prev => ({ ...prev, vendor: e.target.value }))}
                  placeholder="e.g. UPCL, Airtel, landlord"
                  className={formField}
                />
              </label>

              <label className="block space-y-1">
                <span className="text-[11px] font-semibold text-[#5F6368] dark:text-[#9AA0A6]">Notes (optional)</span>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
                  rows={2}
                  className={formField}
                />
              </label>

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
                  {editingId ? 'Save changes' : 'Record expense'}
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
              className="w-full max-w-sm bg-white dark:bg-[#1F1F1C] border border-[#DADCE0] dark:border-[#3C4043] rounded-2xl shadow-2xl p-5 space-y-3"
            >
              <div className="flex items-start gap-2.5">
                <Trash2 className="w-5 h-5 text-[#D93025] dark:text-[#F28B82] flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-bold text-[#202124] dark:text-[#E8EAED]">Remove this expense?</h3>
                  <p className="text-[11px] text-[#5F6368] dark:text-[#9AA0A6] mt-1">
                    {deleteTarget.title} ·{' '}
                    <strong className="text-[#202124] dark:text-[#E8EAED]">
                      {formatRupees(deleteTarget.amount)}
                    </strong>{' '}
                    on {deleteTarget.expenseDate} will be deleted and the P&amp;L updated.
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