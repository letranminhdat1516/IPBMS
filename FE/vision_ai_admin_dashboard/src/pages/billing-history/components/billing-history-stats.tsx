// import { useMemo } from 'react';

// import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// import { useBillingHistory } from '@/hooks/use-billing-history';

// interface BillingHistoryStatsProps {
//   userId: string;
// }

// export function BillingHistoryStats({ userId }: BillingHistoryStatsProps) {
//   // Lấy tất cả billing history để tính stats
//   const { data, isLoading } = useBillingHistory({
//     userId,
//     page: 1,
//     limit: 1000, // Lấy nhiều để tính stats
//   });

//   const stats = useMemo(() => {
//     if (!data?.data) {
//       return {
//         totalPayments: 0,
//         totalAmount: 0,
//         paidPayments: 0,
//         pendingPayments: 0,
//         failedPayments: 0,
//         refundedPayments: 0,
//       };
//     }

//     const payments = data.data;
//     const totalPayments = payments.length;
//     const totalAmount = payments.reduce((sum, payment) => sum + payment.amount, 0);
//     const paidPayments = payments.filter((p) => p.status === 'paid').length;
//     const pendingPayments = payments.filter((p) => p.status === 'pending').length;
//     const failedPayments = payments.filter((p) => p.status === 'failed').length;
//     const refundedPayments = payments.filter((p) => p.status === 'refunded').length;

//     return {
//       totalPayments,
//       totalAmount,
//       paidPayments,
//       pendingPayments,
//       failedPayments,
//       refundedPayments,
//     };
//   }, [data]);

//   if (isLoading) {
//     return (
//       <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
//         {[...Array(4)].map((_, i) => (
//           <Card key={i}>
//             <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
//               <CardTitle className='text-sm font-medium'>
//                 <div className='h-4 animate-pulse rounded bg-gray-200' />
//               </CardTitle>
//             </CardHeader>
//             <CardContent>
//               <div className='mb-1 h-8 animate-pulse rounded bg-gray-200' />
//               <div className='h-3 w-2/3 animate-pulse rounded bg-gray-200' />
//             </CardContent>
//           </Card>
//         ))}
//       </div>
//     );
//   }

//   return (
//     <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
//       <Card>
//         <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
//           <CardTitle className='text-sm font-medium'>Tổng thanh toán</CardTitle>
//         </CardHeader>
//         <CardContent>
//           <div className='text-2xl font-bold'>{stats.totalPayments}</div>
//           <p className='text-muted-foreground text-xs'>Tổng số giao dịch</p>
//         </CardContent>
//       </Card>

//       <Card>
//         <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
//           <CardTitle className='text-sm font-medium'>Tổng tiền</CardTitle>
//         </CardHeader>
//         <CardContent>
//           <div className='text-2xl font-bold'>{stats.totalAmount.toLocaleString('vi-VN')} VND</div>
//           <p className='text-muted-foreground text-xs'>Tổng giá trị thanh toán</p>
//         </CardContent>
//       </Card>

//       <Card>
//         <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
//           <CardTitle className='text-sm font-medium'>Đã thanh toán</CardTitle>
//         </CardHeader>
//         <CardContent>
//           <div className='text-2xl font-bold text-green-600'>{stats.paidPayments}</div>
//           <p className='text-muted-foreground text-xs'>Giao dịch thành công</p>
//         </CardContent>
//       </Card>

//       <Card>
//         <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
//           <CardTitle className='text-sm font-medium'>Đang xử lý</CardTitle>
//         </CardHeader>
//         <CardContent>
//           <div className='text-2xl font-bold text-yellow-600'>{stats.pendingPayments}</div>
//           <p className='text-muted-foreground text-xs'>Chưa hoàn tất</p>
//         </CardContent>
//       </Card>
//     </div>
//   );
// }
