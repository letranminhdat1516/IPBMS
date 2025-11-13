import { useQuery } from '@tanstack/react-query';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

import { getReportRequestsSummary } from '@/services/dashboard';

export default function ReportRequestCustomer({ from, to }: { from: string; to: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-report-requests-summary', from, to],
    queryFn: () => getReportRequestsSummary({ from, to }),
  });
  const rootCandidate = data as unknown;
  const root =
    rootCandidate &&
    typeof rootCandidate === 'object' &&
    'data' in (rootCandidate as Record<string, unknown>)
      ? ((rootCandidate as Record<string, unknown>).data as Record<string, unknown>)
      : (rootCandidate as Record<string, unknown> | undefined);

  const reportsObj = root?.reports as Record<string, unknown> | undefined;
  const supportsObj = root?.supports as Record<string, unknown> | undefined;

  const reportsTotal = (reportsObj?.total as number) ?? 0;
  const reportsAcceptedRate =
    (reportsObj?.acceptedRate as number) ?? (reportsObj?.accepted_rate as number) ?? 0;
  const reportsByStatus = (reportsObj?.by_status as Record<string, number>) ?? {};
  const reportsAccepted = reportsByStatus.accepted ?? 0;

  const supportsTotal = (supportsObj?.total as number) ?? 0;
  const supportsProcessingRate =
    (supportsObj?.processingRate as number) ?? (supportsObj?.processing_rate as number) ?? 0;
  const supportsByStatus = (supportsObj?.by_status as Record<string, number>) ?? {};
  const supportsProcessing = supportsByStatus.processing ?? 0;

  const rangeObj = root?.range as Record<string, string> | undefined;
  const rangeFrom = rangeObj?.from ?? '';
  const rangeTo = rangeObj?.to ?? '';
  const timestamp = ((data as Record<string, unknown>)?.timestamp as string) ?? '';

  const paginationObj = (data as Record<string, unknown>)?.pagination as
    | Record<string, unknown>
    | undefined;
  const paginationTotal = (paginationObj?.total as number) ?? 0;
  const paginationPage = (paginationObj?.page as number) ?? 1;
  const paginationLimit = (paginationObj?.limit as number) ?? 0;
  const paginationTotalPages = (paginationObj?.totalPages as number) ?? 1;

  const statusLabels: Record<string, string> = {
    pending: 'Chờ xử lý',
    accepted: 'Đã chấp nhận',
    rejected: 'Từ chối',
    processing: 'Đang xử lý',
    completed: 'Hoàn thành',
  };

  const statusIcons: Record<string, string> = {
    pending: '⏳',
    accepted: '✅',
    rejected: '❌',
    processing: '🔄',
    completed: '✅',
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className='flex items-center gap-2'>
          <span title='Báo cáo & Yêu cầu khách hàng'>📑</span> Báo cáo & Yêu cầu khách hàng
        </CardTitle>
        <CardDescription>
          Tổng quan xử lý phản hồi và yêu cầu từ khách hàng.
          {!isLoading && rangeFrom && rangeTo && (
            <span className='mt-1 block text-xs'>
              Từ {rangeFrom} đến {rangeTo}
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className='grid gap-6 sm:grid-cols-2'>
        <div className='space-y-3'>
          <div className='flex items-center justify-between'>
            <span className='text-muted-foreground text-sm'>Báo cáo mới</span>
            <Badge variant='secondary'>{isLoading ? '…' : reportsTotal}</Badge>
          </div>
          <Progress
            value={reportsAcceptedRate}
            className={`h-2 ${
              reportsAcceptedRate < 50
                ? '[&>div]:bg-red-500'
                : reportsAcceptedRate <= 80
                  ? '[&>div]:bg-amber-500'
                  : '[&>div]:bg-green-500'
            }`}
          />
          <p className='text-muted-foreground text-xs'>
            {isLoading
              ? 'Đang tải…'
              : `${reportsAcceptedRate}% đã được tiếp nhận (${reportsAccepted}/${reportsTotal})`}
          </p>
          {!isLoading && Object.keys(reportsByStatus).length > 0 && (
            <div className='flex flex-wrap gap-1'>
              {Object.entries(reportsByStatus).map(([status, count]) => (
                <Badge key={status} variant='outline' className='text-xs'>
                  {statusIcons[status] || ''} {statusLabels[status] || status}: {count}
                </Badge>
              ))}
            </div>
          )}
        </div>
        <div className='space-y-3'>
          <div className='flex items-center justify-between'>
            <span className='text-muted-foreground text-sm'>Yêu cầu hỗ trợ</span>
            <Badge variant='secondary'>{isLoading ? '…' : supportsTotal}</Badge>
          </div>
          <Progress
            value={supportsProcessingRate}
            className={`h-2 ${
              supportsProcessingRate < 50
                ? '[&>div]:bg-red-500'
                : supportsProcessingRate <= 80
                  ? '[&>div]:bg-amber-500'
                  : '[&>div]:bg-green-500'
            }`}
          />
          <p className='text-muted-foreground text-xs'>
            {isLoading
              ? 'Đang tải…'
              : `${supportsProcessingRate}% đang xử lý (${supportsProcessing}/${supportsTotal})`}
          </p>
          {!isLoading && Object.keys(supportsByStatus).length > 0 && (
            <div className='flex flex-wrap gap-1'>
              {Object.entries(supportsByStatus).map(([status, count]) => (
                <Badge key={status} variant='outline' className='text-xs'>
                  {statusIcons[status] || ''} {statusLabels[status] || status}: {count}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </CardContent>
      {!isLoading && paginationTotal > 0 && (
        <div className='border-t px-6 py-3'>
          <div className='text-muted-foreground flex items-center justify-between text-xs'>
            <div>
              Hiển thị {Math.min((paginationPage - 1) * paginationLimit + 1, paginationTotal)} -{' '}
              {Math.min(paginationPage * paginationLimit, paginationTotal)} / {paginationTotal} kết
              quả
            </div>
            <div>
              Trang {paginationPage} / {paginationTotalPages}
            </div>
          </div>
        </div>
      )}
      {!isLoading && timestamp && (
        <div className='px-6 pb-4'>
          <p className='text-muted-foreground text-xs'>
            Cập nhật lần cuối: {new Date(timestamp).toLocaleString('vi-VN')}
          </p>
        </div>
      )}
    </Card>
  );
}
