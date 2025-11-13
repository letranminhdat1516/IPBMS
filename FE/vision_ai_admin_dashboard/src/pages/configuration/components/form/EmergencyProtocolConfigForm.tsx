import { AlertTriangle, InfoIcon, Phone, Plus, Shield, Trash2 } from 'lucide-react';

import { useEffect, useMemo, useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { getEmergencyProtocols, saveEmergencyProtocols } from '@/services/system';

const STEP_TYPES = {
  detect: {
    label: 'Phát hiện',
    icon: <AlertTriangle className='h-6 w-6 text-red-600 dark:text-red-400' />,
    border: 'border-red-300 bg-red-50 dark:border-red-900/60 dark:bg-red-950/40',
    iconBg: 'border-red-200 bg-red-100 dark:border-red-900 dark:bg-red-900/30',
  },
  notify: {
    label: 'Thông báo',
    icon: <Phone className='h-6 w-6 text-yellow-600 dark:text-yellow-400' />,
    border: 'border-yellow-300 bg-yellow-50 dark:border-yellow-900/60 dark:bg-yellow-950/30',
    iconBg: 'border-yellow-200 bg-yellow-100 dark:border-yellow-900 dark:bg-yellow-900/30',
  },
  support: {
    label: 'Hỗ trợ',
    icon: <Shield className='h-6 w-6 text-green-600 dark:text-green-400' />,
    border: 'border-green-300 bg-green-50 dark:border-green-900/60 dark:bg-green-950/30',
    iconBg: 'border-green-200 bg-green-100 dark:border-green-900 dark:bg-green-900/30',
  },
  other: {
    label: 'Khác',
    icon: <InfoIcon className='h-6 w-6 text-blue-600 dark:text-blue-400' />,
    border: 'border-blue-200 bg-blue-50 dark:border-blue-900/60 dark:bg-blue-950/30',
    iconBg: 'border-blue-200 bg-blue-100 dark:border-blue-900 dark:bg-blue-900/30',
  },
} as const;

const DEFAULTS = [
  {
    type: 'detect',
    title: 'Bước 1: Phát hiện',
    desc: 'AI phát hiện sự cố và xác nhận trong 5 giây',
  },
  {
    type: 'notify',
    title: 'Bước 2: Thông báo',
    desc: 'Gọi điện và gửi tin nhắn cho người thân trong 30 giây',
  },
  {
    type: 'support',
    title: 'Bước 3: Hỗ trợ',
    desc: 'Liên hệ dịch vụ y tế và theo dõi tình hình',
  },
];

const NEW_STEP = {
  type: 'other',
  title: '',
  desc: '',
};

export function EmergencyProtocolConfigForm() {
  // Tải các giao thức hiện có (giả sử cái đầu tiên là cái đang hoạt động)
  const { data, isLoading } = useQuery({
    queryKey: ['system-emergency-protocols'],
    queryFn: () => getEmergencyProtocols(),
    staleTime: 60_000,
  });

  // Normalize steps: try JSON.parse to get {type,title,desc}; fallback to plain title
  const initialSteps = useMemo(() => {
    const first = data?.[0];
    if (!first || !Array.isArray(first.steps) || first.steps.length === 0) {
      return [{ ...DEFAULTS[0] }, { ...DEFAULTS[1] }, { ...DEFAULTS[2] }];
    }
    return first.steps.map((s) => {
      try {
        const obj = JSON.parse(s) as { type?: string; title?: string; desc?: string };
        const type = (obj.type as keyof typeof STEP_TYPES) || 'other';
        return {
          type,
          title: obj.title ?? '',
          desc: obj.desc ?? '',
        };
      } catch {
        return { type: 'other', title: String(s), desc: '' };
      }
    });
  }, [data]);

  const [steps, setSteps] = useState(initialSteps);
  const [saved, setSaved] = useState(false);

  // Sync local steps when server data changes
  useEffect(() => {
    setSteps(initialSteps);
  }, [initialSteps]);

  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: async (payload: typeof steps) => {
      const proto = data?.[0] ?? { id: 1, name: 'Quy trình mặc định', steps: [] };
      const body = [
        {
          id: proto.id,
          name: proto.name,
          steps: payload.map((s) => JSON.stringify({ type: s.type, title: s.title, desc: s.desc })),
        },
      ];
      return saveEmergencyProtocols(body);
    },
    onSuccess: () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
      // small UX feedback
      try {
        // Invalidate cached protocols so other components/refetches see the update
        queryClient.invalidateQueries({ queryKey: ['system-emergency-protocols'] });
        // optional: no global query to invalidate here, just show toast
      } catch {
        // ignore
      }
    },
  });

  const handleChange = (idx: number, field: 'title' | 'desc' | 'type', value: string) => {
    setSteps((prev) => prev.map((s, i) => (i === idx ? { ...s, [field]: value } : s)));
  };

  const handleAddStep = () => {
    setSteps((prev) => [...prev, { ...NEW_STEP, title: `Bước ${prev.length + 1}: `, desc: '' }]);
  };

  const handleRemoveStep = (idx: number) => {
    if (idx < 3) return; // Không cho xóa 3 bước mặc định
    setSteps((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = () => {
    saveMutation.mutate(steps);
  };

  const handleReset = () => {
    setSteps([{ ...DEFAULTS[0] }, { ...DEFAULTS[1] }, { ...DEFAULTS[2] }]);
  };

  return (
    <div className='rounded-xl p-4'>
      <div className='rounded-t-2xl border-b border-red-100 pb-2 dark:border-red-900/40'>
        <div className='mb-1 flex items-center gap-3 pt-4 pl-4'>
          <AlertTriangle className='h-7 w-7 text-red-500' />
          <div className='text-2xl font-bold text-red-600 dark:text-red-400'>
            Quy trình ứng phó khẩn cấp
          </div>
        </div>
        <div className='text-muted-foreground pb-4 pl-16 text-base'>
          Cấu hình các bước tự động khi phát hiện tình huống khẩn cấp. Chỉ admin mới có quyền chỉnh
          sửa.
        </div>
      </div>
      <div className='p-6'>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}
        >
          {isLoading ? <div className='text-muted-foreground mb-4'>Đang tải quy trình…</div> : null}
          <div className={`grid grid-cols-1 gap-8 ${steps.length > 2 ? 'md:grid-cols-3' : ''}`}>
            {steps.map((step, idx) => {
              const type = step.type || 'other';
              const t = STEP_TYPES[type as keyof typeof STEP_TYPES];
              return (
                <div
                  key={idx}
                  className={`relative rounded-2xl border-2 p-6 text-center shadow-sm transition-all duration-200 ${t.border}`}
                >
                  {idx >= 3 && (
                    <button
                      type='button'
                      className='absolute top-2 right-2 rounded-full p-1 text-gray-400 transition-colors hover:text-red-500'
                      title='Xóa bước này'
                      onClick={() => handleRemoveStep(idx)}
                    >
                      <Trash2 className='h-5 w-5' />
                    </button>
                  )}
                  <div className='mb-3 flex justify-center'>
                    <Select value={type} onValueChange={(v) => handleChange(idx, 'type', v)}>
                      <SelectTrigger className='bg-card hover:bg-muted mx-auto w-32 text-center'>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='detect'>Phát hiện</SelectItem>
                        <SelectItem value='notify'>Thông báo</SelectItem>
                        <SelectItem value='support'>Hỗ trợ</SelectItem>
                        <SelectItem value='other'>Khác</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div
                    className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border-4 ${t.iconBg}`}
                  >
                    {t.icon}
                  </div>
                  <Input
                    className='focus:border-primary/80 focus:ring-primary/20 border-input bg-background text-foreground placeholder:text-muted-foreground/60 mb-3 border-2 text-center text-lg font-bold shadow-sm focus:ring-2'
                    value={step.title}
                    onChange={(e) => handleChange(idx, 'title', e.target.value)}
                    maxLength={40}
                    required
                    spellCheck={false}
                  />
                  <Input
                    className='focus:border-primary/70 focus:ring-primary/10 border-input bg-background text-foreground placeholder:text-muted-foreground/60 border-2 text-center text-base shadow-sm focus:ring-2'
                    value={step.desc}
                    onChange={(e) => handleChange(idx, 'desc', e.target.value)}
                    maxLength={80}
                    required
                    spellCheck={false}
                  />
                </div>
              );
            })}
          </div>
          <div className='mt-6 flex justify-end'>
            <Button
              type='button'
              variant='outline'
              onClick={handleAddStep}
              className='flex items-center gap-2 rounded-lg border-blue-300 px-4 text-blue-600 hover:bg-blue-50 dark:text-blue-400'
            >
              <Plus className='h-5 w-5' /> Thêm bước
            </Button>
          </div>
          <div className='mt-8 flex justify-end gap-3'>
            <Button
              type='button'
              variant='outline'
              onClick={handleReset}
              disabled={saveMutation.isPending}
              className='rounded-lg px-5'
            >
              Đặt lại mặc định
            </Button>
            <Button
              type='submit'
              disabled={saveMutation.isPending}
              className='rounded-lg bg-red-600 px-6 font-semibold text-white hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600'
            >
              {saveMutation.isPending ? 'Đang lưu...' : saved ? 'Đã lưu!' : 'Lưu thay đổi'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
