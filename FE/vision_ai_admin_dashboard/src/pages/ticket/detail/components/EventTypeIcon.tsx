import { AlertCircle, Eye, Link2Off, RefreshCw } from 'lucide-react';

export function EventTypeIcon({ type }: { type: string }) {
  switch (type) {
    case 'Phát hiện chuyển động':
      return <Eye className='h-4 w-4 text-blue-500' />;
    case 'Kết nối lại':
      return <RefreshCw className='h-4 w-4 text-green-500' />;
    case 'Mất kết nối':
      return <Link2Off className='h-4 w-4 text-red-500' />;
    case 'Cảnh báo':
      return <AlertCircle className='h-4 w-4 text-yellow-500' />;
    default:
      return null;
  }
}
