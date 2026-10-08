import React, { useMemo } from 'react';
import { BookOpen, CheckCircle2, CircleDashed } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ConsoleCard } from '../ui';
import { coveragePct, countByStatus, nextTopicForBatch, topicsForBatch } from '../../lib/syllabus';

interface SyllabusProgressProps {
  /** Batches whose coverage to show (student's enrolled batches / parent's child). */
  batchIds: string[];
  /** Optional title override; defaults to a generic heading. */
  title?: string;
}

/**
 * F7 — read-only coverage bars for students and parents. Mirrors exactly what
 * the teacher ticks; there is nothing to edit here.
 */
export const SyllabusProgress: React.FC<SyllabusProgressProps> = ({ batchIds, title }) => {
  const { syllabusTopics, batches } = useApp();

  const rows = useMemo(
    () =>
      batchIds.map(id => {
        const topics = topicsForBatch(syllabusTopics, id);
        return {
          batch: batches.find(b => b.id === id),
          total: topics.length,
          pct: coveragePct(topics),
          counts: countByStatus(topics),
          next: nextTopicForBatch(syllabusTopics, id)
        };
      }),
    [batchIds, syllabusTopics, batches]
  );

  const nonEmpty = rows.filter(r => r.total > 0);

  if (nonEmpty.length === 0) {
    return (
      <ConsoleCard title={title || 'Syllabus progress'} icon={<BookOpen className="w-4 h-4" />}>
        <p className="py-8 text-center text-sm text-[#5F6368] dark:text-[#9AA0A6]">
          Your teacher hasn't published a syllabus yet. Check back soon.
        </p>
      </ConsoleCard>
    );
  }

  return (
    <ConsoleCard
      title={title || 'Syllabus progress'}
      subtitle="Chapter-by-chapter coverage, as ticked by your teachers"
      icon={<BookOpen className="w-4 h-4" />}
    >
      <div className="space-y-4">
        {nonEmpty.map(row => (
          <div key={row.batch?.id || Math.random()} className="space-y-1.5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] truncate">
                {row.batch?.name || 'Batch'}
              </span>
              <span className="text-xs font-bold text-[#1D1D1F] dark:text-[#F5F5F7]">{row.pct}%</span>
            </div>
            <div className="h-2 rounded-full bg-[#F1F3F4] dark:bg-[#3C4043] overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#FFA000] to-[#188038] transition-all"
                style={{ width: `${row.pct}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-[#86868B]">
              <span className="inline-flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-[#188038]" />
                {row.counts.completed} of {row.total} chapters done
              </span>
              {row.next && (
                <span className="inline-flex items-center gap-1 truncate max-w-[60%]">
                  <CircleDashed className="w-3 h-3 text-[#B26A00] flex-shrink-0" />
                  Up next: {row.next.title}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </ConsoleCard>
  );
};