import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';

import { extractSettingValue } from '@/lib/settings-normalize';

import {
  useActivityLogs,
  useDeleteActivityLog,
  useDeleteActivityLogsByFilter,
  useExportActivityLogs,
} from '@/services/system';
import type { NormalizedSetting } from '@/services/system';

import { SaveStatus } from '../status/SaveStatus';

interface LogConfigFormProps {
  onSave: (data: { setting_id: number; key: string; value: string; description: string }) => void;
  saving: boolean;
  saveStatus: 'idle' | 'success' | 'error';
  onReset: () => void;
  isAdmin?: boolean;
  initialSetting?: NormalizedSetting;
}

export function LogConfigForm({
  onSave,
  saving,
  saveStatus,
  onReset,
  isAdmin,
  initialSetting,
}: LogConfigFormProps) {
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
  const [normalDays, setNormalDays] = useState<string>(parsed?.normalDays ?? '30');
  const [abnormalDays, setAbnormalDays] = useState<string>(parsed?.abnormalDays ?? '90');
  const purgeMutation = useDeleteActivityLogsByFilter();
  const exportMutation = useExportActivityLogs();
  const { data: logsData, isLoading: logsLoading } = useActivityLogs();
  const deleteLogMutation = useDeleteActivityLog();
  const [beforeDate, setBeforeDate] = useState<string>('');
  const [severity, setSeverity] = useState<string>('');

  function handleSave() {
    onSave({
      setting_id: 5,
      key: 'log_config',
      value: JSON.stringify({ enable, normalDays, abnormalDays }),
      description: 'Thiết lập lưu nhật ký hoạt động',
    });
  }

  return (
    <div className='bg-card text-card-foreground rounded-xl border p-4 shadow-sm'>
      <h2 className='text-foreground mb-2 text-xl font-bold'>Lưu trữ nhật ký hoạt động</h2>
      <div className='text-muted-foreground mb-6 text-sm'>
        Quản lý cách lưu trữ và thời gian lưu nhật ký hoạt động.
      </div>
      <div className='space-y-5'>
        <div className='flex items-center justify-between'>
          <span className='font-medium'>Bật lưu nhật ký</span>
          <Switch checked={enable} onCheckedChange={setEnable} />
        </div>
        <div>
          <label className='text-foreground mb-1 block font-medium'>
            Thời gian lưu nhật ký thường (ngày)
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
            Thời gian lưu nhật ký bất thường (ngày)
          </label>
          <div className='flex items-center gap-2'>
            <Input
              type='number'
              min={1}
              className='w-32'
              value={abnormalDays}
              onChange={(e) => setAbnormalDays(e.target.value)}
            />
            <span className='text-muted-foreground text-xs'>ngày</span>
          </div>
        </div>
      </div>
      {/* Export activity logs */}
      <div className='border-border/60 bg-muted/30 mt-6 rounded-lg border p-4'>
        <h3 className='mb-3 text-base font-semibold'>Xuất nhật ký hoạt động</h3>
        <div className='flex items-center gap-2'>
          <Button
            size='sm'
            variant='secondary'
            disabled={exportMutation.isPending}
            onClick={() => exportMutation.mutate({})}
          >
            {exportMutation.isPending ? 'Đang xuất...' : 'Tải về CSV/NDJSON'}
          </Button>
          {exportMutation.isSuccess && exportMutation.data?.url ? (
            <a
              href={exportMutation.data.url}
              target='_blank'
              rel='noopener noreferrer'
              className='ml-2 text-xs text-blue-600 underline'
            >
              Tải về tại đây
            </a>
          ) : null}
        </div>
      </div>
      {/* Purge activity logs by filter */}
      <div className='border-border/60 bg-muted/30 mt-6 rounded-lg border p-4'>
        <h3 className='mb-3 text-base font-semibold'>Dọn dẹp nhật ký theo bộ lọc</h3>
        <div className='grid grid-cols-1 gap-3 sm:grid-cols-3'>
          <div>
            <label className='text-foreground mb-1 block text-sm font-medium'>Trước ngày</label>
            <Input type='date' value={beforeDate} onChange={(e) => setBeforeDate(e.target.value)} />
          </div>
          <div className='sm:col-span-2'>
            <label className='text-foreground mb-1 block text-sm font-medium'>Mức độ</label>
            <Input
              placeholder='info,warning,error'
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
            />
          </div>
        </div>
        <div className='mt-3 flex justify-end'>
          <Button
            size='sm'
            variant='secondary'
            disabled={purgeMutation.isPending || (!beforeDate && !severity)}
            onClick={() =>
              purgeMutation.mutate({
                before: beforeDate ? new Date(beforeDate).toISOString() : undefined,
                severity: severity
                  ? severity
                      .split(',')
                      .map((s) => s.trim())
                      .filter(Boolean)
                  : undefined,
              })
            }
          >
            {purgeMutation.isPending ? 'Đang dọn dẹp…' : 'Xóa bản ghi phù hợp'}
          </Button>
        </div>
        {purgeMutation.isSuccess ? (
          <div className='text-muted-foreground mt-2 text-xs'>
            Đã xóa: {purgeMutation.data?.deleted ?? 0}
          </div>
        ) : null}
      </div>
      {/* List and delete single activity log */}
      <div className='border-border/60 bg-muted/30 mt-6 rounded-lg border p-4'>
        <h3 className='mb-3 text-base font-semibold'>Danh sách nhật ký hoạt động (demo)</h3>
        {logsLoading ? (
          <div className='text-muted-foreground'>Đang tải...</div>
        ) : logsData?.items?.length ? (
          <ul className='space-y-2 text-xs'>
            {logsData.items.slice(0, 10).map((log) => (
              <li key={log.id} className='flex items-center justify-between gap-2'>
                <span
                  className='max-w-[220px] truncate'
                  title={
                    typeof log.message === 'string'
                      ? log.message
                      : typeof log.message === 'object'
                        ? JSON.stringify(log.message, null, 2)
                        : log.message
                          ? String(log.message)
                          : log.action
                  }
                >
                  {log.action} - {log.timestamp}
                </span>
                <Button
                  size='sm'
                  variant='destructive'
                  onClick={() => deleteLogMutation.mutate(log.id)}
                  disabled={deleteLogMutation.isPending}
                >
                  Xóa
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <div className='text-muted-foreground'>Không có nhật ký nào.</div>
        )}
        {deleteLogMutation.isSuccess ? (
          <div className='mt-2 text-xs text-green-600'>Đã xóa thành công!</div>
        ) : null}
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
            Đặt lại
          </Button>
        )}
        <SaveStatus status={saveStatus} />
      </div>
    </div>
  );
}
