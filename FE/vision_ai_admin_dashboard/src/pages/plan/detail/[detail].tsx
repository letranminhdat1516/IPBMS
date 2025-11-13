import {
  ArrowLeft,
  Calendar,
  Camera,
  Clock,
  DollarSign,
  MapPin,
  Shield,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';

import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from '@tanstack/react-router';

import { Header } from '@/components/layout/header';
import { Main } from '@/components/layout/main';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

import { ProfileDropdown } from '@/components/profile-dropdown';
import { Search } from '@/components/search';
import { ThemeSwitch } from '@/components/theme-switch';

import { useAuth } from '@/hooks/use-auth';

import type { PlanVersion } from '@/types/plan';

import { activatePlanVersion, getPlanVersions } from '@/services/adminPlan';

export default function PlanDetailPage() {
  const navigate = useNavigate();
  const { planCode } = useParams({
    from: '/_authenticated/plan/$planCode',
  });
  const { effectiveUser } = useAuth();

  // Kiểm tra quyền admin - ưu tiên user từ auth store
  const isAdmin = effectiveUser?.role ? effectiveUser.role.toLowerCase().includes('admin') : false;

  // Query để lấy thông tin các phiên bản của plan
  const versionsQuery = useQuery<PlanVersion[]>({
    queryKey: ['plan-versions', planCode],
    queryFn: async () => {
      if (!planCode) throw new Error('Plan code is required');

      const result = await getPlanVersions(planCode);

      // WORKAROUND: Backend hiện tại trả về tất cả plans thay vì chỉ versions của plan này
      // Filter để chỉ lấy versions thuộc plan được chọn
      if (result && result.length > 0) {
        const filteredResult = result.filter(
          (version) => version.plan_code === planCode || version.code === planCode
        );
        return filteredResult;
      }

      return result || [];
    },
    enabled: !!planCode && isAdmin,
  });

  const handleActivateVersion = async (versionId: string) => {
    try {
      await activatePlanVersion(versionId);
      toast.success('Đã kích hoạt phiên bản thành công');
      versionsQuery.refetch();
    } catch (_error) {
      toast.error('Có lỗi xảy ra khi kích hoạt phiên bản');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (price: string) => {
    const numPrice = Number(price);
    if (numPrice === 0) return 'Miễn phí';
    return new Intl.NumberFormat('vi-VN').format(numPrice) + ' ₫';
  };

  // Tìm plan name từ plan code hoặc từ API response
  const planName =
    versionsQuery.data?.[0]?.name ||
    (planCode ? `Gói dịch vụ: ${planCode}` : 'Chi tiết gói dịch vụ');

  if (!isAdmin) {
    return (
      <Main className='mx-auto max-w-xl p-8'>
        <div className='text-center'>
          <div className='mb-2 font-semibold text-yellow-600'>Không có quyền truy cập</div>
          <div className='text-muted-foreground text-sm'>
            Bạn cần quyền admin để xem chi tiết gói dịch vụ.
          </div>
        </div>
      </Main>
    );
  }

  return (
    <>
      <Header fixed>
        <Search />
        <div className='ml-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        {/* Header với nút quay lại */}
        <div className='mb-6 flex items-center gap-4'>
          <Button
            variant='ghost'
            size='sm'
            onClick={() => navigate({ to: '/plan' })}
            className='flex items-center gap-2'
          >
            <ArrowLeft className='h-4 w-4' />
            Quay lại
          </Button>
          <div className='flex-1'>
            <h1 className='text-2xl font-bold'>{planName}</h1>
            <p className='text-muted-foreground'>
              Quản lý các phiên bản của gói dịch vụ • Mã gói:{' '}
              <code className='bg-muted rounded px-1 py-0.5 text-sm'>{planCode}</code>
            </p>
          </div>
          {versionsQuery.data && versionsQuery.data.length > 0 && (
            <div className='text-right'>
              <p className='text-muted-foreground text-sm'>Tổng phiên bản</p>
              <p className='text-2xl font-bold'>{versionsQuery.data.length}</p>
            </div>
          )}
        </div>

        {/* Summary card cho phiên bản hiện tại */}
        {versionsQuery.data && versionsQuery.data.length > 0 && (
          <Card className='mb-6 border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-900/10'>
            <CardHeader>
              <div className='flex items-center gap-2'>
                <Shield className='h-5 w-5 text-green-600' />
                <div>
                  <h3 className='font-semibold text-green-800 dark:text-green-200'>
                    Phiên bản đang sử dụng
                  </h3>
                  <p className='text-sm text-green-600 dark:text-green-400'>
                    Phiên bản hiện tại được áp dụng cho khách hàng mới
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {(() => {
                const currentVersion = versionsQuery.data.find((v) => v.is_current);
                if (!currentVersion) {
                  return (
                    <p className='text-muted-foreground text-sm'>
                      Chưa có phiên bản nào được kích hoạt
                    </p>
                  );
                }
                return (
                  <div className='grid grid-cols-2 gap-4 md:grid-cols-4'>
                    <div>
                      <p className='text-muted-foreground text-xs font-medium uppercase'>
                        Phiên bản
                      </p>
                      <p className='text-lg font-bold'>v{currentVersion.version}</p>
                    </div>
                    <div>
                      <p className='text-muted-foreground text-xs font-medium uppercase'>Giá</p>
                      <p className='text-lg font-bold text-green-600'>
                        {formatCurrency(currentVersion.price)}
                      </p>
                    </div>
                    <div>
                      <p className='text-muted-foreground text-xs font-medium uppercase'>Camera</p>
                      <p className='font-bold'>{currentVersion.camera_quota} camera</p>
                    </div>
                    <div>
                      <p className='text-muted-foreground text-xs font-medium uppercase'>
                        Có hiệu lực từ
                      </p>
                      <p className='text-sm font-medium'>
                        {formatDate(currentVersion.effective_from)}
                      </p>
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        )}

        {/* Nội dung chính */}
        {versionsQuery.isLoading ? (
          <div className='space-y-4'>
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className='h-6 w-32' />
                  <Skeleton className='h-4 w-48' />
                </CardHeader>
                <CardContent>
                  <div className='grid grid-cols-2 gap-4 md:grid-cols-4'>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((j) => (
                      <Skeleton key={j} className='h-12 w-full' />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : versionsQuery.error ? (
          <Card>
            <CardContent className='flex items-center justify-center py-8'>
              <div className='text-center'>
                <div className='text-destructive mb-2 text-lg font-semibold'>
                  Không thể tải thông tin
                </div>
                <p className='text-muted-foreground'>
                  Đã xảy ra lỗi khi tải lịch sử phiên bản của gói dịch vụ
                </p>
                <Button variant='outline' className='mt-4' onClick={() => versionsQuery.refetch()}>
                  Thử lại
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : !versionsQuery.data || versionsQuery.data.length === 0 ? (
          <Card>
            <CardContent className='flex items-center justify-center py-8'>
              <div className='text-center'>
                <div className='text-muted-foreground mb-2 text-lg font-semibold'>
                  Không có phiên bản nào
                </div>
                <p className='text-muted-foreground'>
                  Gói dịch vụ này chưa có phiên bản nào được tạo
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className='space-y-6'>
            <div className='mb-4'>
              <h2 className='text-xl font-semibold'>Lịch sử phiên bản</h2>
              <p className='text-muted-foreground text-sm'>
                Danh sách tất cả phiên bản được tạo cho gói dịch vụ này, sắp xếp từ mới nhất
              </p>
            </div>

            {versionsQuery.data.map((version, index) => (
              <Card
                key={version.id}
                className={version.is_current ? 'shadow-md ring-2 ring-green-500' : 'shadow-sm'}
              >
                <CardHeader>
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-3'>
                      <Badge
                        variant={version.is_current ? 'default' : 'outline'}
                        className={
                          version.is_current
                            ? 'bg-green-600 px-3 py-1 text-lg'
                            : 'px-3 py-1 text-lg'
                        }
                      >
                        v{version.version}
                      </Badge>
                      {version.is_current && (
                        <Badge
                          variant='secondary'
                          className='bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                        >
                          <Shield className='mr-1 h-3 w-3' />
                          Đang sử dụng
                        </Badge>
                      )}
                      {index === 0 && !version.is_current && (
                        <Badge
                          variant='secondary'
                          className='bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                        >
                          Mới nhất
                        </Badge>
                      )}
                    </div>
                    {!version.is_current && (
                      <Button
                        onClick={() =>
                          handleActivateVersion(version.version_id || version.id || '')
                        }
                        className='bg-blue-600 hover:bg-blue-700'
                        size='sm'
                      >
                        Kích hoạt phiên bản
                      </Button>
                    )}
                  </div>
                  <CardDescription className='flex items-center gap-4 text-sm'>
                    <span>
                      <Calendar className='mr-1 inline h-3 w-3' />
                      Tạo: {formatDate(version.created_at)}
                    </span>
                    {version.updated_at && (
                      <span>
                        <Clock className='mr-1 inline h-3 w-3' />
                        Cập nhật: {formatDate(version.updated_at)}
                      </span>
                    )}
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4'>
                    {/* Giá */}
                    <div className='hover:bg-muted/50 flex items-center gap-3 rounded-lg border p-4 transition-colors'>
                      <div className='rounded-full bg-green-100 p-2 dark:bg-green-900/20'>
                        <DollarSign className='h-5 w-5 text-green-600 dark:text-green-400' />
                      </div>
                      <div>
                        <p className='text-muted-foreground text-sm'>Giá gói</p>
                        <p className='text-lg font-bold text-green-600'>
                          {formatCurrency(version.price)}
                        </p>
                      </div>
                    </div>

                    {/* Camera */}
                    <div className='hover:bg-muted/50 flex items-center gap-3 rounded-lg border p-4 transition-colors'>
                      <div className='rounded-full bg-blue-100 p-2 dark:bg-blue-900/20'>
                        <Camera className='h-5 w-5 text-blue-600 dark:text-blue-400' />
                      </div>
                      <div>
                        <p className='text-muted-foreground text-sm'>Số camera</p>
                        <p className='font-semibold'>{version.camera_quota} camera</p>
                      </div>
                    </div>

                    {/* Caregiver */}
                    <div className='hover:bg-muted/50 flex items-center gap-3 rounded-lg border p-4 transition-colors'>
                      <div className='rounded-full bg-purple-100 p-2 dark:bg-purple-900/20'>
                        <Users className='h-5 w-5 text-purple-600 dark:text-purple-400' />
                      </div>
                      <div>
                        <p className='text-muted-foreground text-sm'>Người chăm sóc</p>
                        <p className='font-semibold'>{version.caregiver_seats} người</p>
                      </div>
                    </div>

                    {/* Địa điểm */}
                    <div className='hover:bg-muted/50 flex items-center gap-3 rounded-lg border p-4 transition-colors'>
                      <div className='rounded-full bg-orange-100 p-2 dark:bg-orange-900/20'>
                        <MapPin className='h-5 w-5 text-orange-600 dark:text-orange-400' />
                      </div>
                      <div>
                        <p className='text-muted-foreground text-sm'>Địa điểm</p>
                        <p className='font-semibold'>{version.sites} vị trí</p>
                      </div>
                    </div>

                    {/* Lưu trữ */}
                    <div className='hover:bg-muted/50 flex items-center gap-3 rounded-lg border p-4 transition-colors'>
                      <div className='rounded-full bg-red-100 p-2 dark:bg-red-900/20'>
                        <Clock className='h-5 w-5 text-red-600 dark:text-red-400' />
                      </div>
                      <div>
                        <p className='text-muted-foreground text-sm'>Lưu trữ dữ liệu</p>
                        <p className='font-semibold'>{version.retention_days} ngày</p>
                      </div>
                    </div>

                    {/* Cập nhật */}
                    <div className='hover:bg-muted/50 flex items-center gap-3 rounded-lg border p-4 transition-colors'>
                      <div className='rounded-full bg-indigo-100 p-2 dark:bg-indigo-900/20'>
                        <Calendar className='h-5 w-5 text-indigo-600 dark:text-indigo-400' />
                      </div>
                      <div>
                        <p className='text-muted-foreground text-sm'>Chu kỳ cập nhật</p>
                        <p className='font-semibold'>{version.major_updates_months} tháng</p>
                      </div>
                    </div>

                    {/* Hiệu lực từ */}
                    <div className='hover:bg-muted/50 flex items-center gap-3 rounded-lg border p-4 transition-colors'>
                      <div className='rounded-full bg-teal-100 p-2 dark:bg-teal-900/20'>
                        <Calendar className='h-5 w-5 text-teal-600 dark:text-teal-400' />
                      </div>
                      <div>
                        <p className='text-muted-foreground text-sm'>Có hiệu lực từ</p>
                        <p className='text-sm font-medium'>{formatDate(version.effective_from)}</p>
                      </div>
                    </div>

                    {/* Hiệu lực đến */}
                    {version.effective_to && (
                      <div className='hover:bg-muted/50 flex items-center gap-3 rounded-lg border p-4 transition-colors'>
                        <div className='rounded-full bg-gray-100 p-2 dark:bg-gray-900/20'>
                          <Calendar className='h-5 w-5 text-gray-600 dark:text-gray-400' />
                        </div>
                        <div>
                          <p className='text-muted-foreground text-sm'>Hết hiệu lực</p>
                          <p className='text-sm font-medium'>{formatDate(version.effective_to)}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Thông tin bổ sung */}
                  {(version.name || version.status) && (
                    <div className='mt-6 border-t pt-4'>
                      <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                        {version.name && (
                          <div>
                            <p className='text-muted-foreground text-sm'>Tên gói</p>
                            <p className='font-medium'>{version.name}</p>
                          </div>
                        )}
                        {version.status && (
                          <div>
                            <p className='text-muted-foreground text-sm'>Trạng thái</p>
                            <Badge variant={version.status === 'active' ? 'default' : 'secondary'}>
                              {version.status}
                            </Badge>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>

                {index < versionsQuery.data.length - 1 && <Separator className='my-6' />}
              </Card>
            ))}
          </div>
        )}
      </Main>
    </>
  );
}
