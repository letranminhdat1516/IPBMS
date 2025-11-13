import 'package:detect_care_app/features/auth/data/auth_storage.dart';
import 'package:detect_care_app/firebase_options.dart';
import 'package:detect_care_app/services/push_service.dart';
import 'package:detect_care_app/core/alerts/alert_coordinator.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:detect_care_app/core/utils/logger.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// Quản lý thông báo và push notifications cho ứng dụng y tế
/// Xử lý Firebase FCM, local notifications và Supabase realtime
class NotificationManager {
  static final NotificationManager _instance = NotificationManager._internal();

  /// Singleton instance để đảm bảo chỉ có một instance duy nhất
  factory NotificationManager() => _instance;

  NotificationManager._internal();

  // Core services
  final FlutterLocalNotificationsPlugin _localNotifications =
      FlutterLocalNotificationsPlugin();
  FirebaseMessaging? _fcm;
  final SupabaseClient _supabase = Supabase.instance.client;

  // State management
  bool _isFirebaseReady = false;
  bool _isInitialized = false;

  // Notification ID counter để tránh duplicate
  static int _notificationIdCounter = 1000;

  // Notification channel constants cho healthcare
  static const String _channelId = 'healthcare_alerts';
  static const String _channelName = 'Cảnh báo Y tế';
  static const String _channelDesc =
      'Thông báo cảnh báo y tế và sự kiện khẩn cấp';

  /// Generate unique notification ID
  static int _generateNotificationId() {
    _notificationIdCounter = (_notificationIdCounter + 1) % 999999;
    return _notificationIdCounter;
  }

  /// Khởi tạo tất cả các dịch vụ thông báo
  /// Nên gọi một lần khi app khởi động
  Future<void> initialize() async {
    if (_isInitialized) {
      AppLogger.i('ℹ️ NotificationManager đã được khởi tạo');
      return;
    }

    try {
      AppLogger.i('🚀 Đang khởi tạo NotificationManager...');

      // 1. Thiết lập thông báo cục bộ
      await _setupLocalNotifications();
      debugPrint('✅ Thông báo cục bộ đã sẵn sàng');

      // 2. Thiết lập Firebase Cloud Messaging
      await _setupFCM();
      debugPrint('✅ FCM đã sẵn sàng');

      // 3. Thiết lập Supabase realtime cho sự kiện foreground
      _setupSupabaseRealtime();
      debugPrint('✅ Supabase realtime đã sẵn sàng');

      _isInitialized = true;
      debugPrint('🎉 NotificationManager khởi tạo thành công');
    } catch (e, stackTrace) {
      debugPrint('❌ Lỗi khởi tạo NotificationManager: $e');
      debugPrint('📋 Stack trace: $stackTrace');
      _isFirebaseReady = false;
      rethrow;
    }
  }

  /// Thiết lập thông báo cục bộ cho Android và iOS
  Future<void> _setupLocalNotifications() async {
    try {
      const androidSettings = AndroidInitializationSettings(
        '@mipmap/ic_launcher',
      );
      const iosSettings = DarwinInitializationSettings(
        requestAlertPermission: true,
        requestBadgePermission: true,
        requestSoundPermission: true,
      );

      final initializationSettings = InitializationSettings(
        android: androidSettings,
        iOS: iosSettings,
      );

      final initialized = await _localNotifications.initialize(
        initializationSettings,
        onDidReceiveNotificationResponse: _onNotificationTapped,
        onDidReceiveBackgroundNotificationResponse:
            _onBackgroundNotificationTapped,
      );

      if (initialized == false) {
        AppLogger.w('⚠️ Không thể khởi tạo local notifications');
        return;
      }

      // Tạo notification channel cho Android
      await _createNotificationChannel();

      AppLogger.i('📱 Local notifications đã được cấu hình');
    } catch (e) {
      AppLogger.e('❌ Lỗi thiết lập local notifications: $e', e);
      rethrow;
    }
  }

  /// Xử lý khi user tap vào notification trong foreground
  void _onNotificationTapped(NotificationResponse response) {
    AppLogger.i('👆 User tapped notification: ${response.payload}');
    // TODO: Navigate to appropriate screen based on notification type
  }

