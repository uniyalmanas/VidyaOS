import {
  Organization,
  User,
  Student,
  Teacher,
  Batch,
  AttendanceRecord,
  FeeInvoice,
  Exam,
  ExamResult,
  Assignment,
  StudyMaterial,
  TimetableSlot,
  Announcement,
  SubscriptionPlan
} from '../types';

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'starter',
    name: 'Starter Batch',
    priceMonthly: 599,
    priceYearly: 5990,
    maxStudents: 100,
    maxBranches: 1,
    popular: false,
    description: 'Perfect for single-subject teachers & small neighborhood coaching centers.',
    features: [
      'Up to 100 Students',
      '1 Center Branch',
      'Mobile Attendance Register',
      'UPI & Cash Fee Tracker',
      'Parent Portal & WhatsApp Alerts',
      'Digital Fee Receipts',
      'Basic Performance Cards'
    ]
  },
  {
    id: 'growth',
    name: 'Growth Academy',
    priceMonthly: 1299,
    priceYearly: 12990,
    maxStudents: 300,
    maxBranches: 2,
    popular: true,
    description: 'Designed for established coaching institutes with multiple batches & teachers.',
    features: [
      'Up to 300 Students',
      'Up to 2 Center Branches',
      'Unlimited Teachers & Staff',
      'Batch Scheduling & Clash Detector',
      'Automated WhatsApp Fee Reminders',
      'Rank & Percentile Exam Analytics',
      'Study Notes & Assignment Vault',
      'Priority Phone Support'
    ]
  },
  {
    id: 'pro',
    name: 'Multi-Branch Pro',
    priceMonthly: 2199,
    priceYearly: 21990,
    maxStudents: 1000,
    maxBranches: 5,
    popular: false,
    description: 'For large coaching networks and test prep academies.',
    features: [
      'Up to 1,000 Students',
      'Up to 5 Branches',
      'Multi-Branch Consolidated P&L',
      'Custom Institute Brand & Logo Receipts',
      'Full Parent App Direct Access',
      'Automated Batch Shuffling',
      'Dedicated Account Manager'
    ]
  }
];

export const MOCK_ORGANIZATIONS: Organization[] = [
  {
    id: 'org-apex',
    name: 'Apex Coaching Academy',
    slug: 'apex-academy',
    tagline: 'Excellence in CBSE & JEE/NEET Foundations',
    logoText: 'APEX',
    ownerName: 'Er. Manoj Verma',
    phone: '+91 98971 23456',
    email: 'admin@apexacademy.in',
    address: 'Plot 42, Rajpur Road, Near Clock Tower',
    city: 'Dehradun',
    state: 'Uttarakhand',
    gstin: '05AAAAA0000A1Z5',
    upiId: 'apexacademy@icici',
    upiMerchantName: 'APEX COACHING ACADEMY',
    planId: 'growth',
    subscriptionStatus: 'active',
    trialEndsAt: '2026-11-01',
    currentCycleEnd: '2026-10-31',
    createdAt: '2025-04-10',
    maxStudents: 300,
    maxBranches: 2,
    branches: [
      {
        id: 'branch-rajpur',
        orgId: 'org-apex',
        name: 'Rajpur Road (Main Campus)',
        city: 'Dehradun',
        address: 'Plot 42, Rajpur Road, Dehradun',
        phone: '+91 98971 23456',
        isMain: true
      },
      {
        id: 'branch-haridwar',
        orgId: 'org-apex',
        name: 'Haridwar By-Pass Branch',
        city: 'Dehradun',
        address: 'Shop 12-14, Shivalik Tower, Haridwar By-Pass',
        phone: '+91 98971 88990',
        isMain: false
      }
    ]
  },
  {
    id: 'org-toppers',
    name: 'Toppers NEET & Science Hub',
    slug: 'toppers-hub',
    tagline: 'Building Future Doctors & Engineers',
    logoText: 'TOPPERS',
    ownerName: 'Dr. Sunita Rawat',
    phone: '+91 98370 54321',
    email: 'contact@toppersscience.com',
    address: 'Opposite DAV PG College, Karanpur',
    city: 'Dehradun',
    state: 'Uttarakhand',
    gstin: '05BBBBB1111B1Z2',
    upiId: 'toppersscience@okhdfcbank',
    upiMerchantName: 'TOPPERS NEET & SCIENCE HUB',
    planId: 'pro',
    subscriptionStatus: 'active',
    trialEndsAt: '2026-12-15',
    currentCycleEnd: '2026-11-15',
    createdAt: '2024-09-01',
    maxStudents: 1000,
    maxBranches: 5,
    branches: [
      {
        id: 'branch-karanpur',
        orgId: 'org-toppers',
        name: 'Karanpur Main Institute',
        city: 'Dehradun',
        address: 'Opposite DAV PG College, Karanpur',
        phone: '+91 98370 54321',
        isMain: true
      }
    ]
  },
  {
    id: 'org-bright',
    name: 'BrightSparks Junior Math Lab',
    slug: 'bright-sparks',
    tagline: 'Conceptual Mathematics for Classes 6 to 10',
    logoText: 'BRIGHT',
    ownerName: 'Alok Gupta',
    phone: '+91 94120 77654',
    email: 'alok@brightsparksmath.com',
    address: 'Near Gandhi Park, Ballupur',
    city: 'Dehradun',
    state: 'Uttarakhand',
    upiId: 'brightsparks@upi',
    upiMerchantName: 'BRIGHT SPARKS MATH LAB',
    planId: 'starter',
    subscriptionStatus: 'active',
    trialEndsAt: '2026-10-25',
    currentCycleEnd: '2026-10-25',
    createdAt: '2026-01-15',
    maxStudents: 100,
    maxBranches: 1,
    branches: [
      {
        id: 'branch-ballupur',
        orgId: 'org-bright',
        name: 'Ballupur Center',
        city: 'Dehradun',
        address: 'Near Gandhi Park, Ballupur',
        phone: '+91 94120 77654',
        isMain: true
      }
    ]
  }
];

