import { Camera } from 'lucide-react';

import { useNavigate } from '@tanstack/react-router';

import { Button } from '@/components/ui/button';

import { cn } from '@/lib/utils';

export default function NotFoundUser() {
  const navigate = useNavigate();
  return (
    <div className={cn('flex h-full w-full flex-col items-center justify-center py-16')}>
      <Camera className={cn('text-muted-foreground mb-6 h-20 w-20')} />
      <div className={cn('text-foreground mb-2 text-3xl font-bold')}>Không tìm thấy người dùng</div>
      <div className={cn('text-muted-foreground mb-6')}>
        Vui lòng kiểm tra lại thông tin hoặc quay về danh sách.
      </div>
      <Button
        className={cn('rounded-lg px-6 py-2 font-semibold')}
        onClick={() => navigate({ to: '/users/customer' })}
      >
        Quay về danh sách người dùng
      </Button>
    </div>
  );
}
