import { event_type_enum, event_status_enum } from '@prisma/client';

export class EventDetection {
  event_id?: string;
  snapshot_id?: string;
  user_id?: string;
  camera_id?: string;
  event_type?: event_type_enum;
  event_description?: string;
  detection_data?: any;
  ai_analysis_result?: any;
  confidence_score?: any;
  reliability_score?: any;
  bounding_boxes?: any;
  context_data?: any;
  detected_at?: Date;
  verified_at?: Date;
  verified_by?: string;
  acknowledged_at?: Date;
  acknowledged_by?: string;
  dismissed_at?: Date;
  created_at?: Date;
  confirm_status?: boolean;
  status?: event_status_enum;
  notes?: string;
}
