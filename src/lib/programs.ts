/**
 * VidyaOS program catalog — the single source of truth for what kind of
 * institute a centre is and which exams it prepares students for.
 *
 * Historically a tuition-centre product only offered school boards + JEE/NEET.
 * VidyaOS now also serves general coaching for government/competitive exams
 * (SSC, Banking, Railways, UPSC & State PSC, Defence, Teaching, Police) and
 * skill institutes. Every picker in the app reads this catalog so no centre is
 * ever locked into a school-only workflow.
 *
 * Pure and dependency-free (same philosophy as `lib/syllabus.ts`): the identical
 * catalog drives the browser forms and the node test-runner.
 *
 * NOTE: `classGrade` is a free-form string everywhere, so the `levels` below are
 * only *suggestions* — the UI always offers an "Other / Custom" escape hatch.
 */

import { IndianBoard } from '../types';

export const PROGRAM_CATEGORIES = [
  'School & Board',
  'Competitive Exams',
  'Government Exams',
  'Skills & Others'
] as const;

export type ProgramCategory = (typeof PROGRAM_CATEGORIES)[number];

export interface ProgramTrack {
  id: IndianBoard;
  label: string;
  category: ProgramCategory;
  /** Suggested learner levels / exams for this track (custom entry still allowed). */
  levels: string[];
  /** Suggested subjects / papers. */
  subjects: string[];
}

const SCHOOL_LEVELS = ['Class 5', 'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12'];
const SCIENCE_SUBJECTS = ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'Computer Science'];

export const PROGRAM_TRACKS: ProgramTrack[] = [
  // --- School & Board -------------------------------------------------------
  {
    id: 'Board level',
    label: 'School — Board level',
    category: 'School & Board',
    levels: SCHOOL_LEVELS,
    subjects: ['Mathematics', 'Science', 'Physics', 'Chemistry', 'Biology', 'English', 'Social Science', 'Hindi', 'Sanskrit', 'Computer Science']
  },
  {
    id: 'CBSE',
    label: 'CBSE',
    category: 'School & Board',
    levels: ['Class 9', 'Class 10', 'Class 11', 'Class 12'],
    subjects: ['Mathematics', 'Science', 'Physics', 'Chemistry', 'Biology', 'English', 'Social Science', 'Hindi']
  },
  {
    id: 'ICSE',
    label: 'ICSE / ISC',
    category: 'School & Board',
    levels: ['Class 9', 'Class 10', 'Class 11', 'Class 12'],
    subjects: ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'History & Civics', 'Geography', 'Computer Applications']
  },
  {
    id: 'State Board',
    label: 'State Board',
    category: 'School & Board',
    levels: SCHOOL_LEVELS,
    subjects: ['Mathematics', 'Science', 'Social Science', 'English', 'Regional Language']
  },
  {
    id: 'Board level & Coaching',
    label: 'Integrated (Board + Entrance)',
    category: 'School & Board',
    levels: SCHOOL_LEVELS,
    subjects: ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 'Aptitude']
  },
  {
    id: 'Tuition (All Subjects)',
    label: 'Tuition — all subjects',
    category: 'School & Board',
    levels: SCHOOL_LEVELS,
    subjects: ['Mathematics', 'Science', 'English', 'Social Science', 'Hindi', 'Regional Language']
  },
  {
    id: 'Coaching',
    label: 'Coaching (general)',
    category: 'School & Board',
    levels: SCHOOL_LEVELS,
    subjects: SCIENCE_SUBJECTS
  },

  // --- Competitive Exams ---------------------------------------------------
  {
    id: 'JEE Foundation',
    label: 'JEE Foundation',
    category: 'Competitive Exams',
    levels: ['Class 8', 'Class 9', 'Class 10'],
    subjects: ['Mathematics', 'Physics', 'Chemistry', 'Aptitude']
  },
  {
    id: 'NEET Foundation',
    label: 'NEET Foundation',
    category: 'Competitive Exams',
    levels: ['Class 8', 'Class 9', 'Class 10'],
    subjects: ['Biology', 'Physics', 'Chemistry', 'Aptitude']
  },
  {
    id: 'JEE Main & Advanced',
    label: 'JEE Main & Advanced',
    category: 'Competitive Exams',
    levels: ['JEE Main', 'JEE Advanced', 'Dropper / Repeater'],
    subjects: ['Physics', 'Chemistry', 'Mathematics']
  },
  {
    id: 'NEET UG',
    label: 'NEET UG',
    category: 'Competitive Exams',
    levels: ['NEET UG', 'Dropper / Repeater'],
    subjects: ['Physics', 'Chemistry', 'Biology']
  },
  {
    id: 'CUET',
    label: 'CUET (UG)',
    category: 'Competitive Exams',
    levels: ['CUET UG'],
    subjects: ['General Test', 'Domain Subjects', 'English', 'Reasoning']
  },
  {
    id: 'Olympiad & NTSE',
    label: 'Olympiad & NTSE',
    category: 'Competitive Exams',
    levels: ['Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'NTSE'],
    subjects: ['Mathematics', 'Science', 'Mental Ability', 'Social Science']
  },

  // --- Government Exams ----------------------------------------------------
  {
    id: 'SSC',
    label: 'SSC (CGL / CHSL / MTS / GD)',
    category: 'Government Exams',
    levels: ['SSC CGL', 'SSC CHSL', 'SSC MTS', 'SSC GD', 'SSC CPO', 'SSC JE'],
    subjects: ['Quantitative Aptitude', 'Reasoning', 'English', 'General Awareness', 'Computer Knowledge']
  },
  {
    id: 'Banking',
    label: 'Banking (IBPS / SBI / RBI)',
    category: 'Government Exams',
    levels: ['IBPS PO', 'IBPS Clerk', 'SBI PO', 'SBI Clerk', 'RBI Grade B', 'NABARD Grade A'],
    subjects: ['Quantitative Aptitude', 'Reasoning', 'English', 'Banking Awareness', 'Computer Knowledge']
  },
  {
    id: 'Railways',
    label: 'Railways (RRB / RPF)',
    category: 'Government Exams',
    levels: ['RRB NTPC', 'RRB Group D', 'RRB ALP', 'RRB JE', 'RPF Constable'],
    subjects: ['Mathematics', 'Reasoning', 'General Awareness', 'General Science']
  },
  {
    id: 'UPSC & State PSC',
    label: 'UPSC & State PSC',
    category: 'Government Exams',
    levels: ['UPSC CSE Prelims', 'UPSC CSE Mains', 'State PSC Prelims', 'State PSC Mains'],
    subjects: ['Indian Polity', 'History', 'Geography', 'Economy', 'Environment & Ecology', 'Current Affairs', 'CSAT / Aptitude', 'Essay & Ethics']
  },
  {
    id: 'Defence',
    label: 'Defence (NDA / CDS / AFCAT)',
    category: 'Government Exams',
    levels: ['NDA', 'CDS', 'AFCAT', 'CAPF / AC', 'Territorial Army'],
    subjects: ['Mathematics', 'General Ability Test', 'English', 'General Knowledge']
  },
  {
    id: 'Teaching Exams',
    label: 'Teaching (CTET / TET / KVS)',
    category: 'Government Exams',
    levels: ['CTET', 'State TET', 'KVS / NVS', 'DSSSB'],
    subjects: ['Child Development & Pedagogy', 'Mathematics', 'EVS', 'Language I', 'Language II']
  },
  {
    id: 'Police & SI',
    label: 'Police & Sub-Inspector',
    category: 'Government Exams',
    levels: ['Police Constable', 'Sub-Inspector', 'CAPF / Constable'],
    subjects: ['Reasoning', 'Mathematics', 'General Knowledge', 'Law & Constitution']
  },

  // --- Skills & Others -----------------------------------------------------
  {
    id: 'Skill Training',
    label: 'Skill Training',
    category: 'Skills & Others',
    levels: ['Certificate', 'Diploma', 'Advanced'],
    subjects: ['Computer Basics', 'Communication', 'Vocational Skills']
  },
  {
    id: 'Spoken English',
    label: 'Spoken English',
    category: 'Skills & Others',
    levels: ['Beginner', 'Intermediate', 'Advanced'],
    subjects: ['Grammar', 'Conversation', 'Vocabulary', 'Public Speaking']
  },
  {
    id: 'Computer & IT Skills',
    label: 'Computer & IT Skills',
    category: 'Skills & Others',
    levels: ['Beginner', 'Intermediate', 'Advanced'],
    subjects: ['MS Office', 'Tally', 'Programming Basics', 'Internet & Email']
  }
];

