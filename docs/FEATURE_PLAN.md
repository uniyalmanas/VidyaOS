# VidyaOS Real-World Feature Plan (12 Features)

_status: F1 + F2 + F3 + F4 + F5 + F6 + F7 + F8 + F9 + F10 shipped ✅ · F11–F12 pending. Each feature ships one at a time in the order below._

Everything here follows the existing house pattern:

```
types/index.ts  →  context/slices/*.tsx   →  lib/firestoreService.ts (subscribe/persist)
                →  firestore.rules (additive)  →  portal tab UI (Admin/Teacher/Student/Parent)
                →  data/mockData.ts (DEV mirror)  →  test-auth.ts + test-rules.ts (emulator)
```

Rules: no billing, no Cloud Storage — everything below is client-side + Firestore, exactly
like the existing attendance/exams/chat flows. `teachers`/`students`/`batches` etc. all
exist; we only add new collections + types + UI.

---

## Shared groundwork (done once, before Feature 1)

| Piece | Detail |
|---|---|
| **Audit helper** | `src/lib/audit.ts`: `writeAuditLog({ orgId, actor, action, targetType, targetId, summary })` → writes `auditLogs` doc; DEV mirror in localStorage; DEMO session → local-only (same failed-closed rule as every mutation today). All 12 features call this on every create/update/delete/verify. |
| **Notification push helper** | Add `pushNotification(userId, title, message, type, linkTab?)` to `CommunicationContext` (mirrors existing `notifications` state). Features raise: leave approved, fee installment due, PTM booked, AIR published, salary slip issued. |
| **Tab registry** | Each portal keeps a `TABS` map with `label/breadcrumb/subtitle/icon`. New features add one entry each. No central nav refactor needed. |
| **Date/INR helpers** | Reuse `getIndiaDateString()` / `getIndiaDayName()` from `src/lib/date.ts`; format ₹ with `toLocaleString('en-IN')`. |
| **DEV seeding** | Each new collection gets a `MOCK_*` array + `seedInitialFirestoreDataIfEmpty()` batch entry (DEV only), matching `MOCK_INVOICES` etc. |
| **Rules tests** | Every new collection gets an emulator test block in `test-rules.ts`; run via `npx firebase emulators:exec --only auth,firestore --project vidyut-2bcb6 "npx tsx test-rules.ts"`. |

**Definition of Done (every feature):** ✅ new types · ✅ slice + AppContext wiring · ✅
firestoreService subscribe+persist · ✅ rules (additive) · ✅ tab UI in the right portal(s) ·
✅ DEV mock · ✅ unit tests · ✅ emulator rules tests (`test-rules.ts`) · ✅ `tsc` clean ·
✅ `npm run build` · ✅ deployed to `vidyut-2bcb6.web.app`.

---

## Build order (dependency-aware, each independently shippable)

| # | Feature | Why this slot |
|---|---|---|
| F1 | Audit log + data export | Foundation. Nothing depends on it, everything logs into it. Cheapest win. |
| F2 | Leads / inquiry CRM | Highest growth value, fully standalone. |
| F3 | Leave requests (student + teacher) | Touches all portals; settled workflow. |
| F4 | Teacher self-attendance + salary slips | Back-office self-service, pairs with F5 data. |
| F5 | Expense tracking & profit/loss | Reads F4 salary rollup; P&L needs both. |
| F6 | Live class links on timetable | Small, daily-use; first requires timetable rules (see note). |
| F7 | Syllabus / lesson-plan tracker | Academic core; later slots into #3 courses/folders. |
| F8 | PTM / parent meeting scheduler | Parent-experience quality signal. |
| F9 | Student ID card + TC generation | Pure client-side printing, quick win. |
| F10 | Mock test series + all-India rank import | Exam engine extension, marketing value. |
| F11 | Structured fee installments | Heaviest — touches transactional fee code. Do after basics stable. |
| F12 | Session rollover | Cross-cutting writes batches+invoices; deliberately last. |

