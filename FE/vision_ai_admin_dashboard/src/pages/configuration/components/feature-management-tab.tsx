import { AlertTriangle, Filter, Plus, ToggleLeft } from 'lucide-react';
import { toast } from 'sonner';

import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';

import { useFeatureToggles, useUpdateFeatureToggle } from '@/services/system';

export function FeatureManagementTab() {
  const { data: features, isLoading } = useFeatureToggles();
  const updateFeatureMutation = useUpdateFeatureToggle();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const handleToggleFeature = async (key: string, enabled: boolean) => {
    try {
      await updateFeatureMutation.mutateAsync({ key, enabled });
      toast.success(`Tính năng ${enabled ? 'đã bật' : 'đã tắt'} thành công`);
    } catch (_error) {
      toast.error('Có lỗi xảy ra khi cập nhật tính năng');
    }
  };

  const filteredFeatures = features?.filter((feature) => {
    const matchesSearch =
      feature.name.toLowerCase().includes(search.toLowerCase()) ||
      feature.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || feature.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const categories = [...new Set(features?.map((f) => f.category) || [])];

  if (isLoading) {
    return (
      <div className='space-y-6'>
        <div className='grid gap-4'>
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <div className='flex items-center justify-between'>
                  <div className='space-y-2'>
                    <Skeleton className='h-4 w-32' />
                    <Skeleton className='h-3 w-48' />
                  </div>
                  <Skeleton className='h-6 w-12' />
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold tracking-tight'>Quản lý tính năng</h1>
          <p className='text-muted-foreground'>
            Bật/tắt các tính năng của hệ thống. Một số tính năng có thể yêu cầu khởi động lại hệ
            thống.
          </p>
        </div>
        <Button variant='outline'>
          <Plus className='mr-2 h-4 w-4' />
          Thêm tính năng
        </Button>
      </div>

      {/* Stats Overview */}
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Tổng tính năng</CardTitle>
            <ToggleLeft className='text-muted-foreground h-4 w-4' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{features?.length || 0}</div>
            <p className='text-muted-foreground text-xs'>Tất cả tính năng</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Đã bật</CardTitle>
            <ToggleLeft className='text-muted-foreground h-4 w-4' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              {features?.filter((f) => f.enabled).length || 0}
            </div>
            <p className='text-muted-foreground text-xs'>Tính năng đang hoạt động</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Đã tắt</CardTitle>
            <ToggleLeft className='text-muted-foreground h-4 w-4' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              {features?.filter((f) => !f.enabled).length || 0}
            </div>
            <p className='text-muted-foreground text-xs'>Tính năng đã tắt</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Cần khởi động lại</CardTitle>
            <AlertTriangle className='text-muted-foreground h-4 w-4' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              {features?.filter((f) => f.requiresRestart).length || 0}
            </div>
            <p className='text-muted-foreground text-xs'>Tính năng cần restart</p>
          </CardContent>
        </Card>
      </div>

      {/* Feature Management */}
      <Card>
        <CardHeader>
          <CardTitle>Danh sách tính năng</CardTitle>
          <CardDescription>Quản lý và cấu hình tất cả các tính năng trong hệ thống</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className='mb-6 flex items-center gap-4'>
            <div className='flex-1'>
              <Label htmlFor='search'>Tìm kiếm tính năng</Label>
              <Input
                id='search'
                placeholder='Tìm kiếm theo tên hoặc mô tả...'
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className='w-[200px]'>
              <Label htmlFor='category'>Danh mục</Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder='Tất cả danh mục' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>Tất cả danh mục</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Feature List */}
          <div className='grid gap-4'>
            {filteredFeatures?.map((feature) => (
              <Card key={feature.key}>
                <CardHeader>
                  <div className='flex items-center justify-between'>
                    <div className='space-y-1'>
                      <div className='flex items-center gap-2'>
                        <CardTitle className='text-base'>{feature.name}</CardTitle>
                        <Badge variant='outline'>{feature.category}</Badge>
                        {feature.requiresRestart && (
                          <Badge variant='destructive' className='text-xs'>
                            <AlertTriangle className='mr-1 h-3 w-3' />
                            Cần khởi động lại
                          </Badge>
                        )}
                      </div>
                      <CardDescription>{feature.description}</CardDescription>
                    </div>
                    <div className='flex items-center space-x-2'>
                      <Switch
                        checked={feature.enabled}
                        onCheckedChange={(enabled) => handleToggleFeature(feature.key, enabled)}
                        disabled={updateFeatureMutation.isPending}
                      />
                      <ToggleLeft className='text-muted-foreground h-4 w-4' />
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>

          {filteredFeatures?.length === 0 && (
            <Card>
              <CardContent className='flex h-32 flex-col items-center justify-center'>
                <Filter className='text-muted-foreground mb-2 h-8 w-8' />
                <p className='text-muted-foreground'>Không tìm thấy tính năng nào</p>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
