import { Table } from '@tanstack/react-table';

import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DoubleArrowLeftIcon,
  DoubleArrowRightIcon,
} from '@radix-ui/react-icons';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface DataTablePaginationProps<TData> {
  table: Table<TData>;
}

export function DataTablePagination<TData>({ table }: DataTablePaginationProps<TData>) {
  const totalRows = table.getFilteredRowModel().rows.length;
  const selectedRows = table.getFilteredSelectedRowModel().rows.length;
  const pageIndex = table.getState().pagination.pageIndex;
  const pageSize = table.getState().pagination.pageSize;
  const totalPages = table.getPageCount();

  return (
    <div className='flex flex-col gap-4 px-2 sm:flex-row sm:items-center sm:justify-between'>
      {/* Selection Info */}
      <div className='text-muted-foreground text-sm'>
        {selectedRows > 0 ? (
          <span>
            Đã chọn <span className='text-foreground font-medium'>{selectedRows}</span> trong{' '}
            <span className='text-foreground font-medium'>{totalRows}</span> hàng
          </span>
        ) : (
          <span>
            Hiển thị <span className='text-foreground font-medium'>{pageIndex * pageSize + 1}</span>{' '}
            đến{' '}
            <span className='text-foreground font-medium'>
              {Math.min((pageIndex + 1) * pageSize, totalRows)}
            </span>{' '}
            trong <span className='text-foreground font-medium'>{totalRows}</span> hàng
          </span>
        )}
      </div>

      <div className='flex items-center gap-6'>
        {/* Rows per page */}
        <div className='flex items-center gap-2'>
          <span className='text-sm font-medium'>Hàng mỗi trang</span>
          <Select
            value={`${table.getState().pagination.pageSize}`}
            onValueChange={(value) => {
              table.setPageSize(Number(value));
            }}
          >
            <SelectTrigger className='h-8 w-[70px]'>
              <SelectValue placeholder={table.getState().pagination.pageSize} />
            </SelectTrigger>
            <SelectContent side='top'>
              {[10, 20, 30, 40, 50].map((pageSize) => (
                <SelectItem key={pageSize} value={`${pageSize}`}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Page navigation */}
        <div className='flex items-center gap-2'>
          <Button
            variant='outline'
            className='h-8 w-8 p-0'
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            <span className='sr-only'>Đến trang đầu</span>
            <DoubleArrowLeftIcon className='h-4 w-4' />
          </Button>
          <Button
            variant='outline'
            className='h-8 w-8 p-0'
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <span className='sr-only'>Trang trước</span>
            <ChevronLeftIcon className='h-4 w-4' />
          </Button>

          <div className='flex items-center gap-1'>
            <span className='text-sm font-medium'>Trang</span>
            <span className='text-sm'>
              {pageIndex + 1} / {totalPages || 1}
            </span>
          </div>

          <Button
            variant='outline'
            className='h-8 w-8 p-0'
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <span className='sr-only'>Trang sau</span>
            <ChevronRightIcon className='h-4 w-4' />
          </Button>
          <Button
            variant='outline'
            className='h-8 w-8 p-0'
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
          >
            <span className='sr-only'>Đến trang cuối</span>
            <DoubleArrowRightIcon className='h-4 w-4' />
          </Button>
        </div>
      </div>
    </div>
  );
}
