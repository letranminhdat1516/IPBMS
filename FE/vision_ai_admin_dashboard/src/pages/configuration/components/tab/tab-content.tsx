import type { SystemSetting } from '@/types/system-setting';

import type { NormalizedSetting } from '@/services/system';

import { AIConfigForm } from '../form/AIConfigForm';
import { CameraConfigForm } from '../form/CameraConfigForm';
import { EmergencyProtocolConfigForm } from '../form/EmergencyProtocolConfigForm';
import { ImageConfigForm } from '../form/ImageConfigForm';
import { LogConfigForm } from '../form/LogConfigForm';
import { NotificationConfigForm } from '../form/NotificationForm';

export function TabContent({
  isAdmin,
  tab,
  onSave,
  saving,
  saveStatus,
  onReset,
  initialSettings,
}: {
  isAdmin: boolean;
  tab: string;
  onSave: (setting: SystemSetting) => void;
  saving: boolean;
  saveStatus: 'idle' | 'success' | 'error';
  onReset: () => void;
  initialSettings: Record<string, NormalizedSetting>;
}) {
  if (tab === 'camera') {
    return (
      <div>
        <CameraConfigForm
          onSave={onSave}
          saving={saving}
          saveStatus={saveStatus}
          onReset={onReset}
          initialSetting={initialSettings['camera']}
        />
      </div>
    );
  }
  if (tab === 'log') {
    return (
      <div>
        <LogConfigForm
          onSave={onSave}
          saving={saving}
          saveStatus={saveStatus}
          onReset={onReset}
          isAdmin={isAdmin}
          initialSetting={initialSettings['log_config']}
        />
      </div>
    );
  }
  if (tab === 'ai') {
    return (
      <div>
        <AIConfigForm
          onSave={onSave}
          saving={saving}
          saveStatus={saveStatus}
          onReset={onReset}
          initialSetting={initialSettings['ai_frequency']}
        />
      </div>
    );
  }
  if (tab === 'notification') {
    return (
      <div>
        <NotificationConfigForm
          onSave={onSave}
          saving={saving}
          saveStatus={saveStatus}
          onReset={onReset}
          initialSetting={initialSettings['notification_channels']}
        />
      </div>
    );
  }
  if (tab === 'image') {
    return (
      <div>
        <ImageConfigForm
          onSave={onSave}
          saving={saving}
          saveStatus={saveStatus}
          onReset={onReset}
          initialSetting={initialSettings['image_config']}
        />
      </div>
    );
  }
  if (tab === 'emergency') {
    return <EmergencyProtocolConfigForm />;
  }
  return null;
}
