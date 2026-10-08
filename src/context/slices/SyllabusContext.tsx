/**
 * Syllabus coverage slice (F7).
 *
 * Owns the `syllabusTopics` collection: a flat, ordered chapter checklist per
 * batch. Admins seed a batch from a built-in board template; teachers tick the
 * chapters off. Follows the exact slice shape of `AcademicContext` /
 * `FinanceContext` (state + DEV mirror + realtime subscribe + tenant filter).
 */

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { Organization, SyllabusStatus, SyllabusTopic } from '../../types';
import { MOCK_SYLLABUS_TOPICS } from '../../data/mockData';
import {
  subscribeToSyllabusTopics,
  persistSyllabusTopicToFirestore,
  deleteSyllabusTopicFromFirestore
} from '../../lib/firestoreService';
import { findSyllabusTemplate, buildTopicsFromTemplate, BuildTopicsMeta } from '../../lib/syllabus';
import { getIndiaDateString } from '../../lib/date';

export interface SyllabusCreateParams {
  batchId: string;
  /** Board whose template to seed from (defaults to CBSE). */
  board?: string;
  /** Defaults to the batch's own subject. */
  subject?: string;
  /** Defaults to the batch's own classGrade. */
  classGrade?: string;
  /** Explicit chapter titles (skips template lookup). */
  chapters?: string[];
}

export interface TopicStatusMeta {
  /** Teacher *record* id that performed the tick (not the user uid). */
  coveredByTeacherId?: string;
  note?: string;
}

export interface SyllabusContextType {
  syllabusTopics: SyllabusTopic[];
  /** Seed a batch's chapter checklist from a built-in board template. */
  createTopicsFromTemplate: (params: SyllabusCreateParams) => SyllabusTopic[];
  /** One-tap coverage update with automatic covered-by / covered-at stamping. */
  updateTopicStatus: (topicId: string, status: SyllabusStatus, meta?: TopicStatusMeta) => void;
  updateSyllabusTopic: (topicId: string, updates: Partial<Omit<SyllabusTopic, 'id' | 'orgId'>>) => void;
  deleteSyllabusTopic: (topicId: string) => void;
  deleteTopicsForBatch: (batchId: string) => void;
}

const SyllabusContext = createContext<SyllabusContextType | undefined>(undefined);

interface SyllabusProviderProps {
  currentOrg: Organization;
  selectedBranchId: string;
  currentUser: { id: string };
  batches: { id: string; classGrade?: string; subject?: string; branchId?: string }[];
  isPlatformOwner: boolean;
  children: React.ReactNode;
}

export const SyllabusProvider: React.FC<SyllabusProviderProps> = ({
  currentOrg,
  selectedBranchId,
  currentUser,
  batches,
  isPlatformOwner,
  children
}) => {
  // DEV-only localStorage mirror — production reads Firestore only.
  const [syllabusTopics, setSyllabusTopics] = useState<SyllabusTopic[]>(() => {
    return import.meta.env.DEV ? MOCK_SYLLABUS_TOPICS : [];
  });

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    try {
      localStorage.setItem('vidyaos_syllabus', JSON.stringify(syllabusTopics));
    } catch {
      /* quota / private-mode — non-fatal */
    }
  }, [syllabusTopics]);

  // Real-time Firestore subscription (org-scoped unless platform owner).
  useEffect(() => {
    const targetOrg = isPlatformOwner ? undefined : currentOrg.id;
    const unsub = subscribeToSyllabusTopics(data => {
      if (data) setSyllabusTopics(data);
    }, targetOrg);
    return () => unsub();
  }, [currentOrg.id, isPlatformOwner]);

  // Multi-tenant isolation, identical to the other slices.
  const tenantTopics = useMemo(() => {
    if (isPlatformOwner) return syllabusTopics;
    return syllabusTopics.filter(
      t => t.orgId === currentOrg.id && (selectedBranchId === 'all' || t.branchId === selectedBranchId)
    );
  }, [syllabusTopics, currentOrg.id, isPlatformOwner, selectedBranchId]);

  const createTopicsFromTemplate = (params: SyllabusCreateParams): SyllabusTopic[] => {
    const batch = batches.find(b => b.id === params.batchId);
    const board = (params.board || 'CBSE') as SyllabusTopic['board'];
    const classGrade = params.classGrade || batch?.classGrade || 'Class 10';
    const subject = params.subject || batch?.subject || 'General';

    const template = findSyllabusTemplate(board, classGrade, subject);
    const chapters =
      params.chapters && params.chapters.length > 0
        ? params.chapters
        : template
          ? template.chapters
          : [];

    if (chapters.length === 0) return [];

    const branchId =
      selectedBranchId !== 'all' ? selectedBranchId : batch?.branchId || currentOrg.branches[0]?.id || 'branch-main';

    const meta: BuildTopicsMeta = {
      orgId: currentOrg.id,
      branchId,
      batchId: params.batchId,
      subject,
      classGrade,
      board,
      idPrefix: `syl-${params.batchId}-${Date.now().toString(36)}`
    };

    const created = buildTopicsFromTemplate(
      { board, classGrade, subject, chapters },
      meta
    );

    setSyllabusTopics(prev => [...prev, ...created]);
    created.forEach(t => persistSyllabusTopicToFirestore(t));
    return created;
  };

  const updateTopicStatus = (topicId: string, status: SyllabusStatus, meta?: TopicStatusMeta) => {
    const nowIso = new Date().toISOString();
    setSyllabusTopics(prev =>
      prev.map(t => {
        if (t.id !== topicId) return t;
        const updated: SyllabusTopic = {
          ...t,
          status,
          coveredAt: nowIso,
          coveredDate: getIndiaDateString(new Date()),
          coveredByTeacherId: meta?.coveredByTeacherId || t.coveredByTeacherId || currentUser.id,
          note: meta?.note !== undefined ? meta.note : t.note
        };
        persistSyllabusTopicToFirestore(updated);
        return updated;
      })
    );
  };

  const updateSyllabusTopic = (topicId: string, updates: Partial<Omit<SyllabusTopic, 'id' | 'orgId'>>) => {
    setSyllabusTopics(prev =>
      prev.map(t => {
        if (t.id !== topicId) return t;
        const updated: SyllabusTopic = { ...t, ...updates, id: t.id, orgId: t.orgId };
        persistSyllabusTopicToFirestore(updated);
        return updated;
      })
    );
  };

  const deleteSyllabusTopic = (topicId: string) => {
    setSyllabusTopics(prev => prev.filter(t => t.id !== topicId));
    deleteSyllabusTopicFromFirestore(topicId);
  };

  const deleteTopicsForBatch = (batchId: string) => {
    const doomed = syllabusTopics.filter(t => t.batchId === batchId);
    setSyllabusTopics(prev => prev.filter(t => t.batchId !== batchId));
    doomed.forEach(t => deleteSyllabusTopicFromFirestore(t.id));
  };

  return (
    <SyllabusContext.Provider
      value={{
        syllabusTopics: tenantTopics,
        createTopicsFromTemplate,
        updateTopicStatus,
        updateSyllabusTopic,
        deleteSyllabusTopic,
        deleteTopicsForBatch
      }}
    >
      {children}
    </SyllabusContext.Provider>
  );
};

export const useSyllabus = () => {
  const context = useContext(SyllabusContext);
  if (!context) {
    throw new Error('useSyllabus must be used within a SyllabusProvider');
  }
  return context;
};