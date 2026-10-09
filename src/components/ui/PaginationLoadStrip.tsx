import React from 'react';
import { ChevronsDown } from 'lucide-react';

export interface PaginationLoadStripProps {
  /** How many records are currently buffered (drives the count text). */
  loadedCount: number;
  hasMore: boolean;
  /** What the records are called, e.g. "students", "audit entries". */
  noun: string;
  onLoadMore: () => void;
  /**
   * - `bar` — full-width strip (own top border) for list-ended surfaces like
   *   the attendance register or the audit trail.
   * - `inline` — compact control fitting inside a DataTable footer bar.
   */
  variant?: 'bar' | 'inline';
}

/**
 * G1 — "Load more records" affordance for the cursor-paginated realtime
 * collections. Mirrors the users strip (UserRoleDistributionCard): a count
 * on the left, a fetch-next-page button when the cursor says more exists.
 */
export const PaginationLoadStrip: React.FC<PaginationLoadStripProps> = ({
  loadedCount,
  hasMore,
  noun,
  onLoadMore,
  variant = 'bar'
}) => {
  if (variant === 'inline') {
    return (
      <div className="flex items-center space-x-2 flex-shrink-0">
        {hasMore && (
          <button
            type="button"
            onClick={() => { void onLoadMore(); }}
            className="text-[11px] font-bold px-3 py-1.5 rounded-lg border border-[#DADCE0] dark:border-[#3C4043] hover:bg-[#F1F3F4] dark:hover:bg-[#282A2C] text-[#1A73E8] dark:text-[#8AB4F8] cursor-pointer transition flex items-center space-x-1"
            title="Fetch the next page"
          >
            <ChevronsDown className="w-3.5 h-3.5" />
            <span>Load more {noun}</span>
          </button>
        )}
        <span className="text-[10px] text-[#5F6368] dark:text-[#9AA0A6] whitespace-nowrap">
          {hasMore ? `${loadedCount} loaded · more available` : `${loadedCount} loaded`}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between px-3 py-2.5 border-t border-[#DADCE0] dark:border-[#3C4043]">
      <span className="text-[10px] text-[#5F6368] dark:text-[#9AA0A6]">
        {hasMore
          ? `Loaded ${loadedCount} ${noun} — more available`
          : `${loadedCount} ${noun} loaded`}
      </span>
      {hasMore && (
        <button
          type="button"
          onClick={() => { void onLoadMore(); }}
          className="text-[11px] font-bold px-3 py-1.5 rounded-lg border border-[#DADCE0] dark:border-[#3C4043] hover:bg-[#F1F3F4] dark:hover:bg-[#282A2C] text-[#1A73E8] dark:text-[#8AB4F8] cursor-pointer transition flex items-center space-x-1"
          title="Fetch the next page"
        >
          <ChevronsDown className="w-3.5 h-3.5" />
          <span>Load more {noun}</span>
        </button>
      )}
    </div>
  );
};