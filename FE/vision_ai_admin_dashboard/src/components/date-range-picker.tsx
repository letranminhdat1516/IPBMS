import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { DateRange } from 'react-day-picker';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

type Props = {
  selected: DateRange | undefined;
  onSelect: (range: DateRange | undefined) => void;
  placeholder?: string;
  numberOfMonths?: number;
};

export function DateRangePicker({
  selected,
  onSelect,
  placeholder = 'Chọn khoảng thời gian',
  numberOfMonths = 2,
}: Props) {
  const label = selected?.from
    ? selected?.to
      ? `${format(selected.from, 'dd/MM/yyyy')} - ${format(selected.to, 'dd/MM/yyyy')}`
      : `${format(selected.from, 'dd/MM/yyyy')}`
    : undefined;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant='outline'
          data-empty={!label}
          aria-label={`Chọn khoảng thời gian${label ? `: ${label}` : ''}`}
          className='data-[empty=true]:text-muted-foreground w-[280px] justify-start text-left font-normal'
        >
          {label ?? <span>{placeholder}</span>}
          <CalendarIcon className='ml-auto h-4 w-4 opacity-50' />
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-auto p-0' align='start'>
        <Calendar
          mode='range'
          captionLayout='dropdown'
          selected={selected}
          onSelect={onSelect}
          numberOfMonths={numberOfMonths}
          disabled={(date: Date) => date > new Date() || date < new Date('1900-01-01')}
        />
      </PopoverContent>
    </Popover>
  );
}

export default DateRangePicker;