  /// Xử lý khi user tap vào notification trong background
  @pragma('vm:entry-point')
  static void _onBackgroundNotificationTapped(NotificationResponse response) {
    AppLogger.i('👆 Background notification tapped: ${response.payload}');
    // TODO: Handle background notification tap
  }

  /// Tạo notification channel cho Android với các thiết lập ưu tiên
  Future<void> _createNotificationChannel() async {
    final androidChannel = AndroidNotificationChannel(
      _channelId,
      _channelName,
      description: _channelDesc,
      importance: Importance.max,
      enableVibration: true,
      enableLights: true,
      ledColor: const Color(0xFFFF0000), // Đỏ cho cảnh báo khẩn cấp
      vibrationPattern: Int64List.fromList([0, 500, 200, 500, 200, 500]),
      sound: const RawResourceAndroidNotificationSound(
        'notification_emergency',
      ),
    );

    await _localNotifications
        .resolvePlatformSpecificImplementation<
          AndroidFlutterLocalNotificationsPlugin
        >()
        ?.createNotificationChannel(androidChannel);
  }

  /// Thiết lập Firebase Cloud Messaging
  Future<void> _setupFCM() async {
    try {
      // Khởi tạo Firebase nếu chưa sẵn sàng
      if (!_isFirebaseReady) {
        await Firebase.initializeApp(
          options: DefaultFirebaseOptions.currentPlatform,
        );
        _isFirebaseReady = true;
        AppLogger.i('🔥 Firebase đã khởi tạo thành công');
      }

      // Khởi tạo FCM
      _fcm = FirebaseMessaging.instance;
      AppLogger.i('📱 FCM instance đã tạo');

      // Yêu cầu quyền thông báo
      final settings = await _fcm?.requestPermission(
        alert: true,
        badge: true,
        sound: true,
      );

      if (settings?.authorizationStatus == AuthorizationStatus.authorized) {
        AppLogger.i('✅ Quyền thông báo đã được cấp');
      } else {
        AppLogger.w('⚠️ Quyền thông báo bị từ chối');
        return;
      }

      Future.delayed(Duration.zero, () => _registerDeviceToken());

      _fcm?.onTokenRefresh.listen((newToken) {
        try {
          AppLogger.d(
            '� FCM Token đã làm mới: ${newToken.substring(0, 10)}...',
          );
        } catch (_) {}
        Future.microtask(() => _registerDeviceToken());
      });

      // Background message handler is registered in main.dart as a
      // top-level background handler. Do NOT register another handler here
      // because FirebaseMessaging supports only a single background handler
      // and registering multiple handlers can lead to unexpected behaviour.
      AppLogger.d(
        '🔄 Skipping background handler registration here (handled in main)',
      );

      // Xử lý khi app được mở từ notification
      FirebaseMessaging.onMessageOpenedApp.listen(_handleBackgroundMessage);
      AppLogger.i('🎯 App open từ notification handler đã đăng ký');

      // Xử lý foreground messages
      FirebaseMessaging.onMessage.listen(_handleForegroundMessage);
      AppLogger.i('📨 Foreground message handler đã đăng ký');
    } catch (e) {
      AppLogger.e('❌ Lỗi thiết lập FCM: $e', e);
      _isFirebaseReady = false;
    }
  }

  /// Đăng ký FCM token với backend
  Future<void> _registerDeviceToken() async {
    try {
      final token = await _fcm?.getToken();
      if (token == null) {
        AppLogger.w('❌ FCM token rỗng');
        return;
      }

      AppLogger.d('� FCM Token đã nhận: ${token.substring(0, 10)}...');

      // Đăng ký token với BE chỉ khi user đã xác thực
      final userId = await AuthStorage.getUserId();
      final jwt = await AuthStorage.getAccessToken();

      if (userId != null && jwt != null) {
        await PushService.registerDeviceToken(userId: userId, jwt: jwt);
        AppLogger.i('✅ FCM token đã đăng ký thành công');
      } else {
        AppLogger.d('⏳ Bỏ qua đăng ký device token - user chưa xác thực');
      }
    } catch (e) {
      AppLogger.e('❌ Lỗi đăng ký FCM token: $e', e);
    }
  }

