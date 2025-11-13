import { Info, RotateCw } from 'lucide-react';

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

import { extractSettingValue } from '@/lib/settings-normalize';

import type { NormalizedSetting } from '@/services/system';

import { SaveStatus } from '../status/SaveStatus';

interface CameraConfigFormProps {
  onSave: (data: { setting_id: number; key: string; value: string; description: string }) => void;
  saving: boolean;
  saveStatus: 'idle' | 'success' | 'error';
  onReset: () => void;
  isAdmin?: boolean;
  initialSetting?: NormalizedSetting;
}

export function CameraConfigForm({
  onSave,
  saving,
  saveStatus,
  onReset,
  isAdmin,
  initialSetting,
}: CameraConfigFormProps) {
  const initialValue = (() => {
    const extracted = extractSettingValue(initialSetting as unknown);
    if (extracted.value === undefined || extracted.value === null) return undefined;
    if (typeof extracted.value === 'string') return extracted.value;
    if (typeof extracted.value === 'number' || typeof extracted.value === 'boolean')
      return String(extracted.value);
    try {
      return JSON.stringify(extracted.value);
    } catch {
      return undefined;
    }
  })();

  const [cameraCount, setCameraCount] = useState(() => {
    if (initialValue && initialValue.includes(',')) {
      const [count] = initialValue.split(',');
      const n = Number(count);
      if (!Number.isNaN(n) && n > 0) return n;
    }
    return 30;
  });
  const [quality, setQuality] = useState(() => {
    if (initialValue && initialValue.includes(',')) {
      const [, q] = initialValue.split(',');
      return q || '80%';
    }
    return '80%';
  });
  const [error, setError] = useState<string | null>(null);

  function validateCameraCount(value: number) {
    if (isNaN(value) || value < 1 || value > 100) {
      setError('Số lượng camera phải từ 1 đến 100');
      return false;
    }
    setError(null);
    return true;
  }

  function handleSave() {
    if (!validateCameraCount(cameraCount)) return;
    onSave({
      setting_id: 1,
      key: 'camera',
      value: `${cameraCount},${quality}`,
      description: 'Thiết lập camera',
    });
  }
  return (
    <div className='bg-card text-card-foreground rounded-xl border p-4 shadow-sm'>
      <h2 className='text-foreground mb-2 text-xl font-bold'>Thiết lập camera</h2>
      <div className='text-muted-foreground mb-6 text-sm'>
        Quản lý số lượng và chất lượng camera hoạt động trong hệ thống.
      </div>
      <div className='space-y-5'>
        <div>
          <label className='text-foreground mb-1 block font-medium'>Số lượng camera</label>
          <Input
            type='number'
            min={1}
            max={100}
            placeholder='Nhập số lượng (1-100)'
            value={cameraCount}
            onChange={(e) => {
              const val = Number(e.target.value);
              setCameraCount(val);
              validateCameraCount(val);
            }}
            className='w-32'
          />
          {error && <div className='mt-1 text-xs text-red-500'>{error}</div>}
          <div className='text-muted-foreground mt-1 text-xs'>
            Đây là số lượng camera được phép hoạt động đồng thời.
          </div>
        </div>
        <div>
          <div className='flex items-center gap-2'>
            <label className='text-foreground mb-1 block font-medium'>Chất lượng camera</label>
            <span title='Chất lượng càng cao thì băng thông và lưu trữ càng lớn.'>
              <Info size={16} className='text-muted-foreground' />
            </span>
          </div>
          <Select value={quality} onValueChange={setQuality}>
            <SelectTrigger className='bg-card hover:bg-muted w-full transition-colors'>
              <SelectValue placeholder='Chọn chất lượng' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='100%'>100% (Rõ nét nhất)</SelectItem>
              <SelectItem value='80%'>80% (Khuyến nghị)</SelectItem>
              <SelectItem value='60%'>60% (Tiết kiệm băng thông)</SelectItem>
            </SelectContent>
          </Select>
          <div className='text-muted-foreground mt-1 text-xs'>
            Đây là mức chất lượng video đầu ra của camera.
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
