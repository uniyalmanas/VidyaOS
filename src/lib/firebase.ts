import { initializeApp, deleteApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  updatePassword,
  User as FirebaseUser
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  onSnapshot,
  getDocFromServer,
  deleteDoc,
  query,
  where,
  limit,
  orderBy,
  writeBatch,
  runTransaction
} from 'firebase/firestore';
import {
  getStorage,
  ref,
  uploadBytes,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject
} from 'firebase/storage';
import rawConfig from '../../firebase-applet-config.json';

export const firebaseConfig = {
  ...rawConfig,
  apiKey: (import.meta.env?.VITE_FIREBASE_API_KEY as string) || rawConfig.apiKey || '',
  projectId: (import.meta.env?.VITE_FIREBASE_PROJECT_ID as string) || rawConfig.projectId,
  appId: (import.meta.env?.VITE_FIREBASE_APP_ID as string) || rawConfig.appId,
  authDomain: (import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN as string) || rawConfig.authDomain,
  storageBucket: (import.meta.env?.VITE_FIREBASE_STORAGE_BUCKET as string) || rawConfig.storageBucket,
  messagingSenderId: (import.meta.env?.VITE_FIREBASE_MESSAGING_SENDER_ID as string) || rawConfig.messagingSenderId,
};

const app = initializeApp(firebaseConfig);

// Support both default and named Firestore database IDs
export const db = (firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)')
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

/**
 * Creates a new user in Firebase Authentication in the background without
 * disturbing or logging out the currently active admin/owner session.
 */
export async function createSecondaryUser(
  email: string,
  pass: string,
  displayName?: string
): Promise<{ success: boolean; uid?: string; error?: string }> {
  const secondaryAppName = `SecApp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  let secApp;
  try {
    secApp = initializeApp(firebaseConfig, secondaryAppName);
    const secAuth = getAuth(secApp);
    try {
      const userCredential = await createUserWithEmailAndPassword(secAuth, email, pass);
      if (displayName) {
        await updateProfile(userCredential.user, { displayName });
      }
      const uid = userCredential.user.uid;
      await signOut(secAuth);
      return { success: true, uid };
    } catch (createErr: any) {
      if (createErr?.code === 'auth/email-already-in-use') {
        // User already exists in Firebase Auth - verify or update credentials
        try {
          const existingCred = await signInWithEmailAndPassword(secAuth, email, pass);
          if (displayName && existingCred.user.displayName !== displayName) {
            await updateProfile(existingCred.user, { displayName });
          }
          const uid = existingCred.user.uid;
          await signOut(secAuth);
          return { success: true, uid };
        } catch (signInErr: any) {
          try {
            const fallbackCred = await signInWithEmailAndPassword(secAuth, email, 'teacher123');
            await updatePassword(fallbackCred.user, pass);
            if (displayName) {
              await updateProfile(fallbackCred.user, { displayName });
            }
            const uid = fallbackCred.user.uid;
            await signOut(secAuth);
            return { success: true, uid };
          } catch (_) {
            return {
              success: false,
              error: 'An account with this mobile number already exists. Please ask the faculty member to sign in.'
            };
          }
        }
      }
      console.warn('createSecondaryUser notice:', createErr?.code, createErr?.message);
      return { success: false, error: createErr?.message || createErr?.code };
    }
  } catch (err: any) {
    return { success: false, error: err?.code || err?.message };
  } finally {
    if (secApp) {
      try {
        await deleteApp(secApp);
      } catch (_) {}
    }
  }
}

// Firebase Cloud Storage instance
export const storage = getStorage(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Connection check on boot
export async function testFirestoreConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore is offline or connection restricted.');
    }
  }
}

/**
 * Upload any File or Blob directly to Firebase Cloud Storage.
 * Returns the public or signed download URL.
 */
export async function uploadFileToStorage(
  storagePath: string,
  file: File | Blob,
  contentType?: string
): Promise<string> {
  try {
    const storageRef = ref(storage, storagePath);
    const metadata = contentType ? { contentType } : undefined;
    const snapshot = await uploadBytes(storageRef, file, metadata);
    const downloadUrl = await getDownloadURL(snapshot.ref);
    return downloadUrl;
  } catch (error: any) {
    console.error(`Firebase Storage upload failed at ${storagePath}:`, error);
    throw new Error(error?.message || 'Failed to upload file to Cloud Storage.');
  }
}

/**
 * Delete a file from Firebase Cloud Storage by its storage path.
 */
export async function deleteFileFromStorage(storagePath: string): Promise<void> {
  try {
    const storageRef = ref(storage, storagePath);
    await deleteObject(storageRef);
  } catch (error: any) {
    console.warn(`Firebase Storage delete failed at ${storagePath}:`, error);
  }
}

export {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  onSnapshot,
  deleteDoc,
  query,
  where,
  limit,
  orderBy,
  writeBatch,
  runTransaction,
  ref,
  uploadBytes,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject
};
export type { FirebaseUser };
