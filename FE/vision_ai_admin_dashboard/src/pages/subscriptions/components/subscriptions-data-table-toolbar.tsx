import { Download, Plus, Search, X } from 'lucide-react';

import { Table } from '@tanstack/react-table';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import UserAutocomplete from '@/components/user-autocomplete';

import { DataTableFacetedFilter } from './data-table-faceted-filter';
import { DataTableViewOptions } from './data-table-view-options';

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
}

export function DataTableToolbar<TData>({ table }: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0;

  // Auto-detect search column (prefer plan column, then user, then status)
  const searchColumn =
    table.getColumn('plan') || table.getColumn('user') || table.getColumn('status');

  // Status options for faceted filter
  const statusOptions = [
    { label: 'Hoạt động', value: 'active' },
    { label: 'Không hoạt động', value: 'inactive' },
    { label: 'Đã hủy', value: 'cancelled' },
    { label: 'Đã hết hạn', value: 'expired' },
  ];

  // Billing period options for faceted filter
  // const billingPeriodOptions = [
  //   { label: 'Hàng tháng', value: 'monthly' },
  //   { label: 'Hàng quý', value: 'quarterly' },
  //   { label: 'Hàng năm', value: 'yearly' },
  // ];

  // Auto-renew options for faceted filter
  // const autoRenewOptions = [
  //   { label: 'Có', value: true },
  //   { label: 'Không', value: false },
  // ];

  return (
    <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
      <div className='flex flex-1 flex-col gap-4 sm:flex-row sm:items-center'>
        {/* Search */}
        {searchColumn && (
          <div className='relative max-w-sm'>
            <Search className='text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2' />
            {searchColumn.id === 'user' ? (
              <UserAutocomplete
                value={(searchColumn?.getFilterValue() as string) ?? ''}
                placeholder='Tìm người dùng...'
                onChange={(id) => searchColumn?.setFilterValue(id || '')}
              />
            ) : (
              <Input
                placeholder={`Tìm kiếm ${searchColumn.id === 'plan' ? 'gói dịch vụ' : searchColumn.id === 'user' ? 'người dùng' : 'trạng thái'}...`}
                value={(searchColumn?.getFilterValue() as string) ?? ''}
                onChange={(event) => searchColumn?.setFilterValue(event.target.value)}
                className='h-9 pl-9'
              />
            )}
          </div>
        )}

        {/* Status Filter */}
        {table.getColumn('status') && (
          <DataTableFacetedFilter
            column={table.getColumn('status')}
            title='Trạng thái'
            options={statusOptions}
          />
        )}

        {/* Billing Period Filter */}
        {/* {table.getColumn('billing_period') && (
          <DataTableFacetedFilter
            column={table.getColumn('billing_period')}
            title='Chu kỳ'
            options={billingPeriodOptions}
          />
        )} */}

        {/* Auto Renew Filter */}
        {/* {table.getColumn('auto_renew') && (
          <DataTableFacetedFilter
            column={table.getColumn('auto_renew')}
            title='Tự động gia hạn'
            options={autoRenewOptions}
          />
        )} */}

        {/* Clear Filters */}
        {isFiltered && (
          <Button variant='ghost' onClick={() => table.resetColumnFilters()} className='h-9 px-3'>
            Xóa bộ lọc
            <X className='ml-2 h-4 w-4' />
          </Button>
        )}
      </div>

      <div className='flex items-center gap-2'>
        {/* Column Visibility */}
        <DataTableViewOptions table={table} />

        {/* Export */}
        <Button variant='outline' size='sm' className='h-9'>
          <Download className='mr-2 h-4 w-4' />
          Xuất dữ liệu
        </Button>

        {/* Add New */}
        <Button size='sm' className='h-9'>
          <Plus className='mr-2 h-4 w-4' />
          Thêm mới
        </Button>
      </div>
    </div>
  );
}
