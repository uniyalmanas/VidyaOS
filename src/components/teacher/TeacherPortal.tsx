import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from '../../context/RouterContext';
import { useApp } from '../../context/AppContext';
import { getIndiaDateString } from '../../lib/date';
import {
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  Award,
  BookOpen,
  Share2,
  Users,
  Check,
  Search,
  Plus,
  UserCheck,
  MessageSquare,
  LayoutDashboard,
  ArrowRight,
  X,
  UserPlus,
  Loader2,
  Trash2
} from 'lucide-react';
import { AttendanceStatus } from '../../types';
import {
  PageHeader,
  ConsoleCard,
  ConsoleButton,
  StatusChip,
  Reveal,
  CountUp
} from '../ui';
import { EditProfileModal } from '../profile/EditProfileModal';
import { InstituteMessenger } from '../chat/InstituteMessenger';
import { LeavePortalPanel } from '../leaves/LeavePortalPanel';
import { TeacherLeaveBoard } from '../leaves/TeacherLeaveBoard';
import { motion, AnimatePresence } from 'motion/react';
import { easings } from '../../lib/motion';
import { selectTeacherBatches, filterToBatches } from '../../lib/teacherScope';

export const TeacherPortal: React.FC = () => {
  const { currentPath, navigate } = useRouter();
  const {
    currentUser,
    currentOrg,
    batches,
    students,
    teachers,
    attendanceRecords,
    markAttendance,
    markBatchAllPresent,
    exams,
    examResults,
    saveExamResults,
    assignments,
    createAssignment,
    setActiveWhatsappModal,
    enrollStudentInBatch,
    removeStudentFromBatch,
    showToast,
    mobileViewActive
  } = useApp();

  const [activeTab, setActiveTab] = useState<'overview' | 'attendance' | 'marks' | 'assignments' | 'discussions'>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.toLowerCase();
      if (path.includes('/marks')) return 'marks';
      if (path.includes('/assignments')) return 'assignments';
      if (path.includes('/discussions') || path.includes('/messages')) return 'discussions';
      if (path.includes('/attendance')) return 'attendance';
    }
    return 'overview';
  });

  // Keep activeTab in sync with browser navigation (e.g. back/forward or direct URL)
  useEffect(() => {
    const path = currentPath.toLowerCase();
    if (path.includes('/marks') && activeTab !== 'marks') {
      setActiveTab('marks');
    } else if (path.includes('/assignments') && activeTab !== 'assignments') {
      setActiveTab('assignments');
    } else if ((path.includes('/discussions') || path.includes('/messages')) && activeTab !== 'discussions') {
      setActiveTab('discussions');
    } else if (path.includes('/attendance') && activeTab !== 'attendance') {
      setActiveTab('attendance');
    } else if ((path === '/teacher' || path === '/teacher/' || path.includes('/overview')) && activeTab !== 'overview') {
      setActiveTab('overview');
    }
  }, [currentPath]);
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [attendanceDate, setAttendanceDate] = useState<string>(() => getIndiaDateString());
  const [savedSuccessMsg, setSavedSuccessMsg] = useState<string>('');

  // Marks entry state. Deliberately starts empty and is seeded from saved results
  // for the selected exam — see the effect below.
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [marksState, setMarksState] = useState<{ [studentId: string]: number | undefined }>({});

  // Homework modal
  const [showHomeworkModal, setShowHomeworkModal] = useState<boolean>(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState<boolean>(false);
  // Rooster manager: lets a teacher add/remove students from the active batch.
  const [showRosterManager, setShowRosterManager] = useState<boolean>(false);
  const [rosterSearch, setRosterSearch] = useState<string>('');
  const [savingRosterStudentId, setSavingRosterStudentId] = useState<string | null>(null);
  const [hwTitle, setHwTitle] = useState<string>('');
  const [hwSubject, setHwSubject] = useState<string>('Mathematics');
  const [hwDueDate, setHwDueDate] = useState<string>(() => getIndiaDateString());
  const [hwDesc, setHwDesc] = useState<string>('');

  // ── Scope everything this console can see or act on to MY batches ────────────
  // Fails closed — see `selectTeacherBatches` for why the two sides of this join
  // use different keys and what happens when a faculty record cannot be matched.
  const myBatches = useMemo(
    () => selectTeacherBatches(batches, teachers, currentUser.id),
    [batches, teachers, currentUser.id]
  );

  const myBatchIds = useMemo(() => new Set(myBatches.map(b => b.id)), [myBatches]);

  // This faculty member's own Teacher record (for filing their own leave).
  const myTeacherRecord = useMemo(
    () => teachers.find(t => t.userId === currentUser.id),
    [teachers, currentUser.id]
  );

  // Tests and coursework are batch-scoped, so a teacher only ever sees the ones
  // belonging to their own batches — not every test in the institute.
  const myExams = useMemo(() => filterToBatches(exams, myBatchIds), [exams, myBatchIds]);
  const myAssignments = useMemo(() => filterToBatches(assignments, myBatchIds), [assignments, myBatchIds]);

  // Unique students across my batches — drives the overview "students" figure.
  const myStudents = useMemo(() => {
    const seen = new Set<string>();
    const roster: typeof students = [];
    for (const b of myBatches) {
      for (const id of b.studentIds) {
        if (seen.has(id)) continue;
        seen.add(id);
        const student = students.find(s => s.id === id);
        if (student) roster.push(student);
      }
    }
    return roster;
  }, [myBatches, students]);

  const hasBatches = myBatches.length > 0;
  const activeBatch = myBatches.find(b => b.id === selectedBatchId) || myBatches[0];
  const batchStudents = students.filter(s => activeBatch?.studentIds.includes(s.id));
  const batchAssignments = myAssignments.filter(a => a.batchId === activeBatch?.id);
  const activeExam = myExams.find(e => e.id === selectedExamId) || myExams[0];

  // Marks must be entered against the EXAM's own roster, not whichever batch the
  // attendance tab happened to have selected — with several batches assigned,
  // grading Batch A's students into Batch B's test sheet was easy to hit.
  const examBatch = activeExam ? myBatches.find(b => b.id === activeExam.batchId) : undefined;
  const examStudents = students.filter(s => examBatch?.studentIds.includes(s.id));

  // Who can this faculty member add to the active batch? Students who are already
  // in it are excluded; the reachable pool is everyone who is either enrolled
  // nowhere yet (fresh admission) or already in one of THIS teacher's other
  // batches. It keeps the picker useful without turning the faculty console into
  // a browse-everyone directory.
  const rosterAvailableStudents = useMemo(() => {
    if (!activeBatch) return [];
    const inBatch = new Set(activeBatch.studentIds);
    return students.filter(s => {
      if (inBatch.has(s.id)) return false;
      const otherEnrolments = (s.batchIds || []).filter(id => id !== activeBatch.id);
      return otherEnrolments.length === 0 || otherEnrolments.every(id => myBatchIds.has(id));
    });
  }, [students, activeBatch, myBatchIds]);

  // Marks are per-exam. Seed the editor from the results already saved for the
  // selected exam, and re-seed whenever that exam changes. `saveExamResults`
  // REPLACES every result for an exam, so writing back an editor that did not
  // contain the existing scores would silently delete them — and marks typed for
  // one test would otherwise carry over into the next.
  useEffect(() => {
    const examId = activeExam?.id;
    if (!examId) {
      setMarksState({});
      return;
    }
    const seeded: { [studentId: string]: number | undefined } = {};
    for (const r of examResults) {
      if (r.examId === examId) seeded[r.studentId] = r.marksObtained;
    }
    setMarksState(seeded);
  }, [activeExam?.id, examResults]);

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    markAttendance({
      batchId: activeBatch.id,
      studentId,
      date: attendanceDate,
      status
    });

    if (status === 'absent') {
      const student = students.find(s => s.id === studentId);
      if (student) {
        const phone = student.guardian.fatherPhone || student.phone;
        const msg = `Dear Parent, ${student.name} was marked ABSENT from ${activeBatch.name} on ${attendanceDate} at ${currentOrg.name}. Please contact the institute if this is unexpected.`;
        setActiveWhatsappModal({
          title: `Send Absent Alert to ${student.name}'s Parent`,
          phone,
          message: msg
        });
      }
    }
  };

  const handleMarkAllPresent = () => {
    if (!activeBatch) return;
    markBatchAllPresent(activeBatch.id, attendanceDate);
    setSavedSuccessMsg('All students marked present for today.');
    setTimeout(() => setSavedSuccessMsg(''), 2500);
  };

  /**
   * Add or remove a student from the currently selected batch. Delegates to the
   * shared roster-sync path in StudentContext, which keeps `student.batchIds`
   * and `batch.studentIds` in lockstep — and enforces that a faculty member can
   * only write `batchIds` on students (every other field is rules-denied).
   */
  const handleRosterChange = async (studentId: string, add: boolean) => {
    if (!activeBatch) return;
    setSavingRosterStudentId(studentId);
    try {
      const result = add
        ? await enrollStudentInBatch(studentId, activeBatch.id)
        : await removeStudentFromBatch(studentId, activeBatch.id);
      if (result.ok) {
        showToast(
          add ? `${activeBatch.name}: student added to the roster.` : `${activeBatch.name}: student removed from the roster.`,
          'success'
        );
      } else {
        showToast(result.error, 'error');
      }
    } finally {
      setSavingRosterStudentId(null);
    }
  };

  const handleSaveMarks = () => {
    if (!activeExam) return;

    // Only rows that actually hold a score. Results already saved for this exam
    // were seeded into `marksState` above, so nothing previously recorded is
    // dropped by the replace-all write in `saveExamResults`.
    const marksData = Object.entries(marksState)
      .filter((entry): entry is [string, number] => typeof entry[1] === 'number')
      .map(([studentId, marks]) => ({
        studentId,
        marksObtained: Number(marks) || 0,
        remarks: 'Graded by subject faculty'
      }));

    if (marksData.length === 0) {
      setSavedSuccessMsg('Enter at least one mark before saving.');
      setTimeout(() => setSavedSuccessMsg(''), 2500);
      return;
    }

    saveExamResults(activeExam.id, marksData);
    setSavedSuccessMsg('Exam marks evaluated & percentile ranks generated.');
    setTimeout(() => setSavedSuccessMsg(''), 2500);
  };

  const handleCreateHw = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hwTitle.trim() || !activeBatch) return;

    createAssignment({
      branchId: activeBatch.branchId,
      batchId: activeBatch.id,
      title: hwTitle,
      description: hwDesc,
      subject: hwSubject,
      teacherId: currentUser.id,
      dueDate: hwDueDate
    });

    setShowHomeworkModal(false);
    setHwTitle('');
    setHwDesc('');
    setSavedSuccessMsg('Homework posted to students & parent feeds.');
    setTimeout(() => setSavedSuccessMsg(''), 2500);
  };

  // Shared across the Attendance and Homework tabs so both act on, and visibly
  // name, the same batch instead of silently defaulting to the first one.
  const batchSelect = (
    <select
      value={activeBatch?.id || ''}
      onChange={e => setSelectedBatchId(e.target.value)}
      aria-label="Select batch"
      className="bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.08] dark:border-white/[0.1] rounded-xl px-3 py-1.5 text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] min-h-[38px] font-apple-text cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#FFA000]/30"
    >
      {myBatches.map(b => (
        <option key={b.id} value={b.id} className="dark:bg-[#1C1C1E]">
          {b.name} ({b.studentIds.length} students)
        </option>
      ))}
    </select>
  );

  const noBatchesCard = (
    <ConsoleCard
      title="No batches assigned to you yet"
      subtitle="This console only shows batches you have been assigned to teach"
    >
      <p className="py-8 text-center text-xs text-[#5F6368] dark:text-[#9AA0A6]">
        Ask your centre admin to assign you to a batch from the Faculty directory.
        Attendance, marks and homework all become available once a batch is linked to your profile.
      </p>
    </ConsoleCard>
  );

  const content = (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        breadcrumbs={
          activeTab === 'overview'
            ? [{ label: 'Faculty Console' }]
            : [
                {
                  label: 'Faculty Console',
                  onClick: () => {
                    setActiveTab('overview');
                    navigate('/teacher');
                  }
                },
                {
                  label:
                    activeTab === 'attendance'
                      ? 'ATTENDANCE'
                      : activeTab === 'marks'
                      ? 'TEST MARKS'
                      : activeTab === 'assignments'
                      ? 'HOMEWORK & NOTES'
                      : 'VIDYACHAT'
                }
              ]
        }
        onBack={
          activeTab !== 'overview'
            ? () => {
                setActiveTab('overview');
                navigate('/teacher');
              }
            : undefined
        }
        title={currentUser.name}
        subtitle={`Faculty Instructor · ${currentUser.subjects?.join(', ') || 'Senior Faculty'} · ${currentOrg.name}`}
        badge={<StatusChip label="FACULTY ACTIVE" variant="success" size="xs" />}
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
            <ConsoleButton
              variant="blue"
              size="sm"
              icon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => setShowHomeworkModal(true)}
            >
              Post Homework
            </ConsoleButton>
          </div>
        }
      />

      {savedSuccessMsg && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24, ease: easings.outQuart }}
          className="p-3 bg-[#E6F4EA] border border-[#CEEAD6] text-[#137333] dark:bg-emerald-950/40 dark:text-[#81C995] text-xs font-medium rounded-xl flex items-center gap-2"
        >
          <CheckCircle className="w-4 h-4 text-[#188038]" />
          <span>{savedSuccessMsg}</span>
        </motion.div>
      )}

      {/* Sub Tabs */}
      <div className="flex items-center space-x-1 border-b border-black/[0.08] dark:border-white/[0.08] pb-1 overflow-x-auto custom-scrollbar -mx-2 px-2 sm:mx-0 sm:px-0 font-apple-text">
        {[
          { id: 'overview', label: 'Faculty Console', icon: LayoutDashboard },
          { id: 'attendance', label: '1-Tap Attendance', icon: Calendar },
          { id: 'marks', label: 'Enter Test Marks', icon: Award },
          { id: 'assignments', label: 'Homework & Notes', icon: BookOpen },
          { id: 'discussions', label: 'VidyaChat', icon: MessageSquare }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                if (tab.id === 'overview') {
                  navigate('/teacher');
                } else {
                  navigate(`/teacher/${tab.id}`);
                }
              }}
              className={`flex items-center space-x-1.5 px-3.5 py-2.5 min-h-[40px] text-xs font-semibold transition cursor-pointer border-b-2 whitespace-nowrap active:scale-95 ${
                isActive
                  ? 'border-[#FFA000] text-[#1D1D1F] dark:text-[#F5F5F7] font-bold'
                  : 'border-transparent text-[#86868B] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7]'
              }`}
            >
              <Icon className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* OVERVIEW: FACULTY CONSOLE HOME */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.26, ease: easings.outQuart }}
        className="space-y-6"
      >
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Quick Metrics */}
          <Reveal className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white dark:bg-[#1C1C1E] border border-black/[0.08] dark:border-white/[0.08] rounded-2xl p-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider font-apple-text">Assigned Batches</span>
                <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-[#0071E3] dark:text-[#2997FF] flex items-center justify-center">
                  <BookOpen className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-2 text-2xl sm:text-3xl font-bold font-apple-display text-[#1D1D1F] dark:text-[#F5F5F7] tabular-nums">
                <CountUp value={myBatches.length} />
              </div>
              <p className="text-[10px] text-[#86868B] mt-0.5 font-apple-text">Active teaching sections</p>
            </div>

            <div className="bg-white dark:bg-[#1C1C1E] border border-black/[0.08] dark:border-white/[0.08] rounded-2xl p-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider font-apple-text">Total Students</span>
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-[#34C759] dark:text-[#30D158] flex items-center justify-center">
                  <Users className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-2 text-2xl sm:text-3xl font-bold font-apple-display text-[#1D1D1F] dark:text-[#F5F5F7] tabular-nums">
                <CountUp value={myStudents.length} />
              </div>
              <p className="text-[10px] text-[#86868B] mt-0.5 font-apple-text">Enrolled in my batches</p>
            </div>

            <div className="bg-white dark:bg-[#1C1C1E] border border-black/[0.08] dark:border-white/[0.08] rounded-2xl p-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider font-apple-text">Coursework Posted</span>
                <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-[#AF52DE] dark:text-[#BF5AF2] flex items-center justify-center">
                  <Check className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-2 text-2xl sm:text-3xl font-bold font-apple-display text-[#1D1D1F] dark:text-[#F5F5F7] tabular-nums">
                <CountUp value={myAssignments.length} />
              </div>
              <p className="text-[10px] text-[#86868B] mt-0.5 font-apple-text">Homework assignments</p>
            </div>

            <div className="bg-white dark:bg-[#1C1C1E] border border-black/[0.08] dark:border-white/[0.08] rounded-2xl p-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider font-apple-text">Unit Tests / Exams</span>
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-[#FFA000] dark:text-[#FFCA28] flex items-center justify-center">
                  <Award className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-2 text-2xl sm:text-3xl font-bold font-apple-display text-[#1D1D1F] dark:text-[#F5F5F7] tabular-nums">
                <CountUp value={myExams.length} />
              </div>
              <p className="text-[10px] text-[#86868B] mt-0.5 font-apple-text">Scheduled tests</p>
            </div>
          </Reveal>

          {/* Quick-Launch Feature Cards */}
          <div>
            <h2 className="text-sm font-bold font-apple-text text-[#1D1D1F] dark:text-[#F5F5F7] mb-3">
              Faculty Workspaces & Actions
            </h2>
            <Reveal className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Action 1: Attendance */}
              <div
                onClick={() => {
                  setActiveTab('attendance');
                  navigate('/teacher/attendance');
                }}
                className="group p-5 bg-white dark:bg-[#1C1C1E] border border-black/[0.08] dark:border-white/[0.08] hover:border-[#0071E3] dark:hover:border-[#2997FF] rounded-2xl shadow-2xs hover:shadow-md transition cursor-pointer flex flex-col justify-between"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-[#0071E3] dark:text-[#2997FF] flex items-center justify-center group-hover:scale-105 transition">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-[#1D1D1F] dark:text-[#F5F5F7] group-hover:text-[#0071E3] dark:group-hover:text-[#2997FF] transition font-apple-text">
                        1-Tap Batch Attendance
                      </h3>
                      <p className="text-xs text-[#86868B] mt-0.5 font-apple-text">
                        Mark daily student presence, mark absentees & trigger WhatsApp alerts
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#0071E3] dark:group-hover:text-[#2997FF] group-hover:translate-x-1 transition" />
                </div>
                <div className="mt-4 pt-3 border-t border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between text-[11px] text-[#0071E3] dark:text-[#2997FF] font-semibold font-apple-text">
                  <span>Open Attendance Register</span>
                  <span>{myBatches.length} Active Batches →</span>
                </div>
              </div>

              {/* Action 2: Marks */}
              <div
                onClick={() => {
                  setActiveTab('marks');
                  navigate('/teacher/marks');
                }}
                className="group p-5 bg-white dark:bg-[#1C1C1E] border border-black/[0.08] dark:border-white/[0.08] hover:border-[#FFA000] rounded-2xl shadow-2xs hover:shadow-md transition cursor-pointer flex flex-col justify-between"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-[#FFA000] flex items-center justify-center group-hover:scale-105 transition">
                      <Award className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-[#1D1D1F] dark:text-[#F5F5F7] group-hover:text-[#FFA000] transition font-apple-text">
                        Enter Exam & Test Marks
                      </h3>
                      <p className="text-xs text-[#86868B] mt-0.5 font-apple-text">
                        Record diagnostic test scores, compute percentiles, and analyze ranks
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#FFA000] group-hover:translate-x-1 transition" />
                </div>
                <div className="mt-4 pt-3 border-t border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between text-[11px] text-[#FFA000] font-semibold font-apple-text">
                  <span>Evaluate Marks</span>
                  <span>{myExams.length} Diagnostic Tests →</span>
                </div>
              </div>

              {/* Action 3: Coursework */}
              <div
                onClick={() => {
                  setActiveTab('assignments');
                  navigate('/teacher/assignments');
                }}
                className="group p-5 bg-white dark:bg-[#1E1F20] border border-[#DADCE0] dark:border-[#3C4043] hover:border-[#188038] rounded-2xl shadow-2xs hover:shadow-md transition cursor-pointer flex flex-col justify-between"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-[#188038] flex items-center justify-center group-hover:scale-105 transition">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-[#202124] dark:text-[#E8EAED] group-hover:text-[#188038] transition">
                        Homework & Coursework
                      </h3>
                      <p className="text-xs text-[#5F6368] dark:text-[#9AA0A6] mt-0.5">
                        Assign homework problems, set due dates & check notebook submissions
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#188038] group-hover:translate-x-1 transition" />
                </div>
                <div className="mt-4 pt-3 border-t border-[#DADCE0] dark:border-[#3C4043] flex items-center justify-between text-[11px] text-[#188038] font-semibold">
                  <span>Manage Coursework</span>
                  <span>{myAssignments.length} Homeworks Posted →</span>
                </div>
              </div>

              {/* Action 4: VidyaChat */}
              <div
                onClick={() => {
                  setActiveTab('discussions');
                  navigate('/teacher/discussions');
                }}
                className="group p-5 bg-white dark:bg-[#1E1F20] border border-[#DADCE0] dark:border-[#3C4043] hover:border-purple-600 rounded-2xl shadow-2xs hover:shadow-md transition cursor-pointer flex flex-col justify-between"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center group-hover:scale-105 transition">
                      <MessageSquare className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-[#202124] dark:text-[#E8EAED] group-hover:text-purple-600 transition">
                        VidyaChat (Doubt Resolution)
                      </h3>
                      <p className="text-xs text-[#5F6368] dark:text-[#9AA0A6] mt-0.5">
                        Real-time student batch discussions, doubt clearance, and parent desk
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600 group-hover:translate-x-1 transition" />
                </div>
                <div className="mt-4 pt-3 border-t border-[#DADCE0] dark:border-[#3C4043] flex items-center justify-between text-[11px] text-purple-600 font-semibold">
                  <span>Enter VidyaChat Channels</span>
                  <span>Institute Slack Channels →</span>
                </div>
              </div>
            </Reveal>
          </div>

          {/* Assigned Batches List */}
          <ConsoleCard
            title="My Assigned Batches & Classrooms"
            subtitle="Direct shortcut to launch daily attendance or record test marks for each batch"
          >
            <div className="space-y-3">
              {myBatches.length === 0 && (
                <p className="py-6 text-center text-xs text-[#5F6368] dark:text-[#9AA0A6]">
                  No batches are assigned to you yet. Ask your centre admin to assign you to one
                  from the Faculty directory.
                </p>
              )}
              {myBatches.map(b => (
                <div
                  key={b.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-[#F8F9FA] dark:bg-[#282A2C] border border-[#DADCE0] dark:border-[#3C4043] rounded-xl gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-sm text-[#202124] dark:text-[#E8EAED]">{b.name}</span>
                      <StatusChip label={b.classGrade} variant="neutral" size="xs" />
                    </div>
                    <div className="text-xs text-[#5F6368] dark:text-[#9AA0A6] flex items-center space-x-3">
                      <span>Subject: <strong>{b.subject}</strong></span>
                      <span>•</span>
                      <span>Timing: <strong>{b.timeSlot}</strong></span>
                      <span>•</span>
                      <span>Room: <strong>{b.classroom || b.room || 'Room 1'}</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 flex-shrink-0">
                    <ConsoleButton
                      size="sm"
                      variant="primary"
                      icon={<Calendar className="w-3.5 h-3.5" />}
                      onClick={() => {
                        setSelectedBatchId(b.id);
                        setActiveTab('attendance');
                        navigate('/teacher/attendance');
                      }}
                    >
                      Mark Attendance
                    </ConsoleButton>
                    <ConsoleButton
                      size="sm"
                      variant="secondary"
                      icon={<Award className="w-3.5 h-3.5" />}
                      onClick={() => {
                        setActiveTab('marks');
                        navigate('/teacher/marks');
                      }}
                    >
                      Test Marks
                    </ConsoleButton>
                  </div>
                </div>
              ))}
            </div>
          </ConsoleCard>
        </div>
      )}

      {/* TAB 1: ATTENDANCE */}
      {activeTab === 'attendance' && !hasBatches && noBatchesCard}
      {activeTab === 'attendance' && hasBatches && (
        <ConsoleCard
          title="Batch Attendance Roster"
          subtitle={`Mark student presence with 1-tap toggles or broadcast absentee WhatsApp alerts · ${batchStudents.length} students`}
          action={
            <div className="flex flex-wrap items-center gap-2">
              {batchSelect}

              <input
                type="date"
                value={attendanceDate}
                onChange={e => setAttendanceDate(e.target.value)}
                className="bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.08] dark:border-white/[0.1] rounded-xl px-3 py-1.5 text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] min-h-[38px] font-apple-text focus:outline-none focus:ring-2 focus:ring-[#FFA000]/30"
              />

              <ConsoleButton
                variant="secondary"
                size="sm"
                icon={<UserPlus className="w-3.5 h-3.5 text-[#EA580C]" />}
                onClick={() => setShowRosterManager(true)}
              >
                Manage Roster
              </ConsoleButton>

              <ConsoleButton
                variant="blue"
                size="sm"
                icon={<Check className="w-3.5 h-3.5" />}
                onClick={handleMarkAllPresent}
              >
                Mark All Present
              </ConsoleButton>
            </div>
          }
        >
          {/* Student Roster Cards */}
          <div className="divide-y divide-black/[0.06] dark:divide-white/[0.08]">
            {batchStudents.map(student => {
              const rec = attendanceRecords.find(
                a => a.batchId === activeBatch.id && a.studentId === student.id && a.date === attendanceDate
              );
              const currentStatus = rec?.status || 'present';

              return (
                <div
                  key={student.id}
                  className="py-3 sm:py-3.5 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <img
                      src={student.avatar}
                      alt={student.name}
                      className="w-10 h-10 sm:w-11 sm:h-11 rounded-full object-cover border border-black/[0.08] dark:border-white/[0.1] flex-shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="font-bold text-xs sm:text-sm text-[#1D1D1F] dark:text-[#F5F5F7] truncate font-apple-text">{student.name}</div>
                      <div className="text-[10px] sm:text-xs text-[#86868B] font-apple-text">Roll: {student.rollNo}</div>
                    </div>
                  </div>

                  {/* Quick Toggle Status Buttons (Touch ergonomic 44px min targets) */}
                  <div className="flex items-center space-x-1.5 sm:space-x-2 flex-shrink-0">
                    {[
                      { status: 'present', label: 'P', title: 'Present', activeBg: 'bg-[#34C759] text-white shadow-xs ring-2 ring-[#34C759]/40' },
                      { status: 'absent', label: 'A', title: 'Absent', activeBg: 'bg-[#FF3B30] text-white shadow-xs ring-2 ring-[#FF3B30]/40' },
                      { status: 'late', label: 'L', title: 'Late', activeBg: 'bg-[#FF9F0A] text-white shadow-xs ring-2 ring-[#FF9F0A]/40' }
                    ].map(btn => {
                      const isSelected = currentStatus === btn.status;
                      return (
                        <button
                          key={btn.status}
                          onClick={() => handleStatusChange(student.id, btn.status as any)}
                          title={`Mark ${btn.title}`}
                          className={`w-11 h-11 sm:w-12 sm:h-11 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer active:scale-90 flex items-center justify-center touch-target ${
                            isSelected
                              ? `${btn.activeBg} font-black`
                              : 'bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.08] text-[#86868B] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7] hover:bg-black/[0.06] dark:hover:bg-white/[0.1]'
                          }`}
                        >
                          {btn.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </ConsoleCard>
      )}

      {/* F3: own leave filing + scoped approvals for my batches */}
      {activeTab === 'attendance' && (
        <div className="space-y-6">
          <LeavePortalPanel requesterType="teacher" teacherId={myTeacherRecord?.id} />
          <TeacherLeaveBoard />
        </div>
      )}

      {/* TAB 2: TEST MARKS */}
      {activeTab === 'marks' && !activeExam && (
        <ConsoleCard title="Test Marks" subtitle="Recorded scores auto-calculate batch percentiles and report cards">
          <p className="py-8 text-center text-xs text-[#5F6368] dark:text-[#9AA0A6]">
            No tests have been created for your batches yet. Once a test is scheduled
            for one of your batches, its mark sheet appears here.
          </p>
        </ConsoleCard>
      )}
      {activeTab === 'marks' && activeExam && (
        <ConsoleCard
          title="Enter Diagnostic Exam Marks"
          subtitle="Recorded scores auto-calculate batch percentiles and report cards"
          action={
            <div className="flex items-center space-x-2">
              <select
                value={activeExam?.id || ''}
                onChange={e => setSelectedExamId(e.target.value)}
                className="bg-[#F1F3F4] dark:bg-[#282A2C] border border-[#DADCE0] dark:border-[#3C4043] rounded-lg px-2.5 py-1.5 text-xs font-medium text-[#202124] dark:text-[#E8EAED]"
              >
                {myExams.map(e => (
                  <option key={e.id} value={e.id}>
                    {e.title} ({e.subject}) · Max: {e.maxMarks}
                  </option>
                ))}
              </select>

              <ConsoleButton
                variant="primary"
                size="xs"
                icon={<Award className="w-3.5 h-3.5" />}
                onClick={handleSaveMarks}
              >
                Save & Compute Ranks
              </ConsoleButton>
            </div>
          }
        >
          <div className="divide-y divide-[#DADCE0]/60 dark:divide-[#3C4043]">
            {examStudents.map(student => {
              // Blank until a score is entered. It used to default to 40, so an
              // untouched sheet looked graded and one click saved fabricated marks.
              const currentVal = marksState[student.id] ?? '';

              return (
                <div key={student.id} className="py-3 flex items-center justify-between text-xs gap-3">
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <img
                      src={student.avatar}
                      alt={student.name}
                      className="w-8 h-8 rounded-full object-cover border border-[#DADCE0] dark:border-[#3C4043] flex-shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="font-semibold text-sm text-[#202124] dark:text-[#E8EAED] truncate">{student.name}</div>
                      <div className="text-[10px] text-[#5F6368] dark:text-[#9AA0A6]">Roll No: {student.rollNo}</div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      max={activeExam.maxMarks}
                      min={0}
                      value={currentVal}
                      onChange={e => {
                        const raw = e.target.value;
                        setMarksState(prev => ({
                          ...prev,
                          [student.id]: raw === '' ? undefined : Number(raw)
                        }));
                      }}
                      className="w-16 px-2.5 py-1 text-center font-mono font-bold text-xs rounded-lg border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#1E1F20] text-[#202124] dark:text-[#E8EAED]"
                    />
                    <span className="text-[#5F6368] dark:text-[#9AA0A6] font-medium">/ {activeExam.maxMarks}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </ConsoleCard>
      )}

      {/* TAB 3: HOMEWORK & NOTES */}
      {activeTab === 'assignments' && !hasBatches && noBatchesCard}
      {activeTab === 'assignments' && hasBatches && (
        <ConsoleCard
          title="Coursework & Assignments"
          subtitle={`Homework posted to ${activeBatch?.name || 'this batch'}`}
          action={
            <div className="flex flex-wrap items-center gap-2">
              {batchSelect}
              <ConsoleButton
                variant="blue"
                size="sm"
                icon={<Plus className="w-3.5 h-3.5" />}
                onClick={() => setShowHomeworkModal(true)}
              >
                Post Homework
              </ConsoleButton>
            </div>
          }
        >
          <div className="space-y-3">
            {batchAssignments.length === 0 && (
              <p className="py-8 text-center text-xs text-[#5F6368] dark:text-[#9AA0A6]">
                No homework has been posted to this batch yet. Use “Post Homework” to assign
                work — students and parents see it on their dashboards immediately.
              </p>
            )}
            {batchAssignments.map(asg => (
              <div
                key={asg.id}
                className="p-4 rounded-xl border border-[#DADCE0] dark:border-[#3C4043] bg-[#F8F9FA] dark:bg-[#282A2C] space-y-1 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-[#202124] dark:text-[#E8EAED]">{asg.title}</span>
                  <StatusChip label={`Due: ${asg.dueDate}`} variant="neutral" size="xs" />
                </div>
                <p className="text-[#5F6368] dark:text-[#9AA0A6]">{asg.description}</p>
                <div className="text-[10px] text-[#5F6368] dark:text-[#9AA0A6] pt-1">
                  Submissions: <strong className="text-[#202124] dark:text-white">{asg.submissions.length} received</strong>
                </div>
              </div>
            ))}
          </div>
        </ConsoleCard>
      )}

      {/* Tab 4: Discussions / VidyaChat */}
      {activeTab === 'discussions' && (
        <InstituteMessenger className="mt-2" />
      )}
      </motion.div>

      {/* Homework Creation Modal */}
      {showHomeworkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-[#1E1F20] border border-[#DADCE0] dark:border-[#3C4043] w-full max-w-md rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="font-google-sans font-bold text-base text-[#202124] dark:text-[#E8EAED]">
              Assign Coursework / Homework
            </h3>
            <form onSubmit={handleCreateHw} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#5F6368] dark:text-[#9AA0A6] font-medium mb-1">Homework Topic</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. NCERT Exercise 4.2 Quadratic Equations"
                  value={hwTitle}
                  onChange={e => setHwTitle(e.target.value)}
                  className="w-full border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2C] text-[#202124] dark:text-[#E8EAED] rounded-lg p-2.5"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[#5F6368] dark:text-[#9AA0A6] font-medium mb-1">Subject</label>
                  <input
                    type="text"
                    required
                    value={hwSubject}
                    onChange={e => setHwSubject(e.target.value)}
                    className="w-full border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2C] text-[#202124] dark:text-[#E8EAED] rounded-lg p-2.5"
                  />
                </div>
                <div>
                  <label className="block text-[#5F6368] dark:text-[#9AA0A6] font-medium mb-1">Due Date</label>
                  <input
                    type="date"
                    required
                    value={hwDueDate}
                    onChange={e => setHwDueDate(e.target.value)}
                    className="w-full border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2C] text-[#202124] dark:text-[#E8EAED] rounded-lg p-2.5"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#5F6368] dark:text-[#9AA0A6] font-medium mb-1">Instructions / Problems</label>
                <textarea
                  rows={3}
                  placeholder="Specific questions to complete in fair notebook..."
                  value={hwDesc}
                  onChange={e => setHwDesc(e.target.value)}
                  className="w-full border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2C] text-[#202124] dark:text-[#E8EAED] rounded-lg p-2.5"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-[#DADCE0] dark:border-[#3C4043]">
                <ConsoleButton
                  type="button"
                  variant="ghost"
                  onClick={() => setShowHomeworkModal(false)}
                >
                  Cancel
                </ConsoleButton>
                <ConsoleButton
                  type="submit"
                  variant="primary"
                >
                  Post Homework
                </ConsoleButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {showEditProfileModal && (
        <EditProfileModal
          isOpen={showEditProfileModal}
          onClose={() => setShowEditProfileModal(false)}
        />
      )}

      {/* Roster Manager — add/remove students from the active batch */}
      <AnimatePresence>
      {showRosterManager && activeBatch && (() => {
        const query = rosterSearch.trim().toLowerCase();
        const matchingAvailable = rosterAvailableStudents.filter(s =>
          !query ||
          s.name.toLowerCase().includes(query) ||
          s.rollNo.toLowerCase().includes(query) ||
          (s.phone || '').replace(/[^0-9]/g, '').includes(query.replace(/[^0-9]/g, ''))
        );
        return (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <motion.div
            className="bg-white dark:bg-[#1E1F20] border border-[#DADCE0] dark:border-[#3C4043] w-full max-w-md rounded-2xl p-6 shadow-xl space-y-4"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 6 }}
            transition={{ type: 'spring', stiffness: 420, damping: 30, mass: 0.7 }}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-google-sans font-bold text-base text-[#202124] dark:text-[#E8EAED]">
                  Manage Roster · {activeBatch.name}
                </h3>
                <p className="text-[11px] text-[#5F6368] dark:text-[#9AA0A6] mt-0.5">
                  {activeBatch.studentIds.length}/{activeBatch.capacity} seats filled · adding or
                  removing updates the batch roster instantly everywhere
                </p>
              </div>
              <button
                onClick={() => { setShowRosterManager(false); setRosterSearch(''); }}
                aria-label="Close"
                className="p-1.5 rounded-lg text-[#5F6368] dark:text-[#9AA0A6] hover:bg-black/[0.06] dark:hover:bg-white/[0.08] transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Already enrolled */}
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[#5F6368] dark:text-[#9AA0A6] mb-1.5">
                In this batch · {batchStudents.length}
              </div>
              <div className="max-h-44 overflow-y-auto custom-scrollbar space-y-1">
                {batchStudents.length === 0 && (
                  <p className="text-xs text-[#5F6368] dark:text-[#9AA0A6] py-3 text-center">
                    No students yet — add your first one below.
                  </p>
                )}
                {batchStudents.map(student => (
                  <div
                    key={student.id}
                    className="flex items-center justify-between gap-2 py-1.5 border-b border-black/[0.05] dark:border-white/[0.06] last:border-0"
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <img
                        src={student.avatar}
                        alt={student.name}
                        className="w-7 h-7 rounded-full object-cover border border-black/[0.08] dark:border-white/[0.1] flex-shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-[#202124] dark:text-[#E8EAED] truncate">{student.name}</div>
                        <div className="text-[10px] text-[#86868B]">Roll {student.rollNo}</div>
                      </div>
                    </div>
                    <ConsoleButton
                      variant="danger"
                      size="xs"
                      disabled={!!savingRosterStudentId}
                      onClick={() => handleRosterChange(student.id, false)}
                      icon={savingRosterStudentId === student.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                    >
                      Remove
                    </ConsoleButton>
                  </div>
                ))}
              </div>
            </div>

            {/* Add students */}
            <div className="pt-3 border-t border-black/[0.06] dark:border-white/[0.08]">
              <div className="flex items-center justify-between mb-2">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-[#5F6368] dark:text-[#9AA0A6]">
                  Add students
                </div>
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[#86868B]" />
                  <input
                    value={rosterSearch}
                    onChange={e => setRosterSearch(e.target.value)}
                    placeholder="Search name or roll no"
                    className="pl-7 pr-2 py-1.5 w-40 text-xs bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.08] dark:border-white/[0.1] rounded-lg text-[#202124] dark:text-[#E8EAED] focus:outline-none focus:ring-2 focus:ring-[#FFA000]/30"
                  />
                </div>
              </div>
              <div className="max-h-44 overflow-y-auto custom-scrollbar space-y-1">
                {rosterAvailableStudents.length === 0 && (
                  <p className="text-xs text-[#5F6368] dark:text-[#9AA0A6] py-3 text-center">
                    No other students can be added right now.
                  </p>
                )}
                {matchingAvailable.map(student => (
                  <div
                    key={student.id}
                    className="flex items-center justify-between gap-2 py-1.5 border-b border-black/[0.05] dark:border-white/[0.06] last:border-0"
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <img
                        src={student.avatar}
                        alt={student.name}
                        className="w-7 h-7 rounded-full object-cover border border-black/[0.08] dark:border-white/[0.1] flex-shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-[#202124] dark:text-[#E8EAED] truncate">{student.name}</div>
                        <div className="text-[10px] text-[#86868B]">Class {student.classGrade} · Roll {student.rollNo}</div>
                      </div>
                    </div>
                    <ConsoleButton
                      variant="primary"
                      size="xs"
                      disabled={!!savingRosterStudentId}
                      onClick={() => handleRosterChange(student.id, true)}
                      icon={savingRosterStudentId === student.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserPlus className="w-3 h-3" />}
                    >
                      Add
                    </ConsoleButton>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-[#86868B] mt-2">
                Shows students who are not enrolled anywhere yet, or already in one of your other
                batches. Ask your admin for anything beyond that.
              </p>
            </div>
          </motion.div>
        </motion.div>
        );
      })()}
      </AnimatePresence>
    </div>
  );

  if (mobileViewActive) {
    return (
      <div className="py-6 flex justify-center bg-slate-100 dark:bg-slate-950 min-h-screen">
        <div className="w-full max-w-md bg-white dark:bg-[#1E1F20] rounded-3xl shadow-2xl border-4 border-slate-800 overflow-hidden flex flex-col">
          <div className="bg-slate-900 px-6 py-2 flex items-center justify-between text-[11px] text-white font-mono">
            <span>9:41</span>
            <div className="w-20 h-4 bg-slate-800 rounded-full mx-auto"></div>
            <span>5G 98%</span>
          </div>
          <div className="bg-[#1A73E8] text-white p-3 flex items-center justify-between">
            <div className="font-bold text-xs">{currentOrg.name}</div>
            <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-bold">Faculty App</span>
          </div>
          <div className="p-4 overflow-y-auto max-h-[750px] custom-scrollbar">
            {content}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
      {content}
    </div>
  );
};