export const MOCK_USERS: User[] = [
  // Platform Owner
  {
    id: 'user-platform-owner',
    orgId: 'system',
    role: 'PLATFORM_OWNER',
    name: 'Kunal Singhal (SaaS Architect)',
    phone: '+91 99999 11223',
    email: 'kunal@vidyaos.in',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
  },
  // Apex Academy Admin
  {
    id: 'user-apex-admin',
    orgId: 'org-apex',
    role: 'CENTER_ADMIN',
    name: 'Er. Manoj Verma',
    phone: '+91 98971 23456',
    email: 'admin@apexacademy.in',
    branchId: 'branch-rajpur',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
  },
  // Apex Front Desk Staff
  {
    id: 'user-apex-staff',
    orgId: 'org-apex',
    role: 'STAFF',
    name: 'Pooja Verma',
    phone: '+91 98765 43299',
    email: 'staff@apexacademy.in',
    branchId: 'branch-rajpur',
    avatar: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=150&auto=format&fit=crop&q=80'
  },
  // Apex Teachers
  {
    id: 'user-teacher-sharma',
    orgId: 'org-apex',
    role: 'TEACHER',
    name: 'Prof. Anjali Sharma',
    phone: '+91 97600 33445',
    email: 'anjali@apexacademy.in',
    branchId: 'branch-rajpur',
    subjects: ['Mathematics', 'Quantitative Aptitude'],
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'user-teacher-negi',
    orgId: 'org-apex',
    role: 'TEACHER',
    name: 'Dr. Rohit Negi',
    phone: '+91 94111 66554',
    email: 'rohitnegi@apexacademy.in',
    branchId: 'branch-rajpur',
    subjects: ['Physics', 'Science'],
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80'
  },
  // Parent (Rajesh Sharma with 2 children: Rahul Class 10 and Priya Class 8)
  {
    id: 'user-parent-rajesh',
    orgId: 'org-apex',
    role: 'PARENT',
    name: 'Rajesh Sharma',
    phone: '+91 98371 99887',
    email: 'rajesh.sharma.parent@gmail.com',
    branchId: 'branch-rajpur',
    linkedStudentIds: ['stud-rahul-10', 'stud-priya-8'],
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80'
  },
  // Parent 2 (Sunita Bhatt - Mother of Ankit Bhatt)
  {
    id: 'user-parent-sunita',
    orgId: 'org-apex',
    role: 'PARENT',
    name: 'Sunita Bhatt',
    phone: '+91 98970 44332',
    email: 'sunita.bhatt@gmail.com',
    branchId: 'branch-rajpur',
    linkedStudentIds: ['stud-ankit-12'],
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80'
  },
  // Student: Rahul Sharma
  {
    id: 'user-stud-rahul',
    orgId: 'org-apex',
    role: 'STUDENT',
    name: 'Rahul Sharma',
    phone: '+91 98371 99880',
    email: 'rahul.s@student.apex.in',
    branchId: 'branch-rajpur',
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80'
  }
];

