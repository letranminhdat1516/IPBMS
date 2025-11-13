import { DEFAULT_PAGE_SIZE } from '@/constants';
import { Calendar, Camera, CheckCircle, Download, Settings, Wrench } from 'lucide-react';

import { useParams } from '@tanstack/react-router';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

import { useAuthStore } from '@/stores/authStore';

import { useUserServices } from '@/services/userDetail';

export default function ServicesTabsContent() {
  const { userId } = useParams({ from: '/_authenticated/users/customer/detail/$userId' });
  const { data, isLoading, isError } = useUserServices(userId, {
    include: 'subscription,devices,maintenance,billing',
    page: 1,
    limit: DEFAULT_PAGE_SIZE,
  });
  const subscription = data?.subscription;
  const devices = data?.devices ?? [];
  const maintenance = data?.maintenance ?? [];
  const billing = data?.billing?.items ?? [];

  // Lấy role từ auth store
  const user = useAuthStore((state) => state.auth.user);
  const isAdmin = user?.role?.includes('admin');

  return (
    <>
      {/* Service Overview */}
      <div className='grid grid-cols-1 gap-6 lg:grid-cols-3'>
        <Card className='lg:col-span-2'>
          <CardHeader>
            <CardTitle>Thông tin gói dịch vụ</CardTitle>
            <CardDescription>
              {subscription?.name
                ? `Chi tiết gói ${subscription.name}`
                : 'Chi tiết gói đang sử dụng'}
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-6'>
            {isError && (
              <div className='text-destructive text-sm'>Không thể tải dữ liệu dịch vụ.</div>
            )}
            {isLoading && <div className='text-muted-foreground text-sm'>Đang tải dữ liệu…</div>}
            <div className='grid grid-cols-2 gap-6'>
              <div className='space-y-4'>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>Tên gói:</span>
                  <span className='font-medium'>{subscription?.name ?? '—'}</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>Mã hợp đồng:</span>
                  <span className='font-mono'>{subscription?.contractId ?? '—'}</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>Ngày bắt đầu:</span>
                  <span>{subscription?.startDate ?? '—'}</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>Ngày hết hạn:</span>
                  <span>{subscription?.endDate ?? '—'}</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>Thời gian còn lại:</span>
                  <span className='font-medium text-green-700 dark:text-green-300'>
                    {subscription?.remaining ?? '—'}
                  </span>
                </div>
              </div>

              <div className='space-y-4'>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>Số camera:</span>
                  <Badge className='bg-blue-500/10 text-blue-700 dark:text-blue-300'>
                    {subscription?.cameraCount ?? 0} camera
                  </Badge>
                </div>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>Lưu trữ video:</span>
                  <Badge className='bg-green-500/10 text-green-700 dark:text-green-300'>
                    30 ngày
                  </Badge>
                </div>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>AI Detection:</span>
                  <Badge className='bg-purple-500/10 text-purple-700 dark:text-purple-300'>
                    24/7
                  </Badge>
                </div>
                {billing.length > 0 && (
                  <div className='flex justify-between'>
                    <span className='text-muted-foreground'>Chi phí tháng:</span>
                    <span className='font-semibold text-blue-700 dark:text-blue-300'>
                      {billing[0]?.amount ?? '—'}
                    </span>
                  </div>
                )}
                {subscription?.features && subscription.features.length > 0 && (
                  <div>
                    <div className='text-muted-foreground mb-2 text-sm'>Tính năng bao gồm:</div>
                    <div className='flex flex-wrap gap-2'>
                      {subscription.features.map((feature, index) => (
                        <Badge key={index} variant='outline' className='text-xs'>
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Trạng thái dịch vụ</CardTitle>
            <CardDescription>Tình trạng hoạt động tổng quan</CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='space-y-2 text-center'>
              <Badge className='bg-green-500/10 px-4 py-2 text-sm font-semibold text-green-700 dark:text-green-300'>
                ✓ Đang hoạt động
              </Badge>
              <p className='text-sm text-green-700 dark:text-green-300'>
                Tất cả hệ thống đang hoạt động
              </p>
            </div>

            {!isAdmin && (
              <Button className='w-full bg-transparent' variant='outline'>
                <Settings className='mr-2 h-4 w-4' />
                Cài đặt dịch vụ
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Equipment Status - Only show for non-admin users */}
      {!isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Trạng thái thiết bị</CardTitle>
            <CardDescription>Tình trạng camera và thiết bị hỗ trợ</CardDescription>
          </CardHeader>
          <CardContent>
            <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4'>
              {devices.map((device, index) => (
                <div key={index} className='space-y-3 rounded-lg border p-4'>
                  <div className='flex items-center justify-between'>
                    <Camera className='h-6 w-6 text-blue-600' />
                    <Badge className='bg-green-100 text-green-800'>
                      <div className='mr-1 h-2 w-2 rounded-full bg-green-600'></div>
                      {device.status || 'Online'}
                    </Badge>
                  </div>
                  <div>
                    <h4 className='text-sm font-medium'>{device.location || 'Thiết bị'}</h4>
                    <p className='text-xs text-gray-600'>{device.serial_number}</p>
                  </div>
                  <div className='space-y-2'>
                    <div className='flex justify-between text-xs'>
                      <span>Pin:</span>
                      <span className='text-green-600'>—</span>
                    </div>
                    <Progress value={90} className='h-1' />
                    <div className='flex justify-between text-xs'>
                      <span>Tín hiệu:</span>
                      <span>—</span>
                    </div>
                  </div>
                </div>
              ))}
              {devices.length === 0 && (
                <div className='text-muted-foreground text-sm'>Chưa có thiết bị nào.</div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Technician Visits - Only show for non-admin users */}
      {!isAdmin && (
        <div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
          <Card className='col-span-full rounded-2xl border shadow-sm'>
            <CardHeader className='pb-2'>
              <CardTitle className='text-lg font-bold'>Lịch bảo trì thiết bị</CardTitle>
              <CardDescription className='text-muted-foreground text-sm'>
                Chi tiết các lần kiểm tra, bảo trì, lắp đặt thiết bị
              </CardDescription>
            </CardHeader>
            <CardContent className='overflow-x-auto p-0'>
              <table className='bg-card text-card-foreground min-w-full rounded-xl text-sm'>
                <thead>
                  <tr className='bg-muted border-b'>
                    <th className='text-muted-foreground px-5 py-3 text-left font-semibold'>
                      Ngày
                    </th>
                    <th className='text-muted-foreground px-5 py-3 text-left font-semibold'>
                      Nội dung
                    </th>
                    <th className='text-muted-foreground px-5 py-3 text-left font-semibold'>
                      Ghi chú
                    </th>
                    <th className='text-muted-foreground px-5 py-3 text-left font-semibold'>
                      Trạng thái
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {maintenance.map((m, idx) => (
                    <tr key={idx} className='border-b last:border-0'>
                      <td className='px-5 py-3 font-medium whitespace-nowrap'>
                        {m.scheduled_date}
                      </td>
                      <td className='px-5 py-3 whitespace-nowrap'>
                        <span className='flex items-center gap-2'>
                          {m.status === 'completed' ? (
                            <CheckCircle className='h-4 w-4 text-green-600' />
                          ) : (
                            <Wrench className='h-4 w-4 text-blue-600' />
                          )}
                          {m.status === 'completed' ? 'Bảo trì hoàn thành' : 'Bảo trì định kỳ'}
                        </span>
                      </td>
                      <td className='px-5 py-3 whitespace-nowrap'>
                        {m.completed_date ? 'Đã hoàn thành' : 'Chờ thực hiện'}
                      </td>
                      <td className='px-5 py-3 whitespace-nowrap'>
                        {m.status === 'completed' ? (
                          <Badge className='bg-green-500/10 text-green-700 dark:text-green-300'>
                            Hoàn thành
                          </Badge>
                        ) : (
                          <Badge
                            variant='outline'
                            className='border-blue-200 bg-blue-100 text-blue-700 dark:border-blue-900/40 dark:bg-blue-500/10 dark:text-blue-300'
                          >
                            Sắp tới
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                  {maintenance.length === 0 && (
                    <tr>
                      <td className='text-muted-foreground px-5 py-3 text-sm' colSpan={4}>
                        Không có lịch bảo trì.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              <div className='p-4'>
                <Button className='w-full bg-transparent' variant='outline'>
                  <Calendar className='mr-2 h-4 w-4' />
                  Đặt lịch bảo trì
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Billing Information - Table style */}
      <Card className='rounded-2xl border shadow-sm'>
        <CardHeader className='pb-2'>
          <CardTitle className='text-lg font-bold'>Lịch sử thanh toán</CardTitle>
          <CardDescription className='text-muted-foreground text-sm'>
            Chi tiết các giao dịch thanh toán
          </CardDescription>
        </CardHeader>
        <CardContent className='overflow-x-auto p-0'>
          <table className='bg-card text-card-foreground min-w-full rounded-xl text-sm'>
            <thead>
              <tr className='bg-muted border-b'>
                <th className='text-muted-foreground px-5 py-3 text-left font-semibold'>Ngày</th>
                <th className='text-muted-foreground px-5 py-3 text-left font-semibold'>
                  Kỳ thanh toán
                </th>
                <th className='text-muted-foreground px-5 py-3 text-left font-semibold'>Số tiền</th>
                <th className='text-muted-foreground px-5 py-3 text-left font-semibold'>
                  Phương thức
                </th>
                <th className='text-muted-foreground px-5 py-3 text-left font-semibold'>
                  Trạng thái
                </th>
                <th className='text-muted-foreground px-5 py-3 text-left font-semibold'>Hóa đơn</th>
              </tr>
            </thead>
            <tbody>
              {billing.map((row, idx) => (
                <tr key={idx} className='border-b last:border-0'>
                  <td className='px-5 py-3 whitespace-nowrap'>{row.date}</td>
                  <td className='px-5 py-3 whitespace-nowrap'>{row.period}</td>
                  <td className='px-5 py-3 font-semibold whitespace-nowrap'>{row.amount}</td>
                  <td className='px-5 py-3 whitespace-nowrap'>{row.method}</td>
                  <td className='px-5 py-3 whitespace-nowrap'>
                    <span className='rounded bg-green-500/10 px-2 py-1 text-xs font-semibold text-green-700 dark:text-green-300'>
                      {row.status}
                    </span>
                  </td>
                  <td className='px-5 py-3 whitespace-nowrap'>
                    <Button variant='ghost' size='icon' className='h-7 w-7 p-0' title='Tải hóa đơn'>
                      <Download className='h-4 w-4' />
                    </Button>
                    <span className='ml-2 font-mono text-xs'>{row.invoice}</span>
                  </td>
                </tr>
              ))}
              {billing.length === 0 && (
                <tr>
                  <td className='text-muted-foreground px-5 py-3 text-sm' colSpan={6}>
                    Chưa có giao dịch thanh toán.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </>
  );
}
