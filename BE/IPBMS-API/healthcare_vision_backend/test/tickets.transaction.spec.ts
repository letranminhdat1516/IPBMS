import { Test, TestingModule } from '@nestjs/testing';
import { TicketsService } from '../src/application/services/system/tickets.service';
import { TicketsRepository } from '../src/infrastructure/repositories/system/tickets.repository';
import { TicketEventsService } from '../src/application/events/ticket-events.service';
import { HistoryService } from '../src/modules/tickets/history.service';
import { UnitOfWork } from '../src/infrastructure/database/unit-of-work.service';

describe('TicketsService transactional create', () => {
  let service: TicketsService;
  let repo: jest.Mocked<Partial<TicketsRepository>>;
  let events: jest.Mocked<Partial<TicketEventsService>>;
  let history: jest.Mocked<Partial<HistoryService>>;
  let uow: jest.Mocked<Partial<UnitOfWork>>;

  const sampleDto = {
    user_id: 'user-1',
    title: 'Test ticket',
    description: 'desc',
  } as any;

  const createdTicket = {
    ticket_id: 't1',
    user_id: 'user-1',
    title: 'Test ticket',
  } as any;

  beforeEach(async () => {
    repo = {
      createTicket: jest.fn(),
    };

    events = {
      emit: jest.fn(),
    };

    history = {
      logTicketCreation: jest.fn(),
    } as any;

    uow = {
      execute: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketsService,
        { provide: TicketsRepository, useValue: repo },
        { provide: TicketEventsService, useValue: events },
        { provide: HistoryService, useValue: history },
        { provide: UnitOfWork, useValue: uow },
      ],
    }).compile();

    service = module.get(TicketsService);
  });

  it('commits transaction and emits event when history succeeds', async () => {
    (repo.createTicket as jest.Mock).mockResolvedValue(createdTicket);
    (history.logTicketCreation as jest.Mock).mockResolvedValue({} as any);

    // Simulate unit of work executing the callback and returning its value
    (uow.execute as jest.Mock).mockImplementation(async (cb: any) => cb({}));

    const res = await service.create(sampleDto);

    expect(res).toEqual(createdTicket);
    expect(repo.createTicket).toHaveBeenCalledWith(sampleDto, expect.anything());
    expect(history.logTicketCreation).toHaveBeenCalledWith(
      createdTicket,
      createdTicket.user_id,
      expect.anything(),
    );
    expect(events.emit).toHaveBeenCalledWith('ticket.created', {
      ticketId: createdTicket.ticket_id,
      userId: createdTicket.user_id,
    });
  });

  it('rolls back (propagates error) when history write fails and does not emit event', async () => {
    (repo.createTicket as jest.Mock).mockResolvedValue(createdTicket);
    (history.logTicketCreation as jest.Mock).mockRejectedValue(new Error('history fail'));

    (uow.execute as jest.Mock).mockImplementation(async (cb: any) => cb({}));

    await expect(service.create(sampleDto)).rejects.toThrow('history fail');

    // createTicket was called inside transaction, but overall create failed
    expect(repo.createTicket).toHaveBeenCalledWith(sampleDto, expect.anything());
    expect(history.logTicketCreation).toHaveBeenCalled();
    expect(events.emit).not.toHaveBeenCalledWith('ticket.created', expect.anything());
  });
});
