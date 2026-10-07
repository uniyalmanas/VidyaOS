import { Batch, Teacher } from '../types';

/**
 * Returns the batches a signed-in faculty account may see and act on.
 *
 * The two sides of this join live under different keys: `Batch.teacherId` holds
 * a `Teacher.id` (the admin's batch form writes `teachers[].id`), whereas
 * `currentUser.id` is the Firebase Auth UID. `Teacher.userId` is the bridge, so
 * the Teacher record is resolved first and only then matched against
 * `teacherId`. `assignedBatchIds` is unioned in as well because older records
 * only ever populated that field.
 *
 * Fails closed by design: an account with no matching Teacher record returns an
 * empty list rather than falling back to every batch in the institute. A wrong
 * or missing link should show a faculty member nothing, never somebody else's
 * attendance roster.
 */
export function selectTeacherBatches(batches: Batch[], teachers: Teacher[], userId: string): Batch[] {
  if (!userId) return [];

  const teacher =
    teachers.find(t => t.userId === userId) ||
    teachers.find(t => t.id === userId);
  if (!teacher) return [];

  const claimed = new Set(teacher.assignedBatchIds || []);
  return batches.filter(b => b.teacherId === teacher.id || claimed.has(b.id));
}

/**
 * Keeps only the items that belong to one of `batchIds`. Used for batch-scoped
 * child collections (tests, coursework) so a teacher never sees — or writes to —
 * another batch's records.
 */
export function filterToBatches<T extends { batchId: string }>(items: T[], batchIds: Set<string>): T[] {
  if (batchIds.size === 0) return [];
  return items.filter(item => batchIds.has(item.batchId));
}
