import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { useEffect } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { CaretSortIcon, CheckIcon } from '@radix-ui/react-icons';

import { zodResolver } from '@hookform/resolvers/zod';

import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

import { DatePicker } from '@/components/date-picker';

import { cn } from '@/lib/utils';

import { getMyAccount, updateMyAccount } from '@/services/settings';

const languages = [
  { label: 'English', value: 'en' },
  { label: 'French', value: 'fr' },
  { label: 'German', value: 'de' },
  { label: 'Spanish', value: 'es' },
  { label: 'Portuguese', value: 'pt' },
  { label: 'Russian', value: 'ru' },
  { label: 'Japanese', value: 'ja' },
  { label: 'Korean', value: 'ko' },
  { label: 'Chinese', value: 'zh' },
] as const;

const accountFormSchema = z.object({
  name: z
    .string()
    .min(1, 'Vui lòng nhập tên của bạn.')
    .min(2, 'Tên phải có ít nhất 2 ký tự.')
    .max(30, 'Tên không được dài quá 30 ký tự.'),
  dob: z.date('Vui lòng chọn ngày sinh.'),
  language: z.string('Vui lòng chọn ngôn ngữ.'),
});

type AccountFormValues = z.infer<typeof accountFormSchema>;

export function AccountForm() {
  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: { name: '', dob: undefined as unknown as Date, language: '' },
  });
  const { data, isLoading } = useQuery({
    queryKey: ['me-account'],
    queryFn: () => getMyAccount(),
    staleTime: 60_000,
  });
  useEffect(() => {
    if (data) {
      form.reset({
        name: data.name ?? '',
        dob: data.dob ? new Date(data.dob) : (undefined as unknown as Date),
        language: data.language ?? '',
      });
    }
  }, [data, form]);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (values: AccountFormValues) =>
      updateMyAccount({
        name: values.name,
        dob: values.dob ? values.dob.toISOString().slice(0, 10) : undefined,
        language: values.language,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me-account'], exact: false });
      toast.success('Cập nhật tài khoản thành công');
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((values) => mutation.mutate(values))} className='space-y-8'>
        <FormField
          control={form.control}
          name='name'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tên</FormLabel>
              <FormControl>
                <Input placeholder='Họ và tên' {...field} disabled={isLoading} />
              </FormControl>
              <FormDescription>Tên này sẽ hiển thị trên hồ sơ và trong email.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='dob'
          render={({ field }) => (
            <FormItem className='flex flex-col'>
              <FormLabel>Ngày sinh</FormLabel>
              <DatePicker
                selected={field.value}
                onSelect={field.onChange}
                placeholder='Ngày sinh'
              />
              <FormDescription>Ngày sinh của bạn được sử dụng để tính tuổi.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='language'
          render={({ field }) => (
            <FormItem className='flex flex-col'>
              <FormLabel>Ngôn ngữ</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant='outline'
                      role='combobox'
                      className={cn(
                        'w-[200px] justify-between',
                        !field.value && 'text-muted-foreground'
                      )}
                    >
                      {field.value
                        ? languages.find((language) => language.value === field.value)?.label
                        : 'Chọn ngôn ngữ'}
                      <CaretSortIcon className='ml-2 h-4 w-4 shrink-0 opacity-50' />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className='w-[200px] p-0'>
                  <Command>
                    <CommandInput placeholder='Tìm ngôn ngữ...' />
                    <CommandEmpty>Không tìm thấy ngôn ngữ.</CommandEmpty>
                    <CommandGroup>
                      <CommandList>
                        {languages.map((language) => (
                          <CommandItem
                            value={language.label}
                            key={language.value}
                            onSelect={() => {
                              form.setValue('language', language.value);
                            }}
                          >
                            <CheckIcon
                              className={cn(
                                'mr-2 h-4 w-4',
                                language.value === field.value ? 'opacity-100' : 'opacity-0'
                              )}
                            />
                            {language.label}
                          </CommandItem>
                        ))}
                      </CommandList>
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
              <FormDescription>Ngôn ngữ sẽ được sử dụng trong giao diện quản trị.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type='submit' disabled={mutation.isPending || isLoading}>
          {mutation.isPending ? 'Đang lưu…' : 'Cập nhật tài khoản'}
        </Button>
      </form>
    </Form>
  );
}
