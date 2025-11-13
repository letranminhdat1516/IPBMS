import { Search, Settings, User, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { useEffect, useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import UserAutocomplete from '@/components/user-autocomplete';

import { useSearchUserByPhone, useUserSelection } from '@/hooks/use-user-search';

import { formatPhoneNumber, maskEmail, maskPhoneNumber } from '@/lib/utils';

import { type CreateAIConfigRequest, useCreateAIConfiguration } from '@/services/aiConfig';

const aiConfigSchema = z.object({
  user_id: z.string().min(1, 'User ID là bắt buộc'),
  model_name: z.string().min(1, 'Tên model là bắt buộc'),
  threshold: z.number().min(0).max(1, 'Threshold phải từ 0 đến 1'),
  enabled_features: z.array(z.string()).min(1, 'Phải chọn ít nhất 1 tính năng'),
  processing_interval: z.number().min(1, 'Interval phải lớn hơn 0'),
  alert_on_detection: z.boolean(),
});

const aiFeatures = [
  { value: 'fall_detection', label: 'Phát hiện té ngã' },
  { value: 'motion_tracking', label: 'Theo dõi chuyển động' },
  { value: 'person_detection', label: 'Phát hiện người' },
  { value: 'face_recognition', label: 'Nhận diện khuôn mặt' },
];

interface CustomerSetupWizardProps {
  userId?: string;
  trigger?: React.ReactNode;
}

export function CustomerSetupWizard({ userId, trigger }: CustomerSetupWizardProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('ai');
  const [searchPhone, setSearchPhone] = useState('');

  // User search hooks
  const {
    users,
    isLoading: searchLoading,
    searchByPhone,
    clearSearch,
    hasSearched,
    error: searchError,
  } = useSearchUserByPhone();
  const { selectedUser, selectUser, clearSelection, hasSelectedUser } = useUserSelection();

  // AI Configuration
  const aiConfigForm = useForm<CreateAIConfigRequest>({
    resolver: zodResolver(aiConfigSchema),
    defaultValues: {
      user_id: selectedUser?.user_id?.toString() || userId || '',
      model_name: 'fall-detection-v2',
      threshold: 0.8,
      enabled_features: ['fall_detection', 'motion_tracking'],
      processing_interval: 5,
      alert_on_detection: true,
    },
  });

  // Update forms when selectedUser changes
  useEffect(() => {
    if (selectedUser) {
      const userIdStr = selectedUser.user_id?.toString() || '';
      aiConfigForm.setValue('user_id', userIdStr);
    }
  }, [selectedUser, aiConfigForm]);

  // Mutations
  const createAIConfigMutation = useCreateAIConfiguration();

  // Handlers
  const handleCreateAIConfig = async (data: CreateAIConfigRequest) => {
    try {
      await createAIConfigMutation.mutateAsync(data);
      toast.success('Cấu hình AI đã được tạo thành công!');
      aiConfigForm.reset();
    } catch (_error) {
      toast.error('Lỗi khi tạo cấu hình AI');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger || <Button>Thiết lập Customer</Button>}</DialogTrigger>
      <DialogContent className='max-h-[95vh] max-w-7xl overflow-y-auto p-0 sm:max-w-6xl'>
        <div className='flex h-full max-h-[95vh] flex-col'>
          <DialogHeader className='border-b px-4 py-4 sm:px-6'>
            <DialogTitle className='flex items-center gap-2 text-lg sm:text-xl'>
              <div className='bg-primary/10 rounded-lg p-1.5 sm:p-2'>
                <Settings className='text-primary h-5 w-5 sm:h-6 sm:w-6' />
              </div>
              <span className='hidden sm:block'>Thiết lập Customer - AI Config</span>
              <span className='sm:hidden'>Thiết lập Customer</span>
            </DialogTitle>
            <DialogDescription className='text-sm sm:text-base'>
              Thiết lập cấu hình AI cho customer.
            </DialogDescription>
          </DialogHeader>

          <div className='flex-1 overflow-y-auto px-4 py-4 sm:px-6'>
            {/* User Search Section */}
            <Card className='mb-4 shadow-sm sm:mb-6'>
              <CardHeader className='pb-3 sm:pb-4'>
                <CardTitle className='flex items-center gap-2 text-base sm:text-lg'>
                  <div className='rounded-lg bg-blue-50 p-1 sm:p-1.5'>
                    <Search className='h-4 w-4 text-blue-600 sm:h-5 sm:w-5' />
                  </div>
                  Tìm kiếm Customer
                </CardTitle>
                <CardDescription className='text-sm'>
                  Tìm kiếm customer theo số điện thoại để tự động điền thông tin
                </CardDescription>
              </CardHeader>
              <CardContent className='space-y-4'>
                <div className='flex flex-col gap-3 sm:flex-row sm:gap-2'>
                  <div className='flex-1'>
                    <Input
                      placeholder='Nhập số điện thoại...'
                      value={searchPhone}
                      onChange={(e) => setSearchPhone(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          searchByPhone(searchPhone);
                        }
                      }}
                      className='w-full'
                    />
                  </div>
                  <div className='flex gap-2'>
                    <Button
                      onClick={() => searchByPhone(searchPhone)}
                      disabled={searchLoading || !searchPhone.trim()}
                      className='flex-1 sm:flex-none'
                    >
                      {searchLoading ? (
                        <div className='mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent' />
                      ) : (
                        <Search className='mr-2 h-4 w-4' />
                      )}
                      <span className='hidden sm:inline'>Tìm kiếm</span>
                      <span className='sm:hidden'>Tìm</span>
                    </Button>
                    {hasSearched && (
                      <Button variant='outline' size='sm' onClick={clearSearch}>
                        <X className='h-4 w-4' />
                      </Button>
                    )}
                  </div>
                </div>
                {/* Search Results */}
                {hasSearched && (
                  <div className='space-y-2'>
                    {searchError && (
                      <div className='py-4 text-center text-red-600'>
                        Lỗi khi tìm kiếm: {searchError.message || 'Có lỗi xảy ra'}
                      </div>
                    )}
                    {users.length === 0 && !searchLoading && !searchError && (
                      <div className='text-muted-foreground py-4 text-center'>
                        Không tìm thấy user với số điện thoại này
                      </div>
                    )}
                    {users.length > 0 &&
                      users.map((user) => (
                        <div
                          key={user.user_id}
                          className={`cursor-pointer rounded-lg border p-3 transition-colors ${
                            selectedUser?.user_id === user.user_id
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/50'
                          }`}
                          onClick={() => selectUser(user)}
                        >
                          <div className='flex items-center justify-between'>
                            <div>
                              <div className='font-medium'>{user.full_name || user.username}</div>
                              <div className='text-muted-foreground text-sm'>
                                {maskEmail(user.email)} • {maskPhoneNumber(user.phone)}
                              </div>
                            </div>
                            <div className='text-right'>
                              <div className='text-sm font-medium'>ID: {user.user_id}</div>
                              <div className='text-muted-foreground text-xs'>
                                {formatPhoneNumber(user.phone)}
                              </div>
                              <Badge variant={user.is_active ? 'default' : 'secondary'}>
                                {user.is_active ? 'Active' : 'Inactive'}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
                {/* Selected User Display */}
                {hasSelectedUser && (
                  <div className='rounded-lg border border-green-200 bg-green-50 p-3'>
                    <div className='flex items-center justify-between'>
                      <div>
                        <div className='font-medium text-green-800'>
                          ✓ Đã chọn: {selectedUser?.full_name || selectedUser?.username}
                        </div>
                        <div className='text-sm text-green-600'>
                          {maskEmail(selectedUser?.email)} • {maskPhoneNumber(selectedUser?.phone)}
                        </div>
                      </div>
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={clearSelection}
                        className='border-green-300 text-green-700'
                      >
                        <X className='h-4 w-4' />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className='w-full'>
            {/* Selected User Banner */}
            {hasSelectedUser && (
              <div className='mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4'>
                <div className='flex items-center gap-3 text-blue-800'>
                  <div className='rounded-full bg-blue-100 p-1.5'>
                    <User className='h-4 w-4 text-blue-600' />
                  </div>
                  <div className='flex-1'>
                    <div className='font-medium'>
                      Thiết lập cho: {selectedUser?.full_name || selectedUser?.username}
                    </div>
                    <div className='text-sm text-blue-600'>
                      {maskEmail(selectedUser?.email)} • {maskPhoneNumber(selectedUser?.phone)} •
                      ID: {selectedUser?.user_id}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <TabsList className='bg-muted mb-6 grid h-auto w-full grid-cols-1 gap-1 rounded-lg p-1'>
              <TabsTrigger
                value='ai'
                className='data-[state=active]:bg-background flex items-center gap-2 rounded-md px-4 py-3 data-[state=active]:shadow-sm'
              >
                <Settings className='h-4 w-4' />
                <span className='hidden sm:inline'>AI Config</span>
                <span className='sm:hidden'>AI</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value='ai' className='mt-0 space-y-6'>
              <Card className='shadow-sm'>
                <CardHeader className='pb-4'>
                  <CardTitle className='flex items-center gap-3 text-lg'>
                    <div className='rounded-lg bg-purple-50 p-2'>
                      <Settings className='h-5 w-5 text-purple-600' />
                    </div>
                    Cấu hình AI
                  </CardTitle>
                  <CardDescription className='text-sm'>
                    Thiết lập cấu hình xử lý AI cho customer
                  </CardDescription>
                </CardHeader>
                <CardContent className='space-y-6'>
                  <Form {...aiConfigForm}>
                    <form
                      onSubmit={aiConfigForm.handleSubmit(handleCreateAIConfig)}
                      className='space-y-4'
                    >
                      <div className='grid grid-cols-2 gap-4'>
                        <FormField
                          control={aiConfigForm.control}
                          name='user_id'
                          render={({ field }) => (
                            <FormItem className={hasSelectedUser ? 'hidden' : ''}>
                              <FormLabel>User ID *</FormLabel>
                              <FormControl>
                                <UserAutocomplete
                                  value={field.value}
                                  placeholder='Tìm tên người dùng hoặc ID...'
                                  onChange={(id) => {
                                    field.onChange(id || '');
                                  }}
                                  onSelectUser={(user) => {
                                    // mirror into selection hook so the UI shows selected user
                                    selectUser(user);
                                    const userIdStr = user.user_id?.toString() || '';
                                    aiConfigForm.setValue('user_id', userIdStr);
                                  }}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={aiConfigForm.control}
                          name='model_name'
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Tên Model *</FormLabel>
                              <FormControl>
                                <Input placeholder='fall-detection-v2' {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className='grid grid-cols-2 gap-4'>
                        <FormField
                          control={aiConfigForm.control}
                          name='threshold'
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Threshold (0-1) *</FormLabel>
                              <FormControl>
                                <Input
                                  type='number'
                                  step='0.1'
                                  min='0'
                                  max='1'
                                  placeholder='0.8'
                                  {...field}
                                  onChange={(e) => field.onChange(parseFloat(e.target.value))}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={aiConfigForm.control}
                          name='processing_interval'
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Processing Interval (giây) *</FormLabel>
                              <FormControl>
                                <Input
                                  type='number'
                                  placeholder='5'
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value))}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={aiConfigForm.control}
                        name='enabled_features'
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tính năng được kích hoạt *</FormLabel>
                            <FormControl>
                              <div className='flex flex-wrap gap-2'>
                                {aiFeatures.map((feature) => (
                                  <Badge
                                    key={feature.value}
                                    variant={
                                      field.value?.includes(feature.value) ? 'default' : 'outline'
                                    }
                                    className='hover:bg-primary/80 cursor-pointer'
                                    onClick={() => {
                                      const current = field.value || [];
                                      if (current.includes(feature.value)) {
                                        field.onChange(current.filter((f) => f !== feature.value));
                                      } else {
                                        field.onChange([...current, feature.value]);
                                      }
                                    }}
                                  >
                                    {feature.label}
                                  </Badge>
                                ))}
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={aiConfigForm.control}
                        name='alert_on_detection'
                        render={({ field }) => (
                          <FormItem className='flex flex-row items-center justify-between rounded-lg border p-4'>
                            <div className='space-y-0.5'>
                              <FormLabel className='text-base'>Cảnh báo khi phát hiện</FormLabel>
                              <div className='text-muted-foreground text-sm'>
                                Gửi thông báo khi AI phát hiện sự kiện
                              </div>
                            </div>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <Button
                        type='submit'
                        disabled={createAIConfigMutation.isPending}
                        className='w-full'
                      >
                        {createAIConfigMutation.isPending ? (
                          <>
                            <div className='mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent' />
                            Đang tạo cấu hình AI...
                          </>
                        ) : (
                          <>
                            <Settings className='mr-2 h-4 w-4' />
                            Tạo cấu hình AI
                          </>
                        )}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <DialogFooter className='bg-muted/30 border-t px-4 py-4 sm:px-6'>
            <div className='flex w-full items-center justify-between'>
              <div className='text-muted-foreground text-sm'>
                {selectedUser?.full_name || 'Chưa chọn user'}
              </div>
              <Button variant='outline' onClick={() => setOpen(false)}>
                Đóng
              </Button>
            </div>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
