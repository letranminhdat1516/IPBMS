export enum HistoryAction {
  CREATED = 'created',
  UPDATED = 'updated',
  STATUS_CHANGED = 'status_changed',
  ASSIGNED = 'assigned',
  UNASSIGNED = 'unassigned',
  MESSAGE_ADDED = 'message_added',
  RATED = 'rated',
  CLOSED = 'closed',
  REOPENED = 'reopened',
}

export interface TicketHistory {
  history_id: string;
  ticket_id: string;
  user_id: string;
  action: HistoryAction;
  old_values?: Record<string, any> | null;
  new_values?: Record<string, any> | null;
  description?: string | null;
  metadata?: Record<string, any> | null;
  created_at: Date;
  ticket?: any;
}
