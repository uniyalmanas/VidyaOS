import React, { useState, useEffect } from 'react';
import { useRouter } from '../../context/RouterContext';
import { useApp } from '../../context/AppContext';
import {
  Calendar,
  BookOpen,
  Award,
  Clock,
  Download,
  CheckCircle2,
  FileText,
  Check,
  UserCheck,
  MessageSquare
} from 'lucide-react';
import { User } from '../../types';
import {
  PageHeader,
  ConsoleCard,
  ConsoleButton,
  StatusChip
} from '../ui';
import { EditProfileModal } from '../profile/EditProfileModal';
import { InstituteMessenger } from '../chat/InstituteMessenger';

export const StudentPortal: React.FC = () => {
  const { currentPath, navigate } = useRouter();
  const {
    currentUser,
    students,
    batches,
    attendanceRecords,
    exams,
    examResults,
    assignments,
    studyMaterials,
    timetableSlots,
    announcements
  } = useApp();

  const [activeTab, setActiveTab] = useState<'schedule' | 'assignments' | 'results' | 'materials' | 'discussions'>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.toLowerCase();
      if (path.includes('/assignments')) return 'assignments';
      if (path.includes('/results')) return 'results';
      if (path.includes('/materials')) return 'materials';
      if (path.includes('/discussions') || path.includes('/messages')) return 'discussions';
    }
    return 'schedule';
  });

  // Keep activeTab in sync with browser navigation
  useEffect(() => {
    const path = currentPath.toLowerCase();
    if (path.includes('/assignments') && activeTab !== 'assignments') setActiveTab('assignments');
    else if (path.includes('/results') && activeTab !== 'results') setActiveTab('results');
    else if (path.includes('/materials') && activeTab !== 'materials') setActiveTab('materials');
    else if ((path.includes('/discussions') || path.includes('/messages')) && activeTab !== 'discussions') setActiveTab('discussions');
    else if ((path === '/student' || path === '/student/' || path.includes('/schedule')) && activeTab !== 'schedule') {
      setActiveTab('schedule');
    }
  }, [currentPath]);

  const [showEditProfileModal, setShowEditProfileModal] = useState<boolean>(false);
  const [submittedTasks, setSubmittedTasks] = useState<{ [id: string]: boolean }>({
    'assign-1': true
  });

  // Find current student record (defaults to matching user or Rahul Sharma)
  const student = students.find(s => s.id === currentUser?.id || s.email === currentUser?.email) || students.find(s => s.id === 'stud-rahul-10') || students[0];
  const enrolledBatches = batches.filter(b => student.batchIds.includes(b.id));

  const studentUser: User = {
    id: student.id,
    name: student.name,
    email: student.email || '',
    phone: student.phone,
    avatar: student.avatar,
    role: 'STUDENT',
    orgId: student.orgId,
    schoolName: student.schoolName,
    classGrade: student.classGrade,
    rollNo: student.rollNo,
    address: student.address,
    emergencyContact: student.guardian?.fatherPhone || student.phone,
    bloodGroup: student.bloodGroup,
    dateOfBirth: student.dateOfBirth
  };

  const studentAttendance = attendanceRecords.filter(a => a.studentId === student.id);
  const presentCount = studentAttendance.filter(a => a.status === 'present').length;
  const attendanceRate = Math.round((presentCount / (studentAttendance.length || 1)) * 100);

  const studentResults = examResults.filter(r => r.studentId === student.id);
  const studentMaterials = studyMaterials.filter(m => !m.batchId || student.batchIds.includes(m.batchId));
  const studentAssignments = assignments.filter(a => student.batchIds.includes(a.batchId));

  const handleToggleSubmit = (assignId: string) => {
    setSubmittedTasks(prev => ({ ...prev, [assignId]: !prev[assignId] }));
  };

  const handleSelectTab = (tabId: string) => {
    setActiveTab(tabId as any);
    if (tabId === 'schedule') {
      navigate('/student');
    } else {
      navigate(`/student/${tabId}`);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Student Page Header */}
      <PageHeader
        breadcrumbs={
          activeTab === 'schedule'
            ? [
                { label: 'Student Workspace' },
                { label: student.name }
              ]
            : [
                {
                  label: 'Student Workspace',
                  onClick: () => handleSelectTab('schedule')
                },
                {
                  label: student.name,
                  onClick: () => handleSelectTab('schedule')
                },
                {
                  label:
                    activeTab === 'assignments'
                      ? 'HOMEWORK'
                      : activeTab === 'results'
                      ? 'REPORT CARDS'
                      : activeTab === 'materials'
                      ? 'STUDY NOTES'
                      : activeTab === 'discussions'
                      ? 'VIDYACHAT'
                      : (activeTab as string).toUpperCase()
                }
              ]
        }
        onBack={activeTab !== 'schedule' ? () => handleSelectTab('schedule') : undefined}
        title={activeTab === 'schedule' ? student.name : `${student.name} · ${activeTab === 'assignments' ? 'Homework & Tasks' : activeTab === 'results' ? 'Report Cards & Ranks' : (activeTab as string).toUpperCase()}`}
        subtitle={`${student.classGrade} (${student.board}) · Roll No: ${student.rollNo} · Enrollment: ${student.enrollmentNo} · ${student.schoolName}`}
        badge={
          <StatusChip label={`${attendanceRate}% ATTENDANCE`} variant={attendanceRate >= 80 ? 'success' : 'warning'} size="xs" />
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
            <span className="text-xs text-[#5F6368] dark:text-[#9AA0A6] font-medium hidden sm:inline">
              {enrolledBatches.length} Enrolled Batches
            </span>
          </div>
        }
      />

      {/* Tabs */}
      <div className="flex items-center space-x-1 border-b border-black/[0.08] dark:border-white/[0.08] pb-1 overflow-x-auto custom-scrollbar -mx-2 px-2 sm:mx-0 sm:px-0">
        {[
          { id: 'schedule', label: 'My Schedule', icon: Clock },
          { id: 'assignments', label: 'Homework & Tasks', icon: BookOpen },
          { id: 'results', label: 'Exam Results', icon: Award },
          { id: 'materials', label: 'Study Vault', icon: FileText },
          { id: 'discussions', label: 'VidyaChat', icon: MessageSquare }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleSelectTab(tab.id)}
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

      {/* TAB 1: SCHEDULE */}
      {activeTab === 'schedule' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ConsoleCard
            title="Enrolled Coaching Batches"
            subtitle="Classrooms and weekly schedules"
          >
            <div className="space-y-2.5">
              {enrolledBatches.map(b => (
                <div
                  key={b.id}
                  className="p-3.5 rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.04] space-y-1 text-xs"
                >
                  <div className="font-semibold text-sm text-[#1D1D1F] dark:text-[#F5F5F7] font-apple-text">{b.name}</div>
                  <div className="text-[#86868B] font-apple-text">
                    Schedule: {b.scheduleDays.join(', ')} · {b.timeSlot}
                  </div>
                  <div className="text-[11px] text-[#86868B] font-apple-text">Classroom: {b.classroom}</div>
                </div>
              ))}
            </div>
          </ConsoleCard>

          <ConsoleCard
            title="Weekly Lecture Timings"
            subtitle="Time slots across assigned subjects"
          >
            <div className="space-y-2">
              {timetableSlots
                .filter(t => student.batchIds.includes(t.batchId))
                .map(t => (
                  <div
                    key={t.id}
                    className="p-3 rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#1C1C1E] flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-[#FFA000] dark:text-[#FFCA28] text-[11px] uppercase tracking-wide font-apple-text">
                        {t.dayOfWeek}
                      </span>
                      <div className="font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] font-apple-text">{t.subject}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-[#86868B] tabular-nums">{t.startTime} - {t.endTime}</div>
                      <div className="text-[10px] text-[#86868B] font-apple-text">{t.classroom}</div>
                    </div>
                  </div>
                ))}
            </div>
          </ConsoleCard>
        </div>
      )}

      {/* TAB 2: ASSIGNMENTS */}
      {activeTab === 'assignments' && (
        <ConsoleCard
          title="Homework & NCERT Practice Assignments"
          subtitle="Coursework, deadlines, and completion status"
        >
          <div className="space-y-3">
            {studentAssignments.map(asg => {
              const isDone = submittedTasks[asg.id];
              return (
                <div
                  key={asg.id}
                  className="p-4 rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.04] flex items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="font-semibold text-sm text-[#1D1D1F] dark:text-[#F5F5F7] font-apple-text">{asg.title}</div>
                    <p className="text-[#86868B] font-apple-text">{asg.description}</p>
                    <div className="text-[11px] text-[#86868B] font-apple-text">
                      Due: {asg.dueDate} · Subject: {asg.subject}
                    </div>
                  </div>

                  <ConsoleButton
                    variant={isDone ? 'secondary' : 'primary'}
                    size="xs"
                    icon={isDone ? <Check className="w-3.5 h-3.5 text-[#34C759] dark:text-[#30D158]" /> : null}
                    onClick={() => handleToggleSubmit(asg.id)}
                  >
                    {isDone ? 'Completed' : 'Mark as Done'}
                  </ConsoleButton>
                </div>
              );
            })}
          </div>
        </ConsoleCard>
      )}

      {/* TAB 3: RESULTS */}
      {activeTab === 'results' && (
        <ConsoleCard
          title="Diagnostic Test Report Cards"
          subtitle="Exam marks, rank standings, and instructor evaluations"
        >
          <div className="space-y-3">
            {studentResults.map(res => {
              const exam = exams.find(e => e.id === res.examId);
              return (
                <div
                  key={res.id}
                  className="p-4 rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.04] space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-sm text-[#1D1D1F] dark:text-[#F5F5F7] font-apple-text">{exam?.title}</div>
                      <div className="text-[11px] text-[#86868B] font-apple-text">{exam?.subject} · Exam Date: {exam?.examDate}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold font-mono text-[#FFA000] dark:text-[#FFCA28] tabular-nums">
                        {res.marksObtained} / {exam?.maxMarks}
                      </div>
                      <div className="text-[10px] font-bold text-[#34C759] dark:text-[#30D158] tabular-nums">{res.percentage}% Score</div>
                    </div>
                  </div>
                  <div className="bg-white dark:bg-[#1C1C1E] p-3 rounded-xl border border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between text-[11px]">
                    <div>Batch Rank: <strong className="text-[#1D1D1F] dark:text-[#F5F5F7] font-apple-text">#{res.rank}</strong></div>
                    <div>Percentile: <strong className="text-[#0071E3] dark:text-[#2997FF] font-apple-text">{res.percentile}th</strong></div>
                    <span className="text-[#86868B] truncate font-apple-text">Faculty: "{res.teacherRemarks}"</span>
                  </div>
                </div>
              );
            })}
          </div>
        </ConsoleCard>
      )}

      {/* TAB 4: STUDY MATERIALS */}
      {activeTab === 'materials' && (
        <ConsoleCard
          title="Study Vault & Revision Notes"
          subtitle="Reference guides and chapter summaries"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {studentMaterials.map(mat => (
              <div
                key={mat.id}
                className="p-4 rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.04] space-y-2 text-xs flex flex-col justify-between"
              >
                <div>
                  <StatusChip label={mat.type} variant="info" size="xs" />
                  <div className="font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] text-sm mt-1 font-apple-text">{mat.title}</div>
                  <p className="text-[11px] text-[#86868B] mt-0.5 font-apple-text">{mat.chapterTopic} · {mat.fileSize}</p>
                </div>

                <ConsoleButton
                  variant="secondary"
                  size="xs"
                  icon={<Download className="w-3.5 h-3.5" />}
                  onClick={() => alert(`Downloading ${mat.title}`)}
                  className="w-full mt-2"
                >
                  Download Material
                </ConsoleButton>
              </div>
            ))}
          </div>
        </ConsoleCard>
      )}

      {/* TAB 5: VIDYACHAT DOUBTS & PEERS */}
      {activeTab === 'discussions' && (
        <InstituteMessenger className="mt-2" />
      )}

      {/* Edit Student Profile Modal */}
      {showEditProfileModal && (
        <EditProfileModal
          isOpen={showEditProfileModal}
          targetUser={studentUser}
          onClose={() => setShowEditProfileModal(false)}
        />
      )}
    </div>
  );
};
