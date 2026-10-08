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
  Edit2,
  Eye,
  EyeOff,
  KeyRound,
  UserCog,
  IdCard,
  X,
  Loader2
} from 'lucide-react';
import { IndianBoard, AttendanceStatus, Batch, FeeInvoice, StudyMaterial, User, Teacher, Student, Inquiry, ExamKind } from '../../types';
import { uploadFileToStorage } from '../../lib/firebase';
import {
  EXAM_KINDS,
  EXAM_KIND_LABEL,
  parseExternalRankSheet,
  externalStats
} from '../../lib/exams';
import {
  buildInstallments,
  allocatePayment,
  invoiceStatusFromInstallments,
  installmentsSummary,
  installmentBalance,
  nextPaymentDueDate,
  nextPaymentDueAmount,
  formatInstallmentStatus,
  isInstallmentOverdue,
  INSTALLMENT_INTERVAL_PRESETS,
  MIN_INSTALLMENTS,
  MAX_INSTALLMENTS,
  DEFAULT_INSTALLMENT_INTERVAL_DAYS
} from '../../lib/installments';
import { EditProfileModal } from '../profile/EditProfileModal';
import { BulkStudentImportModal } from './BulkStudentImportModal';
import { StudentIdCardModal } from '../documents/StudentIdCardModal';
import { TransferCertificateModal } from '../documents/TransferCertificateModal';
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
import { AuditTrailModule } from './AuditTrailModule';
import { InquiriesModule } from './InquiriesModule';
import { LeavesModule } from './LeavesModule';
import { StaffOpsModule } from '../staffops/StaffOpsModule';
import { FinanceModule } from '../finance/FinanceModule';
import { TimetableModule } from '../timetable/TimetableModule';
import { SyllabusOverview } from '../syllabus/SyllabusOverview';
import { PtmAdminPanel } from '../ptm/PtmAdminPanel';
import { getIndiaDateString } from '../../lib/date';
import { motion, AnimatePresence } from 'motion/react';

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
  syllabus: { label: 'Syllabus Coverage Tracker', breadcrumb: 'Syllabus', subtitle: 'Chapter-by-chapter lesson-plan coverage per batch — generate from a board template and watch it get ticked off' },
  ptm: { label: 'Parent–Teacher Meetings (PTM)', breadcrumb: 'PTM', subtitle: 'Open a meeting window, cut it into bookable slots per teacher, and watch parents fill the grid — with day-of reminders' },
  teachers: { label: 'Faculty & Teachers Directory', breadcrumb: 'Teachers', subtitle: 'Instructor profiles, assigned subjects, contact details, and teaching schedules' },
  inquiries: { label: 'Admission Leads Pipeline', breadcrumb: 'Inquiries', subtitle: 'Walk-ins, calls & WhatsApp enquiries tracked from first hello to final admission' },
  leaves: { label: 'Leave Requests & Absences', breadcrumb: 'Leaves', subtitle: 'Absence asks from students & faculty — review, decide, and keep the centre register' },
  staffops: { label: 'Staff Operations & Salary', breadcrumb: 'Staff Ops', subtitle: 'Faculty daily attendance grid, month-end salary slips, and pay-now settlement' },
  finance: { label: 'Profit & Loss · Expenses', breadcrumb: 'Profit & Loss', subtitle: 'Money in vs money out per month — record rent, bills, salaries and see if the centre is profitable' },
  parents: { label: 'Parents & Guardians Directory', breadcrumb: 'Parents', subtitle: 'Direct communication channels, child linkages, and fee receipt sharing' },
  announcements: { label: 'Announcements & Broadcast System', breadcrumb: 'Announcements', subtitle: 'Publish urgent notices, holiday schedules, and WhatsApp broadcast templates' },
  discussions: { label: 'VidyaChat · Institute Slack Channels', breadcrumb: 'VidyaChat', subtitle: 'Real-time communication across batches, faculty lounge, parent desk & student doubt channels' },
  messages: { label: 'VidyaChat · Institute Slack Channels', breadcrumb: 'VidyaChat', subtitle: 'Real-time communication across batches, faculty lounge, parent desk & student doubt channels' },
  analytics: { label: 'Coaching Center Analytics', breadcrumb: 'Analytics', subtitle: 'Detailed insights into student attendance, test score distribution, and fee recovery' },
  reports: { label: 'Academic & Fee Reports', breadcrumb: 'Reports', subtitle: 'Download audit trails, monthly fee collection ledgers, and student rosters' },
  audit: { label: 'Audit Trail & Secure Backup', breadcrumb: 'Audit Trail', subtitle: 'Complete append-only change history with CSV export and one-click tenant backup' },
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
    pendingPaymentSubmissions,
    exams,
    examResults,
    announcements,
    addStudent,
    deleteStudent,
    addBatch,
    updateBatch,
    enrollStudentInBatch,
    removeStudentFromBatch,
    addTeacher,
    updateTeacher,
    deleteTeacher,
    deduplicateTeachers,
    markAttendance,
    markBatchAllPresent,
    recordPayment,
    verifyPayment,
    rejectPayment,
    createInvoice,
    createExam,
    importExternalResults,
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
    showToast,
    recordAudit,
    markInquiryConverted
  } = useApp();

  const { navigate } = useRouter();
  const { currentUser, registerUserCredentials, linkStudentToParent } = useAuth();
  const isStaff = currentUser?.role === 'STAFF';
  // Staff see faculty salaries? No — pay stays owner/admin-only at the UI level
  // (the rules still permit staff writes per spec; this is product philosophy
  // matching the 'teachers' directory restriction).
  const STAFF_RESTRICTED_MODULES = ['teachers', 'staffops', 'finance', 'analytics', 'reports', 'audit', 'settings', 'subscription', 'syllabus'];

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
  // F9 — print flows: the student whose ID card / TC modal is open.
  const [idCardStudent, setIdCardStudent] = useState<Student | null>(null);
  const [tcStudent, setTcStudent] = useState<Student | null>(null);
  // F2 conversion handoff — set when the Inquiries board asks to admit a lead.
  // handleCreateStudent consumes it to mark the inquiry joined + linked after the
  // admission succeeds.
  const [inquiryPendingConversion, setInquiryPendingConversion] = useState<Inquiry | null>(null);
  const [showBulkImportModal, setShowBulkImportModal] = useState<boolean>(false);
  const [showAddBatchModal, setShowAddBatchModal] = useState<boolean>(false);
  const [showAddTeacherModal, setShowAddTeacherModal] = useState<boolean>(false);
  // Student batch enrollment modal — the student whose roster is being managed.
  const [enrollingStudentId, setEnrollingStudentId] = useState<string | null>(null);
  const [enrollingBatchId, setEnrollingBatchId] = useState<string | null>(null);
  const [teacherName, setTeacherName] = useState<string>('');
  const [teacherEmail, setTeacherEmail] = useState<string>('');
  const [teacherPhone, setTeacherPhone] = useState<string>('');
  const [teacherPassword, setTeacherPassword] = useState<string>('');
  const [showTeacherPassword, setShowTeacherPassword] = useState<boolean>(false);
  const [teacherQualification, setTeacherQualification] = useState<string>('B.Tech / M.Sc');
  const [teacherSubject, setTeacherSubject] = useState<string>('Mathematics');
  const [teacherSalary, setTeacherSalary] = useState<number>(35000);
  const [showCollectFeeModal, setShowCollectFeeModal] = useState<boolean>(false);
  const [showNewExamModal, setShowNewExamModal] = useState<boolean>(false);
  // F10 — new exam form fields (kind + all-India flag).
  const [examTitle, setExamTitle] = useState<string>('');
  const [examSubject, setExamSubject] = useState<string>('Mathematics');
  const [examBatchId, setExamBatchId] = useState<string>(batches[0]?.id || '');
  const [examDate, setExamDate] = useState<string>(() => getIndiaDateString());
  const [examTimeSlot, setExamTimeSlot] = useState<string>('05:00 PM - 06:30 PM');
  const [examMaxMarks, setExamMaxMarks] = useState<number>(100);
  const [examPassingMarks, setExamPassingMarks] = useState<number>(33);
  const [examKind, setExamKind] = useState<ExamKind>('mock');
  const [examIsAllIndia, setExamIsAllIndia] = useState<boolean>(true);
  // F10 — bulk all-India ranking sheet paste.
  const [airExamId, setAirExamId] = useState<string | null>(null);
  const [showImportAirModal, setShowImportAirModal] = useState<boolean>(false);
  const [airSheet, setAirSheet] = useState<string>('');
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

  // F11 — raise a fresh invoice, optionally split into a dated instalment plan.
  const [showGenerateInvoiceModal, setShowGenerateInvoiceModal] = useState<boolean>(false);
  const [genStudentId, setGenStudentId] = useState<string>('');
  const [genTitle, setGenTitle] = useState<string>('');
  const [genMonthYear, setGenMonthYear] = useState<string>(() =>
    new Date().toLocaleString('en-IN', { month: 'long', year: 'numeric' })
  );
  const [genAmount, setGenAmount] = useState<number>(6000);
  const [genDiscount, setGenDiscount] = useState<number>(0);
  const [genDueDate, setGenDueDate] = useState<string>(() => getIndiaDateString());
  const [genSplit, setGenSplit] = useState<boolean>(true);
  const [genCount, setGenCount] = useState<number>(3);
  const [genIntervalDays, setGenIntervalDays] = useState<number>(DEFAULT_INSTALLMENT_INTERVAL_DAYS);
  // F11 — per-invoice instalment timeline.
  const [installmentInvoiceId, setInstallmentInvoiceId] = useState<string | null>(null);
  const [showInstallmentsModal, setShowInstallmentsModal] = useState<boolean>(false);

  // Vacate / Remove confirmation states
  const [teacherToVacate, setTeacherToVacate] = useState<Teacher | null>(null);
  const [studentToVacate, setStudentToVacate] = useState<Student | null>(null);

  const handleConfirmVacateTeacher = () => {
    if (!teacherToVacate) return;
    const t = teacherToVacate;
    batches.forEach(b => {
      if (b.teacherId === t.id) {
        updateBatch(b.id, { teacherId: '' });
      }
    });
    deleteTeacher(t.id);
    recordAudit({
      action: 'delete',
      targetType: 'teacher',
      targetId: t.id,
      summary: `Removed faculty "${t.name}" from the directory and unassigned them from active batches.`
    });
    showToast(`Faculty member "${t.name}" has been vacated and unassigned from active batches.`, 'success');
    setTeacherToVacate(null);
  };

  const handleConfirmVacateStudent = () => {
    if (!studentToVacate) return;
    const s = studentToVacate;
    deleteStudent(s.id);
    recordAudit({
      action: 'delete',
      targetType: 'student',
      targetId: s.id,
      summary: `Vacated student "${s.name}" (${s.classGrade}) and removed them from the institute roster.`
    });
    showToast(`Student "${s.name}" has been vacated and removed from institute roster.`, 'success');
    setStudentToVacate(null);
  };

  const handleCleanDuplicates = () => {
    const res = deduplicateTeachers();
    if (res.removedCount > 0) {
      showToast(`Cleaned up ${res.removedCount} duplicate faculty record(s). Merged into ${res.mergedCount} active faculty.`, 'success');
    } else {
      showToast('No duplicate faculty records found in your database. All records are unique.', 'info');
    }
  };

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

      const createdMaterial = addStudyMaterial({
        title: materialTitle.trim(),
        subject: materialSubject,
        type: materialType,
        fileUrl: downloadUrl,
        fileSize,
        uploadedByTeacherId: teachers[0]?.id || 'teach-admin',
        chapterTopic: materialChapter.trim() || undefined,
        batchId: materialBatchId || undefined
      });

      recordAudit({
        action: 'create',
        targetType: 'material',
        targetId: createdMaterial.id,
        summary: `Uploaded study material "${materialTitle.trim()}" (${materialType}) for ${materialSubject}${materialBatchId ? ' to a batch' : ''}.`
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

  // F10 — schedule a test. Unit exams never carry an all-India flag.
  const handleCreateExam = (e: React.FormEvent) => {
    e.preventDefault();
    const title = examTitle.trim();
    if (!title || !examBatchId) return;
    const batch = batches.find(b => b.id === examBatchId);
    const created = createExam({
      branchId: batch?.branchId || currentOrg.branches?.[0]?.id || 'branch-1',
      batchId: examBatchId,
      title,
      subject: examSubject,
      examDate,
      timeSlot: examTimeSlot,
      maxMarks: examMaxMarks,
      passingMarks: examPassingMarks,
      status: 'upcoming',
      examKind,
      isAllIndia: examKind === 'unit' ? false : examIsAllIndia
    });
    recordAudit({
      action: 'create',
      targetType: 'exam',
      targetId: created.id,
      summary: `Scheduled ${EXAM_KIND_LABEL[examKind]} "${title}" for ${batch?.name || 'a batch'}${created.isAllIndia ? ' with all-India rank' : ''}.`
    });
    showToast(
      `${EXAM_KIND_LABEL[examKind]} scheduled${created.isAllIndia ? ' — import the ranking sheet once results are out' : ''}.`,
      'success'
    );
    setShowNewExamModal(false);
    setExamTitle('');
  };

  // F10 — paste an external ranking sheet and publish all-India ranks.
  const parsedAirSheet = useMemo(
    () => (showImportAirModal ? parseExternalRankSheet(airSheet, students) : { rows: [], errors: [] }),
    [showImportAirModal, airSheet, students]
  );

  const handleImportAir = (e: React.FormEvent) => {
    e.preventDefault();
    if (!airExamId) return;
    const { rows, errors } = parseExternalRankSheet(airSheet, students);
    if (rows.length === 0) {
      showToast(errors[0] || 'No valid rank rows found in the pasted sheet.', 'warning');
      return;
    }
    const { updated, created } = importExternalResults(airExamId, rows);
    recordAudit({
      action: 'update',
      targetType: 'exam',
      targetId: airExamId,
      summary: `Imported all-India ranks for ${updated + created} student(s)${errors.length ? `, ${errors.length} line(s) skipped` : ''}.`
    });
    showToast(
      `AIR published — ${updated + created} student(s) updated.${errors.length ? ` ${errors.length} line(s) skipped.` : ''}`,
      errors.length ? 'warning' : 'success'
    );
    setShowImportAirModal(false);
    setAirExamId(null);
    setAirSheet('');
  };

  // Attendance state
  const [attDate, setAttDate] = useState<string>(() => getIndiaDateString());
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
  // Student identity + optional login credentials. Logins are keyed on the 10-digit
  // mobile number, so the student needs a number of their own — reusing the
  // parent's would make both Firebase accounts collide.
  const [stStudentPhone, setStStudentPhone] = useState<string>('');
  const [stGender, setStGender] = useState<'' | 'Male' | 'Female' | 'Other'>('');
  const [stStudentPassword, setStStudentPassword] = useState<string>('');
  const [stParentPassword, setStParentPassword] = useState<string>('');
  const [showAdmissionPasswords, setShowAdmissionPasswords] = useState<boolean>(false);
  const [isAdmitting, setIsAdmitting] = useState<boolean>(false);

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

    recordAudit({
      action: 'update',
      targetType: 'settings',
      targetId: currentOrg.id,
      summary: `Updated institute profile (name → "${cleanName}", owner → "${cleanOwner}", phone → ${cleanPhone}).`
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

    recordAudit({
      action: 'update',
      targetType: 'settings',
      targetId: currentOrg.id,
      summary: `Updated desk UPI ID to ${cleanUpi} (merchant: ${upiMerchantName.trim() || currentOrg.name}).`
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
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const todayAttendance = attendanceRecords.filter(a => a.date === todayStr || a.date === attDate);
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

  const resetStudentForm = () => {
    setStName('');
    setStFather('');
    setStSchool('');
    setStPhone('');
    setStStudentPhone('');
    setStGender('');
    setStStudentPassword('');
    setStParentPassword('');
    setStBatchIds(batches[0]?.id ? [batches[0].id] : []);
  };

  // F2 — a lead from the Inquiries board is being admitted. Pre-fill the standard
  // admission form with the details we already captured (name / parent phone /
  // class / board / interested batches), then let the existing flow provision
  // the student + optional logins. The inquiry is marked 'joined' only after the
  // admission actually succeeds (see handleCreateStudent).
  const handleConvertInquiry = (inquiry: Inquiry) => {
    setInquiryPendingConversion(inquiry);
    setStName(inquiry.name);
    const phoneDigits = inquiry.phone.replace(/[^0-9]/g, '').slice(-10);
    setStPhone(phoneDigits || inquiry.phone);
    setStClass(inquiry.classGrade || 'Class 10');
    setStBoard((inquiry.board || 'Board level') as IndianBoard);
    const interestedBatchIds = inquiry.interestedBatchIds?.filter(id => batches.some(b => b.id === id)) || [];
    setStBatchIds(interestedBatchIds.length > 0 ? interestedBatchIds : (batches[0]?.id ? [batches[0].id] : []));
    setStSchool('');
    setStFather('');
    setStGender('');
    setStStudentPhone('');
    setStStudentPassword('');
    setStParentPassword('');
    setShowAdmissionPasswords(false);
    setShowAddStudentModal(true);
  };

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stName.trim() || !stGender) return;

    const studentDigits = stStudentPhone.replace(/[^0-9]/g, '').slice(-10);
    const parentDigits = stPhone.replace(/[^0-9]/g, '').slice(-10);
    const studentPassword = stStudentPassword.trim();
    const parentPassword = stParentPassword.trim();
    const guardianName = stFather.trim();

    if (studentPassword && studentDigits.length !== 10) {
      showToast('Enter a 10-digit student mobile number to create a student login.', 'error');
      return;
    }
    if (parentPassword && parentDigits.length !== 10) {
      showToast('Enter a 10-digit parent mobile number to create a parent login.', 'error');
      return;
    }
    if (parentPassword && !guardianName) {
      showToast('Enter the guardian name before creating a parent login.', 'error');
      return;
    }
    if (studentDigits && parentDigits && studentDigits === parentDigits) {
      showToast('Student and parent mobile numbers must differ — login accounts are keyed on mobile number.', 'error');
      return;
    }

    setIsAdmitting(true);
    try {
      // Step 1: provision Firebase Auth accounts. Done before the student record so
      // the guardian link can be written in a single pass afterwards.
      //
      // The two accounts are treated independently: if the parent login fails, the
      // admission still goes ahead. Aborting here would strand an Auth account with
      // no student record behind it, and that mobile number would then be taken by
      // an account nobody can use.
      let studentAuthUid: string | undefined;
      let parentAuthUid: string | undefined;
      let parentLoginError: string | undefined;
      const describeCredError = (credErr: unknown) => {
        const msg = credErr instanceof Error ? credErr.message : String(credErr);
        if (msg.includes('8 characters')) return 'Login passwords must be at least 8 characters long.';
        if (msg.includes('10-digit')) return 'Please enter a valid 10-digit mobile number.';
        return `Could not create login: ${msg}`;
      };

      if (studentPassword) {
        try {
          studentAuthUid = await registerUserCredentials(
            studentDigits, studentPassword, 'STUDENT', stName.trim(), '', currentOrg.id
          );
        } catch (credErr: unknown) {
          // Nothing has been written yet, so it is safe to stop here.
          showToast(describeCredError(credErr), 'error');
          return;
        }
      }
      if (parentPassword) {
        try {
          parentAuthUid = await registerUserCredentials(
            parentDigits, parentPassword, 'PARENT', guardianName, '', currentOrg.id
          );
        } catch (credErr: unknown) {
          parentLoginError = describeCredError(credErr);
        }
      }

      // Step 2: create the student record. Fields the admission form does not collect
      // stay empty rather than being filled with placeholder people/places.
      const orgStudentCount = students.filter(s => s.orgId === currentOrg.id).length;
      const newStudent = addStudent({
        branchId: currentOrg.branches[0]?.id || 'branch-1',
        rollNo: `${stClass.replace('Class ', '').trim()}-${String(orgStudentCount + 1).padStart(2, '0')}`,
        name: stName.trim(),
        gender: stGender,
        classGrade: stClass,
        board: stBoard,
        schoolName: stSchool.trim(),
        dateOfBirth: '',
        admissionDate: new Date().toISOString().split('T')[0],
        phone: studentDigits ? `+91 ${studentDigits}` : stPhone,
        address: '',
        avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(stName.trim())}`,
        batchIds: stBatchIds,
        userId: studentAuthUid,
        guardian: {
          fatherName: guardianName || `${stName.trim()}'s Father`,
          fatherPhone: stPhone,
          parentUserId: parentAuthUid || ''
        },
        status: 'active'
      });

      // Step 3: backfill the parent profile with this child's id.
      if (parentAuthUid) {
        try {
          await linkStudentToParent(parentAuthUid, newStudent.id);
        } catch (linkErr) {
          console.warn('Parent/child link could not be saved:', linkErr);
          showToast('Student admitted, but the parent portal link failed to save — the parent will see an empty dashboard.', 'warning');
        }
      }

      recordAudit({
        action: 'create',
        targetType: 'student',
        targetId: newStudent.id,
        summary: `Admitted ${newStudent.name} (${stClass}, ${stBatchIds.length} batch allocation${stBatchIds.length === 1 ? '' : 's'})${studentAuthUid ? ' with a student login.' : '.'}`
      });

      // F2 — admission started from the Inquiries board: close the loop on the
      // lead — status 'joined' + convertedStudentId + a conversion note.
      if (inquiryPendingConversion) {
        markInquiryConverted(inquiryPendingConversion.id, newStudent.id, newStudent.name);
        recordAudit({
          action: 'verify',
          targetType: 'inquiry',
          targetId: inquiryPendingConversion.id,
          summary: `Admitted lead ${inquiryPendingConversion.name} (${inquiryPendingConversion.phone}) as student ${newStudent.name} — pipeline completed.`
        });
        setInquiryPendingConversion(null);
      }

      setShowAddStudentModal(false);
      resetStudentForm();
      if (parentLoginError) {
        showToast(
          `✓ "${newStudent.name}" admitted, but the parent login was not created — ${parentLoginError}`,
          'warning'
        );
      } else {
        showToast(
          studentAuthUid
            ? `✓ "${newStudent.name}" admitted with a student login.`
            : `✓ "${newStudent.name}" admitted.`,
          'success'
        );
      }
    } finally {
      setIsAdmitting(false);
    }
  };

  const handleCreateBatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchName.trim()) return;

    const newBatch = addBatch({
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

    recordAudit({
      action: 'create',
      targetType: 'batch',
      targetId: newBatch.id,
      summary: `Created batch "${batchName}" (${batchSubject}, ${batchClassGrade}) with monthly fee ₹${batchFee.toLocaleString('en-IN')} in ${batchRoom}.`
    });

    setShowAddBatchModal(false);
    setBatchName('');
  };

  /**
   * Toggle a student's enrolment in one batch from the admin roster manager.
   * Delegates to the shared roster-sync path in StudentContext, which keeps
   * `student.batchIds` and `batch.studentIds` in lockstep before it returns.
   */
  const handleToggleStudentBatch = async (studentId: string, batchId: string) => {
    const enrolled = students.find(s => s.id === studentId)?.batchIds.includes(batchId) || false;
    setEnrollingBatchId(batchId);
    try {
      const result = enrolled
        ? await removeStudentFromBatch(studentId, batchId)
        : await enrollStudentInBatch(studentId, batchId);
      if (result.ok) {
        showToast(
          enrolled ? 'Student removed from the batch.' : 'Student enrolled in the batch.',
          'success'
        );
        const student = students.find(s => s.id === studentId);
        const batch = batches.find(b => b.id === batchId);
        recordAudit({
          action: 'update',
          targetType: 'batch',
          targetId: batchId,
          summary: enrolled
            ? `Removed ${student?.name || 'student'} from batch "${batch?.name || batchId}" (roster sync).`
            : `Enrolled ${student?.name || 'student'} into batch "${batch?.name || batchId}" (roster sync).`
        });
      } else {
        showToast(result.error, 'error');
      }
    } finally {
      setEnrollingBatchId(null);
    }
  };

  const handleCreateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherName.trim()) return;

    const cleanDigits = teacherPhone.replace(/[^0-9]/g, '').slice(-10);
    if (!cleanDigits || cleanDigits.length < 10) {
      showToast('Please enter a valid 10-digit mobile number', 'error');
      return;
    }

    // Check if faculty with this mobile number already exists in current coaching center
    const existingTeacher = teachers.find(t =>
      t.orgId === currentOrg.id &&
      t.phone.replace(/[^0-9]/g, '').slice(-10) === cleanDigits
    );

    if (existingTeacher) {
      showToast(`A faculty member with mobile +91 ${cleanDigits} already exists (${existingTeacher.name}).`, 'info');
      setShowAddTeacherModal(false);
      setTeacherName('');
      setTeacherPhone('');
      setTeacherEmail('');
      return;
    }

    const assignedPassword = teacherPassword.trim();
    if (assignedPassword.length < 8) {
      showToast('Faculty password must be at least 8 characters long.', 'error');
      return;
    }
    const assignedEmail = teacherEmail.trim() || `${teacherName.toLowerCase().replace(/\s+/g, '.')}@${currentOrg.slug || currentOrg.id}.in`;

    // Step 1: Provision Firebase Auth account + Firestore user profile.
    // registerUserCredentials is atomic: if the Firestore write fails after Auth
    // account creation, it throws an error so we don't have orphan records.
    let authUid: string;
    try {
      authUid = await registerUserCredentials(
        cleanDigits,
        assignedPassword,
        'TEACHER',
        teacherName.trim(),
        assignedEmail,
        currentOrg.id
      );
    } catch (credErr: any) {
      const errMsg = credErr instanceof Error ? credErr.message : String(credErr);
      // Provide specific, actionable error messages
      if (errMsg.includes('mobile number already exists')) {
        showToast(`An authentication account with mobile +91 ${cleanDigits} already exists. If this teacher was previously registered, they can log in directly. Otherwise, ask them to reset their password.`, 'error');
      } else if (errMsg.includes('10-digit')) {
        showToast('Please enter a valid 10-digit mobile number for the faculty member.', 'error');
      } else if (errMsg.includes('8 characters')) {
        showToast('The faculty password must be at least 8 characters long.', 'error');
      } else {
        showToast(`Could not create faculty account: ${errMsg}`, 'error');
      }
      return;
    }

    // Step 2: Create teacher profile document in the teachers collection.
    // This references the Firebase Auth UID — no password is ever stored here.
    const newTeacher = addTeacher({
      branchId: currentOrg.branches[0]?.id || 'branch-1',
      userId: authUid,
      name: teacherName.trim(),
      phone: `+91 ${cleanDigits}`,
      email: assignedEmail,
      qualification: teacherQualification.trim() || 'Graduate / Subject Specialist',
      subjects: teacherSubject.split(',').map(s => s.trim()).filter(Boolean),
      salary: teacherSalary || 35000,
      assignedBatchIds: [], // Admin assigns batches separately to avoid unintended assignments
      avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(teacherName)}`,
      status: 'active'
    });

    recordAudit({
      action: 'create',
      targetType: 'teacher',
      targetId: newTeacher.id,
      summary: `Added faculty ${teacherName.trim()} (${assignedEmail}) with monthly salary ₹${(teacherSalary || 35000).toLocaleString('en-IN')}.`
    });

    setShowAddTeacherModal(false);
    setTeacherName('');
    setTeacherEmail('');
    setTeacherPhone('');
    setTeacherPassword('');
    showToast(`✓ Faculty "${teacherName}" added! They can sign in via Mobile (+91 ${cleanDigits}) & Password.`, 'success');
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

  const handleConfirmFeeCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoiceToCollect) return;

    const transactionRef = collectUtr.trim();
    if (collectMethod === 'UPI' && !/^\d{12}$/.test(transactionRef)) {
      showToast('Enter the 12-digit UPI UTR before confirming this payment.', 'error');
      return;
    }
    const inv = invoices.find(i => i.id === selectedInvoiceToCollect);
    if (!inv) {
      showToast('The selected invoice could not be found.', 'error');
      return;
    }

    try {
      const payment = await recordPayment(selectedInvoiceToCollect, {
        amount: Number(collectAmount),
        paymentMethod: collectMethod,
        transactionRef: transactionRef || `CASH-${Date.now()}`
      });
      const paidAmount = Math.round((inv.paidAmount + payment.amount) * 100) / 100;
      const nextInstallments = inv.installments && inv.installments.length
        ? allocatePayment(inv.installments, payment.amount, payment.id).installments
        : inv.installments;
      const settled = nextInstallments && nextInstallments.length
        ? invoiceStatusFromInstallments(nextInstallments) === 'paid'
        : paidAmount >= inv.netAmount;
      const payerName = students.find(s => s.id === inv.studentId)?.name || 'student';
      recordAudit({
        action: 'verify',
        targetType: 'payment',
        targetId: inv.id,
        summary: `Recorded ${collectMethod} payment of ₹${payment.amount.toLocaleString('en-IN')} on invoice ${inv.invoiceNo} for ${payerName} (${settled ? 'invoice settled' : 'partial payment'}).`
      });
      setActiveReceiptInvoice({
        ...inv,
        paidAmount,
        ...(nextInstallments ? { installments: nextInstallments } : {}),
        status: settled ? 'paid' : 'partially_paid',
        payments: [...(inv.payments || []), payment]
      });
      setShowCollectFeeModal(false);
      showToast('Payment recorded and receipt generated.', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not record this payment.', 'error');
    }
  };

  // F11 — raise a fresh invoice, optionally split into dated instalments.
  const handleGenerateInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    const student = students.find(s => s.id === genStudentId);
    if (!student) {
      showToast('Select a student before raising the invoice.', 'error');
      return;
    }
    const amount = Math.max(0, Number(genAmount) || 0);
    const discount = Math.max(0, Number(genDiscount) || 0);
    const net = Math.round((amount - discount) * 100) / 100;
    if (net <= 0) {
      showToast('Enter a fee amount greater than the discount.', 'error');
      return;
    }
    if (!genDueDate) {
      showToast('Pick the first due date for this fee.', 'error');
      return;
    }
    const installments = genSplit
      ? buildInstallments(net, genCount, genDueDate, genIntervalDays)
      : undefined;
    const monthYear = genMonthYear.trim() || new Date().toLocaleString('en-IN', { month: 'long', year: 'numeric' });
    const title = genTitle.trim() || `Coaching Fees — ${monthYear}`;
    const invoice = createInvoice({
      branchId: student.branchId,
      studentId: student.id,
      batchId: student.batchIds?.[0],
      monthYear,
      title,
      amount,
      discount,
      lateFee: 0,
      netAmount: net,
      paidAmount: 0,
      dueDate: genDueDate,
      status: 'pending',
      installments
    });
    recordAudit({
      action: 'create',
      targetType: 'invoice',
      targetId: invoice.id,
      summary: installments
        ? `Raised invoice ${invoice.invoiceNo} for ${student.name} — ₹${net.toLocaleString('en-IN')} split into ${installments.length} instalments.`
        : `Raised fee invoice ${invoice.invoiceNo} of ₹${net.toLocaleString('en-IN')} for ${student.name}.`
    });
    showToast(
      installments
        ? `Invoice ${invoice.invoiceNo} created with ${installments.length} instalments.`
        : `Invoice ${invoice.invoiceNo} generated.`,
      'success'
    );
    setShowGenerateInvoiceModal(false);
    setGenTitle('');
    setGenDiscount(0);
  };

  const openCollectForInstallment = (invoice: FeeInvoice, installmentId: string) => {
    const target = invoice.installments?.find(item => item.id === installmentId);
    if (!target) return;
    setShowInstallmentsModal(false);
    setInstallmentInvoiceId(null);
    setSelectedInvoiceToCollect(invoice.id);
    setCollectAmount(installmentBalance(target));
    setCollectMethod('UPI');
    setCollectUtr('');
    setShowCollectFeeModal(true);
  };

  const installmentInvoice = useMemo(
    () => invoices.find(inv => inv.id === installmentInvoiceId) || null,
    [invoices, installmentInvoiceId]
  );

  const handleCreateNotice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noticeTitle.trim()) return;

    const newNotice = createAnnouncement({
      title: noticeTitle,
      content: noticeContent,
      targetAudience: noticeAudience,
      priority: 'normal',
      channel: ['in-app', 'whatsapp']
    });

    recordAudit({
      action: 'create',
      targetType: 'announcement',
      targetId: newNotice.id,
      summary: `Published notice "${noticeTitle}" to ${noticeAudience} audience.`
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
      <div className="relative overflow-hidden rounded-[30px] border border-black/[0.06] dark:border-white/[0.08] bg-[radial-gradient(circle_at_top_left,_rgba(120,120,128,0.07),_transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.78),rgba(242,242,244,0.96))] dark:bg-[radial-gradient(circle_at_top_left,_rgba(174,174,178,0.06),_transparent_30%),linear-gradient(180deg,rgba(28,28,30,0.98),rgba(17,17,19,0.96))] p-3 sm:p-4">
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
              variant="info"
              size="xs"
            />
          )
        }
        actions={headerActions}
      />
      </div>

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

      {/* Animated module region: keyed by active tab so switching modules
          plays a quick fade-up instead of a hard content swap. Modals live
          outside this wrapper so they are not remounted on tab change. */}
      <motion.div
        key={currentModule}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.26, ease: [0.25, 1, 0.5, 1] }}
      >
      {/* 2. OVERVIEW MODULE */}
      {currentModule === 'overview' && (
        <div className="space-y-6">
          {/* Operational Hub: Aaj Ka Kaam (Apple HIG Glass / Tactile Operational Banner) */}
          <div className="relative overflow-hidden rounded-[26px] border border-[#0071E3]/20 dark:border-[#2997FF]/20 bg-[linear-gradient(135deg,rgba(225,239,255,0.72),rgba(255,255,255,0.96),rgba(242,247,255,0.82))] dark:bg-[linear-gradient(135deg,rgba(24,34,48,0.98),rgba(24,24,24,0.9),rgba(20,20,20,0.92))] border-l-4 border-l-[#0071E3] dark:border-l-[#2997FF] p-4 sm:p-5 shadow-[0_12px_30px_rgba(0,0,0,0.04)] dark:shadow-[0_12px_30px_rgba(0,0,0,0.35)] space-y-4">
            <div className="absolute inset-y-0 right-0 w-32 bg-[radial-gradient(circle_at_center,_rgba(120,120,128,0.08),_transparent_65%)]"></div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 relative z-10">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-xl bg-[#0071E3]/10 text-[#0071E3] dark:bg-[#2997FF]/15 dark:text-[#2997FF] flex items-center justify-center flex-shrink-0">
                  <Zap className="w-4 h-4 fill-current stroke-[2.5]" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="font-apple-display font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                      Daily Action Center · Aaj Ka Kaam
                    </h3>
                    <StatusChip label="PRIORITY" variant="info" size="xs" />
                  </div>
                  <p className="text-xs text-slate-500 dark:text-neutral-400">
                    Immediate attendance and pending fee recoveries for {currentOrg.name}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2 text-xs font-mono text-slate-500 dark:text-neutral-400 self-start sm:self-auto bg-black/[0.03] dark:bg-white/[0.04] px-2.5 py-1 rounded-xl border border-black/[0.06] dark:border-white/[0.08]">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>UPI: <strong className="text-slate-900 dark:text-white">{currentOrg.upiId}</strong></span>
              </div>
            </div>

            {/* Sub-actions Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
              {/* Batch Attendance Action */}
              <div className="bg-black/[0.02] dark:bg-[#2C2C2E]/60 p-4 rounded-xl border border-black/[0.08] dark:border-white/[0.08] flex flex-col justify-between space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                      Batch Attendance Roster
                    </span>
                    <h4 className="font-bold font-apple-display text-sm text-slate-900 dark:text-white mt-0.5">
                      {todayBatch ? todayBatch.name : 'No batches created yet'}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-neutral-400">
                      {todayBatch
                        ? `${todayBatch.timeSlot} · ${todayBatch.studentIds.length} students enrolled`
                        : 'Set up batches to schedule rosters and track attendance.'}
                    </p>
                  </div>
                  <Clock className="w-4 h-4 text-slate-400 dark:text-neutral-500" />
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-black/[0.06] dark:border-white/[0.08]">
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
                          icon={<MessageSquare className="w-3.5 h-3.5 text-emerald-600" />}
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
              <div className="bg-black/[0.02] dark:bg-[#2C2C2E]/60 p-4 rounded-xl border border-black/[0.08] dark:border-white/[0.08] flex flex-col justify-between space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#0071E3] dark:text-[#2997FF]">
                      Monthly Fee Recovery
                    </span>
                    <h4 className="font-bold font-apple-display text-sm text-slate-900 dark:text-white mt-0.5 tabular-nums">
                      {topDueStudent && topDueInvoice
                        ? `${topDueStudent.name} (Due: ₹${(((topDueInvoice.netAmount ?? 0) - (topDueInvoice.paidAmount ?? 0))).toLocaleString('en-IN')})`
                        : students.length === 0
                        ? 'No students enrolled yet'
                        : pendingInvoices.length === 0
                        ? 'All Monthly Dues Cleared'
                        : 'No pending fee recoveries'}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-neutral-400">
                      {students.length === 0
                        ? 'Enroll students to issue digital UPI fee invoices.'
                        : `${pendingInvoices.length} parents with unpaid fee balances`}
                    </p>
                  </div>
                  <CreditCard className="w-4 h-4 text-[#0071E3] dark:text-[#2997FF]" />
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-black/[0.06] dark:border-white/[0.08]">
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
                        icon={<QrCode className="w-3.5 h-3.5 text-emerald-600" />}
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
              subtext={`${pendingInvoices.length} pending collections`}
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
                    <div className="text-[10px] text-[#5F6368] dark:text-[#9AA0A6] flex items-center gap-1.5 flex-wrap">
                      <span>Roll: {s.rollNo}</span>
                      <span>·</span>
                      <span className="font-mono">{s.enrollmentNo}</span>
                      <span className="font-mono text-[9px] text-[#1A73E8] dark:text-[#8AB4F8] bg-[#E8F0FE] dark:bg-[#1E3A5F] px-1 py-0.5 rounded border border-[#1A73E8]/20 dark:border-[#8AB4F8]/20">
                        UID: {s.userId || s.id}
                      </span>
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
                    variant="danger"
                    size="xs"
                    icon={<Trash2 className="w-3 h-3 text-[#D93025]" />}
                    onClick={() => setStudentToVacate(s)}
                    title="Vacate Student"
                  />
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
                    icon={<UserCog className="w-3 h-3 text-[#EA580C]" />}
                    onClick={() => setEnrollingStudentId(s.id)}
                    title="Manage batch enrollment"
                  >
                    Manage
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
                  <ConsoleButton
                    variant="secondary"
                    size="xs"
                    icon={<IdCard className="w-3 h-3 text-[#1A73E8]" />}
                    onClick={() => setIdCardStudent(s)}
                    title="Print student ID card"
                  >
                    ID Card
                  </ConsoleButton>
                  <ConsoleButton
                    variant="secondary"
                    size="xs"
                    icon={<FileText className="w-3 h-3 text-[#EA580C]" />}
                    onClick={() => setTcStudent(s)}
                    title="Issue Transfer Certificate"
                  >
                    TC
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
            <div className="space-y-4">
            {pendingPaymentSubmissions.some(submission => submission.status === 'pending_verification') && (
              <ConsoleCard
                title="UPI Reports Awaiting Verification"
                subtitle="Check each transfer in your bank or UPI account before settling it."
                icon={<ShieldCheck className="w-4 h-4" />}
              >
                <div className="divide-y divide-[#DADCE0] dark:divide-[#3C4043]">
                  {pendingPaymentSubmissions
                    .filter(submission => submission.status === 'pending_verification')
                    .map(submission => {
                      const student = students.find(item => item.id === submission.studentId);
                      const invoice = invoices.find(item => item.id === submission.invoiceId);
                      return (
                        <div key={submission.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="min-w-0 text-xs">
                            <div className="font-bold text-[#202124] dark:text-[#E8EAED]">
                              {student?.name || 'Student'} · ₹{submission.amount.toLocaleString('en-IN')}
                            </div>
                            <div className="text-[#5F6368] dark:text-[#9AA0A6]">
                              {invoice?.invoiceNo || submission.invoiceId} · UTR <span className="font-mono">{submission.transactionRef}</span>
                            </div>
                            <div className="text-[#5F6368] dark:text-[#9AA0A6]">
                              Submitted by {submission.submittedByName} · {new Date(submission.submittedAt).toLocaleString('en-IN')}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <ConsoleButton
                              variant="primary"
                              size="xs"
                              onClick={async () => {
                                if (!window.confirm('Confirm you have matched this UTR and amount in the center bank/UPI account.')) return;
                                try {
                                  await verifyPayment(submission.id);
                                  recordAudit({
                                    action: 'verify',
                                    targetType: 'payment',
                                    targetId: submission.invoiceId,
                                    summary: `Verified UPI payment of ₹${submission.amount.toLocaleString('en-IN')} (UTR ${submission.transactionRef}) submitted by ${submission.submittedByName}.`
                                  });
                                  showToast('UPI transfer verified and invoice settled.', 'success');
                                } catch (error) {
                                  showToast(error instanceof Error ? error.message : 'Could not verify payment.', 'error');
                                }
                              }}
                            >
                              Verify & Settle
                            </ConsoleButton>
                            <ConsoleButton
                              variant="secondary"
                              size="xs"
                              onClick={async () => {
                                try {
                                  await rejectPayment(submission.id);
                                  recordAudit({
                                    action: 'reject',
                                    targetType: 'payment',
                                    targetId: submission.invoiceId,
                                    summary: `Rejected UPI payment report of ₹${submission.amount.toLocaleString('en-IN')} (UTR ${submission.transactionRef}) submitted by ${submission.submittedByName}.`
                                  });
                                  showToast('Payment report rejected.', 'warning');
                                } catch (error) {
                                  showToast(error instanceof Error ? error.message : 'Could not reject payment.', 'error');
                                }
                              }}
                            >
                              Reject
                            </ConsoleButton>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </ConsoleCard>
            )}
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
              render: (inv) => (
                <div>
                  <div className="text-[#5F6368] dark:text-[#9AA0A6]">{nextPaymentDueDate(inv)}</div>
                  {inv.installments && inv.installments.length > 0 && (
                    <div className="text-[10px] text-[#5F6368] dark:text-[#9AA0A6]">
                      {installmentsSummary(inv.installments).paidCount}/{inv.installments.length} instalments paid
                    </div>
                  )}
                </div>
              )
            },
            {
              key: 'status',
              header: 'Status',
              sortable: true,
              render: (inv) => {
                const reportedPending = pendingPaymentSubmissions.some(
                  submission => submission.invoiceId === inv.id && submission.status === 'pending_verification'
                );
                return (
                  <StatusChip
                    label={reportedPending ? 'verification pending' : inv.status.replace('_', ' ')}
                    variant={inv.status === 'paid' ? 'success' : inv.status === 'overdue' ? 'error' : 'warning'}
                    size="xs"
                  />
                );
              }
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
                    {inv.installments && inv.installments.length > 0 && (
                      <ConsoleButton
                        variant="secondary"
                        size="xs"
                        icon={<Calendar className="w-3 h-3" />}
                        onClick={() => {
                          setInstallmentInvoiceId(inv.id);
                          setShowInstallmentsModal(true);
                        }}
                      >
                        Instalments
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
                            const dueAmount = inv.installments && inv.installments.length ? nextPaymentDueAmount(inv) : (balance ?? 0);
                            const dueOn = nextPaymentDueDate(inv);
                            setActiveWhatsappModal({
                              title: `Fee Due Reminder for ${student?.name}`,
                              phone: fatherPhone,
                              message: `Dear Parent, gentle reminder that the coaching fee of ₹${dueAmount.toLocaleString('en-IN')} for ${student?.name} is due on ${dueOn} at ${currentOrg.name}. You can pay directly via UPI ID: ${currentOrg.upiId}.`
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
            <div className="flex items-center gap-2">
              <ConsoleButton
                variant="secondary"
                size="sm"
                icon={<Plus className="w-3.5 h-3.5" />}
                onClick={() => {
                  setGenStudentId(prev => prev || students[0]?.id || '');
                  setGenDueDate(getIndiaDateString());
                  setShowGenerateInvoiceModal(true);
                }}
              >
                Generate Invoice
              </ConsoleButton>
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
            </div>
          }
        />
        </div>
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
                const air = exam.isAllIndia ? externalStats(examResults, exam.id) : null;

                return (
                  <div
                    key={exam.id}
                    className="p-4 rounded-xl border border-[#DADCE0] dark:border-[#3C4043] bg-[#F8F9FA] dark:bg-[#282A2C] flex flex-wrap items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-sm text-[#202124] dark:text-[#E8EAED] flex items-center gap-2">
                        <span className="truncate">{exam.title}</span>
                        {exam.isAllIndia && (
                          <StatusChip
                            label={air && air.withAir > 0 ? `AIR ${air.bestRank}` : 'AIR Ready'}
                            variant="info"
                            size="xs"
                          />
                        )}
                      </div>
                      <div className="text-[#5F6368] dark:text-[#9AA0A6] mt-0.5">
                        Batch: {batch?.name} · Subject: {exam.subject}
                      </div>
                      <div className="text-[11px] text-[#5F6368] dark:text-[#9AA0A6] mt-0.5">
                        Date: {exam.examDate} · Max Marks: {exam.maxMarks}
                      </div>
                      {air && air.withAir > 0 && (
                        <div className="text-[11px] text-[#1A73E8] dark:text-[#8AB4F8] mt-1 font-semibold">
                          All-India ranks imported for {air.withAir}/{air.total || air.withAir} learner(s)
                          {air.bestRank ? ` · Best AIR ${air.bestRank}` : ''}
                          {air.averagePercentile != null ? ` · Avg percentile ${air.averagePercentile}` : ''}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusChip
                        label={resultsCount > 0 ? `${resultsCount} Graded` : 'Scheduled'}
                        variant={resultsCount > 0 ? 'success' : 'neutral'}
                        size="xs"
                      />
                      {exam.isAllIndia && (
                        <ConsoleButton
                          variant="blue"
                          size="xs"
                          icon={<Upload className="w-3 h-3" />}
                          onClick={() => {
                            setAirExamId(exam.id);
                            setAirSheet('');
                            setShowImportAirModal(true);
                          }}
                        >
                          Import AIR
                        </ConsoleButton>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ConsoleCard>
      )}

      {/* 8. TIMETABLE (F6) — weekly schedule + live class links */}
      {currentModule === 'timetable' && <TimetableModule />}

      {/* 8b. SYLLABUS COVERAGE (F7) */}
      {currentModule === 'syllabus' && <SyllabusOverview />}

      {/* 8c. PTM SCHEDULER (F8) — parent–teacher meetings */}
      {currentModule === 'ptm' && <PtmAdminPanel />}

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
            <div className="flex items-center gap-2">
              <ConsoleButton
                variant="secondary"
                size="sm"
                icon={<Sparkles className="w-3.5 h-3.5 text-[#FFA000]" />}
                onClick={handleCleanDuplicates}
                title="Merge duplicate faculty profiles & clean up redundant records"
              >
                Clean Up Duplicates
              </ConsoleButton>
              <ConsoleButton
                variant="primary"
                size="sm"
                icon={<Plus className="w-3.5 h-3.5" />}
                onClick={() => setShowAddTeacherModal(true)}
              >
                Add Faculty
              </ConsoleButton>
            </div>
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
                    <div className="flex items-start justify-between gap-2">
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
                      <span className="font-mono text-[9px] text-[#1A73E8] dark:text-[#8AB4F8] bg-[#E8F0FE] dark:bg-[#1E3A5F] px-1.5 py-0.5 rounded border border-[#1A73E8]/20 dark:border-[#8AB4F8]/20 whitespace-nowrap">
                        UID: {t.userId || t.id}
                      </span>
                    </div>

                    <div className="space-y-1 text-[#5F6368] dark:text-[#9AA0A6] pt-2 border-t border-[#DADCE0]/60 dark:border-[#3C4043]">
                      <div>Subjects: <strong className="text-[#202124] dark:text-white">{t.subjects.join(', ')}</strong></div>
                      <div>Phone: <span className="font-mono text-[#202124] dark:text-white">{t.phone}</span></div>
                      <div>Assigned Batches: <strong className="text-[#202124] dark:text-white">{t.assignedBatchIds.length} batch(es)</strong></div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#DADCE0]/60 dark:border-[#3C4043] flex items-center justify-between gap-2">
                    <ConsoleButton
                      variant="danger"
                      size="xs"
                      icon={<Trash2 className="w-3 h-3 text-[#D93025]" />}
                      onClick={() => setTeacherToVacate(t)}
                    >
                      Vacate Faculty
                    </ConsoleButton>
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
                      Edit Profile
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
                        // The parent's real Firebase Auth UID when a login exists,
                        // empty otherwise. EditProfileModal skips the Firestore user
                        // write when there is no account, so a stale placeholder id
                        // here would just create an orphaned `users/` document.
                        id: s.guardian.parentUserId || '',
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
      {/* 14. AUDIT TRAIL & SECURE BACKUP (F1) */}
      {!isStaff && currentModule === 'audit' && <AuditTrailModule />}

      {/* 16. ADMISSION LEADS PIPELINE (F2) — staff + admin desk function */}
      {currentModule === 'inquiries' && <InquiriesModule onConvert={handleConvertInquiry} />}

      {/* 17. LEAVE REQUESTS & ABSENCES (F3) — staff + admin desk function */}
      {currentModule === 'leaves' && <LeavesModule />}

      {/* 18. STAFF OPS (F4) — faculty self-attendance grid + salary slips (admin only) */}
      {!isStaff && currentModule === 'staffops' && <StaffOpsModule />}

      {/* 19. PROFIT & LOSS (F5) — expense ledger + cash-basis P&L (admin only) */}
      {!isStaff && currentModule === 'finance' && <FinanceModule />}

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
                  Do not share a default password. Create each staff member&apos;s account with a unique password before granting front desk access. Financial profit/loss, faculty management, and system settings remain strictly protected.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-white dark:bg-[#282A2C] rounded-xl border border-[#DADCE0] dark:border-[#3C4043] space-y-1">
                  <span className="text-[10px] uppercase font-bold text-[#5F6368] dark:text-[#9AA0A6]">Staff Mobile / Login</span>
                  <div className="font-mono font-bold text-sm text-[#202124] dark:text-[#E8EAED]">
                    {currentOrg.id === 'org-apex' ? '+91 98765 43299' : `+91 ${currentOrg.phone.replace(/[^0-9]/g, '').slice(0, 9)}9`}
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

      </motion.div>

      {/* MODAL 1: Add Student */}
      <AnimatePresence>
      {showAddStudentModal && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <motion.div
            className="bg-white dark:bg-[#1E1F20] border border-[#DADCE0] dark:border-[#3C4043] w-full max-w-lg rounded-2xl p-6 shadow-xl space-y-4"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 6 }}
            transition={{ type: 'spring', stiffness: 420, damping: 30, mass: 0.7 }}
          >
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
                  <label className="block text-[#5F6368] dark:text-[#9AA0A6] font-medium mb-1">Gender</label>
                  <select
                    required
                    value={stGender}
                    onChange={e => setStGender(e.target.value as 'Male' | 'Female' | 'Other')}
                    className="w-full border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2C] text-[#202124] dark:text-[#E8EAED] rounded-lg p-2.5"
                  >
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[#5F6368] dark:text-[#9AA0A6] font-medium mb-1">Student Mobile (+91)</label>
                  <input
                    type="text"
                    placeholder="Own number — required for a login"
                    value={stStudentPhone}
                    onChange={e => setStStudentPhone(e.target.value)}
                    className="w-full border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2C] text-[#202124] dark:text-[#E8EAED] rounded-lg p-2.5"
                  />
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

              <div className="border border-dashed border-[#DADCE0] dark:border-[#3C4043] rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[#5F6368] dark:text-[#9AA0A6] font-medium">Login credentials (optional)</span>
                  <button
                    type="button"
                    onClick={() => setShowAdmissionPasswords(v => !v)}
                    className="text-[11px] text-[#1A73E8] hover:underline cursor-pointer font-medium"
                  >
                    {showAdmissionPasswords ? 'Hide' : 'Show'}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[#5F6368] dark:text-[#9AA0A6] font-medium mb-1">Student Login Password</label>
                    <input
                      type={showAdmissionPasswords ? 'text' : 'password'}
                      minLength={8}
                      placeholder="Blank = no student login"
                      value={stStudentPassword}
                      onChange={e => setStStudentPassword(e.target.value)}
                      className="w-full border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2C] text-[#202124] dark:text-[#E8EAED] rounded-lg p-2.5 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[#5F6368] dark:text-[#9AA0A6] font-medium mb-1">Parent Login Password</label>
                    <input
                      type={showAdmissionPasswords ? 'text' : 'password'}
                      minLength={8}
                      placeholder="Blank = no parent login"
                      value={stParentPassword}
                      onChange={e => setStParentPassword(e.target.value)}
                      className="w-full border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2C] text-[#202124] dark:text-[#E8EAED] rounded-lg p-2.5 font-mono text-xs"
                    />
                  </div>
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
                  onClick={() => {
                    // Clear the typed passwords along with the rest of the form so a
                    // dismissed dialog does not keep credentials in memory.
                    resetStudentForm();
                    setShowAddStudentModal(false);
                  }}
                >
                  Cancel
                </ConsoleButton>
                <ConsoleButton
                  type="submit"
                  variant="primary"
                  disabled={isAdmitting}
                >
                  {isAdmitting ? 'Creating logins…' : 'Admit Student'}
                </ConsoleButton>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* MODAL 2: Create Batch */}
      <AnimatePresence>
      {showAddBatchModal && (
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
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* MODAL 2.5: Add Faculty / Teacher */}
      <AnimatePresence>
      {showAddTeacherModal && (
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
                  <label className="block text-[#5F6368] dark:text-[#9AA0A6] font-medium mb-1">Mobile Contact (+91) *</label>
                  <input
                    type="text"
                    required
                    placeholder="+91 98765 43210"
                    value={teacherPhone}
                    onChange={e => setTeacherPhone(e.target.value)}
                    className="w-full border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2C] text-[#202124] dark:text-[#E8EAED] rounded-lg p-2.5 font-mono"
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

              {/* Faculty Login Password */}
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[#B06000] dark:text-[#FFCA28] font-bold flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Faculty Login Password *</span>
                  </label>
                  <span className="text-[10px] text-amber-700 dark:text-amber-300 font-mono font-semibold">
                    No default password
                  </span>
                </div>
                <div className="relative">
                  <input
                    type={showTeacherPassword ? 'text' : 'password'}
                    required
                    value={teacherPassword}
                    onChange={e => setTeacherPassword(e.target.value)}
                    minLength={8}
                    placeholder="Enter a unique password (min 8 characters)"
                    className="w-full border border-amber-500/40 bg-white dark:bg-[#1E1F20] text-[#202124] dark:text-[#E8EAED] rounded-lg p-2 font-mono pr-9 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                  />
                  <button
                    type="button"
                    onClick={() => setShowTeacherPassword(!showTeacherPassword)}
                    className="absolute right-2.5 top-2.5 text-[#5F6368] hover:text-[#202124] dark:hover:text-white cursor-pointer"
                  >
                    {showTeacherPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-[#5F6368] dark:text-[#9AA0A6] leading-tight">
                  The teacher will use their mobile number and this password to log into their Faculty Portal.
                </p>
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
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* MODAL 3: Collect Fee */}
      <AnimatePresence>
      {showCollectFeeModal && (
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
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* MODAL 3b: Generate Invoice (F11 — optional instalment plan) */}
      <AnimatePresence>
      {showGenerateInvoiceModal && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <motion.div
            className="bg-white dark:bg-[#1E1F20] border border-[#DADCE0] dark:border-[#3C4043] w-full max-w-lg rounded-2xl p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 6 }}
            transition={{ type: 'spring', stiffness: 420, damping: 30, mass: 0.7 }}
          >
            <h3 className="font-google-sans font-bold text-base text-[#202124] dark:text-[#E8EAED]">
              Generate Fee Invoice
            </h3>
            <form onSubmit={handleGenerateInvoice} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#5F6368] dark:text-[#9AA0A6] font-medium mb-1">Student</label>
                <select
                  required
                  value={genStudentId}
                  onChange={e => setGenStudentId(e.target.value)}
                  className="w-full border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2C] text-[#202124] dark:text-[#E8EAED] rounded-lg p-2.5 font-medium"
                >
                  <option value="">Select student…</option>
                  {students.filter(s => s.status !== 'inactive').map(s => (
                    <option key={s.id} value={s.id}>{s.name} · {s.classGrade}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[#5F6368] dark:text-[#9AA0A6] font-medium mb-1">Invoice Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Term Fee — Class 10"
                    value={genTitle}
                    onChange={e => setGenTitle(e.target.value)}
                    className="w-full border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2C] text-[#202124] dark:text-[#E8EAED] rounded-lg p-2.5"
                  />
                </div>
                <div>
                  <label className="block text-[#5F6368] dark:text-[#9AA0A6] font-medium mb-1">Month / Period</label>
                  <input
                    type="text"
                    value={genMonthYear}
                    onChange={e => setGenMonthYear(e.target.value)}
                    className="w-full border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2C] text-[#202124] dark:text-[#E8EAED] rounded-lg p-2.5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[#5F6368] dark:text-[#9AA0A6] font-medium mb-1">Gross (₹)</label>
                  <input
                    type="number"
                    min={0}
                    value={genAmount}
                    onChange={e => setGenAmount(Number(e.target.value))}
                    className="w-full border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2C] text-[#202124] dark:text-[#E8EAED] rounded-lg p-2.5 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[#5F6368] dark:text-[#9AA0A6] font-medium mb-1">Discount (₹)</label>
                  <input
                    type="number"
                    min={0}
                    value={genDiscount}
                    onChange={e => setGenDiscount(Number(e.target.value))}
                    className="w-full border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2C] text-[#202124] dark:text-[#E8EAED] rounded-lg p-2.5"
                  />
                </div>
                <div>
                  <label className="block text-[#5F6368] dark:text-[#9AA0A6] font-medium mb-1">First Due</label>
                  <input
                    type="date"
                    value={genDueDate}
                    onChange={e => setGenDueDate(e.target.value)}
                    className="w-full border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2C] text-[#202124] dark:text-[#E8EAED] rounded-lg p-2.5"
                  />
                </div>
              </div>

              <div className="rounded-xl border border-[#DADCE0] dark:border-[#3C4043] bg-[#F8F9FA] dark:bg-[#282A2C] p-3 space-y-3">
                <label className="flex items-center justify-between gap-3 cursor-pointer">
                  <span className="font-semibold text-[#202124] dark:text-[#E8EAED]">Split into instalments</span>
                  <input
                    type="checkbox"
                    checked={genSplit}
                    onChange={e => setGenSplit(e.target.checked)}
                    className="w-4 h-4 accent-[#1A73E8]"
                  />
                </label>
                {genSplit && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[#5F6368] dark:text-[#9AA0A6] font-medium mb-1">No. of instalments</label>
                        <input
                          type="number"
                          min={MIN_INSTALLMENTS}
                          max={MAX_INSTALLMENTS}
                          value={genCount}
                          onChange={e => setGenCount(Math.min(MAX_INSTALLMENTS, Math.max(MIN_INSTALLMENTS, Number(e.target.value) || MIN_INSTALLMENTS)))}
                          className="w-full border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#1E1F20] text-[#202124] dark:text-[#E8EAED] rounded-lg p-2.5 font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[#5F6368] dark:text-[#9AA0A6] font-medium mb-1">Spacing</label>
                        <select
                          value={genIntervalDays}
                          onChange={e => setGenIntervalDays(Number(e.target.value))}
                          className="w-full border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#1E1F20] text-[#202124] dark:text-[#E8EAED] rounded-lg p-2.5 font-medium"
                        >
                          {INSTALLMENT_INTERVAL_PRESETS.map(preset => (
                            <option key={preset.days} value={preset.days}>{preset.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[10px] font-bold uppercase tracking-wide text-[#5F6368] dark:text-[#9AA0A6]">Plan preview</div>
                      {buildInstallments(
                        Math.max(0, Math.round(((Number(genAmount) || 0) - (Number(genDiscount) || 0)) * 100) / 100),
                        genCount,
                        genDueDate || getIndiaDateString(),
                        genIntervalDays
                      ).map(inst => (
                        <div key={inst.id} className="flex items-center justify-between gap-2 rounded-lg bg-white dark:bg-[#1E1F20] border border-[#DADCE0] dark:border-[#3C4043] px-3 py-2">
                          <span className="font-semibold text-[#202124] dark:text-[#E8EAED]">{inst.label}</span>
                          <span className="font-mono font-bold text-[#202124] dark:text-[#E8EAED]">₹{inst.amount.toLocaleString('en-IN')}</span>
                          <span className="text-[#5F6368] dark:text-[#9AA0A6]">Due {inst.dueDate}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-[#DADCE0] dark:border-[#3C4043]">
                <ConsoleButton type="button" variant="ghost" onClick={() => setShowGenerateInvoiceModal(false)}>
                  Cancel
                </ConsoleButton>
                <ConsoleButton type="submit" variant="primary">
                  Create Invoice
                </ConsoleButton>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* MODAL 3c: Instalment timeline (F11) */}
      <AnimatePresence>
      {showInstallmentsModal && installmentInvoice && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <motion.div
            className="bg-white dark:bg-[#1E1F20] border border-[#DADCE0] dark:border-[#3C4043] w-full max-w-lg rounded-2xl p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 6 }}
            transition={{ type: 'spring', stiffness: 420, damping: 30, mass: 0.7 }}
          >
            <div>
              <h3 className="font-google-sans font-bold text-base text-[#202124] dark:text-[#E8EAED]">
                Instalment Plan
              </h3>
              <p className="text-xs text-[#5F6368] dark:text-[#9AA0A6]">
                {students.find(s => s.id === installmentInvoice.studentId)?.name || 'Student'} · {installmentInvoice.invoiceNo}
              </p>
            </div>
            {(() => {
              const list = installmentInvoice.installments || [];
              const summary = installmentsSummary(list);
              const today = getIndiaDateString();
              return (
                <>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="rounded-xl bg-[#F8F9FA] dark:bg-[#282A2C] border border-[#DADCE0] dark:border-[#3C4043] p-2">
                      <div className="font-mono font-bold text-[#202124] dark:text-[#E8EAED]">₹{summary.total.toLocaleString('en-IN')}</div>
                      <div className="text-[10px] text-[#5F6368] dark:text-[#9AA0A6]">Total</div>
                    </div>
                    <div className="rounded-xl bg-[#F8F9FA] dark:bg-[#282A2C] border border-[#DADCE0] dark:border-[#3C4043] p-2">
                      <div className="font-mono font-bold text-[#188038] dark:text-[#81C995]">₹{summary.paid.toLocaleString('en-IN')}</div>
                      <div className="text-[10px] text-[#5F6368] dark:text-[#9AA0A6]">{summary.paidCount}/{summary.count} paid</div>
                    </div>
                    <div className="rounded-xl bg-[#F8F9FA] dark:bg-[#282A2C] border border-[#DADCE0] dark:border-[#3C4043] p-2">
                      <div className="font-mono font-bold text-[#D93025] dark:text-[#F28B82]">₹{summary.due.toLocaleString('en-IN')}</div>
                      <div className="text-[10px] text-[#5F6368] dark:text-[#9AA0A6]">Balance</div>
                    </div>
                  </div>

                  {list.length === 0 ? (
                    <p className="text-xs text-center text-[#5F6368] dark:text-[#9AA0A6] py-6">
                      This invoice has no instalments — it is a single-due fee.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {list.map(inst => {
                        const overdue = isInstallmentOverdue(inst, today);
                        return (
                          <div
                            key={inst.id}
                            className="rounded-xl border border-[#DADCE0] dark:border-[#3C4043] bg-[#F8F9FA] dark:bg-[#282A2C] p-3 flex flex-wrap items-center justify-between gap-3 text-xs"
                          >
                            <div className="min-w-0">
                              <div className="font-semibold text-[#202124] dark:text-[#E8EAED]">{inst.label}</div>
                              <div className="text-[10px] text-[#5F6368] dark:text-[#9AA0A6]">
                                Due {inst.dueDate}{overdue ? ' · overdue' : ''}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-mono font-bold text-[#202124] dark:text-[#E8EAED]">₹{inst.amount.toLocaleString('en-IN')}</div>
                              <div className="text-[10px] text-[#5F6368] dark:text-[#9AA0A6]">Paid ₹{inst.paidAmount.toLocaleString('en-IN')}</div>
                            </div>
                            <StatusChip
                              label={overdue ? 'Overdue' : formatInstallmentStatus(inst.status)}
                              variant={inst.status === 'paid' ? 'success' : overdue ? 'error' : inst.status === 'partially_paid' ? 'info' : 'warning'}
                              size="xs"
                            />
                            {inst.status !== 'paid' && (
                              <ConsoleButton
                                variant="primary"
                                size="xs"
                                onClick={() => openCollectForInstallment(installmentInvoice, inst.id)}
                              >
                                Collect ₹{installmentBalance(inst).toLocaleString('en-IN')}
                              </ConsoleButton>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              );
            })()}
            <div className="flex justify-end pt-2 border-t border-[#DADCE0] dark:border-[#3C4043]">
              <ConsoleButton
                variant="ghost"
                onClick={() => {
                  setShowInstallmentsModal(false);
                  setInstallmentInvoiceId(null);
                }}
              >
                Close
              </ConsoleButton>
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* MODAL 4: Broadcast Notice */}
      <AnimatePresence>
      {showNewNoticeModal && (
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
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* MODAL 5: Upload Study Material (Firebase Cloud Storage) */}
      <AnimatePresence>
      {showUploadMaterialModal && (
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

              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 420, damping: 30, delay: 0.05 }}
              >
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
              </motion.div>

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
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* MODAL: Vacate Faculty Confirmation */}
      <AnimatePresence>
      {teacherToVacate && (
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
            <div className="flex items-center space-x-3 text-[#D93025]">
              <div className="p-2.5 rounded-full bg-red-50 dark:bg-red-950/40">
                <Trash2 className="w-6 h-6 text-[#D93025]" />
              </div>
              <div>
                <h3 className="font-google-sans font-bold text-base text-[#202124] dark:text-[#E8EAED]">
                  Vacate Faculty Member
                </h3>
                <p className="text-xs text-[#5F6368] dark:text-[#9AA0A6]">
                  Immediate role termination & removal
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#F8F9FA] dark:bg-[#282A2C] border border-[#DADCE0] dark:border-[#3C4043] text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-[#5F6368] dark:text-[#9AA0A6]">Faculty Name:</span>
                <strong className="text-[#202124] dark:text-[#E8EAED]">{teacherToVacate.name}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5F6368] dark:text-[#9AA0A6]">Mobile / Phone:</span>
                <span className="font-mono text-[#202124] dark:text-[#E8EAED]">{teacherToVacate.phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5F6368] dark:text-[#9AA0A6]">User ID (UID):</span>
                <span className="font-mono text-[#1A73E8] dark:text-[#8AB4F8]">{teacherToVacate.userId || teacherToVacate.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5F6368] dark:text-[#9AA0A6]">Active Batches:</span>
                <span className="font-semibold text-[#D93025]">{teacherToVacate.assignedBatchIds.length} batch(es) to be unassigned</span>
              </div>
            </div>

            <p className="text-xs text-[#5F6368] dark:text-[#9AA0A6] leading-relaxed">
              Are you sure you want to vacate <strong>{teacherToVacate.name}</strong>? This action will permanently remove this faculty record, release them from active classroom batches, and mark their institute profile as vacated.
            </p>

            <div className="flex justify-end space-x-2 pt-3 border-t border-[#DADCE0] dark:border-[#3C4043]">
              <ConsoleButton
                type="button"
                variant="ghost"
                onClick={() => setTeacherToVacate(null)}
              >
                Cancel
              </ConsoleButton>
              <ConsoleButton
                type="button"
                variant="danger"
                onClick={handleConfirmVacateTeacher}
                icon={<Trash2 className="w-3.5 h-3.5" />}
              >
                Confirm & Vacate Faculty
              </ConsoleButton>
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* MODAL: Vacate Student Confirmation */}
      <AnimatePresence>
      {studentToVacate && (
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
            <div className="flex items-center space-x-3 text-[#D93025]">
              <div className="p-2.5 rounded-full bg-red-50 dark:bg-red-950/40">
                <Trash2 className="w-6 h-6 text-[#D93025]" />
              </div>
              <div>
                <h3 className="font-google-sans font-bold text-base text-[#202124] dark:text-[#E8EAED]">
                  Vacate Student
                </h3>
                <p className="text-xs text-[#5F6368] dark:text-[#9AA0A6]">
                  Disenroll student from center
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#F8F9FA] dark:bg-[#282A2C] border border-[#DADCE0] dark:border-[#3C4043] text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-[#5F6368] dark:text-[#9AA0A6]">Student Name:</span>
                <strong className="text-[#202124] dark:text-[#E8EAED]">{studentToVacate.name}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5F6368] dark:text-[#9AA0A6]">Enrollment No:</span>
                <span className="font-mono text-[#202124] dark:text-[#E8EAED]">{studentToVacate.enrollmentNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5F6368] dark:text-[#9AA0A6]">User ID (UID):</span>
                <span className="font-mono text-[#1A73E8] dark:text-[#8AB4F8]">{studentToVacate.userId || studentToVacate.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5F6368] dark:text-[#9AA0A6]">Class / Grade:</span>
                <span className="font-medium text-[#202124] dark:text-[#E8EAED]">{studentToVacate.classGrade} ({studentToVacate.board})</span>
              </div>
            </div>

            <p className="text-xs text-[#5F6368] dark:text-[#9AA0A6] leading-relaxed">
              Are you sure you want to vacate <strong>{studentToVacate.name}</strong>? This action will remove the student from active rosters and unenroll them from assigned batches.
            </p>

            <div className="flex justify-end space-x-2 pt-3 border-t border-[#DADCE0] dark:border-[#3C4043]">
              <ConsoleButton
                type="button"
                variant="ghost"
                onClick={() => setStudentToVacate(null)}
              >
                Cancel
              </ConsoleButton>
              <ConsoleButton
                type="button"
                variant="danger"
                onClick={handleConfirmVacateStudent}
                icon={<Trash2 className="w-3.5 h-3.5" />}
              >
                Confirm & Vacate Student
              </ConsoleButton>
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* STUDENT BATCH ENROLLMENT MODAL — toggles keep both mirrors in sync */}
      <AnimatePresence>
      {enrollingStudentId && (() => {
        const rosterStudent = students.find(s => s.id === enrollingStudentId);
        return (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <motion.div
            className="bg-white dark:bg-[#1E1F20] border border-[#DADCE0] dark:border-[#3C4043] w-full max-w-md rounded-2xl p-6 shadow-xl space-y-1"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 6 }}
            transition={{ type: 'spring', stiffness: 420, damping: 30, mass: 0.7 }}
          >
            <div className="flex items-start justify-between pb-3">
              <div>
                <h3 className="font-google-sans font-bold text-base text-[#202124] dark:text-[#E8EAED]">
                  Manage Batch Enrollment
                </h3>
                <p className="text-[11px] text-[#5F6368] dark:text-[#9AA0A6] mt-0.5">
                  {rosterStudent
                    ? `${rosterStudent.name} · ${rosterStudent.classGrade} · Roll ${rosterStudent.rollNo}`
                    : 'Loading student…'}
                </p>
              </div>
              <button
                onClick={() => setEnrollingStudentId(null)}
                aria-label="Close"
                className="p-1.5 rounded-lg text-[#5F6368] dark:text-[#9AA0A6] hover:bg-black/[0.06] dark:hover:bg-white/[0.08] transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {batches.length === 0 && (
              <p className="text-center text-xs text-[#5F6368] dark:text-[#9AA0A6] py-10">
                No batches exist in this centre yet. Create a batch first, then come back here to
                enrol students into it.
              </p>
            )}

            {rosterStudent && batches.map(b => {
              const isEnrolled = rosterStudent.batchIds.includes(b.id);
              const saving = enrollingBatchId === b.id;
              return (
                <div
                  key={b.id}
                  className="flex items-center justify-between gap-3 py-2.5 border-b border-[#DADCE0]/60 dark:border-[#3C4043]/60 last:border-0"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-[#202124] dark:text-[#E8EAED] text-sm truncate">
                      {b.name}
                    </div>
                    <div className="text-[10px] text-[#5F6368] dark:text-[#9AA0A6] font-medium">
                      {b.subject} · Class {b.classGrade} · {b.studentIds.length}/{b.capacity} enrolled
                    </div>
                  </div>
                  <ConsoleButton
                    variant={isEnrolled ? 'danger' : 'primary'}
                    size="xs"
                    disabled={!!enrollingBatchId}
                    onClick={() => handleToggleStudentBatch(rosterStudent.id, b.id)}
                    icon={saving ? <Loader2 className="w-3 h-3 animate-spin" /> : undefined}
                  >
                    {saving ? 'Saving…' : isEnrolled ? 'Remove' : 'Enroll'}
                  </ConsoleButton>
                </div>
              );
            })}
          </motion.div>
        </motion.div>
        );
      })()}
      </AnimatePresence>

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
          onSaved={() => setEditingPerson(null)}
        />
      )}

      {/* F10 — Schedule Test (mock series + all-India flag) */}
      <AnimatePresence>
      {showNewExamModal && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <motion.div
            className="bg-white dark:bg-[#1E1F20] border border-[#DADCE0] dark:border-[#3C4043] w-full max-w-md rounded-2xl p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 6 }}
            transition={{ type: 'spring', stiffness: 420, damping: 30, mass: 0.7 }}
          >
            <h3 className="font-google-sans font-bold text-base text-[#202124] dark:text-[#E8EAED] flex items-center gap-2">
              <Award className="w-4 h-4 text-[#FFA000]" />
              Schedule Test
            </h3>
            <form onSubmit={handleCreateExam} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#5F6368] dark:text-[#9AA0A6] font-medium mb-1">Test Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. All-India Mock Test Series — Test 4"
                  value={examTitle}
                  onChange={e => setExamTitle(e.target.value)}
                  className="w-full border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2C] text-[#202124] dark:text-[#E8EAED] rounded-lg p-2.5"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#5F6368] dark:text-[#9AA0A6] font-medium mb-1">Batch *</label>
                  <select
                    required
                    value={examBatchId}
                    onChange={e => setExamBatchId(e.target.value)}
                    className="w-full border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2C] text-[#202124] dark:text-[#E8EAED] rounded-lg p-2.5"
                  >
                    {batches.length === 0 && <option value="">No batches yet</option>}
                    {batches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[#5F6368] dark:text-[#9AA0A6] font-medium mb-1">Subject</label>
                  <input
                    type="text"
                    value={examSubject}
                    onChange={e => setExamSubject(e.target.value)}
                    className="w-full border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2C] text-[#202124] dark:text-[#E8EAED] rounded-lg p-2.5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#5F6368] dark:text-[#9AA0A6] font-medium mb-1">Exam Date</label>
                  <input
                    type="date"
                    value={examDate}
                    onChange={e => setExamDate(e.target.value)}
                    className="w-full border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2C] text-[#202124] dark:text-[#E8EAED] rounded-lg p-2.5"
                  />
                </div>
                <div>
                  <label className="block text-[#5F6368] dark:text-[#9AA0A6] font-medium mb-1">Time Slot</label>
                  <input
                    type="text"
                    value={examTimeSlot}
                    onChange={e => setExamTimeSlot(e.target.value)}
                    className="w-full border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2C] text-[#202124] dark:text-[#E8EAED] rounded-lg p-2.5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#5F6368] dark:text-[#9AA0A6] font-medium mb-1">Max Marks</label>
                  <input
                    type="number"
                    min={1}
                    value={examMaxMarks}
                    onChange={e => setExamMaxMarks(Number(e.target.value))}
                    className="w-full border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2C] text-[#202124] dark:text-[#E8EAED] rounded-lg p-2.5"
                  />
                </div>
                <div>
                  <label className="block text-[#5F6368] dark:text-[#9AA0A6] font-medium mb-1">Passing Marks</label>
                  <input
                    type="number"
                    min={0}
                    value={examPassingMarks}
                    onChange={e => setExamPassingMarks(Number(e.target.value))}
                    className="w-full border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2C] text-[#202124] dark:text-[#E8EAED] rounded-lg p-2.5"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#5F6368] dark:text-[#9AA0A6] font-medium mb-1">Test Type</label>
                <select
                  value={examKind}
                  onChange={e => setExamKind(e.target.value as ExamKind)}
                  className="w-full border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2C] text-[#202124] dark:text-[#E8EAED] rounded-lg p-2.5"
                >
                  {EXAM_KINDS.map(k => (
                    <option key={k} value={k}>{EXAM_KIND_LABEL[k]}</option>
                  ))}
                </select>
              </div>

              {examKind !== 'unit' && (
                <label className="flex items-center gap-2.5 p-3 rounded-lg border border-[#DADCE0] dark:border-[#3C4043] bg-[#F8F9FA] dark:bg-[#282A2C] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={examIsAllIndia}
                    onChange={e => setExamIsAllIndia(e.target.checked)}
                    className="w-4 h-4 accent-[#FFA000]"
                  />
                  <span className="text-[#202124] dark:text-[#E8EAED]">
                    Mock series with All-India Rank — I will paste the external ranking sheet after the test.
                  </span>
                </label>
              )}

              <div className="flex justify-end space-x-2 pt-3 border-t border-[#DADCE0] dark:border-[#3C4043]">
                <ConsoleButton type="button" variant="ghost" onClick={() => setShowNewExamModal(false)}>
                  Cancel
                </ConsoleButton>
                <ConsoleButton type="submit" variant="primary" disabled={batches.length === 0}>
                  Schedule Test
                </ConsoleButton>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* F10 — Import All-India Rank sheet for one exam */}
      <AnimatePresence>
      {showImportAirModal && (() => {
        const targetExam = exams.find(e => e.id === airExamId);
        return (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <motion.div
            className="bg-white dark:bg-[#1E1F20] border border-[#DADCE0] dark:border-[#3C4043] w-full max-w-lg rounded-2xl p-6 shadow-xl space-y-4"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 6 }}
            transition={{ type: 'spring', stiffness: 420, damping: 30, mass: 0.7 }}
          >
            <div>
              <h3 className="font-google-sans font-bold text-base text-[#202124] dark:text-[#E8EAED] flex items-center gap-2">
                <Award className="w-4 h-4 text-[#FFA000]" />
                Import All-India Ranks
              </h3>
              <p className="text-[11px] text-[#5F6368] dark:text-[#9AA0A6] mt-0.5">
                {targetExam ? `${targetExam.title} · ${targetExam.subject}` : 'Select an exam'}
              </p>
            </div>

            <form onSubmit={handleImportAir} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#5F6368] dark:text-[#9AA0A6] font-medium mb-1">
                  Paste ranking sheet (one student per line)
                </label>
                <textarea
                  rows={7}
                  required
                  placeholder={'Roll / Enrollment / Name, rank[, total[, percentile]]\ne.g.\nAPX10-0042, 247, 4500, 94.5\nAarav Sharma, 12, 4500'}
                  value={airSheet}
                  onChange={e => setAirSheet(e.target.value)}
                  className="w-full border border-[#DADCE0] dark:border-[#3C4043] bg-white dark:bg-[#282A2C] text-[#202124] dark:text-[#E8EAED] rounded-lg p-2.5 font-mono text-[11px]"
                />
              </div>

              {airSheet.trim() && (
                <div className="rounded-lg border border-[#DADCE0] dark:border-[#3C4043] bg-[#F8F9FA] dark:bg-[#282A2C] p-3 space-y-1.5">
                  <div className="font-semibold text-[#202124] dark:text-[#E8EAED]">
                    {parsedAirSheet.rows.length} row(s) ready
                    {parsedAirSheet.errors.length ? ` · ${parsedAirSheet.errors.length} skipped` : ''}
                  </div>
                  {parsedAirSheet.rows.slice(0, 3).map(r => {
                    const s = students.find(x => x.id === r.studentId);
                    return (
                      <div key={r.studentId} className="text-[11px] text-[#5F6368] dark:text-[#9AA0A6]">
                        {s?.name || r.studentId} → AIR {r.externalRank}
                        {r.externalTotalStudents ? ` of ${r.externalTotalStudents}` : ''}
                        {r.externalPercentile != null ? ` (${r.externalPercentile}th)` : ''}
                      </div>
                    );
                  })}
                  {parsedAirSheet.errors.slice(0, 2).map(err => (
                    <div key={err} className="text-[11px] text-[#D93025] dark:text-[#F28B82]">{err}</div>
                  ))}
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-3 border-t border-[#DADCE0] dark:border-[#3C4043]">
                <ConsoleButton
                  type="button"
                  variant="ghost"
                  onClick={() => { setShowImportAirModal(false); setAirExamId(null); setAirSheet(''); }}
                >
                  Cancel
                </ConsoleButton>
                <ConsoleButton type="submit" variant="primary" disabled={parsedAirSheet.rows.length === 0}>
                  Publish AIR
                </ConsoleButton>
              </div>
            </form>
          </motion.div>
        </motion.div>
        );
      })()}
      </AnimatePresence>

      {/* F9 — print-ready student ID card + Transfer Certificate */}
      <StudentIdCardModal student={idCardStudent} onClose={() => setIdCardStudent(null)} />
      <TransferCertificateModal student={tcStudent} onClose={() => setTcStudent(null)} />
    </div>
  );
};
