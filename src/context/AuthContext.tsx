import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import { User, UserRole, AuthSession, Organization } from '../types';
import { MOCK_USERS, MOCK_ORGANIZATIONS } from '../data/mockData';
import {
  auth,
  db,
  googleProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  updatePassword,
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  query,
  where,
  limit,
  createSecondaryUser,
  testFirestoreConnection,
  handleFirestoreError,
  OperationType,
  FirebaseUser,
  cleanFirestoreData
} from '../lib/firebase';

interface AuthContextType {
  currentUser: User | null;
  firebaseUser: FirebaseUser | null;
  session: AuthSession | null;
  isAuthenticated: boolean;
  loginWithGoogle: (requestedRole?: UserRole, registrationMode?: boolean) => Promise<{ success: boolean; error?: string; user?: User }>;
  loginWithPhonePassword: (phone: string, password: string, requestedRole?: UserRole) => Promise<{ success: boolean; error?: string; user?: User }>;
  signupWithPhonePassword: (name: string, phone: string, password: string, role: UserRole, orgId?: string) => Promise<{ success: boolean; error?: string; user?: User }>;
  /**
   * Changes the password of the **currently signed-in** account only.
   * Firebase Auth exposes no client-side API for setting another account's
   * password — that requires the Admin SDK on a trusted server — so this
   * deliberately takes no target identifier. The previous `phone` parameter was
   * accepted and then ignored, which meant editing somebody else's profile
   * silently overwrote the signed-in admin's own password.
   */
  updateOwnPassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
  registerUserCredentials: (phone: string, password: string, role: UserRole, name: string, email: string, orgId: string) => Promise<string>;
  linkStudentToParent: (parentUid: string, studentId: string) => Promise<void>;
  loginWithPhoneOtp: (phone: string, otp: string, orgId?: string) => Promise<{ success: boolean; error?: string; user?: User }>;
  sendPhoneOtp: (phone: string) => Promise<{ success: boolean; otp?: string; message?: string }>;
  loginWithEmail: (email: string, password: string) => Promise<{ success: boolean; error?: string; user?: User }>;
  signupWithEmail: (email: string, password: string, displayName: string, role?: UserRole, orgId?: string) => Promise<{ success: boolean; error?: string; user?: User }>;
  resetPassword: (email: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  loginAsDemoUser: (userId: string) => void;
  logout: () => void;
  updateUserProfile: (updates: Partial<User>) => Promise<{ success: boolean; error?: string }>;
  pendingOtpPhone: string | null;
  setPendingOtpPhone: (phone: string | null) => void;
  activeOtpDemoCode: string | null;
  showLoginModal: boolean;
  setShowLoginModal: (show: boolean) => void;
  hasRole: (...roles: UserRole[]) => boolean;
  authorizedStudentIds: string[];
  userStorage: {
    get: <T>(key: string, defaultValue: T) => T;
    set: <T>(key: string, value: T) => void;
    remove: (key: string) => void;
  };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_STORAGE_KEY = 'vidyaos_auth_session';
const SESSION_DURATION_HOURS = 24 * 7; // 7 days session

// Login methods that sit on top of a real Firebase Auth user. The remaining
// methods (demo personas, DEV-only OTP) have no Firebase Auth record behind them,
// so `onAuthStateChanged` reporting null says nothing about whether they are valid.
const FIREBASE_BACKED_LOGIN_METHODS: AuthSession['loginMethod'][] = [
  'phone_password',
  'email_password',
  'google_oauth'
];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load session from storage
  const [session, setSession] = useState<AuthSession | null>(() => {
    try {
      const stored = localStorage.getItem(SESSION_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as AuthSession & { token?: string };
        // Fail closed on anything structurally incomplete rather than restoring a
        // session we cannot reason about.
        if (!parsed?.user || !parsed.loginMethod || typeof parsed.expiresAt !== 'number') {
          return null;
        }
        // Demo sessions (demo_preset) are dev-only; all others persist across reloads.
        if (!import.meta.env.DEV && parsed.loginMethod === 'demo_preset') {
          return null;
        }
        // Rebuilt field-by-field so an ID token written by an older build is
        // dropped here instead of being carried forward by the sync effect below.
        //
        // An expired session is deliberately still returned. Discarding it would
        // let the auth listener below re-issue a completely fresh 7-day window on
        // the next reload, so the deadline would never actually be reached.
        // `currentUser` stays null while expired and the timer effect underneath
        // signs the user out of both the app and Firebase Auth.
        return {
          user: parsed.user,
          orgId: parsed.orgId,
          createdAt: parsed.createdAt,
          expiresAt: parsed.expiresAt,
          loginMethod: parsed.loginMethod
        };
      }
    } catch (e) {
      console.warn('Failed to parse auth session from localStorage', e);
    }
    return null;
  });

  // Stays null once the session is past `expiresAt`, even though the expired
  // session object itself is kept so the timer effect below can dispose of it.
  const currentUser = useMemo(
    () => (session && session.expiresAt > Date.now() ? session.user : null),
    [session]
  );

  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [pendingOtpPhone, setPendingOtpPhone] = useState<string | null>(null);
  const [activeOtpDemoCode, setActiveOtpDemoCode] = useState<string | null>(null);
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);

  // Re-derived whenever Firebase Auth resolves or revokes its user, so the flag
  // tracks live auth state instead of the value frozen when the session was set.
  const isAuthenticated = useMemo(
    () => !!currentUser && !!session && session.expiresAt > Date.now(),
    [currentUser, session, firebaseUser]
  );

  // Latest session for the long-lived auth listener below. The listener must not
  // depend on `session` directly — that would resubscribe (and refire) on every
  // session change.
  const sessionRef = useRef<AuthSession | null>(session);
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  // Enforce the declared session lifetime. `expiresAt` used to be written on every
  // login but only ever read at mount, so a tab left open past its expiry stayed
  // signed in indefinitely.
  useEffect(() => {
    if (!session) return;
    const remaining = session.expiresAt - Date.now();
    if (remaining <= 0) {
      setSession(null);
      setFirebaseUser(null);
      setShowLoginModal(true);
      signOut(auth).catch(() => undefined);
      return;
    }
    const timer = window.setTimeout(() => {
      setSession(null);
      setFirebaseUser(null);
      setShowLoginModal(true);
      signOut(auth).catch(() => undefined);
    }, remaining);
    return () => window.clearTimeout(timer);
  }, [session]);

  // Helper to extract clean 10-digit phone
  const cleanPhone = (phone: string): string => {
    const digits = phone.replace(/[^0-9]/g, '');
    return digits.length > 10 ? digits.slice(-10) : digits;
  };

  const DEMO_USER_CREDENTIALS: Record<string, string> = {
    'user-apex-admin': 'admin123',
    'user-apex-staff': 'staff123',
    'user-teacher-sharma': 'teacher123',
    'user-parent-rajesh': 'parent123',
    'user-stud-rahul': 'student123',
    'user-platform-owner': 'owner123'
  };

