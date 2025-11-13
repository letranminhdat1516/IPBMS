import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { UnitOfWork } from '../../../infrastructure/database/unit-of-work.service';
import { TicketsRepository } from '../../../infrastructure/repositories/system/tickets.repository';
import { HistoryService } from '../../../modules/tickets/history.service';
import { Ticket } from '../../../shared/types/ticket';
import { TicketCategory, TicketPriority, TicketStatus } from '../../../shared/types/ticket-enums';
import { CreateTicketDto } from '../../dto/tickets/create-ticket.dto';
import { TicketEventsService } from '../../events/ticket-events.service';

@Injectable()
export class TicketsService {
  private readonly logger = new Logger(TicketsService.name);
  constructor(
    private readonly _repo: TicketsRepository,
    private readonly _ticketEvents: TicketEventsService,
    private readonly _historyService: HistoryService,
    private readonly _uow: UnitOfWork,
  ) {}

  async findById(ticket_id: string): Promise<Ticket> {
    const t = await this._repo.findTicketById(ticket_id);
    if (!t) throw new NotFoundException('Ticket not found');
    return t;
  }

  findAll(): Promise<Ticket[]> {
    return this._repo.findAllTickets();
  }

  findAllByUserId(user_id: string): Promise<Ticket[]> {
    return this._repo.findAllTicketsByUserId(user_id);
  }

  findAllPaged(offset = 0, limit = 50): Promise<Ticket[]> {
    return this._repo.findAllTicketsPaged(offset, limit);
  }

  async create(data: CreateTicketDto | Partial<Ticket>): Promise<Ticket> {
    // Run ticket creation and initial history write in a single transaction
    // Log payload for debugging potential serialization/circular errors when calling Prisma
    // Avoid noisy logs in production, but keep a helpful debug output when developing
    try {
      if (process.env.NODE_ENV !== 'production') {
        const safeStringify = (obj: any) => {
          const seen = new WeakSet();
          return JSON.stringify(obj, function (key, value) {
            if (typeof value === 'object' && value !== null) {
              if (seen.has(value)) return '[Circular]';
              seen.add(value);
            }
            return value;
          });
        };
        // small, non-blocking debug log
        this.logger.debug('[TicketsService.create] payload: ' + safeStringify(data));
      }
    } catch {
      // ignore logging errors
    }

    // normalize incoming payload once to avoid repeated casts
    const src = (data as any) || {};
    const title = src.title ?? src.subject;

    // Ensure DTO field `title` is mapped to repository's expected `title` field
    // Accept legacy `subject` via fallback above for backward compatibility
    const createPayload: any = {
      user_id: src.user_id,
      title,
      type: src.type ?? undefined,
      description: src.description ?? undefined,
      category: src.category ?? undefined,
      priority: src.priority ?? undefined,
      status: src.status ?? undefined,
      assigned_to: src.assigned_to ?? undefined,
      tags: src.tags ?? undefined,
      metadata: src.metadata ?? undefined,
    };

    const ticket = await this._uow.execute(async (tx) => {
      const created = await this._repo.createTicket(createPayload as any, tx as any);
      // record history inside the same tx
      await this._historyService.logTicketCreation(created, created.user_id, tx as any);
      return created;
    });

    // Emit ticket.created event for notification pipeline after successful transaction
    this._ticketEvents.emit('ticket.created', {
      ticketId: ticket.ticket_id,
      userId: ticket.user_id,
    });

    return ticket;
  }

  async update(ticket_id: string, data: Partial<Ticket>): Promise<Ticket> {
    const updated = await this._repo.updateTicket(ticket_id, data);
    if (!updated) throw new NotFoundException('Ticket not found');
    return updated;
  }

