import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, Circle, CircleDashed, BookOpen, AlertCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ConsoleCard } from '../ui';
import { Batch, SyllabusStatus } from '../../types';
import {
  advanceStatus,
  coveragePct,
  countByStatus,
  sortTopicsBySequence,
  topicsForBatch,
  SYLLABUS_STATUS_LABEL
} from '../../lib/syllabus';

interface SyllabusTrackerProps {
  /** The batches this teacher actually teaches (from selectTeacherBatches). */
  batches: Batch[];
  /** Teacher *record* id — stamped onto the topic when ticked. */
  teacherId?: string;
}

const STATUS_ICON: Record<SyllabusStatus, React.ReactNode> = {
  not_started: <CircleDashed className="w-5 h-5 text-[#9AA0A6]" />,
  in_progress: <Circle className="w-5 h-5 text-[#FFA000]" />,
  completed: <CheckCircle2 className="w-5 h-5 text-[#188038]" />
};

const STATUS_CHIP: Record<SyllabusStatus, string> = {
  not_started: 'bg-[#F1F3F4] text-[#5F6368] dark:bg-[#3C4043] dark:text-[#9AA0A6]',
  in_progress: 'bg-[#FFF4E5] text-[#B26A00] dark:bg-[#4A3A12] dark:text-[#FFC46B]',
  completed: 'bg-[#E6F4EA] text-[#137333] dark:bg-[#1E3A24] dark:text-[#81C995]'
};

/**
 * F7 — the faculty view: pick a batch, see its ordered chapter checklist, and
 * one-tap cycle each chapter through Not started → In progress → Completed.
 */
export const SyllabusTracker: React.FC<SyllabusTrackerProps> = ({ batches, teacherId }) => {
  const { syllabusTopics, updateTopicStatus } = useApp();
  const [selectedBatchId, setSelectedBatchId] = useState(batches[0]?.id || '');

  const activeBatch = batches.find(b => b.id === selectedBatchId) || batches[0];
  const batchTopics = useMemo(
    () => (activeBatch ? sortTopicsBySequence(topicsForBatch(syllabusTopics, activeBatch.id)) : []),
    [syllabusTopics, activeBatch]
  );

  const pct = coveragePct(batchTopics);
  const counts = countByStatus(batchTopics);

  const cycle = (topicId: string, current: SyllabusStatus) => {
    const next = advanceStatus(current);
    updateTopicStatus(topicId, next, { coveredByTeacherId: teacherId });
  };

  if (batches.length === 0) {
    return (
      <ConsoleCard>
        <div className="py-12 text-center text-sm text-[#5F6368] dark:text-[#9AA0A6]">
          <BookOpen className="w-8 h-8 mx-auto mb-3 opacity-40" />
          You don't have any batches assigned yet. Ask your admin to assign a batch to see its syllabus.
        </div>
      </ConsoleCard>
    );
  }

  return (
    <div className="space-y-4">
      {/* Batch selector */}
      <div className="flex items-center gap-2 flex-wrap">
        {batches.map(b => {
          const bp = coveragePct(topicsForBatch(syllabusTopics, b.id));
          const active = b.id === activeBatch?.id;
          return (
            <button
              key={b.id}
              onClick={() => setSelectedBatchId(b.id)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold transition border active:scale-95 ${
                active
                  ? 'bg-[#1D1D1F] text-white border-transparent dark:bg-white dark:text-[#1D1D1F]'
                  : 'bg-white text-[#3C4043] border-black/[0.08] hover:border-black/20 dark:bg-[#282A2C] dark:text-[#E8EAED] dark:border-white/[0.08]'
              }`}
            >
              {b.name}
              <span className={`ml-2 text-[10px] ${active ? 'opacity-80' : 'text-[#9AA0A6]'}`}>{bp}%</span>
            </button>
          );
        })}
      </div>

      <ConsoleCard>
        {/* Coverage header */}
        <div className="flex items-center justify-between gap-4 flex-wrap pb-4 border-b border-black/[0.06] dark:border-white/[0.08]">
          <div>
            <p className="text-sm font-bold text-[#1D1D1F] dark:text-[#F5F5F7]">{activeBatch?.subject}</p>
            <p className="text-xs text-[#86868B]">
              {activeBatch?.classGrade} · {activeBatch?.name}
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="text-[#137333] font-semibold">{counts.completed} done</span>
            <span className="text-[#B26A00] font-semibold">{counts.in_progress} in progress</span>
            <span className="text-[#9AA0A6] font-semibold">{counts.not_started} left</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="pt-4">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-semibold text-[#5F6368] dark:text-[#9AA0A6]">Syllabus coverage</span>
            <span className="font-bold text-[#1D1D1F] dark:text-[#F5F5F7]">{pct}%</span>
          </div>
          <div className="h-2.5 rounded-full bg-[#F1F3F4] dark:bg-[#3C4043] overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-[#FFA000] to-[#188038]"
              initial={false}
              animate={{ width: `${pct}%` }}
              transition={{ type: 'spring', stiffness: 120, damping: 20 }}
            />
          </div>
        </div>

        {batchTopics.length === 0 ? (
          <div className="py-12 text-center text-sm text-[#5F6368] dark:text-[#9AA0A6]">
            <AlertCircle className="w-7 h-7 mx-auto mb-3 opacity-40" />
            No syllabus has been set for this batch yet. Your admin can generate it from the board template.
          </div>
        ) : (
          <ul className="pt-5 space-y-1.5">
            {batchTopics.map((topic, idx) => (
              <li key={topic.id}>
                <button
                  onClick={() => cycle(topic.id, topic.status)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition hover:bg-black/[0.03] dark:hover:bg-white/[0.04] active:scale-[0.995]"
                >
                  <span className="text-[11px] font-bold text-[#9AA0A6] w-6 flex-shrink-0">
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <motion.span key={topic.status} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                    {STATUS_ICON[topic.status]}
                  </motion.span>
                  <span className="flex-1 min-w-0">
                    <span
                      className={`block text-sm font-semibold truncate ${
                        topic.status === 'completed'
                          ? 'text-[#5F6368] line-through dark:text-[#9AA0A6]'
                          : 'text-[#1D1D1F] dark:text-[#F5F5F7]'
                      }`}
                    >
                      {topic.title}
                    </span>
                    <span className="text-[11px] text-[#9AA0A6]">
                      {topic.chapter}
                      {topic.coveredDate ? ` · ${topic.status === 'completed' ? 'completed' : 'updated'} ${topic.coveredDate}` : ''}
                    </span>
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-1 rounded-full flex-shrink-0 ${STATUS_CHIP[topic.status]}`}
                  >
                    {SYLLABUS_STATUS_LABEL[topic.status]}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {batchTopics.length > 0 && (
          <p className="pt-4 text-[11px] text-[#9AA0A6] text-center">
            Tap any chapter to cycle its status. Changes save to the cloud instantly.
          </p>
        )}
      </ConsoleCard>
    </div>
  );
};