  const findDemoUserForPhone = (phone: string, password: string, requestedRole?: UserRole): User | null => {
    if (!import.meta.env.DEV) return null;

    const digits = cleanPhone(phone);
    if (!digits) return null;

    const candidates = MOCK_USERS.filter(user => {
      const userDigits = cleanPhone(user.phone || '');
      return userDigits === digits || userDigits.endsWith(digits) || digits.endsWith(userDigits);
    });

    const match = candidates.find(user => {
      const requiredPassword = DEMO_USER_CREDENTIALS[user.id];
      if (!requiredPassword) return false;
      if (requiredPassword !== password.trim()) return false;
      if (requestedRole && user.role !== requestedRole) return false;
      return true;
    }) || candidates.find(user => {
      const requiredPassword = DEMO_USER_CREDENTIALS[user.id];
      return !!requiredPassword && requiredPassword === password.trim();
    });

    return match || null;
  };

  // Helper to dynamically find a user's registered organization by email or phone
  const findOrganizationForUser = async (
    email?: string | null,
    phone?: string | null,
    uid?: string
  ): Promise<Organization | null> => {
    const cleanEmail = email?.toLowerCase().trim();
    const cleanPhoneDigits = phone ? phone.replace(/[^0-9]/g, '').slice(-10) : null;

    // 1. Check in localStorage organizations first (fastest)
    try {
      const storedOrgs = localStorage.getItem('vidyaos_orgs');
      if (storedOrgs) {
        const orgs: Organization[] = JSON.parse(storedOrgs);
        const match = orgs.find(o => {
          if (o.id === 'org-apex') return false; // Never auto-match custom user to demo Apex
          if (!import.meta.env.DEV && (!uid || o.ownerUid !== uid)) return false;
          if (cleanEmail && o.email?.toLowerCase().trim() === cleanEmail) return true;
          if (cleanPhoneDigits && o.phone?.replace(/[^0-9]/g, '').slice(-10) === cleanPhoneDigits) return true;
          return false;
        });
        if (match) return match;
      }
    } catch (_) {}

    // 2. Query only organizations matching the authenticated account's contact details.
    try {
      if (cleanEmail) {
        const emailSnapshot = await getDocs(query(
          collection(db, 'organizations'),
          where('email', '==', cleanEmail),
          limit(1)
        ));
        const match = emailSnapshot.docs
          .map(document => document.data() as Organization)
          .find(org => org.id !== 'org-apex' && (import.meta.env.DEV || (!!uid && org.ownerUid === uid)));
        if (match) return match;
      }
      if (cleanPhoneDigits) {
        const phoneSnapshot = await getDocs(query(
          collection(db, 'organizations'),
          where('phone', 'in', [`+91 ${cleanPhoneDigits}`, cleanPhoneDigits]),
          limit(10)
        ));
        const match = phoneSnapshot.docs
          .map(document => document.data() as Organization)
          .find(org => org.id !== 'org-apex' && (import.meta.env.DEV || (!!uid && org.ownerUid === uid)));
        if (match) return match;
      }
    } catch (err) {
      console.warn('Firestore orgs lookup warning:', err);
    }

    return null;
  };

