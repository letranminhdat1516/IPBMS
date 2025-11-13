import { useMemo, useState } from 'react';

import { useMutation, useQuery } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

import UserAutocomplete from '@/components/user-autocomplete';

import { getNotificationTypes, sendNotification } from '@/services/notifications';

type Props = { onSent?: () => void };

export default function SendNotificationDialog({ onSent }: Props) {
  const [open, setOpen] = useState(false);
  const [recipientType, setRecipientType] = useState<'user' | 'caregiver' | 'staff' | 'group'>(
    'user'
  );
  const [recipientId, setRecipientId] = useState('');
  const [typeId, setTypeId] = useState('');
  const [message, setMessage] = useState('');
  const [channels, setChannels] = useState<string[]>([]);

  const { data: types } = useQuery({
    queryKey: ['notification-types'],
    queryFn: () => getNotificationTypes(),
    staleTime: 60_000,
  });

  const typeOptions = useMemo(() => types ?? [], [types]);

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async () => {
      await sendNotification({
        type: typeId || 'general',
        recipients: [{ id: Number(recipientId), type: recipientType }],
        message,
        channels,
      });
    },
    onSuccess: async () => {
      setOpen(false);
      setRecipientId('');
      setMessage('');
      setChannels([]);
      if (onSent) onSent();
    },
  });

  const canSend = recipientId && (typeId || 'general') && message.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Gửi thông báo</Button>
      </DialogTrigger>
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle>Gửi thông báo</DialogTitle>
        </DialogHeader>
        <div className='grid gap-3 py-2'>
          <div className='grid gap-1'>
            <Label className='text-xs'>Loại</Label>
            <Select value={typeId} onValueChange={setTypeId}>
              <SelectTrigger>
                <SelectValue placeholder='Chọn loại thông báo' />
              </SelectTrigger>
              <SelectContent>
                {typeOptions.map((t) => (
                  <SelectItem key={t.notification_type_id} value={t.type_name}>
                    {t.type_name}
                  </SelectItem>
                ))}
                <SelectItem value='general'>Chung</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className='grid grid-cols-2 gap-3'>
            <div className='grid gap-1'>
              <Label className='text-xs'>Loại người nhận</Label>
              <Select
                value={recipientType}
                onValueChange={(v: 'user' | 'caregiver' | 'staff' | 'group') => setRecipientType(v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='user'>User</SelectItem>
                  <SelectItem value='caregiver'>Caregiver</SelectItem>
                  <SelectItem value='staff'>Staff</SelectItem>
                  <SelectItem value='group'>Group</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className='grid gap-1'>
              <Label className='text-xs'>ID người nhận</Label>
              {recipientType === 'user' ? (
                <UserAutocomplete
                  value={recipientId}
                  placeholder='Tìm tên người dùng...'
                  onChange={(id) => setRecipientId(id || '')}
                />
              ) : (
                <Input
                  value={recipientId}
                  onChange={(e) => setRecipientId(e.target.value)}
                  placeholder='VD: 123'
                />
              )}
            </div>
          </div>
          <div className='grid gap-1'>
            <Label className='text-xs'>Kênh gửi (tùy chọn)</Label>
            <div className='flex flex-wrap gap-2'>
              {['email', 'sms', 'push'].map((c) => (
                <label key={c} className='inline-flex items-center gap-2 text-sm'>
                  <input
                    type='checkbox'
                    checked={channels.includes(c)}
                    onChange={(e) =>
                      setChannels((prev) =>
                        e.target.checked ? [...prev, c] : prev.filter((x) => x !== c)
                      )
                    }
                  />
                  {c.toUpperCase()}
                </label>
              ))}
            </div>
          </div>
          <div className='grid gap-1'>
            <Label className='text-xs'>Nội dung</Label>
            <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} />
          </div>
        </div>
        <DialogFooter>
          <Button variant='outline' onClick={() => setOpen(false)} disabled={isPending}>
            Hủy
          </Button>
          <Button onClick={() => mutateAsync()} disabled={!canSend || isPending}>
            {isPending ? 'Đang gửi…' : 'Gửi'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
