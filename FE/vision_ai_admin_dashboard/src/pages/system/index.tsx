import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Cpu,
  Database,
  Eye,
  Server,
  Wifi,
  XCircle,
} from 'lucide-react';

import { useState } from 'react';

import { Header } from '@/components/layout/header';
import { Main } from '@/components/layout/main';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { PaginationBar } from '@/components/pagination-bar';
import { ProfileDropdown } from '@/components/profile-dropdown';
import { Search } from '@/components/search';
import { ThemeSwitch } from '@/components/theme-switch';

import {
  useActivityLogs,
  useEmergencyProtocols,
  useNormalizedSystemSettings,
} from '@/services/system';

const DEFAULT_PAGE_SIZE = 20;

const severityConfig = {
  info: { color: 'bg-blue-100 text-blue-800', icon: Eye },
  warning: { color: 'bg-yellow-100 text-yellow-800', icon: AlertTriangle },
  error: { color: 'bg-red-100 text-red-800', icon: XCircle },
};

export default function SystemManagementPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [activityPage, setActivityPage] = useState(1);
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');

  const { data: systemSettings, isLoading: settingsLoading } = useNormalizedSystemSettings();
  const { data: activityLogs, isLoading: logsLoading } = useActivityLogs();
  const { data: emergencyProtocols, isLoading: protocolsLoading } = useEmergencyProtocols();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filteredLogs = activityLogs?.items || [];
  const totalLogs = activityLogs?.pagination?.total || 0;

  return (
    <>
      <Header fixed>
        <Search />
        <div className='ml-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        <div className='mb-4 flex flex-wrap items-center justify-between gap-4'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>Quản lý hệ thống</h2>
            <p className='text-muted-foreground'>Giám sát và cấu hình cài đặt hệ thống</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className='space-y-4'>
          <TabsList className='grid w-full grid-cols-5'>
            <TabsTrigger value='overview'>Tổng quan</TabsTrigger>
            <TabsTrigger value='settings'>Cài đặt</TabsTrigger>
            <TabsTrigger value='activity'>Nhật ký hoạt động</TabsTrigger>
            <TabsTrigger value='protocols'>Giao thức khẩn cấp</TabsTrigger>
            <TabsTrigger value='health'>Tình trạng hệ thống</TabsTrigger>
          </TabsList>

          <TabsContent value='overview' className='space-y-4'>
            {/* System Health Overview */}
            <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
              <Card>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                  <CardTitle className='text-sm font-medium'>Trạng thái hệ thống</CardTitle>
                  <Server className='text-muted-foreground h-4 w-4' />
                </CardHeader>
                <CardContent>
                  <div className='flex items-center space-x-2'>
                    <Badge variant='secondary' className='border-0 bg-green-100 text-green-800'>
                      <CheckCircle className='mr-1 h-3 w-3' />
                      Khỏe mạnh
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                  <CardTitle className='text-sm font-medium'>Thời gian hoạt động</CardTitle>
                  <Clock className='text-muted-foreground h-4 w-4' />
                </CardHeader>
                <CardContent>
                  <div className='text-2xl font-bold'>99.9%</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                  <CardTitle className='text-sm font-medium'>Sử dụng CPU</CardTitle>
                  <Cpu className='text-muted-foreground h-4 w-4' />
                </CardHeader>
                <CardContent>
                  <div className='text-2xl font-bold'>45%</div>
                  <Progress value={45} className='mt-2' />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                  <CardTitle className='text-sm font-medium'>Sử dụng bộ nhớ</CardTitle>
                  <Database className='text-muted-foreground h-4 w-4' />
                </CardHeader>
                <CardContent>
                  <div className='text-2xl font-bold'>67%</div>
                  <Progress value={67} className='mt-2' />
                </CardContent>
              </Card>
            </div>

            {/* Services Status */}
            <Card>
              <CardHeader>
                <CardTitle>Trạng thái dịch vụ</CardTitle>
              </CardHeader>
              <CardContent>
                <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
                  {[
                    { name: 'Cơ sở dữ liệu', status: 'up', last_check: new Date().toISOString() },
                    { name: 'Máy chủ API', status: 'up', last_check: new Date().toISOString() },
                    { name: 'Lưu trữ tệp', status: 'up', last_check: new Date().toISOString() },
                    { name: 'Bộ nhớ cache', status: 'up', last_check: new Date().toISOString() },
                  ].map((service) => (
                    <div
                      key={service.name}
                      className='flex items-center justify-between rounded-lg border p-3'
                    >
                      <div className='flex items-center space-x-2'>
                        <Wifi className='text-muted-foreground h-4 w-4' />
                        <span className='font-medium capitalize'>{service.name}</span>
                      </div>
                      <div className='flex items-center space-x-2'>
                        <Badge
                          variant='secondary'
                          className={`${service.status === 'up' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'} border-0`}
                        >
                          {service.status === 'up' ? (
                            <CheckCircle className='mr-1 h-3 w-3' />
                          ) : (
                            <XCircle className='mr-1 h-3 w-3' />
                          )}
                          {service.status}
                        </Badge>
                        <span className='text-muted-foreground text-xs'>
                          {formatDate(service.last_check)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Hoạt động gần đây</CardTitle>
              </CardHeader>
              <CardContent>
                {logsLoading ? (
                  <div className='py-4 text-center'>Đang tải hoạt động...</div>
                ) : filteredLogs.length === 0 ? (
                  <div className='text-muted-foreground py-4 text-center'>
                    Không có hoạt động gần đây
                  </div>
                ) : (
                  <div className='space-y-3'>
                    {filteredLogs.slice(0, 5).map((log) => {
                      const SeverityIcon = severityConfig[log.severity || 'info'].icon;
                      return (
                        <div
                          key={log.id}
                          className='hover:bg-muted/50 flex items-center space-x-3 rounded-lg p-2'
                        >
                          <SeverityIcon className='text-muted-foreground h-4 w-4' />
                          <div className='flex-1'>
                            <p className='text-sm font-medium'>{log.action}</p>
                            <p className='text-muted-foreground text-xs'>
                              {log.actor?.name || 'System'} • {formatDate(log.timestamp)}
                            </p>
                          </div>
                          <Badge
                            variant='secondary'
                            className={`${severityConfig[log.severity || 'info'].color} border-0`}
                          >
                            {log.severity || 'info'}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value='settings' className='space-y-4'>
            <Card>
              <CardHeader>
                <CardTitle>Cài đặt hệ thống</CardTitle>
                <p className='text-muted-foreground text-sm'>
                  Cấu hình cài đặt và tùy chỉnh toàn hệ thống
                </p>
              </CardHeader>
              <CardContent>
                {settingsLoading ? (
                  <div className='py-8 text-center'>Đang tải cài đặt...</div>
                ) : (
                  <div className='space-y-4'>
                    {systemSettings &&
                      Object.entries(systemSettings).map(([key, entry]) => (
                        <div
                          key={key}
                          className='flex items-center justify-between rounded-lg border p-4'
                        >
                          <div>
                            <h3 className='font-medium'>
                              {key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                            </h3>
                            <p className='text-muted-foreground text-sm'>
                              {entry === null || entry.value === undefined
                                ? '—'
                                : typeof entry.value === 'object'
                                  ? JSON.stringify(entry.value, null, 2)
                                  : String(entry.value)}
                            </p>
                          </div>
                          <Button variant='outline' size='sm'>
                            Chỉnh sửa
                          </Button>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value='activity' className='space-y-4'>
            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle>Nhật ký hoạt động</CardTitle>
              </CardHeader>
              <CardContent>
                <div className='flex flex-wrap gap-4'>
                  <div className='min-w-[200px] flex-1'>
                    <Select value={severityFilter} onValueChange={setSeverityFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder='Lọc theo mức độ' />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='all'>Tất cả mức độ</SelectItem>
                        <SelectItem value='info'>Thông tin</SelectItem>
                        <SelectItem value='warning'>Nhắc nhở</SelectItem>
                        <SelectItem value='error'>Lỗi</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className='min-w-[200px] flex-1'>
                    <Select value={actionFilter} onValueChange={setActionFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder='Lọc theo hành động' />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='all'>Tất cả hành động</SelectItem>
                        <SelectItem value='login'>Đăng nhập</SelectItem>
                        <SelectItem value='logout'>Đăng xuất</SelectItem>
                        <SelectItem value='create'>Tạo</SelectItem>
                        <SelectItem value='update'>Cập nhật</SelectItem>
                        <SelectItem value='delete'>Xóa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Activity Logs List */}
            <Card>
              <CardContent className='p-0'>
                {logsLoading ? (
                  <div className='py-8 text-center'>Đang tải nhật ký hoạt động...</div>
                ) : filteredLogs.length === 0 ? (
                  <div className='text-muted-foreground py-8 text-center'>
                    Không tìm thấy nhật ký hoạt động nào
                  </div>
                ) : (
                  <div className='divide-y'>
                    {filteredLogs.map((log) => {
                      const SeverityIcon = severityConfig[log.severity || 'info'].icon;
                      return (
                        <div key={log.id} className='hover:bg-muted/50 p-4'>
                          <div className='flex items-start space-x-3'>
                            <SeverityIcon className='text-muted-foreground mt-0.5 h-5 w-5' />
                            <div className='flex-1'>
                              <div className='mb-1 flex items-center space-x-2'>
                                <h3 className='font-medium'>{log.action}</h3>
                                <Badge
                                  variant='secondary'
                                  className={`${severityConfig[log.severity || 'info'].color} border-0`}
                                >
                                  {log.severity || 'info'}
                                </Badge>
                              </div>
                              <p className='text-muted-foreground mb-2 text-sm'>
                                {typeof log.message === 'string'
                                  ? log.message
                                  : typeof log.message === 'object'
                                    ? JSON.stringify(log.message, null, 2)
                                    : log.message
                                      ? String(log.message)
                                      : `${log.resource_type} ${log.resource_id}`}
                              </p>
                              <div className='text-muted-foreground flex items-center space-x-4 text-xs'>
                                <span>{log.actor?.name || 'System'}</span>
                                <span>{formatDate(log.timestamp)}</span>
                                {log.ip && <span>{log.ip}</span>}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Pagination */}
            {totalLogs > DEFAULT_PAGE_SIZE && (
              <PaginationBar
                page={activityPage}
                pageSize={DEFAULT_PAGE_SIZE}
                total={totalLogs}
                onPageChange={setActivityPage}
              />
            )}
          </TabsContent>

          <TabsContent value='protocols' className='space-y-4'>
            <Card>
              <CardHeader>
                <CardTitle>Giao thức khẩn cấp</CardTitle>
                <p className='text-muted-foreground text-sm'>
                  Quản lý giao thức và quy trình ứng phó khẩn cấp
                </p>
              </CardHeader>
              <CardContent>
                {protocolsLoading ? (
                  <div className='py-8 text-center'>Đang tải giao thức...</div>
                ) : (
                  <div className='space-y-4'>
                    {emergencyProtocols?.map((protocol) => (
                      <div key={protocol.id} className='rounded-lg border p-4'>
                        <div className='mb-2 flex items-center justify-between'>
                          <h3 className='font-medium'>{protocol.name}</h3>
                          <Button variant='outline' size='sm'>
                            Chỉnh sửa
                          </Button>
                        </div>
                        <p className='text-muted-foreground text-sm'>
                          Đã cấu hình {protocol.steps.length} bước
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value='health' className='space-y-4'>
            <div className='grid gap-4 md:grid-cols-2'>
              <Card>
                <CardHeader>
                  <CardTitle>Tài nguyên hệ thống</CardTitle>
                </CardHeader>
                <CardContent className='space-y-4'>
                  <div>
                    <div className='mb-1 flex justify-between text-sm'>
                      <span>Sử dụng CPU</span>
                      <span>45%</span>
                    </div>
                    <Progress value={45} />
                  </div>
                  <div>
                    <div className='mb-1 flex justify-between text-sm'>
                      <span>Sử dụng bộ nhớ</span>
                      <span>67%</span>
                    </div>
                    <Progress value={67} />
                  </div>
                  <div>
                    <div className='mb-1 flex justify-between text-sm'>
                      <span>Sử dụng ổ đĩa</span>
                      <span>23%</span>
                    </div>
                    <Progress value={23} />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Thông tin hệ thống</CardTitle>
                </CardHeader>
                <CardContent className='space-y-2'>
                  <div className='flex justify-between'>
                    <span className='text-sm'>Thời gian hoạt động</span>
                    <span className='text-sm font-medium'>99.9%</span>
                  </div>
                  <div className='flex justify-between'>
                    <span className='text-sm'>Trạng thái</span>
                    <Badge variant='secondary' className='border-0 bg-green-100 text-green-800'>
                      Khỏe mạnh
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </Main>
    </>
  );
}