  // Test Firestore connection on boot
  useEffect(() => {
    testFirestoreConnection();
  }, []);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        // Sync user with Firestore
        try {
          const userDocRef = doc(db, 'users', fbUser.uid);
          const snap = await getDoc(userDocRef);
          if (snap.exists()) {
            const data = snap.data();
            const validRoles: UserRole[] = ['PLATFORM_OWNER', 'CENTER_ADMIN', 'STAFF', 'TEACHER', 'PARENT', 'STUDENT'];
            if (!validRoles.includes(data.role) || typeof data.orgId !== 'string' || !data.orgId) {
              setSession(null);
              return;
            }
            const role = (data.role as UserRole) || 'TEACHER';
            const orgId = data.orgId;
            const displayName = data.name || data.displayName || fbUser.displayName || (role === 'TEACHER' ? 'Faculty Member' : 'VidyaOS User');

            const cachedAvatar = localStorage.getItem(`vidyaos_avatar_${fbUser.uid}`);
            const resolvedUser: User = {
              id: fbUser.uid,
              name: displayName,
              email: data.email || fbUser.email || '',
              phone: data.phone || fbUser.phoneNumber || '',
              avatar: data.avatar || cachedAvatar || fbUser.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(displayName)}`,
              role,
              orgId,
              branchId: data.branchId,
              linkedStudentIds: data.linkedStudentIds,
              subjects: data.subjects
            };

            // Re-deriving a session for the account we are already signed in as
            // must not restart the clock — otherwise every page load would hand
            // out a brand new 7-day window and the lifetime would never run out.
            const previous = sessionRef.current;
            const continuing = previous && previous.user.id === fbUser.uid ? previous : null;
            const issuedAt = continuing ? continuing.createdAt : Date.now();

            const newSession: AuthSession = {
              user: resolvedUser,
              orgId,
              createdAt: issuedAt,
              expiresAt: continuing
                ? continuing.expiresAt
                : issuedAt + SESSION_DURATION_HOURS * 60 * 60 * 1000,
              loginMethod: fbUser.email?.endsWith('@phone.vidyaos.in') ? 'phone_password' : 'google_oauth'
            };
            setSession(newSession);
            localStorage.setItem('vidyaos_current_org_id', orgId);
            return;
          }

          if (!import.meta.env.DEV) {
            setSession(null);
            return;
          }

          let role: UserRole = 'CENTER_ADMIN';
          let orgId = '';
          let displayName = fbUser.displayName || 'Google User';

          // Check if this Google account owns a registered organization
          const userOrg = await findOrganizationForUser(fbUser.email, fbUser.phoneNumber, fbUser.uid);
          if (userOrg) {
            orgId = userOrg.id;
            role = 'CENTER_ADMIN';
          } else if (!orgId || (orgId === 'org-apex' && fbUser.email?.toLowerCase() !== 'admin@apexacademy.in')) {
            {
              const activeStoredOrgId = import.meta.env.DEV ? localStorage.getItem('vidyaos_current_org_id') : null;
              if (activeStoredOrgId && activeStoredOrgId !== 'org-apex') {
                orgId = activeStoredOrgId;
              } else {
                // Auto-provision a clean, isolated coaching center for this Gmail user
                const autoOrgId = `org-${Date.now()}`;
                const autoName = fbUser.displayName ? `${fbUser.displayName}'s Academy` : 'My Coaching Institute';
                const autoOrg: Organization = {
                  id: autoOrgId,
                  ownerUid: fbUser.uid,
                  name: autoName,
                  slug: autoName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
                  tagline: 'Premier Coaching & Tuition Center',
                  logoText: (fbUser.displayName || 'ACAD').slice(0, 4).toUpperCase(),
                  ownerName: fbUser.displayName || 'Center Director',
                  phone: fbUser.phoneNumber || '+91 99999 00000',
                  email: fbUser.email || '',
                  address: 'Main Campus',
                  city: 'Delhi',
                  state: 'Delhi NCR',
                  upiId: `${(fbUser.email || 'center').split('@')[0].replace(/[^a-z0-9]/g, '')}@okaxis`,
                  upiMerchantName: autoName.toUpperCase(),
                  planId: 'growth',
                  subscriptionStatus: 'active',
                  trialEndsAt: '',
                  currentCycleEnd: new Date().toISOString().split('T')[0],
                  createdAt: new Date().toISOString().split('T')[0],
                  maxStudents: 300,
                  maxBranches: 1,
                  branches: [
                    {
                      id: `branch-${Date.now()}`,
                      orgId: autoOrgId,
                      name: 'Main Campus',
                      city: 'Delhi',
                      address: 'Main Campus',
                      phone: fbUser.phoneNumber || '+91 99999 00000',
                      isMain: true
                    }
                  ]
                };

                try {
                  await setDoc(doc(db, 'organizations', autoOrgId), autoOrg);
                } catch (orgErr) {
                  console.warn('Could not sync auto-org to Firestore (offline/adblocked):', orgErr);
                }
                try {
                  const stored = localStorage.getItem('vidyaos_orgs');
                  const currentList = stored ? JSON.parse(stored) : [];
                  localStorage.setItem('vidyaos_orgs', JSON.stringify([...currentList.filter((o: any) => o.id !== autoOrgId), autoOrg]));
                } catch (_) {}

                orgId = autoOrgId;
                role = 'CENTER_ADMIN';
              }
            }
          }

          try {
            await setDoc(userDocRef, {
              uid: fbUser.uid,
              email: fbUser.email,
              displayName,
              role,
              orgId,
              updatedAt: new Date().toISOString()
            }, { merge: true });
          } catch (writeErr) {
            console.warn('Could not sync user profile to Firestore (offline/restricted):', writeErr);
          }

          const resolvedUser: User = {
            id: fbUser.uid,
            name: displayName,
            email: fbUser.email || '',
            phone: fbUser.phoneNumber || '+91 98765 43210',
            avatar: fbUser.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(displayName)}`,
            role,
            orgId
          };

          const newSession: AuthSession = {
            user: resolvedUser,
            orgId,
            createdAt: Date.now(),
            expiresAt: Date.now() + SESSION_DURATION_HOURS * 60 * 60 * 1000,
            loginMethod: 'google_oauth' as any
          };
          setSession(newSession);
          localStorage.setItem('vidyaos_current_org_id', orgId);
        } catch (err: any) {
          console.warn('Firestore user profile sync unavailable or offline; operating in offline-first mode:', err?.message || err);
          if (!import.meta.env.DEV) {
            setSession(null);
            return;
          }
          const savedOrgId = localStorage.getItem('vidyaos_current_org_id') || 'org-apex';
          const fallbackName = fbUser.displayName || 'VidyaOS User';
          const fallbackUser: User = {
            id: fbUser.uid,
            name: fallbackName,
            email: fbUser.email || '',
            phone: fbUser.phoneNumber || '+91 98765 43210',
            avatar: fbUser.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(fallbackName)}`,
            role: 'CENTER_ADMIN',
            orgId: savedOrgId
          };
          const fallbackSession: AuthSession = {
            user: fallbackUser,
            orgId: savedOrgId,
            createdAt: Date.now(),
            expiresAt: Date.now() + SESSION_DURATION_HOURS * 60 * 60 * 1000,
            loginMethod: 'google_oauth' as any
          };
          setSession(fallbackSession);
        }
      } else {
        // Firebase Auth is the source of truth for real logins. When it reports no
        // user (token revoked, signed out in another tab, account deleted) any
        // session it created is stale and must be torn down — previously the
        // session was left behind and the app stayed signed in to a dead account.
        const stale = sessionRef.current;
        if (stale && FIREBASE_BACKED_LOGIN_METHODS.includes(stale.loginMethod)) {
          setSession(null);
          setShowLoginModal(true);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Firebase Google Sign-In
  const loginWithGoogle = async (requestedRole?: UserRole, registrationMode = false): Promise<{ success: boolean; error?: string; user?: User }> => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const fbUser = result.user;
      setFirebaseUser(fbUser);

      const baseUser: User = {
        id: fbUser.uid,
        name: fbUser.displayName || 'VidyaOS User',
        email: fbUser.email || '',
        phone: fbUser.phoneNumber || '',
        avatar: fbUser.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(fbUser.displayName || 'User')}`,
        role: requestedRole || 'CENTER_ADMIN',
        orgId: localStorage.getItem('vidyaos_current_org_id') || 'org-apex'
      };

      const immediateSession: AuthSession = {
        user: baseUser,
        orgId: baseUser.orgId,
        createdAt: Date.now(),
        expiresAt: Date.now() + SESSION_DURATION_HOURS * 60 * 60 * 1000,
        loginMethod: 'google_oauth'
      };
      setSession(immediateSession);
      localStorage.setItem('vidyaos_current_org_id', baseUser.orgId);
      setShowLoginModal(false);

      // Run the heavier organization/profile lookups in the background so the user does
      // not sit on a spinner while Firestore sync/network checks finish.
      void (async () => {
        try {
          const userOrg = await findOrganizationForUser(fbUser.email, fbUser.phoneNumber);
          const userDocRef = doc(db, 'users', fbUser.uid);
          const snap = await getDoc(userDocRef);

          if (!import.meta.env.DEV) {
            const validRoles: UserRole[] = ['PLATFORM_OWNER', 'CENTER_ADMIN', 'STAFF', 'TEACHER', 'PARENT', 'STUDENT'];
            if (snap.exists()) {
              const data = snap.data();
              if (registrationMode) {
                setSession(null);
                return;
              }
              if (!validRoles.includes(data.role) || typeof data.orgId !== 'string' || !data.orgId) {
                await signOut(auth);
                setFirebaseUser(null);
                setSession(null);
                return;
              }
              const resolvedUser: User = {
                id: fbUser.uid,
                name: data.name || data.displayName || fbUser.displayName || 'VidyaOS User',
                email: fbUser.email || '',
                phone: data.phone || fbUser.phoneNumber || '',
                avatar: data.avatar || fbUser.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(data.name || fbUser.displayName || 'User')}`,
                role: data.role,
                orgId: data.orgId,
                branchId: data.branchId,
                linkedStudentIds: data.linkedStudentIds,
                subjects: data.subjects
              };
              const nextSession: AuthSession = {
                user: resolvedUser,
                orgId: resolvedUser.orgId,
                createdAt: Date.now(),
                expiresAt: Date.now() + SESSION_DURATION_HOURS * 60 * 60 * 1000,
                loginMethod: 'google_oauth'
              };
              setSession(nextSession);
              localStorage.setItem('vidyaos_current_org_id', resolvedUser.orgId);
              return;
            }

            if (!registrationMode) {
              await signOut(auth);
              setFirebaseUser(null);
              setSession(null);
              return;
            }
          }

          let role: UserRole = requestedRole || 'CENTER_ADMIN';
          let orgId: string = '';
          let displayName = fbUser.displayName || 'Google User';

          if (snap.exists()) {
            const data = snap.data();
            if (requestedRole) role = requestedRole;
            else if (data.role) role = data.role as UserRole;
            if (data.displayName) displayName = data.displayName;
            orgId = data.orgId;
          }

          if (userOrg) {
            orgId = userOrg.id;
            role = 'CENTER_ADMIN';
          } else if (!orgId || (orgId === 'org-apex' && fbUser.email?.toLowerCase() !== 'admin@apexacademy.in')) {
            if (fbUser.email?.toLowerCase() === 'kunal@vidyaos.in' || requestedRole === 'PLATFORM_OWNER') {
              orgId = 'system';
              role = 'PLATFORM_OWNER';
            } else {
              const autoOrgId = `org-${Date.now()}`;
              const autoName = fbUser.displayName ? `${fbUser.displayName}'s Academy` : 'My Coaching Institute';
              const newOrg: Organization = {
                id: autoOrgId,
                ownerUid: fbUser.uid,
                name: autoName,
                slug: autoName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
                tagline: 'Premier Coaching & Tuition Center',
                logoText: (fbUser.displayName || 'ACAD').slice(0, 4).toUpperCase(),
                ownerName: fbUser.displayName || 'Center Director',
                phone: fbUser.phoneNumber || '+91 99999 00000',
                email: fbUser.email || '',
                address: 'Main Campus',
                city: 'Delhi',
                state: 'Delhi NCR',
                upiId: `${(fbUser.email || 'center').split('@')[0].replace(/[^a-z0-9]/g, '')}@okaxis`,
                upiMerchantName: autoName.toUpperCase(),
                planId: 'growth',
                subscriptionStatus: 'active',
                trialEndsAt: '',
                currentCycleEnd: new Date().toISOString().split('T')[0],
                createdAt: new Date().toISOString().split('T')[0],
                maxStudents: 300,
                maxBranches: 1,
                branches: [{
                  id: `branch-${Date.now()}`,
                  orgId: autoOrgId,
                  name: 'Main Campus',
                  city: 'Delhi',
                  address: 'Main Campus',
                  phone: fbUser.phoneNumber || '+91 99999 00000',
                  isMain: true
                }]
              };

              try {
                await setDoc(doc(db, 'organizations', autoOrgId), newOrg);
              } catch (orgErr) {
                console.warn('Could not sync auto-org to Firestore (offline/adblocked):', orgErr);
              }

              try {
                const stored = localStorage.getItem('vidyaos_orgs');
                const currentList = stored ? JSON.parse(stored) : [];
                localStorage.setItem('vidyaos_orgs', JSON.stringify([...currentList.filter((o: any) => o.id !== autoOrgId), newOrg]));
              } catch (_) {}

              orgId = autoOrgId;
              role = 'CENTER_ADMIN';
            }
          }

          try {
            await setDoc(userDocRef, {
              uid: fbUser.uid,
              email: fbUser.email,
              displayName,
              name: displayName,
              role,
              orgId,
              updatedAt: new Date().toISOString()
            }, { merge: true });
          } catch (writeErr) {
            console.warn('Could not sync user profile to Firestore (offline/restricted):', writeErr);
          }

          const resolvedUser: User = {
            id: fbUser.uid,
            name: displayName,
            email: fbUser.email || '',
            phone: fbUser.phoneNumber || '+91 98765 43210',
            avatar: fbUser.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(displayName)}`,
            role,
            orgId
          };

          const nextSession: AuthSession = {
            user: resolvedUser,
            orgId,
            createdAt: Date.now(),
            expiresAt: Date.now() + SESSION_DURATION_HOURS * 60 * 60 * 1000,
            loginMethod: 'google_oauth'
          };

          setSession(nextSession);
          localStorage.setItem('vidyaos_current_org_id', orgId);
        } catch (err) {
          console.warn('Google auth background sync failed, keeping the user signed in locally:', err);
        }
      })();

      return { success: true, user: baseUser };
    } catch (err: any) {
      console.warn('Google sign-in failed:', err?.message || err);
      return {
        success: false,
        error: err?.message || 'Google sign-in failed. Please try again.'
      };
    }
  };

  // Sync session to secure storage
  useEffect(() => {
    if (session) {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    }
  }, [session]);

  // 1. Phone + Password Authentication (Backed by Firebase Authentication)
  const loginWithPhonePassword = async (
    phone: string,
    password: string,
    requestedRole?: UserRole
  ): Promise<{ success: boolean; error?: string; user?: User }> => {
    const clean = cleanPhone(phone);
    if (!clean || clean.length < 10) {
      return { success: false, error: 'Please enter a valid 10-digit mobile number.' };
    }
    if (!password) {
      return { success: false, error: 'Please enter your password.' };
    }

    const cleanPass = password.trim();
    const virtualEmail = `${clean}@phone.vidyaos.in`;

    // Attempt Firebase Authentication first
    try {
      const userCredential = await signInWithEmailAndPassword(auth, virtualEmail, cleanPass);
      const fbUser = userCredential.user;
      setFirebaseUser(fbUser);

      // Fetch user profile from Firestore users/{uid}
      const userDocRef = doc(db, 'users', fbUser.uid);
      const snap = await getDoc(userDocRef);

      if (!import.meta.env.DEV) {
        const data = snap.exists() ? snap.data() : null;
        const validRoles: UserRole[] = ['PLATFORM_OWNER', 'CENTER_ADMIN', 'STAFF', 'TEACHER', 'PARENT', 'STUDENT'];
        if (!data || !validRoles.includes(data.role) || typeof data.orgId !== 'string' || !data.orgId || typeof data.name !== 'string' || !data.name) {
          await signOut(auth);
          setFirebaseUser(null);
          return { success: false, error: 'Your account profile is not provisioned correctly. Please contact your coaching center administrator.' };
        }
      }

      let role: UserRole = requestedRole || 'TEACHER';
      let orgId: string = '';
      let name: string = fbUser.displayName || '';
      let avatar: string | undefined = undefined;

      if (snap.exists()) {
        const data = snap.data();
        if (data.role) role = data.role as UserRole;
        if (data.orgId) orgId = data.orgId;
        if (data.name) name = data.name;
        if (data.avatar) avatar = data.avatar;
      }

      if (!avatar) {
        avatar = localStorage.getItem(`vidyaos_avatar_${fbUser.uid}`) || undefined;
      }

      // Check local teachers storage if role/orgId/name missing
      if (!name || !orgId) {
        try {
          const savedTeachers = JSON.parse(localStorage.getItem('vidyaos_teachers') || '[]');
          const matched = savedTeachers.find((t: any) => cleanPhone(t.phone) === clean);
          if (matched) {
            if (!name) name = matched.name;
            if (!orgId) orgId = matched.orgId;
            role = 'TEACHER';
            if (!avatar) avatar = matched.avatar;
          }
        } catch (_) {}
      }

      // Check Firestore teachers collection if role/orgId/name missing
      if (!name || !orgId) {
        try {
          const tSnap = await getDocs(query(collection(db, 'teachers'), where('phone', 'in', [`+91 ${clean}`, clean])));
          if (!tSnap.empty) {
            const tDoc = tSnap.docs[0].data() as any;
            if (!name) name = tDoc.name;
            if (!orgId) orgId = tDoc.orgId;
            role = 'TEACHER';
            if (!avatar) avatar = tDoc.avatar;
          }
        } catch (_) {}
      }

      // Check local vidyaos_credentials
      if (!name || !orgId) {
        try {
          const localCreds = JSON.parse(localStorage.getItem('vidyaos_credentials') || '{}');
          if (localCreds[clean]) {
            const cData = localCreds[clean];
            if (!name) name = cData.name;
            if (!orgId) orgId = cData.orgId;
            if (cData.role) role = cData.role;
            if (!avatar) avatar = cData.avatar;
          }
        } catch (_) {}
      }

      // Fallback defaults
      if (!orgId) {
        orgId = localStorage.getItem('vidyaos_current_org_id') || 'org-apex';
      }
      if (!name) {
        name = `Faculty (${clean.slice(-4)})`;
      }
      if (!avatar) {
        avatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`;
      }

      const resolvedUser: User = {
        id: fbUser.uid,
        name,
        phone: `+91 ${clean}`,
        email: virtualEmail,
        role,
        orgId,
        avatar
      };

      // Ensure user doc is updated in Firestore for future fast lookups
      try {
        await setDoc(doc(db, 'users', fbUser.uid), {
          id: fbUser.uid,
          name,
          phone: `+91 ${clean}`,
          email: virtualEmail,
          role,
          orgId,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (_) {}

      const newSession: AuthSession = {
        user: resolvedUser,
        orgId,
        createdAt: Date.now(),
        expiresAt: Date.now() + SESSION_DURATION_HOURS * 60 * 60 * 1000,
        loginMethod: 'phone_password'
      };

      setSession(newSession);
      localStorage.setItem('vidyaos_current_org_id', orgId);
      setShowLoginModal(false);
      return { success: true, user: resolvedUser };
    } catch (fbErr: any) {
      console.warn('Firebase signIn notice:', fbErr?.code);

      const errCode = fbErr?.code;

      // In DEV mode, check demo users first (allows testing without Firebase setup)
      if (import.meta.env.DEV) {
        const demoUser = findDemoUserForPhone(clean, cleanPass, requestedRole);
        if (demoUser) {
          const newSession: AuthSession = {
            user: demoUser,
            orgId: demoUser.orgId,
            createdAt: Date.now(),
            expiresAt: Date.now() + SESSION_DURATION_HOURS * 60 * 60 * 1000,
            loginMethod: 'demo_preset'
          };

          setSession(newSession);
          localStorage.setItem('vidyaos_current_org_id', demoUser.orgId);
          setShowLoginModal(false);
          return { success: true, user: demoUser };
        }
      }

      // Firebase v10+ returns 'auth/invalid-credential' for both wrong-password and
      // user-not-found (to prevent user enumeration). We check Firestore to disambiguate,
      // but ONLY if the auth error is ambiguous — not just to generate better messages.
      // NOTE: If this Firestore query fails (RLS/network), we fall through to a generic
      // message rather than falsely claiming "no account found".
      if (errCode === 'auth/wrong-password') {
        return { success: false, error: 'Incorrect password. Please try again or contact your institute admin.' };
      }

      if (errCode === 'auth/user-not-found') {
        return {
          success: false,
          error: `No login account found for +91 ${clean}. Please contact your coaching institute admin to create your account.`
        };
      }

      if (errCode === 'auth/invalid-credential') {
        // Ambiguous error in Firebase v10+ — check Firestore to disambiguate
        let phoneExistsInFirestore = false;
        try {
          const uSnap = await getDocs(query(collection(db, 'users'), where('phone', 'in', [`+91 ${clean}`, clean]), limit(1)));
          if (!uSnap.empty) {
            phoneExistsInFirestore = true;
          } else {
            const tSnap = await getDocs(query(collection(db, 'teachers'), where('phone', 'in', [`+91 ${clean}`, clean]), limit(1)));
            if (!tSnap.empty) phoneExistsInFirestore = true;
          }
        } catch (_) {
          // Firestore lookup failed (network/RLS) — assume profile exists, show password error
          phoneExistsInFirestore = true;
        }

        if (phoneExistsInFirestore) {
          return { success: false, error: 'Incorrect password. Please try again or contact your institute admin.' };
        } else {
          return {
            success: false,
            error: `No login account found for +91 ${clean}. Please contact your coaching institute admin to create your account.`
          };
        }
      }

      if (errCode === 'auth/too-many-requests') {
        return { success: false, error: 'Too many failed attempts. Access is temporarily blocked. Please try again in a few minutes.' };
      }

      return {
        success: false,
        error: fbErr?.message || 'Authentication failed. Please check your credentials.'
      };
    }
  };

  // 2. Signup / Register new person with Phone Number + Password (Powered securely by Firebase Auth)
  const signupWithPhonePassword = async (
    name: string,
    phone: string,
    password: string,
    role: UserRole,
    orgId?: string
  ): Promise<{ success: boolean; error?: string; user?: User }> => {
    const clean = cleanPhone(phone);
    if (role !== 'CENTER_ADMIN') {
      return { success: false, error: 'Student, parent, staff, and teacher accounts must be invited by a center administrator.' };
    }
    if (!orgId) {
      return { success: false, error: 'Register a coaching center before creating its administrator account.' };
    }
    if (!name.trim()) return { success: false, error: 'Full name is required.' };
    if (!clean || clean.length < 10) return { success: false, error: 'Please enter a valid 10-digit mobile number.' };
    if (!password || password.length < 8) return { success: false, error: 'Password must be at least 8 characters long.' };

    const resolvedOrgId = orgId;
    const virtualEmail = `${clean}@phone.vidyaos.in`;

    try {
      // 1. Create real account in Firebase Auth
      let fbUser: FirebaseUser | null = null;
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, virtualEmail, password.trim());
        fbUser = userCredential.user;
        await updateProfile(fbUser, { displayName: name.trim() });
      } catch (authErr: any) {
        if (authErr?.code === 'auth/email-already-in-use') {
          // If already exists, try signing in with the provided password
          const cred = await signInWithEmailAndPassword(auth, virtualEmail, password.trim());
          fbUser = cred.user;
        } else {
          throw authErr;
        }
      }

      if (!fbUser) throw new Error('Firebase authentication did not return a user account.');
      const uid = fbUser.uid;

      const newUser: User = {
        id: uid,
        name: name.trim(),
        phone: `+91 ${clean}`,
        email: virtualEmail,
        role,
        orgId: resolvedOrgId,
        avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name.trim())}`
      };

      // The organization must first be created with this UID as owner. The
      // administrator profile is then safely created by updateUserProfile.
      const newSession: AuthSession = {
        user: newUser,
        orgId: resolvedOrgId,
        createdAt: Date.now(),
        expiresAt: Date.now() + SESSION_DURATION_HOURS * 60 * 60 * 1000,
        loginMethod: 'phone_password'
      };

      setSession(newSession);
      setShowLoginModal(false);
      return { success: true, user: newUser };
    } catch (err: any) {
      console.warn('Firebase signup error:', err);
      let errorMsg = err?.message || 'Failed to create user account.';
      if (err?.code === 'auth/weak-password') {
        errorMsg = 'Password must be at least 6 characters.';
      }
      return { success: false, error: errorMsg };
    }
  };

  // 3. Update password for the currently authenticated user
  // Changes the password of the account that is currently signed in. See the
  // declaration above for why no target account is accepted.
  const updateOwnPassword = async (newPassword: string): Promise<{ success: boolean; error?: string }> => {
    if (!newPassword || newPassword.length < 8) {
      return { success: false, error: 'Password must be at least 8 characters long.' };
    }

    try {
      if (!auth.currentUser) {
        return { success: false, error: 'No active authentication session. Please log in again.' };
      }

      // updatePassword is a static import from firebase/auth
      await updatePassword(auth.currentUser, newPassword);
      return { success: true };
    } catch (err: any) {
      // auth/requires-recent-login means the user needs to re-authenticate first
      if (err?.code === 'auth/requires-recent-login') {
        return {
          success: false,
          error: 'For security, please log out and log in again before changing your password.'
        };
      }
      return { success: false, error: err?.message || 'Failed to update password.' };
    }
  };

  // 4. Register / Provision user credentials (used when admin hires a teacher or registers staff)
  const registerUserCredentials = async (
    phone: string,
    password: string,
    role: UserRole,
    name: string,
    email: string,
    orgId: string
  ): Promise<string> => {
    const clean = cleanPhone(phone);
    if (!clean || clean.length !== 10) throw new Error('A valid 10-digit mobile number is required.');
    const cleanPass = password.trim();
    if (cleanPass.length < 8) throw new Error('Password must be at least 8 characters long.');
    const virtualEmail = `${clean}@phone.vidyaos.in`;
    const roleNoun = role === 'STUDENT' ? 'student' : role === 'PARENT' ? 'parent' : 'faculty';
    const RoleNoun = roleNoun.charAt(0).toUpperCase() + roleNoun.slice(1);

    // Step 1: Create real Firebase Auth account in background using isolated secondary app instance.
    // This does NOT log out the current admin session.
    const fbResult = await createSecondaryUser(virtualEmail, cleanPass, name);
    if (!fbResult.success || !fbResult.uid) {
      // Provide a user-friendly message for the most common case
      const errMsg = fbResult.error || `Could not create the ${roleNoun} authentication account.`;
      if (errMsg.includes('different password')) {
        throw new Error(`An account with mobile number +91 ${clean} already exists with a different password. Ask the ${roleNoun} to reset their password, or use a different mobile number.`);
      }
      throw new Error(errMsg);
    }
    const finalUserId = fbResult.uid;

    // Step 2: Persist user profile to Firestore users collection WITHOUT storing any plaintext password.
    // This MUST succeed for the account holder to be able to log in — throw if it
    // fails so the caller can display a proper error rather than leaving an orphan
    // Auth account.
    try {
      await setDoc(doc(db, 'users', finalUserId), {
        id: finalUserId,
        uid: finalUserId,
        phone: `+91 ${clean}`,
        role,
        name,
        email: email || virtualEmail,
        orgId,
        avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
        createdAt: new Date().toISOString()
      }, { merge: true });
    } catch (firestoreErr: any) {
      // The Firestore write failed. The Firebase Auth account was already created above.
      // Log the issue for debugging; the auth account will be usable once the profile is fixed.
      console.error(`${RoleNoun} profile creation failed for UID ${finalUserId}:`, firestoreErr);
      throw new Error(
        `The authentication account was created but the ${roleNoun} profile could not be saved. ` +
        `Please try again — the system will link to the existing account. ` +
        `(Error: ${firestoreErr?.code || firestoreErr?.message || 'Firestore write failed'})`
      );
    }

    return finalUserId;
  };

  // Attach a student to a parent's profile. The parent portal resolves its children
  // from `users/{uid}.linkedStudentIds`, so without this the parent account exists
  // but opens an empty dashboard.
  const linkStudentToParent = async (parentUid: string, studentId: string): Promise<void> => {
    const parentRef = doc(db, 'users', parentUid);
    const snap = await getDoc(parentRef);
    const data = snap.exists() ? (snap.data() as Record<string, unknown>) : null;
    const existing = Array.isArray(data?.linkedStudentIds) ? (data!.linkedStudentIds as string[]) : [];
    if (existing.includes(studentId)) return;
    await setDoc(parentRef, { linkedStudentIds: [...existing, studentId] }, { merge: true });
  };

  // Generate and send simulated Indian SMS OTP
  const sendPhoneOtp = async (phone: string): Promise<{ success: boolean; otp?: string; message?: string }> => {
    if (!import.meta.env.DEV) {
      return { success: false, message: 'SMS verification is not configured yet. Use your registered phone and password.' };
    }
    const cleanPhone = phone.trim();
    if (!cleanPhone || cleanPhone.length < 10) {
      return { success: false, message: 'Please enter a valid 10-digit mobile number' };
    }

    // Generate 6-digit OTP
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    setPendingOtpPhone(cleanPhone);
    setActiveOtpDemoCode(generatedOtp);

    return {
      success: true,
      otp: generatedOtp,
      message: `OTP sent to ${cleanPhone}. (Simulated OTP: ${generatedOtp})`
    };
  };

  // Login via Phone + OTP (Preferred in India)
  const loginWithPhoneOtp = async (phone: string, otp: string, orgId?: string): Promise<{ success: boolean; error?: string }> => {
    if (!import.meta.env.DEV) {
      return { success: false, error: 'SMS verification is not configured yet. Use your registered phone and password.' };
    }
    const cleanDigits = phone.replace(/[^0-9]/g, '');

    // Require active generated OTP code (reject static bypasses)
    if (!activeOtpDemoCode || otp.trim() !== activeOtpDemoCode.trim()) {
      return { success: false, error: 'Invalid or expired OTP code. Please enter the code delivered to your mobile number.' };
    }

    // Find matching user by phone
    let matchingUser = MOCK_USERS.find(u => {
      const uPhone = u.phone.replace(/[^0-9]/g, '');
      return uPhone.includes(cleanDigits) || cleanDigits.includes(uPhone.slice(-10));
    });

    // If no existing user matches, create an authorized Parent account on the fly for Indian coaching center
    if (!matchingUser) {
      const targetOrg = orgId ? (MOCK_ORGANIZATIONS.find(o => o.id === orgId) || MOCK_ORGANIZATIONS[0]) : MOCK_ORGANIZATIONS[0];
      matchingUser = {
        id: `user-parent-${Date.now()}`,
        orgId: targetOrg.id,
        role: 'PARENT',
        name: `Parent (${phone.slice(-4)})`,
        phone: phone.startsWith('+91') ? phone : `+91 ${phone}`,
        email: `parent.${phone.slice(-4)}@gmail.com`,
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
        linkedStudentIds: ['stud-rahul-10'] // automatically link to student
      };
    }

    const newSession: AuthSession = {
      user: matchingUser,
      orgId: matchingUser.orgId,
      createdAt: Date.now(),
      expiresAt: Date.now() + SESSION_DURATION_HOURS * 60 * 60 * 1000,
      loginMethod: 'phone_otp'
    };

    setSession(newSession);
    setPendingOtpPhone(null);
    setActiveOtpDemoCode(null);
    setShowLoginModal(false);

    return { success: true };
  };

  // Real Firebase Email + Password Login
  const loginWithEmail = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      return { success: false, error: 'Please enter both email and password.' };
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);
      const fbUser = userCredential.user;
      setFirebaseUser(fbUser);

      // Fetch or provision user record from Firestore
      const userDocRef = doc(db, 'users', fbUser.uid);
      const snap = await getDoc(userDocRef);
      if (!import.meta.env.DEV) {
        const data = snap.exists() ? snap.data() : null;
        const validRoles: UserRole[] = ['PLATFORM_OWNER', 'CENTER_ADMIN', 'STAFF', 'TEACHER', 'PARENT', 'STUDENT'];
        if (!data || !validRoles.includes(data.role) || typeof data.orgId !== 'string' || !data.orgId) {
          await signOut(auth);
          setFirebaseUser(null);
          return { success: false, error: 'Your account profile is not provisioned correctly. Please contact your coaching center administrator.' };
        }
      }
      const userOrg = import.meta.env.DEV ? await findOrganizationForUser(cleanEmail, null, fbUser.uid) : null;
      let role: UserRole = 'CENTER_ADMIN';
      let orgId = userOrg ? userOrg.id : '';
      let displayName = fbUser.displayName || cleanEmail.split('@')[0];

      if (snap.exists()) {
        const data = snap.data();
        if (data.role) role = data.role as UserRole;
        if (!orgId && data.orgId) orgId = data.orgId;
        if (data.displayName) displayName = data.displayName;
      }

      if (!orgId || (orgId === 'org-apex' && cleanEmail.toLowerCase() !== 'admin@apexacademy.in')) {
        orgId = userOrg ? userOrg.id : `org-${Date.now()}`;
      }

      await setDoc(userDocRef, {
        uid: fbUser.uid,
        email: cleanEmail,
        displayName,
        role,
        orgId,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      const resolvedUser: User = {
        id: fbUser.uid,
        name: displayName,
        email: cleanEmail,
        phone: fbUser.phoneNumber || '+91 99999 00000',
        avatar: fbUser.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(displayName)}`,
        role,
        orgId
      };

      const newSession: AuthSession = {
        user: resolvedUser,
        orgId,
        createdAt: Date.now(),
        expiresAt: Date.now() + SESSION_DURATION_HOURS * 60 * 60 * 1000,
        loginMethod: 'email_password'
      };

      setSession(newSession);
      localStorage.setItem('vidyaos_current_org_id', orgId);
      setShowLoginModal(false);
      return { success: true };
    } catch (fbErr: any) {
      console.warn('Firebase signInWithEmailAndPassword failed, checking fallback:', fbErr);

      // Check if credentials match a local demo account for frictionless developer testing
      const matchingMock = MOCK_USERS.find(u => u.email.toLowerCase() === cleanEmail.toLowerCase());
      if (import.meta.env.DEV && matchingMock && (password === 'password123' || password === 'admin' || password.length >= 4)) {
        const newSession: AuthSession = {
          user: matchingMock,
          orgId: matchingMock.orgId,
          createdAt: Date.now(),
          expiresAt: Date.now() + SESSION_DURATION_HOURS * 60 * 60 * 1000,
          loginMethod: 'email_password'
        };
        setSession(newSession);
        setShowLoginModal(false);
        return { success: true };
      }

      const errorCode = fbErr?.code;
      if (import.meta.env.DEV && (errorCode === 'auth/configuration-not-found' || fbErr?.message?.includes('configuration-not-found'))) {
        // Firebase Auth is not yet toggled on in Firebase Console for this project.
        // Fallback gracefully so developer/user is never locked out of testing.
        const matchingMock = MOCK_USERS.find(u => u.email.toLowerCase() === cleanEmail.toLowerCase());
        const resolvedUser: User = matchingMock || {
          id: `user-${Date.now()}`,
          name: cleanEmail.split('@')[0],
          email: cleanEmail,
          phone: '+91 98971 23456',
          avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(cleanEmail)}`,
          role: 'CENTER_ADMIN',
          orgId: 'org-apex'
        };

        const newSession: AuthSession = {
          user: resolvedUser,
          orgId: resolvedUser.orgId,
          createdAt: Date.now(),
          expiresAt: Date.now() + SESSION_DURATION_HOURS * 60 * 60 * 1000,
          loginMethod: 'email_password'
        };
        setSession(newSession);
        setShowLoginModal(false);
        return { success: true };
      }

      let userFriendlyMsg = fbErr?.message || 'Authentication failed.';
      if (errorCode === 'auth/invalid-credential' || errorCode === 'auth/wrong-password' || errorCode === 'auth/user-not-found') {
        userFriendlyMsg = 'Invalid email or password. Please verify your credentials or register a new center account.';
      } else if (errorCode === 'auth/too-many-requests') {
        userFriendlyMsg = 'Access temporarily disabled due to many failed attempts. Try again later or reset password.';
      }

      return { success: false, error: userFriendlyMsg };
    }
  };

  // Real Firebase Email + Password Registration
  const signupWithEmail = async (
    email: string,
    password: string,
    displayName: string,
    role: UserRole = 'CENTER_ADMIN',
    orgId: string = 'org-apex'
  ): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = email.trim();
    if (!cleanEmail || password.length < 8) {
      return { success: false, error: 'Password must be at least 8 characters long.' };
    }
    if (!import.meta.env.DEV) {
      return {
        success: false,
        error: 'To create a coaching center admin account, please use the "Register Your Institute" form on the sign-in page. This ensures your coaching center is set up correctly with all required settings.'
      };
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
      const fbUser = userCredential.user;

      if (displayName) {
        await updateProfile(fbUser, { displayName });
      }

      // Create user profile in Firestore
      const userDocRef = doc(db, 'users', fbUser.uid);
      await setDoc(userDocRef, {
        uid: fbUser.uid,
        email: cleanEmail,
        displayName: displayName || cleanEmail.split('@')[0],
        role,
        orgId,
        createdAt: new Date().toISOString()
      });

      const resolvedUser: User = {
        id: fbUser.uid,
        name: displayName || cleanEmail.split('@')[0],
        email: cleanEmail,
        phone: '+91 99999 00000',
        avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(displayName || 'User')}`,
        role,
        orgId
      };

      const newSession: AuthSession = {
        user: resolvedUser,
        orgId,
        createdAt: Date.now(),
        expiresAt: Date.now() + SESSION_DURATION_HOURS * 60 * 60 * 1000,
        loginMethod: 'email_password'
      };

      setSession(newSession);
      setShowLoginModal(false);
      return { success: true };
    } catch (err: any) {
      console.error('Firebase registration error:', err);
      if (import.meta.env.DEV && (err?.code === 'auth/configuration-not-found' || err?.message?.includes('configuration-not-found'))) {
        // Firebase Auth is not yet toggled on in Firebase Console.
        // Fall back to Firestore document creation + local session so user can continue seamlessly.
        const localUid = `user-${Date.now()}`;
        try {
          await setDoc(doc(db, 'users', localUid), {
            uid: localUid,
            email: cleanEmail,
            displayName: displayName || cleanEmail.split('@')[0],
            role,
            orgId,
            createdAt: new Date().toISOString()
          });
        } catch (_) {}

        const resolvedUser: User = {
          id: localUid,
          name: displayName || cleanEmail.split('@')[0],
          email: cleanEmail,
          phone: '+91 99999 00000',
          avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(displayName || 'User')}`,
          role,
          orgId
        };

        const newSession: AuthSession = {
          user: resolvedUser,
          orgId,
          createdAt: Date.now(),
          expiresAt: Date.now() + SESSION_DURATION_HOURS * 60 * 60 * 1000,
          loginMethod: 'email_password'
        };

        setSession(newSession);
        setShowLoginModal(false);
        return { success: true };
      }

      let errorMsg = err?.message || 'Failed to create user account.';
      if (err?.code === 'auth/email-already-in-use') {
        errorMsg = 'This email is already registered. Please log in instead.';
      }
      return { success: false, error: errorMsg };
    }
  };

  // Password Reset via Firebase Auth
  const resetPassword = async (email: string): Promise<{ success: boolean; message?: string; error?: string }> => {
    try {
      await sendPasswordResetEmail(auth, email.trim());
      return { success: true, message: `Password reset link sent to ${email}.` };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to send password reset email.' };
    }
  };

  // Fast Demo Persona Login (Instant Evaluation)
  const loginAsDemoUser = (userId: string) => {
    if (!import.meta.env.DEV) return;
    const user = MOCK_USERS.find(u => u.id === userId);
    if (!user) return;

    const newSession: AuthSession = {
      user,
      orgId: user.orgId,
      createdAt: Date.now(),
      expiresAt: Date.now() + SESSION_DURATION_HOURS * 60 * 60 * 1000,
      loginMethod: 'demo_preset'
    };

    setSession(newSession);
    setShowLoginModal(false);
  };

  // Logout & terminate session
  const logout = async () => {
    const signedInUid = session?.user.id;
    try {
      await signOut(auth);
    } catch (e) {
      console.warn('Sign out error:', e);
    }
    setFirebaseUser(null);
    setSession(null);
    // Clear the account-scoped caches as well — otherwise the next person to use
    // this browser starts out pointed at the previous user's organization.
    // `vidyaos_orgs` holds the whole organization registry (names, contact
    // details), so it goes too: login re-resolves the org from Firestore and the
    // next session repopulates the cache.
    try {
      localStorage.removeItem('vidyaos_current_org_id');
      localStorage.removeItem('vidyaos_orgs');
      if (signedInUid) localStorage.removeItem(`vidyaos_avatar_${signedInUid}`);
    } catch (e) {
      console.warn('Failed to clear cached auth state:', e);
    }
    setShowLoginModal(true);
  };

  // Update profile with real-time Firebase Auth and Firestore sync
  const updateUserProfile = async (updates: Partial<User>): Promise<{ success: boolean; error?: string }> => {
    if (!session || !currentUser) return { success: false, error: 'No active session found' };
    const cleanedUpdates = cleanFirestoreData(updates);
    const updatedUser: User = { ...currentUser, ...cleanedUpdates };

    // Update session state & localStorage
    const newSession: AuthSession = {
      ...session,
      orgId: updatedUser.orgId,
      user: updatedUser
    };
    setSession(newSession);

    if (updatedUser.avatar) {
      try {
        localStorage.setItem(`vidyaos_avatar_${updatedUser.id}`, updatedUser.avatar);
      } catch (_) {}
    }

    try {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(newSession));
    } catch (_) {}

    if (updatedUser.orgId && updatedUser.orgId !== 'system') {
      localStorage.setItem('vidyaos_current_org_id', updatedUser.orgId);
    }

    // Update Firebase Auth profile if signed in (only pass photoURL if it's a valid web URL)
    if (auth.currentUser) {
      try {
        const isHttpUrl = updatedUser.avatar && !updatedUser.avatar.startsWith('data:') && updatedUser.avatar.length < 2000;
        const authPhotoUrl = isHttpUrl
          ? updatedUser.avatar
          : (auth.currentUser.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(updatedUser.name)}`);

        await updateProfile(auth.currentUser, {
          displayName: updatedUser.name,
          photoURL: authPhotoUrl
        });
      } catch (e) {
        console.warn('Firebase Auth updateProfile warning:', e);
      }
    }

    // Persist to Firestore /users/{uid} using clean data without undefined properties
    try {
      await setDoc(doc(db, 'users', updatedUser.id), cleanFirestoreData({
        ...updatedUser,
        uid: updatedUser.id
      }), { merge: true });
    } catch (e) {
      console.error('Could not persist the user profile:', e);
      return { success: false, error: 'Could not save your profile. Check your connection and try again.' };
    }

    return { success: true };
  };

  // Role Checker
  const hasRole = (...roles: UserRole[]): boolean => {
    if (!currentUser) return false;
    return roles.includes(currentUser.role);
  };

  // Authorized Student IDs for Parents (IDOR guard)
  const authorizedStudentIds = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'PARENT') {
      return currentUser.linkedStudentIds || [];
    }
    return [];
  }, [currentUser]);

  // User-scoped secure storage utility
  const userStorage = useMemo(() => {
    return {
      get: <T,>(key: string, defaultValue: T): T => {
        if (!currentUser) return defaultValue;
        try {
          const scopedKey = `vidyaos_user_${currentUser.id}_${key}`;
          const val = localStorage.getItem(scopedKey);
          return val ? JSON.parse(val) : defaultValue;
        } catch {
          return defaultValue;
        }
      },
      set: <T,>(key: string, value: T): void => {
        if (!currentUser) return;
        try {
          const scopedKey = `vidyaos_user_${currentUser.id}_${key}`;
          localStorage.setItem(scopedKey, JSON.stringify(value));
        } catch (e) {
          console.error('Failed to store user-scoped data', e);
        }
      },
      remove: (key: string): void => {
        if (!currentUser) return;
        const scopedKey = `vidyaos_user_${currentUser.id}_${key}`;
        localStorage.removeItem(scopedKey);
      }
    };
  }, [currentUser]);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        firebaseUser,
        session,
        isAuthenticated,
        loginWithGoogle,
        loginWithPhonePassword,
        signupWithPhonePassword,
        updateOwnPassword,
        registerUserCredentials,
        linkStudentToParent,
        loginWithPhoneOtp,
        sendPhoneOtp,
        loginWithEmail,
        signupWithEmail,
        resetPassword,
        loginAsDemoUser,
        logout,
        updateUserProfile,
        pendingOtpPhone,
        setPendingOtpPhone,
        activeOtpDemoCode,
        showLoginModal,
        setShowLoginModal,
        hasRole,
        authorizedStudentIds,
        userStorage
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
