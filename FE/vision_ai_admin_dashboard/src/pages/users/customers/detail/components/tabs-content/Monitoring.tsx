import { AlertCircle, AlertTriangle, Bell, CheckCircle, Save, TrendingUp } from 'lucide-react';

import { useEffect, useMemo, useState } from 'react';

import { useParams } from '@tanstack/react-router';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';

import { usePatchUserMonitoringSettings, useUserMonitoring } from '@/services/userDetail';

interface MonitoringTabsContentProps {
  isAdmin?: boolean;
}

export default function MonitoringTabsContent({ isAdmin }: MonitoringTabsContentProps) {
  const { userId } = useParams({ from: '/_authenticated/users/customer/detail/$userId' });
  const {
    data: monitoring,
    isLoading,
    isError,
  } = useUserMonitoring(userId, {
    include: 'settings,analytics,timeline',
  });

  type SettingsShape = {
    fallDetection: boolean;
    sleepMonitoring: boolean;
    medicationReminders: boolean;
    abnormalDetection: boolean;
    sensitivity: 'low' | 'medium' | 'high';
    maxSitMinutes: number;
  };

  const [settings, setSettings] = useState<SettingsShape | null>(null);
  const [original, setOriginal] = useState<SettingsShape | null>(null);
  const mutation = usePatchUserMonitoringSettings(userId);

  useEffect(() => {
    if (monitoring?.settings) {
      const s = monitoring.settings as SettingsShape;
      setSettings(s);
      setOriginal(s);
    }
  }, [monitoring?.settings]);

  const analytics = monitoring?.analytics24h;
  const timeline = monitoring?.timeline ?? [];

  const dirty = useMemo(() => {
    if (!settings || !original) return false;
    return JSON.stringify(settings) !== JSON.stringify(original);
  }, [settings, original]);

  const canEdit = !isAdmin && !isLoading && !mutation.isPending && !!settings;

  return (
    <>
      {isError && (
        <Card className='mb-6'>
          <CardHeader>
            <CardTitle>Lỗi tải dữ liệu giám sát</CardTitle>
            <CardDescription>
              Không thể tải dữ liệu từ máy chủ. Vui lòng thử lại sau.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Behavior Detection Analytics + Settings */}
      <div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
        <Card>
          <CardHeader>
            <CardTitle>Phân tích hành vi AI</CardTitle>
            <CardDescription>Thống kê chi tiết 24h qua</CardDescription>
          </CardHeader>
          <CardContent className='space-y-6'>
            <div className='space-y-4'>
              <div>
                <div className='mb-2 flex items-center justify-between'>
                  <span className='text-sm font-medium'>Đi lại bình thường</span>
                  <span className='text-sm font-medium text-green-700 dark:text-green-300'>
                    {analytics?.normalWalkCount ?? 0} lần
                  </span>
                </div>
                <Progress
                  value={Math.min(100, (analytics?.normalWalkCount ?? 0) % 101)}
                  className='h-3'
                />
                <p className='text-muted-foreground mt-1 text-xs'>Trong 24 giờ qua</p>
              </div>
              <div>
                <div className='mb-2 flex items-center justify-between'>
                  <span className='text-sm font-medium'>Ngồi/nằm nghỉ</span>
                  <span className='text-sm font-medium text-blue-700 dark:text-blue-300'>
                    {analytics?.sitLieMinutes ?? 0} phút
                  </span>
                </div>
                <Progress
                  value={Math.min(100, ((analytics?.sitLieMinutes ?? 0) / 10) % 101)}
                  className='h-3'
                />
                <p className='text-muted-foreground mt-1 text-xs'>Trong 24 giờ qua</p>
              </div>
              <div>
                <div className='mb-2 flex items-center justify-between'>
                  <span className='text-sm font-medium'>Hoạt động bất thường</span>
                  <span className='text-sm font-medium text-yellow-700 dark:text-yellow-300'>
                    {analytics?.abnormalCount ?? 0} lần
                  </span>
                </div>
                <Progress
                  value={Math.min(100, (analytics?.abnormalCount ?? 0) * 10)}
                  className='h-3'
                />
                <p className='text-muted-foreground mt-1 text-xs'>Trong 24 giờ qua</p>
              </div>
              <div>
                <div className='mb-2 flex items-center justify-between'>
                  <span className='text-sm font-medium'>Nhắc nhở khẩn cấp</span>
                  <span className='text-sm font-medium text-red-700 dark:text-red-300'>
                    {analytics?.emergencyCount ?? 0} lần
                  </span>
                </div>
                <Progress
                  value={Math.min(100, (analytics?.emergencyCount ?? 0) * 20)}
                  className='h-3'
                />
                <p className='text-muted-foreground mt-1 text-xs'>Trong 24 giờ qua</p>
              </div>
            </div>

            <Separator />

            <div>
              <h4 className='mb-3 font-medium'>Độ chính xác AI</h4>
              <div className='grid grid-cols-2 gap-4'>
                <div className='rounded-lg bg-green-500/10 p-3 text-center'>
                  <div className='text-2xl font-bold text-green-600'>
                    {analytics?.aiAccuracy?.fall != null ? `${analytics.aiAccuracy.fall}%` : '—'}
                  </div>
                  <div className='text-muted-foreground text-xs'>Phát hiện ngã</div>
                </div>
                <div className='rounded-lg bg-blue-500/10 p-3 text-center'>
                  <div className='text-2xl font-bold text-blue-600'>
                    {analytics?.aiAccuracy?.activity != null
                      ? `${analytics.aiAccuracy.activity}%`
                      : '—'}
                  </div>
                  <div className='text-muted-foreground text-xs'>Nhận diện hoạt động</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cài đặt giám sát (Admin)</CardTitle>
            <CardDescription>Tùy chỉnh các thông số giám sát cho khách hàng này</CardDescription>
          </CardHeader>
          <CardContent className='space-y-6'>
            <div className='space-y-4'>
              <div className='flex items-center justify-between'>
                <div>
                  <Label className='text-sm font-medium'>Phát hiện ngã</Label>
                  <p className='text-muted-foreground text-xs'>Nhắc nhở khi phát hiện ngã xuống</p>
                </div>
                <Switch
                  checked={settings?.fallDetection ?? false}
                  onCheckedChange={(v) =>
                    setSettings((s) => (s ? { ...s, fallDetection: Boolean(v) } : s))
                  }
                  disabled={!canEdit}
                />
              </div>
              <div className='flex items-center justify-between'>
                <div>
                  <Label className='text-sm font-medium'>Giám sát giấc ngủ</Label>
                  <p className='text-muted-foreground text-xs'>Theo dõi chất lượng giấc ngủ</p>
                </div>
                <Switch
                  checked={settings?.sleepMonitoring ?? false}
                  onCheckedChange={(v) =>
                    setSettings((s) => (s ? { ...s, sleepMonitoring: Boolean(v) } : s))
                  }
                  disabled={!canEdit}
                />
              </div>
              <div className='flex items-center justify-between'>
                <div>
                  <Label className='text-sm font-medium'>Nhắc nhở uống thuốc</Label>
                  <p className='text-muted-foreground text-xs'>Thông báo khi quên uống thuốc</p>
                </div>
                <Switch
                  checked={settings?.medicationReminders ?? false}
                  onCheckedChange={(v) =>
                    setSettings((s) => (s ? { ...s, medicationReminders: Boolean(v) } : s))
                  }
                  disabled={!canEdit}
                />
              </div>
              <div className='flex items-center justify-between'>
                <div>
                  <Label className='text-sm font-medium'>Phát hiện bất thường</Label>
                  <p className='text-muted-foreground text-xs'>Nhắc nhở hành vi bất thường</p>
                </div>
                <Switch
                  checked={settings?.abnormalDetection ?? false}
                  onCheckedChange={(v) =>
                    setSettings((s) => (s ? { ...s, abnormalDetection: Boolean(v) } : s))
                  }
                  disabled={!canEdit}
                />
              </div>
            </div>

            <Separator />

            <div className='space-y-3'>
              <Label className='text-sm font-medium'>Độ nhạy nhắc nhở</Label>
              <Select
                value={settings?.sensitivity ?? 'medium'}
                onValueChange={(v: 'low' | 'medium' | 'high') =>
                  setSettings((s) => (s ? { ...s, sensitivity: v } : s))
                }
                disabled={!canEdit}
              >
                <SelectTrigger>
                  <SelectValue placeholder='Chọn độ nhạy' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='low'>Thấp - Ít nhắc nhở</SelectItem>
                  <SelectItem value='medium'>Trung bình - Cân bằng</SelectItem>
                  <SelectItem value='high'>Cao - Nhiều nhắc nhở</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className='space-y-3'>
              <Label className='text-sm font-medium'>Thời gian ngồi tối đa (phút)</Label>
              <Input
                type='number'
                value={settings?.maxSitMinutes ?? 120}
                min={1}
                onChange={(e) =>
                  setSettings((s) =>
                    s ? { ...s, maxSitMinutes: Math.max(1, Number(e.target.value) || 1) } : s
                  )
                }
                disabled={!canEdit}
              />
            </div>

            <Button
              type='button'
              className='mt-2 w-full'
              disabled={isAdmin || !dirty || mutation.isPending || !settings}
              onClick={() => settings && mutation.mutate(settings)}
            >
              <Save className='mr-2 h-4 w-4' />
              {mutation.isPending ? 'Đang lưu…' : dirty ? 'Lưu cài đặt' : 'Đã cập nhật'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Activity Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Dòng thời gian hoạt động</CardTitle>
          <CardDescription>Theo dõi hoạt động chi tiết trong ngày</CardDescription>
        </CardHeader>
        <CardContent>
          {isAdmin ? (
            <div className='space-y-5'>
              <div className='mb-2 flex items-center gap-3'>
                <CheckCircle className='h-6 w-6 text-green-600' />
                <span className='text-xl font-bold'>Tóm tắt hoạt động trong ngày</span>
              </div>
              <div className='flex items-center gap-2 pl-1'>
                <span className='font-medium text-gray-700 dark:text-gray-200'>
                  Tổng số hoạt động:
                </span>
                <span className='text-lg font-semibold text-blue-700 dark:text-blue-300'>
                  {timeline.length}
                </span>
                <span className='text-sm text-gray-500'>(AI ghi nhận)</span>
              </div>
              <div className='flex items-center gap-2 pl-1'>
                <AlertCircle className='h-4 w-4 text-gray-500' />
                <span className='font-medium'>Tình trạng chung:</span>
                {analytics?.emergencyCount ? (
                  <Badge variant='destructive'>{analytics.emergencyCount} khẩn cấp</Badge>
                ) : (
                  <Badge variant='secondary'>Không bất thường</Badge>
                )}
                <span className='text-xs text-gray-400'>
                  {analytics?.emergencyCount ? 'Cần theo dõi' : 'Không phát hiện nguy cơ lớn'}
                </span>
              </div>
              <div className='flex flex-col gap-2 pl-1'>
                <div className='flex items-center gap-2'>
                  <AlertTriangle className='h-4 w-4 text-red-500' />
                  <span className='font-medium'>Nhắc nhở:</span>
                  <Badge variant='destructive'>{analytics?.emergencyCount ?? 0} khẩn cấp</Badge>
                  <Badge variant='default'>{analytics?.abnormalCount ?? 0} bất thường</Badge>
                </div>
                <span className='text-muted-foreground pl-6 text-xs'>
                  Tóm tắt dựa trên dữ liệu 24 giờ qua.
                </span>
              </div>
              <div className='space-y-2 pl-6'>
                {timeline.slice(0, 3).map((it, idx) => {
                  const isEmergency = it.type === 'emergency';
                  const time = new Date(it.time).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  });
                  return (
                    <div
                      key={idx}
                      className='bg-card/60 text-card-foreground flex items-start gap-3 rounded border p-3 shadow-sm'
                    >
                      <div>
                        {isEmergency ? (
                          <AlertTriangle className='mt-1 h-5 w-5 text-red-500' />
                        ) : (
                          <Bell className='mt-1 h-5 w-5 text-blue-500' />
                        )}
                      </div>
                      <div className='flex-1'>
                        <div className='flex items-center gap-2'>
                          <span className='font-semibold capitalize'>{it.activity}</span>
                          <Badge
                            variant={isEmergency ? 'destructive' : 'default'}
                            className='text-xs capitalize'
                          >
                            {it.type}
                          </Badge>
                          <span className='text-muted-foreground text-xs'>{time}</span>
                        </div>
                        {it.location && (
                          <div className='text-foreground mt-1 text-xs'>Vị trí: {it.location}</div>
                        )}
                        {it.duration != null && (
                          <div className='mt-1 text-xs text-green-700 dark:text-green-300'>
                            Thời lượng: {it.duration} phút
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                {timeline.length === 0 && (
                  <div className='text-muted-foreground text-sm'>Không có hoạt động nào.</div>
                )}
              </div>
              <div className='flex items-start gap-2 rounded bg-blue-500/10 p-3 text-base text-blue-900 dark:text-blue-300'>
                <TrendingUp className='mt-0.5 h-5 w-5 text-blue-600 dark:text-blue-400' />
                <div>
                  <b>Kết luận AI:</b>{' '}
                  {analytics?.emergencyCount ? 'Có sự cố cần chú ý' : 'Hoạt động bình thường'}.
                  <div className='text-muted-foreground mt-1 text-xs'>
                    Đây là đánh giá tổng thể, không bao gồm chi tiết cá nhân.
                  </div>
                </div>
              </div>
              <div className='text-muted-foreground pl-1 text-xs'>
                Chi tiết vị trí, thời gian, video và dữ liệu riêng tư đã được ẩn để bảo mật.
              </div>
            </div>
          ) : (
            <div className='space-y-4'>
              {timeline.map((it, idx) => {
                const t = new Date(it.time);
                const timeStr = isNaN(t.getTime())
                  ? it.time
                  : t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const kind = it.type as 'normal' | 'emergency' | 'medication' | string;
                const dotCls =
                  kind === 'emergency'
                    ? 'bg-red-500'
                    : kind === 'medication'
                      ? 'bg-blue-500'
                      : 'bg-green-500';
                const durationStr =
                  typeof it.duration === 'number' ? `${it.duration} phút` : undefined;
                return (
                  <div key={idx} className='flex items-start gap-3 rounded-lg border p-3'>
                    <div className={`mt-2 h-3 w-3 rounded-full ${dotCls}`}></div>
                    <div className='flex-1'>
                      <div className='flex items-center justify-between'>
                        <div className='flex items-center gap-2'>
                          <span className='font-semibold'>{it.activity}</span>
                          <Badge
                            variant={kind === 'emergency' ? 'destructive' : 'default'}
                            className='capitalize'
                          >
                            {kind}
                          </Badge>
                        </div>
                        <span className='text-muted-foreground text-xs'>{timeStr}</span>
                      </div>
                      {it.location && (
                        <div className='text-muted-foreground mt-1 text-sm'>
                          Vị trí: {it.location}
                        </div>
                      )}
                      {durationStr && (
                        <div className='text-muted-foreground text-xs'>
                          Thời lượng: {durationStr}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {timeline.length === 0 && (
                <div className='text-muted-foreground text-sm'>
                  Không có hoạt động nào trong ngày.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
