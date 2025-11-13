import { AlertTriangle, Download, MoreHorizontal, Settings } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface CameraActionsProps {
  selectedCount: number;
  onQuickReport: () => void;
  onBulkStatusUpdate: (status: string) => void;
  onExportReport: () => void;
}

export function TicketActions({
  selectedCount,
  onQuickReport,
  onBulkStatusUpdate,
  onExportReport,
}: CameraActionsProps) {
  if (selectedCount === 0) {
    return (
      <Card className='shadow-sm'>
        <CardContent className='p-4'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400'>
              <span>Chọn phiếu lỗi để thực hiện hành động</span>
            </div>
            <div className='flex items-center space-x-2'>
              <Button
                variant='outline'
                size='sm'
                onClick={onExportReport}
                className='hover:bg-gray-50'
              >
                <Download className='mr-2 h-4 w-4' />
                Xuất báo cáo
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant='outline' size='sm' className='hover:bg-gray-50'>
                    <MoreHorizontal className='h-4 w-4' />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align='end'>
                  <DropdownMenuItem>
                    <Settings className='mr-2 h-4 w-4' />
                    Cài đặt bộ lọc
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>Làm mới dữ liệu</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className='border-blue-200 bg-blue-50/50 shadow-sm dark:border-blue-800 dark:bg-blue-900/10'>
      <CardContent className='p-4'>
        <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
          <div className='flex items-center space-x-2'>
            <div className='rounded-full bg-blue-100 p-2 dark:bg-blue-900/20'>
              <svg
                className='h-4 w-4 text-blue-600 dark:text-blue-400'
                fill='none'
                viewBox='0 0 24 24'
                stroke='currentColor'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
                />
              </svg>
            </div>
            <div>
              <p className='font-medium text-gray-900 dark:text-white'>
                {selectedCount} phiếu lỗi đã được chọn
              </p>
              <p className='text-sm text-gray-600 dark:text-gray-400'>
                Chọn hành động để thực hiện
              </p>
            </div>
          </div>
          <div className='flex items-center space-x-2'>
            <Button
              variant='outline'
              size='sm'
              onClick={onQuickReport}
              className='border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100 dark:border-orange-800 dark:bg-orange-900/20 dark:text-orange-400 dark:hover:bg-orange-900/30'
            >
              <AlertTriangle className='mr-2 h-4 w-4' />
              Phân công kỹ thuật viên
            </Button>
            <Select onValueChange={onBulkStatusUpdate}>
              <SelectTrigger className='w-44 transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'>
                <SelectValue placeholder='Cập nhật trạng thái' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='hoạt động'>
                  <div className='flex items-center space-x-2'>
                    <div className='h-2 w-2 rounded-full bg-green-500'></div>
                    <span>Đánh dấu đang xử lý</span>
                  </div>
                </SelectItem>
                <SelectItem value='không hoạt động'>
                  <div className='flex items-center space-x-2'>
                    <div className='h-2 w-2 rounded-full bg-red-500'></div>
                    <span>Đánh dấu đã đóng</span>
                  </div>
                </SelectItem>
                <SelectItem value='bị chặn'>
                  <div className='flex items-center space-x-2'>
                    <div className='h-2 w-2 rounded-full bg-yellow-500'></div>
                    <span>Đánh dấu chờ phân công</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant='outline'
              size='sm'
              onClick={onExportReport}
              className='hover:bg-gray-50'
            >
              <Download className='mr-2 h-4 w-4' />
              Xuất báo cáo
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
