import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Layers,
  Database,
  ShieldCheck,
  CreditCard,
  Users,
  Compass,
  FileCode2,
  CheckCircle2,
  Building2,
  Cpu,
  Smartphone,
  Lock,
  X,
  Copy,
  Check
} from 'lucide-react';
import { AnimatePresence, motion, type Variants } from 'motion/react';
import { easings, tSpring, fadeUp } from '../../lib/motion';
import { HowItWorksInfographic } from '../ui';

/** Modal shell: spring pop-in cascading header → sidebar + chapter → footer. */
const archPanelVariants: Variants = {
  hidden: { opacity: 0, scale: 0.96, y: 12 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { ...tSpring, delayChildren: 0.05, staggerChildren: 0.06 }
  },
  exit: {
    opacity: 0,
    scale: 0.97,
    y: 6,
    transition: { duration: 0.16, ease: easings.inOut }
  }
};

export const ArchitectureModal: React.FC = () => {
  const { showArchitectureModal, setShowArchitectureModal } = useApp();
  const [activeSection, setActiveSection] = useState<string>('arch-overview');
  const [copied, setCopied] = useState<boolean>(false);

  const sections = [
    { id: 'arch-overview', label: '1. Product Architecture', icon: Layers },
    { id: 'mvp-roadmap', label: '2 & 3. MVP & Roadmap', icon: CheckCircle2 },
    { id: 'personas-journeys', label: '4 & 5. Personas & Journeys', icon: Users },
    { id: 'db-schema', label: '6. Database Schema', icon: Database },
    { id: 'multi-tenancy', label: '7. Multi-Tenant Architecture', icon: Building2 },
    { id: 'rbac-security', label: '8 & 15. RBAC & Security', icon: ShieldCheck },
    { id: 'subscriptions', label: '9 & 17. Subscription & Pricing', icon: CreditCard },
    { id: 'api-stack', label: '10, 11 & 12. API, Tech Stack & Folders', icon: Cpu },
    { id: 'screens-hierarchy', label: '13 & 14. Screens & Dashboards', icon: Compass },
    { id: 'indian-payments', label: '16 & 20. Indian Payments & UPI', icon: Smartphone },
    { id: 'competition-diff', label: '18 & 19. Competitor Analysis', icon: FileCode2 },
    { id: 'dev-phases', label: '21. Development Roadmap', icon: CheckCircle2 },
  ];

  const handleCopyCurrent = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      {showArchitectureModal && (
        <motion.div
          key="architecture-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-3 md:p-6 overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: easings.outQuart }}
        >
          <motion.div
            variants={archPanelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="bg-white dark:bg-slate-900 w-full max-w-6xl h-[92vh] rounded-2xl shadow-2xl flex flex-col border border-slate-200 dark:border-slate-800 overflow-hidden"
          >
            {/* Header */}
            <motion.div variants={fadeUp} className="px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-indigo-900/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/40 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg tracking-tight text-white">VidyaOS System Architecture & Blueprint</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Production Grade v1.0
                </span>
              </div>
              <p className="text-xs text-slate-300">Complete 21-part architectural specification for Indian Coaching & Education SaaS</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopyCurrent}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/10 hover:bg-white/20 text-slate-200 transition"
              title="Copy architectural summary"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied!' : 'Copy Summary'}</span>
            </button>
            <button
              onClick={() => setShowArchitectureModal(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
            </motion.div>

            {/* Content body with sidebar */}
            <div className="flex-1 flex overflow-hidden">
              {/* Navigation Sidebar */}
              <motion.div variants={fadeUp} className="w-64 bg-slate-50 dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 p-3 overflow-y-auto space-y-1">
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-3 py-2">
              Architectural Chapters
            </div>
            {sections.map(s => {
              const Icon = s.icon;
              const isActive = activeSection === s.id;
              return (
                <motion.button
                  key={s.id}
                  type="button"
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setActiveSection(s.id)}
                  className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-left text-xs font-medium transition ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200 dark:shadow-none font-semibold'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                  <span className="truncate">{s.label}</span>
                </motion.button>
              );
            })}
              </motion.div>

              {/* Section Detail Panel */}
              <div className="flex-1 p-6 overflow-y-auto bg-white dark:bg-slate-900 custom-scrollbar space-y-6 text-slate-800 dark:text-slate-200 text-sm leading-relaxed">
                <motion.div
                  key={activeSection}
                  className="space-y-6"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.26, ease: easings.outQuart }}
                >
            {activeSection === 'arch-overview' && (
              <div className="space-y-4">
                <div className="border-b pb-3">
                  <h2 className="text-xl font-bold text-slate-900">1. Product Architecture Overview</h2>
                  <p className="text-slate-500 text-xs mt-1">Multi-tenant SaaS operating system designed specifically for Indian coaching and education centers.</p>
                </div>

                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-xs space-y-2">
                  <div className="font-semibold text-indigo-950 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    High-Level Tier Architecture
                  </div>
                  <pre className="bg-indigo-950 text-indigo-100 p-3 rounded-lg overflow-x-auto text-[11px] font-mono leading-tight">
{`Client Tier (Web / Responsive PWA)
  ├── Coaching Admin Console (Desktop / Tablet)
  ├── Teacher Mobile Attendance & Marks Roster (Android Optimized)
  ├── Direct Parent Portal (Mobile-First, Multi-Child, OTP Login)
  └── Student Workspace (Assignments, Results, Materials)
       ↓ (HTTPS / REST + WebSocket Events)
API Gateway & Security Layer
  ├── Rate Limiting, DDoS Protection & Cloudflare
  ├── JWT Auth & Role-Based Access Control (RBAC)
  └── Tenant Context Resolver (Tenant-ID Header / Subdomain / Token Claims)
       ↓
Application / Domain Logic Layer
  ├── Tenant Manager (Isolation, Quotas, Onboarding)
  ├── Academic Core (Students, Teachers, Batches, Timetable Clash Detector)
  ├── Attendance Engine (1-Tap Mark, WhatsApp Absentee Alerts)
  ├── Indian Fee & Invoicing Engine (UPI QR, Part-Payments, GST Receipts)
  └── Examination & Reporting Engine (Percentile, Ranks, Report Cards)
       ↓
Persistence Tier
  ├── Relational Multi-Tenant Storage (PostgreSQL with Row-Level Security RLS)
  ├── S3/GCS Object Storage (Study Notes, PDFs, Receipts, Avatars)
  └── Redis Cache (User Sessions, OTP verification tokens, Quota meters)`}
                  </pre>
                </div>

                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 p-4">
                  <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-1.5">
                    <Compass className="w-4 h-4 text-indigo-500" />
                    End-to-End Product Flow
                  </div>
                  <HowItWorksInfographic variant="compact" />
                </div>

                <h3 className="font-bold text-slate-900 text-base">Key Architectural Tenets</h3>
                <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-600">
                  <li><strong className="text-slate-900">Zero Cross-Tenant Leakage:</strong> Every query enforces tenant context through scoped ORM models and PostgreSQL Row-Level Security (RLS).</li>
                  <li><strong className="text-slate-900">Low-End Android Optimization:</strong> Teacher mobile attendance and parent portals are ultra-lean (&lt;100KB initial bundle footprint) to run flawlessly on 4G Jio/Airtel connections.</li>
                  <li><strong className="text-slate-900">WhatsApp-First Communication:</strong> Rather than forcing users to check in-app, crucial alerts (absence, fee receipts, exam ranks) leverage automated WhatsApp Business API templates.</li>
                </ul>
              </div>
            )}

            {activeSection === 'mvp-roadmap' && (
              <div className="space-y-4">
                <div className="border-b pb-3">
                  <h2 className="text-xl font-bold text-slate-900">2 & 3. MVP Scope vs Future Roadmap</h2>
                  <p className="text-slate-500 text-xs mt-1">Disciplined phased delivery focused on solving acute day-to-day pain points first.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border border-emerald-200 bg-emerald-50/40 rounded-xl p-4 space-y-2">
                    <span className="inline-block px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-600 text-white">MVP Features (Phase 1 - Built & Live)</span>
                    <ul className="text-xs space-y-1.5 text-slate-700">
                      <li>✅ Multi-tenant workspace creation & trial management</li>
                      <li>✅ Student Directory with Batch assignment & Parent linking</li>
                      <li>✅ Teacher & Staff assignment to subject batches</li>
                      <li>✅ 1-Tap Mobile Attendance with Absentee WhatsApp notification</li>
                      <li>✅ Indian Fee Manager: UPI QR, Cash, Part payments, Receipts</li>
                      <li>✅ Direct Independent Parent Portal with Multi-child switcher</li>
                      <li>✅ Exam scheduler & marks grading with rank calculation</li>
                      <li>✅ Timetable scheduler with room/teacher conflict detection</li>
                      <li>✅ SaaS Super Admin dashboard with MRR, churn & tenant control</li>
                    </ul>
                  </div>

                  <div className="border border-indigo-200 bg-indigo-50/40 rounded-xl p-4 space-y-2">
                    <span className="inline-block px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-600 text-white">Future Roadmap (Phases 2 & 3)</span>
                    <ul className="text-xs space-y-1.5 text-slate-700">
                      <li>🚀 Automatic WhatsApp Chatbot for parent fee queries & reminders</li>
                      <li>🚀 Native Razorpay / Cashfree webhook integration with auto-reconcile</li>
                      <li>🚀 AI Diagnostic Report Generator for students from test scores</li>
                      <li>🚀 AI Question Paper Generator matching CBSE/ICSE patterns</li>
                      <li>🚀 RFID / Biometric thumb scanner hardware sync via local agent</li>
                      <li>🚀 Multi-center teacher payroll & salary calculation module</li>
                      <li>🚀 Regional language localization (Hindi, Marathi, Gujarati, Tamil)</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'personas-journeys' && (
              <div className="space-y-4">
                <div className="border-b pb-3">
                  <h2 className="text-xl font-bold text-slate-900">4 & 5. User Personas & Core Journeys</h2>
                  <p className="text-slate-500 text-xs mt-1">Grounded in the real operating habits of Indian coaching centers.</p>
                </div>

                <div className="space-y-3">
                  <div className="p-3 border rounded-xl bg-slate-50 space-y-1 text-xs">
                    <div className="font-bold text-slate-900 text-sm flex items-center justify-between">
                      <span>Persona 1: Er. Manoj Verma (Center Owner / Admin)</span>
                      <span className="text-indigo-600 font-semibold">"Wants zero fee defaults & 1-screen control"</span>
                    </div>
                    <p className="text-slate-600">Runs Apex Academy with 180 students across Class 9-12. Previously tracked fees on Excel and diary. Had ₹80,000+ uncollected fees each quarter because he felt awkward asking parents verbally.</p>
                    <p className="text-indigo-700 font-medium">Journey: Opens VidyaOS in morning → Checks fees collected vs pending → Sends 1-click WhatsApp reminders → Reviews absent students → Downloads weekly collection sheet.</p>
                  </div>

                  <div className="p-3 border rounded-xl bg-slate-50 space-y-1 text-xs">
                    <div className="font-bold text-slate-900 text-sm flex items-center justify-between">
                      <span>Persona 2: Rajesh Sharma (Busy Parent, 2 Children)</span>
                      <span className="text-indigo-600 font-semibold">"Needs immediate clarity without phone calls"</span>
                    </div>
                    <p className="text-slate-600">Works in government office. Has son Rahul (Class 10 CBSE) and daughter Priya (Class 8 ICSE). Can't attend weekly teacher meetings but wants to know if Rahul is regularly attending and where he ranks.</p>
                    <p className="text-indigo-700 font-medium">Journey: Receives WhatsApp link → Logs in via OTP → Toggles between Rahul and Priya → Checks attendance (87%) → Pays ₹2,000 pending fee via Google Pay in 20 seconds → Downloads instant receipt.</p>
                  </div>

                  <div className="p-3 border rounded-xl bg-slate-50 space-y-1 text-xs">
                    <div className="font-bold text-slate-900 text-sm flex items-center justify-between">
                      <span>Persona 3: Prof. Anjali Sharma (Senior Math Teacher)</span>
                      <span className="text-indigo-600 font-semibold">"Wants attendance done in 30 seconds on phone"</span>
                    </div>
                    <p className="text-slate-600">Teaches 4 batches back-to-back. Hates paper registers that get lost or torn. Enters exam marks after checking answer sheets.</p>
                    <p className="text-indigo-700 font-medium">Journey: Opens batch roster on phone at 5:02 PM → Taps "Mark All Present" → Taps 1 student who is absent → Hits Save → System automatically triggers parent WhatsApp alert.</p>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'db-schema' && (
              <div className="space-y-4">
                <div className="border-b pb-3">
                  <h2 className="text-xl font-bold text-slate-900">6. Relational Database Schema (PostgreSQL)</h2>
                  <p className="text-slate-500 text-xs mt-1">Normalized schema with strict foreign keys and tenant isolation columns.</p>
                </div>

                <div className="bg-slate-900 text-slate-100 p-4 rounded-xl font-mono text-[11px] overflow-x-auto space-y-3 leading-relaxed">
{`-- 1. SaaS Platform Tenancy
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  owner_name VARCHAR(150) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(150),
  gstin VARCHAR(20),
  upi_id VARCHAR(100) NOT NULL,
  plan_id VARCHAR(50) DEFAULT 'starter',
  subscription_status VARCHAR(30) DEFAULT 'trial',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Multi-Branch Support
CREATE TABLE branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(150) NOT NULL,
  city VARCHAR(100),
  address TEXT,
  phone VARCHAR(20),
  is_main BOOLEAN DEFAULT false
);

-- 3. Users & Auth (Role-based: PLATFORM_OWNER, CENTER_ADMIN, TEACHER, STUDENT, PARENT)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(150),
  name VARCHAR(150) NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Students
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id),
  enrollment_no VARCHAR(100) NOT NULL,
  name VARCHAR(150) NOT NULL,
  class_grade VARCHAR(50) NOT NULL,
  board VARCHAR(50) NOT NULL,
  school_name VARCHAR(200),
  phone VARCHAR(20),
  admission_date DATE,
  status VARCHAR(30) DEFAULT 'active'
);

-- 5. Parent-Student Linkage (Supports 1 parent -> multiple students, multiple guardians)
CREATE TABLE parent_student_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  parent_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  relationship VARCHAR(50) NOT NULL, -- Father, Mother, Local Guardian
  is_primary BOOLEAN DEFAULT true,
  UNIQUE(parent_user_id, student_id)
);

-- 6. Batches / Classes
CREATE TABLE batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id),
  name VARCHAR(150) NOT NULL,
  subject VARCHAR(100) NOT NULL,
  teacher_id UUID REFERENCES users(id),
  classroom VARCHAR(100),
  schedule_days TEXT[], -- ['Mon', 'Wed', 'Fri']
  time_slot VARCHAR(100),
  capacity INT DEFAULT 30,
  monthly_fee DECIMAL(10, 2) NOT NULL
);

-- 7. Fee Invoices & Payment Ledger
CREATE TABLE fee_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  invoice_no VARCHAR(100) NOT NULL,
  title VARCHAR(200) NOT NULL,
  net_amount DECIMAL(10, 2) NOT NULL,
  paid_amount DECIMAL(10, 2) DEFAULT 0,
  due_date DATE NOT NULL,
  status VARCHAR(30) DEFAULT 'pending' -- paid, partially_paid, overdue
);

CREATE TABLE payment_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES fee_invoices(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL, -- UPI, Cash, NetBanking, Cheque
  transaction_ref VARCHAR(100),
  receipt_no VARCHAR(100) NOT NULL,
  paid_at TIMESTAMPTZ DEFAULT now()
);`}
                </div>
              </div>
            )}

            {activeSection === 'multi-tenancy' && (
              <div className="space-y-4">
                <div className="border-b pb-3">
                  <h2 className="text-xl font-bold text-slate-900">7. Multi-Tenant SaaS Architecture</h2>
                  <p className="text-slate-500 text-xs mt-1">Partitioning strategy, database isolation, and subdomain routing.</p>
                </div>

                <div className="space-y-3 text-xs">
                  <p className="text-slate-700">
                    We utilize a <strong>Pooled Multi-Tenant Database with Row-Level Security (RLS)</strong> and tenant column indexing. For enterprise coaching chains (&gt;5,000 students), the architecture supports dedicated database instances (Silo tenancy) with the same unified application container.
                  </p>
                  <div className="bg-slate-50 border p-3 rounded-xl space-y-2">
                    <span className="font-bold text-slate-900 text-sm">Tenant Resolution Pipeline:</span>
                    <ol className="list-decimal pl-5 space-y-1 text-slate-600">
                      <li><strong>Subdomain Matching:</strong> <code>apexacademy.vidyaos.in</code> resolves to organization slug <code>apex-academy</code>.</li>
                      <li><strong>Header Extraction:</strong> Mobile client sends <code>X-Tenant-ID: org-apex</code> validated against JWT claims.</li>
                      <li><strong>Session Scoping:</strong> PostgreSQL connection pool executes <code>SET LOCAL app.current_tenant_id = 'org-apex'</code> for each transaction.</li>
                      <li><strong>Zero Data Leakage:</strong> Queries without matching tenant context return 403 Forbidden or empty sets at the DB driver level.</li>
                    </ol>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'rbac-security' && (
              <div className="space-y-4">
                <div className="border-b pb-3">
                  <h2 className="text-xl font-bold text-slate-900">8 & 15. RBAC Matrix & Security Architecture</h2>
                  <p className="text-slate-500 text-xs mt-1">Strict role-based permissions preventing unauthorized discovery or privilege escalation.</p>
                </div>

                <div className="overflow-x-auto border rounded-xl">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] border-b">
                      <tr>
                        <th className="p-2.5">Role</th>
                        <th className="p-2.5">Scope</th>
                        <th className="p-2.5">Permissions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-slate-600">
                      <tr>
                        <td className="p-2.5 font-bold text-indigo-700">Platform Owner</td>
                        <td className="p-2.5">Global SaaS</td>
                        <td className="p-2.5">Manage all orgs, subscriptions, suspend tenants, modify plans, view MRR.</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-bold text-slate-900">Center Admin</td>
                        <td className="p-2.5">Single Org</td>
                        <td className="p-2.5">Full CRUD on students, batches, teachers, fees, receipts, exams, timetable, announcements.</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-bold text-slate-900">Teacher</td>
                        <td className="p-2.5">Assigned Batches</td>
                        <td className="p-2.5">Mark attendance, grade exams, upload assignments & notes. No access to financial totals.</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-bold text-emerald-700">Parent</td>
                        <td className="p-2.5">Linked Children Only</td>
                        <td className="p-2.5">View attendance %, pay fees via UPI, download receipts, view marks/reports, contact admin.</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-bold text-slate-700">Student</td>
                        <td className="p-2.5">Self Record</td>
                        <td className="p-2.5">View timetable, assignments, study materials, exam scores. No fee modification.</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-xs text-amber-900 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <Lock className="w-4 h-4 text-amber-700" />
                    Parent-Student IDOR Prevention Guardrail
                  </div>
                  <p>Parent endpoints do not allow passing arbitrary student IDs in parameters. The backend inspects the <code>parent_student_links</code> table to ensure the authenticated user's ID is actively linked to the requested student before returning any attendance or fee record.</p>
                </div>
              </div>
            )}

            {activeSection === 'subscriptions' && (
              <div className="space-y-4">
                <div className="border-b pb-3">
                  <h2 className="text-xl font-bold text-slate-900">9 & 17. Subscription & Pricing Strategy</h2>
                  <p className="text-slate-500 text-xs mt-1">Tiered pricing calibrated to Indian coaching & education institute economics.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="border rounded-xl p-3 bg-slate-50 space-y-2">
                    <div className="font-bold text-slate-900 text-sm">Starter Batch</div>
                    <div className="text-xl font-extrabold text-indigo-700">₹599 <span className="text-xs font-normal text-slate-500">/month</span></div>
                    <div className="text-[11px] text-slate-500">Up to 100 students • 1 Branch</div>
                    <p className="text-slate-600">Replaces paper register. 1-tap mobile attendance, UPI fee logging, digital receipts & parent portal.</p>
                  </div>

                  <div className="border-2 border-indigo-500 rounded-xl p-3 bg-indigo-50/50 space-y-2 relative">
                    <span className="absolute -top-2.5 right-3 bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">POPULAR</span>
                    <div className="font-bold text-slate-900 text-sm">Growth Academy</div>
                    <div className="text-xl font-extrabold text-indigo-700">₹1,299 <span className="text-xs font-normal text-slate-500">/month</span></div>
                    <div className="text-[11px] text-slate-500">Up to 300 students • 2 Branches</div>
                    <p className="text-slate-600">Unlimited teachers, timetable clash detector, automated WhatsApp fee reminders, exam ranking analytics.</p>
                  </div>

                  <div className="border rounded-xl p-3 bg-slate-50 space-y-2">
                    <div className="font-bold text-slate-900 text-sm">Multi-Branch Pro</div>
                    <div className="text-xl font-extrabold text-indigo-700">₹2,199 <span className="text-xs font-normal text-slate-500">/month</span></div>
                    <div className="text-[11px] text-slate-500">Up to 1,000 students • 5 Branches</div>
                    <p className="text-slate-600">For large coaching networks and test prep academies. Consolidated multi-branch P&L, custom institute branding, dedicated account manager.</p>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'api-stack' && (
              <div className="space-y-4">
                <div className="border-b pb-3">
                  <h2 className="text-xl font-bold text-slate-900">10, 11 & 12. API, Tech Stack & Project Structure</h2>
                  <p className="text-slate-500 text-xs mt-1">Clean layer separation with production-ready TypeScript architecture.</p>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="font-bold text-slate-900">Recommended Production Tech Stack:</div>
                  <ul className="list-disc pl-5 space-y-1 text-slate-600">
                    <li><strong>Frontend:</strong> React 19 + TypeScript + Vite + Tailwind CSS v4 + Motion for fluid interactions.</li>
                    <li><strong>Backend API:</strong> Express / Node.js or FastAPI with strictly typed request validation (Zod).</li>
                    <li><strong>Database:</strong> PostgreSQL (Cloud SQL / Supabase) with pgBouncer connection pooling.</li>
                    <li><strong>Storage:</strong> S3-compatible cloud object store with presigned download URLs.</li>
                    <li><strong>Communication:</strong> Meta Cloud API for WhatsApp Business, MSG91 for SMS OTP fallback.</li>
                  </ul>
                </div>

                <div className="bg-slate-900 text-slate-100 p-3 rounded-xl font-mono text-[11px] space-y-1">
                  <div className="text-slate-400 font-bold mb-1">// Project Directory Structure</div>
                  <div>src/</div>
                  <div>├── components/</div>
                  <div>│   ├── admin/       (Dashboard, Students, Batches, Fees, Attendance, Exams, Timetable)</div>
                  <div>│   ├── teacher/     (Mobile Attendance sheet, Marks entry roster, Homework)</div>
                  <div>│   ├── parent/      (Direct Mobile Parent Portal, Child Switcher, 1-Tap UPI Pay)</div>
                  <div>│   ├── student/     (Student Schedule, Results, Assignments)</div>
                  <div>│   ├── saas-owner/  (Platform Overview, Org Management, Subscription Plans)</div>
                  <div>│   ├── common/      (Receipt modal, UPI modal, WhatsApp modal, Badges)</div>
                  <div>│   └── architecture/(Full 21-part System Spec & Blueprint Viewer)</div>
                  <div>├── context/         (AppContext with Multi-Tenant state & mutations)</div>
                  <div>├── data/            (Authentic Indian coaching institute datasets)</div>
                  <div>└── types/           (Comprehensive TypeScript interfaces & enums)</div>
                </div>
              </div>
            )}

            {activeSection === 'screens-hierarchy' && (
              <div className="space-y-4">
                <div className="border-b pb-3">
                  <h2 className="text-xl font-bold text-slate-900">13 & 14. Complete Screen Hierarchy & Dashboards</h2>
                  <p className="text-slate-500 text-xs mt-1">Intuitive screen architecture designed for non-technical coaching center owners and parents.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="border p-3 rounded-xl bg-slate-50 space-y-1.5">
                    <span className="font-bold text-slate-900">Center Admin Navigation:</span>
                    <ul className="list-disc pl-5 space-y-1 text-slate-600">
                      <li><strong>Center Dashboard:</strong> Revenue stats, today's attendance %, upcoming exams</li>
                      <li><strong>Student Directory:</strong> Profile, enrollment card, fee ledger, batch tags</li>
                      <li><strong>Batch Manager:</strong> Schedule, room assignments, capacity meters</li>
                      <li><strong>Daily Attendance:</strong> 1-Tap register, absent notifications</li>
                      <li><strong>Fee Management:</strong> Invoices, cash/UPI collection, print receipt</li>
                      <li><strong>Exams & Marks:</strong> Diagnostic tests, marks entry, batch report cards</li>
                      <li><strong>Timetable:</strong> Weekly room & teacher conflict resolver</li>
                      <li><strong>Notice Board:</strong> WhatsApp broadcasts and announcements</li>
                    </ul>
                  </div>

                  <div className="border p-3 rounded-xl bg-slate-50 space-y-1.5">
                    <span className="font-bold text-slate-900">Direct Parent Portal (Mobile First):</span>
                    <ul className="list-disc pl-5 space-y-1 text-slate-600">
                      <li><strong>Child Switcher Bar:</strong> Seamlessly flip between children</li>
                      <li><strong>Executive Summary:</strong> Attendance %, Pending Fee, Next Class/Exam</li>
                      <li><strong>Attendance History:</strong> Calendar view with absent date logs</li>
                      <li><strong>Fee Ledger & 1-Tap UPI:</strong> QR / GPay link & verified receipt PDF</li>
                      <li><strong>Report Cards:</strong> Subject marks, batch rank & teacher feedback</li>
                      <li><strong>Notice Stream:</strong> Direct announcements from institute admin</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'indian-payments' && (
              <div className="space-y-4">
                <div className="border-b pb-3">
                  <h2 className="text-xl font-bold text-slate-900">16 & 20. Indian Payment & UPI Integration</h2>
                  <p className="text-slate-500 text-xs mt-1">UPI-first architecture eliminating payment gateway merchant fees for small centers.</p>
                </div>

                <div className="space-y-3 text-xs text-slate-700">
                  <p>
                    Indian coaching centers operate with high sensitivity to gateway transaction cuts (2% on Razorpay). VidyaOS provides a <strong>Dual-Mode Payment Architecture</strong>:
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="border p-3 rounded-xl bg-slate-50 space-y-1">
                      <span className="font-bold text-emerald-800 text-sm">Mode 1: Zero-Fee Direct UPI QR (Default)</span>
                      <p className="text-slate-600">
                        Generates a dynamic or static UPI intent link: <code>upi://pay?pa=apexacademy@icici&pn=Apex+Academy&am=2000&tr=INV084&cu=INR</code>.
                        Parents tap to open Google Pay, PhonePe, or Paytm directly. 0% transaction fee. The admin verifies the UTR/Reference number in 1 click.
                      </p>
                    </div>

                    <div className="border p-3 rounded-xl bg-slate-50 space-y-1">
                      <span className="font-bold text-indigo-800 text-sm">Mode 2: Automated Gateway (Razorpay/Cashfree)</span>
                      <p className="text-slate-600">
                        For larger academies wanting instant auto-reconciliation and credit card EMI options. Webhooks trigger immediate invoice status updates and receipt dispatch.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'competition-diff' && (
              <div className="space-y-4">
                <div className="border-b pb-3">
                  <h2 className="text-xl font-bold text-slate-900">18 & 19. Competitor Analysis & Differentiators</h2>
                  <p className="text-slate-500 text-xs mt-1">Why VidyaOS beats existing solutions in the Indian market.</p>
                </div>

                <div className="overflow-x-auto border rounded-xl text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 font-bold uppercase text-[10px] border-b text-slate-700">
                      <tr>
                        <th className="p-2.5">Dimension</th>
                        <th className="p-2.5">Classplus / Teachmint</th>
                        <th className="p-2.5">Generic School ERPs</th>
                        <th className="p-2.5 text-indigo-700">VidyaOS (Our Platform)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-slate-600">
                      <tr>
                        <td className="p-2.5 font-bold text-slate-900">Target Focus</td>
                        <td className="p-2.5">Individual creators selling recorded video courses</td>
                        <td className="p-2.5">Large K-12 schools with bus tracking, hostels</td>
                        <td className="p-2.5 font-bold text-indigo-700">Local physical & hybrid coaching & education institutes</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-bold text-slate-900">Pricing</td>
                        <td className="p-2.5">₹25k - ₹50k upfront white-label app setup</td>
                        <td className="p-2.5">₹50k - ₹2L annual enterprise contracts</td>
                        <td className="p-2.5 font-bold text-emerald-700">₹599 - ₹1,299/mo self-serve SaaS</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-bold text-slate-900">Parent Experience</td>
                        <td className="p-2.5">Forced to download bloated 80MB branded apps</td>
                        <td className="p-2.5">Complex clunky web portals with forgotten passwords</td>
                        <td className="p-2.5 font-bold text-indigo-700">Instant mobile-first PWA with OTP + Multi-child switcher</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-bold text-slate-900">Time to Value</td>
                        <td className="p-2.5">2 - 3 weeks onboarding</td>
                        <td className="p-2.5">1 - 2 months implementation</td>
                        <td className="p-2.5 font-bold text-indigo-700">3 minutes to register & start taking attendance</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeSection === 'dev-phases' && (
              <div className="space-y-4">
                <div className="border-b pb-3">
                  <h2 className="text-xl font-bold text-slate-900">21. Development Roadmap & Milestones</h2>
                  <p className="text-slate-500 text-xs mt-1">Systematic execution progression from MVP to commercial scaling.</p>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="border-l-4 border-emerald-500 pl-3 py-1 space-y-1">
                    <span className="font-bold text-emerald-700">Phase 1: Core Operating System (Current Release)</span>
                    <p className="text-slate-600">Multi-tenant architecture, Center Admin dashboard, student & batch management, mobile attendance roster, UPI fee collection & printable receipts, independent parent portal with OTP authentication & multi-child toggle, SaaS owner dashboard.</p>
                  </div>

                  <div className="border-l-4 border-indigo-500 pl-3 py-1 space-y-1">
                    <span className="font-bold text-indigo-700">Phase 2: Automated Communication & Hardware Integrations</span>
                    <p className="text-slate-600">Official WhatsApp Business Cloud API integration for automatic absentee pings and fee receipt delivery. Biometric thumb reader USB daemon for automatic attendance punching.</p>
                  </div>

                  <div className="border-l-4 border-purple-500 pl-3 py-1 space-y-1">
                    <span className="font-bold text-purple-700">Phase 3: AI-Driven Exam & Diagnostic Intelligence</span>
                    <p className="text-slate-600">Automated chapter-wise test paper generation adhering to CBSE/ICSE blueprint specifications, student weak-topic detection, and automated report card remarks.</p>
                  </div>
                </div>
              </div>
            )}
                </motion.div>
              </div>
            </div>

            {/* Modal Footer */}
            <motion.div variants={fadeUp} className="px-6 py-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center space-x-2">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>VidyaOS SaaS System Engine Active</span>
              </div>
              <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                onClick={() => setShowArchitectureModal(false)}
                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-lg transition hover:shadow-[var(--fb-glow-primary)]"
              >
                Close Blueprint
              </motion.button>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
