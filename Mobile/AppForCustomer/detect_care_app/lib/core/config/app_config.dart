import 'package:flutter_dotenv/flutter_dotenv.dart';

Map<String, String> _safeEnv() {
  try {
    return dotenv.env;
  } catch (_) {
    // flutter_dotenv throws NotInitializedError when dotenv.load wasn't called.
    return <String, String>{};
  }
}

class AppConfig {
  // Base REST API endpoint, e.g. https://example.com/api
  static String get apiBaseUrl => _safeEnv()['API_BASE_URL'] ?? '';
  static String get wsBaseUrl =>
      _safeEnv()['WS_BASE_URL'] ?? 'ws://192.168.8.122:9999';
  static String get flavor => _safeEnv()['FLAVOR'] ?? 'development';
  static String get supabaseUrl => _safeEnv()['SUPABASE_URL'] ?? '';
  static String get supabaseKey => _safeEnv()['SUPABASE_KEY'] ?? '';

  // WebSocket endpoint, e.g. wss://example.com/socket
  static String get socketUrl => _safeEnv()['URL_SOCKET'] ?? '';

  // Optional logs API URL, e.g. https://host/api/logs
  static String? get logsUrl => dotenv.env['LOGS_URL'];

  // Whether to use custom notification sounds packaged in app (Android/iOS)
  static bool get useCustomNotificationSounds =>
      (_safeEnv()['USE_CUSTOM_NOTIFICATION_SOUNDS'] ?? 'false').toLowerCase() ==
      'true';

  // Whether to log HTTP requests/responses (masked), enabled by default on non-production
  static bool get logHttpRequests {
    final v = (_safeEnv()['HTTP_DEBUG'] ?? '').toLowerCase();
    if (v == 'true') return true;
    if (v == 'false') return false;
    return flavor.toLowerCase() != 'production';
  }

  // Cloudinary configuration (optional)
  static String? get cloudinaryCloudName => _safeEnv()['CLOUDINARY_CLOUD_NAME'];
  static String? get cloudinaryUploadPreset =>
      _safeEnv()['CLOUDINARY_UPLOAD_PRESET'];

  // Activity logging configuration
  static bool get activityLogEnabled =>
      (_safeEnv()['ACTIVITY_LOG_ENABLED'] ?? 'false').toLowerCase() == 'true';
}
