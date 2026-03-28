import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange?: (limit: number) => void;
}

export function Pagination({
  currentPage,
  totalPages,
  totalCount,
  limit,
  onPageChange,
  onLimitChange
}: PaginationProps) {
  if (totalPages <= 0) return null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 bg-white border-t border-slate-200 gap-4 text-sm">
      <div className="text-slate-500 whitespace-nowrap">
        {totalCount > 0 ? (
          <>
            Showing <span className="font-semibold text-slate-900">{((currentPage - 1) * limit) + 1}</span> to{' '}
            <span className="font-semibold text-slate-900">{Math.min(currentPage * limit, totalCount)}</span> of{' '}
            <span className="font-semibold text-slate-900">{totalCount}</span> row(s)
          </>
        ) : (
          "No rows found"
        )}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-4 lg:gap-8">
        {onLimitChange && (
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-slate-600 whitespace-nowrap">Rows per page</p>
            <select
              value={limit}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              className="h-8 w-[70px] rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer"
            >
              {[10, 20, 50, 100].map((pageSize) => (
                <option key={pageSize} value={pageSize}>
                  {pageSize}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex w-[100px] items-center justify-center text-sm font-medium text-slate-600 whitespace-nowrap italic">
          Page {currentPage} of {totalPages}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition-all hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white active:scale-95"
            title="First page"
          >
            <ChevronsLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition-all hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white active:scale-95"
            title="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition-all hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white active:scale-95"
            title="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition-all hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white active:scale-95"
            title="Last page"
          >
            <ChevronsRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
