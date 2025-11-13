import { RotateCw } from 'lucide-react';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

import { extractSettingValue } from '@/lib/settings-normalize';

import type { NormalizedSetting } from '@/services/system';

import { SaveStatus } from '../status/SaveStatus';

interface ImageConfigFormProps {
  onSave: (data: { setting_id: number; key: string; value: string; description: string }) => void;
  saving: boolean;
  saveStatus: 'idle' | 'success' | 'error';
  onReset: () => void;
  isAdmin?: boolean;
  initialSetting?: NormalizedSetting;
}

export function ImageConfigForm({
  onSave,
  saving,
  saveStatus,
  onReset,
  isAdmin,
  initialSetting,
}: ImageConfigFormProps) {
  // State mới cho UI giống mẫu
  const parsed = (() => {
    try {
      const extracted = extractSettingValue(initialSetting as unknown);
      if (typeof extracted.value === 'string')
        return extracted.value ? JSON.parse(extracted.value) : undefined;
      return extracted.value as Record<string, unknown> | undefined;
    } catch {
      return undefined;
    }
  })();
  const [enable, setEnable] = useState<boolean>(
    typeof parsed?.enable === 'boolean' ? parsed.enable : true
  );
  const [quality, setQuality] = useState<string>(parsed?.quality ?? 'medium');
  const [normalDays, setNormalDays] = useState<string>(parsed?.normalDays ?? '30');
  const [alertDays, setAlertDays] = useState<string>(parsed?.alertDays ?? '90');

  function handleSave() {
    onSave({
      setting_id: 4,
      key: 'image_config',
      value: JSON.stringify({ enable, quality, normalDays, alertDays }),
      description: 'Thiết lập lưu ảnh',
    });
  }

  return (
    <div className='bg-card text-card-foreground rounded-xl border p-4 shadow-sm'>
      <h2 className='text-foreground mb-2 text-xl font-bold'>Lưu trữ ảnh</h2>
      <div className='text-muted-foreground mb-6 text-sm'>
        Quản lý cách lưu trữ và chất lượng ảnh từ camera.
      </div>
      <div className='space-y-5'>
        <div className='flex items-center justify-between'>
          <span className='font-medium'>Bật lưu ảnh</span>
          <Switch checked={enable} onCheckedChange={setEnable} />
        </div>
        <div>
          <label className='text-foreground mb-1 block font-medium'>Chất lượng ảnh</label>
          <Select value={quality} onValueChange={setQuality}>
            <SelectTrigger className='bg-card hover:bg-muted w-full transition-colors'>
              <SelectValue placeholder='Chọn chất lượng' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='low'>Thấp (720p)</SelectItem>
              <SelectItem value='medium'>Trung bình (1080p)</SelectItem>
              <SelectItem value='high'>Cao (2K/4K)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className='text-foreground mb-1 block font-medium'>
            Thời gian lưu ảnh thường (ngày)
          </label>
          <div className='flex items-center gap-2'>
            <Input
              type='number'
              min={1}
              className='w-32'
              value={normalDays}
              onChange={(e) => setNormalDays(e.target.value)}
            />
            <span className='text-muted-foreground text-xs'>ngày</span>
          </div>
        </div>
        <div>
          <label className='text-foreground mb-1 block font-medium'>
            Thời gian lưu ảnh cảnh báo (ngày)
          </label>
          <div className='flex items-center gap-2'>
            <Input
              type='number'
              min={1}
              className='w-32'
              value={alertDays}
              onChange={(e) => setAlertDays(e.target.value)}
            />
            <span className='text-muted-foreground text-xs'>ngày</span>
          </div>
        </div>
      </div>
      <div className='mt-8 flex justify-end gap-2'>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
        </Button>
        {isAdmin && (
          <Button
            variant='outline'
            type='button'
            onClick={onReset}
            className='flex items-center gap-1'
          >
            <RotateCw size={16} />
            Đặt lại mặc định
          </Button>
        )}
        <SaveStatus status={saveStatus} />
      </div>
    </div>
  );
}
