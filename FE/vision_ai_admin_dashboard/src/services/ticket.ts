import api from '@/lib/api';

// Types for Ticket Management
export type TicketType = 'camera_error' | 'support';

export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export interface Ticket {
  id: string;
  user_id: string;
  type: TicketType;
  title: string;
  description: string;
  status: TicketStatus;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  camera_id?: string;
  error_code?: string;
  error_message?: string;
  attachments?: string[];
  assigned_to?: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  notes?: string;
}

export interface CreateTicketRequest {
  type: TicketType;
  title: string;
  description: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  camera_id?: string;
  error_code?: string;
  error_message?: string;
  attachments?: string[];
}

export interface UpdateTicketRequest {
  status?: TicketStatus;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  assigned_to?: string;
  notes?: string;
}

export interface TicketsResponse {
  data: Ticket[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface TicketFilters {
  page?: number;
  limit?: number;
  status?: TicketStatus;
  type?: TicketType;
}

// Camera Error Tickets APIs
export function createCameraErrorTicket(data: Omit<CreateTicketRequest, 'type'>) {
  return api.post<Ticket>('/camera-error-tickets', {
    ...data,
    type: 'camera_error' as TicketType,
  });
}

export function getUserCameraErrorTickets(params?: Omit<TicketFilters, 'type'>) {
  return api.get<TicketsResponse>('/camera-error-tickets', params);
}

export function getCameraErrorTicket(id: string) {
  return api.get<Ticket>(`/camera-error-tickets/${id}`);
}

export function updateCameraErrorTicket(id: string, data: UpdateTicketRequest) {
  return api.patch<Ticket>(`/camera-error-tickets/${id}`, data);
}

// Support Tickets APIs (if available)
export function createSupportTicket(data: Omit<CreateTicketRequest, 'type'>) {
  return api.post<Ticket>('/tickets', {
    ...data,
    type: 'support' as TicketType,
  });
}

export function getUserSupportTickets(params?: Omit<TicketFilters, 'type'>) {
  return api.get<TicketsResponse>('/tickets', params);
}

export function getSupportTicket(id: string) {
  return api.get<Ticket>(`/tickets/${id}`);
}

export function updateSupportTicket(id: string, data: UpdateTicketRequest) {
  return api.patch<Ticket>(`/tickets/${id}`, data);
}

// Generic ticket functions (works for both types)
export function getUserTickets(params?: TicketFilters) {
  // If type is specified, use the appropriate endpoint
  if (params?.type === 'camera_error') {
    const { type, ...rest } = params;
    return getUserCameraErrorTickets(rest);
  } else if (params?.type === 'support') {
    const { type, ...rest } = params;
    return getUserSupportTickets(rest);
  }

  // Default to camera error tickets if no type specified
  const { type, ...rest } = params || {};
  return getUserCameraErrorTickets(rest);
}

export function getTicket(id: string, type?: TicketType) {
  if (type === 'camera_error') {
    return getCameraErrorTicket(id);
  } else if (type === 'support') {
    return getSupportTicket(id);
  }

  // Default to camera error ticket
  return getCameraErrorTicket(id);
}

export function updateTicket(id: string, data: UpdateTicketRequest, type?: TicketType) {
  if (type === 'camera_error') {
    return updateCameraErrorTicket(id, data);
  } else if (type === 'support') {
    return updateSupportTicket(id, data);
  }

  // Default to camera error ticket
  return updateCameraErrorTicket(id, data);
}

export function createTicket(data: CreateTicketRequest) {
  if (data.type === 'camera_error') {
    const { type, ...rest } = data;
    return createCameraErrorTicket(rest);
  } else if (data.type === 'support') {
    const { type, ...rest } = data;
    return createSupportTicket(rest);
  }

  // Default to camera error ticket
  const { type, ...rest } = data;
  return createCameraErrorTicket(rest);
}
