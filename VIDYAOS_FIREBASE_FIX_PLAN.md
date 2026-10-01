# VIDYAOS FIREBASE FIX PLAN

**Project:** VidyaOS - Operating System for Indian Tuition Centers  
**Document Purpose:** Comprehensive, production-grade fix strategy addressing all 12 quality scorecard domains and audit findings.  
**Strict Directives:** Read-only planning phase before execution; preserve existing UI, routes, PWA resilience, and domain contexts.

---

## 1. Executive Summary & Root Cause Analysis

### Core Deficiencies to Resolve:
1. **Firestore Security Rules Permissiveness:** `firestore.rules` currently allows `read, write: if true;` globally.
2. **Cleartext Password Storage:** `/credentials/{phone}` collection stores raw passwords in Firestore documents.
3. **Frontend-Only Multi-Tenancy:** Isolation checks happen inside React memory rather than at the database security boundary.
4. **Session & Auth State Inconsistencies:** Dual auth representation in `localStorage` (`vidyaos_auth_session`) vs Firebase Auth (`auth.currentUser`), with hardcoded test passwords (`admin123`, `vidya123`) in production code paths.
5. **Unbounded Firestore Listeners & Client-Side Filtering:** Complete collection listeners without pagination or query limits causing excessive bandwidth and read billing.
6. **Non-Atomic Related Mutations:** Updating student batch enrollments and invoice payments without `writeBatch` or `runTransaction`.
7. **Storage Rules Security Gaps:** Broad public access on `/receipts/**` and absence of tenant path prefixing and MIME/size limits.

---

## 2. Architecture & Security Model Design

### A. Authentication Architecture:
- **Primary Auth Source of Truth:** `firebase/auth` (`onAuthStateChanged`).
- **Elimination of Cleartext `/credentials` Collection:**
  - Phone numbers are mapped to Firebase Email/Password auth formatted as `${cleanPhone}@phone.vidyaos.in` or native Firebase Auth user accounts.
  - Transparently authenticate and upgrade legacy phone logins to Firebase Auth accounts without exposing cleartext credentials in Firestore.
  - Delete simulated credential writes in Firestore.
- **Session Management:**
  - Token refresh and authentication persistence handled natively by Firebase Web SDK (`LOCAL` persistence).
  - Non-sensitive UI preferences stored in `localStorage`, but `currentUser` and `currentOrgId` bound to validated Firebase Auth user profile (`/users/{uid}`).

### B. Multi-Tenancy & Authorization (RBAC) in Firestore Security Rules:
- **Helper Functions in `firestore.rules`:**
  - `isAuthenticated()`: `request.auth != null`
  - `getUserDoc()`: `get(/databases/$(database)/documents/users/$(request.auth.uid)).data`
  - `getUserOrgId()`: `getUserDoc().orgId`
  - `getUserRole()`: `getUserDoc().role`
  - `isPlatformOwner()`: `getUserRole() == 'PLATFORM_OWNER'`
  - `isCenterAdmin()`: `getUserRole() == 'CENTER_ADMIN'`
  - `isStaff()`: `getUserRole() == 'STAFF'`
  - `isTeacher()`: `getUserRole() == 'TEACHER'`
  - `isParent()`: `getUserRole() == 'PARENT'`
  - `isStudent()`: `getUserRole() == 'STUDENT'`
  - `isTenantMember(orgId)`: `isPlatformOwner() || getUserOrgId() == orgId`
