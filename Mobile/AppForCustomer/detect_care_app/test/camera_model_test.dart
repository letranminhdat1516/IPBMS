import 'package:detect_care_app/features/camera/models/camera_entry.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('CameraEntry Model Tests', () {
    test('Should create CameraEntry with valid data', () {
      final camera = CameraEntry(
        id: 'test-camera-1',
        name: 'Test Camera',
        url: 'rtsp://192.168.1.100/stream',
        isOnline: true,
      );

      expect(camera.id, 'test-camera-1');
      expect(camera.name, 'Test Camera');
      expect(camera.url, 'rtsp://192.168.1.100/stream');
      expect(camera.isOnline, true);
    });

    test('Should parse JSON correctly', () {
      final json = {
        'camera_id': 'test-camera-1',
        'camera_name': 'Test Camera',
        'rtsp_url': 'rtsp://192.168.1.100/stream',
        'username': 'admin',
        'password': 'password123',
        'is_online': true,
      };

      final camera = CameraEntry.fromJson(json);

      expect(camera.id, 'test-camera-1');
      expect(camera.name, 'Test Camera');
      expect(camera.url, 'rtsp://admin:password123@192.168.1.100/stream');
      expect(camera.isOnline, true);
    });

    test('Should handle null username/password', () {
      final json = {
        'camera_id': 'test-camera-2',
        'camera_name': 'No Auth Camera',
        'rtsp_url': 'rtsp://192.168.1.101/stream',
        'username': null,
        'password': null,
        'is_online': false,
      };

      final camera = CameraEntry.fromJson(json);

      expect(camera.id, 'test-camera-2');
      expect(camera.name, 'No Auth Camera');
      expect(camera.url, 'rtsp://192.168.1.101/stream');
      expect(camera.isOnline, false);
    });

    test('Should handle username only', () {
      final json = {
        'camera_id': 'test-camera-3',
        'camera_name': 'Username Only Camera',
        'rtsp_url': 'rtsp://192.168.1.102/stream',
        'username': 'user',
        'password': null,
        'is_online': true,
      };

      final camera = CameraEntry.fromJson(json);

      expect(camera.id, 'test-camera-3');
      expect(camera.name, 'Username Only Camera');
      expect(camera.url, 'rtsp://user@192.168.1.102/stream');
      expect(camera.isOnline, true);
    });

    test('Should convert to JSON correctly', () {
      final camera = CameraEntry(
        id: 'test-camera-4',
        name: 'JSON Test Camera',
        url: 'rtsp://192.168.1.103/stream',
        isOnline: true,
      );

      final json = camera.toJson();

      expect(json['camera_id'], 'test-camera-4');
      expect(json['camera_name'], 'JSON Test Camera');
      expect(json['rtsp_url'], 'rtsp://192.168.1.103/stream');
      expect(json['is_online'], true);
    });

    test('Should handle edge cases', () {
      // Test with empty strings
      final camera1 = CameraEntry(id: '', name: '', url: '', isOnline: false);

      expect(camera1.id, '');
      expect(camera1.name, '');
      expect(camera1.url, '');
      expect(camera1.isOnline, false);

      // Test with special characters in URL
      final camera2 = CameraEntry(
        id: 'special-camera',
        name: 'Special Camera',
        url: 'rtsp://user:pass@192.168.1.100:554/live/stream',
        isOnline: true,
      );

      expect(camera2.url, 'rtsp://user:pass@192.168.1.100:554/live/stream');
    });
  });
}
