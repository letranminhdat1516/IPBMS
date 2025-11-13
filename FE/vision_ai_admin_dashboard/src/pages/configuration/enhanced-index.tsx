import { Monitor, Server, Settings, Shield, ToggleLeft } from 'lucide-react';
// Additional imports for legacy configuration functionality
import { toast } from 'sonner';

import { useMemo, useState } from 'react';

import { useQuery } from '@tanstack/react-query';

import { Header } from '@/components/layout/header';
import { Main } from '@/components/layout/main';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { useAuth } from '@/hooks/use-auth';

import type { SystemSetting } from '@/types/system-setting';

import { getMe } from '@/services/auth';
import { useNormalizedSystemSettings, usePutSystemSetting } from '@/services/system';

// Import enhanced tab content components
import { EnhancedTabContent, LegacyTabContent } from './components/tab/enhanced-tab-content';
// Import existing configuration components for backward compatibility
import { tabs as legacyTabs } from './data/tabs';

const newTabs = [
  {
    id: 'overview',
    label: 'Tổng quan hệ thống',
    icon: Monitor,
  },
  {
    id: 'features',
    label: 'Quản lý tính năng',
    icon: ToggleLeft,
  },
  {
    id: 'security',
    label: 'Bảo mật',
    icon: Shield,
  },
  {
    id: 'actions',
    label: 'Hành động hệ thống',
    icon: Settings,
  },
];

export default function EnhancedConfigurationPage() {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <>
      <Header>
        <div className='flex items-center gap-4'>
          <Settings className='h-6 w-6' />
          <div>
            <h1 className='text-2xl font-bold'>Cấu hình hệ thống</h1>
            <p className='text-muted-foreground'>Quản lý cài đặt và cấu hình toàn bộ hệ thống</p>
          </div>
        </div>
      </Header>

      <Main>
        <div className='space-y-6'>
          {/* System Status Overview */}
          <div className='grid gap-4 md:grid-cols-4'>
            <Card>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium'>Trạng thái hệ thống</CardTitle>
                <Monitor className='text-muted-foreground h-4 w-4' />
              </CardHeader>
              <CardContent>
                <div className='flex items-center gap-2'>
                  <Badge variant='outline' className='border-green-200 bg-green-50 text-green-700'>
                    Hoạt động
                  </Badge>
                </div>
                <p className='text-muted-foreground mt-1 text-xs'>
                  Tất cả dịch vụ đang hoạt động bình thường
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium'>Tính năng đang hoạt động</CardTitle>
                <ToggleLeft className='text-muted-foreground h-4 w-4' />
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold'>12</div>
                <p className='text-muted-foreground text-xs'>Tính năng đã kích hoạt</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium'>Bảo mật</CardTitle>
                <Shield className='text-muted-foreground h-4 w-4' />
              </CardHeader>
              <CardContent>
                <div className='flex items-center gap-2'>
                  <Badge variant='outline' className='border-blue-200 bg-blue-50 text-blue-700'>
                    Bảo mật cao
                  </Badge>
                </div>
                <p className='text-muted-foreground mt-1 text-xs'>
                  Tất cả chính sách bảo mật được áp dụng
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium'>Maintenance</CardTitle>
                <Server className='text-muted-foreground h-4 w-4' />
              </CardHeader>
              <CardContent>
                <div className='flex items-center gap-2'>
                  <Badge variant='outline' className='border-gray-200 bg-gray-50 text-gray-700'>
                    Sẵn sàng
                  </Badge>
                </div>
                <p className='text-muted-foreground mt-1 text-xs'>
                  Hệ thống không trong chế độ bảo trì
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Main Configuration Tabs */}
          <Card>
            <CardHeader>
              <CardTitle>Quản lý cấu hình</CardTitle>
              <CardDescription>
                Cấu hình và quản lý các thành phần chính của hệ thống
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab} className='space-y-6'>
                <TabsList className='grid w-full grid-cols-4'>
                  {newTabs.map((tab) => (
                    <TabsTrigger key={tab.id} value={tab.id} className='flex items-center gap-2'>
                      <tab.icon className='h-4 w-4' />
                      <span className='hidden sm:inline'>{tab.label}</span>
                    </TabsTrigger>
                  ))}
                </TabsList>

                {newTabs.map((tab) => (
                  <TabsContent key={tab.id} value={tab.id}>
                    <EnhancedTabContent tab={tab.id} />
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>

          {/* Legacy Configuration Section */}
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Server className='h-5 w-5' />
                Cấu hình chi tiết
              </CardTitle>
              <CardDescription>Cấu hình chi tiết các thành phần hệ thống</CardDescription>
            </CardHeader>
            <CardContent>
              <LegacyConfigurationTabs />
            </CardContent>
          </Card>
        </div>
      </Main>
    </>
  );
}

// Legacy configuration component wrapped for backward compatibility
function LegacyConfigurationTabs() {
  const [legacyTab, setLegacyTab] = useState('camera');
  const [_settings, setSettings] = useState<Record<string, SystemSetting>>({});
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Lấy cài đặt ban đầu từ máy chủ
  const keys = useMemo(
    () => ['camera', 'image_config', 'notification_channels', 'ai_frequency', 'log_config'],
    []
  );
  const { data: initialSettings, isLoading } = useNormalizedSystemSettings({
    keys: keys.join(','),
  });

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

  // Map visible tab to the system setting key used by the API
  const settingKey = useMemo(() => {
    switch (legacyTab) {
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
        return legacyTab;
    }
  }, [legacyTab]);

  const putMutation = usePutSystemSetting(settingKey);

  // Lưu cài đặt cho từng tab
  async function handleSave(setting: SystemSetting) {
    setSaveStatus('idle');
    try {
      await putMutation.mutateAsync({ value: setting.value, description: setting.description });
      setSettings((prev) => ({ ...prev, [setting.key]: setting }));
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 1500);
    } catch (_e) {
      setSaveStatus('error');
      toast.error('Lỗi khi lưu cài đặt hệ thống');
    }
  }

  function handleReset() {
    // Reset về giá trị mặc định
    if (legacyTab === 'camera') {
      handleSave({
        setting_id: 1,
        key: 'camera',
        value: '30,80%',
        description: 'Cài đặt camera mặc định',
      });
    }
    // Add other reset logic for different tabs as needed
  }

  if (isLoading) {
    return (
      <div className='py-8 text-center'>
        <p>Đang tải cấu hình...</p>
      </div>
    );
  }

  return (
    <Tabs value={legacyTab} onValueChange={setLegacyTab} className='space-y-4'>
      <TabsList className='grid w-full grid-cols-6'>
        {legacyTabs.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value} className='text-xs'>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>

      {legacyTabs.map((tab) => (
        <TabsContent key={tab.value} value={tab.value}>
          <div className='space-y-4'>
            <div className='border-b pb-2'>
              <h3 className='text-lg font-semibold'>{tab.label}</h3>
              <p className='text-muted-foreground text-sm'>
                Cấu hình chi tiết cho {tab.label.toLowerCase()}
              </p>
            </div>
            <LegacyTabContent
              isAdmin={isAdmin}
              tab={tab.value}
              onSave={handleSave}
              saving={putMutation.isPending}
              saveStatus={saveStatus}
              onReset={handleReset}
              initialSettings={initialSettings ?? {}}
            />
          </div>
        </TabsContent>
      ))}
    </Tabs>
  );
}