  async updateStatus(ticket_id: string, status: TicketStatus): Promise<Ticket> {
    const ticket = await this.findById(ticket_id);
    const oldStatus = ticket.status;
    const updated = await this._repo.updateTicket(ticket_id, { status });
    if (!updated) throw new NotFoundException('Ticket not found');

    // Emit status changed event for notification pipeline
    if (oldStatus !== status) {
      this._ticketEvents.emit('ticket.status_changed', {
        ticketId: ticket_id,
        oldStatus,
        newStatus: status,
      });
      try {
        await this._historyService.logStatusChange(
          ticket_id,
          ticket.user_id,
          oldStatus,
          status as any,
        );
      } catch {
        this._ticketEvents.emit('ticket.history_failed', { ticketId: ticket_id });
      }
    }

    return updated;
  }

  async remove(ticket_id: string): Promise<{ deleted: boolean }> {
    // Ensure ticket exists first
    const existing = await this._repo.findTicketById(ticket_id);
    if (!existing) {
      throw new NotFoundException('Ticket not found');
    }

    const result = await this._repo.removeTicket(ticket_id);
    if (!result.deleted) {
      // Something went wrong during delete
      throw new Error('Delete failed');
    }
    return result;
  }

  /**
   * Return frontend-friendly metadata: enums for status/priority/category and allowed transitions.
   */
  getMeta() {
    // Derive values from enums
    const statuses = Object.values(TicketStatus);
    const priorities = Object.values(TicketPriority);
    const categories = Object.values(TicketCategory);

    // Simple allowed transitions map (frontend can use this to render allowed actions)
    const transitions: Record<string, string[]> = {
      new: ['open', 'in_progress'],
      open: ['in_progress', 'waiting_for_customer', 'resolved'],
      in_progress: ['waiting_for_customer', 'waiting_for_agent', 'resolved'],
      waiting_for_customer: ['in_progress', 'resolved'],
      waiting_for_agent: ['in_progress', 'resolved'],
      resolved: ['closed'],
      closed: [],
    };

    return { statuses, priorities, categories, transitions };
  }

  // Dashboard statistics methods
  async getTicketStatusCounts(): Promise<Record<string, number>> {
    return this._repo.getTicketStatusCounts();
  }

  async getTicketPriorityCounts(): Promise<Record<string, number>> {
    return this._repo.getTicketPriorityCounts();
  }

  async getTicketCategoryCounts(): Promise<Record<string, number>> {
    return this._repo.getTicketCategoryCounts();
  }

  async getTotalTicketCount(): Promise<number> {
    return this._repo.getTotalTicketCount();
  }

  async getTicketsCreatedInDateRange(startDate: Date, endDate: Date): Promise<number> {
    return this._repo.getTicketsCreatedInDateRange(startDate, endDate);
  }

  async getTicketsCountsGroupedByDate(
    startDate: Date,
    endDate: Date,
  ): Promise<Array<{ date: string; count: number }>> {
    // passthrough to repository grouped query
    // keep signature on service layer for easier testing/mocking
    return this._repo.getTicketsCountsGroupedByDate(startDate, endDate);
  }

  async getTicketsResolvedInDateRange(startDate: Date, endDate: Date): Promise<number> {
    return this._repo.getTicketsResolvedInDateRange(startDate, endDate);
  }

  async getAverageResolutionTime(): Promise<number> {
    return this._repo.getAverageResolutionTime();
  }

  async getAverageFirstResponseTime(): Promise<number> {
    return this._repo.getAverageFirstResponseTime();
  }

  // Agent performance methods
  async getAgentTicketCounts(): Promise<Array<{ agentId: string; ticketCount: number }>> {
    return this._repo.getAgentTicketCounts();
  }

  async getAgentResolvedTicketCounts(): Promise<Array<{ agentId: string; resolvedCount: number }>> {
    return this._repo.getAgentResolvedTicketCounts();
  }

  async getAgentActiveTicketCounts(): Promise<Array<{ agentId: string; activeCount: number }>> {
    return this._repo.getAgentActiveTicketCounts();
  }

  async getAgentResolutionTimeStats(): Promise<
    Array<{ agentId: string; averageResolutionHours: number; resolvedCount: number }>
  > {
    return this._repo.getAgentResolutionTimeStats();
  }
}
