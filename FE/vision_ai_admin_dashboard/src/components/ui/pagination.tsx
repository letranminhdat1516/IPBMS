import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DoubleArrowLeftIcon,
  DoubleArrowRightIcon,
} from '@radix-ui/react-icons';

import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface PaginationProps {
  page: number; // 1-indexed
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  pageSizeOptions?: number[];
  className?: string;
}

export function Pagination({
  page,
  total,
  limit,
  onPageChange,
  onLimitChange,
  pageSizeOptions = [5, 10, 20, 50],
  className,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / Math.max(1, limit)));

  const start = total === 0 ? 0 : (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <div className={cn('flex items-center justify-between px-2', className)}>
      <div className='text-muted-foreground text-sm'>
        Hiển thị {start} - {end} / {total} kết
      </div>

      <div className='flex items-center gap-4'>
        <div className='flex items-center space-x-2'>
          <p className='hidden text-sm font-medium sm:block'>Số dòng mỗi trang</p>
          <Select
            value={`${limit}`}
            onValueChange={(v) => onLimitChange?.(Number(v))}
          >
            <SelectTrigger className='h-8 w-[70px]'>
              <SelectValue placeholder={String(limit)} />
            </SelectTrigger>
            <SelectContent side='top'>
              {pageSizeOptions.map((ps) => (
                <SelectItem key={ps} value={`${ps}`}>
                  {ps}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className='flex items-center space-x-2'>
          <Button
            variant='outline'
            className='hidden h-8 w-8 p-0 lg:flex'
            onClick={() => onPageChange(1)}
            disabled={!canPrev}
          >
            <span className='sr-only'>Đến trang đầu</span>
            <DoubleArrowLeftIcon className='h-4 w-4' />
          </Button>
          <Button
            variant='outline'
            className='h-8 w-8 p-0'
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={!canPrev}
          >
            <span className='sr-only'>Trang trước</span>
            <ChevronLeftIcon className='h-4 w-4' />
          </Button>

          <div className='flex w-[120px] items-center justify-center text-sm font-medium'>
            Trang {page} / {totalPages}
          </div>

          <Button
            variant='outline'
            className='h-8 w-8 p-0'
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={!canNext}
          >
            <span className='sr-only'>Trang tiếp</span>
            <ChevronRightIcon className='h-4 w-4' />
          </Button>
          <Button
            variant='outline'
            className='hidden h-8 w-8 p-0 lg:flex'
            onClick={() => onPageChange(totalPages)}
            disabled={!canNext}
          >
            <span className='sr-only'>Đến trang cuối</span>
            <DoubleArrowRightIcon className='h-4 w-4' />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default Pagination;
