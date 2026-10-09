import React, { useMemo, useState } from 'react';
import {
  PhoneIncoming,
  Search,
  Plus,
  UserPlus,
  CalendarClock,
  AlertCircle,
  RotateCcw,
  X,
  Trash2,
  Pencil,
  MessageSquare,
  CheckCircle2,
  Users
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ConsoleCard, ConsoleButton, StatusChip, StatusChipVariant, MetricCard } from '../ui';
import { Inquiry, InquiryStatus, InquirySource, IndianBoard, InquiryNote } from '../../types';
import {
  INQUIRY_STATUSES,
  INQUIRY_SOURCES,
  countByStatus,
  searchInquiries,
  sortInquiriesForFollowUp,
  formatInquiryPhone,
  isTerminalInquiryStatus
} from '../../lib/inquiries';
import { motion, AnimatePresence } from 'motion/react';
import { ProgramTrackSelect, ProgramLevelSelect } from '../common/ProgramSelect';

const STATUS_META: Record<InquiryStatus, { label: string; variant: StatusChipVariant; accent: string }> = {
  new: { label: 'New', variant: 'info', accent: '#1A73E8' },
  contacted: { label: 'Contacted', variant: 'warning', accent: '#FFA000' },
  demo_booked: { label: 'Demo Booked', variant: 'neutral', accent: '#9334E6' },
  joined: { label: 'Joined', variant: 'success', accent: '#188038' },
  lost: { label: 'Lost', variant: 'error', accent: '#D93025' }
};

const SOURCE_LABEL: Record<InquirySource, string> = {
  walkin: 'Walk-in',
  call: 'Call',
  whatsapp: 'WhatsApp',
  referral: 'Referral',
  online: 'Online',
  other: 'Other'
};

/** YYYY-MM-DD as observed in India (consistent with the rest of the app). */
function istToday(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
}

function followUpState(dateStr?: string): 'overdue' | 'today' | 'upcoming' | null {
  if (!dateStr) return null;
  const today = istToday();
  if (dateStr < today) return 'overdue';
  if (dateStr === today) return 'today';
  return 'upcoming';
}

function formatFollowUpLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

interface InquiriesModuleProps {
  /** Handed the admission form: pre-fills name/phone/class and opens the student modal. */
  onConvert: (inquiry: Inquiry) => void;
}

