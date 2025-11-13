import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { useEffect } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { zodResolver } from '@hookform/resolvers/zod';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

import { getMyDisplayPref, updateMyDisplayPref } from '@/services/settings';

const items = [
  {
    id: 'recents',
    label: 'Mới đây',
  },
  {
    id: 'home',
    label: 'Trang chủ',
  },
  {
    id: 'applications',
    label: 'Ứng dụng',
  },
  {
    id: 'desktop',
    label: 'Máy tính',
  },
  {
    id: 'downloads',
    label: 'Tải xuống',
  },
  {
    id: 'documents',
    label: 'Tài liệu',
  },
] as const;

const displayFormSchema = z.object({
  items: z.array(z.string()).refine((value) => value.some((item) => item), {
    message: 'Bạn phải chọn ít nhất một mục.',
  }),
});

type DisplayFormValues = z.infer<typeof displayFormSchema>;

export function DisplayForm() {
  const form = useForm<DisplayFormValues>({
    resolver: zodResolver(displayFormSchema),
    defaultValues: { items: [] },
  });
  const { data, isLoading } = useQuery({
    queryKey: ['me-display'],
    queryFn: () => getMyDisplayPref(),
    staleTime: 60_000,
  });
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (values: DisplayFormValues) => updateMyDisplayPref(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me-display'], exact: false });
      toast.success('Cập nhật hiển thị thành công');
    },
  });

  useEffect(() => {
    if (data && !form.formState.isDirty) {
      form.reset({ items: data.items ?? [] });
    }
  }, [data, form]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((values) => mutation.mutate(values))} className='space-y-8'>
        <FormField
          control={form.control}
          name='items'
          render={() => (
            <FormItem>
              <div className='mb-4'>
                <FormLabel className='text-base'>Thanh bên (Sidebar)</FormLabel>
                <FormDescription>Chọn các mục bạn muốn hiển thị trên thanh bên.</FormDescription>
              </div>
              {items.map((item) => (
                <FormField
                  key={item.id}
                  control={form.control}
                  name='items'
                  render={({ field }) => {
                    return (
                      <FormItem
                        key={item.id}
                        className='flex flex-row items-start space-y-0 space-x-3'
                      >
                        <FormControl>
                          <Checkbox
                            checked={field.value?.includes(item.id)}
                            onCheckedChange={(checked) => {
                              return checked
                                ? field.onChange([...field.value, item.id])
                                : field.onChange(field.value?.filter((value) => value !== item.id));
                            }}
                          />
                        </FormControl>
                        <FormLabel className='font-normal'>{item.label}</FormLabel>
                      </FormItem>
                    );
                  }}
                />
              ))}
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type='submit' disabled={mutation.isPending || isLoading}>
          {mutation.isPending ? 'Saving…' : 'Update display'}
        </Button>
      </form>
    </Form>
  );
}
