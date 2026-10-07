import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import {
  Inquiry,
  InquiryNote,
  InquiryStatus,
  InquirySource,
  IndianBoard,
  Organization,
  User
} from '../../types';
import {
  subscribeToInquiries,
  persistInquiryToFirestore,
  deleteInquiryFromFirestore
} from '../../lib/firestoreService';
import { appendInquiryNote } from '../../lib/inquiries';

const INQUIRY_MIRROR_KEY = 'vidyaos_inquiries';

export interface NewInquiryInput {
  name: string;
  phone: string;
  email?: string;
  classGrade?: string;
  board?: IndianBoard;
  subjects?: string[];
  source?: InquirySource;
  status?: InquiryStatus;
  followUpDate?: string;
  interestedBatchIds?: string[];
  branchId?: string;
  /** Optional first conversation note captured at the desk. */
  note?: string;
}

export interface InquiryContextType {
  inquiries: Inquiry[];
  addInquiry: (input: NewInquiryInput) => Inquiry;
  updateInquiry: (inquiryId: string, updates: Partial<Inquiry>) => void;
  addInquiryNote: (inquiryId: string, text: string) => void;
  markInquiryConverted: (inquiryId: string, studentId: string, studentName: string) => void;
  deleteInquiry: (inquiryId: string) => void;
}

const InquiryContext = createContext<InquiryContextType | undefined>(undefined);

interface InquiryProviderProps {
  currentOrg: Organization;
  currentUser: User;
  isPlatformOwner: boolean;
  children: React.ReactNode;
}

/** DEV-only mirror so the demo fortress survives a reload; prod reads Firestore only. */
function readInquiryMirror(): Inquiry[] {
  try {
    const raw = localStorage.getItem(INQUIRY_MIRROR_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((i): i is Inquiry => !!i && typeof i.id === 'string') : [];
  } catch {
    return [];
  }
}

function writeInquiryMirror(inquiries: Inquiry[]): void {
  try {
    localStorage.setItem(INQUIRY_MIRROR_KEY, JSON.stringify(inquiries.slice(0, 500)));
  } catch {
    // Mirror is a convenience — never fatal.
  }
}

export const InquiryProvider: React.FC<InquiryProviderProps> = ({
  currentOrg,
  currentUser,
  isPlatformOwner,
  children
}) => {
  const [inquiries, setInquiries] = useState<Inquiry[]>(() => {
    return import.meta.env.DEV ? readInquiryMirror() : [];
  });

  // Real-time Firestore subscription — the single source of truth.
  useEffect(() => {
    const targetOrg = isPlatformOwner ? undefined : currentOrg.id;
    const unsub = subscribeToInquiries(data => {
      if (data) setInquiries(data);
    }, targetOrg);

    return () => {
      unsub();
    };
  }, [currentOrg.id, isPlatformOwner]);

  const commit = (next: Inquiry[]) => {
    setInquiries(next);
    if (import.meta.env.DEV) writeInquiryMirror(next);
  };

  const addInquiry = (input: NewInquiryInput): Inquiry => {
    const now = Date.now();
    const inquiry: Inquiry = {
      id: `inq-${now.toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      orgId: currentOrg.id,
      branchId: input.branchId || currentOrg.branches[0]?.id || 'branch-1',
      name: input.name.trim(),
      phone: input.phone.trim(),
      email: input.email?.trim() || undefined,
      classGrade: input.classGrade || undefined,
      board: input.board,
      subjects: input.subjects,
      source: input.source,
      status: input.status || 'new',
      followUpDate: input.followUpDate || undefined,
      interestedBatchIds: input.interestedBatchIds,
      notes:
        input.note && input.note.trim()
          ? [
              {
                authorId: currentUser.id,
                authorName: currentUser.name,
                text: input.note.trim(),
                createdAt: new Date(now).toISOString()
              }
            ]
          : [],
      createdByUserId: currentUser.id,
      createdByName: currentUser.name,
      createdAt: new Date(now).toISOString(),
      createdAtMs: now
    };
    commit([inquiry, ...inquiries]);
    persistInquiryToFirestore(inquiry);
    return inquiry;
  };

  const updateInquiry = (inquiryId: string, updates: Partial<Inquiry>): void => {
    const target = inquiries.find(i => i.id === inquiryId);
    if (!target) {
      // Fail silently for a stale id — mirrors how the other slices behave
      // when a doc disappeared between render and click.
      return;
    }
    const updated: Inquiry = {
      ...target,
      ...updates,
      id: target.id,
      orgId: target.orgId,
      createdAt: target.createdAt,
      createdAtMs: target.createdAtMs,
      updatedAt: new Date().toISOString()
    };
    commit(inquiries.map(i => (i.id === inquiryId ? updated : i)));
    persistInquiryToFirestore(updated);
  };

  const addInquiryNote = (inquiryId: string, text: string): void => {
    const trimmed = text.trim();
    const target = inquiries.find(i => i.id === inquiryId);
    if (!target || !trimmed) return;
    const note: InquiryNote = {
      authorId: currentUser.id,
      authorName: currentUser.name,
      text: trimmed,
      createdAt: new Date().toISOString()
    };
    updateInquiry(inquiryId, { notes: appendInquiryNote(target.notes, note) });
  };

  const markInquiryConverted = (inquiryId: string, studentId: string, studentName: string): void => {
    const target = inquiries.find(i => i.id === inquiryId);
    if (!target) return;
    const note: InquiryNote = {
      authorId: currentUser.id,
      authorName: currentUser.name,
      text: `Converted to student — ${studentName} admitted.`,
      createdAt: new Date().toISOString()
    };
    updateInquiry(inquiryId, {
      status: 'joined',
      convertedStudentId: studentId,
      notes: appendInquiryNote(target.notes, note)
    });
  };

  const deleteInquiry = (inquiryId: string) => {
    commit(inquiries.filter(i => i.id !== inquiryId));
    deleteInquiryFromFirestore(inquiryId);
  };

  // Multi-tenant isolation for the view layer.
  const tenantInquiries = useMemo(() => {
    if (isPlatformOwner) return inquiries;
    return inquiries.filter(i => i.orgId === currentOrg.id);
  }, [inquiries, currentOrg.id, isPlatformOwner]);

  return (
    <InquiryContext.Provider
      value={{
        inquiries: tenantInquiries,
        addInquiry,
        updateInquiry,
        addInquiryNote,
        markInquiryConverted,
        deleteInquiry
      }}
    >
      {children}
    </InquiryContext.Provider>
  );
};

export const useInquiries = () => {
  const context = useContext(InquiryContext);
  if (!context) {
    throw new Error('useInquiries must be used within an InquiryProvider');
  }
  return context;
};