import React, { useMemo, useState } from 'react';
import {
  Download,
  FileSpreadsheet,
  History,
  Search,
  ShieldCheck,
  ScanLine
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ConsoleCard, ConsoleButton, StatusChip, StatusChipVariant, MetricCard } from '../ui';
import { AuditLogEntry, auditToCsv, sortAuditNewestFirst } from '../../lib/audit';
import { motion } from 'motion/react';

const AUDIT_ACTIONS = ['create', 'update', 'delete', 'verify', 'reject', 'approve', 'login'] as const;

const ACTION_CHIP: Record<AuditLogEntry['action'], { label: string; variant: StatusChipVariant }> = {
  create: { label: 'CREATE', variant: 'success' },
  update: { label: 'UPDATE', variant: 'info' },
  delete: { label: 'DELETE', variant: 'error' },
  verify: { label: 'VERIFY', variant: 'success' },
  reject: { label: 'REJECT', variant: 'error' },
  approve: { label: 'APPROVE', variant: 'success' },
  login: { label: 'LOGIN', variant: 'warning' }
};

/** YYYY-MM-DD as observed in India (consistent with the rest of the app). */
function istDate(ms: number): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date(ms));
}

function downloadBlob(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export const AuditTrailModule: React.FC = () => {
  const {
    currentOrg,
    auditLogs,
    students,
    teachers,
    batches,
    invoices,
    pendingPaymentSubmissions,
    attendanceRecords,
    exams,
    examResults,
    assignments,
    studyMaterials,
    announcements,
    timetableSlots
  } = useApp();

  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [targetTypeFilter, setTargetTypeFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const sorted = useMemo(() => sortAuditNewestFirst(auditLogs), [auditLogs]);

  const targetTypes = useMemo(() => {
    const set = new Set<string>();
    sorted.forEach(e => set.add(e.targetType));
    return Array.from(set).sort();
  }, [sorted]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sorted.filter(e => {
      if (actionFilter !== 'all' && e.action !== actionFilter) return false;
      if (targetTypeFilter !== 'all' && e.targetType !== targetTypeFilter) return false;
      const d = istDate(e.createdAtMs);
      if (dateFrom && d < dateFrom) return false;
      if (dateTo && d > dateTo) return false;
      if (q) {
        const hay = `${e.summary} ${e.actorName} ${e.targetId}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [sorted, search, actionFilter, targetTypeFilter, dateFrom, dateTo]);

  const entriesToday = useMemo(
    () => sorted.filter(e => istDate(e.createdAtMs) === istDate(Date.now())).length,
    [sorted]
  );
  const uniqueActors = useMemo(() => new Set(sorted.map(e => e.actorUserId)).size, [sorted]);

  const handleCsvExport = () => {
    downloadBlob(`vidyaos-audit-${currentOrg.slug || currentOrg.id}-${istDate(Date.now())}.csv`, auditToCsv(filtered), 'text/csv;charset=utf-8');
  };

  const handleBackupDownload = () => {
    const backup = {
      app: 'VidyaOS',
      kind: 'tenant-backup',
      orgId: currentOrg.id,
      orgName: currentOrg.name,
      exportedAt: new Date().toISOString(),
      counts: {
        students: students.length,
        teachers: teachers.length,
        batches: batches.length,
        invoices: invoices.length,
        paymentSubmissions: pendingPaymentSubmissions.length,
        attendanceRecords: attendanceRecords.length,
        exams: exams.length,
        examResults: examResults.length,
        assignments: assignments.length,
        studyMaterials: studyMaterials.length,
        announcements: announcements.length,
        timetableSlots: timetableSlots.length,
        auditLogs: auditLogs.length
      },
      collections: {
        students,
        teachers,
        batches,
        invoices,
        paymentSubmissions: pendingPaymentSubmissions,
        attendanceRecords,
        exams,
        examResults,
        assignments,
        studyMaterials,
        announcements,
        timetableSlots,
        auditLogs
      }
    };
    downloadBlob(
      `vidyaos-backup-${currentOrg.slug || currentOrg.id}-${istDate(Date.now())}.json`,
      JSON.stringify(backup, null, 2),
      'application/json;charset=utf-8'
    );
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          label="Total Audit Entries"
          value={sorted.length.toLocaleString('en-IN')}
          subtext="Every logged change across the centre"
          accentColor="#1A73E8"
        />
        <MetricCard
          label="Changes Today"
          value={entriesToday.toLocaleString('en-IN')}
          subtext={entriesToday === 0 ? 'No activity recorded yet today' : `${entriesToday} change(s) since 12:00 AM IST`}
          accentColor="#188038"
        />
        <MetricCard
          label="Active Users Logging"
          value={uniqueActors.toLocaleString('en-IN')}
          subtext="Distinct staff members who made changes"
          accentColor="#FFA000"
        />
      </div>

      <ConsoleCard
        title="Complete Change History"
        subtitle="Append-only trail — entries can never be edited or deleted"
        icon={<History className="w-5 h-5 text-[#1A73E8]" />}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <ConsoleButton
              variant="secondary"
              size="sm"
              icon={<FileSpreadsheet className="w-3.5 h-3.5" />}
              onClick={handleCsvExport}
              disabled={filtered.length === 0}
              title="Download the filtered trail as a CSV spreadsheet"
            >
              Export CSV ({filtered.length})
            </ConsoleButton>
            <ConsoleButton
              variant="primary"
              size="sm"
              icon={<Download className="w-3.5 h-3.5" />}
              onClick={handleBackupDownload}
              title="Download a full JSON backup of every centre collection"
            >
              Download Backup
            </ConsoleButton>
          </div>
        }
      >
        {/* Filter bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 text-[#5F6368] dark:text-[#9AA0A6] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search summary, actor or target ID…"
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2C] text-[#202124] dark:text-[#E8EAED] text-xs focus:outline-none focus:ring-2 focus:ring-[#1A73E8]/30"
            />
          </div>
          <select
            value={actionFilter}
            onChange={e => setActionFilter(e.target.value)}
            className="px-3 py-2.5 rounded-xl border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2C] text-[#202124] dark:text-[#E8EAED] text-xs focus:outline-none focus:ring-2 focus:ring-[#1A73E8]/30"
          >
            <option value="all">All actions</option>
            {AUDIT_ACTIONS.map(a => (
              <option key={a} value={a}>{a.toUpperCase()}</option>
            ))}
          </select>
          <select
            value={targetTypeFilter}
            onChange={e => setTargetTypeFilter(e.target.value)}
            className="px-3 py-2.5 rounded-xl border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2C] text-[#202124] dark:text-[#E8EAED] text-xs focus:outline-none focus:ring-2 focus:ring-[#1A73E8]/30"
          >
            <option value="all">All targets</option>
            {targetTypes.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              title="From date (IST)"
              className="w-full px-2 py-2.5 rounded-xl border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2C] text-[#202124] dark:text-[#E8EAED] text-xs focus:outline-none focus:ring-2 focus:ring-[#1A73E8]/30"
            />
            <span className="text-[#5F6368] dark:text-[#9AA0A6] text-xs">→</span>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              title="To date (IST)"
              className="w-full px-2 py-2.5 rounded-xl border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2C] text-[#202124] dark:text-[#E8EAED] text-xs focus:outline-none focus:ring-2 focus:ring-[#1A73E8]/30"
            />
          </div>
        </div>

        {/* Integrity notice */}
        <div className="flex items-start gap-2 p-3 mb-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/40 text-[11px] text-indigo-900 dark:text-indigo-200">
          <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400 mt-0.5 flex-shrink-0" />
          <p className="leading-relaxed">
            Every entry is written once and is <strong>read-only from that moment on</strong> — the Firestore
            rules reject any update or delete. Exports run entirely in your browser; nothing is uploaded to a server.
          </p>
        </div>

        {/* Entries */}
        {filtered.length === 0 ? (
          <div className="py-14 text-center space-y-3">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center">
              <ScanLine className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-700 dark:text-slate-200">No audit entries found</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {auditLogs.length === 0
                  ? 'Changes will appear here automatically as staff record admissions, fees, marks and more.'
                  : 'Try widening the search or clearing a filter.'}
              </p>
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-[#F1F3F4] dark:divide-[#3C4043]">
            {filtered.map((e, i) => {
              const chip = ACTION_CHIP[e.action] || ACTION_CHIP.update;
              return (
                <motion.li
                  key={e.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18, delay: Math.min(i * 0.015, 0.25), ease: [0.25, 1, 0.5, 1] }}
                  className="py-3 flex items-start gap-3 group hover:bg-slate-50 dark:hover:bg-white/[0.02] rounded-xl px-2 -mx-2"
                >
                  <StatusChip label={chip.label} variant={chip.variant} size="xs" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-[#202124] dark:text-[#E8EAED] leading-snug font-apple-text">
                      {e.summary}
                    </p>
                    <p className="text-[11px] text-[#5F6368] dark:text-[#9AA0A6] mt-0.5 font-mono">
                      {e.targetType} · {e.targetId}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">{e.actorName}</p>
                    <p className="text-[10px] text-[#5F6368] dark:text-[#9AA0A6]">
                      {new Date(e.createdAtMs).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                      })}
                    </p>
                  </div>
                </motion.li>
              );
            })}
          </ul>
        )}
      </ConsoleCard>
    </div>
  );
};