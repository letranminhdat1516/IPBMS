import { useEffect, useState } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { AuditLog, getCaregiverAuditLogs } from '@/services/auditLog';

interface Props {
  caregiverId: string | number;
}

export function CaregiverAuditLog({ caregiverId }: Props) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getCaregiverAuditLogs(caregiverId)
      .then((data) => setLogs(data))
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, [caregiverId]);

  return (
    <Card className='mt-6'>
      <CardHeader>
        <CardTitle>Lịch sử thao tác</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className='text-muted-foreground text-sm'>Đang tải…</div>
        ) : logs.length === 0 ? (
          <div className='text-muted-foreground text-sm'>Chưa có thao tác nào.</div>
        ) : (
          <ul className='space-y-2'>
            {logs.map((log) => (
              <li key={log.id} className='rounded border px-3 py-2 text-sm'>
                <div>
                  <span className='font-semibold'>{log.action}</span> bởi{' '}
                  <span className='text-blue-600'>{log.actor_name}</span>
                </div>
                <div className='text-muted-foreground text-xs'>{log.timestamp}</div>
                {log.message && (
                  <div className='text-xs'>
                    {typeof log.message === 'string'
                      ? log.message
                      : typeof log.message === 'object'
                        ? JSON.stringify(log.message, null, 2)
                        : String(log.message)}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
