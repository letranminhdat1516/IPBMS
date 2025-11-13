import { DEFAULT_PAGE_SIZE } from '@/constants';
import { AlertCircle, AlertTriangle, Bell, CheckCircle, Eye, Search } from 'lucide-react';

import { useMemo, useState } from 'react';

import { useParams } from '@tanstack/react-router';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

import { cn } from '@/lib/utils';

import { useUserAlerts, useUserOverview } from '@/services/userDetail';

// interface AlertListItem {
//   id: string;
//   time: string;
//   type: string;
//   title: string;
//   description: string;
//   location: string;
//   status: string;
//   severity: 'high' | 'medium' | 'low';

//   actions: string[];
// }

interface AlertsTabsContentProps {
  isAdmin?: boolean;
}

interface AlertSummaryCardProps {
  icon: React.ReactNode;
  badge: React.ReactNode;
  value: React.ReactNode;
  description: React.ReactNode;
  cardClass?: string;
}

function AlertSummaryCard({ icon, badge, value, description, cardClass }: AlertSummaryCardProps) {
  return (
    <Card className={cn(cardClass, 'gap-2 py-3')}>
      <CardHeader>
        <div className='flex items-center justify-between'>
          {icon}
          {badge}
        </div>
      </CardHeader>
      <CardContent>
        <div className='mb-1 font-bold md:text-2xl'>{value}</div>
        <div className='mb-2 text-base font-medium'>{description}</div>
      </CardContent>
    </Card>
  );
}

