import { Ban, CreditCard, Edit, FileText, Settings, Trash2 } from 'lucide-react';

import { useState } from 'react';

import { useParams } from '@tanstack/react-router';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';

import { useUserAdmin } from '@/services/userDetail';

import SharedPermissionsDialog from '../shared-permissions-dialog';

export default function AdminTabsContent() {
  const { userId } = useParams({ from: '/_authenticated/users/customer/detail/$userId' });
  const { data, isLoading, isError } = useUserAdmin(userId);
  const [accountActive, setAccountActive] = useState(true);
  const [autoNotify, setAutoNotify] = useState(true);
  const [shareData, setShareData] = useState(false);
  const [openSharedPerm, setOpenSharedPerm] = useState(false);

  return (
    <div className='space-y-6'>
      <div className='grid grid-cols-1 gap-6 lg:grid-cols-3'>
        {/* Điều khiển tài khoản */}
        <Card className='lg:col-span-1'>
          <CardHeader>
            <CardTitle>Điều khiển tài khoản</CardTitle>
            <CardDescription>Các hành động quản trị cho tài khoản này</CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div>
              <div className='mb-2 font-medium'>Trạng thái tài khoản</div>
              <div className='mb-4 flex items-center justify-between'>
                <span className='text-muted-foreground text-sm'>Kích hoạt/tạm dừng dịch vụ</span>
                <Switch checked={accountActive} onCheckedChange={setAccountActive} />
              </div>
              <div className='mb-2 font-medium'>Thông báo tự động</div>
              <div className='mb-4 flex items-center justify-between'>
                <span className='text-muted-foreground text-sm'>Gửi thông báo cho khách hàng</span>
                <Switch checked={autoNotify} onCheckedChange={setAutoNotify} />
              </div>
              <div className='mb-2 font-medium'>Chia sẻ dữ liệu</div>
              <div className='mb-4 flex items-center justify-between'>
                <span className='text-muted-foreground text-sm'>Cho phép chia sẻ với bác sĩ</span>
                <Switch checked={shareData} onCheckedChange={setShareData} />
              </div>
            </div>
            <Button variant='outline' className='flex w-full items-center justify-start gap-2'>
              <Edit className='h-4 w-4' /> Chỉnh sửa thông tin
            </Button>
            <Button variant='outline' className='flex w-full items-center justify-start gap-2'>
              <CreditCard className='h-4 w-4' /> Cập nhật thanh toán
            </Button>
            <Button variant='outline' className='flex w-full items-center justify-start gap-2'>
              <Settings className='h-4 w-4' /> Cài đặt nâng cao
            </Button>
            <Button
              variant='outline'
              className='flex w-full items-center justify-start gap-2'
              onClick={() => setOpenSharedPerm(true)}
            >
              <FileText className='h-4 w-4' /> Quản lý Shared Permissions
            </Button>
            <Button variant='secondary' className='flex w-full items-center justify-start gap-2'>
              <Ban className='h-4 w-4' /> Tạm dừng dịch vụ
            </Button>
            <Button variant='destructive' className='flex w-full items-center justify-start gap-2'>
              <Trash2 className='h-4 w-4' /> Hủy tài khoản
            </Button>
          </CardContent>
        </Card>

        {/* Thông tin hệ thống */}
        <Card className='lg:col-span-2'>
          <CardHeader>
            <CardTitle>Thông tin hệ thống</CardTitle>
            <CardDescription>Chi tiết kỹ thuật và logs</CardDescription>
          </CardHeader>
          <CardContent className='flex-1 space-y-4'>
            {isError && (
              <div className='text-destructive text-sm'>Không thể tải thông tin hệ thống.</div>
            )}
            {isLoading && <div className='text-muted-foreground text-sm'>Đang tải dữ liệu…</div>}
            {data && (
              <div className='mb-4 grid grid-cols-2 gap-4'>
                <div>
                  <div className='text-muted-foreground text-xs'>User ID:</div>
                  <div className='font-mono font-bold'>{String(userId)}</div>
                </div>
                <div>
                  <div className='text-muted-foreground text-xs'>Ngày tạo:</div>
                  <div>{data.system.createdAt}</div>
                </div>
                <div>
                  <div className='text-muted-foreground text-xs'>Lần đăng nhập cuối:</div>
                  <div>{data.system.lastLogin ?? '—'}</div>
                </div>
                <div>
                  <div className='text-muted-foreground text-xs'>IP Address:</div>
                  <div>
                    {data.system.lastLoginIp
                      ? (() => {
                          const ip = data.system.lastLoginIp;
                          const parts = ip.split('.');
                          if (parts.length === 4) {
                            return `${parts[0]}.${parts[1]}.***.***`;
                          }
                          return '***.***.***.***';
                        })()
                      : '—'}
                  </div>
                </div>
                <div>
                  <div className='text-muted-foreground text-xs'>Thiết bị:</div>
                  <div>{data.system.device ?? '—'}</div>
                </div>
                <div>
                  <div className='text-muted-foreground text-xs'>Trạng thái:</div>
                  <div className={data.system.isActive ? 'text-green-600' : 'text-red-600'}>
                    {data.system.isActive ? 'Đang hoạt động' : 'Tạm dừng'}
                  </div>
                </div>
              </div>
            )}
            <div>
              <div className='mb-2 font-medium'>Hoạt động gần đây</div>
              <div className='flex flex-col gap-1 text-sm'>
                {(() => {
                  const arr = Array.isArray(data?.activities)
                    ? (data!.activities as unknown[])
                    : [];
                  if (arr.length === 0) {
                    return (
                      <div className='text-muted-foreground text-sm'>Không có hoạt động nào.</div>
                    );
                  }
                  return arr.slice(0, 5).map((a, i) => (
                    <div key={i} className='flex justify-between'>
                      <span>{typeof a === 'string' ? a : 'Hoạt động'}</span>
                      <span className='text-muted-foreground'>—</span>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button variant='outline' className='mt-3 flex w-full items-center gap-2'>
              <FileText className='h-4 w-4' /> Xem logs chi tiết
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Lịch sử hoạt động (read-only) */}
      <Card>
        <CardHeader>
          <CardTitle>Lịch sử hoạt động (Chỉ đọc)</CardTitle>
          <CardDescription>
            Nhật ký các thay đổi và hoạt động của tài khoản khách hàng - chỉ xem, không chỉnh sửa
          </CardDescription>
        </CardHeader>
        <CardContent className='overflow-x-auto p-0'>
          <table className='bg-card text-card-foreground min-w-full rounded-xl text-sm'>
            <thead>
              <tr className='bg-muted border-b'>
                <th className='text-muted-foreground px-5 py-3 text-left font-semibold'>
                  Thời gian
                </th>
                <th className='text-muted-foreground px-5 py-3 text-left font-semibold'>
                  Hành động
                </th>
                <th className='text-muted-foreground px-5 py-3 text-left font-semibold'>
                  Chi tiết
                </th>
                <th className='text-muted-foreground px-5 py-3 text-left font-semibold'>Nguồn</th>
              </tr>
            </thead>
            <tbody>
              <tr className='border-b'>
                <td className='px-5 py-3 text-sm whitespace-nowrap'>16/09/2025 16:35</td>
                <td className='px-5 py-3 whitespace-nowrap'>Đăng nhập hệ thống</td>
                <td className='px-5 py-3'>Truy cập dashboard khách hàng</td>
                <td className='text-muted-foreground px-5 py-3 text-xs'>Web App</td>
              </tr>
              <tr className='border-b'>
                <td className='px-5 py-3 text-sm whitespace-nowrap'>16/09/2025 10:20</td>
                <td className='px-5 py-3 whitespace-nowrap'>Cập nhật thông báo</td>
                <td className='px-5 py-3'>Thay đổi cài đặt thông báo email</td>
                <td className='text-muted-foreground px-5 py-3 text-xs'>Mobile App</td>
              </tr>
              <tr className='border-b'>
                <td className='px-5 py-3 text-sm whitespace-nowrap'>15/09/2025 22:45</td>
                <td className='px-5 py-3 whitespace-nowrap'>Phản hồi cảnh báo</td>
                <td className='px-5 py-3'>Xác nhận cảnh báo phát hiện ngã</td>
                <td className='text-muted-foreground px-5 py-3 text-xs'>AI System</td>
              </tr>
              <tr className='border-b'>
                <td className='px-5 py-3 text-sm whitespace-nowrap'>15/09/2025 14:30</td>
                <td className='px-5 py-3 whitespace-nowrap'>Thanh toán</td>
                <td className='px-5 py-3'>Thanh toán hóa đơn tháng 9</td>
                <td className='text-muted-foreground px-5 py-3 text-xs'>Payment Gateway</td>
              </tr>
              <tr className='border-b last:border-0'>
                <td className='px-5 py-3 text-sm whitespace-nowrap'>14/09/2025 09:15</td>
                <td className='px-5 py-3 whitespace-nowrap'>Cập nhật hồ sơ</td>
                <td className='px-5 py-3'>Thêm thông tin liên hệ khẩn cấp</td>
                <td className='text-muted-foreground px-5 py-3 text-xs'>Web App</td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>
      <SharedPermissionsDialog
        open={openSharedPerm}
        onOpenChange={setOpenSharedPerm}
        customerId={userId}
      />
    </div>
  );
}
