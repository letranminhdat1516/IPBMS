import { ColumnDef } from '@tanstack/react-table';

import { Badge } from '@/components/ui/badge';

import { maskPhoneNumber } from '@/lib/utils';

import type { CaregiverInvitation } from '@/services/caregiver-invitations';

// UI components are imported where they're used; actions cell handles its own buttons
import { CaregiverInvitationActionsCell } from './caregiver-invitation-actions-cell';

const statusColors: Record<string, string> = {
  active: 'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20',
  inactive: 'bg-muted text-muted-foreground border border-border',
};

export const columns: ColumnDef<CaregiverInvitation>[] = [
  {
    accessorKey: 'assignment_id',
    header: () => <span>ID</span>,
    cell: ({ row }) => {
      const id = row.original.assignment_id;
      return <span className='font-mono text-sm'>{id.slice(0, 8)}...</span>;
    },
    enableSorting: false,
  },
  {
    id: 'caregiver',
    accessorFn: (row) => row.caregiver_name || 'N/A',
    header: () => <span>Người chăm sóc</span>,
    cell: ({ row }) => {
      const name = row.original.caregiver_name || 'N/A';
      const phone = row.original.caregiver_phone;

      return (
        <div className='min-w-[180px]'>
          <div className='font-medium'>{name}</div>
          {phone && (
            <div className='text-muted-foreground font-mono text-sm'>{maskPhoneNumber(phone)}</div>
          )}
        </div>
      );
    },
    enableSorting: false,
  },
  {
    id: 'patient',
    accessorFn: (row) => row.patient_name || 'N/A',
    header: () => <span>Bệnh nhân</span>,
    cell: ({ row }) => {
      const name = row.original.patient_name || 'N/A';
      const phone = row.original.patient_phone;

      return (
        <div className='min-w-[180px]'>
          <div className='font-medium'>{name}</div>
          {phone && (
            <div className='text-muted-foreground font-mono text-sm'>{maskPhoneNumber(phone)}</div>
          )}
        </div>
      );
    },
    enableSorting: false,
  },
  {
    accessorKey: 'is_active',
    header: () => <span>Trạng thái</span>,
    cell: ({ row }) => {
      const isActive = row.original.is_active;
      const status = isActive ? 'active' : 'inactive';
      const label = isActive ? 'Hoạt động' : 'Không hoạt động';

      return (
        <Badge variant={isActive ? 'default' : 'secondary'} className={statusColors[status]}>
          {label}
        </Badge>
      );
    },
    enableSorting: false,
  },
  {
    accessorKey: 'assigned_at',
    header: () => <span>Ngày phân công</span>,
    cell: ({ row }) => {
      const date = row.original.assigned_at;
      return <span className='text-sm'>{new Date(date).toLocaleDateString('vi-VN')}</span>;
    },
    enableSorting: false,
  },
  {
    accessorKey: 'unassigned_at',
    header: () => <span>Ngày kết thúc</span>,
    cell: ({ row }) => {
      const date = row.original.unassigned_at;
      return date ? (
        <span className='text-sm'>{new Date(date).toLocaleDateString('vi-VN')}</span>
      ) : (
        <span className='text-muted-foreground'>-</span>
      );
    },
    enableSorting: false,
  },
  {
    id: 'actions',
    header: () => <span>Hành động</span>,
    cell: ({ row, table }) => {
      const invitation = row.original;
      const { setCurrentRow, setOpen } = table.options.meta as {
        setCurrentRow: (invitation: CaregiverInvitation) => void;
        setOpen: (action: string) => void;
      };
      return (
        <CaregiverInvitationActionsCell
          invitation={invitation}
          onEdit={(inv) => {
            setCurrentRow(inv);
            setOpen('edit');
          }}
          onDelete={(inv) => {
            setCurrentRow(inv);
            setOpen('delete');
          }}
        />
      );
    },
    enableSorting: false,
  },
];