export const MOCK_TEACHERS: Teacher[] = [
  {
    id: 'teach-anjali',
    orgId: 'org-apex',
    branchId: 'branch-rajpur',
    userId: 'user-teacher-sharma',
    name: 'Prof. Anjali Sharma',
    phone: '+91 97600 33445',
    email: 'anjali@apexacademy.in',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    qualification: 'M.Sc. Mathematics (Gold Medalist), B.Ed',
    subjects: ['Class 10 Mathematics', 'Class 12 Applied Math', 'JEE Foundation Math'],
    assignedBatchIds: ['batch-c10-math', 'batch-jee-math'],
    joiningDate: '2023-04-01',
    status: 'active'
  },
  {
    id: 'teach-rohit',
    orgId: 'org-apex',
    branchId: 'branch-rajpur',
    userId: 'user-teacher-negi',
    name: 'Dr. Rohit Negi',
    phone: '+91 94111 66554',
    email: 'rohitnegi@apexacademy.in',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    qualification: 'Ph.D. Physics (IIT Roorkee)',
    subjects: ['Class 10 Science (Physics)', 'Class 12 Physics (JEE/NEET)'],
    assignedBatchIds: ['batch-c10-sci', 'batch-c12-phy'],
    joiningDate: '2022-07-15',
    status: 'active'
  },
  {
    id: 'teach-priyanka',
    orgId: 'org-apex',
    branchId: 'branch-rajpur',
    userId: 'user-teacher-priyanka',
    name: 'Ms. Priyanka Dobhal',
    phone: '+91 98112 33441',
    email: 'priyanka@apexacademy.in',
    avatar: 'https://images.unsplash.com/photo-1580894732444-8ecded7900cd?w=150&auto=format&fit=crop&q=80',
    qualification: 'M.Sc. Chemistry, CSIR-NET',
    subjects: ['Class 10 Science (Chemistry)', 'Class 12 Chemistry'],
    assignedBatchIds: ['batch-c10-sci'],
    joiningDate: '2024-03-01',
    status: 'active'
  }
];

export const MOCK_STUDENTS: Student[] = [
  {
    id: 'stud-rahul-10',
    orgId: 'org-apex',
    branchId: 'branch-rajpur',
    enrollmentNo: 'APEX/2026/042',
    rollNo: '10-A-01',
    name: 'Rahul Sharma',
    gender: 'Male',
    classGrade: 'Class 10',
    board: 'CBSE',
    schoolName: 'St. Joseph Academy, Dehradun',
    dateOfBirth: '2011-05-14',
    admissionDate: '2025-04-05',
    phone: '+91 98371 99887',
    email: 'rahul.sharma@gmail.com',
    address: 'B-14, Dalanwala, Dehradun',
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
    batchIds: ['batch-c10-math', 'batch-c10-sci'],
    guardian: {
      fatherName: 'Rajesh Sharma',
      fatherPhone: '+91 98371 99887',
      motherName: 'Priya Sharma',
      motherPhone: '+91 98371 99888',
      parentUserId: 'user-parent-rajesh'
    },
    status: 'active'
  },
  {
    id: 'stud-priya-8',
    orgId: 'org-apex',
    branchId: 'branch-rajpur',
    enrollmentNo: 'APEX/2026/098',
    rollNo: '08-B-07',
    name: 'Priya Sharma',
    gender: 'Female',
    classGrade: 'Class 8',
    board: 'ICSE',
    schoolName: 'Brightlands School, Dehradun',
    dateOfBirth: '2013-09-22',
    admissionDate: '2025-06-10',
    phone: '+91 98371 99887',
    email: 'priya.sharma@gmail.com',
    address: 'B-14, Dalanwala, Dehradun',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
    batchIds: ['batch-c8-found'],
    guardian: {
      fatherName: 'Rajesh Sharma',
      fatherPhone: '+91 98371 99887',
      motherName: 'Priya Sharma',
      motherPhone: '+91 98371 99888',
      parentUserId: 'user-parent-rajesh'
    },
    status: 'active'
  },
  {
    id: 'stud-ankit-12',
    orgId: 'org-apex',
    branchId: 'branch-rajpur',
    enrollmentNo: 'APEX/2026/015',
    rollNo: '12-P-03',
    name: 'Ankit Bhatt',
    gender: 'Male',
    classGrade: 'Class 12',
    board: 'CBSE',
    schoolName: 'Kendriya Vidyalaya FRI',
    dateOfBirth: '2009-02-18',
    admissionDate: '2024-04-12',
    phone: '+91 98970 44332',
    email: 'ankit.bhatt@gmail.com',
    address: 'H-9, Kaulagarh Road, Dehradun',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80',
    batchIds: ['batch-c12-phy', 'batch-jee-math'],
    guardian: {
      fatherName: 'Sunil Bhatt',
      fatherPhone: '+91 98970 44331',
      motherName: 'Sunita Bhatt',
      motherPhone: '+91 98970 44332',
      parentUserId: 'user-parent-sunita'
    },
    status: 'active'
  },
  {
    id: 'stud-aarav-10',
    orgId: 'org-apex',
    branchId: 'branch-rajpur',
    enrollmentNo: 'APEX/2026/054',
    rollNo: '10-A-02',
    name: 'Aarav Joshi',
    gender: 'Male',
    classGrade: 'Class 10',
    board: 'CBSE',
    schoolName: 'The Asian School',
    dateOfBirth: '2011-08-30',
    admissionDate: '2025-05-01',
    phone: '+91 98975 11229',
    email: 'aarav.joshi@gmail.com',
    address: 'Flat 302, Green View, Vasant Vihar',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
    batchIds: ['batch-c10-math', 'batch-c10-sci'],
    guardian: {
      fatherName: 'Vipin Joshi',
      fatherPhone: '+91 98975 11229',
      parentUserId: 'user-parent-vipin'
    },
    status: 'active'
  },
  {
    id: 'stud-sneha-10',
    orgId: 'org-apex',
    branchId: 'branch-rajpur',
    enrollmentNo: 'APEX/2026/061',
    rollNo: '10-A-03',
    name: 'Sneha Chauhan',
    gender: 'Female',
    classGrade: 'Class 10',
    board: 'CBSE',
    schoolName: 'Convent of Jesus and Mary',
    dateOfBirth: '2011-03-12',
    admissionDate: '2025-04-10',
    phone: '+91 94129 88771',
    email: 'sneha.c@gmail.com',
    address: 'Near Parade Ground, Dehradun',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    batchIds: ['batch-c10-math', 'batch-c10-sci'],
    guardian: {
      fatherName: 'Deepak Chauhan',
      fatherPhone: '+91 94129 88771',
      parentUserId: 'user-parent-deepak'
    },
    status: 'active'
  }
];