---

## F1 — Audit log + data export — ✅ SHIPPED (2026-10-07)

**Simple words:** Every change gets recorded (who, what, when); the owner can download a
backup of everything in one click.

**Data model** (`src/types/index.ts`):
```ts
export type AuditAction = 'create'|'update'|'delete'|'verify'|'reject'|'approve'|'login';
export interface AuditLogEntry {
  id: string; orgId: string; branchId?: string;
  actorUserId: string; actorName: string; actorRole: UserRole;
  action: AuditAction;
  targetType: 'student'|'teacher'|'batch'|'invoice'|'payment'|'attendance'|'exam'|'announcement'|'inquiry'|'leave'|'expense'|'salary'|'ptm'|'syllabus'|'user'|'settings';
  targetId: string; summary: string; changes?: Record<string, unknown>;
  createdAt: string;  // ISO, Asia/Kolkata via new Date().toISOString() as elsewhere
}
```

**Collection:** `auditLogs` — `subscribeToAuditLogs(onData, orgId?)` (limit 1000, filtered
by UI date-range) and `persistAuditLogToFirestore(entry)`.

**Rules** (`firestore.rules`, additive):
```
match /auditLogs/{entryId} {
  allow read:  if isSignedIn() && isTenantMember(resource.data.orgId) && (isCenterStaffOrAdmin(resource.data.orgId) || isPlatformOwner());
  allow create: if isSignedIn() && isTenantMember(request.resource.data.orgId) && request.resource.data.actorUserId == request.auth.uid;
  allow update, delete: if false;  // immutable history
}
```

**Slice:** `AuditContext` (`auditLogs` state + `recordAudit(entry)`). Wired in AppContext,
exposed as `useAuditLog`.

**UI:**
- Admin → **Audit Trail** tab: filterable table (actor / action / target / date), "Export CSV",
  "Export JSON backup" (whole tenant collections).
- Export = client-side blob download from already-loaded state — no Storage needed.

**Tests:** unit — `writeAuditLog` idempotence, tenant filter, export CSV escaping. Emulator —
staff read, non-member denied, update/delete denied, actor-spoof denied.

**Non-goals:** no rule-driven automatic audit (we log in the slice, deliberately).

---

## F2 — Leads / admission inquiry CRM — ✅ SHIPPED (2026-10-07)

**Simple words:** A parent calls → we note the name/phone/class → the admission team moves
it through stages (new → demo → joined → lost). Converted leads become students with one tap.

**Data model:**
```ts
export type InquiryStatus = 'new'|'contacted'|'demo_booked'|'joined'|'lost';
export interface Inquiry {
  id: string; orgId: string; branchId: string;
  name: string; phone: string; email?: string;
  classGrade?: string; board?: IndianBoard; subjects?: string[];
  source?: 'walkin'|'call'|'whatsapp'|'referral'|'online'|'other';
  status: InquiryStatus;
  followUpDate?: string;                 // YYYY-MM-DD
  interestedBatchIds?: string[];
  notes: { authorId: string; authorName: string; text: string; createdAt: string }[];
  createdByUserId: string; createdByName: string; createdAt: string; updatedAt: string;
  convertedStudentId?: string;           // set when converted
}
```

**Collection:** `inquiries` — `subscribeToInquiries(onData, orgId?)`, `persistInquiryToFirestore`,
`deleteInquiryFromFirestore`.

