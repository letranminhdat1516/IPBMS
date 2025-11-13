import {
  Activity,
  AlertTriangle,
  Calendar,
  CheckCircle,
  Clock,
  FileText,
  Pill,
  Stethoscope,
  TrendingUp,
  Users,
} from 'lucide-react';

import { useState } from 'react';

import { useQuery } from '@tanstack/react-query';

import { Header } from '@/components/layout/header';
import { Main } from '@/components/layout/main';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  type HealthReportItem,
  getHealthSummary,
  getPatients,
  getReports,
} from '@/services/healthReports';

const DEFAULT_PAGE_SIZE = 20;

const statusConfig = {
  pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  completed: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
  reviewed: { color: 'bg-blue-100 text-blue-800', icon: FileText },
  critical: { color: 'bg-red-100 text-red-800', icon: AlertTriangle },
};

const reportTypeConfig = {
  medical: { color: 'bg-blue-100 text-blue-800', icon: Stethoscope },
  behavioral: { color: 'bg-purple-100 text-purple-800', icon: Activity },
  monitoring: { color: 'bg-green-100 text-green-800', icon: TrendingUp },
  emergency: { color: 'bg-red-100 text-red-800', icon: AlertTriangle },
};

export default function HealthReportsPage() {
  const [activeTab, setActiveTab] = useState('reports');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const {
    data: reportsData,
    isLoading: reportsLoading,
    isError: reportsError,
  } = useQuery({
    queryKey: ['health-reports', page, statusFilter, typeFilter],
    queryFn: () =>
      getReports({
        page,
        limit: DEFAULT_PAGE_SIZE,
        status: statusFilter === 'all' ? undefined : [statusFilter],
        type: typeFilter === 'all' ? undefined : [typeFilter],
      }),
    enabled: activeTab === 'reports',
  });

  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ['health-summary'],
    queryFn: () => getHealthSummary(),
  });

  const { data: _patientsData, isLoading: patientsLoading } = useQuery({
    queryKey: ['patients'],
    queryFn: () => getPatients({ limit: 100 }),
    enabled: activeTab === 'patients',
  });

  const reports = reportsData?.items || [];
  const total = reportsData?.pagination?.total || 0;
  const summary = summaryData;

  const getReportTypeIcon = (reportType: string) => {
    const config = reportTypeConfig[reportType as keyof typeof reportTypeConfig];
    return config?.icon || FileText;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

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
            <h2 className='text-2xl font-bold tracking-tight'>Báo cáo sức khỏe</h2>
            <p className='text-muted-foreground'>Giám sát sức khỏe bệnh nhân và báo cáo y tế</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className='mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>Tổng số báo cáo</CardTitle>
              <FileText className='text-muted-foreground h-4 w-4' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>
                {summaryLoading ? '...' : summary?.totalReports || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>Bệnh nhân đang theo dõi</CardTitle>
              <Users className='text-muted-foreground h-4 w-4' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>
                {summaryLoading ? '...' : summary?.activePatients || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>Báo cáo chờ xử lý</CardTitle>
              <Clock className='text-muted-foreground h-4 w-4' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>
                {summaryLoading ? '...' : summary?.pendingReports || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>Cảnh báo nghiêm trọng</CardTitle>
              <AlertTriangle className='text-muted-foreground h-4 w-4' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>
                {summaryLoading ? '...' : summary?.criticalAlerts || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className='space-y-4'>
          <TabsList>
            <TabsTrigger value='reports'>Báo cáo</TabsTrigger>
            <TabsTrigger value='patients'>Bệnh nhân</TabsTrigger>
            <TabsTrigger value='analytics'>Thống kê</TabsTrigger>
          </TabsList>

          <TabsContent value='reports' className='space-y-4'>
            <Card>
              <CardHeader>
                <div className='flex flex-wrap items-center justify-between gap-4'>
                  <CardTitle>Báo cáo sức khỏe</CardTitle>
                  <div className='flex gap-2'>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className='w-32'>
                        <SelectValue placeholder='Trạng thái' />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='all'>Tất cả trạng thái</SelectItem>
                        <SelectItem value='pending'>Chờ xử lý</SelectItem>
                        <SelectItem value='completed'>Hoàn thành</SelectItem>
                        <SelectItem value='reviewed'>Đã xem xét</SelectItem>
                        <SelectItem value='critical'>Nghiêm trọng</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger className='w-32'>
                        <SelectValue placeholder='Loại' />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='all'>Tất cả loại</SelectItem>
                        <SelectItem value='medical'>Y tế</SelectItem>
                        <SelectItem value='behavioral'>Hành vi</SelectItem>
                        <SelectItem value='monitoring'>Giám sát</SelectItem>
                        <SelectItem value='emergency'>Khẩn cấp</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {reportsError ? (
                  <div className='text-muted-foreground py-8 text-center'>
                    Không thể tải báo cáo sức khỏe
                  </div>
                ) : reportsLoading ? (
                  <div className='text-muted-foreground py-8 text-center'>Đang tải báo cáo...</div>
                ) : reports.length === 0 ? (
                  <div className='text-muted-foreground py-8 text-center'>
                    Không tìm thấy báo cáo sức khỏe nào
                  </div>
                ) : (
                  <div className='space-y-4'>
                    {reports.map((report: HealthReportItem) => {
                      const status = report.status || 'pending';
                      const reportType = report.report_type || 'medical';
                      const StatusIcon =
                        statusConfig[status as keyof typeof statusConfig]?.icon || Clock;
                      const TypeIcon = getReportTypeIcon(reportType);

                      return (
                        <div
                          key={report.report_id}
                          className='hover:bg-muted/50 flex items-start gap-4 rounded-lg border p-4'
                        >
                          <div className='flex-shrink-0'>
                            <div className='flex items-center gap-2'>
                              <TypeIcon className='text-muted-foreground h-5 w-5' />
                              <StatusIcon className='text-muted-foreground h-4 w-4' />
                            </div>
                          </div>
                          <div className='flex-1 space-y-2'>
                            <div className='flex items-center gap-2'>
                              <Badge
                                variant='outline'
                                className={statusConfig[status as keyof typeof statusConfig]?.color}
                              >
                                {status}
                              </Badge>
                              <Badge
                                variant='outline'
                                className={
                                  reportTypeConfig[reportType as keyof typeof reportTypeConfig]
                                    ?.color
                                }
                              >
                                {reportType}
                              </Badge>
                              <span className='text-muted-foreground flex items-center gap-1 text-sm'>
                                <Calendar className='h-3 w-3' />
                                {formatDate(report.report_time)}
                              </span>
                            </div>
                            <div className='flex items-center gap-4 text-sm'>
                              <span className='font-medium'>
                                {report.patient_name || `Patient ${report.patient_id}`}
                              </span>
                              {report.diagnosis && (
                                <span className='text-muted-foreground flex items-center gap-1'>
                                  <Stethoscope className='h-3 w-3' />
                                  {report.diagnosis}
                                </span>
                              )}
                              {report.medications && (
                                <span className='text-muted-foreground flex items-center gap-1'>
                                  <Pill className='h-3 w-3' />
                                  {report.medications}
                                </span>
                              )}
                            </div>
                            {report.content && (
                              <div className='text-muted-foreground text-xs'>
                                {report.content.length > 200
                                  ? `${report.content.substring(0, 200)}...`
                                  : report.content}
                              </div>
                            )}
                          </div>
                          <div className='flex-shrink-0'>
                            <Button variant='ghost' size='sm'>
                              Xem chi tiết
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                    <PaginationBar
                      page={page}
                      pageSize={DEFAULT_PAGE_SIZE}
                      total={total}
                      onPageChange={setPage}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value='patients' className='space-y-4'>
            <Card>
              <CardHeader>
                <CardTitle>Tổng quan bệnh nhân</CardTitle>
              </CardHeader>
              <CardContent>
                {patientsLoading ? (
                  <div className='text-muted-foreground py-8 text-center'>
                    Đang tải bệnh nhân...
                  </div>
                ) : (
                  <div className='text-muted-foreground py-8 text-center'>
                    Giao diện quản lý bệnh nhân sẽ có sớm
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value='analytics' className='space-y-4'>
            <Card>
              <CardHeader>
                <CardTitle>Thống kê sức khỏe</CardTitle>
              </CardHeader>
              <CardContent>
                <div className='text-muted-foreground py-8 text-center'>
                  Bảng thống kê sức khỏe sẽ có sớm
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </Main>
    </>
  );
}
