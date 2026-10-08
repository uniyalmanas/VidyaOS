import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ListChecks,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  CircleDashed
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ConsoleCard, ConsoleButton } from '../ui';
import { IndianBoard, SyllabusTopic } from '../../types';
import {
  batchCoverage,
  findSyllabusTemplate,
  sortTopicsBySequence,
  syllabusTemplatesFor,
  templateOptions,
  topicsForBatch,
  SYLLABUS_STATUS_LABEL
} from '../../lib/syllabus';

const field =
  'w-full rounded-lg border border-black/[0.12] dark:border-white/[0.15] bg-white dark:bg-[#282A2C] px-3 py-2 text-xs text-[#1D1D1F] dark:text-[#F5F5F7] outline-none focus:ring-2 focus:ring-[#1A73E8]/40';

const statusDot: Record<SyllabusTopic['status'], string> = {
  not_started: 'text-[#9AA0A6]',
  in_progress: 'text-[#B26A00]',
  completed: 'text-[#188038]'
};

/**
 * F7 — admin coverage overview. Batch × % complete, with "Generate from
 * template" seeding and per-chapter management.
 */
export const SyllabusOverview: React.FC = () => {
  const {
    syllabusTopics,
    batches,
    createTopicsFromTemplate,
    deleteSyllabusTopic,
    deleteTopicsForBatch,
    showToast
  } = useApp();

  const options = useMemo(() => templateOptions(), []);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [genOpen, setGenOpen] = useState(false);
  const [genBatchId, setGenBatchId] = useState('');
  const [genBoard, setGenBoard] = useState<string>('CBSE');
  const [genClass, setGenClass] = useState('');
  const [genSubject, setGenSubject] = useState('');
  const [genError, setGenError] = useState<string | null>(null);

  const rows = useMemo(() => batchCoverage(syllabusTopics, batches), [syllabusTopics, batches]);
  const batchName = (id: string) => batches.find(b => b.id === id)?.name || 'Batch';

  const genTemplates = useMemo(
    () => syllabusTemplatesFor(genBoard as IndianBoard, genClass || undefined),
    [genBoard, genClass]
  );
  const genPreview = useMemo(() => {
    if (!genBatchId || !genClass || !genSubject) return null;
    return findSyllabusTemplate(genBoard as IndianBoard, genClass, genSubject) || null;
  }, [genBatchId, genBoard, genClass, genSubject]);

  const openGenerate = (batchId?: string) => {
    const batch = batches.find(b => b.id === batchId) || batches[0];
    const board = options.boards[0] || 'CBSE';
    const classes = Array.from(new Set(syllabusTemplatesFor(board as IndianBoard).map(t => t.classGrade)));
    const cls = batch?.classGrade && classes.includes(batch.classGrade) ? batch.classGrade : classes[0] || '';
    const subjects = syllabusTemplatesFor(board as IndianBoard, cls).map(t => t.subject);
    const subj = batch?.subject && subjects.includes(batch.subject) ? batch.subject : subjects[0] || '';
    setGenBatchId(batch?.id || '');
    setGenBoard(board);
    setGenClass(cls);
    setGenSubject(subj);
    setGenError(null);
    setGenOpen(true);
  };

  const onBoardChange = (board: string) => {
    const classes = Array.from(new Set(syllabusTemplatesFor(board as IndianBoard).map(t => t.classGrade)));
    const cls = classes[0] || '';
    const subjects = syllabusTemplatesFor(board as IndianBoard, cls).map(t => t.subject);
    setGenBoard(board);
    setGenClass(cls);
    setGenSubject(subjects[0] || '');
  };

  const onClassChange = (cls: string) => {
    const subjects = syllabusTemplatesFor(genBoard as IndianBoard, cls).map(t => t.subject);
    setGenClass(cls);
    setGenSubject(subjects[0] || '');
  };

  const submitGenerate = () => {
    if (!genBatchId) {
      setGenError('Pick a batch first.');
      return;
    }
    if (!genPreview) {
      setGenError('No built-in template matches that board / class / subject yet.');
      return;
    }
    // Regenerating replaces the batch's existing checklist so chapters are
    // never duplicated (ids are fresh, so Firestore sees a clean set of writes).
    const replacing = topicsForBatch(syllabusTopics, genBatchId).length > 0;
    if (replacing) deleteTopicsForBatch(genBatchId);

    const created = createTopicsFromTemplate({
      batchId: genBatchId,
      board: genBoard,
      classGrade: genClass,
      subject: genSubject,
      chapters: genPreview.chapters
    });
    if (created.length === 0) {
      setGenError('Could not create chapters for this batch.');
      return;
    }
    showToast(
      replacing
        ? `Syllabus regenerated: ${created.length} chapters in ${batchName(genBatchId)}.`
        : `${created.length} chapters added to ${batchName(genBatchId)}.`,
      'success'
    );
    setGenOpen(false);
  };

  const clearBatch = (batchId: string) => {
    deleteTopicsForBatch(batchId);
    showToast(`Syllabus cleared for ${batchName(batchId)}.`, 'success');
  };

  return (
    <div className="space-y-4">
      <ConsoleCard
        title="Syllabus coverage by batch"
        subtitle={`${syllabusTopics.length} chapter(s) tracked across ${batches.length} batches`}
        icon={<ListChecks className="w-4 h-4" />}
        action={
          <ConsoleButton variant="primary" size="sm" icon={<Sparkles className="w-3.5 h-3.5" />} onClick={() => openGenerate()}>
            Generate from template
          </ConsoleButton>
        }
      >
        {rows.length === 0 ? (
          <p className="py-10 text-center text-sm text-[#5F6368] dark:text-[#9AA0A6]">
            No batches yet. Add a batch to start tracking syllabus coverage.
          </p>
        ) : (
          <div className="space-y-2">
            {rows.map(row => {
              const expanded = expandedId === row.batchId;
              return (
                <div
                  key={row.batchId}
                  className="rounded-xl border border-black/[0.06] dark:border-white/[0.08] overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedId(expanded ? null : row.batchId)}
                    className="w-full flex items-center gap-3 p-3 text-left hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition"
                  >
                    {expanded ? (
                      <ChevronDown className="w-4 h-4 text-[#9AA0A6] flex-shrink-0" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-[#9AA0A6] flex-shrink-0" />
                    )}
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] truncate">
                        {batchName(row.batchId)}
                      </span>
                      <span className="text-[11px] text-[#9AA0A6]">
                        {row.total === 0
                          ? 'No syllabus yet'
                          : `${row.completed}/${row.total} chapters done${row.inProgress ? ` · ${row.inProgress} in progress` : ''}`}
                      </span>
                    </span>
                    <span className="w-32 hidden sm:block">
                      <span className="block h-2 rounded-full bg-[#F1F3F4] dark:bg-[#3C4043] overflow-hidden">
                        <span
                          className="block h-full rounded-full bg-gradient-to-r from-[#FFA000] to-[#188038] transition-all"
                          style={{ width: `${row.pct}%` }}
                        />
                      </span>
                    </span>
                    <span className="text-xs font-bold text-[#1D1D1F] dark:text-[#F5F5F7] w-10 text-right">
                      {row.pct}%
                    </span>
                  </button>

                  <AnimatePresence initial={false}>
                    {expandedId === row.batchId && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        className="overflow-hidden border-t border-black/[0.06] dark:border-white/[0.08]"
                      >
                        <div className="p-3 space-y-1.5">
                          {row.total === 0 ? (
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-[11px] text-[#9AA0A6]">No chapters yet.</p>
                              <ConsoleButton
                                variant="ghost"
                                size="sm"
                                icon={<Sparkles className="w-3.5 h-3.5" />}
                                onClick={() => openGenerate(row.batchId)}
                              >
                                Generate
                              </ConsoleButton>
                            </div>
                          ) : (
                            <>
                              {sortTopicsBySequence(topicsForBatch(syllabusTopics, row.batchId)).map(t => (
                                <div
                                  key={t.id}
                                  className="flex items-center gap-2 text-xs px-2 py-1.5 rounded-lg hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
                                >
                                  {t.status === 'completed' ? (
                                    <CheckCircle2 className={`w-3.5 h-3.5 flex-shrink-0 ${statusDot[t.status]}`} />
                                  ) : (
                                    <CircleDashed className={`w-3.5 h-3.5 flex-shrink-0 ${statusDot[t.status]}`} />
                                  )}
                                  <span className="text-[10px] font-bold text-[#9AA0A6] w-5">{t.sequence}</span>
                                  <span className="flex-1 min-w-0 truncate text-[#1D1D1F] dark:text-[#F5F5F7]">
                                    {t.title}
                                  </span>
                                  <span className="text-[10px] text-[#9AA0A6] hidden sm:inline">
                                    {SYLLABUS_STATUS_LABEL[t.status]}
                                  </span>
                                  <button
                                    onClick={() => deleteSyllabusTopic(t.id)}
                                    aria-label={`Delete ${t.title}`}
                                    className="p-1 rounded text-[#D93025] dark:text-[#F28B82] hover:bg-[#FCE8E6] dark:hover:bg-[#3C2020]"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              ))}
                              <div className="flex justify-end pt-1">
                                <ConsoleButton
                                  variant="ghost"
                                  size="sm"
                                  icon={<Plus className="w-3.5 h-3.5" />}
                                  onClick={() => openGenerate(row.batchId)}
                                >
                                  Regenerate template
                                </ConsoleButton>
                                <ConsoleButton
                                  variant="danger"
                                  size="sm"
                                  className="ml-2"
                                  icon={<Trash2 className="w-3.5 h-3.5" />}
                                  onClick={() => clearBatch(row.batchId)}
                                >
                                  Clear
                                </ConsoleButton>
                              </div>
                            </>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}
      </ConsoleCard>

      {/* Generate from template modal */}
      <AnimatePresence>
        {genOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setGenOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.97 }}
              transition={{ duration: 0.18 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-lg bg-white dark:bg-[#1F1F1F] border border-[#DADCE0] dark:border-[#3C4043] rounded-2xl shadow-2xl p-5 space-y-3"
            >
              <div className="flex items-center gap-2">
                <ListChecks className="w-4 h-4 text-[#1A73E8]" />
                <h3 className="text-sm font-bold text-[#202124] dark:text-[#E8EAED]">Generate syllabus from template</h3>
              </div>
              <p className="text-[11px] text-[#5F6368] dark:text-[#9AA0A6]">
                Pick a batch and a board / class / subject. Every chapter becomes a checklist row
                teachers can tick. If the batch already has a syllabus it is replaced, so chapters
                never duplicate.
              </p>

              <label className="block space-y-1">
                <span className="text-[11px] font-semibold text-[#5F6368] dark:text-[#9AA0A6]">Batch</span>
                <select value={genBatchId} onChange={e => setGenBatchId(e.target.value)} className={field}>
                  <option value="">Select batch…</option>
                  {batches.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid grid-cols-3 gap-2">
                <label className="space-y-1">
                  <span className="text-[11px] font-semibold text-[#5F6368] dark:text-[#9AA0A6]">Board</span>
                  <select value={genBoard} onChange={e => onBoardChange(e.target.value)} className={field}>
                    {options.boards.map(b => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-[11px] font-semibold text-[#5F6368] dark:text-[#9AA0A6]">Class</span>
                  <select value={genClass} onChange={e => onClassChange(e.target.value)} className={field}>
                    {Array.from(new Set(syllabusTemplatesFor(genBoard as IndianBoard).map(t => t.classGrade))).map(c => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-[11px] font-semibold text-[#5F6368] dark:text-[#9AA0A6]">Subject</span>
                  <select value={genSubject} onChange={e => setGenSubject(e.target.value)} className={field}>
                    {genTemplates.map(t => (
                      <option key={t.subject} value={t.subject}>
                        {t.subject}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {genPreview ? (
                <p className="flex items-center gap-1.5 text-[11px] text-[#188038]">
                  <Sparkles className="w-3.5 h-3.5" />
                  {genPreview.chapters.length} chapters will be added from the {genPreview.board} {genClass} template.
                </p>
              ) : (
                <p className="flex items-center gap-1.5 text-[11px] text-[#B26A00]">
                  <AlertCircle className="w-3.5 h-3.5" />
                  No built-in template for this combination yet.
                </p>
              )}

              {genError && (
                <p className="flex items-start gap-1.5 text-[11px] text-[#D93025] dark:text-[#F28B82]">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-px" />
                  {genError}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <ConsoleButton variant="ghost" size="sm" onClick={() => setGenOpen(false)}>
                  Cancel
                </ConsoleButton>
                <ConsoleButton variant="primary" size="sm" onClick={submitGenerate}>
                  Generate
                </ConsoleButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};