export default function AlertsTabsContent({ isAdmin }: AlertsTabsContentProps) {
  const { userId } = useParams({ from: '/_authenticated/users/customer/detail/$userId' });
  // UI filters
  const [category, setCategory] = useState<'all' | 'emergency' | 'important' | 'info'>('all');
  const [range, setRange] = useState<'today' | 'week' | 'month'>('today');

  const mappedOverviewRange = useMemo(
    () => (range === 'week' ? '7d' : range === 'month' ? '30d' : 'today'),
    [range]
  );
  const severity = useMemo(() => {
    switch (category) {
      case 'emergency':
        return ['critical', 'high'];
      case 'important':
        return ['medium'];
      case 'info':
        return ['low'];
      default:
        return undefined;
    }
  }, [category]);
  const { dateFrom, dateTo } = useMemo(() => {
    const today = new Date();
    const toYmd = (d: Date) => d.toISOString().slice(0, 10);
    const end = toYmd(today);
    const d = new Date(today);
    if (range === 'week') d.setDate(d.getDate() - 7);
    else if (range === 'month') d.setDate(d.getDate() - 30);
    return { dateFrom: toYmd(d), dateTo: end };
  }, [range]);

  // Queries
  const { data: overview } = useUserOverview(userId, {
    range: mappedOverviewRange as 'today' | '7d' | '30d',
  });
  const {
    data: alerts,
    isLoading: loadingAlerts,
    isError: alertsError,
  } = useUserAlerts(userId, {
    page: 1,
    limit: DEFAULT_PAGE_SIZE,
    orderBy: 'detected_at',
    order: 'DESC',
    includeSummary: true,
    severity,
    dateFrom,
    dateTo,
  });

  const summary = overview?.alertsSummary;
  const summaryCards = [
    {
      icon: <AlertTriangle className='h-8 w-8 text-red-600 dark:text-red-400' />,
      badge: (
        <Badge
          className='rounded-full bg-red-600 px-4 py-1 text-base font-semibold text-white'
          variant='destructive'
        >
          Khẩn cấp
        </Badge>
      ),
      value: <span className='text-red-700 dark:text-red-300'>{summary?.emergencyToday ?? 0}</span>,
      description: <span className='text-red-700 dark:text-red-300'>Hôm nay</span>,
      cardClass: 'border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-500/10',
    },
    {
      icon: <AlertCircle className='h-8 w-8 text-yellow-600 dark:text-yellow-400' />,
      badge: (
        <Badge
          className='rounded-full border-yellow-600 bg-yellow-50 px-4 py-1 text-base font-semibold text-yellow-700 dark:border-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-300'
          variant='outline'
        >
          Quan trọng
        </Badge>
      ),
      value: (
        <span className='text-yellow-700 dark:text-yellow-300'>
          {overview?.alertsSummary?.bySeverity?.medium ?? 0}
        </span>
      ),
      description: <span className='text-yellow-700 dark:text-yellow-300'>Hôm nay</span>,
      cardClass: 'border-yellow-200 bg-yellow-50 dark:border-yellow-900/40 dark:bg-yellow-500/10',
    },
    {
      icon: <Bell className='h-8 w-8 text-blue-600 dark:text-blue-400' />,
      badge: (
        <Badge
          className='rounded-full bg-blue-50 px-4 py-1 text-base font-semibold text-blue-700 dark:bg-blue-500/10 dark:text-blue-300'
          variant='secondary'
        >
          Thông tin
        </Badge>
      ),
      value: <span className='text-blue-700 dark:text-blue-300'>{summary?.info7d ?? 0}</span>,
      description: <span className='text-blue-700 dark:text-blue-300'>7 ngày qua</span>,
      cardClass: 'border-blue-200 bg-blue-50 dark:border-blue-900/40 dark:bg-blue-500/10',
    },
    {
      icon: <CheckCircle className='h-8 w-8 text-green-600 dark:text-green-400' />,
      badge: (
        <Badge className='rounded-full bg-green-600 px-4 py-1 text-base font-semibold text-white'>
          Đã xử lý
        </Badge>
      ),
      value: (
        <span className='text-green-700 dark:text-green-300'>{summary?.resolved30d ?? 0}</span>
      ),
      description: <span className='text-green-700 dark:text-green-300'>30 ngày qua</span>,
      cardClass: 'border-green-200 bg-green-50 dark:border-green-900/40 dark:bg-green-500/10',
    },
  ];

  return (
    <>
      {/* Alert Management Dashboard */}
      <div className='grid grid-cols-1 gap-6 lg:grid-cols-4'>
        {summaryCards.map((card, idx) => (
          <AlertSummaryCard key={idx} {...card} />
        ))}
      </div>

      {/* Alert Filters and Search */}
      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <div>
              <CardTitle>Quản lý nhắc nhở</CardTitle>
              <CardDescription>Lọc và tìm kiếm nhắc nhở</CardDescription>
            </div>
            <Button disabled={isAdmin}>
              <Bell className='mr-2 h-4 w-4' />
              Cài đặt thông báo
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className='mb-6 flex flex-col gap-4 md:flex-row'>
            <div className='flex-1'>
              <div className='relative'>
                <Search className='text-muted-foreground absolute top-3 left-3 h-4 w-4' />
                <Input placeholder='Tìm kiếm nhắc nhở...' className='pl-10' />
              </div>
            </div>
            <Select
              defaultValue={category}
              onValueChange={(v: 'all' | 'emergency' | 'important' | 'info') => setCategory(v)}
            >
              <SelectTrigger className='w-48'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>Tất cả nhắc nhở</SelectItem>
                <SelectItem value='emergency'>Khẩn cấp</SelectItem>
                <SelectItem value='important'>Quan trọng</SelectItem>
                <SelectItem value='info'>Thông tin</SelectItem>
              </SelectContent>
            </Select>
            <Select
              defaultValue={range}
              onValueChange={(v: 'today' | 'week' | 'month') => setRange(v)}
            >
              <SelectTrigger className='w-48'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='today'>Hôm nay</SelectItem>
                <SelectItem value='week'>7 ngày qua</SelectItem>
                <SelectItem value='month'>30 ngày qua</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className='space-y-4'>
            {alertsError && (
              <div className='text-destructive text-sm'>
                Không tải được dữ liệu nhắc nhở. Vui lòng thử lại.
              </div>
            )}
            {loadingAlerts && (
              <div className='text-muted-foreground text-sm'>Đang tải nhắc nhở…</div>
            )}
            {!loadingAlerts && alerts?.items?.length === 0 && (
              <div className='text-muted-foreground text-sm'>
                Không có nhắc nhở nào trong khoảng đã chọn.
              </div>
            )}
            {alerts?.items?.map((item, index) => {
              const sev = item.severity;
              const dotClass =
                sev === 'critical' || sev === 'high'
                  ? 'bg-red-500'
                  : sev === 'medium'
                    ? 'bg-yellow-500'
                    : 'bg-blue-500';
              const badgeVariant: 'destructive' | 'outline' | 'secondary' =
                sev === 'critical' || sev === 'high'
                  ? 'destructive'
                  : sev === 'medium'
                    ? 'outline'
                    : 'secondary';
              const detectedLocal = new Date(item.detected_at).toLocaleString();
              return (
                <div key={index} className='space-y-3 rounded-lg border p-4'>
                  <div className='flex items-start justify-between'>
                    <div className='flex items-start space-x-3'>
                      <div className={`mt-2 h-3 w-3 rounded-full ${dotClass}`}></div>
                      <div className='flex-1'>
                        <div className='mb-1 flex items-center space-x-2'>
                          <h4 className='font-semibold capitalize'>{item.event_type}</h4>
                          <Badge variant={badgeVariant}>{sev}</Badge>
                          <span className='text-muted-foreground text-xs'>#{item.event_id}</span>
                        </div>
                        <p className='text-muted-foreground mb-2 text-sm'>
                          Độ tin cậy: {(item.confidence_score * 100).toFixed(0)}%
                        </p>
                        <div className='text-muted-foreground flex items-center space-x-4 text-xs'>
                          <span>{detectedLocal}</span>
                          {item.camera_id && <span>� Camera: {item.camera_id}</span>}
                          {item.status && <span>Trạng thái: {item.status}</span>}
                        </div>
                      </div>
                    </div>
                    <div className='flex items-center space-x-2'>
                      <Badge
                        variant={item.status === 'resolved' ? 'default' : 'outline'}
                        className='capitalize'
                      >
                        {item.status}
                      </Badge>
                      <Button variant='outline' size='sm' disabled={isAdmin}>
                        <Eye className='mr-1 h-4 w-4' />
                        Chi tiết
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Emergency Response Protocol */}
      {/* <Card>
          <CardHeader>
            <CardTitle className='text-red-600'>Quy trình ứng phó khẩn cấp</CardTitle>
            <CardDescription>Các bước tự động khi phát hiện tình huống khẩn cấp</CardDescription>
          </CardHeader>
          <CardContent>
            <div className='grid grid-cols-1 gap-6 md:grid-cols-3'>
              <div className='rounded-lg border p-4 text-center'>
                <div className='mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-100'>
                  <AlertTriangle className='h-6 w-6 text-red-600' />
                </div>
                <h4 className='mb-2 font-semibold'>Bước 1: Phát hiện</h4>
                <p className='text-sm text-gray-600'>AI phát hiện sự cố và xác nhận trong 5 giây</p>
              </div>
              <div className='rounded-lg border p-4 text-center'>
                <div className='mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100'>
                  <Phone className='h-6 w-6 text-yellow-600' />
                </div>
                <h4 className='mb-2 font-semibold'>Bước 2: Thông báo</h4>
                <p className='text-sm text-gray-600'>
                  Gọi điện và gửi tin nhắn cho người thân trong 30 giây
                </p>
              </div>
              <div className='rounded-lg border p-4 text-center'>
                <div className='mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100'>
                  <Shield className='h-6 w-6 text-green-600' />
                </div>
                <h4 className='mb-2 font-semibold'>Bước 3: Hỗ trợ</h4>
                <p className='text-sm text-gray-600'>Liên hệ dịch vụ y tế và theo dõi tình hình</p>
              </div>
            </div>
          </CardContent>
        </Card> */}

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Cài đặt thông báo</CardTitle>
          <CardDescription>
            Tùy chỉnh cách thức và người nhận thông báo
            <span className='text-muted-foreground ml-2 text-xs'>(Chế độ chỉ đọc với admin)</span>
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-6'>
          <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
            <div className='space-y-4'>
              <h4 className='font-medium'>Phương thức thông báo</h4>
              <div className='space-y-3'>
                <div className='flex items-center justify-between'>
                  <Label>Cuộc gọi tự động</Label>
                  <Switch defaultChecked disabled />
                </div>
                <div className='flex items-center justify-between'>
                  <Label>Tin nhắn SMS</Label>
                  <Switch defaultChecked disabled />
                </div>
                <div className='flex items-center justify-between'>
                  <Label>Email</Label>
                  <Switch defaultChecked disabled />
                </div>
                <div className='flex items-center justify-between'>
                  <Label>Thông báo ứng dụng</Label>
                  <Switch defaultChecked disabled />
                </div>
              </div>
            </div>

            <div className='space-y-4'>
              <h4 className='font-medium'>Thời gian thông báo</h4>
              <div className='space-y-3'>
                <div>
                  <Label className='text-sm'>Giờ bắt đầu</Label>
                  <Input type='time' defaultValue='06:00' disabled />
                </div>
                <div>
                  <Label className='text-sm'>Giờ kết thúc</Label>
                  <Input type='time' defaultValue='22:00' disabled />
                </div>
                <div className='flex items-center justify-between'>
                  <Label>Thông báo 24/7 cho khẩn cấp</Label>
                  <Switch defaultChecked disabled />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
