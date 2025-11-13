import { Injectable } from '@nestjs/common';
import { Prisma, support_tickets } from '@prisma/client';
import { Ticket } from '../../../shared/types/ticket';
import { PrismaService } from '../../database/prisma.service';
import { UnitOfWork } from '../../database/unit-of-work.service';
import { BasePrismaRepository } from '../shared/base-prisma.repository';

export type TicketOrderBy =
  | { created_at?: 'asc' | 'desc' }
  | { updated_at?: 'asc' | 'desc' }
  | { priority?: 'asc' | 'desc' }
  | { status?: 'asc' | 'desc' };

export interface TicketListOptions {
  page?: number;
  limit?: number;
  orderBy?: TicketOrderBy[] | TicketOrderBy;
  include?: Prisma.support_ticketsInclude;
  // Filters
  q?: string; // full-text (title/description)
  status?: string | string[];
  priority?: string | string[];
  category?: string | string[];
  user_id?: string;
  assigned_to?: string;
  tags?: string[]; // match ANY tag
  created_from?: Date;
  created_to?: Date;
  only_active?: boolean; // semantic flag — no deleted_at in schema
}

export interface CreateTicketInput {
  user_id: string;
  title: string;
  type?: string | null; // customer_request_type_enum (required by schema, default to 'support')
  description?: string | null;
  category?: string | null;
  priority?: string | null; // e.g. 'low' | 'medium' | 'high' | 'urgent'
  status?: string | null; // must be one of customer_request_status_enum
  assigned_to?: string | null;
  tags?: string[] | null; // stored as Json
  metadata?: Prisma.InputJsonValue | null;
}

export interface UpdateTicketInput {
  title?: string | null;
  description?: string | null;
  category?: string | null;
  priority?: string | null;
  status?: string | null;
  assigned_to?: string | null;
  tags?: string[] | null;
  metadata?: Prisma.InputJsonValue | null;
  // Soft-delete toggle not present in schema — use status/closed_at
}

@Injectable()
export class TicketsRepository extends BasePrismaRepository {
  constructor(
    protected readonly prismaService: PrismaService,
    protected readonly unitOfWork: UnitOfWork,
  ) {
    super(prismaService, unitOfWork);
  }

  // Map a Prisma support_tickets row to the application Ticket type
  private mapRowToTicket(row: support_tickets): Ticket {
    return {
      ticket_id: row.ticket_id,
      user_id: row.user_id,
      type: (row.type as any) ?? undefined,
      title: row.title ?? null,
      description: row.description ?? null,
      status: row.status as any,
      category: (row.category as any) ?? ('' as any),
      priority: (row.priority as any) ?? ('' as any),
      assigned_to: row.assigned_to ?? null,
      tags: Array.isArray(row.tags) ? (row.tags as string[]) : ((row.tags as any) ?? null),
      metadata: (row.metadata as any) ?? null,
      due_date: (row as any).due_date ?? null,
      resolved_at: row.resolved_at ?? null,
      closed_at: row.closed_at ?? null,
      created_at: row.created_at,
      updated_at: row.updated_at,
    } as Ticket;
  }

