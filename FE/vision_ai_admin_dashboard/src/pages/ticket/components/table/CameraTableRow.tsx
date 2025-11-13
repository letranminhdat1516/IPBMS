import { AlertTriangle, Eye, MoreHorizontal, Plus } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TableCell, TableRow } from '@/components/ui/table';

import type { Camera } from '@/types/camera';

import { StatusBadge, TicketStatusBadge } from '../badge/StatusBadge';

interface CameraTableRowProps {
  cam: Camera;
  checked: boolean;
  onCheck: () => void;
  onCodeClick?: () => void;
}

export function CameraTableRow({ cam, checked, onCheck, onCodeClick }: CameraTableRowProps) {
  const hasOpenTickets = (cam.open_tickets ?? 0) > 0;
  const totalTickets = cam.ticket_count ?? 0;

  return (
    <TableRow className={hasOpenTickets ? 'bg-yellow-50/50' : ''}>
      <TableCell className='w-4'>
        <input type='checkbox' checked={checked} onChange={onCheck} />
      </TableCell>
      <TableCell>
        <Button
          variant='link'
          className='text-primary h-auto p-0 hover:underline'
          onClick={onCodeClick}
        >
          {cam.camera_code}
        </Button>
      </TableCell>
      <TableCell>{cam.location}</TableCell>
      <TableCell>{cam.type}</TableCell>
      <TableCell>
        <code className='bg-muted rounded px-1 py-0.5 text-xs'>{cam.ip_address}</code>
      </TableCell>
      <TableCell>
        <div className='flex flex-col gap-1'>
          <StatusBadge status={cam.status} />
          {cam.last_report_at && (
            <div className='text-muted-foreground text-xs'>
              Cập nhật: {new Date(cam.last_report_at).toLocaleDateString('vi-VN')}
            </div>
          )}
        </div>
      </TableCell>
      <TableCell>
        <div className='flex flex-col gap-2'>
          {totalTickets > 0 ? (
            <div className='flex items-center gap-2'>
              <Badge variant={hasOpenTickets ? 'destructive' : 'secondary'} className='text-xs'>
                {totalTickets} ticket{totalTickets > 1 ? 's' : ''}
              </Badge>
              {hasOpenTickets && (
                <Badge variant='outline' className='border-yellow-300 text-xs text-yellow-600'>
                  {cam.open_tickets} mở
                </Badge>
              )}
            </div>
          ) : (
            <Badge variant='outline' className='border-green-300 text-xs text-green-600'>
              Không có ticket
            </Badge>
          )}
          {cam.ticket_status && (
            <div className='flex flex-wrap gap-1'>
              <TicketStatusBadge status={cam.ticket_status} />
            </div>
          )}
          {cam.last_ticket_date && (
            <div className='text-muted-foreground text-xs'>
              Ticket cuối: {new Date(cam.last_ticket_date).toLocaleDateString('vi-VN')}
            </div>
          )}
        </div>
      </TableCell>
      <TableCell className='text-right'>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant='ghost' size='icon'>
              <MoreHorizontal size={18} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end'>
            <DropdownMenuItem onClick={onCodeClick}>
              <Eye className='mr-2 h-4 w-4' />
              Xem chi tiết
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Plus className='mr-2 h-4 w-4' />
              Tạo ticket mới
            </DropdownMenuItem>
            {hasOpenTickets && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem className='text-yellow-600'>
                  <AlertTriangle className='mr-2 h-4 w-4' />
                  Xem ticket mở ({cam.open_tickets})
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}
