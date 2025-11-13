import { Filter, Search } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface CameraFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  ticketStatusFilter: string;
  onTicketStatusFilterChange: (value: string) => void;
  reportedOnly: boolean;
  onReportedOnlyChange: (checked: boolean) => void;
}

export function TicketFilters({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  ticketStatusFilter,
  onTicketStatusFilterChange,
  reportedOnly,
  onReportedOnlyChange,
}: CameraFiltersProps) {
  return (
    <Card className='shadow-sm'>
      <CardHeader className='flex items-center border-b border-gray-200 dark:border-gray-700'>
        <div className='flex items-center space-x-2'>
          <div className='rounded-lg bg-blue-100 p-2 dark:bg-blue-900/20'>
            <Filter className='h-4 w-4 text-blue-600 dark:text-blue-400' />
          </div>
          <CardTitle className='text-lg font-semibold text-gray-900 dark:text-white'>
            Bộ lọc và tìm kiếm
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className='p-6'>
        <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-4'>
          <div className='space-y-2'>
            <label className='text-sm font-medium text-gray-700 dark:text-gray-300'>
              Tìm kiếm phiếu lỗi
            </label>
            <div className='relative'>
              <Search className='absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400' />
              <Input
                placeholder='Mã phiếu, mô tả, người báo...'
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                className='pl-10 transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
              />
            </div>
          </div>{' '}
          <div className='space-y-2'>
            <label className='text-sm font-medium text-gray-700 dark:text-gray-300'>
              Trạng thái phiếu lỗi
            </label>
            <Select value={statusFilter} onValueChange={onStatusFilterChange}>
              <SelectTrigger className='transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'>
                <SelectValue placeholder='Tất cả trạng thái' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>Tất cả</SelectItem>
                <SelectItem value='hoạt động'>
                  <div className='flex items-center space-x-2'>
                    <div className='h-2 w-2 rounded-full bg-green-500'></div>
                    <span>Đang xử lý</span>
                  </div>
                </SelectItem>
                <SelectItem value='không hoạt động'>
                  <div className='flex items-center space-x-2'>
                    <div className='h-2 w-2 rounded-full bg-red-500'></div>
                    <span>Đã đóng</span>
                  </div>
                </SelectItem>
                <SelectItem value='bị chặn'>
                  <div className='flex items-center space-x-2'>
                    <div className='h-2 w-2 rounded-full bg-yellow-500'></div>
                    <span>Chờ phân công</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className='space-y-2'>
            <label className='text-sm font-medium text-gray-700 dark:text-gray-300'>
              Độ ưu tiên
            </label>
            <Select value={ticketStatusFilter} onValueChange={onTicketStatusFilterChange}>
              <SelectTrigger className='transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'>
                <SelectValue placeholder='Tất cả mức độ' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>Tất cả</SelectItem>
                <SelectItem value='has_tickets'>
                  <div className='flex items-center space-x-2'>
                    <div className='h-2 w-2 rounded-full bg-red-500'></div>
                    <span>Cao</span>
                  </div>
                </SelectItem>
                <SelectItem value='no_tickets'>
                  <div className='flex items-center space-x-2'>
                    <div className='h-2 w-2 rounded-full bg-yellow-500'></div>
                    <span>Trung bình</span>
                  </div>
                </SelectItem>
                <SelectItem value='đang xử lý'>
                  <div className='flex items-center space-x-2'>
                    <div className='h-2 w-2 rounded-full bg-green-500'></div>
                    <span>Thấp</span>
                  </div>
                </SelectItem>
                <SelectItem value='hoàn thành'>
                  <div className='flex items-center space-x-2'>
                    <div className='h-2 w-2 rounded-full bg-blue-500'></div>
                    <span>Khẩn cấp</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className='flex items-end'>
            <div className='flex items-center space-x-3 rounded-lg border border-gray-200 bg-gray-50/50 p-3 dark:border-gray-700 dark:bg-gray-800/50'>
              <Checkbox
                id='reported-only'
                checked={reportedOnly}
                onCheckedChange={(checked) => onReportedOnlyChange(checked as boolean)}
                className='data-[state=checked]:border-blue-600 data-[state=checked]:bg-blue-600'
              />
              <label
                htmlFor='reported-only'
                className='cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300'
              >
                Chỉ phiếu chưa phân công
              </label>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