export const MOCK_BATCHES: Batch[] = [
  {
    id: 'batch-c10-math',
    orgId: 'org-apex',
    branchId: 'branch-rajpur',
    name: 'Class 10 - Mathematics (Board Booster)',
    subject: 'Mathematics',
    classGrade: 'Class 10',
    teacherId: 'teach-anjali',
    classroom: 'Hall 1 (Aryabhata Room)',
    scheduleDays: ['Mon', 'Wed', 'Fri'],
    timeSlot: '05:00 PM - 06:30 PM',
    capacity: 25,
    studentIds: ['stud-rahul-10', 'stud-aarav-10', 'stud-sneha-10'],
    feeAmountMonthly: 2000,
    academicYear: '2026-2027',
    status: 'active'
  },
  {
    id: 'batch-c10-sci',
    orgId: 'org-apex',
    branchId: 'branch-rajpur',
    name: 'Class 10 - Integrated Science (CBSE)',
    subject: 'Science (Physics & Chemistry)',
    classGrade: 'Class 10',
    teacherId: 'teach-rohit',
    classroom: 'Room 2 (CV Raman Lab)',
    scheduleDays: ['Tue', 'Thu', 'Sat'],
    timeSlot: '05:00 PM - 06:30 PM',
    capacity: 30,
    studentIds: ['stud-rahul-10', 'stud-aarav-10', 'stud-sneha-10'],
    feeAmountMonthly: 2200,
    academicYear: '2026-2027',
    status: 'active'
  },
  {
    id: 'batch-c12-phy',
    orgId: 'org-apex',
    branchId: 'branch-rajpur',
    name: 'Class 12 - Advanced Physics (JEE/NEET Focus)',
    subject: 'Physics',
    classGrade: 'Class 12',
    teacherId: 'teach-rohit',
    classroom: 'Hall 3 (Einstein Theater)',
    scheduleDays: ['Mon', 'Wed', 'Fri'],
    timeSlot: '06:45 PM - 08:15 PM',
    capacity: 35,
    studentIds: ['stud-ankit-12'],
    feeAmountMonthly: 2800,
    academicYear: '2026-2027',
    status: 'active'
  },
  {
    id: 'batch-jee-math',
    orgId: 'org-apex',
    branchId: 'branch-rajpur',
    name: 'JEE Foundation - Advanced Calculus & Trigonometry',
    subject: 'Mathematics',
    classGrade: 'Class 12',
    teacherId: 'teach-anjali',
    classroom: 'Hall 1 (Aryabhata Room)',
    scheduleDays: ['Tue', 'Thu', 'Sat'],
    timeSlot: '06:45 PM - 08:15 PM',
    capacity: 30,
    studentIds: ['stud-ankit-12'],
    feeAmountMonthly: 3000,
    academicYear: '2026-2027',
    status: 'active'
  },
  {
    id: 'batch-c8-found',
    orgId: 'org-apex',
    branchId: 'branch-rajpur',
    name: 'Junior Foundation - Class 8 Math & Aptitude',
    subject: 'Math & Logic',
    classGrade: 'Class 8',
    teacherId: 'teach-anjali',
    classroom: 'Room 4',
    scheduleDays: ['Mon', 'Wed', 'Fri'],
    timeSlot: '03:30 PM - 04:45 PM',
    capacity: 20,
    studentIds: ['stud-priya-8'],
    feeAmountMonthly: 1800,
    academicYear: '2026-2027',
    status: 'active'
  }
];