**Rules:** read = tenant member; create/update/delete = `isCenterStaffOrAdmin(orgId)`.
(Teachers don't see sales funnel by default — decision, can widen later.)

**Slice:** `InquiryContext` (state + `addInquiry/updateInquiry/deleteInquiry`). AppContext wiring.

**UI:**
- Admin → **Inquiries** tab: pipeline board (Kanban columns per status), add/edit modal,
  follow-up date badge, note thread, search by phone/name.
- **Convert to student** action: opens admission form pre-filled (name/phone/class), calls the
  existing `addStudent` admission flow (provisions STUDENT+PARENT logins — reuse
  `registerUserCredentials` path used by current admission), sets `convertedStudentId`.
- Audit-log every status change.

**Tests:** unit — pipeline transitions, conversion sets `convertedStudentId` and creates
student+parent creds, phone dedupe check against existing students. Emulator — staff write
ok, teacher write denied.

---

## F3 — Leave requests (students + teachers) — ✅ SHIPPED (2026-10-07)

**Simple words:** Student/parent (or teacher) submits "absent on X because sick"; the batch
teacher / admin approves; approved leave becomes an **excused** attendance entry automatically.

**Data model:**
```ts
export type LeaveRequester = 'student'|'teacher';
export type LeaveStatus = 'pending'|'approved'|'rejected';
export interface LeaveRequest {
  id: string; orgId: string; branchId: string;
  requesterType: LeaveRequester;
  studentId?: string; teacherId?: string;   // exactly one set
  requestedByUserId: string; requestedByName: string;
  startDate: string; endDate: string;       // YYYY-MM-DD inclusive
  reason: string; category: 'sick'|'family'|'exam'|'other';
  status: LeaveStatus;
  reviewedByUserId?: string; reviewedByName?: string; reviewedAt?: string; reviewNote?: string;
  createdAt: string;
}
```

**Collection:** `leaveRequests`. Rules:
- read: tenant member.
- create: student/parent linked to `studentId` **or** teacher whose `Teacher.userId == auth.uid`
  **or** staff/admin (they may file on behalf).
- update: creator can only edit while `pending` (status unchanged); staff/admin can approve/reject.
- delete: staff/admin only.

**Slice:** `LeaveContext`. On **approve**, atomically write the leave + `excused` attendance
records for each date (writeBatch — same pattern as `persistStudentWithBatchAtomically`).

**UI:**
- Student/Parent → **Leave** entry + "my leave history".
- Teacher → Manage Roster area gets "Leave Requests" for their batches; approval bumps a
  notification to the requester.
- Admin → all-leaves calendar/table, per-teacher + per-student summary.

**Note:** teacher `status:'on_leave'` exists already — leaving auto-flips it to `on_leave`
for the span (nice touch).

---

## F4 — Teacher self-attendance + salary slips — ✅ SHIPPED (2026-10-07)

**Simple words:** Teachers check in/out daily; at month end the owner issues a salary slip —
base ₹ + extras − deductions — and marks paid.

**Data model:**
```ts
export interface TeacherAttendance {
  id: string; orgId: string; branchId: string; teacherId: string;
  date: string;                                // YYYY-MM-DD
  status: 'present'|'absent'|'half_day'|'on_leave';
  checkIn?: string; checkOut?: string;         // "10:05"
  markedByUserId: string; markedAt: string; remarks?: string;
}
export interface SalarySlip {
  id: string; orgId: string; branchId: string; teacherId: string;
  monthYear: string;                           // "October 2026"
  basic: number; allowances: number; deductions: number; netAmount: number;
  paidAmount: number; status: 'draft'|'issued'|'paid';
  paymentMethod?: PaymentRecord['paymentMethod']; paidAt?: string; paidBy?: string;
  issuedAt: string; createdAt: string;
}
```

**Collections:** `teacherAttendance`, `salarySlips`. Rules:
- `teacherAttendance`: teacher writes only **own** rows (`teacherId` → their `Teacher.userId`);
  staff/admin write all; read = tenant member.
- `salarySlips`: read = tenant member; create/update/delete = staff/admin.

**Slice:** `StaffOpsContext`. `markTeacherAttendance(teacherId, status)`, `issueSalarySlip(...)`,
`markSlipPaid(...)`. Month summary: present/half-day/on-leave counts → prorated salary hint
on the slip modal.

**UI:**
- Teacher → **My Day** (check-in/out one tap) + **My Salary Slips**.
- Admin → **Staff Ops** tab: attendance grid (teachers × days), slip composer (basics prefilled
  from `Teacher.salary`), pay now → writes slip + audit + notification.

**Tests:** unit — attendance idempotence per day, prorate math, slip total math. Emulator —
teacher can't write another teacher's row; teacher can't touch slips.

---

## F5 — Expense tracking & profit/loss — ✅ SHIPPED (2026-10-07)

**Simple words:** Owner records rent/₹ electricity/salaries; the dashboard shows money-in vs
money-out per month, so "am I profitable?" is one glance.

**Data model:**
```ts
export type ExpenseCategory = 'rent'|'salaries'|'electricity'|'internet'|'marketing'|'maintenance'|'printing'|'misc';
export interface Expense {
  id: string; orgId: string; branchId: string;
  title: string; category: ExpenseCategory;
  amount: number; expenseDate: string;        // YYYY-MM-DD
  paymentMethod: PaymentRecord['paymentMethod'];
  vendor?: string; notes?: string;
  recordedByUserId: string; recordedByName: string; createdAt: string;
}
```

**Collection:** `expenses` — staff/admin CRUD; read = tenant member.

**Slice:** `FinanceContext` (expenses + computed P&L). P&L month view:
`income = Σ invoice.payments (received in month)` − `expenses (incl. salary slips rollup) − Σ invoice.discount+lateFee adj.`
Show simple gross profit card per month + category breakdown bars.

**UI:** Admin → **Profit & Loss** tab (month picker, income/expense/net cards, category list,
add-expense modal).

**Tests:** unit — P&L month math, category aggregation, empty-month safe. Emulator — CRUD roles.

---

## F6 — Live class links on timetable — ✅ SHIPPED (2026-10-08)

**Simple words:** Each scheduled class can have a "Join now" Google Meet/Zoom link so students
actually attend online classes from the timetable.

**Investigate first:** `timetableSlots` has **no `firestore.rules` block today** (default-deny).
Confirm whether timetable is persisted or DEV-local before extending; if persisted we add a
rules block; if local, move it to Firestore first.

**Data model:** extend `TimetableSlot` with `meetUrl?: string` and add optional `password?`.
No new collection.

**Rules:** `match /timetableSlots/{slotId}` — read tenant member; create/update/delete
staff/admin (mirror batches block).

**UI:** Admin/Teacher batch schedule editor gets a "Class link" field per slot; Student/Parent
timetable + "Today" card renders the link with a **Join Class** button.

**Tests:** unit — URL validation/redaction; emulator — timetable roles.

> **Shipped notes:** Timetable turned out to be DEV-only in-memory state, so it was
> **moved to Firestore first** (`timetableSlots` subscription + persist/delete in
> `firestoreService.ts`, `AcademicContext` now owns CRUD + a `vidyaos_timetable` DEV
> mirror). Link helpers live in `src/lib/timetable.ts` (scheme-redacting URL
> validation, a 10-min "join window", clash detection) and the admin editor is
> `src/components/timetable/TimetableModule.tsx`. Students/parents get a **Join
> Class** button and a live badge; the rules block mirrors the desk-only write model.

---

## F7 — Syllabus / lesson-plan coverage tracker — ✅ SHIPPED (2026-10-08)

**Simple words:** Chapter-by-chapter checklist per batch: "Chapter 4 Quadratic Equations — done".
Teachers tick coverage; students/parents see what's left.

**Data model:**
```ts
export interface SyllabusTopic {
  id: string; orgId: string; branchId: string; batchId: string;
  subject: string; classGrade: string; board: IndianBoard;
  chapter: string; title: string; sequence: number;
  status: 'not_started'|'in_progress'|'completed';
  coveredByTeacherId?: string; coveredAt?: string; coveredDate?: string; note?: string;
  createdAt: string;
}
```

**Collection:** `syllabusTopics`. Rules: read tenant member; create/update/delete = instructor
or admin; **students cannot write**. Seed chapter lists via "Generate from template" (admin picks
board+class+subject → creates the chapter rows).

**Slice:** `SyllabusContext` (`createTopicsFromTemplate`, `updateTopicStatus`).

**UI:** Teacher → **Syllabus Tracker** tab (batch selector → ordered checklist, one-tap
complete with animation); Admin → coverage overview (batch × % complete); Student/Parent →
read-only progress bar. Links into `StudyMaterial.chapterTopic` when #3 courses land.

**Tests:** unit — template generation, % coverage math, status transitions; emulator — student
write denied.

---

## F8 — PTM / parent–teacher meeting scheduler ✅ SHIPPED

**Simple words:** Owner opens a PTM event with date + time slots; parents book a 15-min slot;
teachers see their diary; everyone gets a reminder.

**Data model:**
```ts
export interface PtmEvent { id: string; orgId: string; branchId: string;
  title: string; date: string; startTime: string; endTime: string; slotMinutes: number;
  teacherIds: string[]; notes?: string; createdBy: string; createdAt: string; }
export interface PtmSlot { id: string; orgId: string; branchId: string; eventId: string;
  teacherId: string; startsAt: string; endsAt: string;              // ISO
  status: 'available'|'booked'|'cancelled';
  bookedByUserId?: string; bookedStudentId?: string; bookedForName?: string; bookedAt?: string; }
```

**Collections:** `ptmEvents`, `ptmSlots`. Booking via `runTransaction` (no double-book).
Rules: staff/admin create events+slots; teacher reads own; parent/student book own slot
(update only `booked*` + status fields — mirror `paymentSubmissions`-style field-lock).

**Slice:** `PtmContext` (`createEvent`, `generateSlots`, `bookSlot`, `cancelBooking`).

**UI:** Admin → **PTM** tab (event + grid); Parent → "Schedule a meeting" (pick teacher+time);
Teacher → "My meetings"; notifications on book/reminder day-of.

**Tests:** unit — slot generation, double-book rejected in tx, cancel frees slot. Emulator —
booking field-lock.

---

## F9 — Student ID card + Transfer Certificate (print) — ✅ SHIPPED (2026-10-08)

**Simple words:** One button → print-ready ID card with photo placeholder + enrollment QR;
one button → official-looking TC with TC number. Browser print-to-PDF, no Storage needed.

**Data model:** new `issuedDocuments { id, orgId, studentId, type:'id_card'|'tc', tcNo?, issuedAt, issuedByUserId, issuedByName }` (for the audit trail + TC numbering).

**UI:**
- Admin/Student → **ID Card** modal: fixed-format card (org logoText, name, class, enrollment,
  batch, photo placeholder, barcode-style encoding of `enrollmentNo`), `window.print()` with
  print CSS.
- Admin → **TC** modal: TC number auto-increment (`${org}-${year}-NNN`), student details,
  admission/leaving dates, remarks, signature lines, print.

**Rules:** read tenant member; write staff/admin (student may only view own — can't create).

**Tests:** unit — TC numbering increment, doc accession recording; emulator — student can't create issuedDocuments.

---

## F10 — Mock test series + all-India rank import ✅ SHIPPED (2026-10-08)

**Simple words:** Real JEE/NEET centers sell "mock test with all-India rank". We add a flag on
exams + a bulk paste-in of external scores so ranks show in results.

**Data model:** extend `Exam` with `examKind?: 'unit'|'mock'|'full_syllabus'|'board'`, `isAllIndia?: boolean`;
extend `ExamResult` with `externalRank?: number`, `externalTotalStudents?: number`, `externalPercentile?: number` and keep internal rank/percentile as-is.

**Slice:** extend `AcademicContext`:
- `createExam` gains the new optional fields.
- `importExternalResults(examId, rows: { studentId, externalRank, externalPercentile? }[])` —
  paste from "csv/ranking sheet", upserts `external*` on results, flags a toast "AIR published".

**UI:** Teacher/Admin → exam form toggle "Mock series with AIR"; results table shows external
rank column + badge ("AIR 247"); student/parent results show "All-India Rank #247 of 4,500".

**Note:** enriching Marketing claims are already in Coverage — this feature is the one place
where "All India Rank" becomes truthful (imported, not fabricated).

**Tests:** unit — import math (percentile validation), AIR display fallback; emulator — unchanged roles.

---

## F11 — Structured fee installments

**Simple words:** "₹6,000 for the term — pay in 3 instalments of ₹2,000." The invoice splits
into dated sub-parts; each is collected and receipted like today.

**Data model:** extend `FeeInvoice` with `installments?: { id; dueDate; amount; status: 'pending'|'partial'|'paid'; paidAmount; paymentIds?: string[] }[]` (optional — old invoices unaffected).

**Slice/transactions (heaviest change):**
- `createInvoice` gains "installment plan" builder (N splits + due dates auto-spaced).
- `recordPaymentAtomically` + `verifyPaymentSubmission` allocate payments to the **next
  unpaid installment** and mark it paid when covered; invoice `status` derives from
  installments when present.
- Rules for `invoices`/`paymentSubmissions` unchanged (field validation already generic); add
  installments to `isValidPaymentSubmission`-style guards only if we tighten — default: keep
  current broad guards.

**UI:** Admin fee form → "Split into instalments" section; invoice detail shows per-installment
timeline with collect buttons; WhatsApp reminder message references the next due date.

**Tests:** unit — split math, allocation order, partial on installment, full-pay shortcut;
emulator — payment submission amount rule against remaining installment balance
(requires careful guard: balance rule reads `netAmount - paidAmount`, which still holds).

---

## F12 — Session rollover

**Simple words:** New academic year → one wizard takes all active batches+students and prepares
next year's setup (new batches, fresh invoices) without retyping everything.

**No new collection.** Writes existing `batches` + `invoices` (+ audit).

**Slice:** `RolloverContext`:
- `previewRollover({ fromYear, toYear })` → dry-run plan grouped by batch:
  - new batch name (e.g. "Class 9 → Class 10" via `classGrade` mapping table or manual rename),
    carried students, teacher, schedule, new annual/monthly fee defaults (editable).
- `executeRollover(plan)` → writeBatch: new batches (id `batch-<slug>-<toYear>`), mark old
  batches `status:'completed'`, generate first-month invoices for carried active students,
  audit each step. Confirmation-only execution (no undo).

**UI:** Admin → **New Academic Year** tab: pick years → review plan table → edit fees → "Start
new year".

**Tests:** unit — mapping/rename rules, dedupe (no batch for a rolled class twice), invoice
generation count; emulator — unchanged roles (existing collections).

---

## Cross-cutting risks / decisions

1. **Rules honesty (keep):** TEACHER already reads/writes org-wide at rules level; product-level
   scoping (like `selectTeacherBatches`) is defense-in-depth. New teacher-facing rules follow the
   **tightest field-lock possible** (e.g. PTM booking, teacher attendance own-row) — strictly
   additive so no existing flow regresses.
2. **No billing/Storage:** every feature is Firestore-only. ID card/TC print to PDF; exports are
   client-side downloads. Storage-dependent variants (photo homework, material upload) stay queued.
3. **DEV mocks:** new MOCK arrays are DEV-gated like `MOCK_ATTENDANCE`; prod boots from Firestore.
4. **Performance:** new listeners reuse `where('orgId','==',orgId) + limit`; keep limits sane
   (audit: 1000, attendance-sized data: 500).
5. **Notifications:** no FCM — in-app `pushNotification` only, mirroring existing behavior.

## How we'll execute

1. Pick the next feature from the order above (start: **F1 — Audit + data export**).
2. Implement per its spec; run `npx tsc --noEmit`, `npm run build`, `npm test`, emulator
   `test-rules.ts` (+ `test-chat-sync.ts` regression).
3. Deploy hosting + firestore.rules to `vidyut-2bcb6.web.app`; verify bundle strings.
4. Mark the feature **✅ done** in this file, commit, move to the next.