import 'package:flutter_test/flutter_test.dart';
import 'package:detect_care_app/core/models/settings.dart';

void main() {
  group('Household Setup Flow Integration Tests', () {
    test('Image Settings Model - Serialization and Deserialization', () {
      // Arrange
      final imageSettings = ImageSettings(
        monitoringMode: 'Giám sát nâng cao',
        duration: '30 minute',
        frameCount: '10 frame',
        imageQuality: 'Medium (1080p)',
        enableImageSaving: true,
        normalRetentionDays: 30,
        alertRetentionDays: 90,
      );

      // Act
      final json = imageSettings.toJson();
      final deserialized = ImageSettings.fromJson(json);

      // Assert
      expect(deserialized.monitoringMode, imageSettings.monitoringMode);
      expect(deserialized.duration, imageSettings.duration);
      expect(deserialized.frameCount, imageSettings.frameCount);
      expect(deserialized.imageQuality, imageSettings.imageQuality);
      expect(deserialized.enableImageSaving, imageSettings.enableImageSaving);
      expect(
        deserialized.normalRetentionDays,
        imageSettings.normalRetentionDays,
      );
      expect(deserialized.alertRetentionDays, imageSettings.alertRetentionDays);
    });

    test('Image Settings Model - Copy With', () {
      // Arrange
      final original = ImageSettings(
        monitoringMode: 'Giám sát nâng cao',
        duration: '30 minute',
        frameCount: '10 frame',
        imageQuality: 'Medium (1080p)',
        enableImageSaving: true,
        normalRetentionDays: 30,
        alertRetentionDays: 90,
      );

      // Act
      final copied = original.copyWith(
        monitoringMode: 'Giám sát cơ bản',
        normalRetentionDays: 60,
      );

      // Assert
      expect(copied.monitoringMode, 'Giám sát cơ bản');
      expect(copied.duration, original.duration); // unchanged
      expect(copied.normalRetentionDays, 60);
      expect(
        copied.alertRetentionDays,
        original.alertRetentionDays,
      ); // unchanged
    });

    test('Alert Settings Model - Serialization and Deserialization', () {
      // Arrange
      final alertSettings = AlertSettings(
        masterNotifications: true,
        appNotifications: true,
        emailNotifications: false,
        smsNotifications: false,
        callNotifications: false,
        deviceAlerts: true,
      );

      // Act
      final json = alertSettings.toJson();
      final deserialized = AlertSettings.fromJson(json);

      // Assert
      expect(
        deserialized.masterNotifications,
        alertSettings.masterNotifications,
      );
      expect(deserialized.appNotifications, alertSettings.appNotifications);
      expect(deserialized.emailNotifications, alertSettings.emailNotifications);
      expect(deserialized.smsNotifications, alertSettings.smsNotifications);
      expect(deserialized.callNotifications, alertSettings.callNotifications);
      expect(deserialized.deviceAlerts, alertSettings.deviceAlerts);
    });

    test('Alert Settings Model - Copy With', () {
      // Arrange
      final original = AlertSettings(
        masterNotifications: true,
        appNotifications: true,
        emailNotifications: false,
        smsNotifications: false,
        callNotifications: false,
        deviceAlerts: false,
      );

      // Act
      final copied = original.copyWith(
        emailNotifications: true,
        smsNotifications: true,
        deviceAlerts: true,
      );

      // Assert
      expect(copied.emailNotifications, true);
      expect(copied.smsNotifications, true);
      expect(copied.deviceAlerts, true);
      expect(
        copied.masterNotifications,
        original.masterNotifications,
      ); // unchanged
      expect(copied.appNotifications, original.appNotifications); // unchanged
    });

    test('Image Settings Model - Default Values from JSON', () {
      // Arrange
      final emptyJson = <String, dynamic>{};

      // Act
      final settings = ImageSettings.fromJson(emptyJson);

      // Assert
      expect(settings.monitoringMode, 'Giám sát nâng cao');
      expect(settings.duration, '30 minute');
      expect(settings.frameCount, '10 frame');
      expect(settings.imageQuality, 'Medium (1080p)');
      expect(settings.enableImageSaving, true);
      expect(settings.normalRetentionDays, 30);
      expect(settings.alertRetentionDays, 90);
    });

    test('Alert Settings Model - Default Values from JSON', () {
      // Arrange
      final emptyJson = <String, dynamic>{};

      // Act
      final settings = AlertSettings.fromJson(emptyJson);

      // Assert
      expect(settings.masterNotifications, true);
      expect(settings.appNotifications, true);
      expect(settings.emailNotifications, false);
      expect(settings.smsNotifications, false);
      expect(settings.callNotifications, false);
      expect(settings.deviceAlerts, false);
    });

    test('Image Settings Model - JSON Structure', () {
      // Arrange
      final settings = ImageSettings(
        monitoringMode: 'Test Mode',
        duration: '15 minute',
        frameCount: '5 frame',
        imageQuality: 'High (4K)',
        enableImageSaving: false,
        normalRetentionDays: 15,
        alertRetentionDays: 45,
      );

      // Act
      final json = settings.toJson();

      // Assert
      expect(json['monitoring_mode'], 'Test Mode');
      expect(json['duration'], '15 minute');
      expect(json['frame_count'], '5 frame');
      expect(json['image_quality'], 'High (4K)');
      expect(json['enable_image_saving'], false);
      expect(json['normal_retention_days'], 15);
      expect(json['alert_retention_days'], 45);
    });

    test('Alert Settings Model - JSON Structure', () {
      // Arrange
      final settings = AlertSettings(
        masterNotifications: false,
        appNotifications: false,
        emailNotifications: true,
        smsNotifications: true,
        callNotifications: true,
        deviceAlerts: true,
      );

      // Act
      final json = settings.toJson();

      // Assert
      expect(json['master_notifications'], false);
      expect(json['app_notifications'], false);
      expect(json['email_notifications'], true);
      expect(json['sms_notifications'], true);
      expect(json['call_notifications'], true);
      expect(json['device_alerts'], true);
    });
  });
}
