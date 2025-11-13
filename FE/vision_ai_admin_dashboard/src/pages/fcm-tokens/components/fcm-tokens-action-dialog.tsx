import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { zodResolver } from '@hookform/resolvers/zod';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';

import { SelectDropdown } from '@/components/select-dropdown';

import { FcmToken, FcmTokenType } from '@/types/fcm-token';

import { updateAdminFcmToken } from '@/services/fcmTokens';

const formSchema = z.object({
  userId: z.string().min(1, 'User ID là bắt buộc.'),
  type: z.string().min(1, 'Loại token là bắt buộc.'),
});

type FcmTokenForm = z.infer<typeof formSchema>;

interface Props {
  currentRow?: FcmToken;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const tokenTypes = [
  { label: 'Device', value: 'device' },
  { label: 'Caregiver', value: 'caregiver' },
  { label: 'Emergency', value: 'emergency' },
];

export function FcmTokensActionDialog({ currentRow, open, onOpenChange }: Props) {
  const isEdit = !!currentRow;
  const queryClient = useQueryClient();

  const form = useForm<FcmTokenForm>({
    resolver: zodResolver(formSchema),
    defaultValues: isEdit
      ? {
          userId: currentRow.userId,
          type: currentRow.type,
        }
      : {
          userId: '',
          type: 'device' as FcmTokenType,
        },
  });

  const updateMutation = useMutation({
    mutationFn: async (values: FcmTokenForm) => {
      if (!currentRow) throw new Error('Missing token');
      return updateAdminFcmToken(currentRow.id, values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fcm-tokens'] });
      toast.success('Token đã được cập nhật thành công!');
      form.reset();
      onOpenChange(false);
    },
    onError: (_error) => {
      toast.error('Không thể cập nhật token. Vui lòng kiểm tra lại dữ liệu.');
    },
  });

  const onSubmit = async (values: FcmTokenForm) => {
    if (isEdit) {
      await updateMutation.mutateAsync(values);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(state) => {
        form.reset();
        onOpenChange(state);
      }}
    >
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader className='text-left'>
          <DialogTitle>{isEdit ? 'Chỉnh sửa FCM Token' : 'Thêm FCM Token mới'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Cập nhật thông tin token.' : 'Tạo token mới.'} Nhấn lưu để hoàn tất.
          </DialogDescription>
        </DialogHeader>
        <div className='-mr-4 h-[26.25rem] w-full overflow-y-auto py-1 pr-4'>
          <Form {...form}>
            <form
              id='fcm-token-form'
              onSubmit={form.handleSubmit(onSubmit)}
              className='space-y-4 p-0.5'
            >
              <FormField
                control={form.control}
                name='userId'
                render={({ field }) => (
                  <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                    <FormLabel className='col-span-2 text-right'>User ID</FormLabel>
                    <FormControl>
                      <Input
                        placeholder='Nhập User ID'
                        className='col-span-4'
                        autoComplete='off'
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className='col-span-4 col-start-3' />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='type'
                render={({ field }) => (
                  <FormItem className='grid grid-cols-6 items-center space-y-0 gap-x-4 gap-y-1'>
                    <FormLabel className='col-span-2 text-right'>Loại</FormLabel>
                    <SelectDropdown
                      defaultValue={field.value}
                      onValueChange={field.onChange}
                      placeholder='Chọn loại token'
                      className='col-span-4'
                      items={tokenTypes.map(({ label, value }) => ({
                        label,
                        value,
                      }))}
                    />
                    <FormMessage className='col-span-4 col-start-3' />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </div>
        <DialogFooter>
          <Button type='submit' form='fcm-token-form' disabled={updateMutation.isPending}>
            Lưu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
