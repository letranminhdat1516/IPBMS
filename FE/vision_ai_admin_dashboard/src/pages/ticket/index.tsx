import { DEFAULT_PAGE_SIZE } from '@/constants';
import { Plus, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

import { useCallback, useMemo, useState } from 'react';

import { useNavigate } from '@tanstack/react-router';

import { Header } from '@/components/layout/header';
import { Main } from '@/components/layout/main';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { useSEO } from '@/hooks/use-seo';

import type { Camera } from '@/types/camera';

import { createCameraIssue, updateCamera, useCameras } from '@/services/cameras';
import { type Ticket, type TicketStatus, type TicketType, getUserTickets } from '@/services/ticket';

import { TicketActions } from './components/TicketActions';
import { TicketFilters } from './components/TicketFilters';
import { TicketTable } from './components/TicketTable';

function TicketPage() {
  const navigate = useNavigate();

  // Active tab state
  const [activeTab, setActiveTab] = useState<'cameras' | 'tickets'>('cameras');

  // SEO Configuration
  useSEO({
    title: 'Quản lý Phiếu Lỗi | Vision AI Admin',
    description:
      'Quản lý và theo dõi các phiếu báo lỗi trong hệ thống Vision AI. Phân công kỹ thuật viên, cập nhật trạng thái và đảm bảo xử lý sự cố kịp thời.',
    keywords:
      'phiếu lỗi, báo lỗi, quản lý sự cố, Vision AI, phân công kỹ thuật viên, hệ thống quản lý',
    ogTitle: 'Quản lý Phiếu Lỗi - Vision AI',
    ogDescription:
      'Dashboard quản lý phiếu lỗi với khả năng theo dõi thời gian thực và phân công kỹ thuật viên xử lý nhanh chóng.',
    ogType: 'website',
    twitterCard: 'summary_large_image',
    twitterTitle: 'Quản lý Phiếu Lỗi | Vision AI',
    twitterDescription: 'Quản lý phiếu lỗi và phân công kỹ thuật viên trong hệ thống Vision AI',
    robots: 'noindex, nofollow', // Admin dashboard không được index
    lang: 'vi',
    author: 'Vision AI Team',
  });

  // Camera management state
  const [search, setSearch] = useState('');
  const [selectedCameras, setSelectedCameras] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [ticketStatusFilter, setTicketStatusFilter] = useState<string>('all');
  const [reportedOnly, setReportedOnly] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const { data, isLoading, isError, refetch } = useCameras({
    page: 1,
    limit: DEFAULT_PAGE_SIZE,
    q: search,
    reportedOnly,
  });
  const cameras: Camera[] = useMemo(() => data?.items ?? [], [data]);

  // Ticket management state
  const [ticketSearch, setTicketSearch] = useState('');
  const [ticketStatusFilterTab, setTicketStatusFilterTab] = useState<string>('all');
  const [ticketTypeFilter, setTicketTypeFilter] = useState<string>('all');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);

  // Load tickets function
  const loadTickets = useCallback(async () => {
    setTicketsLoading(true);
    try {
      const response = await getUserTickets({
        page: 1,
        limit: DEFAULT_PAGE_SIZE,
        status:
          ticketStatusFilterTab === 'all' ? undefined : (ticketStatusFilterTab as TicketStatus),
        type: ticketTypeFilter === 'all' ? undefined : (ticketTypeFilter as TicketType),
      });
      setTickets(response.data || []);
    } catch (_error) {
      toast.error('Không thể tải danh sách phiếu lỗi');
    } finally {
      setTicketsLoading(false);
    }
  }, [ticketStatusFilterTab, ticketTypeFilter]);

  // Load tickets when tab changes to tickets
  useMemo(() => {
    if (activeTab === 'tickets') {
      loadTickets();
    }
  }, [activeTab, loadTickets]);

  // Load tickets when tab changes to tickets
  useMemo(() => {
    if (activeTab === 'tickets') {
      loadTickets();
    }
  }, [activeTab, loadTickets]);

  const filterCamera = useCallback(
    (cam: Camera) => {
      const s = search.toLowerCase();
      const matchesSearch =
        cam.camera_code.toLowerCase().includes(s) ||
        cam.location.toLowerCase().includes(s) ||
        cam.type.toLowerCase().includes(s) ||
        cam.ip_address.toLowerCase().includes(s) ||
        cam.status.toLowerCase().includes(s);

      const matchesStatus =
        statusFilter === 'all' || cam.status.toLowerCase() === statusFilter.toLowerCase();

      const matchesTicketStatus =
        ticketStatusFilter === 'all' ||
        (ticketStatusFilter === 'has_tickets' && (cam.open_tickets ?? 0) > 0) ||
        (ticketStatusFilter === 'no_tickets' && (cam.open_tickets ?? 0) === 0) ||
        (cam.ticket_status && cam.ticket_status.toLowerCase() === ticketStatusFilter.toLowerCase());

      const hasReport = (cam.report_count ?? 0) > 0 || cam.reported_issue === true;
      const matchesReported = reportedOnly ? hasReport : true;

      return matchesSearch && matchesStatus && matchesTicketStatus && matchesReported;
    },
    [reportedOnly, search, statusFilter, ticketStatusFilter]
  );
  const filtered = useMemo(() => cameras.filter(filterCamera), [cameras, filterCamera]);

  const allChecked = filtered.length > 0 && selectedCameras.length === filtered.length;
  function handleCheckAll() {
    setSelectedCameras(allChecked ? [] : filtered.map((cam) => cam.camera_id.toString()));
  }
  function handleCheckRow(cameraId: string) {
    setSelectedCameras((prev) =>
      prev.includes(cameraId) ? prev.filter((id) => id !== cameraId) : [...prev, cameraId]
    );
  }

  const handleQuickReport = async () => {
    // Send a quick issue for selected rows
    await Promise.all(
      filtered.map(async (cam) => {
        if (selectedCameras.includes(cam.camera_id.toString())) {
          try {
            await createCameraIssue(cam.camera_id, {
              reporterType: 'staff',
              reason: 'Báo lỗi nhanh từ hệ thống quản lý',
            });
          } catch {
            // ignore per-row error; could show toast in future
          }
        }
      })
    );
    setSelectedCameras([]);
    refetch(); // Refresh data after creating issues
  };

  const handleExportReport = () => {
    if (!data?.items) return;

    // Create CSV content
    const headers = ['Status', 'Location', 'Open Tickets'];
    const csvContent = [
      headers.join(','),
      ...data.items.map((camera) =>
        [`"${camera.status}"`, `"${camera.location || ''}"`, camera.open_tickets || 0].join(',')
      ),
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `camera-report-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBulkStatusUpdate = async (newStatus: string) => {
    if (selectedCameras.length === 0) return;

    try {
      // Update status for all selected cameras
      const updatePromises = selectedCameras.map((cameraId) =>
        updateCamera(cameraId, { status: newStatus })
      );

      await Promise.all(updatePromises);

      // Clear selection and refresh data
      setSelectedCameras([]);
      refetch();
    } catch (_error) {
      // Show error notification using toast
      toast.error('Không thể cập nhật trạng thái camera. Vui lòng thử lại.');
    }
  };

  // const getStats = () => {
  //   const total = cameras.length;
  //   const withTickets = cameras.filter((cam) => (cam.open_tickets ?? 0) > 0).length;
  //   const online = cameras.filter(
  //     (cam) =>
  //       cam.status.toLowerCase().includes('hoạt động') ||
  //       cam.status.toLowerCase().includes('online')
  //   ).length;
  //   const offline = cameras.filter(
  //     (cam) =>
  //       cam.status.toLowerCase().includes('không hoạt động') ||
  //       cam.status.toLowerCase().includes('offline')
  //   ).length;

  //   return { total, withTickets, online, offline };
  // };

  // const stats = getStats();

  return (
    <>
      <Header>
        <div className='flex w-full items-center justify-between'>
          <div className='flex items-center space-x-3'>
            <div className='rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 p-2'>
              <svg
                className='h-6 w-6 text-white'
                fill='none'
                viewBox='0 0 24 24'
                stroke='currentColor'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z'
                />
              </svg>
            </div>
            <div>
              <h1 className='text-2xl font-bold text-gray-900 dark:text-white'>
                Ghi nhận phiếu lỗi
              </h1>
              <p className='text-sm text-gray-600 dark:text-gray-400'>
                Quản lý và theo dõi các phiếu báo lỗi trong hệ thống
              </p>
            </div>
          </div>
          <div className='flex items-center space-x-3'>
            <Button
              onClick={() => refetch()}
              variant='outline'
              size='sm'
              className='hover:bg-gray-50'
            >
              <RefreshCw className='mr-2 h-4 w-4' />
              Làm mới
            </Button>
            <Button
              size='sm'
              className='bg-blue-600 px-4 py-2 text-white hover:bg-blue-700'
              onClick={() => setShowCreateDialog(true)}
            >
              <Plus className='mr-2 h-4 w-4' />
              Thêm phiếu lỗi mới
            </Button>
          </div>
        </div>
      </Header>

      <Main className='space-y-6'>
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as 'cameras' | 'tickets')}
          className='w-full'
        >
          <TabsList className='grid w-full grid-cols-2'>
            <TabsTrigger value='cameras'>Quản lý Camera</TabsTrigger>
            <TabsTrigger value='tickets'>Danh sách Phiếu lỗi</TabsTrigger>
          </TabsList>

          <TabsContent value='cameras' className='space-y-6'>
            {/* Filters Section */}
            <TicketFilters
              search={search}
              onSearchChange={setSearch}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              ticketStatusFilter={ticketStatusFilter}
              onTicketStatusFilterChange={setTicketStatusFilter}
              reportedOnly={reportedOnly}
              onReportedOnlyChange={setReportedOnly}
            />

            {/* Actions Section */}
            <TicketActions
              selectedCount={selectedCameras.length}
              onQuickReport={handleQuickReport}
              onBulkStatusUpdate={handleBulkStatusUpdate}
              onExportReport={handleExportReport}
            />

            {/* Camera Table */}
            <Card className='shadow-sm'>
              <CardHeader className='border-b border-gray-200 dark:border-gray-700'>
                <div className='flex items-center justify-between'>
                  <div>
                    <CardTitle className='text-lg font-semibold text-gray-900 dark:text-white'>
                      Danh sách Camera
                    </CardTitle>
                    <p className='text-sm text-gray-600 dark:text-gray-400'>
                      Quản lý camera và tạo phiếu lỗi
                    </p>
                  </div>
                  <div className='flex items-center space-x-2'>
                    <span className='text-sm text-gray-500'>
                      {filtered.length} / {cameras.length} camera
                    </span>
                    {selectedCameras.length > 0 && (
                      <span className='rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'>
                        {selectedCameras.length} đã chọn
                      </span>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className='p-0'>
                {isError ? (
                  <div className='flex flex-col items-center justify-center py-12'>
                    <div className='rounded-full bg-red-100 p-3 dark:bg-red-900/20'>
                      <svg
                        className='h-8 w-8 text-red-600 dark:text-red-400'
                        fill='none'
                        viewBox='0 0 24 24'
                        stroke='currentColor'
                      >
                        <path
                          strokeLinecap='round'
                          strokeLinejoin='round'
                          strokeWidth={2}
                          d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.732 6.5c-.77.833.192 2.5 1.732 2.5z'
                        />
                      </svg>
                    </div>
                    <h3 className='mt-4 text-lg font-medium text-gray-900 dark:text-white'>
                      Không thể tải dữ liệu
                    </h3>
                    <p className='mt-2 text-sm text-gray-600 dark:text-gray-400'>
                      Có lỗi xảy ra khi tải danh sách camera
                    </p>
                    <Button onClick={() => refetch()} variant='outline' size='sm' className='mt-4'>
                      <RefreshCw className='mr-2 h-4 w-4' />
                      Thử lại
                    </Button>
                  </div>
                ) : isLoading ? (
                  <div className='flex flex-col items-center justify-center py-12'>
                    <div className='rounded-full bg-blue-100 p-3 dark:bg-blue-900/20'>
                      <svg
                        className='h-8 w-8 animate-spin text-blue-600 dark:text-blue-400'
                        fill='none'
                        viewBox='0 0 24 24'
                        stroke='currentColor'
                      >
                        <path
                          strokeLinecap='round'
                          strokeLinejoin='round'
                          strokeWidth={2}
                          d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15'
                        />
                      </svg>
                    </div>
                    <h3 className='mt-4 text-lg font-medium text-gray-900 dark:text-white'>
                      Đang tải dữ liệu
                    </h3>
                    <p className='mt-2 text-sm text-gray-600 dark:text-gray-400'>
                      Đang tải danh sách camera...
                    </p>
                  </div>
                ) : (
                  <TicketTable
                    cameras={filtered}
                    selectedCameras={selectedCameras}
                    onCameraSelect={handleCheckRow}
                    onSelectAll={handleCheckAll}
                    onViewDetails={(cameraId) => navigate({ to: `/cameras/${cameraId}` })}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value='tickets' className='space-y-6'>
            {/* Ticket Filters */}
            <div className='flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4'>
              <div className='flex-1'>
                <input
                  type='text'
                  placeholder='Tìm kiếm phiếu lỗi...'
                  value={ticketSearch}
                  onChange={(e) => setTicketSearch(e.target.value)}
                  className='w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white'
                />
              </div>
              <select
                value={ticketStatusFilterTab}
                onChange={(e) => setTicketStatusFilterTab(e.target.value)}
                className='rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white'
              >
                <option value='all'>Tất cả trạng thái</option>
                <option value='open'>Mở</option>
                <option value='in_progress'>Đang xử lý</option>
                <option value='resolved'>Đã giải quyết</option>
                <option value='closed'>Đã đóng</option>
              </select>
              <select
                value={ticketTypeFilter}
                onChange={(e) => setTicketTypeFilter(e.target.value)}
                className='rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white'
              >
                <option value='all'>Tất cả loại</option>
                <option value='camera_error'>Lỗi Camera</option>
                <option value='support'>Hỗ trợ</option>
              </select>
              <Button onClick={loadTickets} variant='outline' size='sm'>
                <RefreshCw className='mr-2 h-4 w-4' />
                Làm mới
              </Button>
            </div>

            {/* Tickets Table */}
            <Card className='shadow-sm'>
              <CardHeader className='border-b border-gray-200 dark:border-gray-700'>
                <div className='flex items-center justify-between'>
                  <div>
                    <CardTitle className='text-lg font-semibold text-gray-900 dark:text-white'>
                      Danh sách Phiếu lỗi
                    </CardTitle>
                    <p className='text-sm text-gray-600 dark:text-gray-400'>
                      Quản lý và theo dõi các phiếu báo lỗi
                    </p>
                  </div>
                  <div className='flex items-center space-x-2'>
                    <span className='text-sm text-gray-500'>{tickets.length} phiếu lỗi</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className='p-0'>
                {ticketsLoading ? (
                  <div className='flex flex-col items-center justify-center py-12'>
                    <div className='rounded-full bg-blue-100 p-3 dark:bg-blue-900/20'>
                      <svg
                        className='h-8 w-8 animate-spin text-blue-600 dark:text-blue-400'
                        fill='none'
                        viewBox='0 0 24 24'
                        stroke='currentColor'
                      >
                        <path
                          strokeLinecap='round'
                          strokeLinejoin='round'
                          strokeWidth={2}
                          d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15'
                        />
                      </svg>
                    </div>
                    <h3 className='mt-4 text-lg font-medium text-gray-900 dark:text-white'>
                      Đang tải phiếu lỗi
                    </h3>
                    <p className='mt-2 text-sm text-gray-600 dark:text-gray-400'>
                      Đang tải danh sách phiếu lỗi...
                    </p>
                  </div>
                ) : tickets.length === 0 ? (
                  <div className='flex flex-col items-center justify-center py-12'>
                    <div className='rounded-full bg-gray-100 p-3 dark:bg-gray-900/20'>
                      <svg
                        className='h-8 w-8 text-gray-600 dark:text-gray-400'
                        fill='none'
                        viewBox='0 0 24 24'
                        stroke='currentColor'
                      >
                        <path
                          strokeLinecap='round'
                          strokeLinejoin='round'
                          strokeWidth={2}
                          d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
                        />
                      </svg>
                    </div>
                    <h3 className='mt-4 text-lg font-medium text-gray-900 dark:text-white'>
                      Không có phiếu lỗi nào
                    </h3>
                    <p className='mt-2 text-sm text-gray-600 dark:text-gray-400'>
                      Chưa có phiếu lỗi nào được tạo
                    </p>
                  </div>
                ) : (
                  <div className='overflow-x-auto'>
                    <table className='w-full'>
                      <thead className='border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800'>
                        <tr>
                          <th className='px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400'>
                            ID
                          </th>
                          <th className='px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400'>
                            Loại
                          </th>
                          <th className='px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400'>
                            Tiêu đề
                          </th>
                          <th className='px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400'>
                            Trạng thái
                          </th>
                          <th className='px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400'>
                            Ưu tiên
                          </th>
                          <th className='px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400'>
                            Ngày tạo
                          </th>
                        </tr>
                      </thead>
                      <tbody className='divide-y divide-gray-200 dark:divide-gray-700'>
                        {tickets.map((ticket) => (
                          <tr key={ticket.id} className='hover:bg-gray-50 dark:hover:bg-gray-800'>
                            <td className='px-6 py-4 text-sm whitespace-nowrap text-gray-900 dark:text-white'>
                              {ticket.id.slice(0, 8)}...
                            </td>
                            <td className='px-6 py-4 text-sm whitespace-nowrap text-gray-900 dark:text-white'>
                              <span
                                className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                                  ticket.type === 'camera_error'
                                    ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                                    : 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                                }`}
                              >
                                {ticket.type === 'camera_error' ? 'Lỗi Camera' : 'Hỗ trợ'}
                              </span>
                            </td>
                            <td className='px-6 py-4 text-sm text-gray-900 dark:text-white'>
                              {ticket.title}
                            </td>
                            <td className='px-6 py-4 text-sm whitespace-nowrap'>
                              <span
                                className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                                  ticket.status === 'open'
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                                    : ticket.status === 'in_progress'
                                      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                                      : ticket.status === 'resolved'
                                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                                        : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                                }`}
                              >
                                {ticket.status === 'open'
                                  ? 'Mở'
                                  : ticket.status === 'in_progress'
                                    ? 'Đang xử lý'
                                    : ticket.status === 'resolved'
                                      ? 'Đã giải quyết'
                                      : 'Đã đóng'}
                              </span>
                            </td>
                            <td className='px-6 py-4 text-sm whitespace-nowrap text-gray-900 dark:text-white'>
                              <span
                                className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                                  ticket.priority === 'urgent'
                                    ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                                    : ticket.priority === 'high'
                                      ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400'
                                      : ticket.priority === 'medium'
                                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                                        : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                                }`}
                              >
                                {ticket.priority === 'urgent'
                                  ? 'Khẩn cấp'
                                  : ticket.priority === 'high'
                                    ? 'Cao'
                                    : ticket.priority === 'medium'
                                      ? 'Trung bình'
                                      : 'Thấp'}
                              </span>
                            </td>
                            <td className='px-6 py-4 text-sm whitespace-nowrap text-gray-900 dark:text-white'>
                              {new Date(ticket.created_at).toLocaleDateString('vi-VN')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </Main>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tạo phiếu lỗi mới</DialogTitle>
            <DialogDescription>Tạo phiếu báo lỗi mới cho camera trong hệ thống.</DialogDescription>
          </DialogHeader>
          <div className='space-y-4'>
            <p className='text-muted-foreground text-sm'>
              Chức năng tạo phiếu lỗi mới sẽ được triển khai trong phiên bản tiếp theo.
            </p>
            <div className='flex justify-end gap-2'>
              <Button variant='outline' onClick={() => setShowCreateDialog(false)}>
                Đóng
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default TicketPage;
