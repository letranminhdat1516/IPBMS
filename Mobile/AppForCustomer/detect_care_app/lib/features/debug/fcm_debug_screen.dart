import 'package:detect_care_app/services/notification_manager.dart';
import 'package:detect_care_app/services/push_service.dart';
import 'package:detect_care_app/features/auth/data/auth_storage.dart';
import 'package:flutter/material.dart';

class FCMDebugScreen extends StatefulWidget {
  const FCMDebugScreen({super.key});

  @override
  State<FCMDebugScreen> createState() => _FCMDebugScreenState();
}

class _FCMDebugScreenState extends State<FCMDebugScreen> {
  String _debugInfo = 'Chưa có thông tin debug';
  bool _isLoading = false;

  Future<void> _runDebug() async {
    setState(() => _isLoading = true);

    try {
      final debugLines = <String>[];

      // 1. Kiểm tra NotificationManager
      debugLines.add('=== NOTIFICATION MANAGER DEBUG ===');
      final notifManager = NotificationManager();
      await notifManager.debugFCMStatus();

      // 2. Kiểm tra Auth Storage
      debugLines.add('\n=== AUTH STORAGE DEBUG ===');
      final userId = await AuthStorage.getUserId();
      final jwt = await AuthStorage.getAccessToken();
      debugLines.add('User ID: $userId');
      debugLines.add('JWT exists: ${jwt != null}');
      debugLines.add('JWT length: ${jwt?.length ?? 0}');

      // 3. Thử đăng ký token manual
      debugLines.add('\n=== MANUAL TOKEN REGISTRATION ===');
      if (userId != null && jwt != null) {
        debugLines.add('Đang thử đăng ký token...');
        await PushService.registerDeviceToken(userId: userId, jwt: jwt);
        debugLines.add('Đăng ký token hoàn thành');
      } else {
        debugLines.add('Không thể đăng ký: thiếu userId hoặc JWT');
      }

      setState(() {
        _debugInfo = debugLines.join('\n');
      });
    } catch (e) {
      setState(() {
        _debugInfo = 'Lỗi: $e';
      });
    } finally {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('FCM Debug')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            ElevatedButton(
              onPressed: _isLoading ? null : _runDebug,
              child: _isLoading
                  ? const CircularProgressIndicator()
                  : const Text('Chạy Debug FCM'),
            ),
            const SizedBox(height: 20),
            Expanded(
              child: SingleChildScrollView(
                child: Text(
                  _debugInfo,
                  style: const TextStyle(fontFamily: 'monospace'),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