  /// Thiết lập Supabase realtime cho sự kiện foreground
  void _setupSupabaseRealtime() {
    _supabase
        .channel('healthcare_events')
        .onPostgresChanges(
          event: PostgresChangeEvent.insert,
          schema: 'public',
          table: 'event_detections',
          callback: _handleForegroundEvent,
        )
        .subscribe();

    AppLogger.i('📡 Supabase realtime đã thiết lập');
  }

  /// Xử lý sự kiện foreground từ Supabase
  Future<void> _handleForegroundEvent(PostgresChangePayload payload) async {
    debugPrint('\n🔔 Đang xử lý thông báo foreground');

    final eventData = payload.newRecord;
    final isUrgent = _determineUrgency(eventData);

    debugPrint('├─ Loại sự kiện: ${eventData['event_type']}');
    debugPrint(
      '└─ Độ khẩn cấp: ${isUrgent ? '🚨 KHẨN CẤP' : '📝 Bình thường'}\n',
    );

    await showNotification(
      title: 'Cảnh báo Y tế',
      body: _generateNotificationBody(eventData),
      urgent: isUrgent,
      // When app is foreground we play in-app audio; avoid duplicating
      // system/local notification sound.
      playSound: false,
    );
  }

  /// Xử lý message khi app được mở từ background
  Future<void> _handleBackgroundMessage(RemoteMessage message) async {
    debugPrint('📲 Xử lý background message');
    await _fetchLatestEvents();
  }

  /// Xử lý foreground FCM messages
  Future<void> _handleForegroundMessage(RemoteMessage message) async {
    AppLogger.i('📨 Nhận foreground FCM message');

    final data = message.data;
    if (data.isNotEmpty) {
      // Sử dụng AlertCoordinator để hiển thị modal alert
      final entry = AlertCoordinator.fromData(data);
      AlertCoordinator.handle(entry);

      // Vẫn hiển thị local notification
      final status = data['status']?.toString();

      await showNotification(
        title: message.notification?.title ?? 'Cảnh báo Y tế',
        body: message.notification?.body ?? 'Đã phát hiện sự kiện y tế',
        urgent: status == 'critical' || status == 'danger',
        playSound: false,
      );
    }
  }

  /// Hiển thị thông báo cục bộ
  Future<void> showNotification({
    required String title,
    required String body,
    bool urgent = false,
    bool playSound = true,
  }) async {
    try {
      final soundName = urgent
          ? 'notification_emergency'
          : 'notification_default';

      final androidDetails = AndroidNotificationDetails(
        _channelId,
        _channelName,
        channelDescription: _channelDesc,
        importance: Importance.max,
        priority: Priority.high,
        sound: playSound
            ? RawResourceAndroidNotificationSound(soundName)
            : null,
        playSound: playSound,
        enableVibration: true,
        vibrationPattern: Int64List.fromList([0, 500, 200, 500]),
        ledColor: urgent ? const Color(0xFFFF0000) : null,
        ledOnMs: urgent ? 1000 : null,
        ledOffMs: urgent ? 500 : null,
      );

      final iosDetails = DarwinNotificationDetails(
        sound: playSound ? '$soundName.mp3' : null,
        presentSound: playSound,
        presentAlert: true,
        presentBadge: true,
      );

      await _localNotifications.show(
        _generateNotificationId(),
        title,
        body,
        NotificationDetails(android: androidDetails, iOS: iosDetails),
      );

      // Haptic feedback cho thông báo khẩn cấp
      if (urgent) {
        await HapticFeedback.vibrate();
        await HapticFeedback.heavyImpact();
      }

      AppLogger.i('🔔 Thông báo đã hiển thị: $title');
    } catch (e) {
      AppLogger.e('❌ Lỗi hiển thị thông báo: $e', e);
    }
  }

  /// Xác định độ khẩn cấp của sự kiện
  bool _determineUrgency(Map<String, dynamic> eventData) {
    final eventType = eventData['event_type'] as String?;
    final confidenceScore = eventData['confidence_score'] as num?;

    return eventType == 'FALL_DETECTION' ||
        (confidenceScore != null && confidenceScore > 0.85);
  }

  /// Tạo nội dung thông báo từ dữ liệu sự kiện
  String _generateNotificationBody(Map<String, dynamic> eventData) {
    final eventType = eventData['event_type'] as String? ?? 'UNKNOWN';
    return 'Đã phát hiện sự kiện: $eventType';
  }

