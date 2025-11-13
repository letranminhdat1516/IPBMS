import { TicketCategory, TicketPriority, TicketStatus } from './ticket-enums';

export interface Ticket {
  ticket_id: string;
  user_id: string;
  type?: string;
  title?: string | null;
  description?: string | null;
  status: TicketStatus;
  category: TicketCategory;
  priority: TicketPriority;
  assigned_to?: string | null;
  tags?: string[] | null;
  metadata?: Record<string, any> | null;
  due_date?: Date | null;
  resolved_at?: Date | null;
  closed_at?: Date | null;
  created_at?: Date;
  updated_at?: Date;
  messages?: any[];
  assignments?: any[];
  ratings?: any[];
  history?: any[];
}
