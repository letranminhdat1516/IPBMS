import { toast } from 'sonner';

import { useMemo, useState } from 'react';

import { useQuery } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';

import { useAuth } from '@/hooks/use-auth';

import { cn } from '@/lib/utils';

import type { SystemSetting } from '@/types/system-setting';

import { getMe } from '@/services/auth';
import { useNormalizedSystemSettings, usePutSystemSetting } from '@/services/system';

import { TabContent } from './components/tab/tab-content';
import { tabs } from './data/tabs';

export default function ConfigurationPage() {
  // Lưu trữ cài đặt hệ thống dưới dạng object: { [tab]: SystemSetting }
  const [tab, setTab] = useState('camera');
  const [settings, setSettings] = useState<Record<string, SystemSetting>>({});
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Lấy cài đặt ban đầu từ máy chủ
  const keys = useMemo(
    () => ['camera', 'image_config', 'notification_channels', 'ai_frequency', 'log_config'],
    []
  );
  const { data: normalizedData, isLoading } = useNormalizedSystemSettings({ keys: keys.join(',') });

  const initialSettings = useMemo(() => {
    return (normalizedData as Record<string, unknown> | undefined) || {};
  }, [normalizedData]);

  const auth = useAuth();

  // Fetch user info từ API để đảm bảo có dữ liệu mới nhất
  const { data: userData } = useQuery({
    queryKey: ['me'],
    queryFn: () => getMe(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Sử dụng user data từ API nếu có, nếu không thì dùng từ auth store
  const currentUser = userData || auth?.user;

  // Kiểm tra cả role và type (API có thể trả về type thay vì role)
  // Cũng kiểm tra một số role/type admin khác
  const isAdmin = Boolean(
    currentUser &&
      (('user' in currentUser &&
        currentUser.user &&
        currentUser.user.role &&
        (currentUser.user.role.includes('admin') ||
          currentUser.user.role.includes('superuser') ||
          currentUser.user.role.includes('administrator'))) ||
        ('type' in currentUser &&
          currentUser.type &&
          (currentUser.type.includes('admin') ||
            currentUser.type.includes('superuser') ||
            currentUser.type.includes('administrator'))))
  );

  // Fallback: Nếu không thể xác định từ user object, thử kiểm tra từ localStorage hoặc cookie
  const fallbackAdminCheck = () => {
    try {
      const userData = localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        return Boolean(
          user &&
            ((user.role && (user.role.includes('admin') || user.role.includes('superuser'))) ||
              (user.type && (user.type.includes('admin') || user.type.includes('superuser'))))
        );
      }
    } catch (_) {
      toast.error('Không thể xác định quyền admin của user.');
    }
    return false;
  };

  const finalIsAdmin = isAdmin || fallbackAdminCheck();

  // Map visible tab to the system setting key used by the API
  const settingKey = useMemo(() => {
    switch (tab) {
      case 'camera':
        return 'camera';
      case 'ai':
        return 'ai_frequency';
      case 'notification':
        return 'notification_channels';
      case 'image':
        return 'image_config';
      case 'log':
        return 'log_config';
      default:
        return tab;
    }
  }, [tab]);

  const putMutation = usePutSystemSetting(settingKey);

  // Lưu cài đặt cho từng tab (hoặc từng user nếu cần)
  async function handleSave(setting: SystemSetting) {
    setSaveStatus('idle');
    try {
      await putMutation.mutateAsync({ value: setting.value, description: setting.description });
      setSettings((prev) => ({ ...prev, [setting.key]: setting }));
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 1500);
    } catch (_e) {
      setSaveStatus('error');
    }
  }

  function handleReset() {
    // Đặt lại về giá trị mặc định cho từng tab
    if (tab === 'camera') {
      handleSave({
        setting_id: 1,
        key: 'camera',
        value: '30,80%',
        description: 'Cấu hình camera giám sát',
      });
    } else if (tab === 'ai') {
      handleSave({
        setting_id: 2,
        key: 'ai_frequency',
        value: '10',
        description: 'Tần suất phân tích AI',
      });
    } else if (tab === 'notification') {
      // Đặt lại thành giá trị mặc định đơn giản cho kênh thông báo (FE sẽ điều chỉnh nếu cần)
      handleSave({
        setting_id: 3,
        key: 'notification_channels',
        value: 'all',
        description: 'Kênh thông báo hệ thống',
      });
    } else if (tab === 'image') {
      handleSave({
        setting_id: 4,
        key: 'image_config',
        value: '',
        description: 'Thư mục lưu trữ hình ảnh',
      });
    }
  }

  return (
    <div className='mx-auto w-full max-w-6xl p-6'>
      <h1 className='mb-6 text-2xl font-bold'>Thiết lập cấu hình ban đầu</h1>
      <div className='flex gap-8'>
        {/* Sidebar tab menu */}
        <div className='w-56 shrink-0 border-r pr-4'>
          <div className='text-muted-foreground mb-2 text-sm'>
            Cấu hình mặc định cho ứng dụng phần mềm giám sát y tế Vision AI
          </div>
          <div className='flex flex-col gap-1'>
            {tabs.map((t) => {
              // Các tabs chỉ admin mới thấy
              const adminOnlyTabs = ['camera', 'image', 'notification', 'ai'];

              // Ẩn tabs chỉ dành cho admin nếu user không phải admin
              if (adminOnlyTabs.includes(t.value) && !finalIsAdmin) return null;

              // Luôn hiển thị tabs cơ bản
              return (
                <Button
                  key={t.value}
                  className={cn(
                    'rounded px-3 py-2 text-left font-medium transition-colors',
                    'hover:shadow-sm'
                  )}
                  variant={tab === t.value ? 'default' : 'outline'}
                  onClick={() => setTab(t.value)}
                >
                  {t.label}
                </Button>
              );
            })}
          </div>
        </div>
        {/* Main content */}
        <div className='flex-1'>
          {isLoading ? (
            <div className='text-muted-foreground p-6'>Đang tải cấu hình hệ thống…</div>
          ) : (
            <TabContent
              isAdmin={finalIsAdmin}
              tab={tab}
              onSave={handleSave}
              saving={putMutation.isPending}
              saveStatus={saveStatus}
              onReset={handleReset}
              initialSettings={
                initialSettings as Record<string, import('@/services/system').NormalizedSetting>
              }
            />
          )}
          {/* Fallback khi không có content */}
          {!isLoading &&
            !['camera', 'log', 'ai', 'notification', 'image', 'emergency'].includes(tab) && (
              <div className='p-6 text-red-500'>
                ❌ Lỗi: Tab &quot;{tab}&quot; không được hỗ trợ hoặc bạn không có quyền truy cập vào
                tính năng này.
              </div>
            )}
          {/* Hiển thị settings đã lưu (demo) */}
          <div className='mt-8'>
            <h3 className='mb-2 text-base font-semibold'>Cấu hình hệ thống đã lưu:</h3>
            <ul className={cn('text-foreground list-disc space-y-2 pl-5 text-sm')}>
              {Object.values(settings).map((s) => (
                <li
                  key={s.key}
                  className={cn(
                    'flex flex-col justify-between gap-1 break-words',
                    'sm:flex-row sm:items-center sm:gap-2'
                  )}
                >
                  <div className={cn('flex items-center gap-2')}>
                    <b className={cn('max-w-[120px] truncate')} title={s.key}>
                      {s.key}
                    </b>
                    :
                    <span className={cn('max-w-sm truncate')} title={String(s.value)}>
                      {typeof s.value === 'string'
                        ? s.value
                        : typeof s.value === 'object' && s.value !== null
                          ? 'Object'
                          : String(s.value)}
                    </span>
                  </div>
                  <span
                    className={cn(
                      'mt-1 inline-block rounded px-2 py-0.5 text-xs sm:mt-0',
                      s.value === '' || s.value === '0'
                        ? 'bg-red-100 text-red-600'
                        : 'bg-green-100 text-green-700'
                    )}
                  >
                    {s.value === '' || s.value === '0' ? 'Chưa được cấu hình' : 'Đã được cấu hình'}
                  </span>
                  <span
                    className={cn(
                      'text-muted-foreground max-w-full text-xs break-words sm:ml-2 sm:max-w-xs'
                    )}
                    title={s.description}
                  >
                    ({s.description})
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
