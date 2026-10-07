/**
 * VidyaOS Inquiries / Leads pipeline (F2) — pure, dependency-free helpers.
 *
 * Same philosophy as `lib/audit.ts`: no Firestore imports, so the identical
 * logic runs in the browser (app) and in node (unit suite in test-auth.ts).
 */

import { Inquiry, InquiryStatus, InquirySource, InquiryNote } from '../types';

export const INQUIRY_STATUSES: InquiryStatus[] = [
  'new',
  'contacted',
  'demo_booked',
  'joined',
  'lost'
];

export const INQUIRY_SOURCES: InquirySource[] = [
  'walkin',
  'call',
  'whatsapp',
  'referral',
  'online',
  'other'
];

/** Pipeline index — used to lay out the kanban columns left to right. */
export function statusOrder(status: InquiryStatus): number {
  return INQUIRY_STATUSES.indexOf(status);
}

/**
 * A joined lead is terminal: it became a student (via conversion) and must not
 * silently slip back into the funnel through an accidental status edit.
 */
export function isTerminalInquiryStatus(status: InquiryStatus): boolean {
  return status === 'joined';
}

/**
 * Allowed status transitions inside the edit UI. Everything can move anywhere
 * except a 'joined' lead — reopening that requires an explicit decision by the
 * caller (a reopening helper with its own audit trail).
 */
export function canSetInquiryStatus(from: InquiryStatus, to: InquiryStatus): boolean {
  if (to === from) return true;
  return !isTerminalInquiryStatus(from);
}

/** Search across name / phone / email / class — the desk's instant lookup. */
export function searchInquiries(inquiries: Inquiry[], term: string): Inquiry[] {
  const q = term.trim().toLowerCase();
  if (!q) return inquiries;
  return inquiries.filter(i =>
    [i.name, i.phone, i.email || '', i.classGrade || '', i.board || '']
      .some(v => v.toLowerCase().includes(q))
  );
}

/** Per-column occupancy for the pipeline board. */
export function countByStatus(inquiries: Inquiry[]): Record<InquiryStatus, number> {
  const counts: Record<InquiryStatus, number> = {
    new: 0,
    contacted: 0,
    demo_booked: 0,
    joined: 0,
    lost: 0
  };
  inquiries.forEach(i => {
    if (counts[i.status] !== undefined) counts[i.status] += 1;
  });
  return counts;
}

/**
 * Leads with a follow-up date sort first (soonest date at the top), then the
 * ones without one. Used so "call today" never drowns in the list.
 */
export function sortInquiriesForFollowUp(inquiries: Inquiry[]): Inquiry[] {
  return [...inquiries].sort((a, b) => {
    const aHas = !!a.followUpDate;
    const bHas = !!b.followUpDate;
    if (aHas !== bHas) return aHas ? -1 : 1;
    if (aHas && bHas) return a.followUpDate! < b.followUpDate! ? -1 : a.followUpDate! > b.followUpDate! ? 1 : 0;
    return b.createdAtMs - a.createdAtMs;
  });
}

/** Append a note (pure) — returns a new notes array with the entry at the end. */
export function appendInquiryNote(
  notes: InquiryNote[],
  note: { authorId: string; authorName: string; text: string; createdAt: string }
) {
  return [...notes, note];
}

/** Thin display helper: "+91 98765 43210" from "+919876543210" if possible. */
export function formatInquiryPhone(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
  return phone;
}

export type { InquiryNote };