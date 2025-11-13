// import { format } from 'date-fns';
// import { CalendarIcon } from 'lucide-react';

// import { useState } from 'react';

// import { Button } from '@/components/ui/button';
// import { Calendar } from '@/components/ui/calendar';
// import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from '@/components/ui/select';

// import { cn } from '@/lib/utils';

// interface BillingHistoryFiltersProps {
//   filters: {
//     page: number;
//     limit: number;
//     startDate?: Date;
//     endDate?: Date;
//     status?: 'paid' | 'pending' | 'failed' | 'refunded';
//   };
//   onFiltersChange: (filters: Partial<BillingHistoryFiltersProps['filters']>) => void;
// }

// export function BillingHistoryFilters({ filters, onFiltersChange }: BillingHistoryFiltersProps) {
//   const [startDateOpen, setStartDateOpen] = useState(false);
//   const [endDateOpen, setEndDateOpen] = useState(false);

//   return (
//     <div className='flex flex-wrap gap-4'>
//       {/* Date Range Filter */}
//       <div className='flex items-center gap-2'>
//         <span className='text-sm font-medium'>Từ ngày:</span>
//         <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
//           <PopoverTrigger asChild>
//             <Button
//               variant='outline'
//               className={cn(
//                 'w-[140px] justify-start text-left font-normal',
//                 !filters.startDate && 'text-muted-foreground'
//               )}
//             >
//               <CalendarIcon className='mr-2 h-4 w-4' />
//               {filters.startDate ? format(filters.startDate, 'dd/MM/yyyy') : 'Chọn ngày'}
//             </Button>
//           </PopoverTrigger>
//           <PopoverContent className='w-auto p-0' align='start'>
//             <Calendar
//               mode='single'
//               selected={filters.startDate}
//               onSelect={(date) => {
//                 onFiltersChange({ startDate: date });
//                 setStartDateOpen(false);
//               }}
//               initialFocus
//             />
//           </PopoverContent>
//         </Popover>
//       </div>

//       <div className='flex items-center gap-2'>
//         <span className='text-sm font-medium'>Đến ngày:</span>
//         <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
//           <PopoverTrigger asChild>
//             <Button
//               variant='outline'
//               className={cn(
//                 'w-[140px] justify-start text-left font-normal',
//                 !filters.endDate && 'text-muted-foreground'
//               )}
//             >
//               <CalendarIcon className='mr-2 h-4 w-4' />
//               {filters.endDate ? format(filters.endDate, 'dd/MM/yyyy') : 'Chọn ngày'}
//             </Button>
//           </PopoverTrigger>
//           <PopoverContent className='w-auto p-0' align='start'>
//             <Calendar
//               mode='single'
//               selected={filters.endDate}
//               onSelect={(date) => {
//                 onFiltersChange({ endDate: date });
//                 setEndDateOpen(false);
//               }}
//               initialFocus
//             />
//           </PopoverContent>
//         </Popover>
//       </div>

//       {/* Status Filter */}
//       <div className='flex items-center gap-2'>
//         <span className='text-sm font-medium'>Trạng thái:</span>
//         <Select
//           value={filters.status || 'all'}
//           onValueChange={(value) =>
//             onFiltersChange({
//               status:
//                 value === 'all' ? undefined : (value as 'paid' | 'pending' | 'failed' | 'refunded'),
//             })
//           }
//         >
//           <SelectTrigger className='w-[120px]'>
//             <SelectValue placeholder='Tất cả' />
//           </SelectTrigger>
//           <SelectContent>
//             <SelectItem value='all'>Tất cả</SelectItem>
//             <SelectItem value='paid'>Đã thanh toán</SelectItem>
//             <SelectItem value='pending'>Đang xử lý</SelectItem>
//             <SelectItem value='failed'>Thất bại</SelectItem>
//             <SelectItem value='refunded'>Đã hoàn tiền</SelectItem>
//           </SelectContent>
//         </Select>
//       </div>

//       {/* Clear Filters Button */}
//       <Button
//         variant='outline'
//         onClick={() =>
//           onFiltersChange({
//             startDate: undefined,
//             endDate: undefined,
//             status: undefined,
//             page: 1,
//           })
//         }
//         className='ml-auto'
//       >
//         Xóa bộ lọc
//       </Button>
//     </div>
//   );
// }
