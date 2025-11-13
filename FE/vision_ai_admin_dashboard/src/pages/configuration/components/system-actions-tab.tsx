import {
  AlertTriangle,
  Clock,
  HardDrive,
  Loader2,
  RotateCcw,
  Settings,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';

import { useState } from 'react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

import { useMaintenanceMode, useSystemActions, useUpdateMaintenanceMode } from '@/services/system';

export function SystemActionsTab() {
  const { restart, clearCache, createBackup } = useSystemActions();
  const { data: maintenanceMode, isLoading } = useMaintenanceMode();
  const updateMaintenanceMutation = useUpdateMaintenanceMode();

  const [showRestartDialog, setShowRestartDialog] = useState(false);
  const [showClearCacheDialog, setShowClearCacheDialog] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');
  const [allowedIps, setAllowedIps] = useState('');

  const handleRestartSystem = async () => {
    try {
      await restart.mutateAsync();
      toast.success('Hệ thống đang được khởi động lại...');
      setShowRestartDialog(false);
    } catch (_error) {
      toast.error('Có lỗi xảy ra khi khởi động lại hệ thống');
    }
  };

  const handleClearCache = async () => {
    try {
      await clearCache.mutateAsync();
      toast.success('Cache đã được xóa thành công');
      setShowClearCacheDialog(false);
    } catch (_error) {
      toast.error('Có lỗi xảy ra khi xóa cache');
    }
  };

  const handleCreateBackup = async () => {
    try {
      await createBackup.mutateAsync();
      toast.success('Sao lưu hệ thống đã được tạo');
    } catch (_error) {
      toast.error('Có lỗi xảy ra khi tạo sao lưu');
    }
  };

  const handleUpdateMaintenanceMode = async (enabled: boolean) => {
    try {
      await updateMaintenanceMutation.mutateAsync({
        enabled,
        message: maintenanceMessage || maintenanceMode?.message || 'Hệ thống đang bảo trì',
        allowedIps: allowedIps ? allowedIps.split(',').map((ip) => ip.trim()) : [],
      });
      toast.success(`Chế độ bảo trì đã ${enabled ? 'bật' : 'tắt'}`);
    } catch (_error) {
      toast.error('Có lỗi xảy ra khi cập nhật chế độ bảo trì');
    }
  };

  if (isLoading) {
    return (
      <div className='space-y-6'>
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className='h-6 w-32' />
              <Skeleton className='h-4 w-48' />
            </CardHeader>
            <CardContent>
              <div className='space-y-4'>
                <Skeleton className='h-10 w-32' />
                <Skeleton className='h-4 w-full' />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      {/* Maintenance Mode */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Settings className='h-5 w-5' />
            Chế độ bảo trì
          </CardTitle>
          <CardDescription>
            Kích hoạt chế độ bảo trì để ngăn người dùng truy cập hệ thống
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='flex items-center justify-between'>
            <div>
              <Label className='text-base'>Chế độ bảo trì</Label>
              <p className='text-muted-foreground text-sm'>Bật/tắt chế độ bảo trì hệ thống</p>
            </div>
            <div className='flex items-center gap-2'>
              {maintenanceMode?.enabled && (
                <Badge variant='destructive'>
                  <AlertTriangle className='mr-1 h-3 w-3' />
                  Đang bảo trì
                </Badge>
              )}
              <Switch
                checked={maintenanceMode?.enabled || false}
                onCheckedChange={handleUpdateMaintenanceMode}
                disabled={updateMaintenanceMutation.isPending}
              />
            </div>
          </div>

          <div className='space-y-4'>
            <div>
              <Label htmlFor='maintenance-message'>Thông báo bảo trì</Label>
              <Textarea
                id='maintenance-message'
                placeholder='Nhập thông báo hiển thị khi hệ thống bảo trì...'
                value={maintenanceMessage || maintenanceMode?.message || ''}
                onChange={(e) => setMaintenanceMessage(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor='allowed-ips'>IP được phép truy cập (tùy chọn)</Label>
              <Input
                id='allowed-ips'
                placeholder='192.168.1.1, 10.0.0.1 (phân cách bằng dấu phẩy)'
                value={allowedIps || maintenanceMode?.allowedIps?.join(', ') || ''}
                onChange={(e) => setAllowedIps(e.target.value)}
              />
              <p className='text-muted-foreground mt-1 text-xs'>
                Để trống nếu muốn chặn tất cả người dùng
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Actions */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <ShieldCheck className='h-5 w-5' />
            Thao tác hệ thống
          </CardTitle>
          <CardDescription>Các thao tác quản trị hệ thống quan trọng</CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='grid gap-4 md:grid-cols-3'>
            <div className='space-y-2'>
              <Button
                variant='outline'
                className='w-full'
                onClick={() => setShowRestartDialog(true)}
                disabled={restart.isPending}
              >
                {restart.isPending ? (
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                ) : (
                  <RotateCcw className='mr-2 h-4 w-4' />
                )}
                Khởi động lại hệ thống
              </Button>
              <p className='text-muted-foreground text-xs'>
                Khởi động lại toàn bộ hệ thống. Sẽ gián đoạn dịch vụ trong vài phút.
              </p>
            </div>

            <div className='space-y-2'>
              <Button
                variant='outline'
                className='w-full'
                onClick={() => setShowClearCacheDialog(true)}
                disabled={clearCache.isPending}
              >
                {clearCache.isPending ? (
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                ) : (
                  <Trash2 className='mr-2 h-4 w-4' />
                )}
                Xóa Cache
              </Button>
              <p className='text-muted-foreground text-xs'>
                Xóa toàn bộ cache hệ thống để cải thiện hiệu suất.
              </p>
            </div>

            <div className='space-y-2'>
              <Button
                variant='outline'
                className='w-full'
                onClick={handleCreateBackup}
                disabled={createBackup.isPending}
              >
                {createBackup.isPending ? (
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                ) : (
                  <HardDrive className='mr-2 h-4 w-4' />
                )}
                Tạo sao lưu
              </Button>
              <p className='text-muted-foreground text-xs'>
                Tạo bản sao lưu toàn bộ dữ liệu hệ thống.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Scheduled Maintenance */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Clock className='h-5 w-5' />
            Bảo trì theo lịch
          </CardTitle>
          <CardDescription>Lên lịch bảo trì hệ thống tự động</CardDescription>
        </CardHeader>
        <CardContent>
          <div className='text-muted-foreground py-8 text-center'>
            <Clock className='mx-auto mb-4 h-12 w-12 opacity-50' />
            <p>Tính năng lên lịch bảo trì sẽ được phát triển trong tương lai</p>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialogs */}
      <AlertDialog open={showRestartDialog} onOpenChange={setShowRestartDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className='flex items-center gap-2'>
              <AlertTriangle className='h-5 w-5 text-red-500' />
              Xác nhận khởi động lại hệ thống
            </AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn khởi động lại hệ thống? Tất cả người dùng sẽ bị ngắt kết nối và
              dịch vụ sẽ tạm thời không khả dụng trong vài phút.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRestartSystem}
              className='bg-red-600 hover:bg-red-700'
            >
              Khởi động lại
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showClearCacheDialog} onOpenChange={setShowClearCacheDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa cache</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa toàn bộ cache hệ thống? Điều này có thể làm chậm hệ thống
              tạm thời cho đến khi cache được tái tạo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearCache}>Xóa cache</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
