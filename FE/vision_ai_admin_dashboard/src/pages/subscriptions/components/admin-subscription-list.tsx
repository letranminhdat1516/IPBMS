import { format } from 'date-fns';
import { Filter, Pause, Play, Search, X } from 'lucide-react';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { ConfirmDialog } from '@/components/confirm-dialog';

import { useAdminSubscriptions } from '@/hooks/use-subscriptions';

import { cn } from '@/lib/utils';

type BulkActionType = 'suspend' | 'activate' | 'cancel';

interface AdminSubscriptionListProps {
  className?: string;
}

export function AdminSubscriptionList({ className }: AdminSubscriptionListProps) {
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    status: 'all' as 'all' | 'active' | 'trialing' | 'suspended' | 'cancelled' | 'expired',
    search: '',
    sortBy: 'created_at' as 'created_at' | 'updated_at' | 'current_period_end' | 'amount',
    sortOrder: 'desc' as 'asc' | 'desc',
  });

  // Bulk selection state
  const [selectedSubscriptions, setSelectedSubscriptions] = useState<Set<string>>(new Set());
  const [bulkActionDialog, setBulkActionDialog] = useState<{
    open: boolean;
    action: BulkActionType | null;
    count: number;
  }>({ open: false, action: null, count: 0 });

  const { data, isLoading, error } = useAdminSubscriptions({
    ...filters,
    status: filters.status === 'all' ? undefined : filters.status,
    search: filters.search || undefined,
  });

  // Bulk selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked && data?.data) {
      setSelectedSubscriptions(new Set(data.data.map((sub) => sub.id)));
    } else {
      setSelectedSubscriptions(new Set());
    }
  };

  const handleSelectSubscription = (subscriptionId: string, checked: boolean) => {
    const newSelected = new Set(selectedSubscriptions);
    if (checked) {
      newSelected.add(subscriptionId);
    } else {
      newSelected.delete(subscriptionId);
    }
    setSelectedSubscriptions(newSelected);
  };

  const handleBulkAction = (action: 'cancel' | 'suspend' | 'activate') => {
    setBulkActionDialog({
      open: true,
      action,
      count: selectedSubscriptions.size,
    });
  };

  const executeBulkAction = async () => {
    // TODO: Implement bulk API calls
    setBulkActionDialog({ open: false, action: null, count: 0 });
    setSelectedSubscriptions(new Set());
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-600 bg-green-50';
      case 'trialing':
        return 'text-blue-600 bg-blue-50';
      case 'suspended':
        return 'text-yellow-600 bg-yellow-50';
      case 'cancelled':
        return 'text-red-600 bg-red-50';
      case 'expired':
        return 'text-gray-600 bg-gray-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'Đang hoạt động';
      case 'trialing':
        return 'Dùng thử';
      case 'suspended':
        return 'Tạm dừng';
      case 'cancelled':
        return 'Đã hủy';
      case 'expired':
        return 'Đã hết hạn';
      default:
        return status;
    }
  };

  const getBulkActionText = (action: BulkActionType) => {
    switch (action) {
      case 'suspend':
        return 'Tạm dừng';
      case 'activate':
        return 'Kích hoạt';
      case 'cancel':
        return 'Hủy';
      default:
        return action;
    }
  };

  const handleFiltersChange = (newFilters: Partial<typeof filters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters, page: 1 }));
  };

  if (error) {
    return (
      <Card className={className}>
        <CardContent className='p-6'>
          <div className='text-center text-red-600'>
            Có lỗi xảy ra khi tải danh sách subscription: {error.message}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className='flex items-center gap-2'>
          <Filter className='h-5 w-5' />
          Quản lý Subscription
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className='mb-6 flex flex-wrap gap-4'>
          <div className='min-w-[200px] flex-1'>
            <div className='relative'>
              <Search className='text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2' />
              <Input
                placeholder='Tìm theo email hoặc tên...'
                value={filters.search}
                onChange={(e) => handleFiltersChange({ search: e.target.value })}
                className='pl-9'
              />
            </div>
          </div>

          <Select
            value={filters.status}
            onValueChange={(value) =>
              handleFiltersChange({
                status: value as typeof filters.status,
              })
            }
          >
            <SelectTrigger className='w-[140px]'>
              <SelectValue placeholder='Trạng thái' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>Tất cả</SelectItem>
              <SelectItem value='active'>Đang hoạt động</SelectItem>
              <SelectItem value='trialing'>Dùng thử</SelectItem>
              <SelectItem value='suspended'>Tạm dừng</SelectItem>
              <SelectItem value='cancelled'>Đã hủy</SelectItem>
              <SelectItem value='expired'>Đã hết hạn</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={`${filters.sortBy}_${filters.sortOrder}`}
            onValueChange={(value) => {
              const [sortBy, sortOrder] = value.split('_');
              handleFiltersChange({
                sortBy: sortBy as typeof filters.sortBy,
                sortOrder: sortOrder as typeof filters.sortOrder,
              });
            }}
          >
            <SelectTrigger className='w-[160px]'>
              <SelectValue placeholder='Sắp xếp' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='created_at_desc'>Mới nhất</SelectItem>
              <SelectItem value='created_at_asc'>Cũ nhất</SelectItem>
              <SelectItem value='updated_at_desc'>Cập nhật gần đây</SelectItem>
              <SelectItem value='current_period_end_asc'>Hết hạn sớm</SelectItem>
              <SelectItem value='amount_desc'>Giá cao nhất</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Bulk Actions Toolbar */}
        {selectedSubscriptions.size > 0 && (
          <div className='mb-4 flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3'>
            <span className='text-sm font-medium text-blue-900'>
              Đã chọn {selectedSubscriptions.size} subscription
            </span>
            <div className='ml-auto flex gap-2'>
              <Button
                variant='outline'
                size='sm'
                onClick={() => handleBulkAction('suspend')}
                className='border-orange-300 text-orange-600 hover:bg-orange-50'
              >
                <Pause className='mr-1 h-4 w-4' />
                Tạm dừng
              </Button>
              <Button
                variant='outline'
                size='sm'
                onClick={() => handleBulkAction('activate')}
                className='border-green-300 text-green-600 hover:bg-green-50'
              >
                <Play className='mr-1 h-4 w-4' />
                Kích hoạt
              </Button>
              <Button
                variant='outline'
                size='sm'
                onClick={() => handleBulkAction('cancel')}
                className='border-red-300 text-red-600 hover:bg-red-50'
              >
                <X className='mr-1 h-4 w-4' />
                Hủy
              </Button>
            </div>
          </div>
        )}

        {/* Table */}
        {isLoading ? (
          <div className='space-y-4'>
            {[...Array(5)].map((_, i) => (
              <div key={i} className='h-16 animate-pulse rounded bg-gray-100' />
            ))}
          </div>
        ) : data?.data.length === 0 ? (
          <div className='text-muted-foreground py-8 text-center'>Không có subscription nào.</div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className='w-12'>
                    <Checkbox
                      checked={
                        selectedSubscriptions.size === data?.data.length && data?.data.length > 0
                      }
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Thời gian</TableHead>
                  <TableHead>Giá</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.data.map((subscription) => (
                  <TableRow key={subscription.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedSubscriptions.has(subscription.id)}
                        onCheckedChange={(checked) =>
                          handleSelectSubscription(subscription.id, checked as boolean)
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className='font-medium'>{subscription.user.name}</div>
                        <div className='text-muted-foreground text-sm'>
                          {subscription.user.email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className='font-medium'>{subscription.plan.name}</div>
                      <div className='text-muted-foreground text-sm'>{subscription.plan_code}</div>
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full px-2 py-1 text-xs font-medium',
                          getStatusColor(subscription.status)
                        )}
                      >
                        {getStatusText(subscription.status)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className='text-sm'>
                        <div>
                          Từ: {format(new Date(subscription.current_period_start), 'dd/MM/yyyy')}
                        </div>
                        <div>
                          Đến: {format(new Date(subscription.current_period_end), 'dd/MM/yyyy')}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className='font-medium'>
                        {subscription.plan.amount.toLocaleString('vi-VN')}{' '}
                        {subscription.plan.currency}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination */}
            {data && data.pagination.totalPages > 1 && (
              <div className='mt-4 flex items-center justify-between'>
                <div className='text-muted-foreground text-sm'>
                  Hiển thị {(data.pagination.page - 1) * data.pagination.limit + 1} -{' '}
                  {Math.min(data.pagination.page * data.pagination.limit, data.pagination.total)}{' '}
                  của {data.pagination.total} kết quả
                </div>
                <div className='flex items-center space-x-2'>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => handleFiltersChange({ page: filters.page - 1 })}
                    disabled={filters.page <= 1}
                  >
                    Trước
                  </Button>
                  <span className='text-sm'>
                    Trang {data.pagination.page} / {data.pagination.totalPages}
                  </span>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => handleFiltersChange({ page: filters.page + 1 })}
                    disabled={filters.page >= data.pagination.totalPages}
                  >
                    Sau
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>

      {/* Bulk Action Confirmation Dialog */}
      <ConfirmDialog
        open={bulkActionDialog.open}
        onOpenChange={(open) => setBulkActionDialog((prev) => ({ ...prev, open }))}
        title={`Xác nhận ${bulkActionDialog.action ? getBulkActionText(bulkActionDialog.action) : ''}`}
        desc={`Bạn có chắc chắn muốn ${bulkActionDialog.action ? getBulkActionText(bulkActionDialog.action).toLowerCase() : ''} ${selectedSubscriptions.size} subscription đã chọn?`}
        handleConfirm={executeBulkAction}
        confirmText={
          bulkActionDialog.action ? getBulkActionText(bulkActionDialog.action) : 'Xác nhận'
        }
        destructive={bulkActionDialog.action === 'cancel'}
      />
    </Card>
  );
}
