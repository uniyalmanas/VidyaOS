import { Batch, Student } from '../types';

export interface ReconcileResult {
  /** The student document with `batchIds` set to exactly `targetBatchIds`. */
  nextStudent: Student;
  /**
   * Every batch document whose roster actually changes. Batches whose membership
   * is unchanged are omitted so the write batch only touches what it must.
   */
  batchesToUpdate: Batch[];
}

/**
 * Computes both halves of a student's batch membership in one pass.
 *
 * `Student.batchIds` and `Batch.studentIds` are mirrors of the same fact, and
 * they drift apart the moment only one side is written. Every enrollment change
 * — the dedicated roster actions and a plain profile edit that happens to carry
 * `batchIds` — funnels through here so the pair is always committed together.
 *
 * Batch ids that do not resolve to a known batch are dropped rather than stored:
 * a dangling id would make the student appear enrolled in something no screen can
 * render.
 */
export function reconcileBatchMembership(
  student: Student,
  batches: Batch[],
  targetBatchIds: string[]
): ReconcileResult {
  const knownBatchIds = new Set(batches.map(b => b.id));
  const current = new Set(student.batchIds || []);
  const target = [...new Set(targetBatchIds)].filter(id => knownBatchIds.has(id));
  const targetSet = new Set(target);

  const nextStudent: Student = { ...student, batchIds: target };

  const batchesToUpdate = batches
    // Membership differs on either mirror — those are the only docs that change.
    .filter(b => current.has(b.id) !== targetSet.has(b.id))
    .map(b => {
      const onRoster = b.studentIds.includes(student.id);
      const shouldBeOnRoster = targetSet.has(b.id);
      if (onRoster === shouldBeOnRoster) return b;
      return shouldBeOnRoster
        ? { ...b, studentIds: [...b.studentIds, student.id] }
        : { ...b, studentIds: b.studentIds.filter(id => id !== student.id) };
    });

  return { nextStudent, batchesToUpdate };
}
