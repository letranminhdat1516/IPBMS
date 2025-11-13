export class CreateEventDto {
  snapshot_id?: string;
  user_id?: string;
  camera_id?: string;
  event_type?: string;
  event_description?: string;
  detection_data?: any;
  ai_analysis_result?: any;
  confidence_score?: number;
  reliability_score?: number;
  detected_at?: string;
  notes?: string | null;
}
