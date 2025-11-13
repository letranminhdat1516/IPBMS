import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EmailTemplateService } from '@/application/services/notifications/email-template.service';

describe('EmailTemplateService (unit)', () => {
  let svc: EmailTemplateService;

  beforeEach(() => {
    // Provide minimal mocks for constructor dependencies
    const mockPrisma = {} as any;
    const mockModuleRef = { get: jest.fn() } as any;
    svc = new EmailTemplateService(mockPrisma, mockModuleRef);
  });

  describe('extractTemplateVariables', () => {
    it('should extract simple variables', () => {
      const tpl = 'Hello {{userName}}, welcome to {{appName}}!';
      const vars = (svc as any).extractTemplateVariables(tpl);
      expect(vars.sort()).toEqual(['appName', 'userName'].sort());
    });

    it('should extract nested and dashed variables', () => {
      const tpl = 'Patient: {{patient.name}} - Note: {{meta-note}}';
      const vars = (svc as any).extractTemplateVariables(tpl);
      expect(vars.sort()).toEqual(['patient.name', 'meta-note'].sort());
    });
  });

  describe('interpolate', () => {
    it('should interpolate nested variables', () => {
      const tpl = 'Hello {{patient.name}}, time {{appointment.time}}';
      const out = (svc as any).interpolate(tpl, {
        patient: { name: 'A' },
        appointment: { time: '9:00' },
      });
      expect(out).toContain('Hello A');
      expect(out).toContain('9:00');
    });

    it('should throw when variables are missing (Vietnamese message)', () => {
      const tpl = 'Hello {{patient.name}}, code {{code}}';
      try {
        (svc as any).interpolate(tpl, { patient: { name: 'A' } });
        // should not reach
        throw new Error('Expected interpolate to throw');
      } catch (err: any) {
        expect(err).toBeInstanceOf(BadRequestException);
        expect(err.message).toMatch(/Thiếu biến bắt buộc/);
        expect(err.message).toMatch(/code/);
      }
    });
  });

  describe('renderTemplateById (public wrapper around findOne/interpolate)', () => {
    it('should render using findOne stub', async () => {
      const tplObj = {
        id: 'x',
        subject_template: 'Hi {{a}}',
        html_template: '<p>{{a}}</p>',
        text_template: 't {{a}}',
      } as any;

      // stub findOne
      (svc as any).findOne = jest.fn().mockResolvedValue(tplObj);

      const rendered = await svc.renderTemplateById('x', { a: 'ok' });
      expect(rendered.subject).toBe('Hi ok');
      expect(rendered.html).toBe('<p>ok</p>');
      expect(rendered.text).toBe('t ok');
    });

    it('should throw a VN message when findOne not found', async () => {
      (svc as any).findOne = jest
        .fn()
        .mockRejectedValue(new NotFoundException(`Không tìm thấy mẫu email với ID nope`));
      await expect(svc.renderTemplateById('nope', {})).rejects.toThrow(
        /Không tìm thấy mẫu email với ID/,
      );
    });
  });

  describe('create()', () => {
    it('should auto-populate variables when omitted', async () => {
      const mockPrisma: any = { mail_templates: { create: jest.fn().mockResolvedValue(true) } };
      const mockModuleRef = { get: jest.fn() } as any;
      const service = new EmailTemplateService(mockPrisma, mockModuleRef);

      const dto: any = {
        name: 'T1',
        type: 'test_type',
        subject_template: 'Hi {{a}}',
        html_template: '<p>{{b}}</p>',
      };

      await service.create(dto);

      expect(mockPrisma.mail_templates.create).toHaveBeenCalled();
      const calledWith = mockPrisma.mail_templates.create.mock.calls[0][0].data;
      expect(calledWith.variables.sort()).toEqual(['a', 'b'].sort());
    });

    it('should throw VN error when provided variables miss used ones', async () => {
      const mockPrisma: any = { mail_templates: { create: jest.fn() } };
      const mockModuleRef = { get: jest.fn() } as any;
      const service = new EmailTemplateService(mockPrisma, mockModuleRef);

      const dto: any = {
        name: 'T2',
        type: 'test_type',
        subject_template: 'Hello {{x}} {{y}}',
        html_template: '<p>{{x}}</p>',
        variables: ['x'],
      };

      await expect(service.create(dto)).rejects.toThrow(/Danh sách biến truyền vào/);
    });

    it('should accept provided variables when they match used ones', async () => {
      const mockPrisma: any = {
        mail_templates: { create: jest.fn().mockResolvedValue({ ok: true }) },
      };
      const mockModuleRef = { get: jest.fn() } as any;
      const service = new EmailTemplateService(mockPrisma, mockModuleRef);

      const dto: any = {
        name: 'T3',
        type: 'test_type',
        subject_template: 'Hello {{x}}',
        html_template: '<p>{{x}}</p>',
        variables: ['x'],
      };

      const res = await service.create(dto);
      expect(mockPrisma.mail_templates.create).toHaveBeenCalled();
      expect(res).toEqual({ ok: true });
    });
  });
});
