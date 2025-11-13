import { FeatureManagementTab } from '../feature-management-tab';
import { SecurityTab } from '../security-tab';
import { SystemActionsTab } from '../system-actions-tab';
import { SystemOverviewTab } from '../system-overview-tab';

export function EnhancedTabContent({ tab }: { tab: string }) {
  switch (tab) {
    case 'overview':
      return <SystemOverviewTab />;
    case 'features':
      return <FeatureManagementTab />;
    case 'security':
      return <SecurityTab />;
    case 'actions':
      return <SystemActionsTab />;
    default:
      return null;
  }
}

// Legacy tab content from original configuration
export { TabContent as LegacyTabContent } from './tab-content';
