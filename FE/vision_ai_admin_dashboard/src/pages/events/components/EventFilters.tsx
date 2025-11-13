import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface EventFiltersProps {
  severityFilter: string;
  statusFilter: string;
  typeFilter: string;
  onSeverityChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onTypeChange: (value: string) => void;
}

export function EventFilters({
  severityFilter,
  statusFilter,
  typeFilter,
  onSeverityChange,
  onStatusChange,
  onTypeChange,
}: EventFiltersProps) {
  return (
    <div className='flex gap-2'>
      <Select value={severityFilter} onValueChange={onSeverityChange}>
        <SelectTrigger className='w-32'>
          <SelectValue placeholder='Mức độ' />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='all'>Tất cả mức độ</SelectItem>
          <SelectItem value='low'>Thấp</SelectItem>
          <SelectItem value='medium'>Trung bình</SelectItem>
          <SelectItem value='high'>Cao</SelectItem>
          <SelectItem value='critical'>Nghiêm trọng</SelectItem>
        </SelectContent>
      </Select>
      <Select value={statusFilter} onValueChange={onStatusChange}>
        <SelectTrigger className='w-32'>
          <SelectValue placeholder='Trạng thái' />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='all'>Tất cả trạng thái</SelectItem>
          <SelectItem value='pending'>Chờ xử lý</SelectItem>
          <SelectItem value='acknowledged'>Đã xác nhận</SelectItem>
          <SelectItem value='resolved'>Đã giải quyết</SelectItem>
          <SelectItem value='dismissed'>Đã bỏ qua</SelectItem>
        </SelectContent>
      </Select>
      <Select value={typeFilter} onValueChange={onTypeChange}>
        <SelectTrigger className='w-32'>
          <SelectValue placeholder='Loại' />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='all'>Tất cả loại</SelectItem>
          <SelectItem value='fall_detection'>Phát hiện té ngã</SelectItem>
          <SelectItem value='motion'>Chuyển động</SelectItem>
          <SelectItem value='intrusion'>Xâm nhập</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
