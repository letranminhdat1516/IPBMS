/**
 * Plan Actions Configuration
 *
 * Based on available APIs:
 * 1. POST /admin-plans/versions/:id/activate - Activate a specific plan version (admin only)
 * 2. POST /subscriptions - Create free subscription for user
 * 3. POST /subscriptions/:id/upgrade - Upgrade existing subscription
 * 4. POST /subscriptions/:id/reactivate - Reactivate cancelled subscription (admin only)
 *
 * Current implementation:
 * - Only supports version activation via activatePlanVersion()
 * - Plan-level activation should be handled through subscription management
 * - For full plan management, consider integrating with subscription APIs
 */
import { Edit, Eye, Power, PowerOff, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { ColumnDef } from '@tanstack/react-table';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import { formatCurrencyVND } from '@/lib/utils';

import { Plan } from '@/types/plan';

import {
  activatePlan,
  activatePlanVersion,
  deactivatePlan,
  deactivatePlanVersion,
} from '@/services/adminPlan';

import { usePlan } from '../context/plan-context';

export const planColumns: ColumnDef<Plan>[] = [
  {
    accessorKey: 'name',
    header: 'Tên gói',
    cell: (info) => {
      const row = info.row.original;

      return (
        <div className='flex flex-col'>
          <span className='font-semibold'>{row.name}</span>
          {/* {showVersions && row.version && (
            <span className='text-muted-foreground text-xs'>Phiên bản {row.version}</span>
          )} */}
        </div>
      );
    },
    enableSorting: true,
  },
  {
    accessorKey: 'code',
    header: 'Mã gói',
    cell: (info) => (
      <span className='text-muted-foreground font-mono text-xs'>
        {String(info.getValue() ?? '-')}
      </span>
    ),
    enableSorting: true,
  },
  {
    accessorKey: 'price',
    header: 'Giá (VND)',
    cell: (info) => {
      const raw = info.getValue();
      // Accept number or string (backend sometimes returns string)
      const value = raw === undefined || raw === null ? null : String(raw);
      return value ? (
        <span className='block pr-8 text-right font-semibold'>{formatCurrencyVND(value)}</span>
      ) : (
        <span className='text-muted-foreground'>-</span>
      );
    },
    meta: { className: 'text-center' },
    enableSorting: true,
  },
  {
    accessorKey: 'version',
    header: () => <span className='hidden md:table-cell'>Phiên bản</span>,
    cell: (info) => {
      const version = info.getValue() as string; // Changed from number to string
      const row = info.row.original;
      return (
        <div className='hidden flex-col gap-1 md:flex'>
          {version ? (
            <div className='flex items-center gap-2'>
              <Badge variant='outline' className='w-fit text-xs'>
                {version}
              </Badge>
              {/* {row.is_current && (
                <Badge variant='default' className='w-fit bg-green-100 text-xs text-green-800'>
                  Đang hoạt động
                </Badge>
              )} */}
            </div>
          ) : (
            <span className='text-muted-foreground'>Không xác định</span>
          )}
          {row.effective_from && typeof row.effective_from === 'string' ? (
            <span className='text-muted-foreground text-xs'>
              Từ:{' '}
              {(() => {
                const date = new Date(row.effective_from);
                return !isNaN(date.getTime()) ? date.toLocaleDateString('vi-VN') : 'Không xác định';
              })()}
            </span>
          ) : (
            <span className='text-muted-foreground text-xs'>Từ: -</span>
          )}
          {row.effective_to && typeof row.effective_to === 'string' ? (
            <span className='text-muted-foreground text-xs'>
              Đến:{' '}
              {(() => {
                const date = new Date(row.effective_to);
                return !isNaN(date.getTime()) ? date.toLocaleDateString('vi-VN') : 'Không xác định';
              })()}
            </span>
          ) : (
            <span className='text-muted-foreground text-xs'>Đến: -</span>
          )}
        </div>
      );
    },
    enableSorting: true,
  },
  {
    accessorKey: 'is_current',
    header: 'Trạng thái',
    cell: (info) => {
      const isCurrent = info.getValue() as boolean;
      const row = info.row.original;
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const { showVersions } = usePlan();
      const isVersionRow = showVersions;

      // Kiểm tra plan có đang active dựa trên logic database
      // const now = new Date();
      // const effectiveFrom = row.effective_from ? new Date(row.effective_from) : null;
      // const effectiveTo = row.effective_to ? new Date(row.effective_to) : null;

      // const isPlanActive =
      //   isCurrent &&
      //   row.status === 'available' &&
      //   (!effectiveFrom || effectiveFrom <= now) &&
      //   (!effectiveTo || effectiveTo > now);

      return (
        <div className='flex flex-col gap-1'>
          {/* Trạng thái cho version */}
          {/* {isVersionRow && (
            <div>
              {isCurrent ? (
                <Badge variant='default' className='w-fit bg-green-500 text-xs'>
                  Phiên bản hiện tại
                </Badge>
              ) : (
                <Badge variant='secondary' className='w-fit text-xs'>
                  Phiên bản cũ
                </Badge>
              )}
            </div>
          )} */}

          {/* Trạng thái cho plan - logic database */}
          {/* {!isVersionRow && ( */}
          <div className='flex flex-col gap-1'>
            {/* Trạng thái kích hoạt admin (is_current) */}
            {isCurrent ? (
              <Badge variant='default' className='w-fit bg-green-100 text-xs text-green-800'>
                Đã kích hoạt
              </Badge>
            ) : (
              <Badge variant='default' className='w-fit bg-gray-400 text-xs'>
                Chưa kích hoạt
              </Badge>
            )}

            {/* Trạng thái hoạt động thực tế (logic kết hợp) */}
            {/* {isPlanActive ? (
                <Badge variant='default' className='w-fit bg-green-500 text-xs'>
                  🟢 ĐANG HOẠT ĐỘNG
                </Badge>
              ) : (
                <Badge variant='secondary' className='w-fit bg-red-400 text-xs'>
                  🔴 KHÔNG HOẠT ĐỘNG
                </Badge>
              )} */}

            {/* Thông tin thời gian hiệu lực */}
            {/* {effectiveFrom && effectiveFrom > now && (
                <Badge
                  variant='outline'
                  className='w-fit border-yellow-400 text-xs text-yellow-600'
                >
                  🔮 Plan tương lai
                </Badge>
              )}

              {effectiveTo && effectiveTo <= now && (
                <Badge variant='outline' className='w-fit border-red-400 text-xs text-red-600'>
                  ⏰ Đã hết hạn
                </Badge>
              )} */}
          </div>
          {/* )} */}

          {/* Thông tin bổ sung cho version rows */}
          {isVersionRow && row.is_active !== undefined && (
            <span className={`text-xs ${row.is_active ? 'text-green-600' : 'text-red-600'}`}>
              Gói: {row.is_active ? 'Hoạt động' : 'Vô hiệu'}
            </span>
          )}
        </div>
      );
    },
    enableSorting: true,
  },
  {
    id: 'actions',
    header: () => <span>Hành động</span>,
    cell: ({ row }) => {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const { setOpen, setCurrentRow, showVersions, refetch } = usePlan();

      const handleEdit = () => {
        // Đối với hàng phiên bản, chúng ta cần xử lý chỉnh sửa phiên bản khác nhau
        const isVersionRow = showVersions;
        if (isVersionRow && row.original.id) {
          // Đây là hàng phiên bản, mở dialog chỉnh sửa phiên bản
          setCurrentRow({
            ...row.original,
            // Trích xuất mã gói gốc từ mã phiên bản
            code: row.original.code?.replace(/_v[\d.]+$/, ''),
          });
          setOpen('edit');
        } else {
          // Đây là hàng gói thông thường
          setCurrentRow(row.original);
          setOpen('edit');
        }
      };

      const handleDelete = () => {
        const isVersionRow = showVersions;
        if (isVersionRow) {
          // Đối với hàng phiên bản, chúng ta có thể muốn xóa phiên bản thay vì gói
          // Hiện tại, chúng ta sẽ hiển thị xác nhận
          if (window.confirm('Bạn có chắc muốn xóa phiên bản này?')) {
            setCurrentRow(row.original);
            setOpen('delete');
          }
        } else {
          setCurrentRow(row.original);
          setOpen('delete');
        }
      };

      const handleActivatePlan = async () => {
        try {
          const versionId = row.original.id;
          const hasVersion = Boolean(row.original.version);

          if (hasVersion && versionId) {
            await activatePlanVersion(versionId);
            toast.success('Đã kích hoạt phiên bản thành công');
            refetch?.();
            return;
          }

          if (row.original.code) {
            await activatePlan(row.original.code);
            toast.success('Đã kích hoạt gói dịch vụ thành công');
            refetch?.();
          } else {
            toast.error('Không tìm thấy mã gói dịch vụ');
          }
        } catch (_error) {
          toast.error('Có lỗi xảy ra khi kích hoạt phiên bản kế hoạch');
        }
      };

      const handleDeactivatePlan = async () => {
        try {
          const versionId = row.original.id;
          const hasVersion = Boolean(row.original.version);

          if (showVersions && hasVersion && versionId) {
            await deactivatePlanVersion(versionId);
            toast.success('Đã vô hiệu hóa phiên bản thành công');
            refetch?.();
            return;
          }

          if (row.original.code) {
            await deactivatePlan(row.original.code);
            toast.success('Đã tắt kích hoạt gói dịch vụ thành công');
            refetch?.();
          } else {
            toast.error('Không tìm thấy mã gói dịch vụ');
          }
        } catch (_error) {
          toast.error('Có lỗi xảy ra khi tắt kích hoạt gói dịch vụ');
        }
      };

      const handleViewDetails = () => {
        // Chuyển hướng đến trang detail thay vì mở dialog
        window.location.href = `/plan/${row.original.code}`;
      };

      const isCurrentVersion = row.original.is_current;

      return (
        <div className='flex gap-1'>
          {/* Edit button */}
          <Button
            variant='ghost'
            size='icon'
            onClick={handleEdit}
            className='h-8 w-8 hover:bg-blue-50 hover:text-blue-600'
            title='Chỉnh sửa'
          >
            <Edit className='h-4 w-4' />
          </Button>

          {/* View details button */}
          <Button
            variant='ghost'
            size='icon'
            onClick={handleViewDetails}
            className='h-8 w-8 hover:bg-gray-50 hover:text-gray-600'
            title='Xem chi tiết'
          >
            <Eye className='h-4 w-4' />
          </Button>

          {/* Actions cho version rows (khi showVersions = true) */}
          {showVersions &&
            (isCurrentVersion ? (
              <Button
                variant='ghost'
                size='icon'
                onClick={handleDeactivatePlan}
                className='h-8 w-8 hover:bg-orange-50 hover:text-orange-600'
                title='Vô hiệu hóa phiên bản'
              >
                <PowerOff className='h-4 w-4' />
              </Button>
            ) : (
              <Button
                variant='ghost'
                size='icon'
                onClick={handleActivatePlan}
                className='h-8 w-8 hover:bg-green-50 hover:text-green-600'
                title='Kích hoạt phiên bản'
              >
                <Power className='h-4 w-4' />
              </Button>
            ))}

          {/* Actions cho plan rows (khi showVersions = false) */}
          {!showVersions && (
            <>
              {/* Logic dựa trên database: is_current là biến chính */}
              {row.original.is_current ? (
                <Button
                  variant='ghost'
                  size='icon'
                  onClick={handleDeactivatePlan}
                  className='h-8 w-8 hover:bg-orange-50 hover:text-orange-600'
                  title='Tắt kích hoạt'
                >
                  <PowerOff className='h-4 w-4' />
                </Button>
              ) : (
                <Button
                  variant='ghost'
                  size='icon'
                  onClick={handleActivatePlan}
                  className='h-8 w-8 hover:bg-green-50 hover:text-green-600'
                  title='Kích hoạt'
                >
                  <Power className='h-4 w-4' />
                </Button>
              )}
            </>
          )}

          {/* Delete button */}
          <Button
            variant='ghost'
            size='icon'
            onClick={handleDelete}
            className='h-8 w-8 hover:bg-red-50 hover:text-red-600'
            title='Xóa'
          >
            <Trash2 className='h-4 w-4' />
          </Button>
        </div>
      );
    },
    meta: { className: 'w-48' },
    enableSorting: false,
  },
];
