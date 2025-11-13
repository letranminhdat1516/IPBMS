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

interface SubscriptionsDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscription: Subscription;
}

export function SubscriptionsDeleteDialog({
  open,
  onOpenChange,
  subscription,
}: SubscriptionsDeleteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Xóa gói đăng ký</DialogTitle>
          <DialogDescription>
            Bạn có chắc chắn muốn xóa gói đăng ký {subscription.subscription_id}? Hành động này
            không thể hoàn tác.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button variant='destructive' onClick={() => onOpenChange(false)}>
            Xóa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
