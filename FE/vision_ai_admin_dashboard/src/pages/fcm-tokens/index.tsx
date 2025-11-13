import React from 'react';

import { useQuery } from '@tanstack/react-query';

import { fetchAdminFcmTokenStats, fetchAdminFcmTokens } from '@/services/fcmTokens';

import { FcmTokensActionDialog } from './components/fcm-tokens-action-dialog';
import { fcmTokenColumns } from './components/fcm-tokens-columns';
import { FcmTokensDeleteDialog } from './components/fcm-tokens-delete-dialog';
import { FCMTokensPrimaryButtons } from './components/fcm-tokens-primary-buttons';
import { FcmTokensTable } from './components/fcm-tokens-table';
import { FcmTokensProvider, useFcmTokensContext } from './context/fcm-tokens-context';

const FcmTokensContent: React.FC = () => {
  const { open, setOpen, currentRow, setCurrentRow, deleteTokenIds, setDeleteTokenIds } =
    useFcmTokensContext();

  const {
    data: tokensResponse,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['fcm-tokens'],
    queryFn: () => fetchAdminFcmTokens({}),
  });

  const { data: stats } = useQuery({
    queryKey: ['fcm-tokens-stats'],
    queryFn: () => fetchAdminFcmTokenStats(),
  });

  const tokens = tokensResponse?.data || [];

  return (
    <div className='flex flex-1 flex-col space-y-4 p-4 pt-6 md:p-8'>
      <div className='flex items-center justify-between space-y-2'>
        <div>
          <h2 className='text-2xl font-bold tracking-tight'>Token FCM</h2>
          <p className='text-muted-foreground'>Quản lý các FCM tokens cho gửi thông báo push.</p>
        </div>
        <div className='flex items-center space-x-2'>
          <FCMTokensPrimaryButtons />
        </div>
      </div>

      {stats && stats.typeStats && (
        <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
          <div className='rounded-lg border p-4'>
            <div className='text-muted-foreground text-sm font-medium'>Tổng số Token</div>
            <div className='text-2xl font-bold'>
              {stats.typeStats.reduce((sum, stat) => sum + stat.count, 0)}
            </div>
          </div>
          {stats.typeStats.map((stat) => (
            <div key={stat.type} className='rounded-lg border p-4'>
              <div className='text-muted-foreground text-sm font-medium capitalize'>
                Token {stat.type}
              </div>
              <div className='text-2xl font-bold'>{stat.count}</div>
            </div>
          ))}
        </div>
      )}

      <div className='flex-1'>
        {isLoading ? (
          <div className='flex h-32 items-center justify-center'>
            <div className='text-muted-foreground'>Đang tải...</div>
          </div>
        ) : error ? (
          <div className='flex h-32 items-center justify-center'>
            <div className='text-red-600'>Có lỗi xảy ra khi tải dữ liệu</div>
          </div>
        ) : (
          <FcmTokensTable
            columns={fcmTokenColumns}
            data={tokens}
            onRowClick={(token) => {
              setCurrentRow(token);
              setOpen('edit');
            }}
          />
        )}
      </div>

      <FcmTokensActionDialog
        currentRow={currentRow || undefined}
        open={open === 'edit' || open === 'add'}
        onOpenChange={(state) => {
          if (!state) {
            setOpen(null);
            setCurrentRow(null);
          }
        }}
      />

      <FcmTokensDeleteDialog
        open={open === 'delete'}
        onOpenChange={(state) => {
          if (!state) {
            setOpen(null);
            setDeleteTokenIds([]);
          }
        }}
        tokenIds={deleteTokenIds}
        onSuccess={() => {
          setDeleteTokenIds([]);
        }}
      />
    </div>
  );
};

const FcmTokenAdminPage: React.FC = () => {
  return (
    <FcmTokensProvider>
      <FcmTokensContent />
    </FcmTokensProvider>
  );
};

export default FcmTokenAdminPage;
