import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from '../../context/RouterContext';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
  LayoutDashboard,
  CalendarCheck,
  Users,
  CreditCard,
  Calendar,
  Award,
  BookOpen,
  Clock,
  Plus,
  QrCode,
  FileText,
  Printer,
  Share2,
  CheckCircle,
  TrendingUp,
  UserCheck,
  DollarSign,
  Download,
  FolderOpen,
  ShieldCheck,
  ShieldAlert,
  BarChart3,
  FileSpreadsheet,
  HeartHandshake,
  Megaphone,
  MessageSquare,
  Settings as SettingsIcon,
  Check,
  ArrowRight,
  Zap,
  Phone,
  Search,
  ChevronRight,
  Upload,
  Trash2,
  Building2,
  Sparkles,
  Copy,
  Edit2
} from 'lucide-react';
import { IndianBoard, AttendanceStatus, Batch, FeeInvoice, StudyMaterial, User } from '../../types';
import { uploadFileToStorage } from '../../lib/firebase';
import { EditProfileModal } from '../profile/EditProfileModal';
import { BulkStudentImportModal } from './BulkStudentImportModal';
import {
  PageHeader,
  MetricCard,
  ConsoleCard,
  ConsoleButton,
  StatusChip,
  DataTable,
  Column
} from '../ui';
import { InstituteMessenger } from '../chat/InstituteMessenger';

const MODULE_META: Record<string, { label: string; breadcrumb: string; subtitle: string }> = {
  overview: { label: 'Coaching & Education Center Overview', breadcrumb: 'Overview', subtitle: "Daily operations, today's schedule, fee collections, and key center performance metrics" },
  students: { label: 'Student Directory & Profiles', breadcrumb: 'Students', subtitle: 'Manage student admissions, batch allocations, academic profiles & parent contacts' },
  batches: { label: 'Coaching Batches & Classrooms', breadcrumb: 'Batches', subtitle: 'Configure course schedules, faculty assignments, classroom capacity, and fees' },
  attendance: { label: 'Daily Attendance Register', breadcrumb: 'Attendance', subtitle: 'Mark student presence, record late arrivals, and dispatch instant WhatsApp alerts to parents' },
  fees: { label: 'Fee Ledger & Payment Collection', breadcrumb: 'Fees', subtitle: 'Track monthly coaching invoices, record UPI/cash receipts, and send automated fee reminders' },
  timetable: { label: 'Master Institute Timetable', breadcrumb: 'Timetable', subtitle: 'Conflict-free schedule grid across all lecture halls and faculty timings' },
  exams: { label: 'Diagnostic Tests & Marks', breadcrumb: 'Exams', subtitle: 'Schedule unit tests, record student marks, and track performance percentiles' },
  assignments: { label: 'Homework & Coursework', breadcrumb: 'Assignments', subtitle: 'Manage assigned coursework, submission deadlines, and student homework completion' },
  materials: { label: 'Study Material & Library', breadcrumb: 'Materials', subtitle: 'Curated NCERT solutions, formula sheets, lecture notes, and chapter summaries' },
  teachers: { label: 'Faculty & Teachers Directory', breadcrumb: 'Teachers', subtitle: 'Instructor profiles, assigned subjects, contact details, and teaching schedules' },
  parents: { label: 'Parents & Guardians Directory', breadcrumb: 'Parents', subtitle: 'Direct communication channels, child linkages, and fee receipt sharing' },
  announcements: { label: 'Announcements & Broadcast System', breadcrumb: 'Announcements', subtitle: 'Publish urgent notices, holiday schedules, and WhatsApp broadcast templates' },
  discussions: { label: 'VidyaChat · Institute Slack Channels', breadcrumb: 'VidyaChat', subtitle: 'Real-time communication across batches, faculty lounge, parent desk & student doubt channels' },
  messages: { label: 'VidyaChat · Institute Slack Channels', breadcrumb: 'VidyaChat', subtitle: 'Real-time communication across batches, faculty lounge, parent desk & student doubt channels' },
  analytics: { label: 'Coaching Center Analytics', breadcrumb: 'Analytics', subtitle: 'Detailed insights into student attendance, test score distribution, and fee recovery' },
  reports: { label: 'Academic & Fee Reports', breadcrumb: 'Reports', subtitle: 'Download audit trails, monthly fee collection ledgers, and student rosters' },
  settings: { label: 'Coaching Center Settings', breadcrumb: 'Settings', subtitle: 'Configure institute branding, UPI payment credentials, and SMS gateway details' },
  subscription: { label: 'VidyaOS SaaS Subscription', breadcrumb: 'Subscription', subtitle: 'Multi-tenant isolated coaching tier, active quotas, and resource limits' },
};

