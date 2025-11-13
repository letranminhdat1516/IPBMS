import {
  type CellContext,
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';

import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import type { Notification } from '@/types/notification';

import { alertColumns } from './alert-columns';

interface AlertTableProps {
  alerts: Notification[];
  onAcknowledge?: (alertId: string) => void;
  onDismiss?: (alertId: string) => void;
  onResolve?: (alertId: string) => void;
  onViewDetails?: (alertId: string) => void;
}

export function AlertTable({
  alerts,
  onAcknowledge,
  onDismiss,
  onResolve,
  onViewDetails,
}: AlertTableProps) {
  const data = alerts ?? [];

  const columns = alertColumns.filter((c) => {
    const accessorKey = (c as unknown as { accessorKey?: string }).accessorKey;
    const key = (c.id ?? accessorKey) as string | undefined;
    return key !== 'actions';
  }) as ColumnDef<Notification>[];

  const actionsColumn: ColumnDef<Notification> = {
    id: 'actions',
    header: 'Thao Tác',
    cell: ({ row }: CellContext<Notification, unknown>) => {
      const status = (row.getValue('status') as string) || 'pending';
      const id = String((row.original as Notification).notification_id);
      return (
        <div className='flex justify-end gap-2'>
          {status === 'pending' && (
            <>
              <Button variant='outline' size='sm' onClick={() => onAcknowledge?.(id)}>
                Xác Nhận
              </Button>
              <Button variant='outline' size='sm' onClick={() => onDismiss?.(id)}>
                Bỏ Qua
              </Button>
            </>
          )}
          {status === 'acknowledged' && (
            <Button variant='outline' size='sm' onClick={() => onResolve?.(id)}>
              Giải Quyết
            </Button>
          )}
          <Button variant='ghost' size='sm' onClick={() => onViewDetails?.(id)}>
            Chi Tiết
          </Button>
        </div>
      );
    },
  } as ColumnDef<Notification>;

  const allColumns = [...columns, actionsColumn];

  const table = useReactTable({
    data,
    columns: allColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <Table>
      <TableHeader>
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <TableHead
                key={header.id}
                className={header.index === headerGroup.headers.length - 1 ? 'text-right' : ''}
              >
                {header.isPlaceholder
                  ? null
                  : flexRender(header.column.columnDef.header, header.getContext())}
              </TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows.map((row) => (
          <TableRow key={row.id}>
            {row.getVisibleCells().map((cell) => (
              <TableCell key={cell.id}>
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
