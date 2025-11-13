import { AlertTriangle, Loader2 } from 'lucide-react';

import { useState } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import type { Transaction } from '@/types/transaction';

import { refundTransaction } from '@/services/transactions';

interface TransactionRefundDialogProps {
  transaction: Transaction;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * Dialog component để xử lý hoàn tiền giao dịch
 */
export function TransactionRefundDialog({
  transaction,
  open,
  onClose,
  onSuccess,
}: TransactionRefundDialogProps) {
  const [refundAmount, setRefundAmount] = useState<string>(transaction.amount.toString());
  const [refundReason, setRefundReason] = useState<string>('');
  const [error, setError] = useState<string>('');
  const queryClient = useQueryClient();

  const refundMutation = useMutation({
    mutationFn: (data: { amount?: number; reason?: string }) =>
      refundTransaction(transaction.id, data.amount, data.reason),
    onSuccess: () => {
      // ensure transactions list is refreshed
      queryClient.invalidateQueries({ queryKey: ['transactions'], exact: false });
      onSuccess();
      handleClose();
    },
    onError: (error: Error) => {
      setError(error.message || 'Có lỗi xảy ra khi hoàn tiền');
    },
  });

  const handleClose = () => {
    setRefundAmount(transaction.amount.toString());
    setRefundReason('');
    setError('');
    onClose();
  };

  const handleRefund = () => {
    const amount = parseFloat(refundAmount);

    if (isNaN(amount) || amount <= 0) {
      setError('Số tiền hoàn phải là số dương');
      return;
    }

    if (amount > transaction.amount) {
      setError('Số tiền hoàn không được vượt quá số tiền giao dịch');
      return;
    }

    setError('');
    refundMutation.mutate({
      amount: amount === transaction.amount ? undefined : amount,
      reason: refundReason.trim() || undefined,
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const isFullRefund = parseFloat(refundAmount) === transaction.amount;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className='sm:max-w-[425px]'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2'>
            <AlertTriangle className='h-5 w-5 text-orange-500' />
            Xác nhận hoàn tiền
          </DialogTitle>
          <DialogDescription>
            Bạn đang thực hiện hoàn tiền cho giao dịch #{transaction.id.slice(-8)}
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4'>
          {/* Transaction Info */}
          <div className='bg-muted rounded-lg p-4'>
            <div className='space-y-2 text-sm'>
              <div className='flex justify-between'>
                <span className='text-muted-foreground'>Người dùng:</span>
                <span className='font-medium'>
                  {transaction.user_name || transaction.user_email || 'N/A'}
                </span>
              </div>
              <div className='flex justify-between'>
                <span className='text-muted-foreground'>Gói dịch vụ:</span>
                <span className='font-medium'>
                  {transaction.plan_name || transaction.plan_code}
                </span>
              </div>
              <div className='flex justify-between'>
                <span className='text-muted-foreground'>Số tiền gốc:</span>
                <span className='font-medium'>{formatCurrency(transaction.amount)}</span>
              </div>
              <div className='flex justify-between'>
                <span className='text-muted-foreground'>Phương thức:</span>
                <span className='font-medium capitalize'>
                  {transaction.payment_method.replace('_', ' ')}
                </span>
              </div>
            </div>
          </div>

          {/* Refund Amount */}
          <div className='space-y-2'>
            <Label htmlFor='refund-amount'>Số tiền hoàn (VNĐ)</Label>
            <Input
              id='refund-amount'
              type='number'
              value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)}
              placeholder='Nhập số tiền hoàn'
              min='0'
              max={transaction.amount}
              step='1000'
            />
            <p className='text-muted-foreground text-xs'>
              {isFullRefund ? 'Hoàn tiền toàn bộ' : 'Hoàn tiền một phần'}
            </p>
          </div>

          {/* Refund Reason */}
          <div className='space-y-2'>
            <Label htmlFor='refund-reason'>Lý do hoàn tiền (tùy chọn)</Label>
            <Textarea
              id='refund-reason'
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              placeholder='Nhập lý do hoàn tiền...'
              rows={3}
            />
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant='destructive'>
              <AlertTriangle className='h-4 w-4' />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Warning for full refund */}
          {isFullRefund && (
            <Alert>
              <AlertTriangle className='h-4 w-4' />
              <AlertDescription>
                Bạn đang thực hiện hoàn tiền toàn bộ. Hành động này không thể hoàn tác.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant='outline' onClick={handleClose} disabled={refundMutation.isPending}>
            Hủy
          </Button>
          <Button
            onClick={handleRefund}
            disabled={refundMutation.isPending || !refundAmount}
            className='bg-orange-600 hover:bg-orange-700'
          >
            {refundMutation.isPending && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
            {isFullRefund ? 'Hoàn tiền toàn bộ' : 'Hoàn tiền'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