export const InquiriesModule: React.FC<InquiriesModuleProps> = ({ onConvert }) => {
  const {
    inquiries,
    batches,
    students,
    addInquiry,
    updateInquiry,
    addInquiryNote,
    deleteInquiry,
    recordAudit,
    showToast
  } = useApp();

  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Inquiry | null>(null);
  const [lostTarget, setLostTarget] = useState<Inquiry | null>(null);

  // Add / edit form
  const [fName, setFName] = useState('');
  const [fPhone, setFPhone] = useState('');
  const [fEmail, setFEmail] = useState('');
  const [fClass, setFClass] = useState('Class 10');
  const [fBoard, setFBoard] = useState<IndianBoard>('Board level');
  const [fSubjects, setFSubjects] = useState('');
  const [fSource, setFSource] = useState<InquirySource>('call');
  const [fStatus, setFStatus] = useState<InquiryStatus>('new');
  const [fFollowUp, setFFollowUp] = useState('');
  const [fBatchIds, setFBatchIds] = useState<string[]>([]);
  const [fNote, setFNote] = useState('');

  const visible = useMemo(
    () => sortInquiriesForFollowUp(searchInquiries(inquiries, search)),
    [inquiries, search]
  );
  const counts = useMemo(() => countByStatus(visible), [visible]);
  const total = visible.length;
  const pipelineActive = counts.new + counts.contacted + counts.demo_booked;
  const followUpsDue = visible.filter(i => {
    const s = followUpState(i.followUpDate);
    return s === 'overdue' || s === 'today';
  }).length;
  const joinedCount = counts.joined;
  const conversionRate = total > 0 ? Math.round((joinedCount / total) * 100) : 0;

  const studentNameById = useMemo(() => {
    const map: Record<string, string> = {};
    students.forEach(s => { map[s.id] = s.name; });
    return map;
  }, [students]);

  const resetForm = () => {
    setEditingId(null);
    setFName('');
    setFPhone('');
    setFEmail('');
    setFClass('Class 10');
    setFBoard('Board level');
    setFSubjects('');
    setFSource('call');
    setFStatus('new');
    setFFollowUp('');
    setFBatchIds([]);
    setFNote('');
  };

  const openAdd = (presetStatus?: InquiryStatus) => {
    resetForm();
    if (presetStatus) setFStatus(presetStatus);
    setShowModal(true);
  };

  const openEdit = (inq: Inquiry) => {
    setEditingId(inq.id);
    setFName(inq.name);
    setFPhone(inq.phone);
    setFEmail(inq.email || '');
    setFClass(inq.classGrade || 'Class 10');
    setFBoard(inq.board || 'Board level');
    setFSubjects(inq.subjects?.join(', ') || '');
    setFSource(inq.source || 'call');
    setFStatus(isTerminalInquiryStatus(inq.status) ? 'contacted' : inq.status);
    setFFollowUp(inq.followUpDate || '');
    setFBatchIds(inq.interestedBatchIds || []);
    setFNote('');
    setShowModal(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fName.trim() || !fPhone.trim()) {
      showToast('Lead needs at least a name and a phone number.', 'error');
      return;
    }
    const subjects = fSubjects
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
      .slice(0, 6);

    if (editingId) {
      const target = inquiries.find(i => i.id === editingId);
      if (!target) return;
      updateInquiry(editingId, {
        name: fName.trim(),
        phone: fPhone.trim(),
        email: fEmail.trim() || undefined,
        classGrade: fClass,
        board: fBoard,
        subjects: subjects.length ? subjects : undefined,
        source: fSource,
        status: fStatus,
        followUpDate: fFollowUp || undefined,
        interestedBatchIds: fBatchIds.length ? fBatchIds : undefined
      });
      if (fNote.trim()) {
        addInquiryNote(editingId, fNote.trim());
      }
      recordAudit({
        action: 'update',
        targetType: 'inquiry',
        targetId: editingId,
        summary: `Updated lead ${fName.trim()} (${fPhone.trim()}) — now ${STATUS_META[fStatus].label}${fFollowUp ? `, follow-up ${fFollowUp}.` : '.'}`
      });
      showToast(`Lead "${fName.trim()}" updated.`, 'success');
    } else {
      const created = addInquiry({
        name: fName.trim(),
        phone: fPhone.trim(),
        email: fEmail.trim() || undefined,
        classGrade: fClass,
        board: fBoard,
        subjects: subjects.length ? subjects : undefined,
        source: fSource,
        status: fStatus,
        followUpDate: fFollowUp || undefined,
        interestedBatchIds: fBatchIds.length ? fBatchIds : undefined,
        note: fNote.trim() || undefined
      });
      recordAudit({
        action: 'create',
        targetType: 'inquiry',
        targetId: created.id,
        summary: `Captured new admission lead ${created.name} (${created.phone}, ${fClass}) from ${SOURCE_LABEL[fSource]}.`
      });
      showToast(`Lead "${fName.trim()}" added to the pipeline.`, 'success');
    }
    setShowModal(false);
  };

  const moveStatus = (inq: Inquiry, to: InquiryStatus) => {
    if (to === 'joined') {
      // Admitted students go through the real admission flow, not a manual status flip.
      onConvert(inq);
      return;
    }
    if (to === inq.status || isTerminalInquiryStatus(inq.status)) return;
    if (to === 'lost' && !window.confirm(`Mark "${inq.name}" as lost? You can reopen the lead later.`)) return;
    updateInquiry(inq.id, { status: to });
    recordAudit({
      action: 'update',
      targetType: 'inquiry',
      targetId: inq.id,
      summary: `Moved lead ${inq.name} (${inq.phone}) from ${STATUS_META[inq.status].label} to ${STATUS_META[to].label}.`
    });
    showToast(`"${inq.name}" moved to ${STATUS_META[to].label}.`, 'success');
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    recordAudit({
      action: 'delete',
      targetType: 'inquiry',
      targetId: deleteTarget.id,
      summary: `Deleted lead ${deleteTarget.name} (${deleteTarget.phone}).`
    });
    deleteInquiry(deleteTarget.id);
    showToast(`Lead "${deleteTarget.name}" removed.`, 'info');
    setDeleteTarget(null);
  };

  const toggleBatch = (batchId: string) => {
    setFBatchIds(prev => (prev.includes(batchId) ? prev.filter(id => id !== batchId) : [...prev, batchId]));
  };

  const renderFollowUpBadge = (inq: Inquiry) => {
    const state = followUpState(inq.followUpDate);
    if (!state || !inq.followUpDate) return null;
    const palette =
      state === 'overdue' ? 'bg-[#FCE8E6] dark:bg-[#3C2A2A] text-[#D93025] dark:text-[#F28B82]'
      : state === 'today' ? 'bg-[#FEF7E0] dark:bg-[#3B3320] text-[#B06000] dark:text-[#FDD663]'
      : 'bg-[#E8F0FE] dark:bg-[#1F2B3D] text-[#1A73E8] dark:text-[#8AB4F8]';
    const label =
      state === 'overdue' ? `Overdue · ${formatFollowUpLabel(inq.followUpDate)}`
      : state === 'today' ? `Call today · ${formatFollowUpLabel(inq.followUpDate)}`
      : `Follow-up ${formatFollowUpLabel(inq.followUpDate)}`;
    return (
      <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${palette}`}>
        <CalendarClock className="w-3 h-3" />
        {label}
      </span>
    );
  };

  const renderCard = (inq: Inquiry) => {
    const studentName = inq.convertedStudentId ? studentNameById[inq.convertedStudentId] : undefined;
    return (
      <motion.div
        key={inq.id}
        layout
        initial={{ opacity: 0, y: 8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="bg-white dark:bg-[#282A2C] border border-[#DADCE0] dark:border-[#3C4043] rounded-xl p-3 shadow-sm hover:shadow-md transition-shadow"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold text-[13px] text-[#202124] dark:text-[#E8EAED] truncate" title={inq.name}>
              {inq.name}
            </p>
            <p className="text-[11px] text-[#5F6368] dark:text-[#9AA0A6] font-medium tracking-wide mt-0.5">
              {formatInquiryPhone(inq.phone)}
            </p>
          </div>
          <StatusChip label={STATUS_META[inq.status].label} variant={STATUS_META[inq.status].variant} size="sm" />
        </div>

        {(inq.classGrade || inq.board) && (
          <p className="text-[11px] text-[#5F6368] dark:text-[#9AA0A6] mt-1.5">
            {[inq.classGrade, inq.board].filter(Boolean).join(' · ')}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-1 mt-2">
          {inq.source && (
            <span className="inline-flex items-center rounded-md bg-[#F1F3F4] dark:bg-[#35373A] px-1.5 py-0.5 text-[10px] font-medium text-[#5F6368] dark:text-[#9AA0A6]">
              {SOURCE_LABEL[inq.source]}
            </span>
          )}
          {inq.interestedBatchIds && inq.interestedBatchIds.length > 0 && (
            <span className="inline-flex items-center gap-1 rounded-md bg-[#F1F3F4] dark:bg-[#35373A] px-1.5 py-0.5 text-[10px] font-medium text-[#5F6368] dark:text-[#9AA0A6]">
              <Users className="w-3 h-3" />
              {inq.interestedBatchIds.length} {inq.interestedBatchIds.length === 1 ? 'batch' : 'batches'}
            </span>
          )}
          {inq.notes.length > 0 && (
            <span className="inline-flex items-center gap-1 rounded-md bg-[#F1F3F4] dark:bg-[#35373A] px-1.5 py-0.5 text-[10px] font-medium text-[#5F6368] dark:text-[#9AA0A6]">
              <MessageSquare className="w-3 h-3" />
              {inq.notes.length}
            </span>
          )}
          {renderFollowUpBadge(inq)}
        </div>

        {inq.status === 'joined' && (
          <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-[#E6F4EA] dark:bg-[#1E3A2A] text-[#188038] dark:text-[#81C995] px-2 py-1.5 text-[11px] font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            Converted{studentName ? ` — ${studentName}` : ' to student'}
          </div>
        )}

        <div className="flex items-center justify-between gap-1 mt-2.5 pt-2 border-t border-[#F1F3F4] dark:border-[#35373A]">
          <div className="flex items-center gap-1">
            {isTerminalInquiryStatus(inq.status) ? (
              <span className="text-[10px] text-[#80868B] dark:text-[#9AA0A6] px-1">—</span>
            ) : (
              <>
                {inq.status === 'lost' ? (
                  <button
                    onClick={() => moveStatus(inq, 'new')}
                    title="Reopen lead"
                    className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-medium text-[#1A73E8] dark:text-[#8AB4F8] hover:bg-[#E8F0FE] dark:hover:bg-[#1F2B3D] transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" /> Reopen
                  </button>
                ) : (
                  <>
                    {inq.status === 'new' && (
                      <button
                        onClick={() => moveStatus(inq, 'contacted')}
                        title="Mark as contacted"
                        className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-medium text-[#1A73E8] dark:text-[#8AB4F8] hover:bg-[#E8F0FE] dark:hover:bg-[#1F2B3D] transition-colors"
                      >
                        Call done
                      </button>
                    )}
                    {inq.status === 'contacted' || inq.status === 'new' ? (
                      <button
                        onClick={() => moveStatus(inq, 'demo_booked')}
                        title="Demo class booked"
                        className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-medium text-[#9334E6] dark:text-[#C58AF9] hover:bg-[#F3E8FD] dark:hover:bg-[#2E2140] transition-colors"
                      >
                        Book demo
                      </button>
                    ) : null}
                    <button
                      onClick={() => moveStatus(inq, 'lost')}
                      title="Mark as lost"
                      className="inline-flex items-center rounded-md px-1.5 py-1 text-[11px] font-medium text-[#D93025] dark:text-[#F28B82] hover:bg-[#FCE8E6] dark:hover:bg-[#3C2A2A] transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </>
                )}
              </>
            )}
          </div>
          <div className="flex items-center gap-1">
            {!isTerminalInquiryStatus(inq.status) && (
              <button
                onClick={() => onConvert(inq)}
                title="Convert to student"
                className="inline-flex items-center gap-1 rounded-lg bg-[#188038] dark:bg-[#146C2E] text-white px-2 py-1 text-[11px] font-semibold hover:bg-[#137333] dark:hover:bg-[#1E8E3E] transition-colors"
              >
                <UserPlus className="w-3 h-3" /> Admit
              </button>
            )}
            <button
              onClick={() => openEdit(inq)}
              title="Edit lead / add note"
              className="inline-flex items-center rounded-lg bg-[#F1F3F4] dark:bg-[#35373A] p-1.5 text-[#5F6368] dark:text-[#9AA0A6] hover:bg-[#E8EAED] dark:hover:bg-[#3C4043] transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setDeleteTarget(inq)}
              title="Delete lead"
              className="inline-flex items-center rounded-lg bg-[#FCE8E6] dark:bg-[#3C2A2A] p-1.5 text-[#D93025] dark:text-[#F28B82] hover:bg-[#FAD2CF] dark:hover:bg-[#4A3533] transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </motion.div>
    );
  };

  const formField =
    'w-full border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2C] text-[#202124] dark:text-[#E8EAED] rounded-lg p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#1A73E8]/40';

  return (
    <div className="space-y-4">
      {/* Summary strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard label="Total Leads" value={String(total)} accentColor="#1A73E8" subtext="across the pipeline" />
        <MetricCard label="Active Pipeline" value={String(pipelineActive)} accentColor="#9334E6" subtext="new · contacted · demo booked" />
        <MetricCard
          label="Follow-ups Due"
          value={String(followUpsDue)}
          accentColor={followUpsDue > 0 ? '#FFA000' : '#188038'}
          subtext={followUpsDue > 0 ? 'overdue or due today' : 'nothing urgent'}
        />
        <MetricCard label="Conversion Rate" value={`${conversionRate}%`} accentColor="#188038" subtext={`${joinedCount} admitted`} />
      </div>

      <ConsoleCard
        title="Admission Leads Pipeline"
        subtitle="Walk-ins, calls and WhatsApp enquiries — nudge every parent from first hello to final admission. Teachers don't see this back-office view; leads are staff + admin only."
      >
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#80868B]" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, phone, class, board…"
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2C] text-xs text-[#202124] dark:text-[#E8EAED] focus:ring-2 focus:ring-[#1A73E8]/40 outline-none"
            />
          </div>
          <ConsoleButton variant="primary" size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => openAdd()}>
            + New Inquiry
          </ConsoleButton>
        </div>

        {/* Kanban pipeline */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3 items-start">
          {INQUIRY_STATUSES.map(status => {
            const columnInquiries = visible.filter(i => i.status === status);
            return (
              <div key={status} className="rounded-2xl bg-[#F8F9FA] dark:bg-[#1F1F1F] p-2.5 border border-[#E8EAED] dark:border-[#333537]">
                <div className="flex items-center justify-between px-1 py-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: STATUS_META[status].accent }} />
                    <span className="text-[11px] font-bold uppercase tracking-wide text-[#5F6368] dark:text-[#9AA0A6]">
                      {STATUS_META[status].label}
                    </span>
                    <span
                      className="inline-flex items-center justify-center min-w-[20px] px-1 h-5 rounded-full text-[11px] font-bold text-white"
                      style={{ backgroundColor: STATUS_META[status].accent }}
                    >
                      {counts[status]}
                    </span>
                  </div>
                  {!isTerminalInquiryStatus(status) && status !== 'lost' && (
                    <button
                      onClick={() => openAdd(status)}
                      title={`Add inquiry as ${STATUS_META[status].label}`}
                      className="inline-flex items-center rounded-md p-1 text-[#80868B] dark:text-[#9AA0A6] hover:bg-[#E8EAED] dark:hover:bg-[#333537] transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="space-y-2 mt-1.5 min-h-[80px]">
                  <AnimatePresence initial={false}>
                    {columnInquiries.map(inq => renderCard(inq))}
                  </AnimatePresence>
                  {columnInquiries.length === 0 && (
                    <div className="rounded-xl border border-dashed border-[#DADCE0] dark:border-[#3C4043] p-4 text-center text-[11px] text-[#80868B] dark:text-[#9AA0A6]">
                      {status === 'joined' ? 'Admitted leads land here ✓' : status === 'lost' ? 'No lost leads' : 'No leads yet'}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </ConsoleCard>

      {/* Add / Edit modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.form
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.97 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              onSubmit={handleSave}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white dark:bg-[#1F1F1F] border border-[#DADCE0] dark:border-[#3C4043] rounded-2xl shadow-2xl p-5 space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-[#202124] dark:text-[#E8EAED]">
                    {editingId ? 'Edit Lead' : 'New Admission Inquiry'}
                  </h3>
                  <p className="text-[11px] text-[#5F6368] dark:text-[#9AA0A6] mt-0.5">
                    {editingId
                      ? 'Update details or add a follow-up note.'
                      : 'A parent just called or walked in — capture the lead.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-lg p-1.5 text-[#5F6368] dark:text-[#9AA0A6] hover:bg-[#F1F3F4] dark:hover:bg-[#35373A] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="sm:col-span-2">
                  <label className="block text-[#5F6368] dark:text-[#9AA0A6] font-medium mb-1">Student name *</label>
                  <input value={fName} onChange={e => setFName(e.target.value)} placeholder="e.g. Aarav Sharma" className={formField} />
                </div>
                <div>
                  <label className="block text-[#5F6368] dark:text-[#9AA0A6] font-medium mb-1">Phone *</label>
                  <input value={fPhone} onChange={e => setFPhone(e.target.value)} placeholder="+91 98XXX XXXXX" className={formField} />
                </div>
                <div>
                  <label className="block text-[#5F6368] dark:text-[#9AA0A6] font-medium mb-1">Email</label>
                  <input value={fEmail} onChange={e => setFEmail(e.target.value)} placeholder="parent@example.com" className={formField} />
                </div>
                <div>
                  <label className="block text-[#5F6368] dark:text-[#9AA0A6] font-medium mb-1">Program / Track</label>
                  <ProgramTrackSelect value={fBoard} onChange={setFBoard} className={formField} />
                </div>
                <div>
                  <label className="block text-[#5F6368] dark:text-[#9AA0A6] font-medium mb-1">Class / Exam Level</label>
                  <ProgramLevelSelect value={fClass} onChange={setFClass} track={fBoard} className={formField} />
                </div>
                <div>
                  <label className="block text-[#5F6368] dark:text-[#9AA0A6] font-medium mb-1">Subjects</label>
                  <input value={fSubjects} onChange={e => setFSubjects(e.target.value)} placeholder="Math, Science" className={formField} />
                </div>
                <div>
                  <label className="block text-[#5F6368] dark:text-[#9AA0A6] font-medium mb-1">Source</label>
                  <select value={fSource} onChange={e => setFSource(e.target.value as InquirySource)} className={formField}>
                    {INQUIRY_SOURCES.map(s => (
                      <option key={s} value={s}>{SOURCE_LABEL[s]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[#5F6368] dark:text-[#9AA0A6] font-medium mb-1">Status</label>
                  <select value={fStatus} onChange={e => setFStatus(e.target.value as InquiryStatus)} className={formField}>
                    {INQUIRY_STATUSES.filter(s => !isTerminalInquiryStatus(s)).map(s => (
                      <option key={s} value={s}>{STATUS_META[s].label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[#5F6368] dark:text-[#9AA0A6] font-medium mb-1">Follow-up date</label>
                  <input type="date" value={fFollowUp} onChange={e => setFFollowUp(e.target.value)} className={formField} />
                </div>
              </div>

              {batches.length > 0 && (
                <div>
                  <label className="block text-[#5F6368] dark:text-[#9AA0A6] font-medium mb-1">Interested batches</label>
                  <div className="flex flex-wrap gap-1.5">
                    {batches.slice(0, 12).map(b => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => toggleBatch(b.id)}
                        className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-medium transition-colors ${
                          fBatchIds.includes(b.id)
                            ? 'border-[#1A73E8] bg-[#E8F0FE] dark:bg-[#1F2B3D] text-[#1A73E8] dark:text-[#8AB4F8]'
                            : 'border-[#DADCE0] dark:border-[#3C4043] text-[#5F6368] dark:text-[#9AA0A6] hover:bg-[#F1F3F4] dark:hover:bg-[#35373A]'
                        }`}
                      >
                        {b.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[#5F6368] dark:text-[#9AA0A6] font-medium mb-1">
                  {editingId ? 'Add a follow-up note' : 'First note'}
                </label>
                <textarea
                  value={fNote}
                  onChange={e => setFNote(e.target.value)}
                  rows={2}
                  placeholder="What did the parent ask about? When is the next call?"
                  className={formField}
                />
              </div>

              {editingId && (() => {
                const target = inquiries.find(i => i.id === editingId);
                if (!target || target.notes.length === 0) return null;
                return (
                  <div className="rounded-xl bg-[#F8F9FA] dark:bg-[#1F1F1F] border border-[#E8EAED] dark:border-[#333537] p-3 space-y-2">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-[#80868B] dark:text-[#9AA0A6]">
                      Conversation history ({target.notes.length})
                    </p>
                    {target.notes.slice(-6).map((note: InquiryNote, idx: number) => (
                      <div key={`${note.createdAt}-${idx}`} className="text-[11px]">
                        <span className="font-semibold text-[#202124] dark:text-[#E8EAED]">{note.authorName}</span>
                        <span className="text-[#80868B] dark:text-[#9AA0A6]"> · {new Date(note.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                        <p className="text-[#5F6368] dark:text-[#9AA0A6] mt-0.5">{note.text}</p>
                      </div>
                    ))}
                  </div>
                );
              })()}

              <div className="flex justify-end gap-2 pt-1">
                <ConsoleButton variant="secondary" size="sm" onClick={() => setShowModal(false)}>
                  Cancel
                </ConsoleButton>
                <ConsoleButton variant="primary" size="sm" type="submit">
                  {editingId ? 'Save Changes' : 'Add Lead'}
                </ConsoleButton>
              </div>
            </motion.form>
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
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setDeleteTarget(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.97 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-sm bg-white dark:bg-[#1F1F1F] border border-[#DADCE0] dark:border-[#3C4043] rounded-2xl shadow-2xl p-5 space-y-3"
            >
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-[#FCE8E6] dark:bg-[#3C2A2A] p-2.5 text-[#D93025] dark:text-[#F28B82]">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#202124] dark:text-[#E8EAED]">Delete this lead?</h3>
                  <p className="text-[11px] text-[#5F6368] dark:text-[#9AA0A6] mt-1">
                    "{deleteTarget.name}" ({deleteTarget.phone}) and its {deleteTarget.notes.length} note(s) will be removed
                    from the pipeline. This is recorded in the audit trail.
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <ConsoleButton variant="secondary" size="sm" onClick={() => setDeleteTarget(null)}>
                  Cancel
                </ConsoleButton>
                <ConsoleButton variant="danger" size="sm" onClick={handleDelete}>
                  Delete Lead
                </ConsoleButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};