import { Table } from '@tanstack/react-table';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { DataTableViewOptions } from '../../subscriptions/components/data-table-view-options';
import { useFcmTokensContext } from '../context/fcm-tokens-context';

interface DataTableToolbarProps<TData> {
  table: Table<TData>;
}

export function DataTableToolbar<TData>({ table }: DataTableToolbarProps<TData>) {
  const { setDeleteTokenIds, setOpen } = useFcmTokensContext();

  const selectedRows = table.getFilteredSelectedRowModel().rows;
  const hasSelectedRows = selectedRows.length > 0;

  const handleBulkDelete = () => {
    const ids = selectedRows.map((row) => (row.original as { id: string }).id);
    setDeleteTokenIds(ids);
    setOpen('delete');
  };

  return (
    <div className='flex items-center justify-between'>
      <div className='flex flex-1 items-center space-x-2'>
        <Input
          placeholder='Tìm kiếm tokens...'
          value={(table.getColumn('token')?.getFilterValue() as string) ?? ''}
          onChange={(event) => table.getColumn('token')?.setFilterValue(event.target.value)}
          className='h-8 w-[150px] lg:w-[250px]'
        />
        {hasSelectedRows && (
          <Button variant='outline' size='sm' onClick={handleBulkDelete}>
            Xóa {selectedRows.length} token(s)
          </Button>
        )}
      </div>
      <DataTableViewOptions table={table} />
    </div>
  );
}
