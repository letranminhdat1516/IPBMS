import { RotateCw } from 'lucide-react';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';

import { extractSettingValue } from '@/lib/settings-normalize';

import type { NormalizedSetting } from '@/services/system';

import { SaveStatus } from '../status/SaveStatus';

interface AIConfigFormProps {
  onSave: (data: { setting_id: number; key: string; value: string; description: string }) => void;
  saving: boolean;
  saveStatus: 'idle' | 'success' | 'error';
  onReset: () => void;
  isAdmin?: boolean;
  initialSetting?: NormalizedSetting;
}

export function AIConfigForm({
  onSave,
  saving,
  saveStatus,
  onReset,
  isAdmin,
  initialSetting,
}: AIConfigFormProps) {
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
  const [processingInterval, setProcessingInterval] = useState(parsed?.processingInterval ?? '15');
  const [aiSensitivity, setAiSensitivity] = useState<number>(
    typeof parsed?.aiSensitivity === 'number' ? parsed.aiSensitivity : 75
  );
  const [minAlertTime, setMinAlertTime] = useState(parsed?.minAlertTime ?? '60');
  const [minFrameNormal, setMinFrameNormal] = useState(parsed?.minFrameNormal ?? '10000');
  const [minFrameAbnormal, setMinFrameAbnormal] = useState(parsed?.minFrameAbnormal ?? '60');

  function handleSave() {
    onSave({
      setting_id: 2,
      key: 'ai_frequency',
      value: JSON.stringify({
        processingInterval,
        aiSensitivity,
        minAlertTime,
        minFrameNormal,
        minFrameAbnormal,
      }),
      description: 'Tần suất AI',
    });
  }

  return (
    <div className='rounded-xl p-4'>
      <h2 className='text-foreground mb-2 text-xl font-bold'>Tần suất AI</h2>
      <div className='text-muted-foreground mb-6 text-sm'>
        Thiết lập tần suất AI xử lý dữ liệu để phát hiện bất thường.
      </div>
      <div className='space-y-5'>
        <div>
          <label className='text-foreground mb-1 block font-medium'>
            Chu kỳ xử lý <span title='AI sẽ xử lý dữ liệu mỗi khoảng thời gian này.'>🛈</span>
          </label>
          <Select value={processingInterval} onValueChange={setProcessingInterval}>
            <SelectTrigger className='w-full'>
              <SelectValue placeholder='Chọn chu kỳ xử lý' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='5'>Mỗi 5 giây</SelectItem>
              <SelectItem value='10'>Mỗi 10 giây</SelectItem>
              <SelectItem value='15'>Mỗi 15 giây</SelectItem>
              <SelectItem value='30'>Mỗi 30 giây</SelectItem>
              <SelectItem value='60'>Mỗi 60 giây</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className='text-foreground mb-1 block font-medium'>
            Độ nhạy AI <span title='Độ nhạy AI phát hiện bất thường'>🛈</span>
          </label>
          <div className='flex items-center gap-3'>
            <Slider
              min={0}
              max={100}
              step={1}
              value={[aiSensitivity]}
              onValueChange={([v]) => setAiSensitivity(v)}
              className='flex-1'
            />
            <span className='w-12 text-right text-sm font-semibold text-blue-600 dark:text-blue-400'>
              {aiSensitivity}%
            </span>
          </div>
        </div>
        <div>
          <label className='text-foreground mb-1 block font-medium'>
            Thời gian tối thiểu giữa các cảnh báo giống nhau (giây)
          </label>
          <Select value={minAlertTime} onValueChange={setMinAlertTime}>
            <SelectTrigger className='w-full'>
              <SelectValue placeholder='Chọn thời gian' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='30'>30 giây</SelectItem>
              <SelectItem value='60'>60 giây</SelectItem>
              <SelectItem value='120'>120 giây</SelectItem>
              <SelectItem value='300'>300 giây</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className='text-foreground mb-1 block font-medium'>
            Thời gian tối thiểu giữa các khung hình (giây)
            <span className='text-muted-foreground ml-1 text-xs'>(trạng thái bình thường)</span>
          </label>
          <Select value={minFrameNormal} onValueChange={setMinFrameNormal}>
            <SelectTrigger className='w-full'>
              <SelectValue placeholder='Chọn thời gian' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='60'>60 giây</SelectItem>
              <SelectItem value='300'>300 giây</SelectItem>
              <SelectItem value='10000'>10000 giây</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className='text-foreground mb-1 block font-medium'>
            Thời gian tối thiểu giữa các khung hình (giây)
            <span className='text-muted-foreground ml-1 text-xs'>(trạng thái bất thường)</span>
          </label>
          <Select value={minFrameAbnormal} onValueChange={setMinFrameAbnormal}>
            <SelectTrigger className='w-full'>
              <SelectValue placeholder='Chọn thời gian' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='30'>30 giây</SelectItem>
              <SelectItem value='60'>60 giây</SelectItem>
              <SelectItem value='120'>120 giây</SelectItem>
            </SelectContent>
          </Select>
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
