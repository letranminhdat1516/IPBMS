import { Header } from '@/components/layout/header';
import { Main } from '@/components/layout/main';

import { ProfileDropdown } from '@/components/profile-dropdown';
import { Search } from '@/components/search';
import { ThemeSwitch } from '@/components/theme-switch';

import { useAuth } from '@/hooks/use-auth';
import { useTransactions } from '@/hooks/use-transactions';

import { cn } from '@/lib/utils';

import { TransactionFiltersComponent } from './components/transaction-filters';
import { TransactionRefundDialog } from './components/transaction-refund-dialog';
import { TransactionStatsCards } from './components/transaction-stats-cards';
import { TransactionTable } from './components/transaction-table';

/**
 * Component chính cho trang quản lý giao dịch (Transaction Management Page)
 *
 * Tính năng chính:
 * - Hiển thị danh sách các giao dịch
 * - Thống kê giao dịch theo trạng thái và phương thức thanh toán
 * - Bộ lọc nâng cao theo nhiều tiêu chí
 * - Chức năng hoàn tiền
 * - Xuất dữ liệu giao dịch
 * - Kiểm tra quyền admin trước khi cho phép truy cập
 */
export default function TransactionPage() {
  // Lấy thông tin user từ auth store
  const { effectiveUser } = useAuth();

  // Kiểm tra quyền admin - chỉ admin mới có thể truy cập trang này
  // Ưu tiên user từ auth store
  const isAdmin = effectiveUser?.role ? effectiveUser.role.toLowerCase().includes('admin') : false;

  // Sử dụng custom hook để quản lý transaction data và operations
  const {
    transactions,
    stats,
    isLoading,
    filters,
    refundDialogOpen,
    selectedTransaction,
    handleFiltersChange,
    handleRefundDialogOpen,
    handleRefundDialogClose,
    refetchAll,
  } = useTransactions(isAdmin);

  /**
   * Xử lý khi xóa bộ lọc
   */
  // handleFiltersClear is now provided by the hook

  /**
   * Xử lý trường hợp user không có quyền admin
   */
  if (!isAdmin) {
    return (
      <Main className={cn('mx-auto max-w-xl p-8')}>
        <div className='text-center'>
          <div className='mb-2 font-semibold text-yellow-600'>Không có quyền truy cập</div>
          <div className='text-muted-foreground text-sm'>
            Bạn cần quyền admin để xem trang quản lý giao dịch.
          </div>
        </div>
      </Main>
    );
  }

  return (
    <Main>
      {/* Header */}
      <Header>
        <div>
          <h1 className='text-2xl font-bold'>Quản lý giao dịch</h1>
          <p className='text-muted-foreground'>Theo dõi và quản lý tất cả giao dịch thanh toán</p>
        </div>
        <div className='ml-auto flex items-center space-x-4'>
          <Search />
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      {/* Stats Cards */}
      <div className='mb-6'>
        <TransactionStatsCards stats={stats} isLoading={isLoading} />
      </div>

      {/* Filters */}
      <div className='mb-6'>
        <TransactionFiltersComponent
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onFiltersClear={() => handleFiltersChange({})}
        />
      </div>

      {/* Transaction Table */}
      <div className='mb-6'>
        <TransactionTable
          transactions={transactions}
          isLoading={isLoading}
          onRefundClick={handleRefundDialogOpen}
        />
      </div>

      {/* Refund Dialog */}
      {selectedTransaction && (
        <TransactionRefundDialog
          transaction={selectedTransaction}
          open={refundDialogOpen}
          onClose={handleRefundDialogClose}
          onSuccess={() => {
            void refetchAll();
          }}
        />
      )}
    </Main>
  );
}
