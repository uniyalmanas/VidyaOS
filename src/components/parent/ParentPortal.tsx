import React, { useState, useEffect } from 'react';
import { useRouter } from '../../context/RouterContext';
import { useApp } from '../../context/AppContext';
import { getIndiaDayName } from '../../lib/date';
import {
  Calendar,
  CreditCard,
  Award,
  BookOpen,
  Clock,
  Bell,
  CheckCircle2,
  XCircle,
  AlertCircle,
  MessageCircle,
  QrCode,
  FileText,
  User,
  ShieldCheck,
  ChevronRight,
  TrendingUp,
  ExternalLink,
  UserCheck,
  MessageSquare,
  CalendarDays
} from 'lucide-react';
import {
  PageHeader,
  MetricCard,
  ConsoleCard,
  ConsoleButton,
  StatusChip,
  Reveal,
  CountUp
} from '../ui';
import { EditProfileModal } from '../profile/EditProfileModal';
import { InstituteMessenger } from '../chat/InstituteMessenger';
import { LeavePortalPanel } from '../leaves/LeavePortalPanel';
import { motion } from 'motion/react';
import { easings } from '../../lib/motion';

export const ParentPortal: React.FC = () => {
  const { currentPath, navigate } = useRouter();
  const {
    currentOrg,
    currentUser,
    parentLinkedChildren,
    selectedChildId,
    setSelectedChildId,
    selectedChild,
    attendanceRecords,
    invoices,
    exams,
    examResults,
    assignments,
    studyMaterials,
    timetableSlots,
    announcements,
    batches,
    chatChannels,
    setActiveUpiModalInvoice,
    setActiveReceiptInvoice,
    setActiveWhatsappModal,
    sendChatMessage,
    showToast,
    mobileViewActive
  } = useApp();

  const [activeParentTab, setActiveParentTab] = useState<'overview' | 'attendance' | 'fees' | 'results' | 'schedule' | 'materials' | 'discussions' | 'leave'>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.toLowerCase();
      if (path.includes('/attendance')) return 'attendance';
      if (path.includes('/fees')) return 'fees';
      if (path.includes('/results')) return 'results';
      if (path.includes('/schedule')) return 'schedule';
      if (path.includes('/materials')) return 'materials';
      if (path.includes('/discussions') || path.includes('/messages')) return 'discussions';
      if (path.includes('/leave')) return 'leave';
    }
    return 'overview';
  });

  // Keep activeParentTab in sync with browser navigation
  useEffect(() => {
    const path = currentPath.toLowerCase();
    if (path.includes('/attendance') && activeParentTab !== 'attendance') setActiveParentTab('attendance');
    else if (path.includes('/fees') && activeParentTab !== 'fees') setActiveParentTab('fees');
    else if (path.includes('/results') && activeParentTab !== 'results') setActiveParentTab('results');
    else if (path.includes('/schedule') && activeParentTab !== 'schedule') setActiveParentTab('schedule');
    else if (path.includes('/materials') && activeParentTab !== 'materials') setActiveParentTab('materials');
    else if ((path.includes('/discussions') || path.includes('/messages')) && activeParentTab !== 'discussions') setActiveParentTab('discussions');
    else if (path.includes('/leave') && activeParentTab !== 'leave') setActiveParentTab('leave');
    else if ((path === '/parent' || path === '/parent/' || path.includes('/overview')) && activeParentTab !== 'overview') {
      setActiveParentTab('overview');
    }
  }, [currentPath]);

  const handleSelectTab = (tabId: string) => {
    setActiveParentTab(tabId as any);
    if (tabId === 'overview') {
      navigate('/parent');
    } else {
      navigate(`/parent/${tabId}`);
    }
  };

  const [directMsgText, setDirectMsgText] = useState<string>('');
  const [msgSentNotice, setMsgSentNotice] = useState<boolean>(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState<boolean>(false);

  if (!selectedChild) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.26, ease: easings.outQuart }}
        className="p-8 text-center text-slate-500"
      >
        No linked student found for this parent account.
      </motion.div>
    );
  }

  // Child-specific queries
  const childBatches = batches.filter(b => selectedChild.batchIds.includes(b.id));
  const childAttendance = attendanceRecords.filter(a => a.studentId === selectedChild.id);
  const totalClasses = childAttendance.length || 1;
  const presentCount = childAttendance.filter(a => a.status === 'present').length;
  const attendanceRate = Math.round((presentCount / totalClasses) * 100);

  const childInvoices = invoices.filter(i => i.studentId === selectedChild.id);
  const pendingInvoices = childInvoices.filter(i => i.status === 'pending' || i.status === 'partially_paid');
  const totalPendingFee = pendingInvoices.reduce((sum, inv) => sum + (inv.netAmount - inv.paidAmount), 0);

  const childResults = examResults.filter(r => r.studentId === selectedChild.id);
  const childExams = exams.filter(e => selectedChild.batchIds.includes(e.batchId));
  const upcomingExams = childExams.filter(e => e.status === 'upcoming');

  const childAssignments = assignments.filter(a => selectedChild.batchIds.includes(a.batchId));
  const pendingAssignments = childAssignments.filter(a => {
    const sub = a.submissions.find(s => s.studentId === selectedChild.id);
    return !sub || sub.status === 'pending';
  });

  // Real weekday in India. Hardcoding 'Monday' meant the "Today's Classes" strip
  // showed Monday's timetable no matter what day it actually was.
  const todayDay = getIndiaDayName();
  const todayClasses = timetableSlots.filter(t => selectedChild.batchIds.includes(t.batchId) && t.dayOfWeek === todayDay);

  const handleSendAdminMessage = async () => {
    if (!directMsgText.trim()) return;

    // Resolve this institute's parent-desk channel. It was hard-coded to
    // 'chan-parent-desk', which only exists for one demo org — every other
    // institute got a "Cross-institute messaging is strictly prohibited" error
    // while the UI still claimed the message had been dispatched.
    const deskChannel =
      chatChannels.find(c => c.orgId === currentOrg.id && c.id === `chan-${currentOrg.id}-parent-desk`) ||
      chatChannels.find(c => c.orgId === currentOrg.id && c.id === 'chan-parent-desk') ||
      chatChannels.find(c => c.orgId === currentOrg.id && c.name === 'parent-teacher-connect');

    if (!deskChannel) {
      showToast('The institute desk channel is unavailable right now. Please try again later.', 'error');
      return;
    }

    const saved = await sendChatMessage(deskChannel.id, directMsgText.trim(), 'general');

    // Only claim success once Firestore has actually accepted the message.
    if (!saved) return;

    setMsgSentNotice(true);
    setDirectMsgText('');
    setTimeout(() => setMsgSentNotice(false), 3000);
  };

  const content = (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        breadcrumbs={
          activeParentTab === 'overview'
            ? [
                { label: 'Parent Portal' },
                { label: selectedChild.name }
              ]
            : [
                {
                  label: 'Parent Portal',
                  onClick: () => handleSelectTab('overview')
                },
                {
                  label: selectedChild.name,
                  onClick: () => handleSelectTab('overview')
                },
                {
                  label:
                    activeParentTab === 'attendance'
                      ? 'ATTENDANCE'
                      : activeParentTab === 'fees'
                      ? 'FEE COUNTER'
                      : activeParentTab === 'results'
                      ? 'EXAM RESULTS'
                      : activeParentTab === 'schedule'
                      ? 'TIMETABLE'
                      : activeParentTab === 'materials'
                      ? 'STUDY MATERIALS'
                      : activeParentTab === 'discussions'
                      ? 'VIDYACHAT'
                      : (activeParentTab as string).toUpperCase()
                }
              ]
        }
        onBack={activeParentTab !== 'overview' ? () => handleSelectTab('overview') : undefined}
        title={activeParentTab === 'overview' ? `${selectedChild.name}'s Academic Dashboard` : `${selectedChild.name} · ${activeParentTab === 'fees' ? 'Fee Ledger' : activeParentTab === 'results' ? 'Test Marks' : (activeParentTab as string).toUpperCase()}`}
        subtitle={`${selectedChild.classGrade} · ${selectedChild.board} · Roll No: ${selectedChild.rollNo} · ${selectedChild.schoolName}`}
        badge={
          <StatusChip label="OTP VERIFIED" variant="success" size="xs" />
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <ConsoleButton
              variant="secondary"
              size="sm"
              icon={<UserCheck className="w-3.5 h-3.5 text-[#1A73E8]" />}
              onClick={() => setShowEditProfileModal(true)}
            >
              Profile
            </ConsoleButton>
            <div className="flex items-center space-x-1.5 bg-black/[0.04] dark:bg-white/[0.06] p-1 rounded-xl border border-black/[0.08] dark:border-white/[0.08] overflow-x-auto max-w-full">
              <span className="text-[11px] text-slate-500 dark:text-neutral-400 font-medium px-1.5 hidden xs:inline">Child:</span>
              {parentLinkedChildren.map(child => {
                const isSelected = child.id === selectedChildId;
                return (
                  <button
                    key={child.id}
                    onClick={() => setSelectedChildId(child.id)}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 min-h-[36px] rounded-lg text-xs font-semibold transition cursor-pointer active:scale-95 ${
                      isSelected
                        ? 'bg-white dark:bg-[#1C1C1E] text-amber-600 dark:text-amber-400 shadow-xs border border-black/[0.06] dark:border-white/[0.08]'
                        : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <img
                      src={child.avatar}
                      alt={child.name}
                      className="w-5 h-5 rounded-full object-cover border border-black/[0.08] dark:border-white/[0.08]"
                    />
                    <span className="truncate max-w-[90px]">{child.name.split(' ')[0]}</span>
                  </button>
                );
              })}
            </div>
          </div>
        }
      />

      {/* Navigation Sub-Tabs (Scrollable with sticky touch UX) */}
      <div className="flex items-center space-x-1 border-b border-black/[0.08] dark:border-white/[0.08] overflow-x-auto custom-scrollbar pb-1 -mx-2 px-2 sm:mx-0 sm:px-0">
        {[
          { id: 'overview', label: 'Summary', icon: TrendingUp },
          { id: 'attendance', label: `Attendance (${attendanceRate}%)`, icon: Calendar },
          { id: 'fees', label: `Fees (${pendingInvoices.length > 0 ? `₹${(totalPendingFee ?? 0).toLocaleString('en-IN')} Due` : 'Cleared'})`, icon: CreditCard },
          { id: 'results', label: 'Report Cards & Exams', icon: Award },
          { id: 'schedule', label: 'Timetable', icon: Clock },
          { id: 'materials', label: 'Homework & Notes', icon: BookOpen },
          { id: 'leave', label: 'Apply Leave', icon: CalendarDays },
          { id: 'discussions', label: 'VidyaChat', icon: MessageSquare },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeParentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleSelectTab(tab.id)}
              className={`flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold transition flex-shrink-0 cursor-pointer border-b-2 font-apple-text ${
                isActive
                  ? 'border-[#FFA000] text-[#1D1D1F] dark:text-[#F5F5F7] font-bold'
                  : 'border-transparent text-[#86868B] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW / QUICK ANSWERS */}
      <motion.div
        key={activeParentTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.26, ease: easings.outQuart }}
        className="space-y-6"
      >
      {activeParentTab === 'overview' && (
        <div className="space-y-6">
          {/* Quick Metrics Grid */}
          <Reveal className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <MetricCard
              label="Attendance Rate"
              value={`${attendanceRate}%`}
              subtext="Regular · Last marked: Today"
              accentColor="#188038"
              icon={<Calendar className="w-4 h-4" />}
              actionText="View log"
              onClick={() => handleSelectTab('attendance')}
            />

            <MetricCard
              label="Pending Fees"
              value={(totalPendingFee || 0) > 0 ? `₹${(totalPendingFee ?? 0).toLocaleString('en-IN')}` : '₹0'}
              subtext={totalPendingFee > 0 ? 'Due soon · UPI available' : 'All cleared'}
              accentColor="#FFA000"
              icon={<CreditCard className="w-4 h-4" />}
              actionText="Pay online"
              onClick={() => handleSelectTab('fees')}
            />

            <MetricCard
              label="Next Class"
              value={todayClasses[0]?.subject || 'Class 10 Math'}
              subtext="Today, 5:00 PM · Hall 1"
              accentColor="#1A73E8"
              icon={<Clock className="w-4 h-4" />}
              actionText="View schedule"
              onClick={() => handleSelectTab('schedule')}
            />

            <MetricCard
              label="Latest Test Score"
              value={`${childResults[0]?.marksObtained || 44}/50`}
              subtext={`Rank #${childResults[0]?.rank || 2} in batch`}
              accentColor="#9C27B0"
              icon={<Award className="w-4 h-4" />}
              actionText="Report card"
              onClick={() => handleSelectTab('results')}
            />
          </Reveal>

          {/* Pending Fee Callout Banner if applicable */}
          {pendingInvoices.length > 0 && (
            <Reveal className="bg-white dark:bg-[#1C1C1E] border-l-4 border-l-amber-500 border border-black/[0.08] dark:border-white/[0.08] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
              <div>
                <div className="flex items-center space-x-2">
                  <StatusChip label="PAYMENT DUE" variant="warning" size="xs" />
                  <span className="text-xs font-semibold text-slate-500 dark:text-neutral-400">
                    Due Date: {pendingInvoices[0].dueDate}
                  </span>
                </div>
                <h3 className="font-apple-display font-bold text-base text-slate-900 dark:text-white mt-1 tabular-nums">
                  Coaching Fee Due: <CountUp value={totalPendingFee} prefix="₹" />
                </h3>
                <p className="text-xs text-slate-500 dark:text-neutral-400">
                  {pendingInvoices[0].title} · A paid receipt is issued after the center verifies your transfer.
                </p>
              </div>
              <ConsoleButton
                variant="primary"
                size="md"
                icon={<QrCode className="w-4 h-4" />}
                onClick={() => setActiveUpiModalInvoice(pendingInvoices[0])}
              >
                Pay via UPI / GPay
              </ConsoleButton>
            </Reveal>
          )}

          {/* Schedule & Announcements Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Today's Classes */}
            <ConsoleCard
              title="Today's Class Schedule"
              subtitle={todayDay}
              icon={<Clock className="w-4 h-4" />}
            >
              <div className="space-y-2">
                {childBatches.map(b => (
                  <div
                    key={b.id}
                    className="p-3 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.03] flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-semibold text-sm text-slate-900 dark:text-white">{b.name}</div>
                      <div className="text-slate-500 dark:text-neutral-400">
                        {b.timeSlot} · {b.classroom}
                      </div>
                    </div>
                    <StatusChip label="Confirmed" variant="success" size="xs" />
                  </div>
                ))}
              </div>
            </ConsoleCard>

            {/* Institute Announcements */}
            <ConsoleCard
              title="Notices from Institute"
              subtitle="Center-wide broadcasts and updates"
              icon={<Bell className="w-4 h-4" />}
            >
              <div className="space-y-2">
                {announcements.slice(0, 2).map(ann => (
                  <div
                    key={ann.id}
                    className="p-3.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.08] dark:border-white/[0.08] space-y-1 text-xs"
                  >
                    <div className="font-semibold text-slate-900 dark:text-white flex items-center justify-between">
                      <span>{ann.title}</span>
                      {ann.priority === 'urgent' && (
                        <StatusChip label="Urgent" variant="error" size="xs" />
                      )}
                    </div>
                    <p className="text-slate-500 dark:text-neutral-400 line-clamp-2 leading-relaxed">
                      {ann.content}
                    </p>
                  </div>
                ))}
              </div>
            </ConsoleCard>
          </div>

          {/* Secure Message to Institute Desk */}
          <ConsoleCard
            title={`Contact Institute Desk (${currentOrg.name})`}
            subtitle={`Phone: ${currentOrg.phone} · Direct admin contact`}
            icon={<MessageCircle className="w-4 h-4" />}
          >
            <div className="space-y-3 text-xs">
              <p className="text-slate-500 dark:text-neutral-400">
                Need to inform about an upcoming leave, doubt, or fee inquiry? Send an official message directly to the institute desk:
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={directMsgText}
                  onChange={e => setDirectMsgText(e.target.value)}
                  placeholder="e.g. Rahul will be 15 mins late today due to school function..."
                  className="flex-1 text-xs px-3.5 py-2.5 rounded-xl border border-black/[0.1] dark:border-white/[0.1] bg-white dark:bg-[#1C1C1E] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                />
                <ConsoleButton
                  variant="primary"
                  size="sm"
                  onClick={handleSendAdminMessage}
                >
                  Send Message
                </ConsoleButton>
              </div>
              {msgSentNotice && (
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Message dispatched to institute administrator.
                </p>
              )}
            </div>
          </ConsoleCard>
        </div>
      )}

      {/* TAB 2: ATTENDANCE HISTORY */}
      {activeParentTab === 'attendance' && (
        <ConsoleCard
          title={`Attendance Log for ${selectedChild.name}`}
          subtitle="Daily presence records marked by batch faculty"
          action={
            <StatusChip label={`${attendanceRate}% OVERALL`} variant={attendanceRate >= 80 ? 'success' : 'warning'} size="xs" />
          }
        >
          <div className="divide-y divide-black/[0.06] dark:divide-white/[0.08]">
            {childAttendance.map(rec => {
              const batch = batches.find(b => b.id === rec.batchId);
              return (
                <div key={rec.id} className="py-3 flex items-center justify-between text-xs">
                  <div className="space-y-0.5">
                    <div className="font-semibold text-sm text-slate-900 dark:text-white">
                      {batch?.name || 'Class Session'}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-neutral-400">Date: {rec.date}</div>
                    {rec.remarks && (
                      <p className="text-[11px] text-slate-500 dark:text-neutral-400 italic">Teacher remark: "{rec.remarks}"</p>
                    )}
                  </div>
                  <div>
                    {rec.status === 'present' && (
                      <StatusChip label="Present" variant="success" size="xs" />
                    )}
                    {rec.status === 'absent' && (
                      <StatusChip label="Absent (Alert Sent)" variant="error" size="xs" />
                    )}
                    {rec.status === 'late' && (
                      <StatusChip label="Late" variant="warning" size="xs" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </ConsoleCard>
      )}

      {/* TAB 3: FEES & INVOICES */}
      {activeParentTab === 'fees' && (
        <ConsoleCard
          title="Fee Ledger & Payment Receipts"
          subtitle="Monthly fees, admission receipts & online UPI payments"
          action={
            <span className="text-xs font-mono font-bold text-slate-900 dark:text-white tabular-nums">
              Total Pending: ₹{(totalPendingFee ?? 0).toLocaleString('en-IN')}
            </span>
          }
        >
          <div className="space-y-3">
            {childInvoices.map(inv => {
              const isPaid = inv.status === 'paid';
              return (
                <div
                  key={inv.id}
                  className="p-4 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-black/[0.02] dark:bg-[#1C1C1E] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-sm text-slate-900 dark:text-white">{inv.monthYear}</span>
                      <StatusChip
                        label={inv.status.replace('_', ' ')}
                        variant={isPaid ? 'success' : 'warning'}
                        size="xs"
                      />
                    </div>
                    <p className="text-slate-500 dark:text-neutral-400">{inv.title}</p>
                    <div className="text-[11px] text-slate-500 dark:text-neutral-400">
                      Invoice No: <span className="font-mono">{inv.invoiceNo}</span> · Due Date: {inv.dueDate}
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 justify-between sm:justify-end">
                    <div className="text-right">
                      <div className="font-mono font-bold text-sm text-slate-900 dark:text-white tabular-nums">
                        ₹{(inv.paidAmount ?? 0).toLocaleString('en-IN')} / ₹{(inv.netAmount ?? 0).toLocaleString('en-IN')}
                      </div>
                      {((inv.netAmount ?? 0) - (inv.paidAmount ?? 0)) > 0 && (
                        <div className="text-[10px] text-rose-600 dark:text-rose-400 font-bold tabular-nums">
                          Balance: ₹{(((inv.netAmount ?? 0) - (inv.paidAmount ?? 0))).toLocaleString('en-IN')}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-1.5">
                      {!isPaid && (
                        <ConsoleButton
                          variant="primary"
                          size="xs"
                          icon={<QrCode className="w-3 h-3" />}
                          onClick={() => setActiveUpiModalInvoice(inv)}
                        >
                          Pay UPI
                        </ConsoleButton>
                      )}
                      {(inv.paidAmount ?? 0) > 0 && (
                        <ConsoleButton
                          variant="secondary"
                          size="xs"
                          icon={<FileText className="w-3 h-3" />}
                          onClick={() => setActiveReceiptInvoice(inv)}
                        >
                          Receipt
                        </ConsoleButton>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ConsoleCard>
      )}

      {/* TAB 4: EXAM RESULTS & REPORT CARDS */}
      {activeParentTab === 'results' && (
        <ConsoleCard
          title="Academic Diagnostic Results"
          subtitle="Test scores, batch rankings, and faculty evaluations"
          icon={<Award className="w-4 h-4 text-[#FFA000]" />}
        >
          <div className="space-y-3">
            {childResults.map(res => {
              const exam = exams.find(e => e.id === res.examId);
              return (
                <div
                  key={res.id}
                  className="p-4 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-black/[0.02] dark:bg-[#1C1C1E] space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-sm text-slate-900 dark:text-white">{exam?.title || 'Subject Test'}</span>
                      <p className="text-[11px] text-slate-500 dark:text-neutral-400">{exam?.subject} · Exam Date: {exam?.examDate}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xl font-bold font-mono text-indigo-600 dark:text-indigo-400 tabular-nums">
                        {res.marksObtained} <span className="text-xs font-normal text-slate-500">/ {exam?.maxMarks || 50}</span>
                      </span>
                      <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{res.percentage}% Score</div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4 bg-white dark:bg-[#2C2C2E] p-2.5 rounded-lg border border-black/[0.06] dark:border-white/[0.08] text-[11px]">
                    <div>Batch Rank: <strong className="text-slate-900 dark:text-white">#{res.rank || 1}</strong></div>
                    <div>Percentile: <strong className="text-indigo-600 dark:text-indigo-400">{res.percentile || 90}th</strong></div>
                    <div className="text-slate-500 dark:text-neutral-400 truncate">Feedback: "{res.teacherRemarks}"</div>
                  </div>
                </div>
              );
            })}
          </div>
        </ConsoleCard>
      )}

      {/* TAB 5: SCHEDULE & TIMETABLE */}
      {activeParentTab === 'schedule' && (
        <ConsoleCard
          title={`Weekly Timetable for ${selectedChild.name}`}
          subtitle="Classes, classroom numbers, and faculty schedule"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {timetableSlots
              .filter(t => selectedChild.batchIds.includes(t.batchId))
              .map(slot => (
                <div
                  key={slot.id}
                  className="p-3.5 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-black/[0.02] dark:bg-[#1C1C1E] space-y-1 text-xs"
                >
                  <div className="font-bold text-amber-600 dark:text-amber-400 text-[11px] uppercase tracking-wider">
                    {slot.dayOfWeek}
                  </div>
                  <div className="font-bold text-slate-900 dark:text-white">{slot.subject}</div>
                  <div className="text-slate-500 dark:text-neutral-400 tabular-nums">{slot.startTime} - {slot.endTime}</div>
                  <div className="text-[11px] text-slate-500 dark:text-neutral-400">{slot.classroom}</div>
                </div>
              ))}
          </div>
        </ConsoleCard>
      )}

      {/* TAB 6: MATERIALS & HOMEWORK */}
      {activeParentTab === 'materials' && (
        <ConsoleCard
          title="Assignments & Homework"
          subtitle="Coursework submissions, deadlines, and teacher feedback"
        >
          <div className="space-y-2">
            {childAssignments.map(asg => {
              const sub = asg.submissions.find(s => s.studentId === selectedChild.id);
              const isSubmitted = sub?.status === 'submitted';
              return (
                <div
                  key={asg.id}
                  className="p-3 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-black/[0.02] dark:bg-[#1C1C1E] flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">{asg.title}</div>
                    <div className="text-slate-500 dark:text-neutral-400">{asg.subject} · Due: {asg.dueDate}</div>
                    {sub?.feedback && <p className="text-[11px] text-emerald-600 dark:text-emerald-400">Teacher: "{sub.feedback}"</p>}
                  </div>
                  <StatusChip
                    label={isSubmitted ? 'Submitted' : 'Pending'}
                    variant={isSubmitted ? 'success' : 'warning'}
                    size="xs"
                  />
                </div>
              );
            })}
          </div>
        </ConsoleCard>
      )}

      {/* TAB 7: VIDYACHAT DISCUSSIONS */}
      {activeParentTab === 'leave' && (
        <LeavePortalPanel requesterType="student" studentId={selectedChild.id} />
      )}

      {activeParentTab === 'discussions' && (
        <InstituteMessenger className="mt-2" />
      )}
      </motion.div>

      {/* Edit Profile Modal */}
      {showEditProfileModal && (
        <EditProfileModal
          isOpen={showEditProfileModal}
          onClose={() => setShowEditProfileModal(false)}
        />
      )}
    </div>
  );

  // If mobile view mode is toggled, wrap in authentic smartphone frame
  if (mobileViewActive) {
    return (
      <div className="py-6 flex justify-center bg-slate-100 dark:bg-black min-h-screen">
        <div className="w-full max-w-md bg-white dark:bg-[#1C1C1E] rounded-3xl shadow-2xl border-4 border-slate-800 overflow-hidden flex flex-col">
          {/* Phone Speaker & Camera notch */}
          <div className="bg-slate-900 px-6 py-2 flex items-center justify-between text-[11px] text-white font-mono">
            <span>9:41</span>
            <div className="w-20 h-4 bg-slate-800 rounded-full mx-auto"></div>
            <span>5G 98%</span>
          </div>

          {/* App title bar */}
          <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white p-3 flex items-center justify-between">
            <div className="font-bold text-xs flex items-center gap-1.5">
              <span>{currentOrg.name}</span>
            </div>
            <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-bold">
              Parent App
            </span>
          </div>

          <div className="p-4 overflow-y-auto max-h-[750px] custom-scrollbar">
            {content}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      {content}
    </div>
  );
};