export const AdminDashboard: React.FC = () => {
  const {
    currentOrg,
    students,
    teachers,
    batches,
    attendanceRecords,
    invoices,
    exams,
    examResults,
    timetableSlots,
    announcements,
    addStudent,
    addBatch,
    addTeacher,
    markAttendance,
    markBatchAllPresent,
    recordPayment,
    createInvoice,
    createExam,
    createAnnouncement,
    setActiveReceiptInvoice,
    setActiveUpiModalInvoice,
    setActiveWhatsappModal,
    activeTab,
    setActiveTab,
    assignments,
    studyMaterials,
    addStudyMaterial,
    deleteStudyMaterial,
    updateOrganization,
    subscriptionPlans,
    changeOrgPlan,
    showToast
  } = useApp();

  const { navigate } = useRouter();
  const { currentUser } = useAuth();
  const isStaff = currentUser?.role === 'STAFF';
  const STAFF_RESTRICTED_MODULES = ['teachers', 'analytics', 'reports', 'settings', 'subscription'];

  const currentModule = (!activeTab || activeTab === 'dashboard' || !MODULE_META[activeTab]) ? 'overview' : activeTab;
  const setCurrentModule = (tab: string) => {
    if (isStaff && STAFF_RESTRICTED_MODULES.includes(tab)) {
      showToast('Access Restricted: Front desk staff cannot access this module.', 'warning');
      return;
    }
    setActiveTab(tab);
    if (tab === 'overview' || tab === 'dashboard') {
      navigate(`/admin/${currentOrg.id}`);
    } else {
      navigate(`/admin/${currentOrg.id}/${tab}`);
    }
  };

  // Search & Filter states
  const [studentSearch, setStudentSearch] = useState<string>('');
  const [selectedBatchFilter, setSelectedBatchFilter] = useState<string>('all');

  // Modals state
  const [editingPerson, setEditingPerson] = useState<User | null>(null);
  const [showAddStudentModal, setShowAddStudentModal] = useState<boolean>(false);
  const [showBulkImportModal, setShowBulkImportModal] = useState<boolean>(false);
  const [showAddBatchModal, setShowAddBatchModal] = useState<boolean>(false);
  const [showAddTeacherModal, setShowAddTeacherModal] = useState<boolean>(false);
  const [teacherName, setTeacherName] = useState<string>('');
  const [teacherEmail, setTeacherEmail] = useState<string>('');
  const [teacherPhone, setTeacherPhone] = useState<string>('');
  const [teacherQualification, setTeacherQualification] = useState<string>('B.Tech / M.Sc');
  const [teacherSubject, setTeacherSubject] = useState<string>('Mathematics');
  const [teacherSalary, setTeacherSalary] = useState<number>(35000);
  const [showCollectFeeModal, setShowCollectFeeModal] = useState<boolean>(false);
  const [showNewExamModal, setShowNewExamModal] = useState<boolean>(false);
  const [showNewNoticeModal, setShowNewNoticeModal] = useState<boolean>(false);
  const [showUploadMaterialModal, setShowUploadMaterialModal] = useState<boolean>(false);
  const [materialTitle, setMaterialTitle] = useState<string>('');
  const [materialSubject, setMaterialSubject] = useState<string>('Mathematics');
  const [materialType, setMaterialType] = useState<StudyMaterial['type']>('pdf');
  const [materialChapter, setMaterialChapter] = useState<string>('');
  const [materialBatchId, setMaterialBatchId] = useState<string>(batches[0]?.id || '');
  const [materialFile, setMaterialFile] = useState<File | null>(null);
  const [uploadingMaterial, setUploadingMaterial] = useState<boolean>(false);

  const [selectedInvoiceToCollect, setSelectedInvoiceToCollect] = useState<string>('');
  const [collectAmount, setCollectAmount] = useState<number>(2000);
  const [collectMethod, setCollectMethod] = useState<'Cash' | 'UPI' | 'NetBanking'>('UPI');
  const [collectUtr, setCollectUtr] = useState<string>('');

  const handleUploadMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!materialTitle.trim()) return;

    setUploadingMaterial(true);
    try {
      let downloadUrl = '#';
      let fileSize = '1.2 MB';

      if (materialFile) {
        fileSize = `${(materialFile.size / (1024 * 1024)).toFixed(1)} MB`;
        const path = `study-materials/${currentOrg.id}/${Date.now()}_${materialFile.name.replace(/\s+/g, '_')}`;
        downloadUrl = await uploadFileToStorage(path, materialFile, materialFile.type);
      }

      addStudyMaterial({
        title: materialTitle.trim(),
        subject: materialSubject,
        type: materialType,
        fileUrl: downloadUrl,
        fileSize,
        uploadedByTeacherId: teachers[0]?.id || 'teach-admin',
        chapterTopic: materialChapter.trim() || undefined,
        batchId: materialBatchId || undefined
      });

      showToast('Resource uploaded to Firebase Cloud Storage!', 'success');
      setShowUploadMaterialModal(false);
      setMaterialTitle('');
      setMaterialChapter('');
      setMaterialFile(null);
    } catch (err: any) {
      showToast(err.message || 'Failed to upload to Cloud Storage', 'error');
    } finally {
      setUploadingMaterial(false);
    }
  };

  // Attendance state
  const [attDate, setAttDate] = useState<string>('2026-09-28');
  const [attBatchId, setAttBatchId] = useState<string>(batches[0]?.id || '');

  useEffect(() => {
    if ((!attBatchId || !batches.find(b => b.id === attBatchId)) && batches.length > 0) {
      setAttBatchId(batches[0].id);
    }
  }, [batches, attBatchId]);

  // New student form state
  const [stName, setStName] = useState<string>('');
  const [stClass, setStClass] = useState<string>('Class 10');
  const [stBoard, setStBoard] = useState<IndianBoard>('Board level');
  const [stSchool, setStSchool] = useState<string>('');
  const [stPhone, setStPhone] = useState<string>('');
  const [stFather, setStFather] = useState<string>('');
  const [stBatchIds, setStBatchIds] = useState<string[]>(batches[0]?.id ? [batches[0].id] : []);

  // New batch form state
  const [batchName, setBatchName] = useState<string>('');
  const [batchSubject, setBatchSubject] = useState<string>('Mathematics');
  const [batchClassGrade, setBatchClassGrade] = useState<string>('Class 10');
  const [batchTeacherId, setBatchTeacherId] = useState<string>(teachers[0]?.id || '');
  const [batchRoom, setBatchRoom] = useState<string>('Room 1');
  const [batchTime, setBatchTime] = useState<string>('05:00 PM - 06:30 PM');
  const [batchFee, setBatchFee] = useState<number>(2000);

  // New Notice state
  const [noticeTitle, setNoticeTitle] = useState<string>('');
  const [noticeContent, setNoticeContent] = useState<string>('');
  const [noticeAudience, setNoticeAudience] = useState<'all' | 'parents' | 'students' | 'teachers'>('parents');

  // Center Fee Counter UPI Settings state
  const [upiSettingsId, setUpiSettingsId] = useState<string>(currentOrg?.upiId || '');
  const [upiMerchantName, setUpiMerchantName] = useState<string>(currentOrg?.upiMerchantName || currentOrg?.name || '');
  const [isSavingUpi, setIsSavingUpi] = useState<boolean>(false);
  const [upiSaveSuccess, setUpiSaveSuccess] = useState<boolean>(false);

  // Center Profile Settings state
  const [isEditingProfile, setIsEditingProfile] = useState<boolean>(false);
  const [profileName, setProfileName] = useState<string>(currentOrg?.name || '');
  const [profileTagline, setProfileTagline] = useState<string>(currentOrg?.tagline || '');
  const [profileOwnerName, setProfileOwnerName] = useState<string>(currentOrg?.ownerName || '');
  const [profilePhone, setProfilePhone] = useState<string>(currentOrg?.phone || '');
  const [profileEmail, setProfileEmail] = useState<string>(currentOrg?.email || '');
  const [profileAddress, setProfileAddress] = useState<string>(currentOrg?.address || '');
  const [profileCity, setProfileCity] = useState<string>(currentOrg?.city || '');
  const [profileState, setProfileState] = useState<string>(currentOrg?.state || '');
  const [profileLogoText, setProfileLogoText] = useState<string>(currentOrg?.logoText || '');
  const [isSavingProfile, setIsSavingProfile] = useState<boolean>(false);

  useEffect(() => {
    if (currentOrg) {
      setUpiSettingsId(currentOrg.upiId || '');
      setUpiMerchantName(currentOrg.upiMerchantName || currentOrg.name || '');
      setProfileName(currentOrg.name || '');
      setProfileTagline(currentOrg.tagline || '');
      setProfileOwnerName(currentOrg.ownerName || '');
      setProfilePhone(currentOrg.phone || '');
      setProfileEmail(currentOrg.email || '');
      setProfileAddress(currentOrg.address || '');
      setProfileCity(currentOrg.city || '');
      setProfileState(currentOrg.state || '');
      setProfileLogoText(currentOrg.logoText || '');
    }
  }, [currentOrg]);

  const handleCancelProfileEdit = () => {
    if (currentOrg) {
      setProfileName(currentOrg.name || '');
      setProfileTagline(currentOrg.tagline || '');
      setProfileOwnerName(currentOrg.ownerName || '');
      setProfilePhone(currentOrg.phone || '');
      setProfileEmail(currentOrg.email || '');
      setProfileAddress(currentOrg.address || '');
      setProfileCity(currentOrg.city || '');
      setProfileState(currentOrg.state || '');
      setProfileLogoText(currentOrg.logoText || '');
    }
    setIsEditingProfile(false);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = profileName.trim();
    const cleanOwner = profileOwnerName.trim();
    const cleanPhone = profilePhone.trim();

    if (!cleanName) {
      showToast('Please enter the institute display name', 'error');
      return;
    }
    if (!cleanOwner) {
      showToast('Please enter the director / center owner name', 'error');
      return;
    }
    if (!cleanPhone) {
      showToast('Please enter the contact phone / WhatsApp number', 'error');
      return;
    }

    setIsSavingProfile(true);
    updateOrganization(currentOrg.id, {
      name: cleanName,
      tagline: profileTagline.trim(),
      ownerName: cleanOwner,
      phone: cleanPhone,
      email: profileEmail.trim(),
      address: profileAddress.trim(),
      city: profileCity.trim(),
      state: profileState.trim(),
      logoText: (profileLogoText.trim() || cleanName.slice(0, 4)).toUpperCase()
    });

    setTimeout(() => {
      setIsSavingProfile(false);
      setIsEditingProfile(false);
      showToast('Coaching & Education Center profile updated successfully in Firestore!', 'success');
    }, 400);
  };

  const handleSaveUpiSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUpi = upiSettingsId.trim();
    if (!cleanUpi) {
      showToast('Please enter a valid UPI ID (e.g. coaching@okaxis or 9876543210@paytm)', 'error');
      return;
    }

    setIsSavingUpi(true);
    updateOrganization(currentOrg.id, {
      upiId: cleanUpi,
      upiMerchantName: upiMerchantName.trim() || currentOrg.name
    });

    setTimeout(() => {
      setIsSavingUpi(false);
      setUpiSaveSuccess(true);
      showToast('Center Fee Counter UPI ID updated successfully in Firestore!', 'success');
      setTimeout(() => setUpiSaveSuccess(false), 3000);
    }, 400);
  };

  // Calculations
  const totalStudents = students.length;
  const activeBatchesCount = batches.filter(b => b.status === 'active').length;
  const totalCollectedFees = invoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
  const totalNetFees = invoices.reduce((sum, inv) => sum + inv.netAmount, 0);
  const totalPendingFees = totalNetFees - totalCollectedFees;
  const pendingInvoicesCount = invoices.filter(i => i.status === 'pending' || i.status === 'partially_paid' || i.status === 'overdue').length;

  const todayAttendance = attendanceRecords.filter(a => a.date === '2026-09-28');
  const todayPresent = todayAttendance.filter(a => a.status === 'present' || a.status === 'late').length;
  const todayAttendancePct = todayAttendance.length > 0 ? Math.round((todayPresent / todayAttendance.length) * 100) : 0;

  const todayBatch = batches[0];
  const pendingInvoices = invoices.filter(i => i.status !== 'paid');
  const topDueInvoice = pendingInvoices[0];
  const topDueStudent = topDueInvoice ? students.find(s => s.id === topDueInvoice.studentId) : null;
  const lastPaidInvoice = invoices.find(i => i.payments && i.payments.length > 0) || invoices[0];

  // Filtered Students
  const filteredStudents = students.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.enrollmentNo.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.phone.includes(studentSearch);
    const matchesBatch = selectedBatchFilter === 'all' || s.batchIds.includes(selectedBatchFilter);
    return matchesSearch && matchesBatch;
  });

  const handleCreateStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stName.trim()) return;

    addStudent({
      branchId: currentOrg.branches[0]?.id || 'branch-1',
      rollNo: `10-${String(students.length + 1).padStart(2, '0')}`,
      name: stName,
      gender: 'Male',
      classGrade: stClass,
      board: stBoard,
      schoolName: stSchool,
      dateOfBirth: '2011-04-15',
      admissionDate: new Date().toISOString().split('T')[0],
      phone: stPhone,
      address: 'Dehradun City',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      batchIds: stBatchIds,
      guardian: {
        fatherName: stFather || `${stName}'s Father`,
        fatherPhone: stPhone,
        parentUserId: 'user-parent-rajesh'
      },
      status: 'active'
    });

    setShowAddStudentModal(false);
    setStName('');
    setStFather('');
  };

  const handleCreateBatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchName.trim()) return;

    addBatch({
      branchId: currentOrg.branches[0]?.id || 'branch-1',
      name: batchName,
      subject: batchSubject,
      classGrade: batchClassGrade,
      teacherId: batchTeacherId,
      classroom: batchRoom,
      scheduleDays: ['Mon', 'Wed', 'Fri'],
      timeSlot: batchTime,
      capacity: 30,
      studentIds: [],
      feeAmountMonthly: batchFee,
      academicYear: '2026-2027',
      status: 'active'
    });

    setShowAddBatchModal(false);
    setBatchName('');
  };

  const handleCreateTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherName.trim()) return;

    addTeacher({
      branchId: currentOrg.branches[0]?.id || 'branch-1',
      name: teacherName.trim(),
      phone: teacherPhone.trim() || '+91 98765 00000',
      email: teacherEmail.trim() || `${teacherName.toLowerCase().replace(/\s+/g, '.')}@${currentOrg.slug}.in`,
      qualification: teacherQualification.trim() || 'Graduate / Subject Specialist',
      subjects: teacherSubject.split(',').map(s => s.trim()).filter(Boolean),
      salary: teacherSalary || 35000,
      assignedBatchIds: batches[0]?.id ? [batches[0].id] : [],
      avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(teacherName)}`,
      status: 'active'
    });

    setShowAddTeacherModal(false);
    setTeacherName('');
    setTeacherEmail('');
    setTeacherPhone('');
    showToast(`Faculty ${teacherName} added successfully!`, 'success');
  };

  // Dynamic Academic & Center Analytics Calculations
  const avgTestScorePct = useMemo(() => {
    if (examResults.length === 0) return 0;
    const totalPct = examResults.reduce((acc, r) => acc + (r.percentage || 0), 0);
    return Math.round(totalPct / examResults.length);
  }, [examResults]);

  const feeRecoveryVelocityPct = useMemo(() => {
    if (invoices.length === 0 || totalNetFees === 0) return 0;
    return Math.round((totalCollectedFees / totalNetFees) * 100);
  }, [invoices, totalCollectedFees, totalNetFees]);

  const batchUtilizationPct = useMemo(() => {
    if (batches.length === 0) return 0;
    const totalMax = batches.reduce((acc, b) => acc + (b.capacity || 30), 0);
    const totalEnrolled = batches.reduce((acc, b) => acc + (b.studentIds?.length || 0), 0);
    return totalMax > 0 ? Math.round((totalEnrolled / totalMax) * 100) : 0;
  }, [batches]);

  const handleConfirmFeeCollection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoiceToCollect) return;

    recordPayment(selectedInvoiceToCollect, {
      amount: Number(collectAmount),
      paymentMethod: collectMethod,
      transactionRef: collectUtr || `OFFLINE/${Date.now().toString().slice(-6)}`
    });

    setShowCollectFeeModal(false);
    const inv = invoices.find(i => i.id === selectedInvoiceToCollect);
    if (inv) {
      setActiveReceiptInvoice(inv);
    }
  };

  const handleCreateNotice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noticeTitle.trim()) return;

    createAnnouncement({
      title: noticeTitle,
      content: noticeContent,
      targetAudience: noticeAudience,
      priority: 'normal',
      channel: ['in-app', 'whatsapp']
    });

    setShowNewNoticeModal(false);
    setNoticeTitle('');
    setNoticeContent('');
  };

  const handleSendWhatsAppFeeReminder = (inv: FeeInvoice) => {
    const student = students.find(s => s.id === inv.studentId);
    if (!student) return;
    const phone = student.guardian.fatherPhone || student.phone;
    const dueAmount = inv.netAmount - inv.paidAmount;
    const upiLink = `upi://pay?pa=${encodeURIComponent(currentOrg.upiId)}&pn=${encodeURIComponent(currentOrg.name)}&am=${dueAmount}&cu=INR&tn=${encodeURIComponent(`Coaching Fee ${student.name}`)}`;
    const msg = `*FEE REMINDER - ${currentOrg.name}*\n` +
      `Dear Parent of ${student.name},\n` +
      `This is a gentle reminder that coaching fees for *${inv.monthYear}* of *₹${(dueAmount ?? 0).toLocaleString('en-IN')}* is pending (Due Date: ${inv.dueDate}).\n\n` +
      `You can pay directly via UPI to: *${currentOrg.upiId}*\n` +
      `Or click here to pay: ${upiLink}\n\n` +
      `After payment, please reply with the screenshot or UTR.\n` +
      `Thank you,\n${currentOrg.name}`;

    setActiveWhatsappModal({
      title: `Send WhatsApp Fee Reminder to ${student.name}'s Parent`,
      phone,
      message: msg
    });
  };

  const handleSendAbsentWhatsApp = (batch: Batch, studentId: string) => {
    const student = students.find(s => s.id === studentId);
    if (!student) return;
    const phone = student.guardian.fatherPhone || student.phone;
    const msg = `*ATTENDANCE ALERT - ${currentOrg.name}*\n` +
      `Dear Parent,\n` +
      `Your ward *${student.name}* was marked *ABSENT* for ${batch.name} today.\n` +
      `Class timing: ${batch.timeSlot}.\n\n` +
      `If this was unplanned, please contact the institute office immediately at ${currentOrg.phone}.\n` +
      `- ${currentOrg.name}`;

    setActiveWhatsappModal({
      title: `Send Absent Alert to ${student.name}'s Parent`,
      phone,
      message: msg
    });
  };

  const currentMeta = MODULE_META[currentModule] || {
    label: currentModule.toUpperCase(),
    breadcrumb: currentModule,
    subtitle: 'Manage coaching center operations'
  };

  // Header primary actions
  const headerActions = (
    <div className="flex flex-wrap items-center gap-2">
      <ConsoleButton
        variant="primary"
        size="sm"
        icon={<Plus className="w-3.5 h-3.5" />}
        onClick={() => setShowAddStudentModal(true)}
      >
        + Add Student
      </ConsoleButton>

      <ConsoleButton
        variant="secondary"
        size="sm"
        icon={<CreditCard className="w-3.5 h-3.5 text-[#FFA000]" />}
        onClick={() => {
          if (invoices.length > 0) {
            setSelectedInvoiceToCollect(invoices[0].id);
            setShowCollectFeeModal(true);
          }
        }}
      >
        Record Fee
      </ConsoleButton>

      {invoices.some(i => i.status !== 'paid') && (
        <ConsoleButton
          variant="secondary"
          size="sm"
          icon={<QrCode className="w-3.5 h-3.5 text-[#188038] dark:text-[#81C995]" />}
          onClick={() => {
            const firstPending = invoices.find(i => i.status !== 'paid') || invoices[0];
            setActiveUpiModalInvoice(firstPending);
          }}
          title="Open Dynamic Desk Counter UPI QR Code"
        >
          Desk UPI QR
        </ConsoleButton>
      )}
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* 1. Google Cloud / Firebase Standard Page Header */}
      <PageHeader
        breadcrumbs={
          isStaff
            ? (currentModule === 'overview'
                ? [
                    { label: 'Front Desk' },
                    { label: currentOrg.name }
                  ]
                : [
                    {
                      label: 'Front Desk',
                      onClick: () => setCurrentModule('overview')
                    },
                    {
                      label: currentOrg.name,
                      onClick: () => setCurrentModule('overview')
                    },
                    { label: currentMeta.breadcrumb }
                  ])
            : (currentModule === 'overview'
                ? [
                    { label: 'Admin Console' },
                    { label: currentOrg.name }
                  ]
                : [
                    {
                      label: 'Admin Console',
                      onClick: () => setCurrentModule('overview')
                    },
                    {
                      label: currentOrg.name,
                      onClick: () => setCurrentModule('overview')
                    },
                    { label: currentMeta.breadcrumb }
                  ])
        }
        onBack={currentModule !== 'overview' ? () => setCurrentModule('overview') : undefined}
        title={currentModule === 'overview' ? currentOrg.name : currentMeta.label}
        subtitle={isStaff && currentModule === 'overview' ? `Front Desk & Operations Desk · ${currentOrg.name}` : currentMeta.subtitle}
        badge={
          isStaff ? (
            <StatusChip
              label="FRONT DESK COUNTER"
              variant="info"
              size="xs"
            />
          ) : (
            <StatusChip
              label={`${currentOrg.planId === 'starter' ? 'STARTER BATCH' : currentOrg.planId === 'growth' ? 'GROWTH ACADEMY' : 'MULTI-BRANCH PRO'} · ${currentOrg.city}, ${currentOrg.state}`}
              variant="warning"
              size="xs"
            />
          )
        }
        actions={headerActions}
      />

      {/* Access Restriction Screen for Front Desk Staff */}
      {isStaff && STAFF_RESTRICTED_MODULES.includes(currentModule) && (
        <ConsoleCard
          title="Administrative Section Restricted"
          subtitle="This section contains sensitive administrative controls and financial analytics reserved exclusively for the Center Director."
          icon={<ShieldAlert className="w-5 h-5 text-rose-500" />}
        >
          <div className="py-12 text-center space-y-4 max-w-md mx-auto">
            <div className="w-16 h-16 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <div>
              <h3 className="font-bold text-base text-[#202124] dark:text-[#E8EAED]">
                Front Desk Counter Permission Limit
              </h3>
              <p className="text-xs text-[#5F6368] dark:text-[#9AA0A6] mt-1.5 leading-relaxed">
                As a front desk coordinator, your profile is authorized for student admissions, daily batch attendance, fee counter receipts, and parent communication. Faculty salaries, institute P&amp;L analytics, and system settings require Center Director credentials.
              </p>
            </div>
            <div className="flex justify-center gap-3 pt-3">
              <ConsoleButton
                variant="primary"
                size="sm"
                onClick={() => setCurrentModule('overview')}
              >
                Return to Front Desk Overview
              </ConsoleButton>
              <ConsoleButton
                variant="secondary"
                size="sm"
                onClick={() => setCurrentModule('fees')}
              >
                Go to Fee Counter
              </ConsoleButton>
            </div>
          </div>
        </ConsoleCard>
      )}

      {/* 2. OVERVIEW MODULE */}
      {currentModule === 'overview' && (
        <div className="space-y-6">
          {/* Operational Hub: Aaj Ka Kaam (Google Cloud Operational Banner) */}
          <div className="bg-white dark:bg-[#1E1F20] border-l-4 border-l-[#FFA000] border border-[#DADCE0] dark:border-[#3C4043] rounded-xl p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-[#FFA000]/15 text-[#FFA000] dark:text-[#FFCA28] flex items-center justify-center flex-shrink-0">
                  <Zap className="w-4 h-4 fill-current stroke-[2.5]" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="font-google-sans font-bold text-sm sm:text-base text-[#202124] dark:text-[#E8EAED]">
                      Daily Action Center · Aaj Ka Kaam
                    </h3>
                    <StatusChip label="PRIORITY" variant="warning" size="xs" />
                  </div>
                  <p className="text-xs text-[#5F6368] dark:text-[#9AA0A6]">
                    Immediate attendance and pending fee recoveries for {currentOrg.name}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2 text-xs font-mono text-[#5F6368] dark:text-[#9AA0A6] self-start sm:self-auto bg-[#F8F9FA] dark:bg-[#282A2C] px-2.5 py-1 rounded-lg border border-[#DADCE0] dark:border-[#3C4043]">
                <span className="w-2 h-2 rounded-full bg-[#188038] animate-pulse"></span>
                <span>UPI: <strong className="text-[#202124] dark:text-white">{currentOrg.upiId}</strong></span>
              </div>
            </div>

            {/* Sub-actions Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
              {/* Batch Attendance Action */}
              <div className="bg-[#F8F9FA] dark:bg-[#282A2C] p-4 rounded-xl border border-[#DADCE0] dark:border-[#3C4043] flex flex-col justify-between space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#188038] dark:text-[#81C995]">
                      Batch Attendance Roster
                    </span>
                    <h4 className="font-bold font-google-sans text-sm text-[#202124] dark:text-[#E8EAED] mt-0.5">
                      {todayBatch ? todayBatch.name : 'No batches created yet'}
                    </h4>
                    <p className="text-xs text-[#5F6368] dark:text-[#9AA0A6]">
                      {todayBatch
                        ? `${todayBatch.timeSlot} · ${todayBatch.studentIds.length} students enrolled`
                        : 'Set up batches to schedule rosters and track attendance.'}
                    </p>
                  </div>
                  <Clock className="w-4 h-4 text-[#5F6368] dark:text-[#9AA0A6]" />
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#DADCE0]/60 dark:border-[#3C4043]/60">
                  {todayBatch ? (
                    <>
                      <ConsoleButton
                        variant="blue"
                        size="sm"
                        icon={<CheckCircle className="w-3.5 h-3.5" />}
                        onClick={() => markBatchAllPresent(todayBatch.id, attDate)}
                      >
                        1-Tap Mark All Present
                      </ConsoleButton>

                      {todayBatch.studentIds.length > 0 && (
                        <ConsoleButton
                          variant="secondary"
                          size="sm"
                          icon={<MessageSquare className="w-3.5 h-3.5 text-[#188038]" />}
                          onClick={() => handleSendAbsentWhatsApp(todayBatch, todayBatch.studentIds[0])}
                        >
                          Absent WhatsApp Alert
                        </ConsoleButton>
                      )}
                    </>
                  ) : (
                    <ConsoleButton
                      variant="primary"
                      size="sm"
                      icon={<Plus className="w-3.5 h-3.5" />}
                      onClick={() => setShowAddBatchModal(true)}
                    >
                      + Create First Batch
                    </ConsoleButton>
                  )}
                </div>
              </div>

              {/* Overdue Fee Collection Action */}
              <div className="bg-[#F8F9FA] dark:bg-[#282A2C] p-4 rounded-xl border border-[#DADCE0] dark:border-[#3C4043] flex flex-col justify-between space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#B06000] dark:text-[#FDD663]">
                      Monthly Fee Recovery
                    </span>
                    <h4 className="font-bold font-google-sans text-sm text-[#202124] dark:text-[#E8EAED] mt-0.5">
                      {topDueStudent && topDueInvoice
                        ? `${topDueStudent.name} (Due: ₹${(((topDueInvoice.netAmount ?? 0) - (topDueInvoice.paidAmount ?? 0))).toLocaleString('en-IN')})`
                        : students.length === 0
                        ? 'No students enrolled yet'
                        : pendingInvoices.length === 0
                        ? 'All Monthly Dues Cleared'
                        : 'No pending fee recoveries'}
                    </h4>
                    <p className="text-xs text-[#5F6368] dark:text-[#9AA0A6]">
                      {students.length === 0
                        ? 'Enroll students to issue digital UPI fee invoices.'
                        : `${pendingInvoices.length} parents with unpaid fee balances`}
                    </p>
                  </div>
                  <CreditCard className="w-4 h-4 text-[#FFA000]" />
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#DADCE0]/60 dark:border-[#3C4043]/60">
                  {topDueInvoice ? (
                    <>
                      <ConsoleButton
                        variant="primary"
                        size="sm"
                        icon={<MessageSquare className="w-3.5 h-3.5" />}
                        onClick={() => handleSendWhatsAppFeeReminder(topDueInvoice)}
                      >
                        WhatsApp UPI Link
                      </ConsoleButton>

                      <ConsoleButton
                        variant="secondary"
                        size="sm"
                        icon={<QrCode className="w-3.5 h-3.5 text-[#188038]" />}
                        onClick={() => setActiveUpiModalInvoice(topDueInvoice)}
                      >
                        Desk QR
                      </ConsoleButton>

                      {lastPaidInvoice && (
                        <ConsoleButton
                          variant="ghost"
                          size="sm"
                          icon={<Printer className="w-3.5 h-3.5" />}
                          onClick={() => setActiveReceiptInvoice(lastPaidInvoice)}
                        >
                          Print Receipt
                        </ConsoleButton>
                      )}
                    </>
                  ) : students.length === 0 ? (
                    <ConsoleButton
                      variant="primary"
                      size="sm"
                      icon={<Plus className="w-3.5 h-3.5" />}
                      onClick={() => setShowAddStudentModal(true)}
                    >
                      + Enroll First Student
                    </ConsoleButton>
                  ) : (
                    <ConsoleButton
                      variant="secondary"
                      size="sm"
                      icon={<CreditCard className="w-3.5 h-3.5" />}
                      onClick={() => setShowCollectFeeModal(true)}
                    >
                      Record Fee
                    </ConsoleButton>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 3 Summary Metrics: Built with MetricCard Primitive */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <MetricCard
              label="Enrolled Students"
              value={(totalStudents ?? 0).toLocaleString('en-IN')}
              subtext={`Across ${activeBatchesCount} active coaching batches`}
              accentColor="#1A73E8"
              icon={<Users className="w-4 h-4" />}
              actionText="Manage student directory"
              onClick={() => setCurrentModule('students')}
            />

            <MetricCard
              label="Today's Attendance"
              value={todayAttendance.length > 0 ? `${todayAttendancePct}%` : '0%'}
              subtext={todayAttendance.length > 0 ? `${todayPresent} present out of scheduled students` : 'No attendance recorded today'}
              trend={todayAttendance.length > 0 ? { value: '↑ 3.2% this month', isPositive: true } : undefined}
              accentColor="#188038"
              icon={<CalendarCheck className="w-4 h-4" />}
              actionText={batches.length > 0 ? "Open attendance register" : "Create batch first"}
              onClick={() => setCurrentModule('attendance')}
            />

            <MetricCard
              label="Pending Fee Dues"
              value={`₹${(totalPendingFees ?? 0).toLocaleString('en-IN')}`}
              subtext={`${pendingInvoicesCount} pending collections`}
              accentColor="#FFA000"
              icon={<CreditCard className="w-4 h-4" />}
              actionText="Review & collect invoices"
              onClick={() => setCurrentModule('fees')}
            />
          </div>

          {/* Two-Column Information Dense Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 7 Cols: Today's Schedule & Attendance Consistency */}
            <div className="lg:col-span-7 space-y-6">
              {/* Today's Schedule */}
              <ConsoleCard
                title="Today's Schedule"
                subtitle="Classes scheduled for this evening"
                icon={<Clock className="w-4 h-4" />}
                action={
                  <button
                    onClick={() => setCurrentModule('timetable')}
                    className="text-xs text-[#1A73E8] dark:text-[#8AB4F8] hover:underline font-medium cursor-pointer"
                  >
                    View Timetable →
                  </button>
                }
              >
                {batches.length === 0 ? (
                  <div className="py-8 text-center text-xs text-[#5F6368] dark:text-[#9AA0A6] space-y-2">
                    <p className="font-semibold text-[#202124] dark:text-[#E8EAED]">No classes scheduled yet</p>
                    <p>Create batches with time slots to populate your daily schedule.</p>
                    <ConsoleButton
                      variant="primary"
                      size="xs"
                      icon={<Plus className="w-3.5 h-3.5" />}
                      onClick={() => setShowAddBatchModal(true)}
                    >
                      + Create Batch
                    </ConsoleButton>
                  </div>
                ) : (
                  <div className="divide-y divide-[#DADCE0]/60 dark:divide-[#3C4043]">
                    {batches.slice(0, 4).map(b => {
                      const faculty = teachers.find(t => t.id === b.teacherId);
                      return (
                        <div key={b.id} className="py-3 flex items-center justify-between text-xs gap-3">
                          <div className="flex items-center space-x-3 min-w-0">
                            <span className="px-2 py-1 rounded bg-[#E8F0FE] dark:bg-[#1E3A5F] text-[#1A73E8] dark:text-[#8AB4F8] font-mono font-semibold text-[11px] whitespace-nowrap">
                              {b.timeSlot.split(' - ')[0] || '5:00 PM'}
                            </span>
                            <div className="truncate">
                              <div className="font-semibold text-sm text-[#202124] dark:text-[#E8EAED] truncate">
                                {b.name}
                              </div>
                              <div className="text-[12px] text-[#5F6368] dark:text-[#9AA0A6] mt-0.5 truncate">
                                {b.subject} · {b.classGrade} · {b.classroom} · {faculty?.name || 'Faculty'}
                              </div>
                            </div>
                          </div>

                          <ConsoleButton
                            variant="secondary"
                            size="xs"
                            onClick={() => {
                              setAttBatchId(b.id);
                              setCurrentModule('attendance');
                            }}
                          >
                            Attendance
                          </ConsoleButton>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ConsoleCard>

              {/* Attendance Trend */}
              <ConsoleCard
                title="Attendance Consistency"
                subtitle="Weekly center attendance performance"
                icon={<Calendar className="w-4 h-4" />}
                action={
                  attendanceRecords.length > 0 ? (
                    <StatusChip label="↑ 3.2% this month" variant="success" size="xs" />
                  ) : (
                    <StatusChip label="NO RECORDS" variant="neutral" size="xs" />
                  )
                }
              >
                {attendanceRecords.length === 0 ? (
                  <div className="py-8 text-center text-xs text-[#5F6368] dark:text-[#9AA0A6] space-y-1">
                    <p className="font-semibold text-[#202124] dark:text-[#E8EAED]">No weekly attendance recorded yet</p>
                    <p>Mark attendance for active batches to unlock weekly consistency analytics.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-6 gap-2 pt-2">
                    {[
                      { day: 'Mon', pct: 94 },
                      { day: 'Tue', pct: 91 },
                      { day: 'Wed', pct: 89 },
                      { day: 'Thu', pct: 95 },
                      { day: 'Fri', pct: 92 },
                      { day: 'Sat', pct: 88 }
                    ].map(item => (
                      <div key={item.day} className="flex flex-col items-center space-y-2">
                        <span className="text-[11px] font-mono font-semibold text-[#5F6368] dark:text-[#9AA0A6]">
                          {item.pct}%
                        </span>
                        <div className="w-full h-24 bg-[#F1F3F4] dark:bg-[#282A2C] rounded-lg flex items-end p-1 border border-[#DADCE0] dark:border-[#3C4043]">
                          <div
                            className="w-full bg-[#188038] dark:bg-[#81C995] rounded-md transition-all duration-300"
                            style={{ height: `${item.pct}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-medium text-[#202124] dark:text-[#E8EAED]">
                          {item.day}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </ConsoleCard>
            </div>

            {/* Right 5 Cols: Pending Fees Recovery & Announcements */}
            <div className="lg:col-span-5 space-y-6">
              {/* Pending Invoices */}
              <ConsoleCard
                title="Pending Fees"
                subtitle="Immediate fee recovery"
                icon={<DollarSign className="w-4 h-4" />}
                action={
                  <button
                    onClick={() => setCurrentModule('fees')}
                    className="text-xs text-[#1A73E8] dark:text-[#8AB4F8] hover:underline font-medium cursor-pointer"
                  >
                    View All →
                  </button>
                }
              >
                {invoices.filter(i => i.status !== 'paid').length === 0 ? (
                  <div className="py-6 text-center space-y-2">
                    <CheckCircle className="w-8 h-8 text-[#188038] dark:text-[#81C995] mx-auto opacity-80" />
                    <p className="text-xs font-medium text-[#202124] dark:text-[#E8EAED]">
                      {invoices.length === 0 ? 'No fee dues recorded yet' : 'All dues cleared! No pending fee invoices.'}
                    </p>
                    <p className="text-[11px] text-[#5F6368] dark:text-[#9AA0A6] max-w-xs mx-auto">
                      {invoices.length === 0 ? 'Generate student fee invoices from Fee Manager to track receipts.' : '100% of issued course fee invoices are paid.'}
                    </p>
                    {invoices.length === 0 && (
                      <div className="pt-1">
                        <ConsoleButton
                          variant="secondary"
                          size="xs"
                          onClick={() => setCurrentModule('fees')}
                        >
                          + Go to Fee Manager
                        </ConsoleButton>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="divide-y divide-[#DADCE0]/60 dark:divide-[#3C4043]">
                    {invoices
                      .filter(i => i.status !== 'paid')
                      .slice(0, 4)
                      .map(inv => {
                        const student = students.find(s => s.id === inv.studentId);
                        const due = inv.netAmount - inv.paidAmount;

                        return (
                          <div key={inv.id} className="py-3 flex items-center justify-between text-xs gap-2">
                            <div className="min-w-0">
                              <div className="font-semibold text-sm text-[#202124] dark:text-[#E8EAED] truncate">
                                {student?.name || 'Student'}
                              </div>
                              <div className="text-[11px] text-[#5F6368] dark:text-[#9AA0A6]">
                                {inv.monthYear} · Due: {inv.dueDate}
                              </div>
                            </div>

                            <div className="flex items-center space-x-1.5 flex-shrink-0">
                              <span className="font-bold text-xs text-[#D93025] dark:text-[#F28B82] mr-1">
                                ₹{(due ?? 0).toLocaleString('en-IN')}
                              </span>
                              <ConsoleButton
                                variant="secondary"
                                size="xs"
                                icon={<QrCode className="w-3 h-3 text-[#188038]" />}
                                onClick={() => setActiveUpiModalInvoice(inv)}
                                title="Instant UPI QR"
                              />
                              <ConsoleButton
                                variant="secondary"
                                size="xs"
                                onClick={() => {
                                  const fatherPhone = student?.guardian.fatherPhone || student?.phone || '';
                                  setActiveWhatsappModal({
                                    title: `Fee Due Reminder for ${student?.name}`,
                                    phone: fatherPhone,
                                    message: `Dear Parent, gentle reminder that monthly coaching fee of ₹${(due ?? 0).toLocaleString('en-IN')} for ${student?.name} is due on ${inv.dueDate} at ${currentOrg.name}. You can pay directly via UPI ID: ${currentOrg.upiId}.`
                                  });
                                }}
                              >
                                WhatsApp
                              </ConsoleButton>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </ConsoleCard>

              {/* Announcements */}
              <ConsoleCard
                title="Recent Announcements"
                subtitle="Broadcast notices to faculty and parents"
                icon={<Megaphone className="w-4 h-4" />}
                action={
                  <button
                    onClick={() => setShowNewNoticeModal(true)}
                    className="text-xs text-[#1A73E8] dark:text-[#8AB4F8] hover:underline font-medium cursor-pointer"
                  >
                    + Broadcast
                  </button>
                }
              >
                {announcements.length === 0 ? (
                  <div className="py-6 text-center space-y-2">
                    <Megaphone className="w-8 h-8 text-[#5F6368] dark:text-[#9AA0A6] mx-auto opacity-40" />
                    <p className="text-xs font-medium text-[#202124] dark:text-[#E8EAED]">
                      No announcements broadcast yet
                    </p>
                    <p className="text-[11px] text-[#5F6368] dark:text-[#9AA0A6] max-w-xs mx-auto">
                      Send urgent circulars, exam dates, and holiday updates to students and parents.
                    </p>
                    <div className="pt-1">
                      <ConsoleButton
                        variant="secondary"
                        size="xs"
                        onClick={() => setShowNewNoticeModal(true)}
                      >
                        + Post First Announcement
                      </ConsoleButton>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {announcements.slice(0, 2).map(ann => (
                      <div
                        key={ann.id}
                        className="p-3 rounded-lg border border-[#DADCE0] dark:border-[#3C4043] bg-[#F8F9FA] dark:bg-[#282A2C] space-y-1 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-[#202124] dark:text-[#E8EAED]">
                            {ann.title}
                          </span>
                          <span className="text-[10px] text-[#5F6368] dark:text-[#9AA0A6]">
                            {ann.createdAt.split('T')[0]}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#5F6368] dark:text-[#9AA0A6] line-clamp-2">
                          {ann.content}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </ConsoleCard>
            </div>
          </div>
        </div>
      )}

      {/* 3. STUDENTS DIRECTORY */}
      {currentModule === 'students' && (
        <DataTable
          columns={[
            {
              key: 'student',
              header: 'Student & Roll No',
              sortable: true,
              render: (s) => (
                <div className="flex items-center space-x-2.5">
                  <img
                    src={s.avatar}
                    alt={s.name}
                    className="w-8 h-8 rounded-full object-cover border border-[#DADCE0] dark:border-[#3C4043]"
                  />
                  <div>
                    <div className="font-bold text-[#202124] dark:text-[#E8EAED] text-sm">{s.name}</div>
                    <div className="text-[10px] text-[#5F6368] dark:text-[#9AA0A6]">
                      Roll: {s.rollNo} · <span className="font-mono">{s.enrollmentNo}</span>
                    </div>
                  </div>
                </div>
              )
            },
            {
              key: 'classGrade',
              header: 'Class & Board',
              sortable: true,
              render: (s) => (
                <div>
                  <div className="font-semibold text-[#202124] dark:text-[#E8EAED]">{s.classGrade}</div>
                  <div className="text-[10px] text-[#1A73E8] dark:text-[#8AB4F8] font-medium">{s.board} · {s.schoolName}</div>
                </div>
              )
            },
            {
              key: 'guardian',
              header: 'Parent / Contact',
              render: (s) => (
                <div>
                  <div className="font-medium text-[#202124] dark:text-[#E8EAED]">{s.guardian.fatherName}</div>
                  <div className="text-[10px] font-mono text-[#5F6368] dark:text-[#9AA0A6]">{s.guardian.fatherPhone}</div>
                </div>
              )
            },
            {
              key: 'batchIds',
              header: 'Batches',
              render: (s) => (
                <div className="flex flex-wrap gap-1">
                  {s.batchIds.map(bid => {
                    const b = batches.find(x => x.id === bid);
                    return (
                      <span
                        key={bid}
                        className="text-[10px] bg-[#E8F0FE] dark:bg-[#1E3A5F] text-[#1A73E8] dark:text-[#8AB4F8] px-2 py-0.5 rounded font-medium"
                      >
                        {b?.name.split('-')[0] || 'Batch'}
                      </span>
                    );
                  })}
                </div>
              )
            },
            {
              key: 'attendanceRate',
              header: 'Attendance',
              sortable: true,
              render: (s) => {
                const sAtt = attendanceRecords.filter(a => a.studentId === s.id);
                const pCount = sAtt.filter(a => a.status === 'present').length;
                const rate = sAtt.length > 0 ? Math.round((pCount / sAtt.length) * 100) : 90;
                return (
                  <StatusChip
                    label={`${rate}%`}
                    variant={rate >= 80 ? 'success' : 'warning'}
                    size="xs"
                  />
                );
              }
            },
            {
              key: 'actions',
              header: '',
              align: 'right',
              render: (s) => (
                <div className="flex items-center justify-end space-x-1.5">
                  <ConsoleButton
                    variant="secondary"
                    size="xs"
                    icon={<UserCheck className="w-3 h-3 text-[#1A73E8]" />}
                    onClick={() => {
                      const studentUser: User = {
                        id: s.id,
                        name: s.name,
                        email: s.email || '',
                        phone: s.phone,
                        avatar: s.avatar,
                        role: 'STUDENT',
                        orgId: currentOrg.id,
                        schoolName: s.schoolName,
                        classGrade: s.classGrade,
                        rollNo: s.rollNo,
                        address: s.address,
                        emergencyContact: s.guardian.fatherPhone || s.phone,
                        bloodGroup: s.bloodGroup,
                        dateOfBirth: s.dateOfBirth
                      };
                      setEditingPerson(studentUser);
                    }}
                  >
                    Edit Profile
                  </ConsoleButton>
                  <ConsoleButton
                    variant="secondary"
                    size="xs"
                    icon={<Share2 className="w-3 h-3 text-[#188038]" />}
                    onClick={() => {
                      const fatherPhone = s.guardian.fatherPhone || s.phone;
                      setActiveWhatsappModal({
                        title: `WhatsApp Message to ${s.name}'s Parent`,
                        phone: fatherPhone,
                        message: `Namaste Shri ${s.guardian.fatherName}, this is from ${currentOrg.name} regarding ${s.name}'s academic progress.`
                      });
                    }}
                  >
                    WhatsApp
                  </ConsoleButton>
                </div>
              )
            }
          ]}
          data={filteredStudents}
          keyExtractor={(s) => s.id}
          searchPlaceholder="Filter students by name, roll no, phone..."
          onSearchChange={setStudentSearch}
          filterComponent={
            <select
              value={selectedBatchFilter}
              onChange={e => setSelectedBatchFilter(e.target.value)}
              className="text-xs px-2.5 py-1.5 border border-[#DADCE0] dark:border-[#3C4043] rounded-lg bg-[#F1F3F4] dark:bg-[#282A2C] text-[#202124] dark:text-[#E8EAED] font-medium focus:outline-none"
            >
              <option value="all">All Batches</option>
              {batches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          }
          toolbarActions={
            <div className="flex items-center gap-2">
              <ConsoleButton
                variant="secondary"
                size="sm"
                icon={<Upload className="w-3.5 h-3.5 text-[#188038]" />}
                onClick={() => setShowBulkImportModal(true)}
              >
                Bulk CSV / Excel Import
              </ConsoleButton>
              <ConsoleButton
                variant="primary"
                size="sm"
                icon={<Plus className="w-3.5 h-3.5" />}
                onClick={() => setShowAddStudentModal(true)}
              >
                Admit New Student
              </ConsoleButton>
            </div>
          }
        />
      )}

      {/* 4. BATCHES MANAGEMENT */}
      {currentModule === 'batches' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold font-google-sans text-[#202124] dark:text-[#E8EAED]">
                Coaching Batches & Classrooms
              </h2>
              <p className="text-xs text-[#5F6368] dark:text-[#9AA0A6]">
                Configure schedules, faculties, capacity constraints and monthly fees
              </p>
            </div>
            <ConsoleButton
              variant="primary"
              size="sm"
              icon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => setShowAddBatchModal(true)}
            >
              Create New Batch
            </ConsoleButton>
          </div>

          {batches.length === 0 ? (
            <div className="py-16 text-center space-y-3 bg-white dark:bg-[#1E1F20] rounded-xl border border-[#DADCE0] dark:border-[#3C4043]">
              <Calendar className="w-10 h-10 text-[#5F6368] dark:text-[#9AA0A6] mx-auto opacity-40" />
              <h3 className="text-sm font-semibold text-[#202124] dark:text-[#E8EAED]">
                No coaching batches created yet
              </h3>
              <p className="text-xs text-[#5F6368] dark:text-[#9AA0A6] max-w-sm mx-auto">
                Set up your first class batch with schedule timings, faculty assignment, and monthly course fee.
              </p>
              <div className="pt-2">
                <ConsoleButton
                  variant="primary"
                  size="sm"
                  icon={<Plus className="w-3.5 h-3.5" />}
                  onClick={() => setShowAddBatchModal(true)}
                >
                  Create First Batch
                </ConsoleButton>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {batches.map(batch => {
                const faculty = teachers.find(t => t.id === batch.teacherId);
                const capacityPct = Math.round(((batch.studentIds?.length || 0) / (batch.capacity || 1)) * 100);

                return (
                  <ConsoleCard
                    key={batch.id}
                    title={batch.name}
                    subtitle={batch.subject}
                    action={
                      <span className="text-xs font-mono font-bold text-[#202124] dark:text-white">
                        ₹{(batch.feeAmountMonthly ?? 0).toLocaleString('en-IN')}/mo
                      </span>
                    }
                  >
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <StatusChip label={batch.classGrade} variant="neutral" size="xs" />
                        <span className="text-xs text-[#5F6368] dark:text-[#9AA0A6]">
                          {batch.classroom}
                        </span>
                      </div>

                      <div className="text-xs space-y-1 text-[#5F6368] dark:text-[#9AA0A6] border-t border-[#DADCE0]/60 dark:border-[#3C4043] pt-2">
                        <div>Faculty: <strong className="text-[#202124] dark:text-white">{faculty?.name || 'Assigned Faculty'}</strong></div>
                        <div>Schedule: <strong className="text-[#202124] dark:text-white">{(batch.scheduleDays || []).join(', ')} · {batch.timeSlot || 'TBD'}</strong></div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between text-xs font-medium text-[#5F6368] dark:text-[#9AA0A6] mb-1">
                          <span>Seat Capacity</span>
                          <span className="font-mono">{batch.studentIds?.length || 0} / {batch.capacity || 0}</span>
                        </div>
                        <div className="w-full h-1.5 bg-[#F1F3F4] dark:bg-[#282A2C] rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${capacityPct > 80 ? 'bg-[#FFA000]' : 'bg-[#1A73E8]'}`}
                            style={{ width: `${capacityPct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </ConsoleCard>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 5. DAILY ATTENDANCE */}
      {currentModule === 'attendance' && (
        <ConsoleCard
          title="Daily Attendance Register"
          subtitle="Mark presence, late arrivals and dispatch automated WhatsApp alerts to parents"
          action={
            batches.length > 0 ? (
              <div className="flex items-center space-x-2">
                <select
                  value={attBatchId}
                  onChange={e => setAttBatchId(e.target.value)}
                  className="bg-[#F1F3F4] dark:bg-[#282A2C] border border-[#DADCE0] dark:border-[#3C4043] rounded-lg px-2.5 py-1.5 text-xs font-medium text-[#202124] dark:text-[#E8EAED]"
                >
                  {batches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
                <input
                  type="date"
                  value={attDate}
                  onChange={e => setAttDate(e.target.value)}
                  className="bg-[#F1F3F4] dark:bg-[#282A2C] border border-[#DADCE0] dark:border-[#3C4043] rounded-lg px-2 py-1 text-xs text-[#202124] dark:text-[#E8EAED]"
                />
                <ConsoleButton
                  variant="blue"
                  size="xs"
                  icon={<CheckCircle className="w-3.5 h-3.5" />}
                  onClick={() => markBatchAllPresent(attBatchId, attDate)}
                >
                  Mark All Present
                </ConsoleButton>
              </div>
            ) : undefined
          }
        >
          {batches.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <CalendarCheck className="w-10 h-10 text-[#5F6368] dark:text-[#9AA0A6] mx-auto opacity-40" />
              <p className="text-sm font-semibold text-[#202124] dark:text-[#E8EAED]">
                No batches configured
              </p>
              <p className="text-xs text-[#5F6368] dark:text-[#9AA0A6] max-w-sm mx-auto">
                Create a batch and enroll students to start tracking attendance and sending parent WhatsApp alerts.
              </p>
              <div className="pt-2">
                <ConsoleButton
                  variant="primary"
                  size="sm"
                  icon={<Plus className="w-3.5 h-3.5" />}
                  onClick={() => setShowAddBatchModal(true)}
                >
                  Create First Batch
                </ConsoleButton>
              </div>
            </div>
          ) : students.filter(s => {
              const b = batches.find(x => x.id === attBatchId);
              return b?.studentIds.includes(s.id);
            }).length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <Users className="w-10 h-10 text-[#5F6368] dark:text-[#9AA0A6] mx-auto opacity-40" />
              <p className="text-sm font-semibold text-[#202124] dark:text-[#E8EAED]">
                No students enrolled in this batch
              </p>
              <p className="text-xs text-[#5F6368] dark:text-[#9AA0A6] max-w-sm mx-auto">
                Admit students and allocate them to this batch to mark daily attendance.
              </p>
              <div className="pt-2">
                <ConsoleButton
                  variant="primary"
                  size="sm"
                  icon={<Plus className="w-3.5 h-3.5" />}
                  onClick={() => setShowAddStudentModal(true)}
                >
                  Admit Student
                </ConsoleButton>
              </div>
            </div>
          ) : (
          <div className="divide-y divide-[#DADCE0]/60 dark:divide-[#3C4043]">
            {students
              .filter(s => {
                const b = batches.find(x => x.id === attBatchId);
                return b?.studentIds.includes(s.id);
              })
              .map(student => {
                const rec = attendanceRecords.find(
                  a => a.batchId === attBatchId && a.studentId === student.id && a.date === attDate
                );
                const currentStatus = rec?.status || 'present';

                return (
                  <div key={student.id} className="py-3 flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-3">
                      <img
                        src={student.avatar}
                        alt={student.name}
                        className="w-8 h-8 rounded-full object-cover border border-[#DADCE0] dark:border-[#3C4043]"
                      />
                      <div>
                        <div className="font-bold text-[#202124] dark:text-[#E8EAED] text-sm">{student.name}</div>
                        <div className="text-[11px] text-[#5F6368] dark:text-[#9AA0A6]">
                          Roll: {student.rollNo} · Parent: {student.guardian.fatherPhone}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1">
                      {[
                        { status: 'present', label: 'Present', activeBg: 'bg-[#188038] text-white' },
                        { status: 'absent', label: 'Absent', activeBg: 'bg-[#D93025] text-white' },
                        { status: 'late', label: 'Late', activeBg: 'bg-[#FFA000] text-white' }
                      ].map(btn => (
                        <button
                          key={btn.status}
                          onClick={() => {
                            markAttendance({
                              batchId: attBatchId,
                              studentId: student.id,
                              date: attDate,
                              status: btn.status as any
                            });
                          }}
                          className={`px-3 py-1 rounded text-xs font-medium transition cursor-pointer ${
                            currentStatus === btn.status
                              ? btn.activeBg
                              : 'bg-[#F1F3F4] dark:bg-[#282A2C] text-[#5F6368] dark:text-[#9AA0A6] hover:bg-[#E8EAED] dark:hover:bg-[#3C4043]'
                          }`}
                        >
                          {btn.label}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
          </div>
        )}
        </ConsoleCard>
      )}

      {/* 6. FEE & PAYMENT MANAGEMENT */}
      {currentModule === 'fees' && (
        <DataTable
          columns={[
            {
              key: 'invoiceNo',
              header: 'Invoice & Month',
              sortable: true,
              render: (inv) => (
                <div>
                  <div className="font-bold text-[#202124] dark:text-[#E8EAED]">{inv.monthYear}</div>
                  <div className="text-[10px] font-mono text-[#5F6368] dark:text-[#9AA0A6]">{inv.invoiceNo}</div>
                </div>
              )
            },
            {
              key: 'student',
              header: 'Student',
              render: (inv) => {
                const student = students.find(s => s.id === inv.studentId);
                return (
                  <div>
                    <div className="font-semibold text-[#202124] dark:text-[#E8EAED]">{student?.name}</div>
                    <div className="text-[10px] text-[#5F6368] dark:text-[#9AA0A6]">{student?.classGrade}</div>
                  </div>
                );
              }
            },
            {
              key: 'netAmount',
              header: 'Net Fee',
              sortable: true,
              render: (inv) => (
                <span className="font-mono font-bold text-[#202124] dark:text-white">
                  ₹{(inv.netAmount ?? 0).toLocaleString('en-IN')}
                </span>
              )
            },
            {
              key: 'paidAmount',
              header: 'Paid Amount',
              sortable: true,
              render: (inv) => (
                <span className="font-mono font-bold text-[#188038] dark:text-[#81C995]">
                  ₹{(inv.paidAmount ?? 0).toLocaleString('en-IN')}
                </span>
              )
            },
            {
              key: 'dueDate',
              header: 'Due Date',
              render: (inv) => <span className="text-[#5F6368] dark:text-[#9AA0A6]">{inv.dueDate}</span>
            },
            {
              key: 'status',
              header: 'Status',
              sortable: true,
              render: (inv) => (
                <StatusChip
                  label={inv.status.replace('_', ' ')}
                  variant={inv.status === 'paid' ? 'success' : inv.status === 'overdue' ? 'error' : 'warning'}
                  size="xs"
                />
              )
            },
            {
              key: 'actions',
              header: '',
              align: 'right',
              render: (inv) => {
                const isPaid = inv.status === 'paid';
                const student = students.find(s => s.id === inv.studentId);
                const balance = (inv.netAmount ?? 0) - (inv.paidAmount ?? 0);

                return (
                  <div className="flex items-center justify-end space-x-1.5">
                    <ConsoleButton
                      variant="secondary"
                      size="xs"
                      icon={<FileText className="w-3 h-3" />}
                      onClick={() => setActiveReceiptInvoice(inv)}
                    >
                      Receipt
                    </ConsoleButton>

                    {!isPaid && (
                      <>
                        <ConsoleButton
                          variant="secondary"
                          size="xs"
                          icon={<QrCode className="w-3 h-3 text-[#188038]" />}
                          onClick={() => setActiveUpiModalInvoice(inv)}
                          title="Counter UPI QR"
                        >
                          UPI QR
                        </ConsoleButton>

                        <ConsoleButton
                          variant="secondary"
                          size="xs"
                          icon={<Share2 className="w-3 h-3 text-[#188038]" />}
                          onClick={() => {
                            const fatherPhone = student?.guardian.fatherPhone || student?.phone || '';
                            setActiveWhatsappModal({
                              title: `Fee Due Reminder for ${student?.name}`,
                              phone: fatherPhone,
                              message: `Dear Parent, gentle reminder that monthly coaching fee of ₹${(balance ?? 0).toLocaleString('en-IN')} for ${student?.name} is due on ${inv.dueDate} at ${currentOrg.name}. You can pay directly via UPI ID: ${currentOrg.upiId}.`
                            });
                          }}
                        >
                          Reminder
                        </ConsoleButton>
                      </>
                    )}
                  </div>
                );
              }
            }
          ]}
          data={invoices}
          keyExtractor={(inv) => inv.id}
          searchPlaceholder="Search invoices by student, number..."
          toolbarActions={
            <ConsoleButton
              variant="primary"
              size="sm"
              icon={<CreditCard className="w-3.5 h-3.5" />}
              onClick={() => {
                if (invoices.length > 0) {
                  setSelectedInvoiceToCollect(invoices[0].id);
                  setShowCollectFeeModal(true);
                }
              }}
            >
              Record Fee
            </ConsoleButton>
          }
        />
      )}

      {/* 7. EXAMS & RESULTS */}
      {currentModule === 'exams' && (
        <ConsoleCard
          title="Diagnostic Tests & Examinations"
          subtitle="Schedule unit tests, record student marks, and view rank percentiles"
          action={
            <ConsoleButton
              variant="primary"
              size="sm"
              icon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => setShowNewExamModal(true)}
            >
              Schedule Test
            </ConsoleButton>
          }
        >
          {exams.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <Award className="w-10 h-10 text-[#5F6368] dark:text-[#9AA0A6] mx-auto opacity-40" />
              <p className="text-sm font-semibold text-[#202124] dark:text-[#E8EAED]">
                No diagnostic tests or exams scheduled
              </p>
              <p className="text-xs text-[#5F6368] dark:text-[#9AA0A6] max-w-sm mx-auto">
                Schedule your center's first mock test, unit exam, or board assessment to record and track student performance.
              </p>
              <ConsoleButton
                variant="primary"
                size="sm"
                icon={<Plus className="w-3.5 h-3.5" />}
                onClick={() => setShowNewExamModal(true)}
              >
                Schedule First Test
              </ConsoleButton>
            </div>
          ) : (
            <div className="space-y-3">
              {exams.map(exam => {
                const batch = batches.find(b => b.id === exam.batchId);
                const resultsCount = examResults.filter(r => r.examId === exam.id).length;

                return (
                  <div
                    key={exam.id}
                    className="p-4 rounded-xl border border-[#DADCE0] dark:border-[#3C4043] bg-[#F8F9FA] dark:bg-[#282A2C] flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-sm text-[#202124] dark:text-[#E8EAED]">{exam.title}</div>
                      <div className="text-[#5F6368] dark:text-[#9AA0A6] mt-0.5">
                        Batch: {batch?.name} · Subject: {exam.subject}
                      </div>
                      <div className="text-[11px] text-[#5F6368] dark:text-[#9AA0A6] mt-0.5">
                        Date: {exam.examDate} · Max Marks: {exam.maxMarks}
                      </div>
                    </div>
                    <StatusChip
                      label={resultsCount > 0 ? `${resultsCount} Graded` : 'Scheduled'}
                      variant={resultsCount > 0 ? 'success' : 'neutral'}
                      size="xs"
                    />
                  </div>
                );
              })}
            </div>
          )}
        </ConsoleCard>
      )}

      {/* 8. TIMETABLE */}
      {currentModule === 'timetable' && (
        <ConsoleCard
          title="Master Institute Timetable"
          subtitle="Zero-conflict schedule grid across all lecture halls and faculty timings"
        >
          {timetableSlots.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <Clock className="w-10 h-10 text-[#5F6368] dark:text-[#9AA0A6] mx-auto opacity-40" />
              <p className="text-sm font-semibold text-[#202124] dark:text-[#E8EAED]">
                No timetable slots scheduled
              </p>
              <p className="text-xs text-[#5F6368] dark:text-[#9AA0A6] max-w-sm mx-auto">
                Schedule regular lectures and lab timings once batches and faculty are configured.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {timetableSlots.map(slot => (
                <div
                  key={slot.id}
                  className="p-3.5 rounded-xl border border-[#DADCE0] dark:border-[#3C4043] bg-[#F8F9FA] dark:bg-[#282A2C] space-y-1 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#FFA000] dark:text-[#FFCA28] text-[11px] uppercase tracking-wider">
                      {slot.dayOfWeek}
                    </span>
                    <span className="font-mono text-[#5F6368] dark:text-[#9AA0A6]">
                      {slot.startTime} - {slot.endTime}
                    </span>
                  </div>
                  <div className="font-bold text-[#202124] dark:text-[#E8EAED]">{slot.subject}</div>
                  <div className="text-[#5F6368] dark:text-[#9AA0A6]">Classroom: {slot.classroom}</div>
                  <div className="text-[10px] text-[#188038] dark:text-[#81C995] font-medium">
                    ✓ Verified clash-free
                  </div>
                </div>
              ))}
            </div>
          )}
        </ConsoleCard>
      )}

      {/* 9. ANNOUNCEMENTS */}
      {currentModule === 'announcements' && (
        <ConsoleCard
          title="Announcements & Broadcast System"
          subtitle="Publish urgent notices, holiday schedules, and WhatsApp broadcast templates"
          action={
            <ConsoleButton
              variant="blue"
              size="sm"
              icon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => setShowNewNoticeModal(true)}
            >
              Broadcast Notice
            </ConsoleButton>
          }
        >
          {announcements.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <Megaphone className="w-10 h-10 text-[#5F6368] dark:text-[#9AA0A6] mx-auto opacity-40" />
              <p className="text-sm font-semibold text-[#202124] dark:text-[#E8EAED]">
                No announcements broadcast yet
              </p>
              <p className="text-xs text-[#5F6368] dark:text-[#9AA0A6] max-w-sm mx-auto">
                Send urgent circulars, exam dates, and holiday updates to students and parents.
              </p>
              <div className="pt-2">
                <ConsoleButton
                  variant="primary"
                  size="sm"
                  icon={<Plus className="w-3.5 h-3.5" />}
                  onClick={() => setShowNewNoticeModal(true)}
                >
                  Broadcast Notice
                </ConsoleButton>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {announcements.map(ann => (
                <div
                  key={ann.id}
                  className="p-4 rounded-xl border border-[#DADCE0] dark:border-[#3C4043] bg-[#F8F9FA] dark:bg-[#282A2C] space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-[#202124] dark:text-[#E8EAED]">{ann.title}</span>
                    <StatusChip label={ann.targetAudience} variant="info" size="xs" />
                  </div>
                  <p className="text-[#3C4043] dark:text-[#C4C7C5] leading-relaxed">{ann.content}</p>
                  <div className="text-[10px] text-[#5F6368] dark:text-[#9AA0A6]">
                    Posted by {ann.createdBy} · {ann.createdAt.split('T')[0]}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ConsoleCard>
      )}

      {/* 10. ASSIGNMENTS */}
      {currentModule === 'assignments' && (
        <ConsoleCard
          title="Homework & Assignments"
          subtitle="Manage assigned coursework, submission deadlines, and student homework completion"
        >
          {assignments.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <BookOpen className="w-10 h-10 text-[#5F6368] dark:text-[#9AA0A6] mx-auto opacity-40" />
              <p className="text-sm font-semibold text-[#202124] dark:text-[#E8EAED]">
                No assignments issued yet
              </p>
              <p className="text-xs text-[#5F6368] dark:text-[#9AA0A6] max-w-sm mx-auto">
                Faculty can upload and distribute daily practice problems and chapter homework here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {assignments.map(assign => {
                const batch = batches.find(b => b.id === assign.batchId);
                return (
                  <div
                    key={assign.id}
                    className="p-4 rounded-xl border border-[#DADCE0] dark:border-[#3C4043] bg-[#F8F9FA] dark:bg-[#282A2C] flex items-center justify-between text-xs gap-3"
                  >
                    <div>
                      <div className="font-semibold text-sm text-[#202124] dark:text-[#E8EAED]">{assign.title}</div>
                      <div className="text-[#5F6368] dark:text-[#9AA0A6] mt-0.5">
                        {assign.subject} · {batch?.name} · Due: {assign.dueDate}
                      </div>
                      <p className="text-[#5F6368] dark:text-[#9AA0A6] mt-1 text-[11px]">{assign.description}</p>
                    </div>
                    <StatusChip label={`${assign.submissions.length} Submitted`} variant="info" size="xs" />
                  </div>
                );
              })}
            </div>
          )}
        </ConsoleCard>
      )}

      {/* 11. STUDY MATERIAL */}
      {currentModule === 'materials' && (
        <ConsoleCard
          title="Study Material & Digital Library"
          subtitle="Curated NCERT solutions, formula sheets, lecture notes, and chapter summaries"
          action={
            <ConsoleButton
              variant="primary"
              size="sm"
              icon={<Upload className="w-3.5 h-3.5" />}
              onClick={() => setShowUploadMaterialModal(true)}
            >
              Upload Material
            </ConsoleButton>
          }
        >
          {studyMaterials.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <FolderOpen className="w-10 h-10 text-[#5F6368] dark:text-[#9AA0A6] mx-auto opacity-40" />
              <p className="text-sm font-semibold text-[#202124] dark:text-[#E8EAED]">
                No study materials uploaded
              </p>
              <p className="text-xs text-[#5F6368] dark:text-[#9AA0A6] max-w-sm mx-auto">
                Share revision sheets, NCERT solutions, and test notes with your students.
              </p>
              <div className="pt-2">
                <ConsoleButton
                  variant="primary"
                  size="sm"
                  icon={<Upload className="w-3.5 h-3.5" />}
                  onClick={() => setShowUploadMaterialModal(true)}
                >
                  Upload First Resource
                </ConsoleButton>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {studyMaterials.map(mat => (
                <div
                  key={mat.id}
                  className="p-4 rounded-xl border border-[#DADCE0] dark:border-[#3C4043] bg-[#F8F9FA] dark:bg-[#282A2C] flex flex-col justify-between space-y-3 text-xs"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center space-x-2 text-[#1A73E8] dark:text-[#8AB4F8]">
                        <FolderOpen className="w-4 h-4" />
                        <span className="font-medium text-[11px] uppercase tracking-wider">{mat.type}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteStudyMaterial(mat.id)}
                        className="text-[#5F6368] hover:text-[#D93025] dark:text-[#9AA0A6] dark:hover:text-[#F28B82] p-1 rounded transition"
                        title="Delete material"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="font-semibold text-sm text-[#202124] dark:text-[#E8EAED]">{mat.title}</div>
                    <div className="text-[#5F6368] dark:text-[#9AA0A6] text-[11px]">{mat.subject} · {mat.fileSize}</div>
                    {mat.chapterTopic && (
                      <div className="text-[10px] text-[#5F6368] dark:text-[#9AA0A6] mt-1 bg-white dark:bg-[#1E1F20] px-2 py-0.5 rounded border border-[#DADCE0] dark:border-[#3C4043] inline-block">
                        Topic: {mat.chapterTopic}
                      </div>
                    )}
                  </div>

                  <a
                    href={mat.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-1.5 px-3 bg-white dark:bg-[#1E1F20] border border-[#DADCE0] dark:border-[#3C4043] hover:bg-[#F1F3F4] dark:hover:bg-[#282A2C] text-[#202124] dark:text-[#E8EAED] rounded-lg font-medium text-center transition flex items-center justify-center space-x-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Resource</span>
                  </a>
                </div>
              ))}
            </div>
          )}
        </ConsoleCard>
      )}

      {/* 12. TEACHERS DIRECTORY */}
      {!isStaff && currentModule === 'teachers' && (
        <ConsoleCard
          title="Faculty & Teachers Directory"
          subtitle="Instructor profiles, assigned subjects, contact details, and teaching schedules"
          action={
            <ConsoleButton
              variant="primary"
              size="sm"
              icon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => setShowAddTeacherModal(true)}
            >
              Add Faculty
            </ConsoleButton>
          }
        >
          {teachers.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <Users className="w-10 h-10 text-[#5F6368] dark:text-[#9AA0A6] mx-auto opacity-40" />
              <p className="text-sm font-semibold text-[#202124] dark:text-[#E8EAED]">
                No faculty added yet
              </p>
              <p className="text-xs text-[#5F6368] dark:text-[#9AA0A6] max-w-sm mx-auto">
                Add teaching faculty and assign them to batches and subjects.
              </p>
              <ConsoleButton
                variant="primary"
                size="sm"
                icon={<Plus className="w-3.5 h-3.5" />}
                onClick={() => setShowAddTeacherModal(true)}
              >
                Add First Faculty
              </ConsoleButton>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {teachers.map(t => (
                <div
                  key={t.id}
                  className="p-4 rounded-xl border border-[#DADCE0] dark:border-[#3C4043] bg-[#F8F9FA] dark:bg-[#282A2C] space-y-3 text-xs flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <img
                        src={t.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(t.name)}`}
                        alt={t.name}
                        className="w-10 h-10 rounded-full object-cover border border-[#DADCE0] dark:border-[#3C4043]"
                      />
                      <div>
                        <div className="font-semibold text-sm text-[#202124] dark:text-[#E8EAED]">{t.name}</div>
                        <div className="text-[11px] text-[#5F6368] dark:text-[#9AA0A6]">{t.qualification}</div>
                      </div>
                    </div>

                    <div className="space-y-1 text-[#5F6368] dark:text-[#9AA0A6] pt-2 border-t border-[#DADCE0]/60 dark:border-[#3C4043]">
                      <div>Subjects: <strong className="text-[#202124] dark:text-white">{t.subjects.join(', ')}</strong></div>
                      <div>Phone: <span className="font-mono text-[#202124] dark:text-white">{t.phone}</span></div>
                      <div>Assigned Batches: <strong className="text-[#202124] dark:text-white">{t.assignedBatchIds.length} batch(es)</strong></div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#DADCE0]/60 dark:border-[#3C4043] flex items-center justify-end">
                    <ConsoleButton
                      variant="secondary"
                      size="xs"
                      icon={<UserCheck className="w-3 h-3 text-[#1A73E8]" />}
                      onClick={() => {
                        const teacherUser: User = {
                          id: t.id,
                          name: t.name,
                          email: t.email,
                          phone: t.phone,
                          avatar: t.avatar,
                          role: 'TEACHER',
                          orgId: currentOrg.id,
                          qualification: t.qualification,
                          subjects: t.subjects
                        };
                        setEditingPerson(teacherUser);
                      }}
                    >
                      Edit Faculty Profile
                    </ConsoleButton>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ConsoleCard>
      )}

      {/* 13. PARENTS DIRECTORY */}
      {currentModule === 'parents' && (
        <DataTable
          columns={[
            {
              key: 'parentName',
              header: 'Parent Name',
              sortable: true,
              render: (s) => (
                <div className="font-medium text-[#202124] dark:text-[#E8EAED]">{s.guardian.fatherName}</div>
              )
            },
            {
              key: 'student',
              header: 'Linked Student',
              render: (s) => (
                <div className="text-[#5F6368] dark:text-[#9AA0A6]">{s.name} ({s.classGrade})</div>
              )
            },
            {
              key: 'contact',
              header: 'Mobile Contact',
              render: (s) => (
                <div className="font-mono text-[#5F6368] dark:text-[#9AA0A6]">{s.guardian.fatherPhone}</div>
              )
            },
            {
              key: 'status',
              header: 'Fee Status',
              render: (s) => {
                const sInvoices = invoices.filter(i => i.studentId === s.id);
                const hasDue = sInvoices.some(i => i.status !== 'paid');
                return (
                  <StatusChip
                    label={hasDue ? 'Fee Due' : 'Paid'}
                    variant={hasDue ? 'warning' : 'success'}
                    size="xs"
                  />
                );
              }
            },
            {
              key: 'actions',
              header: '',
              align: 'right',
              render: (s) => (
                <div className="flex items-center justify-end space-x-1.5">
                  <ConsoleButton
                    variant="secondary"
                    size="xs"
                    icon={<UserCheck className="w-3 h-3 text-[#1A73E8]" />}
                    onClick={() => {
                      const parentUser: User = {
                        id: `parent-${s.id}`,
                        name: s.guardian.fatherName,
                        email: `parent.${s.rollNo.toLowerCase()}@example.com`,
                        phone: s.guardian.fatherPhone,
                        avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(s.guardian.fatherName)}`,
                        role: 'PARENT',
                        orgId: currentOrg.id,
                        occupation: s.guardian.fatherOccupation,
                        address: s.address,
                        emergencyContact: s.guardian.motherPhone || s.guardian.fatherPhone
                      };
                      setEditingPerson(parentUser);
                    }}
                  >
                    Edit Profile
                  </ConsoleButton>
                  <ConsoleButton
                    variant="secondary"
                    size="xs"
                    icon={<Share2 className="w-3 h-3 text-[#188038]" />}
                    onClick={() => {
                      setActiveWhatsappModal({
                        title: `Chat with ${s.guardian.fatherName}`,
                        phone: s.guardian.fatherPhone,
                        message: `Namaste Shri ${s.guardian.fatherName}, greetings from ${currentOrg.name}. We would like to share an update regarding ${s.name}.`
                      });
                    }}
                  >
                    WhatsApp
                  </ConsoleButton>
                </div>
              )
            }
          ]}
          data={students}
          keyExtractor={(s) => s.id}
          searchPlaceholder="Search parents by name or phone..."
        />
      )}

      {/* 14. VIDYACHAT / SLACK MESSAGES */}
      {(currentModule === 'discussions' || currentModule === 'messages') && (
        <InstituteMessenger className="mt-2" />
      )}

      {/* 15. ANALYTICS & REPORTS */}
      {!isStaff && (currentModule === 'analytics' || currentModule === 'reports') && (
        <ConsoleCard
          title={currentModule === 'analytics' ? 'Coaching Center Analytics' : 'Academic & Fee Reports'}
          subtitle="Detailed insights into student attendance, test score distribution, and fee recovery"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <MetricCard
              label="Avg Test Score"
              value={avgTestScorePct > 0 ? `${avgTestScorePct}%` : '0%'}
              trend={avgTestScorePct > 0 ? { value: `${examResults.length} graded exam(s)`, isPositive: true } : undefined}
              subtext={examResults.length === 0 ? 'No test marks recorded yet' : undefined}
              accentColor="#1A73E8"
            />
            <MetricCard
              label="Fee Collection Velocity"
              value={feeRecoveryVelocityPct > 0 ? `${feeRecoveryVelocityPct}%` : '0%'}
              subtext={invoices.length === 0 ? 'No invoices generated yet' : `₹${totalCollectedFees.toLocaleString()} collected of ₹${totalNetFees.toLocaleString()}`}
              accentColor="#188038"
            />
            <MetricCard
              label="Batch Utilization"
              value={batchUtilizationPct > 0 ? `${batchUtilizationPct}%` : '0%'}
              subtext={batches.length === 0 ? 'No active batches created yet' : `${batches.length} batch(es) configured`}
              accentColor="#FFA000"
            />
          </div>
        </ConsoleCard>
      )}

      {/* 16. SETTINGS & UPI BANKING CONFIGURATION */}
      {!isStaff && currentModule === 'settings' && (
        <div className="space-y-6 max-w-4xl">
          {/* Card 1: Direct Fee Counter UPI & Banking Gateway */}
          <ConsoleCard
            title="Coaching Center Fee Counter UPI & Banking"
            subtitle="Configure your official UPI ID so parents can scan and pay course fees directly into your bank account"
            action={
              <div className="flex items-center space-x-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/50">
                  <CheckCircle className="w-3 h-3 mr-1 text-emerald-600 dark:text-emerald-400" />
                  Direct UPI Active
                </span>
              </div>
            }
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Left 2 Cols: Form to edit and save UPI settings */}
              <form onSubmit={handleSaveUpiSettings} className="md:col-span-2 space-y-4 text-xs">
                <div>
                  <label className="block text-[#5F6368] dark:text-[#9AA0A6] font-semibold mb-1">
                    Institute Fee Counter UPI ID <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={upiSettingsId}
                      onChange={e => setUpiSettingsId(e.target.value)}
                      placeholder="e.g. apexacademy@okhdfcbank or 9876543210@paytm"
                      className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2C] text-[#202124] dark:text-[#E8EAED] font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#FFA000]/40"
                    />
                    <QrCode className="w-4 h-4 text-[#188038] dark:text-[#81C995] absolute left-2.5 top-3" />
                  </div>
                  <p className="text-[11px] text-[#5F6368] dark:text-[#9AA0A6] mt-1">
                    This UPI ID is embedded into parent fee invoices, WhatsApp reminders, and counter receipt modals.
                  </p>
                </div>

                <div>
                  <label className="block text-[#5F6368] dark:text-[#9AA0A6] font-semibold mb-1">
                    Beneficiary / Merchant Name (Shown on Google Pay / PhonePe)
                  </label>
                  <input
                    type="text"
                    value={upiMerchantName}
                    onChange={e => setUpiMerchantName(e.target.value)}
                    placeholder="e.g. APEX IIT ACADEMY FEE COUNTER"
                    className="w-full px-3 py-2.5 rounded-xl border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2C] text-[#202124] dark:text-[#E8EAED] font-medium focus:outline-none focus:ring-2 focus:ring-[#FFA000]/40"
                  />
                  <p className="text-[11px] text-[#5F6368] dark:text-[#9AA0A6] mt-1">
                    Parents will see this verified name inside their banking app when scanning the fee payment QR code.
                  </p>
                </div>

                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200/60 dark:border-emerald-800/40 text-[11px] text-emerald-800 dark:text-emerald-200 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>0% Commission · Direct Bank Settlement</span>
                  </div>
                  <p className="text-[#5F6368] dark:text-emerald-300/80 leading-relaxed">
                    VidyaOS does not hold or touch your institute's funds. All UPI transactions route directly through NPCI / UPI rails into your registered bank account with zero deduction.
                  </p>
                </div>

                <div className="pt-1 flex items-center gap-3">
                  <ConsoleButton
                    type="submit"
                    variant="primary"
                    size="sm"
                    loading={isSavingUpi}
                    icon={<Check className="w-4 h-4" />}
                  >
                    Save UPI Settings
                  </ConsoleButton>

                  {upiSaveSuccess && (
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" />
                      Saved & Synchronized to Firestore!
                    </span>
                  )}
                </div>
              </form>

              {/* Right Col: Live Dynamic UPI QR Preview */}
              <div className="bg-[#F8F9FA] dark:bg-[#282A2C] p-4 rounded-2xl border border-[#DADCE0] dark:border-[#3C4043] flex flex-col items-center justify-center text-center space-y-3">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#5F6368] dark:text-[#9AA0A6]">
                  Live Counter QR Preview
                </span>

                <div className="p-3 bg-white rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`upi://pay?pa=${upiSettingsId || 'coaching@upi'}&pn=${encodeURIComponent(upiMerchantName || currentOrg.name)}&cu=INR`)}`}
                    alt="Coaching Center Fee Counter UPI QR"
                    className="w-32 h-32 object-contain"
                  />
                </div>

                <div className="w-full space-y-1 text-center">
                  <div className="font-mono text-xs font-bold text-slate-900 dark:text-white truncate px-2" title={upiSettingsId}>
                    {upiSettingsId || 'Not configured yet'}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate px-2">
                    {upiMerchantName || currentOrg.name}
                  </div>
                </div>

                {/* Supported UPI Apps */}
                <div className="pt-1 border-t border-slate-200 dark:border-slate-700/60 w-full flex items-center justify-center gap-2 text-[10px] text-slate-500 font-bold">
                  <span className="px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">GPay</span>
                  <span className="px-1.5 py-0.5 rounded bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300">PhonePe</span>
                  <span className="px-1.5 py-0.5 rounded bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300">Paytm</span>
                  <span className="px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">BHIM</span>
                </div>
              </div>
            </div>
          </ConsoleCard>

          {/* Card 2: Coaching Center Profile & Campus Details */}
          <ConsoleCard
            title="Coaching & Education Center Profile"
            subtitle="Campus address, director information, branding, and branch network"
            action={
              isEditingProfile ? (
                <div className="flex items-center gap-2">
                  <ConsoleButton
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={handleCancelProfileEdit}
                  >
                    Cancel
                  </ConsoleButton>
                  <ConsoleButton
                    type="button"
                    variant="primary"
                    size="xs"
                    loading={isSavingProfile}
                    onClick={handleSaveProfile}
                    icon={<Check className="w-3.5 h-3.5" />}
                  >
                    Save Changes
                  </ConsoleButton>
                </div>
              ) : (
                <ConsoleButton
                  type="button"
                  variant="secondary"
                  size="xs"
                  onClick={() => setIsEditingProfile(true)}
                  icon={<Edit2 className="w-3.5 h-3.5" />}
                >
                  Edit Profile
                </ConsoleButton>
              )
            }
          >
            {isEditingProfile ? (
              <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-[#5F6368] dark:text-[#9AA0A6] font-semibold mb-1">
                      Institute Display Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={profileName}
                      onChange={e => setProfileName(e.target.value)}
                      placeholder="e.g. Apex IIT Academy"
                      className="w-full px-3 py-2.5 rounded-xl border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2C] text-[#202124] dark:text-[#E8EAED] font-semibold focus:outline-none focus:ring-2 focus:ring-[#FFA000]/40"
                    />
                  </div>

                  <div>
                    <label className="block text-[#5F6368] dark:text-[#9AA0A6] font-semibold mb-1">
                      Logo Monogram (2-4 Chars)
                    </label>
                    <input
                      type="text"
                      maxLength={4}
                      value={profileLogoText}
                      onChange={e => setProfileLogoText(e.target.value.toUpperCase())}
                      placeholder="e.g. APEX"
                      className="w-full px-3 py-2.5 rounded-xl border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2C] text-[#202124] dark:text-[#E8EAED] font-mono font-bold tracking-wider focus:outline-none focus:ring-2 focus:ring-[#FFA000]/40 uppercase"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[#5F6368] dark:text-[#9AA0A6] font-semibold mb-1">
                      Tagline & Focus
                    </label>
                    <input
                      type="text"
                      value={profileTagline}
                      onChange={e => setProfileTagline(e.target.value)}
                      placeholder="e.g. Excellence in CBSE & JEE/NEET Foundations"
                      className="w-full px-3 py-2.5 rounded-xl border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2C] text-[#202124] dark:text-[#E8EAED] focus:outline-none focus:ring-2 focus:ring-[#FFA000]/40"
                    />
                  </div>

                  <div>
                    <label className="block text-[#5F6368] dark:text-[#9AA0A6] font-semibold mb-1">
                      Director / Center Owner <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={profileOwnerName}
                      onChange={e => setProfileOwnerName(e.target.value)}
                      placeholder="e.g. Er. Manoj Verma"
                      className="w-full px-3 py-2.5 rounded-xl border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2C] text-[#202124] dark:text-[#E8EAED] font-semibold focus:outline-none focus:ring-2 focus:ring-[#FFA000]/40"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[#5F6368] dark:text-[#9AA0A6] font-semibold mb-1">
                      Contact Phone / WhatsApp <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={profilePhone}
                      onChange={e => setProfilePhone(e.target.value)}
                      placeholder="e.g. +91 98765 43210"
                      className="w-full px-3 py-2.5 rounded-xl border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2C] text-[#202124] dark:text-[#E8EAED] font-mono focus:outline-none focus:ring-2 focus:ring-[#FFA000]/40"
                    />
                  </div>

                  <div>
                    <label className="block text-[#5F6368] dark:text-[#9AA0A6] font-semibold mb-1">
                      Official Institute Email
                    </label>
                    <input
                      type="email"
                      value={profileEmail}
                      onChange={e => setProfileEmail(e.target.value)}
                      placeholder="e.g. admissions@apexacademy.in"
                      className="w-full px-3 py-2.5 rounded-xl border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2C] text-[#202124] dark:text-[#E8EAED] focus:outline-none focus:ring-2 focus:ring-[#FFA000]/40"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-[#5F6368] dark:text-[#9AA0A6] font-semibold mb-1">
                      Campus Physical Address
                    </label>
                    <input
                      type="text"
                      value={profileAddress}
                      onChange={e => setProfileAddress(e.target.value)}
                      placeholder="e.g. Plot 42, Knowledge Park III"
                      className="w-full px-3 py-2.5 rounded-xl border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2C] text-[#202124] dark:text-[#E8EAED] focus:outline-none focus:ring-2 focus:ring-[#FFA000]/40"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[#5F6368] dark:text-[#9AA0A6] font-semibold mb-1">
                        City
                      </label>
                      <input
                        type="text"
                        value={profileCity}
                        onChange={e => setProfileCity(e.target.value)}
                        placeholder="e.g. Kota"
                        className="w-full px-3 py-2.5 rounded-xl border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2C] text-[#202124] dark:text-[#E8EAED] focus:outline-none focus:ring-2 focus:ring-[#FFA000]/40"
                      />
                    </div>

                    <div>
                      <label className="block text-[#5F6368] dark:text-[#9AA0A6] font-semibold mb-1">
                        State
                      </label>
                      <input
                        type="text"
                        value={profileState}
                        onChange={e => setProfileState(e.target.value)}
                        placeholder="e.g. Rajasthan"
                        className="w-full px-3 py-2.5 rounded-xl border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2C] text-[#202124] dark:text-[#E8EAED] focus:outline-none focus:ring-2 focus:ring-[#FFA000]/40"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-3 flex items-center justify-end gap-3 border-t border-[#DADCE0]/60 dark:border-[#3C4043]">
                  <ConsoleButton
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleCancelProfileEdit}
                  >
                    Cancel
                  </ConsoleButton>
                  <ConsoleButton
                    type="submit"
                    variant="primary"
                    size="sm"
                    loading={isSavingProfile}
                    icon={<Check className="w-4 h-4" />}
                  >
                    Save Profile Changes
                  </ConsoleButton>
                </div>
              </form>
            ) : (
              <div className="space-y-4 text-xs">
                {/* Visual Identity Header Card */}
                <div className="p-3.5 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent rounded-2xl border border-amber-200/60 dark:border-amber-900/30 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#FFA000] to-[#E65100] text-white font-bold font-mono text-base flex items-center justify-center shadow-md">
                      {currentOrg.logoText || (currentOrg.name || 'V').slice(0, 4).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-bold text-sm text-[#202124] dark:text-white font-google-sans">
                        {currentOrg.name}
                      </div>
                      <div className="text-[11px] text-[#5F6368] dark:text-[#9AA0A6] mt-0.5">
                        {currentOrg.tagline || 'Premier Coaching Institute'}
                      </div>
                    </div>
                  </div>

                  <StatusChip
                    label={currentOrg.planId === 'starter' ? 'STARTER BATCH' : currentOrg.planId === 'growth' ? 'GROWTH ACADEMY' : 'MULTI-BRANCH PRO'}
                    variant="warning"
                    size="xs"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[#5F6368] dark:text-[#9AA0A6] font-medium mb-1">
                      Director / Center Owner
                    </label>
                    <div className="w-full border border-[#DADCE0] dark:border-[#3C4043] bg-[#F8F9FA] dark:bg-[#282A2C] text-[#202124] dark:text-[#E8EAED] rounded-lg p-2.5 font-semibold">
                      {currentOrg.ownerName || 'Not configured'}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[#5F6368] dark:text-[#9AA0A6] font-medium mb-1">
                      Contact Phone / WhatsApp
                    </label>
                    <div className="w-full border border-[#DADCE0] dark:border-[#3C4043] bg-[#F8F9FA] dark:bg-[#282A2C] text-[#202124] dark:text-[#E8EAED] rounded-lg p-2.5 font-mono">
                      {currentOrg.phone || 'Not configured'}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[#5F6368] dark:text-[#9AA0A6] font-medium mb-1">
                      Official Institute Email
                    </label>
                    <div className="w-full border border-[#DADCE0] dark:border-[#3C4043] bg-[#F8F9FA] dark:bg-[#282A2C] text-[#202124] dark:text-[#E8EAED] rounded-lg p-2.5">
                      {currentOrg.email || 'Not configured'}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[#5F6368] dark:text-[#9AA0A6] font-medium mb-1">
                      Registered Location
                    </label>
                    <div className="w-full border border-[#DADCE0] dark:border-[#3C4043] bg-[#F8F9FA] dark:bg-[#282A2C] text-[#202124] dark:text-[#E8EAED] rounded-lg p-2.5">
                      {currentOrg.city}, {currentOrg.state}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[#5F6368] dark:text-[#9AA0A6] font-medium mb-1">
                    Campus Physical Address
                  </label>
                  <div className="w-full border border-[#DADCE0] dark:border-[#3C4043] bg-[#F8F9FA] dark:bg-[#282A2C] text-[#202124] dark:text-[#E8EAED] rounded-lg p-2.5">
                    {currentOrg.address || 'Civil Lines'}
                  </div>
                </div>

                <div>
                  <label className="block text-[#5F6368] dark:text-[#9AA0A6] font-medium mb-1">
                    Active Branches & Campuses ({currentOrg.branches?.length || 1} / {currentOrg.maxBranches})
                  </label>
                  <div className="p-3 bg-[#F8F9FA] dark:bg-[#282A2C] rounded-lg border border-[#DADCE0] dark:border-[#3C4043] space-y-1.5">
                    {(currentOrg.branches || []).map(b => (
                      <div key={b.id} className="text-[#202124] dark:text-[#E8EAED] font-medium flex items-center justify-between">
                        <div>
                          <strong>{b.name}</strong> — <span className="text-[#5F6368] dark:text-[#9AA0A6]">{b.address || `${currentOrg.city}, ${currentOrg.state}`}</span>
                        </div>
                        {b.isMain && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                            Main Branch
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </ConsoleCard>

          {/* Card 3: Dedicated Front Desk Staff Account */}
          <ConsoleCard
            title="Front Desk & Reception Staff Login"
            subtitle="Give these credentials to your reception counter staff for daily student admissions, fee receipts, and attendance tracking"
            action={
              <StatusChip label="1 STAFF LOGIN INCLUDED" variant="success" size="xs" />
            }
          >
            <div className="space-y-4 text-xs">
              <div className="p-3.5 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-900/40 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-sm text-blue-900 dark:text-blue-200 flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-[#1A73E8]" />
                    <span>Front Desk Counter Executive</span>
                  </div>
                  <StatusChip label="LIMITED ACCESS" variant="info" size="xs" />
                </div>
                <p className="text-[#5F6368] dark:text-blue-300/80 leading-relaxed text-[11px]">
                  Your front desk staff can manage admissions, collect payments via dynamic desk UPI QR, print fee receipts, mark daily batch attendance, and send WhatsApp notifications. Financial profit/loss, faculty management, and system settings remain strictly protected.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-white dark:bg-[#282A2C] rounded-xl border border-[#DADCE0] dark:border-[#3C4043] space-y-1">
                  <span className="text-[10px] uppercase font-bold text-[#5F6368] dark:text-[#9AA0A6]">Staff Mobile / Login</span>
                  <div className="font-mono font-bold text-sm text-[#202124] dark:text-[#E8EAED]">
                    {currentOrg.id === 'org-apex' ? '+91 98765 43299' : `+91 ${currentOrg.phone.replace(/[^0-9]/g, '').slice(0, 9)}9`}
                  </div>
                </div>

                <div className="p-3 bg-white dark:bg-[#282A2C] rounded-xl border border-[#DADCE0] dark:border-[#3C4043] space-y-1">
                  <span className="text-[10px] uppercase font-bold text-[#5F6368] dark:text-[#9AA0A6]">Default Password</span>
                  <div className="font-mono font-bold text-sm text-[#202124] dark:text-[#E8EAED]">
                    staff123
                  </div>
                </div>

                <div className="p-3 bg-white dark:bg-[#282A2C] rounded-xl border border-[#DADCE0] dark:border-[#3C4043] space-y-1">
                  <span className="text-[10px] uppercase font-bold text-[#5F6368] dark:text-[#9AA0A6]">Counter Route</span>
                  <div className="font-mono font-semibold text-xs text-[#1A73E8] dark:text-[#8AB4F8] truncate">
                    /admin/{currentOrg.id}
                  </div>
                </div>
              </div>
            </div>
          </ConsoleCard>
        </div>
      )}

      {/* 17. SUBSCRIPTION */}
      {!isStaff && currentModule === 'subscription' && (
        <div className="space-y-6">
          <ConsoleCard
            title="VidyaOS SaaS Subscription & Quotas"
            subtitle="Multi-tenant isolated coaching tier, resource limits & billing"
            action={
              <div className="flex items-center gap-2">
                <StatusChip
                  label={currentOrg.planId === 'starter' ? 'STARTER BATCH' : currentOrg.planId === 'growth' ? 'GROWTH ACADEMY' : 'MULTI-BRANCH PRO'}
                  variant="warning"
                  size="xs"
                />
                <StatusChip label={currentOrg.subscriptionStatus.toUpperCase()} variant="success" size="xs" />
              </div>
            }
          >
            <div className="p-4 rounded-xl border border-[#DADCE0] dark:border-[#3C4043] bg-[#F8F9FA] dark:bg-[#282A2C] space-y-4 text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#DADCE0]/60 dark:border-[#3C4043] pb-3">
                <div>
                  <div className="font-semibold text-sm text-[#202124] dark:text-[#E8EAED]">
                    {currentOrg.name} — Plan Details
                  </div>
                  <div className="text-[11px] text-[#5F6368] dark:text-[#9AA0A6] mt-0.5">
                    Cycle renews: {currentOrg.currentCycleEnd || '2026-10-31'} · Flat transparent pricing
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-[#E65100] dark:text-[#FFCA28]">
                    {currentOrg.planId === 'starter' ? '₹599' : currentOrg.planId === 'growth' ? '₹1,299' : '₹2,199'}
                    <span className="text-xs font-normal text-[#5F6368] dark:text-[#9AA0A6]">/month</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <span className="text-[#5F6368] dark:text-[#9AA0A6]">Student Limit:</span>
                  <div className="text-base font-bold text-[#202124] dark:text-[#E8EAED] mt-0.5">
                    {students.length} / {currentOrg.maxStudents}
                  </div>
                  <div className="w-full bg-[#E8EAED] dark:bg-[#3C4043] h-1.5 rounded-full overflow-hidden mt-1.5">
                    <div
                      className="bg-[#FFA000] h-full rounded-full transition-all"
                      style={{ width: `${Math.min(100, (students.length / currentOrg.maxStudents) * 100)}%` }}
                    />
                  </div>
                </div>

                <div>
                  <span className="text-[#5F6368] dark:text-[#9AA0A6]">Branch Limit:</span>
                  <div className="text-base font-bold text-[#202124] dark:text-[#E8EAED] mt-0.5">
                    {currentOrg.branches?.length || 1} / {currentOrg.maxBranches}
                  </div>
                  <div className="w-full bg-[#E8EAED] dark:bg-[#3C4043] h-1.5 rounded-full overflow-hidden mt-1.5">
                    <div
                      className="bg-[#188038] h-full rounded-full transition-all"
                      style={{ width: `${Math.min(100, ((currentOrg.branches?.length || 1) / currentOrg.maxBranches) * 100)}%` }}
                    />
                  </div>
                </div>

                <div>
                  <span className="text-[#5F6368] dark:text-[#9AA0A6]">WhatsApp SMS Credits:</span>
                  <div className="text-base font-bold text-[#202124] dark:text-[#E8EAED] mt-0.5">2,450 / 5,000</div>
                  <div className="w-full bg-[#E8EAED] dark:bg-[#3C4043] h-1.5 rounded-full overflow-hidden mt-1.5">
                    <div className="bg-[#1A73E8] h-full rounded-full" style={{ width: '49%' }} />
                  </div>
                </div>

                <div>
                  <span className="text-[#5F6368] dark:text-[#9AA0A6]">Cloud Storage:</span>
                  <div className="text-base font-bold text-[#202124] dark:text-[#E8EAED] mt-0.5">14.2 GB / 50 GB</div>
                  <div className="w-full bg-[#E8EAED] dark:bg-[#3C4043] h-1.5 rounded-full overflow-hidden mt-1.5">
                    <div className="bg-[#AB47BC] h-full rounded-full" style={{ width: '28%' }} />
                  </div>
                </div>
              </div>
            </div>
          </ConsoleCard>

          {/* Available Tiers */}
          <div className="space-y-3">
            <h3 className="font-google-sans font-bold text-sm text-[#202124] dark:text-[#E8EAED]">
              Available Plans & Upgrades
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {subscriptionPlans.map(plan => {
                const isCurrent = currentOrg.planId === plan.id;
                return (
                  <div
                    key={plan.id}
                    className={`rounded-2xl p-5 border flex flex-col justify-between space-y-4 transition ${
                      isCurrent
                        ? 'border-2 border-[#FFA000] bg-amber-50/20 dark:bg-amber-950/20 shadow-md'
                        : 'border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#1E1F20]'
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs uppercase tracking-wider text-[#5F6368] dark:text-[#9AA0A6]">
                          {plan.name}
                        </span>
                        {isCurrent && (
                          <StatusChip label="ACTIVE" variant="warning" size="xs" />
                        )}
                      </div>

                      <div className="text-2xl font-bold font-google-sans text-[#202124] dark:text-white">
                        ₹{(plan.priceMonthly ?? 0).toLocaleString('en-IN')}
                        <span className="text-xs font-normal text-[#5F6368] dark:text-[#9AA0A6]">/month</span>
                      </div>

                      <p className="text-xs text-[#5F6368] dark:text-[#9AA0A6] leading-relaxed">
                        {plan.description}
                      </p>

                      <div className="text-xs text-[#5F6368] dark:text-[#9AA0A6] bg-slate-50 dark:bg-[#282A2C] p-2.5 rounded-xl border border-[#DADCE0]/60 dark:border-[#3C4043]/60">
                        Max Students: <strong className="text-[#202124] dark:text-white">{plan.maxStudents}</strong> · Branches: <strong className="text-[#202124] dark:text-white">{plan.maxBranches}</strong>
                      </div>

                      <ul className="space-y-1.5 text-xs text-[#5F6368] dark:text-[#9AA0A6] pt-1">
                        {plan.features.slice(0, 5).map((f, i) => (
                          <li key={i} className="flex items-center gap-1.5">
                            <Check className="w-3.5 h-3.5 text-[#188038] shrink-0" />
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      {isCurrent ? (
                        <div className="w-full text-center py-2 px-3 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-[#E65100] dark:text-[#FFCA28] font-bold text-xs">
                          Current Active Tier
                        </div>
                      ) : (
                        <ConsoleButton
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            changeOrgPlan(currentOrg.id, plan.id);
                            showToast(`Upgraded coaching plan to ${plan.name}`, 'success');
                          }}
                          className="w-full justify-center"
                        >
                          Switch to {plan.name.replace(' Plan', '')}
                        </ConsoleButton>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: Add Student */}
      {showAddStudentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-[#1E1F20] border border-[#DADCE0] dark:border-[#3C4043] w-full max-w-lg rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="font-google-sans font-bold text-base text-[#202124] dark:text-[#E8EAED]">
              Admit New Student
            </h3>
            <form onSubmit={handleCreateStudent} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#5F6368] dark:text-[#9AA0A6] font-medium mb-1">Student Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ananya Pandey"
                  value={stName}
                  onChange={e => setStName(e.target.value)}
                  className="w-full border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2C] text-[#202124] dark:text-[#E8EAED] rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-[#FFA000]/40"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[#5F6368] dark:text-[#9AA0A6] font-medium mb-1">Class</label>
                  <select
                    value={stClass}
                    onChange={e => setStClass(e.target.value)}
                    className="w-full border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2C] text-[#202124] dark:text-[#E8EAED] rounded-lg p-2.5"
                  >
                    <option value="Class 8">Class 8</option>
                    <option value="Class 9">Class 9</option>
                    <option value="Class 10">Class 10</option>
                    <option value="Class 11">Class 11</option>
                    <option value="Class 12">Class 12</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[#5F6368] dark:text-[#9AA0A6] font-medium mb-1">Level / Stream</label>
                  <select
                    value={stBoard}
                    onChange={e => setStBoard(e.target.value as any)}
                    className="w-full border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2C] text-[#202124] dark:text-[#E8EAED] rounded-lg p-2.5"
                  >
                    <option value="Board level">Board level</option>
                    <option value="Coaching">Coaching</option>
                    <option value="Board level & Coaching">Board level & Coaching</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[#5F6368] dark:text-[#9AA0A6] font-medium mb-1">Father / Guardian Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Suresh Pandey"
                    value={stFather}
                    onChange={e => setStFather(e.target.value)}
                    className="w-full border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2C] text-[#202124] dark:text-[#E8EAED] rounded-lg p-2.5"
                  />
                </div>
                <div>
                  <label className="block text-[#5F6368] dark:text-[#9AA0A6] font-medium mb-1">Parent Mobile (+91)</label>
                  <input
                    type="text"
                    required
                    placeholder="+91 98371 00000"
                    value={stPhone}
                    onChange={e => setStPhone(e.target.value)}
                    className="w-full border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2C] text-[#202124] dark:text-[#E8EAED] rounded-lg p-2.5"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#5F6368] dark:text-[#9AA0A6] font-medium mb-1">Initial Batch Assignment</label>
                <select
                  value={stBatchIds[0]}
                  onChange={e => setStBatchIds([e.target.value])}
                  className="w-full border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2C] text-[#202124] dark:text-[#E8EAED] rounded-lg p-2.5 font-medium"
                >
                  {batches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-[#DADCE0] dark:border-[#3C4043]">
                <ConsoleButton
                  type="button"
                  variant="ghost"
                  onClick={() => setShowAddStudentModal(false)}
                >
                  Cancel
                </ConsoleButton>
                <ConsoleButton
                  type="submit"
                  variant="primary"
                >
                  Admit Student
                </ConsoleButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Create Batch */}
      {showAddBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-[#1E1F20] border border-[#DADCE0] dark:border-[#3C4043] w-full max-w-md rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="font-google-sans font-bold text-base text-[#202124] dark:text-[#E8EAED]">
              Create New Coaching Batch
            </h3>
            <form onSubmit={handleCreateBatch} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#5F6368] dark:text-[#9AA0A6] font-medium mb-1">Batch Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Class 11 Chemistry - Target NEET"
                  value={batchName}
                  onChange={e => setBatchName(e.target.value)}
                  className="w-full border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2C] text-[#202124] dark:text-[#E8EAED] rounded-lg p-2.5"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[#5F6368] dark:text-[#9AA0A6] font-medium mb-1">Subject</label>
                  <input
                    type="text"
                    required
                    value={batchSubject}
                    onChange={e => setBatchSubject(e.target.value)}
                    className="w-full border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2C] text-[#202124] dark:text-[#E8EAED] rounded-lg p-2.5"
                  />
                </div>
                <div>
                  <label className="block text-[#5F6368] dark:text-[#9AA0A6] font-medium mb-1">Monthly Fee (₹)</label>
                  <input
                    type="number"
                    required
                    value={batchFee}
                    onChange={e => setBatchFee(Number(e.target.value))}
                    className="w-full border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2C] text-[#202124] dark:text-[#E8EAED] rounded-lg p-2.5 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#5F6368] dark:text-[#9AA0A6] font-medium mb-1">Assigned Teacher</label>
                <select
                  value={batchTeacherId}
                  onChange={e => setBatchTeacherId(e.target.value)}
                  className="w-full border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2C] text-[#202124] dark:text-[#E8EAED] rounded-lg p-2.5"
                >
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.qualification})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[#5F6368] dark:text-[#9AA0A6] font-medium mb-1">Classroom</label>
                  <input
                    type="text"
                    value={batchRoom}
                    onChange={e => setBatchRoom(e.target.value)}
                    className="w-full border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2C] text-[#202124] dark:text-[#E8EAED] rounded-lg p-2.5"
                  />
                </div>
                <div>
                  <label className="block text-[#5F6368] dark:text-[#9AA0A6] font-medium mb-1">Time Slot</label>
                  <input
                    type="text"
                    value={batchTime}
                    onChange={e => setBatchTime(e.target.value)}
                    className="w-full border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2C] text-[#202124] dark:text-[#E8EAED] rounded-lg p-2.5"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-[#DADCE0] dark:border-[#3C4043]">
                <ConsoleButton
                  type="button"
                  variant="ghost"
                  onClick={() => setShowAddBatchModal(false)}
                >
                  Cancel
                </ConsoleButton>
                <ConsoleButton
                  type="submit"
                  variant="primary"
                >
                  Create Batch
                </ConsoleButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2.5: Add Faculty / Teacher */}
      {showAddTeacherModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-[#1E1F20] border border-[#DADCE0] dark:border-[#3C4043] w-full max-w-md rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="font-google-sans font-bold text-base text-[#202124] dark:text-[#E8EAED]">
              Add Faculty Member
            </h3>
            <form onSubmit={handleCreateTeacher} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#5F6368] dark:text-[#9AA0A6] font-medium mb-1">Teacher Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Prof. Ankit Verma"
                  value={teacherName}
                  onChange={e => setTeacherName(e.target.value)}
                  className="w-full border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2C] text-[#202124] dark:text-[#E8EAED] rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-[#FFA000]/40"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[#5F6368] dark:text-[#9AA0A6] font-medium mb-1">Mobile Contact (+91)</label>
                  <input
                    type="text"
                    required
                    placeholder="+91 98765 43210"
                    value={teacherPhone}
                    onChange={e => setTeacherPhone(e.target.value)}
                    className="w-full border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2C] text-[#202124] dark:text-[#E8EAED] rounded-lg p-2.5"
                  />
                </div>
                <div>
                  <label className="block text-[#5F6368] dark:text-[#9AA0A6] font-medium mb-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="teacher@coaching.in"
                    value={teacherEmail}
                    onChange={e => setTeacherEmail(e.target.value)}
                    className="w-full border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2C] text-[#202124] dark:text-[#E8EAED] rounded-lg p-2.5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[#5F6368] dark:text-[#9AA0A6] font-medium mb-1">Primary Subject(s)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mathematics, Physics"
                    value={teacherSubject}
                    onChange={e => setTeacherSubject(e.target.value)}
                    className="w-full border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2C] text-[#202124] dark:text-[#E8EAED] rounded-lg p-2.5"
                  />
                </div>
                <div>
                  <label className="block text-[#5F6368] dark:text-[#9AA0A6] font-medium mb-1">Qualification</label>
                  <input
                    type="text"
                    placeholder="e.g. M.Sc, B.Ed (Gold Medalist)"
                    value={teacherQualification}
                    onChange={e => setTeacherQualification(e.target.value)}
                    className="w-full border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2C] text-[#202124] dark:text-[#E8EAED] rounded-lg p-2.5"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#5F6368] dark:text-[#9AA0A6] font-medium mb-1">Monthly Remuneration / Salary (₹)</label>
                <input
                  type="number"
                  placeholder="35000"
                  value={teacherSalary}
                  onChange={e => setTeacherSalary(Number(e.target.value))}
                  className="w-full border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2C] text-[#202124] dark:text-[#E8EAED] rounded-lg p-2.5 font-mono"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-[#DADCE0] dark:border-[#3C4043]">
                <ConsoleButton
                  type="button"
                  variant="ghost"
                  onClick={() => setShowAddTeacherModal(false)}
                >
                  Cancel
                </ConsoleButton>
                <ConsoleButton
                  type="submit"
                  variant="primary"
                >
                  Save Faculty Profile
                </ConsoleButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Collect Fee */}
      {showCollectFeeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-[#1E1F20] border border-[#DADCE0] dark:border-[#3C4043] w-full max-w-md rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="font-google-sans font-bold text-base text-[#202124] dark:text-[#E8EAED]">
              Record Fee Collection
            </h3>
            <form onSubmit={handleConfirmFeeCollection} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#5F6368] dark:text-[#9AA0A6] font-medium mb-1">Select Pending Invoice</label>
                <select
                  value={selectedInvoiceToCollect}
                  onChange={e => setSelectedInvoiceToCollect(e.target.value)}
                  className="w-full border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2C] text-[#202124] dark:text-[#E8EAED] rounded-lg p-2.5 font-medium"
                >
                  {invoices.map(inv => {
                    const st = students.find(s => s.id === inv.studentId);
                    return (
                      <option key={inv.id} value={inv.id}>
                        {st?.name} · {inv.monthYear} (Due: ₹{inv.netAmount - inv.paidAmount})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[#5F6368] dark:text-[#9AA0A6] font-medium mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    value={collectAmount}
                    onChange={e => setCollectAmount(Number(e.target.value))}
                    className="w-full border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2C] text-[#202124] dark:text-[#E8EAED] rounded-lg p-2.5 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[#5F6368] dark:text-[#9AA0A6] font-medium mb-1">Payment Method</label>
                  <select
                    value={collectMethod}
                    onChange={e => setCollectMethod(e.target.value as any)}
                    className="w-full border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2C] text-[#202124] dark:text-[#E8EAED] rounded-lg p-2.5 font-medium"
                  >
                    <option value="UPI">UPI / QR Code</option>
                    <option value="Cash">Cash at Center</option>
                    <option value="NetBanking">Net Banking / NEFT</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[#5F6368] dark:text-[#9AA0A6] font-medium mb-1">Transaction Ref / UTR / Note</label>
                <input
                  type="text"
                  placeholder="e.g. 428198273619 or Receipt Slip No"
                  value={collectUtr}
                  onChange={e => setCollectUtr(e.target.value)}
                  className="w-full border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2C] text-[#202124] dark:text-[#E8EAED] rounded-lg p-2.5"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-[#DADCE0] dark:border-[#3C4043]">
                <ConsoleButton
                  type="button"
                  variant="ghost"
                  onClick={() => setShowCollectFeeModal(false)}
                >
                  Cancel
                </ConsoleButton>
                <ConsoleButton
                  type="submit"
                  variant="primary"
                >
                  Confirm & Generate Receipt
                </ConsoleButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Broadcast Notice */}
      {showNewNoticeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-[#1E1F20] border border-[#DADCE0] dark:border-[#3C4043] w-full max-w-md rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="font-google-sans font-bold text-base text-[#202124] dark:text-[#E8EAED]">
              Broadcast Notice
            </h3>
            <form onSubmit={handleCreateNotice} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#5F6368] dark:text-[#9AA0A6] font-medium mb-1">Notice Heading</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Diwali Holiday Announcement & Practice Schedule"
                  value={noticeTitle}
                  onChange={e => setNoticeTitle(e.target.value)}
                  className="w-full border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2C] text-[#202124] dark:text-[#E8EAED] rounded-lg p-2.5"
                />
              </div>

              <div>
                <label className="block text-[#5F6368] dark:text-[#9AA0A6] font-medium mb-1">Target Audience</label>
                <select
                  value={noticeAudience}
                  onChange={e => setNoticeAudience(e.target.value as any)}
                  className="w-full border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2C] text-[#202124] dark:text-[#E8EAED] rounded-lg p-2.5"
                >
                  <option value="parents">Parents Only</option>
                  <option value="students">Students Only</option>
                  <option value="all">Everyone (Parents, Students & Teachers)</option>
                </select>
              </div>

              <div>
                <label className="block text-[#5F6368] dark:text-[#9AA0A6] font-medium mb-1">Notice Content</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Details of the announcement..."
                  value={noticeContent}
                  onChange={e => setNoticeContent(e.target.value)}
                  className="w-full border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2C] text-[#202124] dark:text-[#E8EAED] rounded-lg p-2.5"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-[#DADCE0] dark:border-[#3C4043]">
                <ConsoleButton
                  type="button"
                  variant="ghost"
                  onClick={() => setShowNewNoticeModal(false)}
                >
                  Cancel
                </ConsoleButton>
                <ConsoleButton
                  type="submit"
                  variant="primary"
                >
                  Publish Announcement
                </ConsoleButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: Upload Study Material (Firebase Cloud Storage) */}
      {showUploadMaterialModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-[#1E1F20] border border-[#DADCE0] dark:border-[#3C4043] w-full max-w-md rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-google-sans font-bold text-base text-[#202124] dark:text-[#E8EAED] flex items-center gap-2">
                <Upload className="w-4 h-4 text-[#FFA000]" />
                Upload Study Resource
              </h3>
              <StatusChip label="Firebase Storage" variant="success" size="xs" />
            </div>

            <form onSubmit={handleUploadMaterial} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#5F6368] dark:text-[#9AA0A6] font-medium mb-1">
                  Resource Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chapter 4 Quadratic Equations Formulas & Notes"
                  value={materialTitle}
                  onChange={e => setMaterialTitle(e.target.value)}
                  className="w-full border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2C] text-[#202124] dark:text-[#E8EAED] rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-[#FFA000]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#5F6368] dark:text-[#9AA0A6] font-medium mb-1">
                    Subject *
                  </label>
                  <select
                    value={materialSubject}
                    onChange={e => setMaterialSubject(e.target.value)}
                    className="w-full border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2C] text-[#202124] dark:text-[#E8EAED] rounded-lg p-2.5"
                  >
                    <option value="Mathematics">Mathematics</option>
                    <option value="Physics">Physics</option>
                    <option value="Chemistry">Chemistry</option>
                    <option value="Biology">Biology</option>
                    <option value="English">English</option>
                    <option value="General Science">General Science</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[#5F6368] dark:text-[#9AA0A6] font-medium mb-1">
                    Format *
                  </label>
                  <select
                    value={materialType}
                    onChange={e => setMaterialType(e.target.value as any)}
                    className="w-full border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2C] text-[#202124] dark:text-[#E8EAED] rounded-lg p-2.5"
                  >
                    <option value="pdf">PDF Document</option>
                    <option value="notes">Lecture Notes</option>
                    <option value="practice_sheet">Practice Paper / DPP</option>
                    <option value="video">Video Lecture</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[#5F6368] dark:text-[#9AA0A6] font-medium mb-1">
                  Chapter / Topic
                </label>
                <input
                  type="text"
                  placeholder="e.g. Thermodynamics, Coordinate Geometry"
                  value={materialChapter}
                  onChange={e => setMaterialChapter(e.target.value)}
                  className="w-full border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2C] text-[#202124] dark:text-[#E8EAED] rounded-lg p-2.5"
                />
              </div>

              <div>
                <label className="block text-[#5F6368] dark:text-[#9AA0A6] font-medium mb-1">
                  Target Batch (Optional)
                </label>
                <select
                  value={materialBatchId}
                  onChange={e => setMaterialBatchId(e.target.value)}
                  className="w-full border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2C] text-[#202124] dark:text-[#E8EAED] rounded-lg p-2.5"
                >
                  <option value="">All Batches (Public)</option>
                  {batches.map(b => (
                    <option key={b.id} value={b.id}>{b.name} ({b.standard})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[#5F6368] dark:text-[#9AA0A6] font-medium mb-1">
                  Choose File (PDF, DOCX, ZIP, MP4)
                </label>
                <input
                  type="file"
                  onChange={e => {
                    if (e.target.files && e.target.files[0]) {
                      setMaterialFile(e.target.files[0]);
                    }
                  }}
                  className="w-full border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2C] text-[#202124] dark:text-[#E8EAED] rounded-lg p-2 file:mr-3 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[#FFA000] file:text-black hover:file:opacity-90 cursor-pointer"
                />
                <p className="text-[10px] text-[#5F6368] dark:text-[#9AA0A6] mt-1">
                  Uploaded securely to Google Firebase Cloud Storage bucket. Max recommended: 25MB.
                </p>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-[#DADCE0] dark:border-[#3C4043]">
                <ConsoleButton
                  type="button"
                  variant="ghost"
                  disabled={uploadingMaterial}
                  onClick={() => setShowUploadMaterialModal(false)}
                >
                  Cancel
                </ConsoleButton>
                <ConsoleButton
                  type="submit"
                  variant="primary"
                  loading={uploadingMaterial}
                  disabled={uploadingMaterial}
                  icon={<Upload className="w-3.5 h-3.5" />}
                >
                  {uploadingMaterial ? 'Uploading to Firebase...' : 'Upload Resource'}
                </ConsoleButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Student CSV / Excel Import Modal */}
      <BulkStudentImportModal
        isOpen={showBulkImportModal}
        onClose={() => setShowBulkImportModal(false)}
      />

      {/* Edit Person Profile Modal */}
      {editingPerson && (
        <EditProfileModal
          isOpen={!!editingPerson}
          targetUser={editingPerson}
          onClose={() => setEditingPerson(null)}
        />
      )}
    </div>
  );
};
