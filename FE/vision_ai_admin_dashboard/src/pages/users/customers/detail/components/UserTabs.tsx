import { HeartPulse } from 'lucide-react';

import { useState } from 'react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { cn } from '@/lib/utils';

import QuotaTabsContent from './QuotaCard';
import AdminTabsContent from './tabs-content/Admin';
import ServicesTabsContent from './tabs-content/Services';

interface UserTab {
  key: string;
  label: string;
  info?: number;
}
interface UserTabsProps {
  tabs?: UserTab[];
  activeTab?: string;
  onTabChange?: (key: string) => void;
  isAdmin?: boolean;
}

const tabsDefault: UserTab[] = [
  // { key: 'overview', label: 'Tổng quan' },
  { key: 'services', label: 'Dịch vụ' },
  { key: 'quota', label: 'Quota' },
  { key: 'admin', label: 'Quản trị' },
];

export function UserTabs({ tabs, activeTab: controlledActiveTab, onTabChange }: UserTabsProps) {
  const tabList = tabs ?? tabsDefault;
  const [internalTab, setInternalTab] = useState(tabList[0]?.key || 'services');
  const activeTab = controlledActiveTab ?? internalTab;
  const handleTabChange = (key: string) => {
    if (onTabChange) {
      onTabChange(key);
    } else {
      setInternalTab(key);
    }
  };
  const getTabIcon = (key: string) => {
    switch (key) {
      case 'services':
      case 'service':
        return <HeartPulse className='mr-1 h-4 w-4' />;
      default:
        return null;
    }
  };

  const tabsListLength = tabList.length;

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className='mb-6'>
      <TabsList
        className={cn(
          'grid w-full gap-2',
          tabsListLength > 3 && 'grid-cols-3 overflow-x-auto',
          tabsListLength <= 3 && `grid-cols-${tabsListLength}`
        )}
      >
        {tabList.map((tab) => (
          <TabsTrigger key={tab.key} value={tab.key}>
            <span className='flex items-center gap-1'>
              {getTabIcon(tab.key)}
              {tab.label}
              {typeof tab.info !== 'undefined' && (
                <span className='text-muted-foreground ml-1 text-xs font-semibold'>{tab.info}</span>
              )}
            </span>
          </TabsTrigger>
        ))}
      </TabsList>
      {/* <TabsContent value='overview' className='space-y-6'>
        <OverviewTabsContent />
      </TabsContent> */}

      <TabsContent value='services' className='space-y-6'>
        <ServicesTabsContent />
      </TabsContent>

      <TabsContent value='quota' className='space-y-6'>
        <QuotaTabsContent />
      </TabsContent>
      <TabsContent value='admin' className='space-y-6'>
        <AdminTabsContent />
      </TabsContent>
    </Tabs>
  );
}
