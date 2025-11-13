import helpers, { SHARED_PERMISSIONS_EXAMPLE } from '../src/application/utils/shared-permissions';

describe('shared-permissions helpers', () => {
  test('validate example is valid', () => {
    const res = helpers.validateSharedPermissions(SHARED_PERMISSIONS_EXAMPLE);
    expect(res.valid).toBe(true);
    expect(res.errors.length).toBe(0);
  });

  test('normalize returns expected shape', () => {
    const raw: any = {
      'stream:view': 'true',
      'alert:read': true,
      'alert:ack': 'false',
      log_access_days: '10',
      report_access_days: 15.9,
      notification_channel: ['push', 'sms', 'push'],
      extra_flag: 'cool',
    };

    const n = helpers.normalizeSharedPermissions(raw)!;
    expect(n['stream:view']).toBe(true);
    expect(n['alert:ack']).toBe(false);
    expect(n.log_access_days).toBe(10);
    expect(n.report_access_days).toBe(15);
    expect(n.notification_channel).toEqual(['push', 'sms']);
    expect(n.extra_flag).toBe('cool');
  });

  test('hasBooleanPermission works', () => {
    const s = { 'alert:read': true } as any;
    expect(helpers.hasBooleanPermission(s, 'alert:read')).toBe(true);
    expect(helpers.hasBooleanPermission(s, 'alert:ack')).toBe(false);
  });

  test('retention days parsing', () => {
    const s = { log_access_days: '7', report_access_days: 0 } as any;
    expect(helpers.getRetentionDays(s, 'log_access_days')).toBe(7);
    expect(helpers.getRetentionDays(s, 'report_access_days')).toBe(0);
  });

  test('notification channels', () => {
    const s = { notification_channel: ['call'] } as any;
    expect(helpers.hasNotificationChannel(s, 'call')).toBe(true);
    expect(helpers.hasNotificationChannel(s, 'sms')).toBe(false);
  });
});
