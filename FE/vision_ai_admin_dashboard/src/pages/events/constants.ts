import { AlertTriangle, Eye, Shield } from 'lucide-react';

export const DEFAULT_PAGE_SIZE = 20;

export const severityConfig = {
  low: { color: 'bg-blue-100 text-blue-800', icon: Eye },
  medium: { color: 'bg-yellow-100 text-yellow-800', icon: AlertTriangle },
  high: { color: 'bg-red-100 text-red-800', icon: Shield },
  critical: { color: 'bg-purple-100 text-purple-800', icon: Shield },
};

export const statusConfig = {
  pending: { color: 'bg-gray-100 text-gray-800' },
  acknowledged: { color: 'bg-blue-100 text-blue-800' },
  resolved: { color: 'bg-green-100 text-green-800' },
  dismissed: { color: 'bg-red-100 text-red-800' },
};
