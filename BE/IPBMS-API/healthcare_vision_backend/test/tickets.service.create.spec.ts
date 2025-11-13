import { TicketsService } from '../src/application/services/system/tickets.service';

// Minimal mocks for dependencies
const makeRepoMock = () => ({
  createTicket: jest.fn(async (data: any) => ({
    ticket_id: 'ticket-1',
    user_id: data.user_id,
    title: data.title,
    description: data.description ?? null,
    status: data.status ?? 'new',
    category: data.category ?? null,
    priority: data.priority ?? 'medium',
    assigned_to: data.assigned_to ?? null,
    tags: data.tags ?? null,
    metadata: data.metadata ?? null,
    created_at: new Date(),
    updated_at: new Date(),
  })),
});

const makeHistoryMock = () => ({
  logTicketCreation: jest.fn(async (_ticket: any, _userId: string, _tx?: any) => {}),
});

const makeUowMock = () => ({
  execute: jest.fn(async (cb: any) => {
    // call cb with a fake tx
    return cb({} as any);
  }),
});

const makeEventsMock = () => ({ emit: jest.fn() });

describe('TicketsService.create mapping', () => {
  it('uses title when provided', async () => {
    const repo = makeRepoMock();
    const history = makeHistoryMock();
    const uow = makeUowMock();
    const events = makeEventsMock();

    const svc = new TicketsService(repo as any, events as any, history as any, uow as any);

    const dto = { user_id: 'user-1', title: 'My Title', description: 'desc' };
    const result = await svc.create(dto as any);

    expect(repo.createTicket).toHaveBeenCalled();
    const calledWith = (repo.createTicket as jest.Mock).mock.calls[0][0];
    expect(calledWith.title).toBe('My Title');
    expect(result.title).toBe('My Title');
  });

  it('falls back to subject when title missing', async () => {
    const repo = makeRepoMock();
    const history = makeHistoryMock();
    const uow = makeUowMock();
    const events = makeEventsMock();

    const svc = new TicketsService(repo as any, events as any, history as any, uow as any);

    const dto = { user_id: 'user-1', subject: 'Legacy Subject', description: 'desc' };
    const result = await svc.create(dto as any);

    expect(repo.createTicket).toHaveBeenCalled();
    const calledWith = (repo.createTicket as jest.Mock).mock.calls[0][0];
    expect(calledWith.title).toBe('Legacy Subject');
    expect(result.title).toBe('Legacy Subject');
  });
});
