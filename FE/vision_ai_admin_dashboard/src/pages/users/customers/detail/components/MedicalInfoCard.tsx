import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

export interface MedicalInfo {
  conditions: string[];
  medications: { name: string; dosage: string }[];
}

export function MedicalInfoCard({ medicalInfo }: { medicalInfo: MedicalInfo }) {
  return (
    <Card className='p-6'>
      <div className='mb-1 text-lg font-bold'>Thông tin y tế</div>
      <div className='mb-2 text-xs text-gray-500'>Tình trạng sức khỏe và thuốc men</div>
      <div className='mb-2'>
        <div className='mb-1 text-sm font-semibold'>Bệnh lý chính</div>
        <div className='flex flex-wrap gap-2'>
          {medicalInfo.conditions.map((cond) => (
            <Badge key={cond} variant='secondary'>
              {cond}
            </Badge>
          ))}
        </div>
      </div>
      <div>
        <div className='mb-1 text-sm font-semibold'>Thuốc đang sử dụng</div>
        <ul className='list-disc pl-5 text-sm text-gray-700'>
          {medicalInfo.medications.map((med) => (
            <li key={med.name}>
              {med.name} <span className='ml-2 text-xs text-gray-400'>{med.dosage}</span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}
