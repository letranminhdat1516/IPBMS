import React from 'react';

import { Button } from '@/components/ui/button';

import { cn } from '@/lib/utils';

interface PaginationBarProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export const PaginationBar: React.FC<PaginationBarProps> = ({
  page,
  pageSize,
  total,
  onPageChange,
  className,
}) => {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;

  const handlePrev = () => {
    if (page > 1) onPageChange(page - 1);
  };
  const handleNext = () => {
    if (page < totalPages) onPageChange(page + 1);
  };

  // Hiển thị tối đa 5 nút số trang, dạng ... nếu nhiều trang
  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (page <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (page >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', page - 1, page, page + 1, '...', totalPages);
      }
    }
    return pages;
  };

  return (
    <div className={cn('flex items-center justify-center gap-2 py-4', className)}>
      <Button
        variant='outline'
        size='sm'
        onClick={handlePrev}
        disabled={page === 1}
        aria-label='Trang trước'
      >
        &lt;
      </Button>
      {getPageNumbers().map((p, idx) =>
        typeof p === 'number' ? (
          <Button
            key={idx}
            variant={p === page ? 'default' : 'outline'}
            size='sm'
            onClick={() => onPageChange(p)}
            aria-current={p === page ? 'page' : undefined}
            className={cn(p === page && 'font-bold')}
          >
            {p}
          </Button>
        ) : (
          <span key={idx} className='text-muted-foreground px-2 select-none'>
            ...
          </span>
        )
      )}
      <Button
        variant='outline'
        size='sm'
        onClick={handleNext}
        disabled={page === totalPages}
        aria-label='Trang sau'
      >
        &gt;
      </Button>
    </div>
  );
};
