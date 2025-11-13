import 'package:flutter_test/flutter_test.dart';
import 'package:detect_care_app/features/camera/models/camera_entry.dart';

void main() {
  group('CameraEntry URL Building Tests', () {
    test('Should build URL from rtsp_url when username/password are null', () {
      final json = {
        'camera_id': '22222222-2222-2222-2222-222222222201',
        'camera_name': 'Entrance Cam',
        'rtsp_url': 'rtsp://10.0.0.11/stream',
        'username': null,
        'password': null,
        'is_online': true,
      };

      final camera = CameraEntry.fromJson(json);

      expect(camera.id, '22222222-2222-2222-2222-222222222201');
      expect(camera.name, 'Entrance Cam');
      expect(camera.url, 'rtsp://10.0.0.11/stream');
      expect(camera.isOnline, true);
    });

    test(
      'Should build authenticated URL when username/password are provided',
      () {
        final json = {
          'camera_id': '22222222-2222-2222-2222-222222222202',
          'camera_name': 'Living Room Cam',
          'rtsp_url': 'rtsp://192.168.1.100:554/stream',
          'username': 'admin',
          'password': 'password123',
          'is_online': true,
        };

        final camera = CameraEntry.fromJson(json);

        expect(camera.id, '22222222-2222-2222-2222-222222222202');
        expect(camera.name, 'Living Room Cam');
        expect(camera.url, 'rtsp://admin:password123@192.168.1.100:554/stream');
        expect(camera.isOnline, true);
      },
    );

    test('Should build URL with username only when password is null', () {
      final json = {
        'camera_id': '22222222-2222-2222-2222-222222222203',
        'camera_name': 'Hall Cam',
        'rtsp_url': 'rtsp://10.0.0.13/stream',
        'username': 'user',
        'password': null,
        'is_online': false,
      };

      final camera = CameraEntry.fromJson(json);

      expect(camera.id, '22222222-2222-2222-2222-222222222203');
      expect(camera.name, 'Hall Cam');
      expect(camera.url, 'rtsp://user@10.0.0.13/stream');
      expect(camera.isOnline, false);
    });

    test('Should use existing url field when provided', () {
      final json = {
        'camera_id': '22222222-2222-2222-2222-222222222204',
        'camera_name': 'Custom Cam',
        'url': 'rtsp://custom:pass@camera.local/stream',
        'rtsp_url': 'rtsp://10.0.0.14/stream',
        'username': 'admin',
        'password': 'admin',
        'is_online': true,
      };

      final camera = CameraEntry.fromJson(json);

      expect(camera.id, '22222222-2222-2222-2222-222222222204');
      expect(camera.name, 'Custom Cam');
      expect(camera.url, 'rtsp://custom:pass@camera.local/stream');
      expect(camera.isOnline, true);
    });
  });
}
