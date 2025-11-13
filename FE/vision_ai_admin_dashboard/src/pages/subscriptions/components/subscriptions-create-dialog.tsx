import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface SubscriptionsCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SubscriptionsCreateDialog({ open, onOpenChange }: SubscriptionsCreateDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Thêm gói đăng ký mới</DialogTitle>
          <DialogDescription>Tạo gói đăng ký mới cho khách hàng.</DialogDescription>
        </DialogHeader>
        <div className='py-4'>
          {/* Form content will be added later */}
          <p>Form tạo gói đăng ký sẽ được thêm vào đây.</p>
        </div>
        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button onClick={() => onOpenChange(false)}>Tạo</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
