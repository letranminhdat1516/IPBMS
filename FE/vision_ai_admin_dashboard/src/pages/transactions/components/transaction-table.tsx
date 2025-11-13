import { ChevronLeft, ChevronRight, Download, RotateCcw } from 'lucide-react';

import { useState } from 'react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import type { Transaction } from '@/types/transaction';

interface TransactionTableProps {
  transactions: Transaction[];
  isLoading: boolean;
  onRefundClick: (transaction: Transaction) => void;
}

/**
 * Component bảng hiển thị danh sách giao dịch
 */
export function TransactionTable({
  transactions,
  isLoading,
  onRefundClick,
}: TransactionTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const formatCurrency = (amount: number, currency: string = 'VND') => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: Transaction['status']) => {
    const statusConfig = {
      pending: { label: 'Đang xử lý', variant: 'secondary' as const },
      completed: { label: 'Hoàn thành', variant: 'default' as const },
      failed: { label: 'Thất bại', variant: 'destructive' as const },
      refunded: { label: 'Đã hoàn tiền', variant: 'outline' as const },
      cancelled: { label: 'Đã hủy', variant: 'outline' as const },
    };

    const config = statusConfig[status];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getPaymentMethodLabel = (method: Transaction['payment_method']) => {
    const methodLabels = {
      stripe: 'Stripe',
      paypal: 'PayPal',
      bank_transfer: 'Chuyển khoản',
      credit_card: 'Thẻ tín dụng',
      other: 'Khác',
    };

    return methodLabels[method] || method;
  };

  const canRefund = (transaction: Transaction) => {
    return transaction.status === 'completed' && !transaction.refunded_at;
  };

  const getUserInitials = (userName?: string, userEmail?: string) => {
    if (userName && userName !== 'N/A') {
      return userName
        .split(' ')
        .map((name) => name.charAt(0))
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    if (userEmail) {
      return userEmail.charAt(0).toUpperCase();
    }
    return 'U';
  };

  // Pagination logic
  const totalPages = Math.ceil(transactions.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedTransactions = transactions.slice(startIndex, startIndex + pageSize);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Danh sách giao dịch</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='space-y-4'>
            {Array.from({ length: pageSize }).map((_, i) => (
              <div key={i} className='flex items-center space-x-4'>
                <div className='bg-muted h-4 w-24 animate-pulse rounded' />
                <div className='bg-muted h-4 w-32 animate-pulse rounded' />
                <div className='bg-muted h-4 w-20 animate-pulse rounded' />
                <div className='bg-muted h-4 w-16 animate-pulse rounded' />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className='flex items-center justify-between'>
          <CardTitle>Danh sách giao dịch</CardTitle>
          <Button variant='outline' size='sm'>
            <Download className='mr-2 h-4 w-4' />
            Xuất Excel
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className='rounded-md border'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Người dùng</TableHead>
                <TableHead>Gói dịch vụ</TableHead>
                <TableHead>Số tiền</TableHead>
                <TableHead>Phương thức</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Ngày tạo</TableHead>
                <TableHead className='text-right'>Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className='text-muted-foreground py-8 text-center'>
                    Không có giao dịch nào
                  </TableCell>
                </TableRow>
              ) : (
                paginatedTransactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell className='font-mono text-sm'>{transaction.id.slice(-8)}</TableCell>
                    <TableCell>
                      <div className='flex items-center space-x-3'>
                        <Avatar className='h-8 w-8'>
                          <AvatarFallback className='text-xs'>
                            {getUserInitials(transaction.user_name, transaction.user_email)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className='font-medium'>{transaction.user_name || 'N/A'}</div>
                          <div className='text-muted-foreground text-sm'>
                            {transaction.user_email || transaction.user_id.slice(-8)}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{transaction.plan_name || transaction.plan_code}</TableCell>
                    <TableCell className='font-medium'>
                      {formatCurrency(transaction.amount, transaction.currency)}
                    </TableCell>
                    <TableCell>{getPaymentMethodLabel(transaction.payment_method)}</TableCell>
                    <TableCell>{getStatusBadge(transaction.status)}</TableCell>
                    <TableCell className='text-sm'>{formatDate(transaction.created_at)}</TableCell>
                    <TableCell className='text-right'>
                      {canRefund(transaction) && (
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() => onRefundClick(transaction)}
                        >
                          <RotateCcw className='mr-2 h-4 w-4' />
                          Hoàn tiền
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {transactions.length > 0 && (
          <div className='flex items-center justify-between px-2 py-4'>
            <div className='flex items-center space-x-2'>
              <p className='text-sm font-medium'>Hiển thị</p>
              <Select
                value={pageSize.toString()}
                onValueChange={(value) => {
                  setPageSize(Number(value));
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className='h-8 w-[70px]'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='10'>10</SelectItem>
                  <SelectItem value='20'>20</SelectItem>
                  <SelectItem value='50'>50</SelectItem>
                </SelectContent>
              </Select>
              <p className='text-sm font-medium'>kết quả</p>
            </div>

            <div className='flex items-center space-x-2'>
              <Button
                variant='outline'
                size='sm'
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className='h-4 w-4' />
                Trước
              </Button>

              <div className='flex items-center space-x-1'>
                <span className='text-sm'>Trang</span>
                <span className='font-medium'>{currentPage}</span>
                <span className='text-sm'>/</span>
                <span className='text-sm'>{totalPages}</span>
              </div>

              <Button
                variant='outline'
                size='sm'
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                Sau
                <ChevronRight className='h-4 w-4' />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
