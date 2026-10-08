/**
 * F9 — Student ID card + Transfer Certificate (print).
 *
 * Pure, side-effect-free helpers behind the two print flows. There is no file
 * storage: the "document" is generated in the browser and sent straight to the
 * print dialog, while `issuedDocuments` keeps the accession register so a TC
 * serial is never reused. Everything here is deliberately dumb and testable —
 * numbering, accession, barcode encoding and validation all run identically in
 * `test-auth.ts` and in the portal.
 */

import { IssuedDocument, IssuedDocumentType, Organization, TcIssueInput } from '../types';
import { getIndiaDateString } from './date';

/** Zero-padding of the per-year TC sequence ("001"). */
export const TC_NUMBER_PAD = 3;
/** Zero-padding of the running accession number ("0001"). */
export const ACCESSION_PAD = 4;
export const ACCESSION_PREFIX = 'ACC';
export const MAX_TC_REMARKS = 500;

export const ISSUED_DOCUMENT_TYPES: IssuedDocumentType[] = ['id_card', 'tc'];

export const ISSUED_DOCUMENT_LABEL: Record<IssuedDocumentType, string> = {
  id_card: 'Student ID Card',
  tc: 'Transfer Certificate'
};

export function documentTypeLabel(type: IssuedDocumentType): string {
  return ISSUED_DOCUMENT_LABEL[type] || 'Document';
}

// ---------------------------------------------------------------------------
// Numbering
// ---------------------------------------------------------------------------

/** Four-digit issue year, observed in India so "year" matches the printed date. */
export function issueYear(isoOrDate: string | Date = new Date()): string {
  const date = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
  if (Number.isNaN(date.getTime())) {
    return getIndiaDateString(new Date()).slice(0, 4);
  }
  return getIndiaDateString(date).slice(0, 4);
}

/** Organisation prefix for a TC serial — "Apex Academy" → "APEXACADEMY". */
export function tcNumberPrefix(org: Pick<Organization, 'slug' | 'logoText' | 'name'>): string {
  const raw = (org.slug || org.logoText || org.name || 'TC').trim().toUpperCase();
  return raw.replace(/[^A-Z0-9]/g, '') || 'TC';
}

/** `${prefix}/${year}/${NNN}` — the human-facing certificate number. */
export function formatTcNumber(prefix: string, year: string | number, sequence: number): string {
  const clean = (prefix || 'TC').trim().toUpperCase().replace(/[^A-Z0-9]/g, '') || 'TC';
  const seq = Math.max(1, Math.floor(sequence));
  return `${clean}/${year}/${String(seq).padStart(TC_NUMBER_PAD, '0')}`;
}

/** Parse the trailing sequence out of a serial matching this prefix + year. */
export function parseTcNumber(tcNo: string, prefix: string, year: string | number): number | null {
  const clean = (prefix || 'TC').trim().toUpperCase().replace(/[^A-Z0-9]/g, '') || 'TC';
  const match = new RegExp(`^${clean}\\/(\\d{4})\\/(\\d+)$`).exec((tcNo || '').trim().toUpperCase());
  if (!match) return null;
  if (match[1] !== String(year)) return null;
  const seq = Number(match[2]);
  return Number.isFinite(seq) && seq > 0 ? seq : null;
}

/**
 * The next sequence for `prefix`/`year`: the highest number already issued for
 * that year plus one. Using the maximum (not the count) means a hand-deleted
 * row can never cause a certificate number to be re-used.
 */
export function nextTcSequence(
  existing: IssuedDocument[],
  prefix: string,
  year: string | number
): number {
  let max = 0;
  for (const doc of existing) {
    if (doc.type !== 'tc' || !doc.tcNo) continue;
    const seq = parseTcNumber(doc.tcNo, prefix, year);
    if (seq != null && seq > max) max = seq;
  }
  return max + 1;
}

export function nextTcNumber(
  existing: IssuedDocument[],
  prefix: string,
  year: string | number = issueYear()
): string {
  return formatTcNumber(prefix, year, nextTcSequence(existing, prefix, year));
}

/** Running register number — one per issued document regardless of type. */
export function formatAccessionNo(sequence: number): string {
  return `${ACCESSION_PREFIX}-${String(Math.max(1, Math.floor(sequence))).padStart(ACCESSION_PAD, '0')}`;
}

export function nextAccessionNo(existing: IssuedDocument[]): string {
  return formatAccessionNo(existing.length + 1);
}

// ---------------------------------------------------------------------------
// Rendering helpers
// ---------------------------------------------------------------------------

/**
 * Deterministic bar widths for the ID card's barcode strip. No real barcode
 * symbology is needed — the card just has to *look* like one and stay stable
 * for the same enrollment number.
 */
export function barcodeBars(value: string, bars = 40): number[] {
  const text = (value || '0').replace(/\s/g, '');
  const widths: number[] = [];
  let hash = 2166136261;
  for (let i = 0; i < bars; i++) {
    const code = text.charCodeAt(i % text.length);
    hash = ((hash ^ code) * 16777619) >>> 0;
    widths.push(1 + ((hash >>> (i % 16)) % 3));
  }
  return widths;
}

// ---------------------------------------------------------------------------
// Validation & selectors
// ---------------------------------------------------------------------------

export function validateTcInput(input: TcIssueInput): string | null {
  if (input.leavingDate && !/^\d{4}-\d{2}-\d{2}$/.test(input.leavingDate)) {
    return 'Leaving date must be a valid date.';
  }
  if (input.remarks && input.remarks.trim().length > MAX_TC_REMARKS) {
    return `Remarks must be ${MAX_TC_REMARKS} characters or fewer.`;
  }
  return null;
}

/** Documents for one student, newest issue first. */
export function issuedForStudent(docs: IssuedDocument[], studentId: string): IssuedDocument[] {
  return docs
    .filter(d => d.studentId === studentId)
    .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));
}

/** The most recent document of a given type for a student, if any. */
export function latestIssued(
  docs: IssuedDocument[],
  studentId: string,
  type: IssuedDocumentType
): IssuedDocument | null {
  return issuedForStudent(docs, studentId).find(d => d.type === type) || null;
}