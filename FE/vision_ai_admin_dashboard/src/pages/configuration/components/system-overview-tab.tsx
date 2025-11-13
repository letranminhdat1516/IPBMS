import { Activity, Clock, Database, MemoryStick, Server, Shield } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';

import { useSystemInfo } from '@/services/system';

const formatUptime = (seconds: number) => {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${days}d ${hours}h ${minutes}m`;
};

export function SystemOverviewTab() {
  const { data: systemInfo, isLoading } = useSystemInfo();

  if (isLoading) {
    return (
      <div className='space-y-6'>
        <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <Skeleton className='h-4 w-20' />
                <Skeleton className='h-4 w-4' />
              </CardHeader>
              <CardContent>
                <Skeleton className='mb-1 h-8 w-16' />
                <Skeleton className='h-3 w-24' />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!systemInfo) {
    return (
      <div className='text-muted-foreground text-center'>Không thể tải thông tin hệ thống</div>
    );
  }

  return (
    <div className='space-y-6'>
      {/* System Stats Cards */}
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Phiên bản Node.js</CardTitle>
            <Server className='text-muted-foreground h-4 w-4' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{systemInfo.process?.version || 'N/A'}</div>
            <p className='text-muted-foreground text-xs'>
              Platform: {systemInfo.system?.platform || 'N/A'} {systemInfo.system?.arch || ''}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Thời gian hoạt động</CardTitle>
            <Clock className='text-muted-foreground h-4 w-4' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{formatUptime(systemInfo.system?.uptime || 0)}</div>
            <p className='text-muted-foreground text-xs'>Hệ thống hoạt động</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Process ID</CardTitle>
            <Activity className='text-muted-foreground h-4 w-4' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{systemInfo.process?.pid || 'N/A'}</div>
            <p className='text-muted-foreground text-xs'>
              Process uptime: {formatUptime(systemInfo.process?.uptime || 0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>CPU Cores</CardTitle>
            <Shield className='text-muted-foreground h-4 w-4' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{systemInfo.system?.cpus || 'N/A'}</div>
            <p className='text-muted-foreground text-xs'>CPU cores available</p>
          </CardContent>
        </Card>
      </div>

      {/* System Resources */}
      <div className='grid gap-4 md:grid-cols-2'>
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <MemoryStick className='h-5 w-5' />
              Bộ nhớ hệ thống
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='flex justify-between text-sm'>
              <span>Tổng RAM</span>
              <span>
                {systemInfo.system?.totalmem
                  ? (systemInfo.system.totalmem / 1024 / 1024 / 1024).toFixed(1)
                  : 'N/A'}{' '}
                GB
              </span>
            </div>
            <div className='flex justify-between text-sm'>
              <span>RAM trống</span>
              <span>
                {systemInfo.system?.freemem
                  ? (systemInfo.system.freemem / 1024 / 1024 / 1024).toFixed(1)
                  : 'N/A'}{' '}
                GB
              </span>
            </div>
            <div className='flex justify-between text-sm'>
              <span>RAM đã dùng</span>
              <span>
                {systemInfo.system?.totalmem && systemInfo.system?.freemem
                  ? (
                      (systemInfo.system.totalmem - systemInfo.system.freemem) /
                      1024 /
                      1024 /
                      1024
                    ).toFixed(1)
                  : 'N/A'}{' '}
                GB
              </span>
            </div>
            <Progress
              value={
                systemInfo.system?.totalmem && systemInfo.system?.freemem
                  ? ((systemInfo.system.totalmem - systemInfo.system.freemem) /
                      systemInfo.system.totalmem) *
                    100
                  : 0
              }
              className='h-2'
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Activity className='h-5 w-5' />
              Tải hệ thống
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='flex justify-between text-sm'>
              <span>Load Average (1m)</span>
              <span>{systemInfo.system?.loadavg?.[0]?.toFixed(2) || 'N/A'}</span>
            </div>
            <div className='flex justify-between text-sm'>
              <span>Load Average (5m)</span>
              <span>{systemInfo.system?.loadavg?.[1]?.toFixed(2) || 'N/A'}</span>
            </div>
            <div className='flex justify-between text-sm'>
              <span>Load Average (15m)</span>
              <span>{systemInfo.system?.loadavg?.[2]?.toFixed(2) || 'N/A'}</span>
            </div>
            <div className='flex justify-between text-sm'>
              <span>Hostname</span>
              <span className='truncate'>{systemInfo.system?.hostname || 'N/A'}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Process Memory */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Database className='h-5 w-5' />
            Bộ nhớ Process
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='grid gap-4 md:grid-cols-3'>
            <div className='flex justify-between text-sm'>
              <span>RSS</span>
              <span>
                {systemInfo.process?.memory?.rss
                  ? (systemInfo.process.memory.rss / 1024 / 1024).toFixed(1)
                  : 'N/A'}{' '}
                MB
              </span>
            </div>
            <div className='flex justify-between text-sm'>
              <span>Heap Total</span>
              <span>
                {systemInfo.process?.memory?.heapTotal
                  ? (systemInfo.process.memory.heapTotal / 1024 / 1024).toFixed(1)
                  : 'N/A'}{' '}
                MB
              </span>
            </div>
            <div className='flex justify-between text-sm'>
              <span>Heap Used</span>
              <span>
                {systemInfo.process?.memory?.heapUsed
                  ? (systemInfo.process.memory.heapUsed / 1024 / 1024).toFixed(1)
                  : 'N/A'}{' '}
                MB
              </span>
            </div>
          </div>
          <Progress
            value={
              systemInfo.process?.memory?.heapTotal && systemInfo.process?.memory?.heapUsed
                ? (systemInfo.process.memory.heapUsed / systemInfo.process.memory.heapTotal) * 100
                : 0
            }
            className='h-2'
          />
        </CardContent>
      </Card>

      {/* Environment Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Shield className='h-5 w-5' />
            Cấu hình môi trường
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='grid gap-4 md:grid-cols-3'>
            <div className='flex justify-between text-sm'>
              <span>Port</span>
              <span>{systemInfo.environment?.port || 'N/A'}</span>
            </div>
            <div className='flex justify-between text-sm'>
              <span>Database</span>
              <span>{systemInfo.environment?.database_url || 'N/A'}</span>
            </div>
            <div className='flex justify-between text-sm'>
              <span>JWT Secret</span>
              <span>{systemInfo.environment?.jwt_secret || 'N/A'}</span>
            </div>
          </div>
          <div className='flex justify-between text-sm'>
            <span>Timestamp</span>
            <span>
              {systemInfo.timestamp
                ? new Date(systemInfo.timestamp).toLocaleString('vi-VN')
                : 'N/A'}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
