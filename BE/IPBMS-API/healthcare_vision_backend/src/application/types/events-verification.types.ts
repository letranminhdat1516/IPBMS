import type { events as Event } from '@prisma/client';

/**
 * Allowed verification actions coming from callers.
 * Keep this in sync with `event_verification_status_enum` (subset used for explicit actions).
 */
export type VerificationAction = 'APPROVED' | 'REJECTED' | 'CANCELED';

/**
 * Full verification status enum as defined in Prisma schema.
 */
export type VerificationStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELED'
  | 'ESCALATED'
  | 'HANDLED';

export interface VerifyPayload {
  eventId: string;
  action: VerificationAction;
  userId?: string | null;
  notes?: string | null;
}

export interface EscalatePayload {
  eventId: string;
  reason?: string | null;
}

export type EventRecord = Event;

/** Map a verification action to an event_history action string used by the audit log. */
export function verificationActionToHistoryAction(action: VerificationAction): string {
  if (action === 'APPROVED') return 'confirmed';
  if (action === 'REJECTED') return 'rejected';
  return 'cancelled';
}

export default {} as const;
