import { ArrowUpDown, ChevronDown, ChevronUp } from 'lucide-react';

import { useState } from 'react';

import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import type { Camera } from '@/types/camera';

import { CameraTableRow } from './table/CameraTableRow';

interface CameraTableProps {
  cameras: Camera[];
  selectedCameras: string[];
  onCameraSelect: (cameraId: string, selected: boolean) => void;
  onSelectAll: (selected: boolean) => void;
  onViewDetails: (cameraId: string) => void;
}

export function TicketTable({
  cameras,
  selectedCameras,
  onCameraSelect,
  onSelectAll,
  onViewDetails,
}: CameraTableProps) {
  const [sortField, setSortField] = useState<string>('camera_code');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedCameras = [...cameras].sort((a, b) => {
    const aValue = a[sortField as keyof Camera];
    const bValue = b[sortField as keyof Camera];

    if (aValue == null && bValue == null) return 0;
    if (aValue == null) return sortDirection === 'asc' ? -1 : 1;
    if (bValue == null) return sortDirection === 'asc' ? 1 : -1;

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) {
      return <ArrowUpDown className='ml-2 h-4 w-4 text-gray-400' />;
    }
    return sortDirection === 'asc' ? (
      <ChevronUp className='ml-2 h-4 w-4 text-blue-600' />
    ) : (
      <ChevronDown className='ml-2 h-4 w-4 text-blue-600' />
    );
  };

  const allSelected = cameras.length > 0 && selectedCameras.length === cameras.length;

  if (cameras.length === 0) {
    return (
      <div className='flex flex-col items-center justify-center py-12'>
        <div className='rounded-full bg-gray-100 p-3 dark:bg-gray-800'>
          <svg
            className='h-8 w-8 text-gray-400'
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
        <h3 className='mt-4 text-lg font-medium text-gray-900 dark:text-white'>
          Không có phiếu lỗi nào
        </h3>
        <p className='mt-2 text-sm text-gray-600 dark:text-gray-400'>
          Không tìm thấy phiếu lỗi nào phù hợp với tiêu chí lọc
        </p>
      </div>
    );
  }

  return (
    <div className='overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'>
      <Table>
        <TableHeader>
          <TableRow className='border-b border-gray-200 bg-gray-50 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50 dark:hover:bg-gray-800/50'>
            <TableHead className='w-12 py-4'>
              <Checkbox
                checked={allSelected}
                onCheckedChange={(checked) => onSelectAll(checked as boolean)}
                className='data-[state=checked]:border-blue-600 data-[state=checked]:bg-blue-600'
              />
            </TableHead>
            <TableHead
              className='cursor-pointer py-4 font-semibold text-gray-900 transition-colors select-none hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700'
              onClick={() => handleSort('camera_code')}
            >
              <div className='flex items-center'>
                Mã phiếu lỗi
                <SortIcon field='camera_code' />
              </div>
            </TableHead>
            <TableHead
              className='cursor-pointer py-4 font-semibold text-gray-900 transition-colors select-none hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700'
              onClick={() => handleSort('location')}
            >
              <div className='flex items-center'>
                Mô tả lỗi
                <SortIcon field='location' />
              </div>
            </TableHead>
            <TableHead
              className='cursor-pointer py-4 font-semibold text-gray-900 transition-colors select-none hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700'
              onClick={() => handleSort('type')}
            >
              <div className='flex items-center'>
                Người báo
                <SortIcon field='type' />
              </div>
            </TableHead>
            <TableHead
              className='cursor-pointer py-4 font-semibold text-gray-900 transition-colors select-none hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700'
              onClick={() => handleSort('status')}
            >
              <div className='flex items-center'>
                Trạng thái
                <SortIcon field='status' />
              </div>
            </TableHead>
            <TableHead
              className='cursor-pointer py-4 font-semibold text-gray-900 transition-colors select-none hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700'
              onClick={() => handleSort('ticket_status')}
            >
              <div className='flex items-center'>
                Độ ưu tiên
                <SortIcon field='ticket_status' />
              </div>
            </TableHead>
            <TableHead className='py-4 font-semibold text-gray-900 dark:text-white'>
              Hành động
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedCameras.map((camera) => (
            <CameraTableRow
              key={camera.camera_id}
              cam={camera}
              checked={selectedCameras.includes(camera.camera_id.toString())}
              onCheck={() =>
                onCameraSelect(
                  camera.camera_id.toString(),
                  !selectedCameras.includes(camera.camera_id.toString())
                )
              }
              onCodeClick={() => onViewDetails(camera.camera_id.toString())}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