export const MOCK_ATTENDANCE: AttendanceRecord[] = [
  // Rahul Sharma Class 10 Math records
  {
    id: 'att-1',
    orgId: 'org-apex',
    branchId: 'branch-rajpur',
    batchId: 'batch-c10-math',
    studentId: 'stud-rahul-10',
    date: '2026-09-28', // Today
    status: 'present',
    markedByUserId: 'user-teacher-sharma',
    markedAt: '2026-09-28T17:05:00',
    remarks: 'Active in trigonometry problem solving'
  },
  {
    id: 'att-2',
    orgId: 'org-apex',
    branchId: 'branch-rajpur',
    batchId: 'batch-c10-math',
    studentId: 'stud-aarav-10',
    date: '2026-09-28',
    status: 'absent',
    markedByUserId: 'user-teacher-sharma',
    markedAt: '2026-09-28T17:05:00',
    remarks: 'Informed fever',
    whatsappAlertSent: true
  },
  {
    id: 'att-3',
    orgId: 'org-apex',
    branchId: 'branch-rajpur',
    batchId: 'batch-c10-math',
    studentId: 'stud-sneha-10',
    date: '2026-09-28',
    status: 'present',
    markedByUserId: 'user-teacher-sharma',
    markedAt: '2026-09-28T17:05:00'
  },
  // Yesterday's attendance
  {
    id: 'att-4',
    orgId: 'org-apex',
    branchId: 'branch-rajpur',
    batchId: 'batch-c10-sci',
    studentId: 'stud-rahul-10',
    date: '2026-09-26',
    status: 'present',
    markedByUserId: 'user-teacher-negi',
    markedAt: '2026-09-26T17:02:00'
  },
  {
    id: 'att-5',
    orgId: 'org-apex',
    branchId: 'branch-rajpur',
    batchId: 'batch-c10-math',
    studentId: 'stud-rahul-10',
    date: '2026-09-25',
    status: 'absent',
    markedByUserId: 'user-teacher-sharma',
    markedAt: '2026-09-25T17:10:00',
    remarks: 'Parent confirmed dentist appointment',
    whatsappAlertSent: true
  },
  {
    id: 'att-6',
    orgId: 'org-apex',
    branchId: 'branch-rajpur',
    batchId: 'batch-c10-math',
    studentId: 'stud-rahul-10',
    date: '2026-09-23',
    status: 'present',
    markedByUserId: 'user-teacher-sharma',
    markedAt: '2026-09-23T17:01:00'
  },
  {
    id: 'att-7',
    orgId: 'org-apex',
    branchId: 'branch-rajpur',
    batchId: 'batch-c10-math',
    studentId: 'stud-rahul-10',
    date: '2026-09-21',
    status: 'present',
    markedByUserId: 'user-teacher-sharma',
    markedAt: '2026-09-21T17:03:00'
  },
  {
    id: 'att-8',
    orgId: 'org-apex',
    branchId: 'branch-rajpur',
    batchId: 'batch-c8-found',
    studentId: 'stud-priya-8',
    date: '2026-09-28',
    status: 'present',
    markedByUserId: 'user-teacher-sharma',
    markedAt: '2026-09-28T15:35:00'
  }
];

