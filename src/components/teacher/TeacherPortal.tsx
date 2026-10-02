import React, { useState, useEffect } from 'react';
import { useRouter } from '../../context/RouterContext';
import { useApp } from '../../context/AppContext';
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
  ArrowRight
} from 'lucide-react';
import { AttendanceStatus } from '../../types';
import {
  PageHeader,
  ConsoleCard,
  ConsoleButton,
  StatusChip
} from '../ui';
import { EditProfileModal } from '../profile/EditProfileModal';
import { InstituteMessenger } from '../chat/InstituteMessenger';

export const TeacherPortal: React.FC = () => {
  const { currentPath, navigate } = useRouter();
  const {
    currentUser,
    currentOrg,
    batches,
    students,
    attendanceRecords,
    markAttendance,
    markBatchAllPresent,
    exams,
    saveExamResults,
    assignments,
    createAssignment,
    setActiveWhatsappModal,
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
  const [selectedBatchId, setSelectedBatchId] = useState<string>('batch-c10-math');
  const [attendanceDate, setAttendanceDate] = useState<string>('2026-09-28');
  const [savedSuccessMsg, setSavedSuccessMsg] = useState<string>('');

  // Marks entry state
  const [selectedExamId, setSelectedExamId] = useState<string>('exam-c10-math-diag');
  const [marksState, setMarksState] = useState<{ [studentId: string]: number }>({
    'stud-rahul-10': 44,
    'stud-aarav-10': 47,
    'stud-sneha-10': 39
  });

  // Homework modal
  const [showHomeworkModal, setShowHomeworkModal] = useState<boolean>(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState<boolean>(false);
  const [hwTitle, setHwTitle] = useState<string>('');
  const [hwSubject, setHwSubject] = useState<string>('Mathematics');
  const [hwDueDate, setHwDueDate] = useState<string>('2026-10-05');
  const [hwDesc, setHwDesc] = useState<string>('');

  const activeBatch = batches.find(b => b.id === selectedBatchId) || batches[0];
  const batchStudents = students.filter(s => activeBatch?.studentIds.includes(s.id));
  const activeExam = exams.find(e => e.id === selectedExamId) || exams[0];

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
    markBatchAllPresent(activeBatch.id, attendanceDate);
    setSavedSuccessMsg('All students marked present for today.');
    setTimeout(() => setSavedSuccessMsg(''), 2500);
  };

  const handleSaveMarks = () => {
    const marksData = Object.entries(marksState).map(([studentId, marks]) => ({
      studentId,
      marksObtained: Number(marks) || 0,
      remarks: 'Graded by subject faculty'
    }));

    saveExamResults(activeExam.id, marksData);
    setSavedSuccessMsg('Exam marks evaluated & percentile ranks generated.');
    setTimeout(() => setSavedSuccessMsg(''), 2500);
  };

  const handleCreateHw = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hwTitle.trim()) return;

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
        <div className="p-3 bg-[#E6F4EA] border border-[#CEEAD6] text-[#137333] dark:bg-emerald-950/40 dark:text-[#81C995] text-xs font-medium rounded-xl flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-[#188038]" />
          <span>{savedSuccessMsg}</span>
        </div>
      )}

      {/* Sub Tabs */}
      <div className="flex items-center space-x-1 border-b border-[#DADCE0] dark:border-[#3C4043] pb-1 overflow-x-auto custom-scrollbar -mx-2 px-2 sm:mx-0 sm:px-0">
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
                  ? 'border-[#FFA000] text-[#202124] dark:text-white font-bold'
                  : 'border-transparent text-[#5F6368] dark:text-[#9AA0A6] hover:text-[#202124] dark:hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* OVERVIEW: FACULTY CONSOLE HOME */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Quick Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white dark:bg-[#1C1C1E] border border-black/[0.08] dark:border-white/[0.08] rounded-2xl p-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider font-apple-text">Assigned Batches</span>
                <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-[#0071E3] dark:text-[#2997FF] flex items-center justify-center">
                  <BookOpen className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-2 text-2xl sm:text-3xl font-bold font-apple-display text-[#1D1D1F] dark:text-[#F5F5F7] tabular-nums">
                {batches.length}
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
                {students.length}
              </div>
              <p className="text-[10px] text-[#86868B] mt-0.5 font-apple-text">Enrolled under coaching</p>
            </div>

            <div className="bg-white dark:bg-[#1C1C1E] border border-black/[0.08] dark:border-white/[0.08] rounded-2xl p-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider font-apple-text">Coursework Posted</span>
                <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-[#AF52DE] dark:text-[#BF5AF2] flex items-center justify-center">
                  <Check className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-2 text-2xl sm:text-3xl font-bold font-apple-display text-[#1D1D1F] dark:text-[#F5F5F7] tabular-nums">
                {assignments.length}
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
                {exams.length}
              </div>
              <p className="text-[10px] text-[#86868B] mt-0.5 font-apple-text">Scheduled tests</p>
            </div>
          </div>

          {/* Quick-Launch Feature Cards */}
          <div>
            <h2 className="text-sm font-bold font-apple-text text-[#1D1D1F] dark:text-[#F5F5F7] mb-3">
              Faculty Workspaces & Actions
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <span>{batches.length} Active Batches →</span>
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
                  <span>{exams.length} Diagnostic Tests →</span>
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
                  <span>{assignments.length} Homeworks Posted →</span>
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
            </div>
          </div>

          {/* Assigned Batches List */}
          <ConsoleCard
            title="My Assigned Batches & Classrooms"
            subtitle="Direct shortcut to launch daily attendance or record test marks for each batch"
          >
            <div className="space-y-3">
              {batches.map(b => (
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
      {activeTab === 'attendance' && (
        <ConsoleCard
          title="Batch Attendance Roster"
          subtitle="Mark student presence with 1-tap toggles or broadcast absentee WhatsApp alerts"
          action={
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedBatchId}
                onChange={e => setSelectedBatchId(e.target.value)}
                className="bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.08] dark:border-white/[0.1] rounded-xl px-3 py-1.5 text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] min-h-[38px] font-apple-text cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#FFA000]/30"
              >
                {batches.map(b => (
                  <option key={b.id} value={b.id} className="dark:bg-[#1C1C1E]">
                    {b.name} ({b.studentIds.length} students)
                  </option>
                ))}
              </select>

              <input
                type="date"
                value={attendanceDate}
                onChange={e => setAttendanceDate(e.target.value)}
                className="bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.08] dark:border-white/[0.1] rounded-xl px-3 py-1.5 text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] min-h-[38px] font-apple-text focus:outline-none focus:ring-2 focus:ring-[#FFA000]/30"
              />

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

      {/* TAB 2: TEST MARKS */}
      {activeTab === 'marks' && (
        <ConsoleCard
          title="Enter Diagnostic Exam Marks"
          subtitle="Recorded scores auto-calculate batch percentiles and report cards"
          action={
            <div className="flex items-center space-x-2">
              <select
                value={selectedExamId}
                onChange={e => setSelectedExamId(e.target.value)}
                className="bg-[#F1F3F4] dark:bg-[#282A2C] border border-[#DADCE0] dark:border-[#3C4043] rounded-lg px-2.5 py-1.5 text-xs font-medium text-[#202124] dark:text-[#E8EAED]"
              >
                {exams.map(e => (
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
            {batchStudents.map(student => {
              const currentVal = marksState[student.id] ?? 40;

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
                        const val = Number(e.target.value);
                        setMarksState(prev => ({ ...prev, [student.id]: val }));
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
      {activeTab === 'assignments' && (
        <ConsoleCard
          title="Coursework & Assignments"
          subtitle="Manage assigned homework, submission track records, and solutions"
          action={
            <ConsoleButton
              variant="blue"
              size="sm"
              icon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => setShowHomeworkModal(true)}
            >
              Post Homework
            </ConsoleButton>
          }
        >
          <div className="space-y-3">
            {assignments.map(asg => (
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
