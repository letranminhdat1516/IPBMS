import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import type { Subscription } from '@/types/subscription';

interface SubscriptionsEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscription: Subscription;
}

export function SubscriptionsEditDialog({
  open,
  onOpenChange,
  subscription,
}: SubscriptionsEditDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Chỉnh sửa gói đăng ký</DialogTitle>
          <DialogDescription>
            Chỉnh sửa thông tin gói đăng ký {subscription.subscription_id}.
          </DialogDescription>
        </DialogHeader>
        <div className='py-4'>
          {/* Form content will be added later */}
          <p>Form chỉnh sửa gói đăng ký sẽ được thêm vào đây.</p>
        </div>
        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button onClick={() => onOpenChange(false)}>Lưu</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
