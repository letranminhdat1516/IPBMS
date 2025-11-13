import { Test, TestingModule } from '@nestjs/testing';
import { TicketsService } from '../src/application/services/system/tickets.service';
import { TicketsRepository } from '../src/infrastructure/repositories/system/tickets.repository';
import { TicketEventsService } from '../src/application/events/ticket-events.service';
import { HistoryService } from '../src/modules/tickets/history.service';
import { UnitOfWork } from '../src/infrastructure/database/unit-of-work.service';

describe('TicketsService history logging', () => {
  let service: TicketsService;
  let repo: jest.Mocked<Partial<TicketsRepository>>;
  let events: jest.Mocked<Partial<TicketEventsService>>;
  let history: jest.Mocked<Partial<HistoryService>>;

  const ticket = {
    ticket_id: 't-1',
    user_id: 'u-1',
    status: 'new',
  } as any;

  beforeEach(async () => {
    repo = {
      findTicketById: jest.fn().mockResolvedValue(ticket),
      updateTicket: jest.fn().mockResolvedValue({ ...ticket, status: 'in_progress' }),
    } as any;

    events = { emit: jest.fn() } as any;
    history = { logStatusChange: jest.fn() } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketsService,
        { provide: TicketsRepository, useValue: repo },
        { provide: TicketEventsService, useValue: events },
        { provide: HistoryService, useValue: history },
        { provide: UnitOfWork, useValue: { execute: jest.fn() } },
      ],
    }).compile();

    service = module.get(TicketsService);
  });

  it('logs status change and emits event on success', async () => {
    (history.logStatusChange as jest.Mock).mockResolvedValue({} as any);

    const res = await service.updateStatus(ticket.ticket_id, 'in_progress' as any);

    expect(repo.findTicketById).toHaveBeenCalledWith(ticket.ticket_id);
    expect(repo.updateTicket).toHaveBeenCalledWith(ticket.ticket_id, { status: 'in_progress' });
    expect(events.emit).toHaveBeenCalledWith('ticket.status_changed', {
      ticketId: ticket.ticket_id,
      oldStatus: 'new',
      newStatus: 'in_progress',
    });
    expect(history.logStatusChange).toHaveBeenCalledWith(
      ticket.ticket_id,
      ticket.user_id,
      'new',
      'in_progress',
    );
    expect(res.status).toBe('in_progress');
  });

  it('emits ticket.history_failed when history logging fails', async () => {
    (history.logStatusChange as jest.Mock).mockRejectedValue(new Error('fail'));

    const res = await service.updateStatus(ticket.ticket_id, 'in_progress' as any);

    expect(events.emit).toHaveBeenCalledWith('ticket.status_changed', {
      ticketId: ticket.ticket_id,
      oldStatus: 'new',
      newStatus: 'in_progress',
    });
    expect(history.logStatusChange).toHaveBeenCalled();
    expect(events.emit).toHaveBeenCalledWith('ticket.history_failed', {
      ticketId: ticket.ticket_id,
    });
    expect(res.status).toBe('in_progress');
  });
});
