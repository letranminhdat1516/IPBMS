import { Table } from '@tanstack/react-table';

import { Cross2Icon } from '@radix-ui/react-icons';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { DataTableFacetedFilter } from '@/pages/subscriptions/components/data-table-faceted-filter';
import { DataTableViewOptions } from '@/pages/subscriptions/components/data-table-view-options';

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
}

export function DataTableToolbar<TData>({ table }: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0;
  const hasStatus = table.getAllLeafColumns().some((c) => c.id === 'status');
  const searchColumnId = ['full_name', 'email', 'phone'].find((id) =>
    table.getAllLeafColumns().some((c) => c.id === id)
  );

  return (
    <div className='flex items-center justify-between'>
      <div className='flex flex-1 flex-col-reverse items-start gap-y-2 sm:flex-row sm:items-center sm:space-x-2'>
        {searchColumnId && (
          <Input
            placeholder='Tìm kiếm người chăm sóc...'
            value={(table.getColumn(searchColumnId)?.getFilterValue() as string) ?? ''}
            onChange={(event) =>
              table.getColumn(searchColumnId!)?.setFilterValue(event.target.value)
            }
            className='h-8 w-[150px] lg:w-[250px]'
          />
        )}
        <div className='flex gap-x-2'>
          {hasStatus && table.getColumn('status') && (
            <DataTableFacetedFilter
              column={table.getColumn('status')}
              title='Trạng thái'
              options={[
                { label: 'Đã duyệt', value: 'approved' },
                { label: 'Chờ duyệt', value: 'pending' },
                { label: 'Từ chối', value: 'rejected' },
              ]}
            />
          )}
        </div>
        {isFiltered && (
          <Button
            variant='ghost'
            onClick={() => table.resetColumnFilters()}
            className='h-8 px-2 lg:px-3'
          >
            Đặt lại
            <Cross2Icon className='ml-2 h-4 w-4' />
          </Button>
        )}
      </div>
      <DataTableViewOptions table={table} />
    </div>
  );
}
