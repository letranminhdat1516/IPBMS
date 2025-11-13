import { Activity, AlertTriangle, Camera, FileText, Settings, Users } from 'lucide-react';

import { useNavigate } from '@tanstack/react-router';

import { Header } from '@/components/layout/header';
import { Main } from '@/components/layout/main';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { CustomerSetupWizard } from '@/components/customer-setup-wizard';
import { ProfileDropdown } from '@/components/profile-dropdown';
import { QuickUserSetup } from '@/components/quick-user-setup';
import { Search } from '@/components/search';
import { ThemeSwitch } from '@/components/theme-switch';

export default function AdminToolsPage() {
  const navigate = useNavigate();

  return (
    <>
      <Header fixed>
        <Search />
        <div className='ml-auto flex items-center space-x-4'>
          <CustomerSetupWizard />
          <QuickUserSetup />
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        <div className='mb-4 flex flex-wrap items-center justify-between gap-4'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>Công cụ quản trị</h2>
            <p className='text-muted-foreground'>Các công cụ quản lý người dùng và hệ thống</p>
          </div>
        </div>

        <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
          <Card
            className='cursor-pointer transition-shadow hover:shadow-lg'
            onClick={() => navigate({ to: '/users/customer' })}
          >
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Users className='h-5 w-5' />
                Quản lý người dùng
              </CardTitle>
              <CardDescription>
                Quản lý tài khoản khách hàng và người chăm sóc với thông tin được bảo vệ
              </CardDescription>
            </CardHeader>
            <CardContent>
              <button className='bg-primary text-primary-foreground hover:bg-primary/90 w-full rounded-md px-4 py-2'>
                Truy cập quản lý
              </button>
            </CardContent>
          </Card>

          <Card
            className='cursor-pointer transition-shadow hover:shadow-lg'
            onClick={() => navigate({ to: '/plan' })}
          >
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Settings className='h-5 w-5' />
                Quản lý gói dịch vụ
              </CardTitle>
              <CardDescription>
                Quản lý gói dịch vụ với phiên bản và thống kê sử dụng
              </CardDescription>
            </CardHeader>
            <CardContent>
              <button className='bg-primary text-primary-foreground hover:bg-primary/90 w-full rounded-md px-4 py-2'>
                Quản lý gói
              </button>
            </CardContent>
          </Card>

          <Card
            className='cursor-pointer transition-shadow hover:shadow-lg'
            onClick={() => navigate({ to: '/ticket' })}
          >
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Camera className='h-5 w-5' />
                Báo lỗi camera
              </CardTitle>
              <CardDescription>Ghi nhận và theo dõi các vấn đề camera được báo cáo</CardDescription>
            </CardHeader>
            <CardContent>
              <button className='bg-primary text-primary-foreground hover:bg-primary/90 w-full rounded-md px-4 py-2'>
                Xem báo lỗi
              </button>
            </CardContent>
          </Card>

          <Card
            className='cursor-pointer transition-shadow hover:shadow-lg'
            onClick={() => navigate({ to: '/events' })}
          >
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Activity className='h-5 w-5' />
                Sự kiện hệ thống
              </CardTitle>
              <CardDescription>Giám sát sự kiện AI với tóm tắt và thống kê</CardDescription>
            </CardHeader>
            <CardContent>
              <button className='bg-primary text-primary-foreground hover:bg-primary/90 w-full rounded-md px-4 py-2'>
                Xem sự kiện
              </button>
            </CardContent>
          </Card>

          <Card
            className='cursor-pointer transition-shadow hover:shadow-lg'
            onClick={() => navigate({ to: '/alerts' })}
          >
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <AlertTriangle className='h-5 w-5' />
                Nhắc nhở hệ thống
              </CardTitle>
              <CardDescription>Quản lý nhắc nhở và thông báo tự động</CardDescription>
            </CardHeader>
            <CardContent>
              <button className='bg-primary text-primary-foreground hover:bg-primary/90 w-full rounded-md px-4 py-2'>
                Xem nhắc nhở
              </button>
            </CardContent>
          </Card>

          <Card
            className='cursor-pointer transition-shadow hover:shadow-lg'
            onClick={() => navigate({ to: '/configuration' })}
          >
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <FileText className='h-5 w-5' />
                Thiết lập cấu hình
              </CardTitle>
              <CardDescription>Cấu hình mặc định cho ứng dụng phần mềm</CardDescription>
            </CardHeader>
            <CardContent>
              <button className='bg-primary text-primary-foreground hover:bg-primary/90 w-full rounded-md px-4 py-2'>
                Cấu hình hệ thống
              </button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Thêm người dùng nhanh</CardTitle>
              <CardDescription>Tạo tài khoản người dùng mới trực tiếp từ dashboard</CardDescription>
            </CardHeader>
            <CardContent>
              <QuickUserSetup
                trigger={
                  <button className='bg-secondary text-secondary-foreground hover:bg-secondary/80 w-full rounded-md px-4 py-2'>
                    Thêm người dùng
                  </button>
                }
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Thiết lập Customer</CardTitle>
              <CardDescription>Cấu hình camera, AI và quota cho customer</CardDescription>
            </CardHeader>
            <CardContent>
              <CustomerSetupWizard
                trigger={
                  <button className='bg-secondary text-secondary-foreground hover:bg-secondary/80 w-full rounded-md px-4 py-2'>
                    Thiết lập Customer
                  </button>
                }
              />
            </CardContent>
          </Card>
        </div>
      </Main>
    </>
  );
}
