import { CheckCircle2, Info, RotateCw, Send, XCircle } from 'lucide-react';

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

import { useTestNotification } from '@/services/system';
import type { NormalizedSetting } from '@/services/system';

import { SaveStatus } from '../status/SaveStatus';

interface NotificationConfigFormProps {
  onSave: (data: { setting_id: number; key: string; value: string; description: string }) => void;
  saving: boolean;
  saveStatus: 'idle' | 'success' | 'error';
  onReset: () => void;
  isAdmin?: boolean;
  initialSetting?: NormalizedSetting;
}

export function NotificationConfigForm({
  onSave,
  saving,
  saveStatus,
  onReset,
  isAdmin,
  initialSetting,
}: NotificationConfigFormProps) {
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
  const [push, setPush] = useState<boolean>(typeof parsed?.push === 'boolean' ? parsed.push : true);
  const [email, setEmail] = useState<boolean>(
    typeof parsed?.email === 'boolean' ? parsed.email : false
  );
  const [sms, setSms] = useState<boolean>(typeof parsed?.sms === 'boolean' ? parsed.sms : false);
  const [priority, setPriority] = useState<string>(parsed?.priority ?? 'high');
  // Test notification state
  const [testPhone, setTestPhone] = useState<string>('');
  const [testProvider, setTestProvider] = useState<'sms' | 'call' | 'both'>('sms');
  const [testMessage, setTestMessage] = useState<string>('Đây là tin nhắn thử nghiệm');
  const testMutation = useTestNotification();

  function handleSave() {
    onSave({
      setting_id: 3,
      key: 'notification_channels',
      value: JSON.stringify({ push, email, sms, priority }),
      description: 'Kênh thông báo',
    });
  }

  return (
    <div className='bg-card text-card-foreground rounded-xl border p-4 shadow-sm'>
      <h2 className='text-foreground mb-2 text-xl font-bold'>Kênh nhận thông báo</h2>
      <div className='text-muted-foreground mb-6 text-sm'>
        Quản lý các phương thức nhận cảnh báo và thông báo của hệ thống.
      </div>
      <div className='space-y-5'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <span className='text-foreground font-medium'>Thông báo đẩy</span>
            <span title='Nhận thông báo qua ứng dụng di động.'>
              <Info size={16} className='text-muted-foreground' />
            </span>
          </div>
          <Switch checked={push} onCheckedChange={setPush} />
        </div>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <span className='text-foreground font-medium'>Thông báo Email</span>
            <span title='Nhận thông báo qua email.'>
              <Info size={16} className='text-muted-foreground' />
            </span>
          </div>
          <Switch checked={email} onCheckedChange={setEmail} />
        </div>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <span className='text-foreground font-medium'>Thông báo SMS</span>
            <span title='Nhận thông báo qua tin nhắn SMS.'>
              <Info size={16} className='text-muted-foreground' />
            </span>
          </div>
          <Switch checked={sms} onCheckedChange={setSms} />
        </div>
        <div>
          <label className='text-foreground mb-1 block font-medium'>
            Mức ưu tiên cảnh báo mặc định
          </label>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger className='bg-card hover:bg-muted w-full transition-colors'>
              <SelectValue placeholder='Chọn mức ưu tiên' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='high'>Cao</SelectItem>
              <SelectItem value='medium'>Trung bình</SelectItem>
              <SelectItem value='low'>Thấp</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      {/* Test notification */}
      <div className='border-border/60 bg-muted/30 mt-8 rounded-lg border p-4'>
        <div className='mb-3 flex items-center justify-between'>
          <h3 className='text-foreground text-base font-semibold'>Gửi thông báo thử</h3>
          {testMutation.isSuccess ? (
            <span className='flex items-center gap-1 text-xs text-green-600'>
              <CheckCircle2 size={14} /> Đã gửi
            </span>
          ) : testMutation.isError ? (
            <span className='flex items-center gap-1 text-xs text-red-600'>
              <XCircle size={14} /> Lỗi gửi
            </span>
          ) : null}
        </div>
        <div className='grid grid-cols-1 gap-3 sm:grid-cols-3'>
          <div>
            <label className='text-foreground mb-1 block text-sm font-medium'>Số điện thoại</label>
            <Input
              placeholder='+84...'
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
            />
          </div>
          <div>
            <label className='text-foreground mb-1 block text-sm font-medium'>Nhà cung cấp</label>
            <Select
              value={testProvider}
              onValueChange={(v: 'sms' | 'call' | 'both') => setTestProvider(v)}
            >
              <SelectTrigger className='bg-card hover:bg-muted'>
                <SelectValue placeholder='Chọn' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='sms'>SMS</SelectItem>
                <SelectItem value='call'>Cuộc gọi</SelectItem>
                <SelectItem value='both'>Cả hai</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className='text-foreground mb-1 block text-sm font-medium'>Nội dung</label>
            <Input
              placeholder='Tin nhắn...'
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
            />
          </div>
        </div>
        <div className='mt-3 flex justify-end'>
          <Button
            variant='secondary'
            size='sm'
            onClick={() =>
              testMutation.mutate({ to: testPhone, providers: testProvider, message: testMessage })
            }
            disabled={!testPhone || testMutation.isPending}
            className='flex items-center gap-1'
          >
            <Send size={14} /> {testMutation.isPending ? 'Đang gửi...' : 'Gửi thử'}
          </Button>
        </div>
        {testMutation.isSuccess ? (
          <div className='text-muted-foreground mt-2 text-xs'>
            Kết quả: {testMutation.data?.sent ? 'thành công' : 'thất bại'}
          </div>
        ) : null}
      </div>
      <div className='mt-6 flex justify-end gap-2'>
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
