// import { format } from 'date-fns';
// import { ExternalLink, FileText } from 'lucide-react';

// import { Button } from '@/components/ui/button';
// import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// import {
//   Table,
//   TableBody,
//   TableCell,
//   TableHead,
//   TableHeader,
//   TableRow,
// } from '@/components/ui/table';

// import { useBillingHistory } from '@/hooks/use-billing-history';
// import { useGenerateInvoice } from '@/hooks/use-transactions';

// import { cn } from '@/lib/utils';

// import type { BillingHistoryItem } from '@/services/transactions';

// interface BillingHistoryListProps {
//   userId: string;
//   filters: {
//     page: number;
//     limit: number;
//     startDate?: Date;
//     endDate?: Date;
//     status?: 'paid' | 'pending' | 'failed' | 'refunded';
//   };
//   onFiltersChange: (filters: Partial<BillingHistoryListProps['filters']>) => void;
// }

// export function BillingHistoryList({ userId, filters, onFiltersChange }: BillingHistoryListProps) {
//   const { data, isLoading, error } = useBillingHistory({
//     userId,
//     ...filters,
//     startDate: filters.startDate?.toISOString(),
//     endDate: filters.endDate?.toISOString(),
//   });

//   const generateInvoiceMutation = useGenerateInvoice();

//   const handleGenerateInvoice = async (transactionId: string) => {
//     try {
//       const result = await generateInvoiceMutation.mutateAsync(transactionId);
//       if (result.downloadUrl) {
//         window.open(result.downloadUrl, '_blank');
//       }
//     } catch (_error) {
//       // Error is handled by the mutation's error state
//     }
//   };

//   const getStatusColor = (status: string) => {
//     switch (status) {
//       case 'paid':
//         return 'text-green-600 bg-green-50';
//       case 'pending':
//         return 'text-yellow-600 bg-yellow-50';
//       case 'failed':
//         return 'text-red-600 bg-red-50';
//       case 'refunded':
//         return 'text-blue-600 bg-blue-50';
//       default:
//         return 'text-gray-600 bg-gray-50';
//     }
//   };

//   const getStatusText = (status: string) => {
//     switch (status) {
//       case 'paid':
//         return 'Đã thanh toán';
//       case 'pending':
//         return 'Đang xử lý';
//       case 'failed':
//         return 'Thất bại';
//       case 'refunded':
//         return 'Đã hoàn tiền';
//       default:
//         return status;
//     }
//   };

//   if (error) {
//     return (
//       <Card>
//         <CardContent className='p-6'>
//           <div className='text-center text-red-600'>
//             Có lỗi xảy ra khi tải lịch sử thanh toán: {error.message}
//           </div>
//         </CardContent>
//       </Card>
//     );
//   }

//   return (
//     <Card>
//       <CardHeader>
//         <CardTitle>Lịch sử thanh toán</CardTitle>
//       </CardHeader>
//       <CardContent>
//         {isLoading ? (
//           <div className='space-y-4'>
//             {[...Array(5)].map((_, i) => (
//               <div key={i} className='h-16 animate-pulse rounded bg-gray-100' />
//             ))}
//           </div>
//         ) : data?.data.length === 0 ? (
//           <div className='text-muted-foreground py-8 text-center'>
//             Không có lịch sử thanh toán nào.
//           </div>
//         ) : (
//           <>
//             <Table>
//               <TableHeader>
//                 <TableRow>
//                   <TableHead>Ngày</TableHead>
//                   <TableHead>Mô tả</TableHead>
//                   <TableHead>Số tiền</TableHead>
//                   <TableHead>Trạng thái</TableHead>
//                   <TableHead>Phương thức</TableHead>
//                   <TableHead>Hóa đơn</TableHead>
//                   <TableHead>Thao tác</TableHead>
//                 </TableRow>
//               </TableHeader>
//               <TableBody>
//                 {data?.data.map((item: BillingHistoryItem) => (
//                   <TableRow key={item.id}>
//                     <TableCell>{format(new Date(item.date), 'dd/MM/yyyy HH:mm')}</TableCell>
//                     <TableCell>
//                       <div>
//                         <div className='font-medium'>{item.description}</div>
//                         {item.plan_name && (
//                           <div className='text-muted-foreground text-sm'>{item.plan_name}</div>
//                         )}
//                       </div>
//                     </TableCell>
//                     <TableCell>
//                       <div className='font-medium'>
//                         {item.amount.toLocaleString('vi-VN')} {item.currency}
//                       </div>
//                     </TableCell>
//                     <TableCell>
//                       <span
//                         className={cn(
//                           'inline-flex items-center rounded-full px-2 py-1 text-xs font-medium',
//                           getStatusColor(item.status)
//                         )}
//                       >
//                         {getStatusText(item.status)}
//                       </span>
//                     </TableCell>
//                     <TableCell>
//                       {item.payment_method ? (
//                         <span className='capitalize'>{item.payment_method.replace('_', ' ')}</span>
//                       ) : (
//                         <span className='text-muted-foreground'>N/A</span>
//                       )}
//                     </TableCell>
//                     <TableCell>
//                       {item.invoice_url ? (
//                         <Button
//                           variant='ghost'
//                           size='sm'
//                           onClick={() => window.open(item.invoice_url, '_blank')}
//                         >
//                           <ExternalLink className='mr-1 h-4 w-4' />
//                           Xem
//                         </Button>
//                       ) : (
//                         <span className='text-muted-foreground'>N/A</span>
//                       )}
//                     </TableCell>
//                     <TableCell>
//                       {!item.invoice_url && item.status === 'paid' && (
//                         <Button
//                           variant='outline'
//                           size='sm'
//                           onClick={() => handleGenerateInvoice(item.id)}
//                           disabled={generateInvoiceMutation.isPending}
//                         >
//                           <FileText className='mr-1 h-4 w-4' />
//                           {generateInvoiceMutation.isPending ? 'Đang tạo...' : 'Tạo hóa đơn'}
//                         </Button>
//                       )}
//                     </TableCell>
//                   </TableRow>
//                 ))}
//               </TableBody>
//             </Table>

//             {/* Pagination */}
//             {data && data.pagination.total_pages > 1 && (
//               <div className='mt-4 flex items-center justify-between'>
//                 <div className='text-muted-foreground text-sm'>
//                   Hiển thị {(data.pagination.page - 1) * data.pagination.limit + 1} -{' '}
//                   {Math.min(data.pagination.page * data.pagination.limit, data.pagination.total)}{' '}
//                   của {data.pagination.total} kết quả
//                 </div>
//                 <div className='flex items-center space-x-2'>
//                   <Button
//                     variant='outline'
//                     size='sm'
//                     onClick={() => onFiltersChange({ page: filters.page - 1 })}
//                     disabled={filters.page <= 1}
//                   >
//                     Trước
//                   </Button>
//                   <span className='text-sm'>
//                     Trang {data.pagination.page} / {data.pagination.total_pages}
//                   </span>
//                   <Button
//                     variant='outline'
//                     size='sm'
//                     onClick={() => onFiltersChange({ page: filters.page + 1 })}
//                     disabled={filters.page >= data.pagination.total_pages}
//                   >
//                     Sau
//                   </Button>
//                 </div>
//               </div>
//             )}
//           </>
//         )}
//       </CardContent>
//     </Card>
//   );
// }
