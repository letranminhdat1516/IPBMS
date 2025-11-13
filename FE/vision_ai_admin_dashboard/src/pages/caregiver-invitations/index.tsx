import { CheckCircle, Clock, Plus, Users, XCircle } from 'lucide-react';

import { useState } from 'react';

import { Header } from '@/components/layout/header';
import { Main } from '@/components/layout/main';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

import { ConfirmDialog } from '@/components/confirm-dialog';
import { ProfileDropdown } from '@/components/profile-dropdown';
import { Search } from '@/components/search';
import { ThemeSwitch } from '@/components/theme-switch';

import {
  CaregiverInvitation,
  useCaregiverInvitationStats,
  useCaregiverInvitationsEnriched,
  useDeleteCaregiverInvitation,
} from '@/services/caregiver-invitations';

import { columns } from './components/caregiver-invitations-columns';
import { CaregiverInvitationsTable } from './components/caregiver-invitations-table';
import { CreateAssignmentDialog } from './components/create-assignment-dialog';
import { EditAssignmentDialog } from './components/edit-assignment-dialog';

export default function AssignmentsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, _setPage] = useState(1);
  const [currentRow, setCurrentRow] = useState<CaregiverInvitation | null>(null);
  const [open, setOpen] = useState<string>('');

  const limit = 10;

  // Build query parameters
  const queryParams = {
    page,
    limit,
    search: search.trim() || undefined,
    is_active: statusFilter === 'active' ? true : statusFilter === 'inactive' ? false : undefined,
  };

  const { data: caregiverInvitations, isLoading: isInvitationsLoading } =
    useCaregiverInvitationsEnriched(queryParams);
  const { data: stats, isLoading: isStatsLoading } = useCaregiverInvitationStats();
  const deleteCaregiverInvitationMutation = useDeleteCaregiverInvitation();

  const handleDeleteCaregiverInvitation = async (caregiverInvitation: CaregiverInvitation) => {
    try {
      await deleteCaregiverInvitationMutation.mutateAsync(caregiverInvitation.assignment_id);
      setOpen('');
    } catch (_error) {
      // Error is handled by the mutation hook
    }
  };

  const renderStatsCards = () => {
    if (isStatsLoading) {
      return Array.from({ length: 4 }).map((_, index) => (
        <Card key={index}>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <Skeleton className='h-4 w-20' />
            <Skeleton className='h-4 w-4' />
          </CardHeader>
          <CardContent>
            <Skeleton className='mb-1 h-8 w-16' />
            <Skeleton className='h-3 w-24' />
          </CardContent>
        </Card>
      ));
    }

    const statsCards = [
      {
        title: 'Tổng phân công',
        value: stats?.total_caregiver_invitations || 0,
        icon: Users,
        description: 'Tổng số phân công',
      },
      {
        title: 'Đang hoạt động',
        value: stats?.active_caregiver_invitations || 0,
        icon: CheckCircle,
        description: 'Phân công đang hoạt động',
      },
      {
        title: 'Chờ xử lý',
        value: stats?.pending_caregiver_invitations || 0,
        icon: Clock,
        description: 'Phân công chờ xử lý',
      },
      {
        title: 'Đã chấp nhận',
        value: stats?.accepted_caregiver_invitations || 0,
        icon: CheckCircle,
        description: 'Phân công đã chấp nhận',
      },
      {
        title: 'Bị từ chối',
        value: stats?.rejected_caregiver_invitations || 0,
        icon: XCircle,
        description: 'Phân công bị từ chối',
      },
    ];

    return statsCards.map((card, index) => (
      <Card key={index}>
        <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
          <CardTitle className='text-sm font-medium'>{card.title}</CardTitle>
          <card.icon className='text-muted-foreground h-4 w-4' />
        </CardHeader>
        <CardContent>
          <div className='text-2xl font-bold'>{card.value.toLocaleString()}</div>
          <p className='text-muted-foreground text-xs'>{card.description}</p>
        </CardContent>
      </Card>
    ));
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
        <div className='space-y-6'>
          {/* Header */}
          <div className='flex items-center justify-between'>
            <div>
              <h1 className='text-3xl font-bold tracking-tight'>Quản lý phân công</h1>
              <p className='text-muted-foreground'>
                Quản lý phân công giữa người chăm sóc và bệnh nhân
              </p>
            </div>
            <Button onClick={() => setOpen('create')}>
              <Plus className='mr-2 h-4 w-4' />
              Tạo phân công
            </Button>
          </div>

          {/* Stats Cards */}
          <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>{renderStatsCards()}</div>

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Danh sách phân công</CardTitle>
              <CardDescription>
                Quản lý và theo dõi tất cả các phân công trong hệ thống
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className='mb-6 flex items-center gap-4'>
                <Input
                  placeholder='Tìm kiếm theo tên người chăm sóc hoặc bệnh nhân...'
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className='max-w-sm'
                />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className='w-[180px]'>
                    <SelectValue placeholder='Trạng thái' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='all'>Tất cả</SelectItem>
                    <SelectItem value='active'>Hoạt động</SelectItem>
                    <SelectItem value='inactive'>Không hoạt động</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Hiển thị bảng phân công với filter */}
              <div className='-mx-4 flex-1 overflow-auto px-4 py-1 lg:flex-row lg:space-y-0 lg:space-x-12'>
                <div className='bg-card text-card-foreground rounded-xl border p-2 shadow-sm'>
                  {isInvitationsLoading ? (
                    <div className='text-muted-foreground p-6 text-center text-sm'>
                      Đang tải danh sách phân công…
                    </div>
                  ) : (
                    <CaregiverInvitationsTable
                      columns={columns}
                      data={caregiverInvitations || []}
                      setCurrentRow={setCurrentRow}
                      setOpen={setOpen}
                    />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dialogs */}
          <CreateAssignmentDialog
            open={open === 'create'}
            onOpenChange={(isOpen) => setOpen(isOpen ? 'create' : '')}
          />

          {currentRow && (
            <EditAssignmentDialog
              assignment={currentRow}
              open={open === 'edit'}
              onOpenChange={(isOpen) => {
                setOpen(isOpen ? 'edit' : '');
                if (!isOpen) setCurrentRow(null);
              }}
            />
          )}

          <ConfirmDialog
            open={open === 'delete'}
            onOpenChange={(isOpen) => {
              setOpen(isOpen ? 'delete' : '');
              if (!isOpen) setCurrentRow(null);
            }}
            title='Xóa phân công'
            desc={`Bạn có chắc chắn muốn xóa phân công này? Hành động này không thể hoàn tác.`}
            handleConfirm={() => currentRow && handleDeleteCaregiverInvitation(currentRow)}
            isLoading={deleteCaregiverInvitationMutation.isPending}
          />
        </div>
      </Main>
    </>
  );
}