export const MOCK_INVOICES: FeeInvoice[] = [
  {
    id: 'inv-oct-rahul',
    orgId: 'org-apex',
    branchId: 'branch-rajpur',
    studentId: 'stud-rahul-10',
    batchId: 'batch-c10-math',
    invoiceNo: 'INV/2026-27/084',
    monthYear: 'October 2026',
    title: 'Monthly Coaching Fee - October 2026 (Math + Science Combo)',
    amount: 4200,
    discount: 200, // combo sibling discount
    lateFee: 0,
    netAmount: 4000,
    paidAmount: 2000,
    dueDate: '2026-10-10',
    status: 'partially_paid',
    createdAt: '2026-09-25',
    payments: [
      {
        id: 'pay-1',
        invoiceId: 'inv-oct-rahul',
        amount: 2000,
        paymentDate: '2026-09-27',
        paymentMethod: 'UPI',
        transactionRef: 'UPI/260927/98432109',
        receivedBy: 'Er. Manoj Verma',
        receiptNo: 'REC-084-A',
        upiApp: 'gpay'
      }
    ]
  },
  {
    id: 'inv-sep-rahul',
    orgId: 'org-apex',
    branchId: 'branch-rajpur',
    studentId: 'stud-rahul-10',
    batchId: 'batch-c10-math',
    invoiceNo: 'INV/2026-27/031',
    monthYear: 'September 2026',
    title: 'Monthly Coaching Fee - September 2026',
    amount: 4000,
    discount: 0,
    lateFee: 0,
    netAmount: 4000,
    paidAmount: 4000,
    dueDate: '2026-09-10',
    status: 'paid',
    createdAt: '2026-09-01',
    payments: [
      {
        id: 'pay-2',
        invoiceId: 'inv-sep-rahul',
        amount: 4000,
        paymentDate: '2026-09-05',
        paymentMethod: 'UPI',
        transactionRef: 'UPI/260905/77889900',
        receivedBy: 'Er. Manoj Verma',
        receiptNo: 'REC-031-FULL',
        upiApp: 'phonepe'
      }
    ]
  },
  {
    id: 'inv-oct-priya',
    orgId: 'org-apex',
    branchId: 'branch-rajpur',
    studentId: 'stud-priya-8',
    batchId: 'batch-c8-found',
    invoiceNo: 'INV/2026-27/085',
    monthYear: 'October 2026',
    title: 'Monthly Coaching Fee - Class 8 Junior Foundation',
    amount: 1800,
    discount: 0,
    lateFee: 0,
    netAmount: 1800,
    paidAmount: 1800,
    dueDate: '2026-10-10',
    status: 'paid',
    createdAt: '2026-09-25',
    payments: [
      {
        id: 'pay-3',
        invoiceId: 'inv-oct-priya',
        amount: 1800,
        paymentDate: '2026-09-26',
        paymentMethod: 'UPI',
        transactionRef: 'UPI/260926/11223344',
        receivedBy: 'Er. Manoj Verma',
        receiptNo: 'REC-085-FULL',
        upiApp: 'gpay'
      }
    ]
  },
  {
    id: 'inv-oct-ankit',
    orgId: 'org-apex',
    branchId: 'branch-rajpur',
    studentId: 'stud-ankit-12',
    batchId: 'batch-c12-phy',
    invoiceNo: 'INV/2026-27/086',
    monthYear: 'October 2026',
    title: 'Monthly Coaching Fee - Class 12 JEE Advanced Combo',
    amount: 5800,
    discount: 300,
    lateFee: 0,
    netAmount: 5500,
    paidAmount: 0,
    dueDate: '2026-10-08',
    status: 'pending',
    createdAt: '2026-09-25',
    payments: []
  },
  {
    id: 'inv-oct-aarav',
    orgId: 'org-apex',
    branchId: 'branch-rajpur',
    studentId: 'stud-aarav-10',
    batchId: 'batch-c10-math',
    invoiceNo: 'INV/2026-27/087',
    monthYear: 'October 2026',
    title: 'Monthly Coaching Fee - Class 10 Math & Science',
    amount: 4200,
    discount: 0,
    lateFee: 0,
    netAmount: 4200,
    paidAmount: 4200,
    dueDate: '2026-10-10',
    status: 'paid',
    createdAt: '2026-09-25',
    payments: [
      {
        id: 'pay-4',
        invoiceId: 'inv-oct-aarav',
        amount: 4200,
        paymentDate: '2026-09-26',
        paymentMethod: 'Cash',
        transactionRef: 'CASH-REC-087',
        receivedBy: 'Er. Manoj Verma',
        receiptNo: 'REC-087-CASH'
      }
    ]
  }
];

export const MOCK_EXAMS: Exam[] = [
  {
    id: 'exam-c10-math-diag',
    orgId: 'org-apex',
    branchId: 'branch-rajpur',
    batchId: 'batch-c10-math',
    title: 'Unit Diagnostic: Quadratic Equations & Trigonometry',
    subject: 'Mathematics',
    examDate: '2026-09-20',
    timeSlot: '05:00 PM - 06:30 PM',
    maxMarks: 50,
    passingMarks: 18,
    status: 'graded'
  },
  {
    id: 'exam-c10-sci-mid',
    orgId: 'org-apex',
    branchId: 'branch-rajpur',
    batchId: 'batch-c10-sci',
    title: 'Science Assessment: Light & Electricity',
    subject: 'Physics & Chemistry',
    examDate: '2026-09-14',
    timeSlot: '05:00 PM - 06:30 PM',
    maxMarks: 40,
    passingMarks: 15,
    status: 'graded'
  },
  {
    id: 'exam-c10-math-boardprep',
    orgId: 'org-apex',
    branchId: 'branch-rajpur',
    batchId: 'batch-c10-math',
    title: 'CBSE Pre-Board Mock Exam 1 (Full Syllabus)',
    subject: 'Mathematics',
    examDate: '2026-10-12',
    timeSlot: '04:30 PM - 07:30 PM',
    maxMarks: 80,
    passingMarks: 27,
    status: 'upcoming'
  }
];

