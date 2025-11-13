// email-templates/components/email-templates-filters.tsx
import { Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface EmailTemplatesFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  typeFilter: string;
  onTypeFilterChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  onCreateNew: () => void;
}

export function EmailTemplatesFilters({
  search,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  statusFilter,
  onStatusFilterChange,
  onCreateNew,
}: EmailTemplatesFiltersProps) {
  return (
    <div className='flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center'>
      <div className='flex flex-1 flex-col gap-4 sm:flex-row'>
        {/* Search */}
        <div className='relative max-w-sm flex-1'>
          <Search className='text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform' />
          <Input
            placeholder='Tìm kiếm template...'
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className='pl-9'
          />
        </div>

        {/* Type Filter */}
        <Select value={typeFilter} onValueChange={onTypeFilterChange}>
          <SelectTrigger className='w-40'>
            <SelectValue placeholder='Loại' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>Tất cả loại</SelectItem>
            <SelectItem value='welcome'>Welcome</SelectItem>
            <SelectItem value='notification'>Thông báo</SelectItem>
            <SelectItem value='marketing'>Marketing</SelectItem>
            <SelectItem value='transactional'>Giao dịch</SelectItem>
            <SelectItem value='system'>Hệ thống</SelectItem>
          </SelectContent>
        </Select>

        {/* Status Filter */}
        <Select value={statusFilter} onValueChange={onStatusFilterChange}>
          <SelectTrigger className='w-40'>
            <SelectValue placeholder='Trạng thái' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>Tất cả</SelectItem>
            <SelectItem value='active'>Hoạt động</SelectItem>
            <SelectItem value='inactive'>Tạm dừng</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Create Button */}
      <Button onClick={onCreateNew}>Tạo Template Mới</Button>
    </div>
  );
}
