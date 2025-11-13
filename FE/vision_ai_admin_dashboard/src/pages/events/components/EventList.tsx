import { Camera } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import { PaginationBar } from '@/components/pagination-bar';

import { formatDateTimeVN } from '@/utils/date';

import { type EventItem } from '@/services/events';

import { severityConfig, statusConfig } from '../constants';
import { formatConfidence, getEventTypeIcon } from '../utils/eventHelpers';

interface EventListProps {
  events: EventItem[];
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export function EventList({ events, total, page, pageSize, onPageChange }: EventListProps) {
  return (
    <div className='space-y-4'>
      {events.map((event: EventItem) => {
        const severity = event.severity || 'low';
        const status = event.status || 'pending';
        const SeverityIcon =
          severityConfig[severity as keyof typeof severityConfig]?.icon || Camera;
        const EventTypeIcon = getEventTypeIcon(event.event_type);

        return (
          <div
            key={event.event_id}
            className='hover:bg-muted/50 flex items-start gap-4 rounded-lg border p-4'
          >
            <div className='flex-shrink-0'>
              <div className='flex items-center gap-2'>
                <SeverityIcon className='text-muted-foreground h-5 w-5' />
                <EventTypeIcon className='text-muted-foreground h-4 w-4' />
              </div>
            </div>
            <div className='flex-1 space-y-2'>
              <div className='flex items-center gap-2'>
                <Badge
                  variant='outline'
                  className={severityConfig[severity as keyof typeof severityConfig]?.color}
                >
                  {severity}
                </Badge>
                <Badge
                  variant='outline'
                  className={statusConfig[status as keyof typeof statusConfig]?.color}
                >
                  {status}
                </Badge>
                <span className='text-muted-foreground text-sm'>
                  {formatDateTimeVN(event.detected_at)}
                </span>
              </div>
              <div className='flex items-center gap-4 text-sm'>
                <span className='font-medium'>{event.event_type}</span>
                <span className='text-muted-foreground'>
                  Độ tin cậy: {formatConfidence(event.confidence_score)}
                </span>
                {event.camera_id && (
                  <span className='text-muted-foreground flex items-center gap-1'>
                    <Camera className='h-3 w-3' />
                    Camera {event.camera_id}
                  </span>
                )}
              </div>
              {event.context_data && (
                <div className='text-muted-foreground text-xs'>
                  {JSON.stringify(event.context_data, null, 2)}
                </div>
              )}
            </div>
            <div className='flex-shrink-0'>
              <Button variant='ghost' size='sm'>
                Xem chi tiết
              </Button>
            </div>
          </div>
        );
      })}
      <PaginationBar page={page} pageSize={pageSize} total={total} onPageChange={onPageChange} />
    </div>
  );
}