  /// Lấy các sự kiện gần nhất từ database
  Future<void> _fetchLatestEvents() async {
    try {
      await _supabase
          .from('event_detections')
          .select()
          .order('created_at', ascending: false)
          .limit(1)
          .single();
    } catch (e) {
      AppLogger.e('❌ Lỗi lấy sự kiện gần nhất: $e', e);
    }
  }

  /// Đăng ký device token sau khi user xác thực
  /// Gọi method này sau khi login thành công
  Future<void> registerDeviceTokenAfterAuth() async {
    if (!_isFirebaseReady || _fcm == null) {
      AppLogger.w('⚠️ Firebase chưa sẵn sàng, không thể đăng ký device token');
      return;
    }

    try {
      final token = await _fcm?.getToken();
      if (token != null) {
        final userId = await AuthStorage.getUserId();
        final jwt = await AuthStorage.getAccessToken();

        if (userId != null && jwt != null) {
          AppLogger.i('📤 Đang đăng ký device token sau xác thực...');
          await PushService.registerDeviceToken(userId: userId, jwt: jwt);
          AppLogger.i('✅ Device token đã đăng ký thành công');
        } else {
          AppLogger.w(
            '⚠️ Không thể đăng ký device token - thiếu userId hoặc jwt',
          );
        }
      }
    } catch (e) {
      AppLogger.e('❌ Lỗi đăng ký device token sau xác thực: $e', e);
    }
  }

  /// Debug method để kiểm tra trạng thái FCM
  Future<void> debugFCMStatus() async {
    try {
      AppLogger.d('🔍 === FCM DEBUG INFO ===');

      // Kiểm tra Firebase ready
      AppLogger.d('Firebase ready: $_isFirebaseReady');

      // Kiểm tra FCM instance
      AppLogger.d('FCM instance: ${_fcm != null ? 'OK' : 'NULL'}');

      if (_fcm != null) {
        // Lấy token hiện tại
        final token = await _fcm!.getToken();
        AppLogger.d('Current FCM token: ${token?.substring(0, 20)}...');

        // Kiểm tra permission
        final settings = await _fcm!.getNotificationSettings();
        AppLogger.d('Notification permission: ${settings.authorizationStatus}');

        // Kiểm tra user auth status
        final userId = await AuthStorage.getUserId();
        final jwt = await AuthStorage.getAccessToken();
        AppLogger.d('User authenticated: ${userId != null && jwt != null}');
        AppLogger.d('User ID: $userId');
        AppLogger.d('JWT exists: ${jwt != null}');
      }

      AppLogger.d('=== END FCM DEBUG ===');
    } catch (e) {
      AppLogger.e('❌ FCM Debug error: $e', e);
    }
  }

  /// Xử lý khi app được mở do người dùng bấm vào thông báo (background/killed)
  Future<void> setupFcmTapHandler() async {
    // Khi app đang background, user bấm vào notif
    FirebaseMessaging.onMessageOpenedApp.listen((message) {
      AppLogger.i('📲 App opened from FCM tap (background)');
      if (message.data.isNotEmpty) {
        final entry = AlertCoordinator.fromData(message.data);
        WidgetsBinding.instance.addPostFrameCallback((_) {
          AlertCoordinator.handle(entry);
        });
      }
    });

    // Khi app bị kill, user bấm notif để mở
    final initial = await FirebaseMessaging.instance.getInitialMessage();
    if (initial != null && initial.data.isNotEmpty) {
      AppLogger.i('📲 App opened from FCM tap (terminated)');
      final entry = AlertCoordinator.fromData(initial.data);
      WidgetsBinding.instance.addPostFrameCallback((_) {
        AlertCoordinator.handle(entry);
      });
    }
  }

  /// Kiểm tra trạng thái khởi tảo
  ///
  bool get isInitialized => _isInitialized;

  /// Kiểm tra trạng thái Firebase
  bool get isFirebaseReady => _isFirebaseReady;
}

/// Firebase background message handler
@pragma('vm:entry-point')
Future<void> _firebaseBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);

  final notificationManager = NotificationManager();
  await notificationManager.showNotification(
    title: message.notification?.title ?? 'Cảnh báo Mới',
    body: message.notification?.body ?? 'Đã phát hiện sự kiện y tế mới',
    urgent: message.data['urgent'] == 'true',
  );
}