export const MOCK_EXAM_RESULTS: ExamResult[] = [
  {
    id: 'res-1',
    examId: 'exam-c10-math-diag',
    studentId: 'stud-rahul-10',
    marksObtained: 44,
    percentage: 88,
    rank: 2,
    percentile: 92,
    teacherRemarks: 'Excellent grasp of Trigonometric identities! Work a bit more on word problems.',
    status: 'graded'
  },
  {
    id: 'res-2',
    examId: 'exam-c10-math-diag',
    studentId: 'stud-aarav-10',
    marksObtained: 47,
    percentage: 94,
    rank: 1,
    percentile: 98,
    teacherRemarks: 'Flawless calculation and clean presentation.',
    status: 'graded'
  },
  {
    id: 'res-3',
    examId: 'exam-c10-math-diag',
    studentId: 'stud-sneha-10',
    marksObtained: 39,
    percentage: 78,
    rank: 3,
    percentile: 85,
    teacherRemarks: 'Good attempt. Needs revision in quadratic formula derivation.',
    status: 'graded'
  },
  {
    id: 'res-4',
    examId: 'exam-c10-sci-mid',
    studentId: 'stud-rahul-10',
    marksObtained: 35,
    percentage: 87.5,
    rank: 1,
    percentile: 95,
    teacherRemarks: 'Ray diagrams were neatly drawn with arrows. Keep it up!',
    status: 'graded'
  }
];

export const MOCK_ASSIGNMENTS: Assignment[] = [
  {
    id: 'assign-1',
    orgId: 'org-apex',
    branchId: 'branch-rajpur',
    batchId: 'batch-c10-math',
    title: 'NCERT Exemplar Problems - Height and Distance',
    description: 'Solve questions 1 through 15 from NCERT Exemplar Chapter 9 in your register notebook.',
    subject: 'Mathematics',
    teacherId: 'teach-anjali',
    dueDate: '2026-10-02',
    maxPoints: 20,
    attachments: [
      { name: 'Height_Distance_Worksheet_Apex.pdf', url: '#', size: '1.2 MB' }
    ],
    submissions: [
      { studentId: 'stud-rahul-10', status: 'submitted', submittedAt: '2026-09-27T19:30:00', grade: '19/20', feedback: 'Very neat working' },
      { studentId: 'stud-aarav-10', status: 'pending' },
      { studentId: 'stud-sneha-10', status: 'submitted', submittedAt: '2026-09-28T08:15:00' }
    ]
  },
  {
    id: 'assign-2',
    orgId: 'org-apex',
    branchId: 'branch-rajpur',
    batchId: 'batch-c10-sci',
    title: 'Refraction & Lens Formula Practice Numericals',
    description: 'Calculate focal length, magnification and nature of image for given 8 problem statements.',
    subject: 'Physics',
    teacherId: 'teach-rohit',
    dueDate: '2026-10-05',
    maxPoints: 15,
    attachments: [
      { name: 'Optics_Practice_Sheet.pdf', url: '#', size: '850 KB' }
    ],
    submissions: [
      { studentId: 'stud-rahul-10', status: 'pending' },
      { studentId: 'stud-aarav-10', status: 'pending' }
    ]
  }
];

export const MOCK_STUDY_MATERIALS: StudyMaterial[] = [
  {
    id: 'mat-1',
    orgId: 'org-apex',
    branchId: 'branch-rajpur',
    batchId: 'batch-c10-math',
    title: 'Trigonometry Formula Sheet & Quick Revision Map',
    subject: 'Mathematics',
    type: 'pdf',
    fileUrl: '#',
    fileSize: '1.4 MB',
    uploadedByTeacherId: 'teach-anjali',
    uploadedAt: '2026-09-22',
    chapterTopic: 'Chapter 8 & 9 - Trigonometry'
  },
  {
    id: 'mat-2',
    orgId: 'org-apex',
    branchId: 'branch-rajpur',
    batchId: 'batch-c10-sci',
    title: 'Electricity Class Notes with Derivations (Joule Heating Law)',
    subject: 'Physics',
    type: 'notes',
    fileUrl: '#',
    fileSize: '2.8 MB',
    uploadedByTeacherId: 'teach-rohit',
    uploadedAt: '2026-09-18',
    chapterTopic: 'Chapter 12 - Electricity'
  },
  {
    id: 'mat-3',
    orgId: 'org-apex',
    branchId: 'branch-rajpur',
    batchId: 'batch-c10-math',
    title: 'Previous 5 Years CBSE Solved Board Papers (Math Standard)',
    subject: 'Mathematics',
    type: 'practice_paper',
    fileUrl: '#',
    fileSize: '4.5 MB',
    uploadedByTeacherId: 'teach-anjali',
    uploadedAt: '2026-09-10',
    chapterTopic: 'Board Practice Vault'
  }
];

