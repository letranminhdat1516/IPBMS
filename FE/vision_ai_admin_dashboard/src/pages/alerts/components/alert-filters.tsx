import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface AlertFiltersProps {
  statusFilter: string;
  severityFilter: string;
  typeFilter: string;
  onStatusFilterChange: (value: string) => void;
  onSeverityFilterChange: (value: string) => void;
  onTypeFilterChange: (value: string) => void;
}

export function AlertFilters({
  statusFilter,
  severityFilter,
  typeFilter,
  onStatusFilterChange,
  onSeverityFilterChange,
  onTypeFilterChange,
}: AlertFiltersProps) {
  return (
    <div className='flex gap-2'>
      <Select value={statusFilter} onValueChange={onStatusFilterChange}>
        <SelectTrigger className='w-32'>
          <SelectValue placeholder='Trạng Thái' />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='all'>Tất Cả</SelectItem>
          <SelectItem value='pending'>Đang Chờ</SelectItem>
          <SelectItem value='acknowledged'>Đã Xác Nhận</SelectItem>
          <SelectItem value='resolved'>Đã Giải Quyết</SelectItem>
          <SelectItem value='dismissed'>Đã Bỏ Qua</SelectItem>
        </SelectContent>
      </Select>
      <Select value={severityFilter} onValueChange={onSeverityFilterChange}>
        <SelectTrigger className='w-32'>
          <SelectValue placeholder='Mức Độ' />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='all'>Tất Cả</SelectItem>
          <SelectItem value='low'>Thấp</SelectItem>
          <SelectItem value='medium'>Trung Bình</SelectItem>
          <SelectItem value='high'>Cao</SelectItem>
          <SelectItem value='critical'>Nghiêm Trọng</SelectItem>
        </SelectContent>
      </Select>
      <Select value={typeFilter} onValueChange={onTypeFilterChange}>
        <SelectTrigger className='w-32'>
          <SelectValue placeholder='Loại' />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='all'>Tất Cả</SelectItem>
          <SelectItem value='system'>Hệ Thống</SelectItem>
          <SelectItem value='security'>Bảo Mật</SelectItem>
          <SelectItem value='performance'>Hiệu Suất</SelectItem>
          <SelectItem value='maintenance'>Bảo Trì</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
