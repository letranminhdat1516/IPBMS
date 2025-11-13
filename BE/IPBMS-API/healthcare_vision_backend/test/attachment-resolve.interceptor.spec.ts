import { of } from 'rxjs';
import { AttachmentResolveInterceptor } from '../src/shared/interceptors/attachment-resolve.interceptor';
import { BadRequestException, ForbiddenException } from '@nestjs/common';

describe('AttachmentResolveInterceptor', () => {
  let interceptor: AttachmentResolveInterceptor;

  const mockUploadsService: any = {
    getUploadById: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    interceptor = new AttachmentResolveInterceptor(mockUploadsService);
  });

  function makeContext(req: any) {
    return {
      switchToHttp: () => ({ getRequest: () => req }),
    } as any;
  }

  it('resolves attachments and adds metadata.attachments (happy path)', async () => {
    const req = {
      user: { userId: 'user-1', role: 'customer' },
      body: {
        attachments: [{ file_id: 'file-1', description: 'desc' }],
      },
    } as any;

    mockUploadsService.getUploadById.mockResolvedValueOnce({
      upload_id: 'file-1',
      user_id: 'user-1',
      filename: 'photo.png',
      url: 'https://cdn/photo.png',
      size: 1024,
      mime: 'image/png',
    });

    const ctx = makeContext(req);
    const next = { handle: () => of('ok') } as any;

    const result$ = await interceptor.intercept(ctx as any, next as any);
    // because next.handle returns an observable, we subscribe
    const value = await result$.toPromise();
    expect(value).toBe('ok');
    expect(req.body.metadata.attachments).toBeDefined();
    expect(req.body.metadata.attachments[0].file_id).toBe('file-1');
    expect(req.body.attachments).toBeUndefined();
  });

  it('throws ForbiddenException when attachment not owned by user', async () => {
    const req = {
      user: { userId: 'user-1', role: 'customer' },
      body: { attachments: [{ file_id: 'file-2' }] },
    } as any;

    mockUploadsService.getUploadById.mockResolvedValueOnce({
      upload_id: 'file-2',
      user_id: 'other-user',
    });

    const ctx = makeContext(req);
    const next = { handle: () => of('ok') } as any;

    await expect(interceptor.intercept(ctx as any, next as any)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('throws BadRequestException when upload not found', async () => {
    const req = {
      user: { userId: 'user-1', role: 'customer' },
      body: { attachments: [{ file_id: 'missing-file' }] },
    } as any;

    mockUploadsService.getUploadById.mockRejectedValueOnce(new Error('Upload not found'));

    const ctx = makeContext(req);
    const next = { handle: () => of('ok') } as any;

    await expect(interceptor.intercept(ctx as any, next as any)).rejects.toThrow(
      BadRequestException,
    );
  });
});
