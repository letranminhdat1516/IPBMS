import { formatDateVN } from '@/utils';
import { Edit, Eye, Package, Plus, Settings, Trash2 } from 'lucide-react';

import { useState } from 'react';

import { useQuery } from '@tanstack/react-query';

import { Header } from '@/components/layout/header';
import { Main } from '@/components/layout/main';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import type { Plan } from '@/types/plan';

import { getPlans } from '@/services/adminPlan';

export default function AdminPlansPage() {
  const [search, setSearch] = useState('');

  const {
    data: plans = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['admin-plans', { search }],
    queryFn: () => getPlans({ search: search || undefined, limit: 100 }),
  });

  const filteredPlans = plans.filter(
    (plan) =>
      search === '' ||
      plan.name.toLowerCase().includes(search.toLowerCase()) ||
      plan.code.toLowerCase().includes(search.toLowerCase())
  );

  const formatPrice = (price: string) => {
    const num = parseFloat(price);
    return num === 0 ? 'Miễn phí' : `${num.toLocaleString('vi-VN')} VNĐ`;
  };

  return (
    <>
      <Header>
        <div className='flex items-center gap-4'>
          <Package className='h-6 w-6' />
          <div>
            <h1 className='text-2xl font-bold'>Quản lý Plans</h1>
            <p className='text-muted-foreground'>Quản lý các gói dịch vụ cho khách hàng</p>
          </div>
        </div>
      </Header>

      <Main>
        <div className='space-y-6'>
          {/* Stats Cards */}
          <div className='grid gap-4 md:grid-cols-4'>
            <Card>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium'>Tổng Plans</CardTitle>
                <Package className='text-muted-foreground h-4 w-4' />
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold'>{plans.length}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium'>Plans Active</CardTitle>
                <Badge variant='default' className='h-4 w-fit text-xs'>
                  Active
                </Badge>
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold'>{plans.filter((p) => p.is_active).length}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium'>Plans Miễn phí</CardTitle>
                <Badge variant='secondary' className='h-4 w-fit text-xs'>
                  Free
                </Badge>
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold'>
                  {plans.filter((p) => parseFloat(p.price) === 0).length}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium'>Plans Trả phí</CardTitle>
                <Badge variant='destructive' className='h-4 w-fit text-xs'>
                  Paid
                </Badge>
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold'>
                  {plans.filter((p) => parseFloat(p.price) > 0).length}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Controls */}
          <div className='flex items-center justify-between'>
            <div className='flex items-center space-x-2'>
              <Input
                placeholder='Tìm kiếm plans...'
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className='w-80'
              />
            </div>
            <div className='flex items-center space-x-2'>
              <Button disabled>
                <Plus className='mr-2 h-4 w-4' />
                Tạo Plan Mới (Coming Soon)
              </Button>
            </div>
          </div>

          {/* Plans Table */}
          <Card>
            <CardHeader>
              <CardTitle>Danh sách Plans</CardTitle>
              <CardDescription>Tất cả gói dịch vụ có trong hệ thống</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className='flex justify-center py-8'>
                  <div className='text-muted-foreground'>Đang tải...</div>
                </div>
              ) : error ? (
                <div className='text-destructive flex justify-center py-8'>
                  Có lỗi xảy ra khi tải dữ liệu
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tên Plan</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Giá</TableHead>
                      <TableHead>Camera</TableHead>
                      <TableHead>Lưu trữ</TableHead>
                      <TableHead>Caregivers</TableHead>
                      <TableHead>Sites</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead>Ngày tạo</TableHead>
                      <TableHead className='text-right'>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPlans.map((plan: Plan) => (
                      <TableRow key={plan.code}>
                        <TableCell className='font-medium'>{plan.name}</TableCell>
                        <TableCell>
                          <Badge variant='outline'>{plan.code}</Badge>
                        </TableCell>
                        <TableCell>{formatPrice(plan.price)}</TableCell>
                        <TableCell>{plan.camera_quota}</TableCell>
                        <TableCell>{plan.retention_days} ngày</TableCell>
                        <TableCell>{plan.caregiver_seats}</TableCell>
                        <TableCell>{plan.sites}</TableCell>
                        <TableCell>
                          <Badge variant={plan.is_active ? 'default' : 'secondary'}>
                            {plan.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDateVN(plan.created_at)}</TableCell>
                        <TableCell className='text-right'>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant='ghost' size='sm'>
                                <Settings className='h-4 w-4' />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align='end'>
                              <DropdownMenuItem disabled>
                                <Eye className='mr-2 h-4 w-4' />
                                Xem chi tiết (Coming Soon)
                              </DropdownMenuItem>
                              <DropdownMenuItem disabled>
                                <Edit className='mr-2 h-4 w-4' />
                                Chỉnh sửa (Coming Soon)
                              </DropdownMenuItem>
                              <DropdownMenuItem disabled>
                                <Package className='mr-2 h-4 w-4' />
                                Versions (Coming Soon)
                              </DropdownMenuItem>
                              <DropdownMenuItem className='text-destructive' disabled>
                                <Trash2 className='mr-2 h-4 w-4' />
                                Xóa plan (Coming Soon)
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </Main>
    </>
  );
}