- **Rule Enforcement:**
  - **`organizations/{orgId}`**:
    - Read: `isAuthenticated() && isTenantMember(orgId)`
    - Create: `isAuthenticated() && (isPlatformOwner() || isCenterAdmin())`
    - Update: `isAuthenticated() && isTenantMember(orgId) && (isPlatformOwner() || isCenterAdmin())`
    - Delete: `isAuthenticated() && isPlatformOwner()`
  - **`users/{userId}`**:
    - Read: `isAuthenticated() && (request.auth.uid == userId || isPlatformOwner() || getUserOrgId() == resource.data.orgId)`
    - Create: `isAuthenticated() && (request.auth.uid == userId || isPlatformOwner() || (isCenterAdmin() && request.resource.data.orgId == getUserOrgId()))`
    - Update: `isAuthenticated() && (request.auth.uid == userId || isPlatformOwner() || (isCenterAdmin() && resource.data.orgId == getUserOrgId()))`
    - Delete: `isAuthenticated() && isPlatformOwner()`
  - **Tenant Collections (`students`, `batches`, `teachers`, `invoices`, `attendance`, `exams`, `announcements`, `assignments`, `studyMaterials`)**:
    - Read: `isAuthenticated() && isTenantMember(resource.data.orgId)`
    - Write: `isAuthenticated() && isTenantMember(request.resource.data.orgId)` with specific role guards (e.g., student/parent cannot create/modify invoices or attendance).
  - **`examResults/{resultId}`**:
    - Read: `isAuthenticated() && (isTenantMember(resource.data.orgId) || request.auth.uid == resource.data.studentId)`
    - Write: `isAuthenticated() && isTenantMember(request.resource.data.orgId) && (isCenterAdmin() || isTeacher() || isPlatformOwner())`
  - **`credentials/{phone}`**:
    - `allow read, write: if false;` (Completely locked down and deprecated).

### C. Firebase Cloud Storage Security Rules:
- **Paths Structure:** `/{orgId}/{category}/{fileName}`
- **Storage Rules:**
  - Require `request.auth != null`.
  - Validate file size `< 10 * 1024 * 1024` (10MB maximum).
  - Validate MIME types (PDFs, Images, Docs).
  - Receipts readable only by center admin/staff/owner or linked parent.
  - Prevent cross-tenant file overwrites.

### D. Data Consistency & Atomic Mutations:
- Multi-document operations will utilize `writeBatch(db)`:
  - `addStudent`: Simultaneously creates `/students/{studentId}` and adds student ID to `/batches/{batchId}.studentIds`.
  - `deleteStudent`: Removes student document and removes student ID from all enrolled `/batches`.
  - `recordPayment`: Atomically appends payment to `/invoices/{invoiceId}.payments`, recalculates `paidAmount`, and updates invoice `status`.

### E. Firestore Performance & Real-Time Query Scoping:
- Replace unbounded `collection(db, '...')` listeners with scoped `query(collection(db, '...'), where('orgId', '==', orgId), limit(150))`.
- Move date/branch filtering into Firestore query constraints where indexed.
- Guard `seedInitialFirestoreDataIfEmpty()` behind a dev-only flag or once-per-session guard so production page loads do not execute database-wide scans.

---

## 3. Step-by-Step Implementation Roadmap

| Stage | Domain | Files Affected | Primary Objective |
| :--- | :--- | :--- | :--- |
| **Stage 1** | Security Rules & Tenant Isolation | `firestore.rules`, `storage.rules`, `firestore.indexes.json` | Close public read/write; enforce tenant isolation, role checks, and storage constraints. |
| **Stage 2** | Authentication & Credential Security | `src/context/AuthContext.tsx`, `src/lib/firebase.ts`, `src/components/auth/AuthCard.tsx` | Eliminate cleartext password storage; route phone auth through Firebase Auth; remove backdoors; anchor session in `onAuthStateChanged`. |
| **Stage 3** | Data Consistency & Transactions | `src/lib/firestoreService.ts`, `src/context/slices/StudentContext.tsx`, `src/context/slices/FeeContext.tsx`, `src/context/slices/AttendanceContext.tsx` | Implement atomic `writeBatch` for student batch enrollment, student deletion, and invoice payments. |
| **Stage 4** | Performance, Query Limits & Pagination | `src/lib/firestoreService.ts`, `src/context/slices/*.tsx` | Add `limit()`, `orderBy()`, and query-level scoping; remove redundant seeding queries from production boot. |
| **Stage 5** | Verification & Validation | Automated test script, `tsc --noEmit`, `npm run build`, `graphify update` | Execute multi-tenant permission tests, verify build artifacts, and update architectural graph. |

---

## 4. Verification & Testing Strategy
- **Authentication:** Verify Google login, email login, and phone login without credentials collection dependency.
- **Tenant Isolation:** Simulate Org A user attempting access to Org B documents -> verify rejection by rules.
- **Role Permissions:** Test student attempting to update an invoice -> verify rejection.
- **Storage:** Verify upload constraints and cross-tenant isolation.
- **Build & Quality:** Zero TypeScript compilation errors (`tsc --noEmit`), clean bundle compilation (`vite build`), and updated Graphify documentation.
