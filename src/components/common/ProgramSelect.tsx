/**
 * Program & level pickers shared by every form that asks "what does this
 * institute/student/batch study?". Options come from the program catalog in
 * `lib/programs.ts`, grouped by category (School / Competitive / Government /
 * Skills), and both pickers offer an "Other / Custom…" escape hatch so no
 * centre is ever blocked by a track that isn't pre-listed.
 */

import { useState } from 'react';
import { IndianBoard } from '../../types';
import { levelOptionsFor, tracksByCategory } from '../../lib/programs';

const CUSTOM = '__custom__';

interface TrackSelectProps {
  value: IndianBoard;
  onChange: (value: IndianBoard) => void;
  className?: string;
}

/** Grouped programme / exam-track `<select>` with a custom-entry fallback. */
export function ProgramTrackSelect({ value, onChange, className }: TrackSelectProps) {
  const groups = tracksByCategory();
  const isKnown = groups.some(g => g.tracks.some(t => t.id === value));
  const [customMode, setCustomMode] = useState(!isKnown);

  return (
    <>
      <select
        value={customMode ? CUSTOM : value}
        onChange={e => {
          if (e.target.value === CUSTOM) {
            setCustomMode(true);
          } else {
            setCustomMode(false);
            onChange(e.target.value as IndianBoard);
          }
        }}
        className={className}
      >
        {groups.map(group => (
          <optgroup key={group.category} label={group.category}>
            {group.tracks.map(track => (
              <option key={track.id} value={track.id}>{track.label}</option>
            ))}
          </optgroup>
        ))}
        <option value={CUSTOM}>Other / Custom…</option>
      </select>
      {customMode && (
        <input
          type="text"
          defaultValue={isKnown ? '' : value}
          onChange={e => onChange(e.target.value as IndianBoard)}
          placeholder="Type your programme (e.g. State PSC – Mains)"
          className={`${className || ''} mt-2`}
        />
      )}
    </>
  );
}

interface LevelSelectProps {
  value: string;
  onChange: (value: string) => void;
  /** The selected track, so the level list is relevant. */
  track: IndianBoard;
  className?: string;
  placeholder?: string;
}

/** Level / exam `<select>` derived from the chosen track, with custom fallback. */
export function ProgramLevelSelect({ value, onChange, track, className, placeholder }: LevelSelectProps) {
  const base = levelOptionsFor(track);
  const options = value && !base.includes(value) ? [value, ...base] : base;
  const [customMode, setCustomMode] = useState(false);

  return (
    <>
      <select
        value={customMode ? CUSTOM : value}
        onChange={e => {
          if (e.target.value === CUSTOM) {
            setCustomMode(true);
          } else {
            setCustomMode(false);
            onChange(e.target.value);
          }
        }}
        className={className}
      >
        <option value="">{placeholder || 'Select level'}</option>
        {options.map(level => (
          <option key={level} value={level}>{level}</option>
        ))}
        <option value={CUSTOM}>Other / Custom…</option>
      </select>
      {customMode && (
        <input
          type="text"
          defaultValue=""
          onChange={e => onChange(e.target.value)}
          placeholder="Type the class / exam level"
          className={`${className || ''} mt-2`}
        />
      )}
    </>
  );
}
