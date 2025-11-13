import { AlertTriangle, Camera, Eye } from 'lucide-react';

export const getEventTypeIcon = (eventType: string) => {
  if (eventType.includes('fall')) return AlertTriangle;
  if (eventType.includes('camera')) return Camera;
  return Eye;
};

export const formatConfidence = (score?: number) => {
  if (!score) return 'N/A';
  return `${(score * 100).toFixed(1)}%`;
};
