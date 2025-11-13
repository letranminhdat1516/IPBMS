import { getEventSeverity, getNotificationType, mapEventTypeToAlertType } from '../src/shared';

describe('event-notification.utils', () => {
  describe('mapEventTypeToAlertType', () => {
    it('maps known event types correctly', () => {
      expect(mapEventTypeToAlertType('fall_detection')).toBe('emergency');
      expect(mapEventTypeToAlertType('abnormal_behavior')).toBe('warning');
      expect(mapEventTypeToAlertType('medication_reminder')).toBe('medication_reminder');
    });

    it('returns default for unknown types', () => {
      expect(mapEventTypeToAlertType('unknown_event')).toBe('warning');
    });
  });

  describe('getEventSeverity', () => {
    it('maps severity correctly', () => {
      expect(getEventSeverity('fall')).toBe('critical');
      expect(getEventSeverity('abnormal_behavior')).toBe('high');
      expect(getEventSeverity('normal_activity')).toBe('low');
    });

    it('returns medium for unknown types', () => {
      expect(getEventSeverity('something_else')).toBe('medium');
    });
  });

  describe('getNotificationType', () => {
    it('maps notification types correctly', () => {
      expect(getNotificationType('fall_detection')).toBe('push');
      expect(getNotificationType('normal_activity')).toBe('in_app');
      expect(getNotificationType('medication_reminder')).toBe('push');
    });

    it('defaults to in_app for unknown types', () => {
      expect(getNotificationType('weird')).toBe('in_app');
    });
  });
});
