import { ChevronLeft, ChevronRight } from 'lucide-react';

const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
  className = '',
}) => {
  if (totalPages <= 1) return null;

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      let start = Math.max(1, currentPage - 2);
      let end = Math.min(totalPages, start + maxVisible - 1);

      if (end - start < maxVisible - 1) {
        start = Math.max(1, end - maxVisible + 1);
      }

      if (start > 1) {
        pages.push(1);
        if (start > 2) pages.push('...');
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (end < totalPages) {
        if (end < totalPages - 1) pages.push('...');
        pages.push(totalPages);
      }
    }

    return pages;
  };

  return (
    <div className={`flex items-center justify-center gap-2 ${className}`}>
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="p-2.5 rounded-xl text-surface-600 dark:text-surface-400
          hover:bg-white dark:hover:bg-surface-800
          hover:text-surface-900 dark:hover:text-surface-100
          hover:shadow-sm
          border border-transparent hover:border-surface-200 dark:hover:border-surface-700
          disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:shadow-none
          transition-all duration-200"
        aria-label="Previous page"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      <div className="flex items-center gap-1">
        {getPageNumbers().map((page, index) => (
          page === '...' ? (
            <span
              key={`ellipsis-${index}`}
              className="px-2 text-surface-400 dark:text-surface-500 select-none"
            >
              •••
            </span>
          ) : (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`
                min-w-[40px] h-10 px-3 rounded-xl
                text-sm font-semibold
                transition-all duration-200
                active:scale-95
                ${
                  currentPage === page
                    ? 'bg-gradient-primary text-white shadow-[0_4px_14px_rgba(99,102,241,0.35),inset_0_1px_0_rgba(255,255,255,0.15)]'
                    : 'text-surface-600 dark:text-surface-400 hover:bg-white dark:hover:bg-surface-800 hover:text-surface-900 dark:hover:text-surface-100 hover:shadow-sm border border-transparent hover:border-surface-200 dark:hover:border-surface-700'
                }
              `}
            >
              {page}
            </button>
          )
        ))}
      </div>

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="p-2.5 rounded-xl text-surface-600 dark:text-surface-400
          hover:bg-white dark:hover:bg-surface-800
          hover:text-surface-900 dark:hover:text-surface-100
          hover:shadow-sm
          border border-transparent hover:border-surface-200 dark:hover:border-surface-700
          disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:shadow-none
          transition-all duration-200"
        aria-label="Next page"
      >
        <ChevronRight className="w-4 h-4" />
      </button>

      <span className="ml-3 text-xs font-medium text-surface-500 dark:text-surface-500 hidden sm:inline">
        Page <span className="text-surface-900 dark:text-surface-100 font-bold">{currentPage}</span> of {totalPages}
      </span>
    </div>
  );
};

export default Pagination;
