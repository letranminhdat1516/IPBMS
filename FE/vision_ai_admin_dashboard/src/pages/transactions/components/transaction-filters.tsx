import { Filter, X } from 'lucide-react';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import UserAutocomplete from '@/components/user-autocomplete';

import type { TransactionFilters } from '@/types/transaction';

// autocomplete moved to reusable component

interface TransactionFiltersComponentProps {
  filters: TransactionFilters;
  onFiltersChange: (filters: TransactionFilters) => void;
  onFiltersClear: () => void;
}

/**
 * Component bộ lọc giao dịch
 */
export function TransactionFiltersComponent({
  filters,
  onFiltersChange,
  onFiltersClear,
}: TransactionFiltersComponentProps) {
  const [localFilters, setLocalFilters] = useState<TransactionFilters>(filters);

  const handleFilterChange = (
    key: keyof TransactionFilters,
    value: string | number | undefined
  ) => {
    const newFilters = { ...localFilters };

    if (value === '' || value === undefined) {
      delete newFilters[key];
    } else {
      (newFilters as Record<string, unknown>)[key] = value;
    }

    setLocalFilters(newFilters);
  };

  const handleApplyFilters = () => {
    onFiltersChange(localFilters);
  };

  const handleClearFilters = () => {
    setLocalFilters({});
    onFiltersClear();
  };

  const hasActiveFilters = Object.keys(localFilters).length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className='flex items-center gap-2'>
          <Filter className='h-4 w-4' />
          Bộ lọc giao dịch
          {hasActiveFilters && (
            <span className='bg-primary text-primary-foreground ml-2 rounded-full px-2 py-1 text-xs'>
              {Object.keys(localFilters).length}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-4'>
        <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
          {/* Status Filter */}
          <div className='space-y-2'>
            <Label htmlFor='status'>Trạng thái</Label>
            <Select
              value={localFilters.status || ''}
              onValueChange={(value) =>
                handleFilterChange('status', value === 'all' ? undefined : value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder='Chọn trạng thái' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>Tất cả</SelectItem>
                <SelectItem value='pending'>Đang xử lý</SelectItem>
                <SelectItem value='completed'>Hoàn thành</SelectItem>
                <SelectItem value='failed'>Thất bại</SelectItem>
                <SelectItem value='refunded'>Đã hoàn tiền</SelectItem>
                <SelectItem value='cancelled'>Đã hủy</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Payment Method Filter */}
          <div className='space-y-2'>
            <Label htmlFor='payment_method'>Phương thức thanh toán</Label>
            <Select
              value={localFilters.payment_method || ''}
              onValueChange={(value) =>
                handleFilterChange('payment_method', value === 'all' ? undefined : value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder='Chọn phương thức' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>Tất cả</SelectItem>
                <SelectItem value='stripe'>Stripe</SelectItem>
                <SelectItem value='paypal'>PayPal</SelectItem>
                <SelectItem value='bank_transfer'>Chuyển khoản</SelectItem>
                <SelectItem value='credit_card'>Thẻ tín dụng</SelectItem>
                <SelectItem value='other'>Khác</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* User selection (autocomplete) */}
          <div className='space-y-2'>
            <Label htmlFor='user_id'>Tên người dùng</Label>
            <UserAutocomplete
              value={localFilters.user_id}
              placeholder='Nhập tên người dùng'
              onChange={(userId) => handleFilterChange('user_id', userId || undefined)}
            />
          </div>

          {/* Plan Code Filter */}
          <div className='space-y-2'>
            <Label htmlFor='plan_code'>Mã gói dịch vụ</Label>
            <Input
              id='plan_code'
              placeholder='Nhập mã gói'
              value={localFilters.plan_code || ''}
              onChange={(e) => handleFilterChange('plan_code', e.target.value || undefined)}
            />
          </div>
        </div>

        <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
          {/* Amount Range */}
          <div className='space-y-2'>
            <Label htmlFor='amount_min'>Số tiền từ (VNĐ)</Label>
            <Input
              id='amount_min'
              type='number'
              placeholder='0'
              value={localFilters.amount_min || ''}
              onChange={(e) =>
                handleFilterChange(
                  'amount_min',
                  e.target.value ? Number(e.target.value) : undefined
                )
              }
            />
          </div>

          <div className='space-y-2'>
            <Label htmlFor='amount_max'>Số tiền đến (VNĐ)</Label>
            <Input
              id='amount_max'
              type='number'
              placeholder='Không giới hạn'
              value={localFilters.amount_max || ''}
              onChange={(e) =>
                handleFilterChange(
                  'amount_max',
                  e.target.value ? Number(e.target.value) : undefined
                )
              }
            />
          </div>

          {/* Quick Date Presets */}
          <div className='space-y-2'>
            <Label>Thời gian nhanh</Label>
            <Select
              onValueChange={(value) => {
                const now = new Date();
                let dateFrom: string | undefined;
                let dateTo: string | undefined;

                switch (value) {
                  case 'today': {
                    dateFrom = now.toISOString().split('T')[0];
                    dateTo = now.toISOString().split('T')[0];
                    break;
                  }
                  case 'yesterday': {
                    const yesterday = new Date(now);
                    yesterday.setDate(yesterday.getDate() - 1);
                    dateFrom = yesterday.toISOString().split('T')[0];
                    dateTo = yesterday.toISOString().split('T')[0];
                    break;
                  }
                  case 'this_week': {
                    const weekStart = new Date(now);
                    weekStart.setDate(now.getDate() - now.getDay());
                    dateFrom = weekStart.toISOString().split('T')[0];
                    dateTo = now.toISOString().split('T')[0];
                    break;
                  }
                  case 'this_month': {
                    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
                    dateFrom = monthStart.toISOString().split('T')[0];
                    dateTo = now.toISOString().split('T')[0];
                    break;
                  }
                  case 'last_month': {
                    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
                    dateFrom = lastMonth.toISOString().split('T')[0];
                    dateTo = lastMonthEnd.toISOString().split('T')[0];
                    break;
                  }
                  default:
                    return;
                }

                handleFilterChange('date_from', dateFrom);
                handleFilterChange('date_to', dateTo);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder='Chọn khoảng thời gian' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='today'>Hôm nay</SelectItem>
                <SelectItem value='yesterday'>Hôm qua</SelectItem>
                <SelectItem value='this_week'>Tuần này</SelectItem>
                <SelectItem value='this_month'>Tháng này</SelectItem>
                <SelectItem value='last_month'>Tháng trước</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Date Range */}
        <div className='grid gap-4 md:grid-cols-2'>
          <div className='space-y-2'>
            <Label htmlFor='date_from'>Từ ngày</Label>
            <Input
              id='date_from'
              type='date'
              value={localFilters.date_from || ''}
              onChange={(e) => handleFilterChange('date_from', e.target.value || undefined)}
            />
          </div>

          <div className='space-y-2'>
            <Label htmlFor='date_to'>Đến ngày</Label>
            <Input
              id='date_to'
              type='date'
              value={localFilters.date_to || ''}
              onChange={(e) => handleFilterChange('date_to', e.target.value || undefined)}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className='flex gap-2'>
          <Button onClick={handleApplyFilters} className='flex-1'>
            Áp dụng bộ lọc
          </Button>
          {hasActiveFilters && (
            <Button variant='outline' onClick={handleClearFilters}>
              <X className='mr-2 h-4 w-4' />
              Xóa bộ lọc
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
