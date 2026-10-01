import React, { useState } from 'react';
import { Search, ChevronLeft, ChevronRight, ArrowUpDown, Filter, RefreshCw } from 'lucide-react';
import { ConsoleButton } from './ConsoleButton';

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
    <div className={`bg-white dark:bg-[#1E1F20] border border-[#DADCE0] dark:border-[#3C4043] rounded-xl overflow-hidden transition-colors ${className}`}>
      {/* Table Toolbar */}
      <div className="p-3 sm:p-4 border-b border-[#DADCE0] dark:border-[#3C4043] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-[#1E1F20]">
        <div className="flex items-center space-x-2 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-[#5F6368] dark:text-[#9AA0A6] absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearch}
              placeholder={searchPlaceholder}
              className="w-full pl-9 pr-3 py-1.5 text-xs text-[#202124] dark:text-[#E8EAED] bg-[#F1F3F4] dark:bg-[#282A2C] border border-transparent hover:border-[#DADCE0] focus:border-[#FFA000] focus:bg-white dark:focus:bg-[#1E1F20] focus:ring-2 focus:ring-[#FFA000]/20 rounded-lg transition-all focus:outline-none"
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
            <tr className="bg-[#F8F9FA] dark:bg-[#282A2C] border-b border-[#DADCE0] dark:border-[#3C4043] text-[#5F6368] dark:text-[#9AA0A6] uppercase font-google-sans text-[11px] font-bold tracking-wider select-none">
              {columns.map(col => (
                <th
                  key={col.key}
                  style={{ width: col.width }}
                  className={`py-3 px-4 ${
                    col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                  } ${col.sortable ? 'cursor-pointer hover:text-[#202124] dark:hover:text-white' : ''}`}
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
          <tbody className="divide-y divide-[#DADCE0] dark:divide-[#3C4043]">
            {currentRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-12 text-center text-slate-500">
                  {emptyState ? (
                    <div className="max-w-xs mx-auto space-y-2">
                      {emptyState.icon && (
                        <div className="w-10 h-10 rounded-full bg-[#F1F3F4] dark:bg-[#282A2C] mx-auto flex items-center justify-center text-[#5F6368] dark:text-[#9AA0A6]">
                          {emptyState.icon}
                        </div>
                      )}
                      <h4 className="font-bold text-sm text-[#202124] dark:text-[#E8EAED]">
                        {emptyState.title}
                      </h4>
                      <p className="text-xs text-[#5F6368] dark:text-[#9AA0A6]">
                        {emptyState.description}
                      </p>
                      {emptyState.action && <div className="pt-2">{emptyState.action}</div>}
                    </div>
                  ) : (
                    <span>No records found.</span>
                  )}
                </td>
              </tr>
            ) : (
              currentRows.map((row, idx) => {
                const rowKey = keyExtractor(row);
                return (
                  <tr
                    key={rowKey}
                    onClick={() => onRowClick && onRowClick(row)}
                    className={`transition-colors duration-100 ${
                      onRowClick ? 'cursor-pointer' : ''
                    } hover:bg-[#F8F9FA] dark:hover:bg-[#282A2C]/60 text-[#202124] dark:text-[#E8EAED]`}
                  >
                    {columns.map(col => {
                      const val = (row as any)[col.key];
                      return (
                        <td
                          key={col.key}
                          className={`py-3 px-4 ${
                            col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                          }`}
                        >
                          {col.render ? col.render(row, idx) : val !== undefined ? String(val) : '—'}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="px-4 py-2.5 border-t border-[#DADCE0] dark:border-[#3C4043] bg-[#F8F9FA] dark:bg-[#282A2C] flex items-center justify-between text-xs text-[#5F6368] dark:text-[#9AA0A6] font-google-sans">
        <div>
          {totalItems > 0 ? (
            <span>
              Showing <strong className="text-[#202124] dark:text-white">{startIndex + 1}</strong> to{' '}
              <strong className="text-[#202124] dark:text-white">{endIndex}</strong> of{' '}
              <strong className="text-[#202124] dark:text-white">{totalItems}</strong> records
            </span>
          ) : (
            <span>0 records</span>
          )}
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
            disabled={currentPage <= 1}
            className="p-1.5 rounded-lg border border-[#DADCE0] dark:border-[#3C4043] hover:bg-white dark:hover:bg-[#1E1F20] disabled:opacity-40 disabled:cursor-not-allowed transition"
            title="Previous Page"
            aria-label="Previous Page"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="px-2 font-medium">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
            disabled={currentPage >= totalPages}
            className="p-1.5 rounded-lg border border-[#DADCE0] dark:border-[#3C4043] hover:bg-white dark:hover:bg-[#1E1F20] disabled:opacity-40 disabled:cursor-not-allowed transition"
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