export const MOCK_TIMETABLE: TimetableSlot[] = [
  {
    id: 'tt-1',
    orgId: 'org-apex',
    branchId: 'branch-rajpur',
    batchId: 'batch-c10-math',
    dayOfWeek: 'Monday',
    startTime: '17:00',
    endTime: '18:30',
    classroom: 'Hall 1 (Aryabhata Room)',
    teacherId: 'teach-anjali',
    subject: 'Class 10 Mathematics'
  },
  {
    id: 'tt-2',
    orgId: 'org-apex',
    branchId: 'branch-rajpur',
    batchId: 'batch-c12-phy',
    dayOfWeek: 'Monday',
    startTime: '18:45',
    endTime: '20:15',
    classroom: 'Hall 3 (Einstein Theater)',
    teacherId: 'teach-rohit',
    subject: 'Class 12 Advanced Physics'
  },
  {
    id: 'tt-3',
    orgId: 'org-apex',
    branchId: 'branch-rajpur',
    batchId: 'batch-c10-sci',
    dayOfWeek: 'Tuesday',
    startTime: '17:00',
    endTime: '18:30',
    classroom: 'Room 2 (CV Raman Lab)',
    teacherId: 'teach-rohit',
    subject: 'Class 10 Integrated Science'
  },
  {
    id: 'tt-4',
    orgId: 'org-apex',
    branchId: 'branch-rajpur',
    batchId: 'batch-jee-math',
    dayOfWeek: 'Tuesday',
    startTime: '18:45',
    endTime: '20:15',
    classroom: 'Hall 1 (Aryabhata Room)',
    teacherId: 'teach-anjali',
    subject: 'JEE Foundation Math'
  },
  {
    id: 'tt-5',
    orgId: 'org-apex',
    branchId: 'branch-rajpur',
    batchId: 'batch-c10-math',
    dayOfWeek: 'Wednesday',
    startTime: '17:00',
    endTime: '18:30',
    classroom: 'Hall 1 (Aryabhata Room)',
    teacherId: 'teach-anjali',
    subject: 'Class 10 Mathematics'
  },
  {
    id: 'tt-6',
    orgId: 'org-apex',
    branchId: 'branch-rajpur',
    batchId: 'batch-c10-sci',
    dayOfWeek: 'Thursday',
    startTime: '17:00',
    endTime: '18:30',
    classroom: 'Room 2 (CV Raman Lab)',
    teacherId: 'teach-rohit',
    subject: 'Class 10 Integrated Science'
  },
  {
    id: 'tt-7',
    orgId: 'org-apex',
    branchId: 'branch-rajpur',
    batchId: 'batch-c10-math',
    dayOfWeek: 'Friday',
    startTime: '17:00',
    endTime: '18:30',
    classroom: 'Hall 1 (Aryabhata Room)',
    teacherId: 'teach-anjali',
    subject: 'Class 10 Mathematics'
  },
  {
    id: 'tt-8',
    orgId: 'org-apex',
    branchId: 'branch-rajpur',
    batchId: 'batch-c10-sci',
    dayOfWeek: 'Saturday',
    startTime: '17:00',
    endTime: '18:30',
    classroom: 'Room 2 (CV Raman Lab)',
    teacherId: 'teach-rohit',
    subject: 'Class 10 Integrated Science'
  }
];

export const MOCK_ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'ann-1',
    orgId: 'org-apex',
    branchId: 'branch-rajpur',
    title: 'Dussehra Holiday & Extra Doubt Counter Timings',
    content: 'The academy will remain closed on 2nd October for Gandhi Jayanti and 11th-12th October for Vijayadashami. Extra doubt sessions for Class 10 Math will run Sunday 10 AM to 1 PM.',
    targetAudience: 'all',
    priority: 'normal',
    createdAt: '2026-09-27T10:00:00',
    createdBy: 'Er. Manoj Verma',
    channel: ['in-app', 'whatsapp']
  },
  {
    id: 'ann-2',
    orgId: 'org-apex',
    branchId: 'branch-rajpur',
    title: 'Pre-Board Mock Series Registration Open',
    content: 'Full length 3-hour CBSE pattern test series begins 12th October. All Class 10 students must be seated 15 minutes before exam schedule.',
    targetAudience: 'batch',
    targetBatchId: 'batch-c10-math',
    priority: 'urgent',
    createdAt: '2026-09-26T14:30:00',
    createdBy: 'Prof. Anjali Sharma',
    channel: ['in-app', 'whatsapp'],
    whatsappTemplate: 'Dear Parent, Pre-Board Mock Series for Class 10 Math begins on 12th Oct. Detailed schedule is visible in your VidyaOS Parent App.'
  },
  {
    id: 'ann-3',
    orgId: 'org-apex',
    title: 'Monthly Fee Reminder for October 2026',
    content: 'Kindly clear the pending course fee on or before 10th October to avoid late processing charges. You can pay seamlessly via UPI / GPay / PhonePe from your Parent Portal.',
    targetAudience: 'parents',
    priority: 'urgent',
    createdAt: '2026-09-25T09:00:00',
    createdBy: 'Er. Manoj Verma',
    channel: ['in-app', 'whatsapp', 'sms'],
    whatsappTemplate: 'Dear Parent, October monthly course fee is due by 10th Oct. Tap the link to view invoice & pay via UPI.'
  }
];
