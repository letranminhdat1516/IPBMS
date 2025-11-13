import { getInitials, truncate } from '@/utils';
import { Mail, MapPin, Phone, ShieldCheck, UserCircle2 } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

import { cn, maskEmail, maskPhoneNumber } from '@/lib/utils';

import type { User } from '@/types/user';

export type UserStatus = 'active' | 'inactive' | string;

export function UserStatusBadge({ status }: { status: UserStatus }) {
  return (
    <Badge
      variant={status === 'inactive' ? 'secondary' : status === 'active' ? 'outline' : 'outline'}
      className={cn(
        'px-3 py-1 text-xs',
        status === 'active' && 'border-green-200 bg-green-100 text-green-700',
        status === 'inactive' && 'border-gray-200 bg-gray-100 text-gray-700'
      )}
    >
      {status === 'active' && <ShieldCheck className='mr-1 inline h-4 w-4' />} {status}
    </Badge>
  );
}

export function UserInfoCard({ user }: { user: User }) {
  // Giả lập dữ liệu bổ sung cho demo giao diện
  const address = user.address || '-';
  const age = user.age || '-';
  const role = user.role || '-';

  return (
    <Card className='mb-6 flex flex-col gap-4 p-4 md:flex-row md:items-center md:gap-6'>
      {/* Avatar */}
      <div className='flex min-w-[100px] flex-col items-center justify-center'>
        <Avatar className='border-border h-20 w-20 border-2'>
          <AvatarImage alt={user.username} />
          <AvatarFallback className='bg-muted text-muted-foreground'>
            {getInitials(user.username)}
          </AvatarFallback>
        </Avatar>
      </div>
      {/* Info */}
      <div className='flex flex-1 flex-col gap-2 md:flex-row md:items-center md:justify-between'>
        <div className='flex flex-col gap-1'>
          <div className='flex items-center gap-2'>
            <span className='text-xl font-bold'>{user.username}</span>
            <Badge variant='secondary' className='px-2 py-0.5 text-[11px] font-semibold'>
              {role}
            </Badge>
            {/* <UserStatusBadge status={user.status} /> */}
          </div>
          <div className='text-muted-foreground mt-1 flex flex-wrap items-center gap-4 text-sm'>
            <span className='flex items-center gap-1'>
              <Phone className='h-4 w-4' />
              {user.phone ? maskPhoneNumber(user.phone) : '0123 *** ****'}
            </span>
            <span className='flex items-center gap-1'>
              <Mail className='h-4 w-4' />
              {user.email ? maskEmail(user.email) : 'user***@domain.com'}
            </span>
            <span className='flex items-center gap-1'>
              <MapPin className='h-4 w-4' />
              {address !== '-' ? truncate(address as string, 10) : address}
            </span>
            <span className='flex items-center gap-1'>
              <UserCircle2 className='h-4 w-4' />
              Tuổi:{' '}
              {age !== '-'
                ? (() => {
                    const ageStr = String(age);
                    const ageNum = parseInt(ageStr);
                    if (isNaN(ageNum)) return age;
                    const decade = Math.floor(ageNum / 10) * 10;
                    return `${decade}-${decade + 9}`;
                  })()
                : age}
            </span>
            {/* <span className='flex items-center gap-1'>
              <Calendar className='h-4 w-4' />
              Tham gia: {joined}
            </span> */}
          </div>
        </div>
        <div className='flex min-w-[160px] flex-col items-end gap-2'>
          <div className='text-right'>
            <span className='text-muted-foreground block text-xs'>ID Khách hàng</span>
            <span className='font-mono text-lg font-bold'>
              KH{String(user.user_id).padStart(6, '0')}
            </span>
          </div>
          {/* {isPremium && (
            <Badge
              variant='outline'
              className='rounded-full px-3 py-1 text-xs font-semibold text-blue-700 dark:text-blue-300'
            >
              Premium Care
            </Badge>
          )} */}
        </div>
      </div>
    </Card>
  );
}
