import React, { useState } from 'react';
import { Search, ChevronLeft, ChevronRight, ArrowUpDown, Filter, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';
import { ConsoleButton } from './ConsoleButton';
import { fadeIn, staggerContainerFast } from '../../lib/motion';
import { EmptyStateIllustration } from './VidyaIllustrations';

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T, index: number) => React.ReactNode;
  width?: string;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  searchPlaceholder?: string;
  onSearchChange?: (query: string) => void;
  toolbarActions?: React.ReactNode;
  filterComponent?: React.ReactNode;
  pageSize?: number;
  emptyState?: {
    title: string;
    description: string;
    icon?: React.ReactNode;
    illustration?: React.ReactNode;
    action?: React.ReactNode;
  };
  onRowClick?: (row: T) => void;
  className?: string;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  searchPlaceholder = 'Search records...',
  onSearchChange,
  toolbarActions,
  filterComponent,
  pageSize = 10,
  emptyState,
  onRowClick,
  className = ''
}: DataTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setSearchQuery(q);
    setCurrentPage(1);
    if (onSearchChange) onSearchChange(q);
  };

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  // Pagination calculation
  const totalItems = data.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const currentRows = data.slice(startIndex, endIndex);

  return (
    <div className={`bg-white dark:bg-[#1C1C1E] border border-black/[0.08] dark:border-white/[0.08] rounded-2xl overflow-hidden transition-colors shadow-[0_2px_12px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.4)] ${className}`}>
      {/* Table Toolbar */}
      <div className="p-3 sm:p-4 border-b border-black/[0.06] dark:border-white/[0.08] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white/80 dark:bg-[#1C1C1E]/80 backdrop-blur-md">
        <div className="flex items-center space-x-2 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-[#86868B] absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearch}
              placeholder={searchPlaceholder}
              className="w-full pl-9 pr-3 py-2 text-xs text-[#1D1D1F] dark:text-[#F5F5F7] bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.08] focus:border-[#FFA000] focus:bg-white dark:focus:bg-[#2C2C2E] focus:ring-2 focus:ring-[#FFA000]/20 rounded-xl transition-all focus:outline-none font-apple-text placeholder-[#86868B]"
            />
          </div>
          {filterComponent}
        </div>

        {toolbarActions && (
          <div className="flex items-center space-x-2 self-end sm:self-auto flex-shrink-0">
            {toolbarActions}
          </div>
        )}
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-black/[0.02] dark:bg-white/[0.03] border-b border-black/[0.08] dark:border-white/[0.08] text-[#86868B] uppercase font-apple-text text-[11px] font-bold tracking-wider select-none">
              {columns.map(col => (
                <th
                  key={col.key}
                  style={{ width: col.width }}
                  className={`py-3.5 px-4 ${
                    col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                  } ${col.sortable ? 'cursor-pointer hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7]' : ''}`}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  <div className={`flex items-center space-x-1 ${col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : 'justify-start'}`}>
                    <span>{col.header}</span>
                    {col.sortable && (
                      <ArrowUpDown className="w-3 h-3 text-slate-400 group-hover:text-slate-600" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <motion.tbody
            key={`rows-${currentPage}-${sortKey ?? 'none'}-${sortOrder}-${searchQuery}`}
            className="divide-y divide-black/[0.06] dark:divide-white/[0.08]"
            initial="hidden"
            animate="visible"
            variants={staggerContainerFast}
          >
            {currentRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-12 text-center text-[#86868B]">
                  {emptyState ? (
                    <div className="max-w-xs mx-auto space-y-2">
                      {emptyState.illustration ? (
                        <div className="flex justify-center pb-1">{emptyState.illustration}</div>
                      ) : emptyState.icon ? (
                        <div className="w-10 h-10 rounded-2xl bg-black/[0.04] dark:bg-white/[0.06] mx-auto flex items-center justify-center text-[#86868B]">
                          {emptyState.icon}
                        </div>
                      ) : (
                        <div className="flex justify-center pb-1">
                          <EmptyStateIllustration variant="generic" size={124} />
                        </div>
                      )}
                      <h4 className="font-bold text-sm text-[#1D1D1F] dark:text-[#F5F5F7] font-apple-text">
                        {emptyState.title}
                      </h4>
                      <p className="text-xs text-[#86868B] font-apple-text">
                        {emptyState.description}
                      </p>
                      {emptyState.action && <div className="pt-2">{emptyState.action}</div>}
                    </div>
                  ) : (
                    <div className="max-w-xs mx-auto space-y-2 py-2">
                      <div className="flex justify-center pb-1">
                        <EmptyStateIllustration variant="generic" size={128} />
                      </div>
                      <h4 className="font-bold text-sm text-[#1D1D1F] dark:text-[#F5F5F7] font-apple-text">
                        No records found
                      </h4>
                      <p className="text-xs text-[#86868B] font-apple-text">
                        Nothing matches the current view yet. New entries will appear here.
                      </p>
                    </div>
                  )}
                </td>
              </tr>
            ) : (
              currentRows.map((row, idx) => {
                const rowKey = keyExtractor(row);
                return (
                  <motion.tr
                    key={rowKey}
                    variants={fadeIn}
                    onClick={() => onRowClick && onRowClick(row)}
                    className={`transition-colors duration-100 ${
                      onRowClick ? 'cursor-pointer' : ''
                    } hover:bg-[var(--fb-primary-subtle)] dark:hover:bg-white/[0.04] text-[#1D1D1F] dark:text-[#F5F5F7] font-apple-text`}
                  >
                    {columns.map(col => {
                      const val = (row as any)[col.key];
                      return (
                        <td
                          key={col.key}
                          className={`py-3.5 px-4 ${
                            col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                          }`}
                        >
                          {col.render ? col.render(row, idx) : val !== undefined ? String(val) : '—'}
                        </td>
                      );
                    })}
                  </motion.tr>
                );
              })
            )}
          </motion.tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="px-4 py-3 border-t border-black/[0.06] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.02] flex items-center justify-between text-xs text-[#86868B] font-apple-text tabular-nums">
        <div>
          {totalItems > 0 ? (
            <span>
              Showing <strong className="text-[#1D1D1F] dark:text-[#F5F5F7]">{startIndex + 1}</strong> to{' '}
              <strong className="text-[#1D1D1F] dark:text-[#F5F5F7]">{endIndex}</strong> of{' '}
              <strong className="text-[#1D1D1F] dark:text-[#F5F5F7]">{totalItems}</strong> records
            </span>
          ) : (
            <span>0 records</span>
          )}
        </div>

        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
            disabled={currentPage <= 1}
            className="p-1.5 rounded-xl border border-black/[0.08] dark:border-white/[0.1] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
            title="Previous Page"
            aria-label="Previous Page"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="px-2 font-semibold">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
            disabled={currentPage >= totalPages}
            className="p-1.5 rounded-xl border border-black/[0.08] dark:border-white/[0.1] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
            title="Next Page"
            aria-label="Next Page"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
