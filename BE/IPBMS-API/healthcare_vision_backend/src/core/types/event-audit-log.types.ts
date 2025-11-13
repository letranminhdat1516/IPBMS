import { confirmation_state_enum, event_type_enum } from '@prisma/client';

export type EventHistoryAction =
  | 'proposed'
  | 'edited'
  | 'confirmed'
  | 'rejected'
  | 'cancelled'
  | 'auto_rejected'
  | 'caregiver_invited'
  | 'caregiver_assigned'
  | 'abandoned';

export interface EventAuditLogEntry {
  eventId: string;
  action: EventHistoryAction;
  actorId?: string;
  actorName?: string;
  actorRole?: string;
  previousStatus?: string;
  newStatus?: string;
  previousEventType?: event_type_enum | null;
  newEventType?: event_type_enum | null;
  previousConfirmationState?: confirmation_state_enum | null;
  newConfirmationState?: confirmation_state_enum | null;
  reason?: string | null;
  metadata?: any;
  responseTimeMinutes?: number | null;
  isFirstAction?: boolean;
}

export interface EventHistoryRow {
  history_id: string;
  event_id: string;
  action: EventHistoryAction;
  actor_id: string | null;
  actor_name: string | null;
  actor_role: string | null;
  previous_status: string | null;
  new_status: string | null;
  previous_event_type: event_type_enum | null;
  new_event_type: event_type_enum | null;
  previous_confirmation_state: confirmation_state_enum | null;
  new_confirmation_state: confirmation_state_enum | null;
  reason: string | null;
  metadata: any | null;
  response_time_minutes: number | null;
  is_first_action: boolean | null;
  created_at: Date;
}

export interface EventAuditLogStats {
  total_events: number;
  total_proposed: number;
  confirmed: number;
  rejected: number;
  cancelled: number;
  auto_rejected: number;
  abandoned: number;
  caregiver_invitations: number;
  caregiver_assignments: number;
  avg_response_time_hours: number;
  approval_rate: number;
  rejection_rate: number;
  auto_rejection_rate: number;
  abandonment_rate: number;
}
