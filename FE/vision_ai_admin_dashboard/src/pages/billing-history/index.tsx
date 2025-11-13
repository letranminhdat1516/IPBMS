// import { useState } from 'react';

// import { Header } from '@/components/layout/header';
// import { Main } from '@/components/layout/main';

// import { ProfileDropdown } from '@/components/profile-dropdown';
// import { Search } from '@/components/search';
// import { ThemeSwitch } from '@/components/theme-switch';

// import { useAuth } from '@/hooks/use-auth';

// import { cn } from '@/lib/utils';

// import { BillingHistoryFilters } from './components/billing-history-filters';
// import { BillingHistoryList } from './components/billing-history-list';
// import { BillingHistoryStats } from './components/billing-history-stats';

// /**
//  * Billing History Page
//  *
//  * Hiển thị lịch sử thanh toán cho một user cụ thể
//  * - Admin: Có thể xem billing history của bất kỳ user nào
//  * - Regular user: Chỉ xem billing history của chính họ
//  */
// export default function BillingHistoryPage() {
//   const { effectiveUser } = useAuth();

//   // Lấy userId từ current user (tạm thời, sau này có thể từ URL params)
//   const targetUserId = effectiveUser?.user_id?.toString();

//   // Kiểm tra quyền truy cập
//   const isAdmin = effectiveUser?.role?.toLowerCase().includes('admin');
//   const canView = isAdmin || targetUserId === effectiveUser?.user_id;

//   // State cho filters
//   const [filters, setFilters] = useState<{
//     page: number;
//     limit: number;
//     startDate?: Date;
//     endDate?: Date;
//     status?: 'paid' | 'pending' | 'failed' | 'refunded';
//   }>({
//     page: 1,
//     limit: 20,
//   });

//   // Xử lý thay đổi filters
//   const handleFiltersChange = (newFilters: Partial<typeof filters>) => {
//     setFilters((prev) => ({ ...prev, ...newFilters, page: 1 })); // Reset về page 1 khi filter thay đổi
//   };

//   // Nếu không có quyền truy cập
//   if (!canView || !targetUserId) {
//     return (
//       <Main className={cn('mx-auto max-w-xl p-8')}>
//         <div className='text-center'>
//           <div className='mb-2 font-semibold text-yellow-600'>Không có quyền truy cập</div>
//           <div className='text-muted-foreground text-sm'>
//             Bạn không có quyền xem lịch sử thanh toán này.
//           </div>
//         </div>
//       </Main>
//     );
//   }

//   return (
//     <Main>
//       {/* Header */}
//       <Header>
//         <div>
//           <h1 className='text-2xl font-bold'>Lịch sử thanh toán</h1>
//           <p className='text-muted-foreground'>Theo dõi lịch sử thanh toán và hóa đơn</p>
//         </div>
//         <div className='ml-auto flex items-center space-x-4'>
//           <Search />
//           <ThemeSwitch />
//           <ProfileDropdown />
//         </div>
//       </Header>

//       {/* Stats Cards */}
//       <div className='mb-6'>
//         <BillingHistoryStats userId={targetUserId} />
//       </div>

//       {/* Filters */}
//       <div className='mb-6'>
//         <BillingHistoryFilters filters={filters} onFiltersChange={handleFiltersChange} />
//       </div>

//       {/* Billing History List */}
//       <BillingHistoryList
//         userId={targetUserId}
//         filters={filters}
//         onFiltersChange={handleFiltersChange}
//       />
//     </Main>
//   );
// }