export const DEFAULT_TRACK: IndianBoard = 'Board level';
export const DEFAULT_LEVEL = 'Class 10';

/** Look up a track by its persisted id. */
export function getProgramTrack(id: IndianBoard): ProgramTrack | undefined {
  return PROGRAM_TRACKS.find(t => t.id === id);
}

/** Human label for a track id (falls back to the raw id for custom entries). */
export function programLabel(id: IndianBoard): string {
  return getProgramTrack(id)?.label || id;
}

/** Tracks grouped in category order, ready for `<optgroup>`s. */
export function tracksByCategory(): { category: ProgramCategory; tracks: ProgramTrack[] }[] {
  return PROGRAM_CATEGORIES.map(category => ({
    category,
    tracks: PROGRAM_TRACKS.filter(t => t.category === category)
  })).filter(g => g.tracks.length > 0);
}

/** Suggested levels for a track. */
export function levelsForTrack(id: IndianBoard): string[] {
  return getProgramTrack(id)?.levels || [];
}

/** Suggested subjects for a track. */
export function subjectsForTrack(id: IndianBoard): string[] {
  return getProgramTrack(id)?.subjects || [];
}

/** Every distinct level across all tracks, in a sensible order. */
export function allLevels(): string[] {
  const seen: string[] = [];
  for (const t of PROGRAM_TRACKS) {
    for (const lvl of t.levels) {
      if (!seen.includes(lvl)) seen.push(lvl);
    }
  }
  return seen;
}

/** Every distinct subject across all tracks. */
export function allSubjects(): string[] {
  const seen: string[] = [];
  for (const t of PROGRAM_TRACKS) {
    for (const s of t.subjects) {
      if (!seen.includes(s)) seen.push(s);
    }
  }
  return seen;
}

/** Level options for a picker: the track's own levels, else every known level. */
export function levelOptionsFor(id: IndianBoard): string[] {
  const own = levelsForTrack(id);
  return own.length > 0 ? own : allLevels();
}
