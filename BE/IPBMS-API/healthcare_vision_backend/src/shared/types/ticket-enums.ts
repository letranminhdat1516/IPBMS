export enum TicketPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum TicketCategory {
  TECHNICAL = 'technical',
  BILLING = 'billing',
  ACCOUNT = 'account',
  FEATURE_REQUEST = 'feature_request',
  BUG_REPORT = 'bug_report',
  GENERAL = 'general',
}

export enum TicketStatus {
  NEW = 'new',
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  WAITING_FOR_CUSTOMER = 'waiting_for_customer',
  WAITING_FOR_AGENT = 'waiting_for_agent',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

// Matches Prisma enum `customer_request_type_enum` (prisma/schema.prisma)
export enum TicketType {
  REPORT = 'report',
  SUPPORT = 'support',
}
