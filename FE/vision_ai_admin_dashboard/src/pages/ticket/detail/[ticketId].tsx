import { CameraIcon, Info, Trash2 } from 'lucide-react';

import { useMemo, useState } from 'react';

import { useParams } from '@tanstack/react-router';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import { useCameraEvents } from '@/services/cameras';

import { EventTypeIcon } from './components/EventTypeIcon';
import ExpandableDescription from './components/ExpandableDescription';
import Loading from './components/Loading';

export default function TicketDetail() {
  const { ticketId } = useParams({ from: '/_authenticated/ticket/detail/$ticketId' });
  const [openDelete, setOpenDelete] = useState(false);

  // Lấy danh sách sự kiện cho camera này
  const {
    data: eventData,
    isLoading: eventsLoading,
    error: eventsError,
  } = useCameraEvents(ticketId);

  // Thông tin camera (giả lập, có thể thay bằng API thật)
  const camera = useMemo(
    () => ({
      camera_id: Number(ticketId),
      camera_code: `CAM-${ticketId}`,
      location: 'Phòng bệnh 101',
      type: 'Dahua',
      ip_address: '192.168.1.10',
      status: 'Hoạt động',
      installed_at: '2023-01-01',
      description: 'Camera giám sát hành lang bệnh viện.',
      connection: 'Online',
      event_count: eventData?.pagination?.total ?? 0,
      // Thêm thông tin ticket
      ticket_count: 5,
      open_tickets: 2,
      resolved_tickets: 3,
      last_ticket_date: '2025-09-10',
    }),
    [ticketId, eventData]
  );

  if (eventsLoading) return <Loading />;
  if (eventsError) return <div className='text-destructive'>Lỗi tải sự kiện camera.</div>;

  return (
    <TooltipProvider>
      <div className='mx-auto mt-8 px-4'>
        {/* Thanh điều hướng & nút quay lại */}
        <nav className='text-muted-foreground mb-4 flex items-center gap-2 text-sm'>
          <Button
            variant='ghost'
            size='sm'
            className='px-2 py-1'
            onClick={() => window.history.back()}
          >
            ← Quay lại
          </Button>
          <span>/</span>
          <a href='/ticket' className='hover:underline'>
            Camera
          </a>
          <span>/</span>
          <span className='text-primary font-semibold'>{camera.camera_code}</span>
        </nav>
        <div className='bg-background rounded-xl p-6 shadow-lg'>
          <div className='mb-4 flex items-center gap-4'>
            <Avatar className='h-16 w-16'>
              <AvatarImage src='/images/shadcn-admin.png' alt='Camera' />
              <AvatarFallback>
                <CameraIcon className='text-primary h-8 w-8' />
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className='text-primary mb-1 text-2xl font-bold'>{camera.camera_code}</h2>
              <Badge variant={camera.status === 'Hoạt động' ? 'default' : 'destructive'}>
                {camera.status}
              </Badge>
            </div>
            <div className='ml-auto flex gap-2'>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size='sm' variant='outline'>
                    <Info className='mr-1 h-4 w-4' />
                    Xem lịch sử
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Lịch sử hoạt động của camera</TooltipContent>
              </Tooltip>
              <Dialog open={openDelete} onOpenChange={setOpenDelete}>
                <DialogTrigger asChild>
                  <Button size='sm' variant='destructive'>
                    <Trash2 className='mr-1 h-4 w-4' />
                    Xóa camera
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Xác nhận xóa camera</DialogTitle>
                  </DialogHeader>
                  <div>
                    Bạn có chắc chắn muốn xóa camera <b>{camera.camera_code}</b> không? Thao tác này
                    không thể hoàn tác.
                  </div>
                  <DialogFooter>
                    <Button variant='outline' onClick={() => setOpenDelete(false)}>
                      Hủy
                    </Button>
                    <Button
                      variant='destructive'
                      onClick={() => {
                        setOpenDelete(false);
                        alert('Đã xóa camera!');
                      }}
                    >
                      Xóa
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
          <div className='mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
            <div className='bg-muted rounded-lg p-4'>
              <span className='text-muted-foreground mb-1 block text-xs'>Vị trí</span>
              <span className='text-base font-medium'>{camera.location}</span>
            </div>
            <div className='bg-muted rounded-lg p-4'>
              <span className='text-muted-foreground mb-1 block text-xs'>Loại</span>
              <span className='text-base font-medium'>{camera.type}</span>
            </div>
            <div className='bg-muted rounded-lg p-4'>
              <span className='text-muted-foreground mb-1 block text-xs'>Địa chỉ IP</span>
              <span className='font-mono text-base'>{camera.ip_address}</span>
            </div>
            <div className='bg-muted rounded-lg p-4'>
              <span className='text-muted-foreground mb-1 block text-xs'>Ngày lắp đặt</span>
              <span className='text-base font-medium'>{camera.installed_at}</span>
            </div>
            <div className='bg-muted rounded-lg p-4'>
              <span className='text-muted-foreground mb-1 block text-xs'>Trạng thái kết nối</span>
              <span
                className={
                  camera.connection === 'Online'
                    ? 'font-semibold text-green-600'
                    : 'font-semibold text-red-600'
                }
              >
                {camera.connection}
              </span>
            </div>
            <div className='bg-muted rounded-lg p-4'>
              <span className='text-muted-foreground mb-1 block text-xs'>Số sự kiện</span>
              <span className='text-base font-medium'>{camera.event_count}</span>
            </div>
            {/* Thêm thông tin ticket */}
            <div className='bg-muted rounded-lg p-4'>
              <span className='text-muted-foreground mb-1 block text-xs'>Tổng số ticket</span>
              <span className='text-base font-medium'>{camera.ticket_count}</span>
            </div>
            <div className='bg-muted rounded-lg p-4'>
              <span className='text-muted-foreground mb-1 block text-xs'>Ticket đang mở</span>
              <span className='text-base font-medium text-orange-600'>{camera.open_tickets}</span>
            </div>
            <div className='bg-muted rounded-lg p-4'>
              <span className='text-muted-foreground mb-1 block text-xs'>Ticket đã giải quyết</span>
              <span className='text-base font-medium text-green-600'>
                {camera.resolved_tickets}
              </span>
            </div>
          </div>
          {/* Đường kẻ chia */}
          <hr className='border-muted my-6' />
          {/* Mô tả mở rộng */}
          <div className='mt-6'>
            <span className='text-primary mb-2 block text-sm font-semibold'>Mô tả</span>
            <ExpandableDescription text={camera.description ?? ''} />
          </div>
          <div className='mt-8'>
            <span className='text-primary mb-2 block text-sm font-semibold'>Lịch sử hoạt động</span>
            <div className='bg-muted overflow-x-auto rounded border'>
              <table className='w-full text-sm'>
                <thead>
                  <tr className='bg-background'>
                    <th className='p-2 text-left'>Thời gian</th>
                    <th className='p-2 text-left'>Sự kiện</th>
                  </tr>
                </thead>
                <tbody>
                  {eventData?.items?.map((log) => (
                    <tr
                      key={log.event_id}
                      className='hover:bg-background/60 border-t transition-colors'
                    >
                      <td className='p-2'>{log.event_time}</td>
                      <td className='flex items-center gap-2 p-2'>
                        <EventTypeIcon type={log.event_type} />
                        <span className='font-semibold'>{log.event_type}</span>
                        <br />
                        <span className='text-muted-foreground'>{log.details}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {/* Section lịch sử ticket báo lỗi */}
          <div className='mt-8'>
            <div className='mb-4 flex items-center justify-between'>
              <span className='text-primary text-sm font-semibold'>📋 Lịch sử ticket báo lỗi</span>
              <Button size='sm' variant='outline'>
                + Tạo ticket mới
              </Button>
            </div>
            <div className='bg-muted overflow-x-auto rounded border'>
              <table className='w-full text-sm'>
                <thead>
                  <tr className='bg-background'>
                    <th className='p-3 text-left'>Mã ticket</th>
                    <th className='p-3 text-left'>Thời gian báo</th>
                    <th className='p-3 text-left'>Vấn đề</th>
                    <th className='p-3 text-left'>Trạng thái</th>
                    <th className='p-3 text-left'>Người xử lý</th>
                    <th className='p-3 text-left'>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Mock data cho ticket */}
                  <tr className='hover:bg-background/60 border-t transition-colors'>
                    <td className='p-3 font-mono'>TICK-2024-001</td>
                    <td className='p-3'>2024-09-10 14:30</td>
                    <td className='p-3'>Camera không kết nối được</td>
                    <td className='p-3'>
                      <Badge variant='outline' className='border-orange-500 text-orange-600'>
                        🔄 Đang xử lý
                      </Badge>
                    </td>
                    <td className='p-3'>Nguyễn Văn A</td>
                    <td className='p-3'>
                      <Button size='sm' variant='ghost'>
                        Xem chi tiết
                      </Button>
                    </td>
                  </tr>
                  <tr className='hover:bg-background/60 border-t transition-colors'>
                    <td className='p-3 font-mono'>TICK-2024-002</td>
                    <td className='p-3'>2024-09-08 09:15</td>
                    <td className='p-3'>Hình ảnh bị mờ</td>
                    <td className='p-3'>
                      <Badge variant='outline' className='border-green-500 text-green-600'>
                        ✅ Đã hoàn thành
                      </Badge>
                    </td>
                    <td className='p-3'>Trần Thị B</td>
                    <td className='p-3'>
                      <Button size='sm' variant='ghost'>
                        Xem chi tiết
                      </Button>
                    </td>
                  </tr>
                  <tr className='hover:bg-background/60 border-t transition-colors'>
                    <td className='p-3 font-mono'>TICK-2024-003</td>
                    <td className='p-3'>2024-09-05 16:45</td>
                    <td className='p-3'>Camera bị lệch góc</td>
                    <td className='p-3'>
                      <Badge variant='outline' className='border-red-500 text-red-600'>
                        ❌ Đã hủy
                      </Badge>
                    </td>
                    <td className='p-3'>Lê Văn C</td>
                    <td className='p-3'>
                      <Button size='sm' variant='ghost'>
                        Xem chi tiết
                      </Button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            {camera.ticket_count === 0 && (
              <div className='text-muted-foreground mt-4 text-center'>
                Chưa có ticket báo lỗi nào cho camera này.
              </div>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
