import { useEffect, useMemo } from 'react';

import { useQuery } from '@tanstack/react-query';

import { Header } from '@/components/layout/header';
import { Main } from '@/components/layout/main';

import { Switch } from '@/components/ui/switch';

import { ProfileDropdown } from '@/components/profile-dropdown';
import { Search } from '@/components/search';
import { ThemeSwitch } from '@/components/theme-switch';

import { useAuth } from '@/hooks/use-auth';

import { cn } from '@/lib/utils';

import type { Plan, PlanWithVersions } from '@/types/plan';

import { getAllPlansWithAllVersions, getPlans } from '@/services/adminPlan';

import { planColumns } from './components/plan-columns';
import { PlanDeleteDialog } from './components/plan-delete-dialog';
import { PlanDialog } from './components/plan-dialog';
import { PlanPrimaryButtons } from './components/plan-primary-buttons';
import { PlanTable } from './components/plan-table';
import { PlanVersionHistoryDialog } from './components/plan-version-history-dialog';
import PlanProvider, { usePlan } from './context/plan-context';

/**
 * Component nội bộ để sử dụng PlanContext và thiết lập refetch function
 */
function PlanPageContent() {
  // Lấy thông tin user từ context để kiểm tra quyền
  const { effectiveUser } = useAuth();

  // Lấy các functions từ PlanContext
  const { open, setOpen, currentRow, showVersions, setShowVersions, setRefetch } = usePlan();

  // Kiểm tra quyền admin - chỉ admin mới có thể truy cập trang này
  const isAdmin = effectiveUser?.role ? effectiveUser.role.toLowerCase().includes('admin') : false;

  /**
   * Query để lấy dữ liệu plans từ API
   */
  const plansQuery = useQuery<Plan[] | PlanWithVersions[]>({
    queryKey: ['plans', showVersions],
    queryFn: async (): Promise<Plan[] | PlanWithVersions[]> => {
      if (showVersions) {
        const response = await getAllPlansWithAllVersions();
        return response || [];
      } else {
        const response = await getPlans();
        return response || [];
      }
    },
    enabled: isAdmin,
  });

  // Thiết lập refetch function trong context khi component mount
  useEffect(() => {
    setRefetch(() => plansQuery.refetch);
  }, [plansQuery.refetch, setRefetch]);

  /**
   * Transform dữ liệu để hiển thị trên bảng
   */
  const tableData = useMemo(() => {
    if (!plansQuery.data) return [];

    if (showVersions) {
      // Khi hiển thị versions, mỗi version sẽ là một hàng riêng biệt
      const versionRows: Plan[] = [];

      (plansQuery.data as PlanWithVersions[]).forEach((plan) => {
        if (plan.versions && plan.versions.length > 0) {
          // Tạo một hàng cho mỗi phiên bản của plan
          plan.versions.forEach((version) => {
            versionRows.push({
              // Sử dụng version.id làm ID chính cho row
              id: version.id,
              // Tên hiển thị: "Tên Plan (vPhiên bản)"
              name: `${plan.name} (v${version.version})`,
              // Code hiển thị: "code_vPhiên bản"
              code: `${plan.code}_v${version.version}`,
              // Các thuộc tính từ version
              price: version.price,
              camera_quota: version.camera_quota,
              retention_days: version.retention_days,
              caregiver_seats: version.caregiver_seats,
              sites: version.sites,
              major_updates_months: version.major_updates_months || 12,
              created_at: version.created_at,
              updated_at: version.updated_at,
              // Trạng thái phiên bản
              is_current: version.is_current,
              effective_from: version.effective_from,
              effective_to: version.effective_to,
              version: version.version,
              // Thông tin plan gốc để tham khảo
              parent_code: plan.code,
            });
          });
        }
      });
      return versionRows;
    } else {
      // Khi không hiển thị versions, trả về dữ liệu plans gốc
      return (plansQuery.data as Plan[]).map((plan) => ({
        ...plan,
        major_updates_months: plan.major_updates_months || 12, // Giá trị mặc định 12 tháng
      }));
    }
  }, [plansQuery.data, showVersions]);

  /**
   * Xử lý trường hợp user không có quyền admin
   */
  if (!isAdmin) {
    return (
      <Main className={cn('mx-auto max-w-xl p-8')}>
        <div className='text-center'>
          <div className='mb-2 font-semibold text-yellow-600'>Không có quyền truy cập</div>
          <div className='text-muted-foreground text-sm'>
            Bạn cần quyền admin để xem trang quản lý gói dịch vụ.
          </div>
        </div>
      </Main>
    );
  }

  /**
   * Render giao diện chính của trang Plan Management
   */
  return (
    <>
      {/* Header với các controls cơ bản */}
      <Header fixed>
        <Search />
        <div className='ml-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>
      <Main>
        {/* Card header với thông tin tổng quan và controls */}
        <div className='bg-card text-card-foreground mb-4 rounded-xl border p-6 shadow-sm'>
          <div className='flex flex-wrap items-center justify-between gap-4'>
            <div>
              <h2 className='mb-1 text-2xl font-bold tracking-tight'>Quản lý gói dịch vụ</h2>
              <p className='text-muted-foreground'>
                Quản lý các gói dịch vụ và phiên bản của hệ thống
              </p>
            </div>
            {/* Nút actions chính (Thêm, Import, Export, etc.) */}
            <div className='flex gap-2'>
              <PlanPrimaryButtons />
            </div>
          </div>

          {/* Toggle để chuyển đổi chế độ hiển thị versions */}
          <div className='mt-4 flex items-center gap-4'>
            <div className='flex items-center gap-2'>
              <Switch id='show-versions' checked={showVersions} onCheckedChange={setShowVersions} />
              <label htmlFor='show-versions' className='text-sm font-medium'>
                Hiển thị từng phiên bản
              </label>
            </div>
            {/* Hiển thị mô tả khi bật chế độ versions */}
            {showVersions && (
              <span className='text-muted-foreground text-xs'>
                Mỗi phiên bản được hiển thị như một gói riêng biệt
              </span>
            )}
          </div>
        </div>

        {/* Container cho bảng dữ liệu */}
        <div className='-mx-4 flex-1 overflow-auto px-4 py-1 lg:flex-row lg:space-y-0 lg:space-x-12'>
          <div className='bg-card text-card-foreground rounded-xl border p-2 shadow-sm'>
            {/* Bảng hiển thị dữ liệu plans với các cột được định nghĩa trong planColumns */}
            <PlanTable data={tableData} columns={planColumns} isAdmin={isAdmin} />
          </div>
        </div>
      </Main>
      {/* Các dialog components cho CRUD operations */}
      <PlanDialog /> {/* Dialog thêm/sửa plan */}
      <PlanDeleteDialog /> {/* Dialog xác nhận xóa */}
      <PlanVersionHistoryDialog
        open={open === 'versions'}
        onOpenChange={(isOpen) => setOpen(isOpen ? 'versions' : null)}
        plan={currentRow}
      />
    </>
  );
}

/**
 * Component chính export với PlanProvider wrap
 */
export default function PlanPage() {
  return (
    <PlanProvider>
      <PlanPageContent />
    </PlanProvider>
  );
}
