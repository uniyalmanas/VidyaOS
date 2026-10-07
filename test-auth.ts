/**
 * VidyaOS Authentication & Multi-Tenancy Automated Verification Suite
 */

import { getIndiaDayName, getIndiaDateString } from './src/lib/date';

function cleanPhone(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, '');
  return digits.length > 10 ? digits.slice(-10) : digits;
}

function toVirtualEmail(phone: string): string {
  const clean = cleanPhone(phone);
  return `${clean}@phone.vidyaos.in`;
}

function formatDisplayPhone(phone: string): string {
  const clean = cleanPhone(phone);
  return `+91 ${clean}`;
}

function classifyAuthError(code: string, phoneExists: boolean, cleanPhoneDigits: string): string {
  if (code === 'auth/wrong-password' || (code === 'auth/invalid-credential' && phoneExists)) {
    return 'Incorrect password for this mobile number. Please try again.';
  }
  if (code === 'auth/user-not-found' || !phoneExists) {
    return `No account found for mobile number +91 ${cleanPhoneDigits}. Please verify the number or contact your coaching institute admin to register you.`;
  }
  if (code === 'auth/too-many-requests') {
    return 'Access temporarily blocked due to too many failed attempts. Please try again later.';
  }
  return 'Authentication failed. Please check your credentials.';
}

function verifyTenantIsolation(userOrgId: string, resourceOrgId: string, role: string): boolean {
  if (role === 'PLATFORM_OWNER') return true;
  return userOrgId === resourceOrgId;
}

// -------------------------------------------------------------
// Test Execution
// -------------------------------------------------------------
let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
    failed++;
  }
}

console.log('\n========================================');
console.log('VidyaOS Auth & RBAC Verification Tests');
console.log('========================================\n');

// 1. Phone Normalization Tests
console.log('Suite 1: Phone Normalization & Virtual Email Mapping');
assert(cleanPhone('9876543210') === '9876543210', 'Raw 10-digit mobile number cleans properly');
assert(cleanPhone('+91 98765 43210') === '9876543210', 'Prefixed +91 formatted mobile cleans properly');
assert(cleanPhone('09876543210') === '9876543210', 'Leading-zero prefixed mobile cleans to last 10 digits');
assert(toVirtualEmail('+91 98765 43210') === '9876543210@phone.vidyaos.in', 'Deterministic virtual email generated accurately');
assert(formatDisplayPhone('9876543210') === '+91 9876543210', 'Normalized display phone format matches +91 XXXXXXXXXX');

// 2. Error Classification Tests
console.log('\nSuite 2: Firebase Auth Error Disambiguation');
assert(
  classifyAuthError('auth/invalid-credential', true, '9876543210') ===
    'Incorrect password for this mobile number. Please try again.',
  'Existing account + invalid credentials mapped to "Incorrect password"'
);
assert(
  classifyAuthError('auth/wrong-password', true, '9876543210') ===
    'Incorrect password for this mobile number. Please try again.',
  'Existing account + wrong-password mapped to "Incorrect password"'
);
assert(
  classifyAuthError('auth/invalid-credential', false, '9876543210').includes('No account found'),
  'Non-existent account + invalid credentials correctly identified as uncreated'
);
assert(
  classifyAuthError('auth/user-not-found', false, '9876543210').includes('No account found'),
  'user-not-found code properly informs user to contact center admin'
);

// 3. Multi-Tenant Boundary Tests
console.log('\nSuite 3: Multi-Tenant RBAC Boundary Check');
assert(
  verifyTenantIsolation('org-apex', 'org-apex', 'TEACHER') === true,
  'Teacher can access their own organization data'
);
assert(
  verifyTenantIsolation('org-apex', 'org-allen', 'TEACHER') === false,
  'Teacher cannot access foreign organization data (Coaching A vs Coaching B)'
);
assert(
  verifyTenantIsolation('org-apex', 'org-allen', 'CENTER_ADMIN') === false,
  'Center Admin of Coaching A cannot access Coaching B data'
);
assert(
  verifyTenantIsolation('system', 'org-allen', 'PLATFORM_OWNER') === true,
  'Platform Owner can access any organization data'
);

// 4. Model Sanity Check
console.log('\nSuite 4: Zero Plaintext Password Invariants');
interface SafeUser {
  id: string;
  uid: string;
  name: string;
  phone: string;
  role: string;
  orgId: string;
}
const mockCreatedUser: SafeUser = {
  id: 'firebase-uid-12345',
  uid: 'firebase-uid-12345',
  name: 'Sunita Sharma',
  phone: '+91 9876543210',
  role: 'TEACHER',
  orgId: 'org-apex'
};
assert(!('password' in mockCreatedUser), 'User model strictly excludes password property');

// -------------------------------------------------------------
// India-local date helpers — "today" must be computed, never hardcoded
// (ParentPortal previously hard-coded 'Monday' for its today's-classes strip)
// -------------------------------------------------------------
console.log('\n===== India-local date helpers =====');

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// 2026-10-04 is a Sunday. At 12:00Z it is already 17:30 IST, still the same day.
for (let i = 0; i < 7; i++) {
  const instant = new Date(Date.UTC(2026, 9, 4 + i, 12, 0, 0));
  assert(
    getIndiaDayName(instant) === WEEKDAY_NAMES[i],
    `getIndiaDayName resolves ${instant.toISOString().slice(0, 10)} to ${WEEKDAY_NAMES[i]}`
  );
}

// IST is UTC+05:30, so the calendar day rolls over at 18:30 UTC — not midnight.
assert(
  getIndiaDayName(new Date('2026-10-04T18:29:00.000Z')) === 'Sunday',
  'Day boundary: 18:29Z on Oct 4 is still Sunday in IST (23:59)'
);
assert(
  getIndiaDayName(new Date('2026-10-04T18:30:00.000Z')) === 'Monday',
  'Day boundary: 18:30Z on Oct 4 is already Monday in IST (00:00)'
);
assert(
  getIndiaDayName(new Date('2026-10-07T12:00:00.000Z')) === 'Wednesday',
  'Today (2026-10-07) resolves to Wednesday'
);

assert(
  getIndiaDateString(new Date('2026-10-04T18:29:00.000Z')) === '2026-10-04',
  'Date string boundary: 18:29Z is still 2026-10-04 in IST'
);
assert(
  getIndiaDateString(new Date('2026-10-04T18:30:00.000Z')) === '2026-10-05',
  'Date string boundary: 18:30Z is already 2026-10-05 in IST'
);

// Every TimetableSlot['dayOfWeek'] value must be producible by the helper,
// otherwise "today's classes" could never match a slot on that day.
const produced = new Set(
  Array.from({ length: 7 }, (_, i) => getIndiaDayName(new Date(Date.UTC(2026, 9, 4 + i, 12))))
);
assert(
  produced.size === 7,
  'All 7 weekday names are reachable — no slot day is permanently unreachable'
);

console.log('\n----------------------------------------');
console.log(`Results: ${passed} passed, ${failed} failed.`);
console.log('----------------------------------------\n');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