  private buildWhere(opts: TicketListOptions): Prisma.support_ticketsWhereInput {
    const { q, status, priority, category, user_id, assigned_to, tags, created_from, created_to } =
      opts || {};

    const where: Prisma.support_ticketsWhereInput = {};

    if (user_id) where.user_id = user_id;
    if (assigned_to) where.assigned_to = assigned_to;

    if (status) {
      where.status = Array.isArray(status) ? ({ in: status } as any) : (status as any);
    }
    if (priority) {
      where.priority = Array.isArray(priority) ? { in: priority } : priority;
    }
    if (category) {
      where.category = Array.isArray(category) ? { in: category } : category;
    }
    if (created_from || created_to) {
      where.created_at = {
        gte: created_from ?? undefined,
        lte: created_to ?? undefined,
      };
    }

    if (tags && tags.length) {
      // cast to any to avoid strict Prisma Json filter typing here
      where.AND = tags.map((t) => ({ tags: { path: [], array_contains: [t] } })) as any;
    }

    if (q && q.trim()) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ];
    }

    return where;
  }

  async create(data: CreateTicketInput, tx?: Prisma.TransactionClient): Promise<support_tickets> {
    const prisma = (tx ?? this.prisma) as Prisma.TransactionClient;
    return prisma.support_tickets.create({
      data: {
        user_id: data.user_id,
        type: (data.type ?? 'support') as any,
        title: (data as any).title ?? (data as any).subject,
        description: data.description ?? null,
        category: data.category ?? null,
        priority: data.priority ?? 'medium',
        status: (data.status ?? 'new') as any,
        assigned_to: data.assigned_to ?? null,
        tags: data.tags ?? undefined,
        metadata: data.metadata ?? undefined,
      },
    });
  }

  // Compatibility wrapper expected by service/tests
  async createTicket(data: CreateTicketInput, tx?: Prisma.TransactionClient): Promise<Ticket> {
    const row = await this.create(data, tx);
    return this.mapRowToTicket(row);
  }

  // renamed to avoid colliding with BasePrismaRepository.findById signature
  async findByTicketId(
    ticket_id: string,
    include?: Prisma.support_ticketsInclude,
  ): Promise<support_tickets | null> {
    return this.prisma.support_tickets.findUnique({
      where: { ticket_id },
      include,
    }) as Promise<support_tickets | null>;
  }

  // compatibility
  async findTicketById(
    ticket_id: string,
    include?: Prisma.support_ticketsInclude,
  ): Promise<Ticket | null> {
    const row = await this.findByTicketId(ticket_id, include);
    return row ? this.mapRowToTicket(row) : null;
  }

  // renamed to avoid collision
  async findFirstTicket(
    where: Prisma.support_ticketsWhereInput,
    include?: Prisma.support_ticketsInclude,
  ): Promise<Ticket | null> {
    const r = await this.prisma.support_tickets.findFirst({ where, include });
    return r ? this.mapRowToTicket(r) : null;
  }

  async list(opts: TicketListOptions = {}) {
    const { page = 1, limit = 20, include, orderBy = [{ created_at: 'desc' }] } = opts;

    const where = this.buildWhere(opts);
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.support_tickets.findMany({
        where,
        include,
        orderBy: Array.isArray(orderBy) ? orderBy : [orderBy],
        skip,
        take: limit,
      }),
      this.prisma.support_tickets.count({ where }),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / Math.max(limit, 1)),
      },
    };
  }

  // compatibility helpers used by TicketsService
  async findAllTickets(): Promise<Ticket[]> {
    const rows = await this.prisma.support_tickets.findMany();
    return rows.map((r) => this.mapRowToTicket(r));
  }

  async findAllTicketsByUserId(user_id: string): Promise<Ticket[]> {
    const rows = await this.prisma.support_tickets.findMany({ where: { user_id } });
    return rows.map((r) => this.mapRowToTicket(r));
  }

  async findAllTicketsPaged(offset = 0, limit = 50): Promise<Ticket[]> {
    const rows = await this.prisma.support_tickets.findMany({
      skip: offset,
      take: limit,
      orderBy: { created_at: 'desc' },
    });
    return rows.map((r) => this.mapRowToTicket(r));
  }

  // renamed update to avoid accidental base signature collision
  async updateTicket(
    ticket_id: string,
    data: UpdateTicketInput,
    tx?: Prisma.TransactionClient,
  ): Promise<Ticket> {
    const prisma = (tx ?? this.prisma) as Prisma.TransactionClient;
    const r = await prisma.support_tickets.update({
      where: { ticket_id },
      data: {
        title: (data as any).title ?? (data as any).subject ?? undefined,
        description: data.description ?? undefined,
        category: data.category ?? undefined,
        priority: data.priority ?? undefined,
        status: data.status ? (data.status as any) : undefined,
        assigned_to: data.assigned_to ?? undefined,
        tags: data.tags ?? undefined,
        metadata: data.metadata ?? undefined,
      },
    });
    return this.mapRowToTicket(r as any);
  }

  // map update result for service compatibility
  async updateTicketAndMap(
    ticket_id: string,
    data: UpdateTicketInput,
    tx?: Prisma.TransactionClient,
  ) {
    const r = await this.updateTicket(ticket_id, data, tx);
    return this.mapRowToTicket(r as any);
  }

  // compatibility alias (service expects updateTicket already present)
  // updateTicket is already the canonical name used by service

  // renamed to avoid colliding with BasePrismaRepository.softDelete
  async softDeleteTicket(ticket_id: string, reason?: string, tx?: Prisma.TransactionClient) {
    const prisma = (tx ?? this.prisma) as Prisma.TransactionClient;
    // Read current metadata, merge deleted_reason, then update — safer and works across DBs
    const current = await prisma.support_tickets.findUnique({
      where: { ticket_id },
      select: { metadata: true },
    });
    const existingMeta = (current?.metadata ?? {}) as Record<string, any>;
    const newMeta = reason ? { ...existingMeta, deleted_reason: reason } : existingMeta;

    return prisma.support_tickets.update({
      where: { ticket_id },
      data: {
        status: 'closed' as any,
        closed_at: new Date(),
        metadata: Object.keys(newMeta).length ? (newMeta as any) : undefined,
      },
    });
  }

  async restoreTicket(ticket_id: string, tx?: Prisma.TransactionClient) {
    const prisma = (tx ?? this.prisma) as Prisma.TransactionClient;
    return prisma.support_tickets.update({
      where: { ticket_id },
      data: { status: 'new' as any, closed_at: null },
    });
  }

  // renamed to avoid colliding with BasePrismaRepository.hardDelete
  async hardDeleteTicket(ticket_id: string, tx?: Prisma.TransactionClient) {
    const prisma = (tx ?? this.prisma) as Prisma.TransactionClient;
    return prisma.support_tickets.delete({ where: { ticket_id } });
  }

  // compatibility wrapper used by service.remove
  async removeTicket(ticket_id: string) {
    try {
      await this.hardDeleteTicket(ticket_id);
      return { deleted: true };
    } catch {
      return { deleted: false };
    }
  }

  async assign(ticket_id: string, assigneeUserId: string | null, tx?: Prisma.TransactionClient) {
    const prisma = (tx ?? this.prisma) as Prisma.TransactionClient;
    return prisma.support_tickets.update({
      where: { ticket_id },
      data: { assigned_to: assigneeUserId },
    });
  }

  async updateStatus(
    ticket_id: string,
    status: string,
    metadataPatch?: Record<string, any>,
    tx?: Prisma.TransactionClient,
  ) {
    const prisma = (tx ?? this.prisma) as Prisma.TransactionClient;
    return prisma.support_tickets.update({
      where: { ticket_id },
      data: { status: status as any, ...(metadataPatch ? { metadata: metadataPatch as any } : {}) },
    });
  }

  async addTags(ticket_id: string, tags: string[], tx?: Prisma.TransactionClient) {
    if (!tags?.length) return this.findByTicketId(ticket_id);
    const prisma = (tx ?? this.prisma) as Prisma.TransactionClient;
    const current = await prisma.support_tickets.findUnique({
      where: { ticket_id },
      select: { tags: true },
    });
    const currentTags: string[] = Array.isArray(current?.tags) ? (current!.tags as any) : [];
    const set = new Set<string>([...currentTags, ...tags]);
    return prisma.support_tickets.update({ where: { ticket_id }, data: { tags: Array.from(set) } });
  }

  async removeTags(ticket_id: string, tags: string[], tx?: Prisma.TransactionClient) {
    if (!tags?.length) return this.findByTicketId(ticket_id);
    const prisma = (tx ?? this.prisma) as Prisma.TransactionClient;
    const current = await prisma.support_tickets.findUnique({
      where: { ticket_id },
      select: { tags: true },
    });
    const currentTags: string[] = Array.isArray(current?.tags) ? (current!.tags as any) : [];
    const remaining = currentTags.filter((t) => !tags.includes(t));
    return prisma.support_tickets.update({ where: { ticket_id }, data: { tags: remaining } });
  }

  async upsertByExternalKey(
    external_key: string,
    createData: CreateTicketInput & { external_key: string },
    updateData: UpdateTicketInput,
    tx?: Prisma.TransactionClient,
  ) {
    const prisma = (tx ?? this.prisma) as Prisma.TransactionClient;

    // search for existing ticket where metadata->'external_key' equals provided key
    // metadata is json, use path equals (Prisma supports path equals for Json)
    const existing = await prisma.support_tickets.findFirst({
      where: { metadata: { path: ['external_key'], equals: external_key } as any },
    });

    if (existing) {
      return prisma.support_tickets.update({
        where: { ticket_id: existing.ticket_id },
        data: updateData as any,
      });
    }

    // create with external_key inside metadata
    const createPayload: any = {
      user_id: createData.user_id,
      type: (createData.type ?? 'support') as any,
      // support both new `title` and legacy `subject`
      title: (createData as any).title ?? (createData as any).subject ?? null,
      description: createData.description ?? null,
      category: createData.category ?? null,
      priority: createData.priority ?? 'medium',
      status: (createData.status ?? 'new') as any,
      assigned_to: createData.assigned_to ?? null,
      tags: createData.tags ?? undefined,
      metadata: { ...(createData.metadata as any), external_key: external_key },
    };

    return prisma.support_tickets.create({ data: createPayload });
  }

  // ---- Analytics / dashboard helpers expected by TicketsService ----
  async getTicketStatusCounts(): Promise<Record<string, number>> {
    const rows = await this.prisma.$queryRaw<Array<{ status: string | null; cnt: string }>>`
      SELECT status, COUNT(*) AS cnt FROM support_tickets GROUP BY status
    `;
    const out: Record<string, number> = {};
    for (const r of rows || []) {
      if (!r.status) continue;
      out[r.status] = Number((r as any).cnt) || 0;
    }
    return out;
  }

  async getTicketPriorityCounts(): Promise<Record<string, number>> {
    const rows = await this.prisma.$queryRaw<Array<{ priority: string | null; cnt: string }>>`
      SELECT priority, COUNT(*) AS cnt FROM support_tickets GROUP BY priority
    `;
    const out: Record<string, number> = {};
    for (const r of rows || []) {
      if (!r.priority) continue;
      out[r.priority] = Number((r as any).cnt) || 0;
    }
    return out;
  }

  async getTicketCategoryCounts(): Promise<Record<string, number>> {
    const rows = await this.prisma.$queryRaw<Array<{ category: string | null; cnt: string }>>`
      SELECT category, COUNT(*) AS cnt FROM support_tickets GROUP BY category
    `;
    const out: Record<string, number> = {};
    for (const r of rows || []) {
      if (!r.category) continue;
      out[r.category] = Number((r as any).cnt) || 0;
    }
    return out;
  }

  async getTotalTicketCount(): Promise<number> {
    const rows = await this.prisma.$queryRaw<Array<{ cnt: string }>>`
      SELECT COUNT(*) AS cnt FROM support_tickets
    `;
    return rows?.[0] ? Number(rows[0].cnt) : 0;
  }

  async getTicketsCreatedInDateRange(startDate: Date, endDate: Date): Promise<number> {
    const rows = await this.prisma.$queryRaw<Array<{ cnt: string }>>`
      SELECT COUNT(*) AS cnt FROM support_tickets WHERE created_at >= ${startDate} AND created_at <= ${endDate}
    `;
    return rows?.[0] ? Number(rows[0].cnt) : 0;
  }

  async getTicketsCountsGroupedByDate(
    startDate: Date,
    endDate: Date,
  ): Promise<Array<{ date: string; count: number }>> {
    const rows = await this.prisma.$queryRaw<Array<{ date: string; cnt: string }>>`
      SELECT to_char(created_at::date, 'YYYY-MM-DD') AS date, COUNT(*) AS cnt
      FROM support_tickets
      WHERE created_at >= ${startDate} AND created_at <= ${endDate}
      GROUP BY date
      ORDER BY date
    `;
    return (rows || []).map((r: any) => ({ date: r.date, count: Number(r.cnt) || 0 }));
  }

  async getTicketsResolvedInDateRange(startDate: Date, endDate: Date): Promise<number> {
    const rows = await this.prisma.$queryRaw<Array<{ cnt: string }>>`
      SELECT COUNT(*) AS cnt FROM support_tickets WHERE resolved_at >= ${startDate} AND resolved_at <= ${endDate}
    `;
    return rows?.[0] ? Number(rows[0].cnt) : 0;
  }

  async getAverageResolutionTime(): Promise<number> {
    const rows = await this.prisma.$queryRaw<Array<{ avg_hours: string | null }>>`
      SELECT AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/3600) AS avg_hours FROM support_tickets WHERE resolved_at IS NOT NULL
    `;
    const val = rows?.[0]?.avg_hours;
    if (!val) return 0;
    return typeof val === 'number' ? val : parseFloat(String(val));
  }

  // Placeholder: first response time requires message/history correlation; return 0 for now
  async getAverageFirstResponseTime(): Promise<number> {
    return 0;
  }

  async getAgentTicketCounts(): Promise<Array<{ agentId: string; ticketCount: number }>> {
    const rows = await this.prisma.$queryRaw<Array<{ agentid: string | null; cnt: string }>>`
      SELECT assigned_to AS agentId, COUNT(*) AS cnt FROM support_tickets WHERE assigned_to IS NOT NULL GROUP BY assigned_to
    `;
    return (rows || []).map((r: any) => ({ agentId: r.agentid, ticketCount: Number(r.cnt) || 0 }));
  }

  async getAgentResolvedTicketCounts(): Promise<Array<{ agentId: string; resolvedCount: number }>> {
    const rows = await this.prisma.$queryRaw<Array<{ agentid: string | null; cnt: string }>>`
      SELECT assigned_to AS agentId, COUNT(*) AS cnt FROM support_tickets WHERE status = 'resolved' GROUP BY assigned_to
    `;
    return (rows || []).map((r: any) => ({
      agentId: r.agentid,
      resolvedCount: Number(r.cnt) || 0,
    }));
  }

  async getAgentActiveTicketCounts(): Promise<Array<{ agentId: string; activeCount: number }>> {
    const rows = await this.prisma.$queryRaw<Array<{ agentid: string | null; cnt: string }>>`
      SELECT assigned_to AS agentId, COUNT(*) AS cnt FROM support_tickets WHERE status <> 'closed' AND assigned_to IS NOT NULL GROUP BY assigned_to
    `;
    return (rows || []).map((r: any) => ({ agentId: r.agentid, activeCount: Number(r.cnt) || 0 }));
  }

  async getAgentResolutionTimeStats(): Promise<
    Array<{ agentId: string; averageResolutionHours: number; resolvedCount: number }>
  > {
    const rows = await this.prisma.$queryRaw<
      Array<{ agentid: string | null; avg_hours: string | null; cnt: string }>
    >`
      SELECT assigned_to AS agentId, AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/3600) AS avg_hours, COUNT(*) AS cnt
      FROM support_tickets
      WHERE resolved_at IS NOT NULL AND assigned_to IS NOT NULL
      GROUP BY assigned_to
    `;
    return (rows || []).map((r: any) => ({
      agentId: r.agentid,
      averageResolutionHours: r.avg_hours ? parseFloat(String(r.avg_hours)) : 0,
      resolvedCount: Number(r.cnt) || 0,
    }));
  }
}
