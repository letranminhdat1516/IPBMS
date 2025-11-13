import React from 'react';

import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

type QuotaItemProps = {
  icon: React.ComponentType<Record<string, unknown>>;
  label: string;
  value: React.ReactNode;
  description?: string;
  bgColor?: string;
  color?: string;
};

export default function QuotaItem({
  icon: Icon,
  label,
  value,
  description,
  bgColor,
  color,
}: QuotaItemProps) {
  return (
    <div className='bg-card hover:bg-accent/50 flex items-center justify-between rounded-lg border p-4 transition-colors'>
      <div className='flex items-center space-x-3'>
        <div className={`rounded-lg p-2 ${bgColor}`}>
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
        <div>
          <p className='text-sm font-medium'>{label}</p>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <p className='text-muted-foreground cursor-help text-xs'>{description}</p>
              </TooltipTrigger>
              <TooltipContent>
                <p>{description}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      <div className='text-right'>
        <Badge variant='secondary' className='font-semibold'>
          {value}
        </Badge>
      </div>
    </div>
  );
}
