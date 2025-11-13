import 'package:detect_care_app/core/config/app_config.dart';
import 'package:detect_care_app/core/data/consent_remote_data_source.dart';
import 'package:detect_care_app/core/data/settings_remote_data_source.dart'
    as core_ds;
import 'package:detect_care_app/core/network/api_client.dart';
import 'package:detect_care_app/core/providers/consent_provider.dart';
import 'package:detect_care_app/core/providers/theme_provider.dart';
import 'package:detect_care_app/core/services/audit_service.dart';
import 'package:detect_care_app/core/services/device_health_service.dart';
import 'package:detect_care_app/core/utils/app_lifecycle.dart';
import 'package:detect_care_app/core/utils/deep_link_handler.dart';
import 'package:detect_care_app/features/activity/providers/activity_provider.dart';
import 'package:detect_care_app/features/assignments/screens/assignments_screen.dart';
import 'package:detect_care_app/features/auth/data/auth_endpoints.dart';
import 'package:detect_care_app/features/auth/data/auth_remote_data_source.dart';
import 'package:detect_care_app/features/auth/data/auth_storage.dart';
import 'package:detect_care_app/features/auth/providers/auth_provider.dart';
import 'package:detect_care_app/features/auth/repositories/auth_repository.dart';
import 'package:detect_care_app/features/camera_error_ticket/camera_error_ticket_screen.dart';
import 'package:detect_care_app/features/caregiver/screens/add_caregiver_screen.dart';
import 'package:detect_care_app/features/caregiver/screens/caregiver_list_screen.dart';
import 'package:detect_care_app/features/caregiver/screens/caregiver_management_screen.dart';
import 'package:detect_care_app/features/fcm/data/fcm_endpoints.dart';
import 'package:detect_care_app/features/fcm/data/fcm_remote_data_source.dart';
import 'package:detect_care_app/features/fcm/services/fcm_registration.dart';
import 'package:detect_care_app/features/health_overview/data/health_overview_endpoints.dart';
import 'package:detect_care_app/features/health_overview/data/health_overview_remote_data_source.dart';
import 'package:detect_care_app/features/health_overview/data/health_overview_repository_impl.dart';
import 'package:detect_care_app/features/health_overview/providers/health_overview_provider.dart';
import 'package:detect_care_app/features/patient/models/medical_info.dart';
import 'package:detect_care_app/features/patient/screens/patient_profile_screen.dart';
import 'package:detect_care_app/features/patient/screens/update_patient_info_screen.dart';
import 'package:detect_care_app/features/setting/data/image_settings_remote_data_source.dart';
import 'package:detect_care_app/features/setting/data/settings_endpoints.dart';
import 'package:detect_care_app/features/setting/data/settings_remote_data_source.dart';
import 'package:detect_care_app/features/setting/data/settings_repository_impl.dart';
import 'package:detect_care_app/features/setting/providers/alert_settings_provider.dart';
import 'package:detect_care_app/features/setting/providers/image_settings_provider.dart';
import 'package:detect_care_app/features/setting/providers/settings_provider.dart';
import 'package:detect_care_app/features/setting/screens/settings_screen.dart';
import 'package:detect_care_app/features/setup/screens/household_setup_screen.dart';
import 'package:detect_care_app/features/shared_permissions/data/shared_permissions_remote_data_source.dart';
import 'package:detect_care_app/features/shared_permissions/providers/invitations_provider.dart';
import 'package:detect_care_app/features/subscription/stores/subscription_store.dart';
import 'package:detect_care_app/firebase_options.dart';
import 'package:detect_care_app/services/notification_manager.dart';
import 'package:detect_care_app/widgets/auth_gate.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

@pragma('vm:entry-point')
Future<void> firebaseBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
  // Background isolate: use a minimal local notifications initialization
  // to ensure notifications are displayed even when the main isolate
  // hasn't initialized NotificationManager.
  final FlutterLocalNotificationsPlugin flnp =
      FlutterLocalNotificationsPlugin();

  const AndroidInitializationSettings androidInit =
      AndroidInitializationSettings('@mipmap/ic_launcher');
  const DarwinInitializationSettings iosInit = DarwinInitializationSettings();
  final InitializationSettings initSettings = InitializationSettings(
    android: androidInit,
    iOS: iosInit,
  );

  try {
    await flnp.initialize(initSettings);

    // Tạo notification channel cho Android trước khi hiển thị notification
    const String channelId = 'healthcare_alerts';
    const String channelName = 'Cảnh báo Y tế';
    const String channelDesc = 'Thông báo cảnh báo y tế và sự kiện khẩn cấp';

    final AndroidNotificationChannel androidChannel =
        AndroidNotificationChannel(
          channelId,
          channelName,
          description: channelDesc,
          importance: Importance.max,
          enableVibration: true,
          enableLights: true,
          ledColor: Color(0xFFFF0000), // Đỏ cho cảnh báo khẩn cấp
          vibrationPattern: Int64List.fromList([0, 500, 200, 500, 200, 500]),
          sound: RawResourceAndroidNotificationSound('notification_emergency'),
        );

    await flnp
        .resolvePlatformSpecificImplementation<
          AndroidFlutterLocalNotificationsPlugin
        >()
        ?.createNotificationChannel(androidChannel);

    const AndroidNotificationDetails androidDetails =
        AndroidNotificationDetails(
          channelId,
          channelName,
          channelDescription: channelDesc,
          importance: Importance.max,
          priority: Priority.high,
          sound: RawResourceAndroidNotificationSound('notification_emergency'),
          playSound: true,
        );

    const DarwinNotificationDetails iosDetails = DarwinNotificationDetails(
      sound: 'notification_emergency.mp3',
      presentSound: true,
      presentAlert: true,
      presentBadge: true,
    );

    await flnp.show(
      DateTime.now().millisecondsSinceEpoch.remainder(100000),
      message.notification?.title ?? 'New Alert',
      message.notification?.body ?? 'New healthcare event detected',
      const NotificationDetails(android: androidDetails, iOS: iosDetails),
    );
  } catch (e) {
    debugPrint('❌ Background notification failed: $e');
  }
}

// FCM wiring để show modal khi app mở từ notif (background/killed) - ĐÃ CHUYỂN VÀO NOTIFICATION MANAGER
// Future<void> _wireUpFcmModal() async {
//   // Foreground: nhận tin -> show modal (dựa vào data payload)
//   FirebaseMessaging.onMessage.listen((m) {
//     if (m.data.isNotEmpty) {
//       final entry = AlertCoordinator.fromData(m.data);
//       AlertCoordinator.handle(entry);
//     }
//   });

//   // App mở từ background do user bấm notif
//   FirebaseMessaging.onMessageOpenedApp.listen((m) {
//     if (m.data.isNotEmpty) {
//       final entry = AlertCoordinator.fromData(m.data);
//       WidgetsBinding.instance.addPostFrameCallback((_) {
//         AlertCoordinator.handle(entry);
//       });
//     }
//   });

//   // App mở từ trạng thái terminated bằng notif
//   final initial = await FirebaseMessaging.instance.getInitialMessage();
//   if (initial != null && initial.data.isNotEmpty) {
//     final entry = AlertCoordinator.fromData(initial.data);
//     WidgetsBinding.instance.addPostFrameCallback((_) {
//       AlertCoordinator.handle(entry);
//     });
//   }
// }

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  AppLifecycle.init();

  try {
    // 1) ENV
    const envFile = String.fromEnvironment(
      'ENV_FILE',
      defaultValue: '.env.dev',
    );
    await dotenv.load(fileName: envFile);
    debugPrint('📝 Environment loaded ($envFile)');
    try {
      final cloud = dotenv.env['CLOUDINARY_CLOUD_NAME'];
      final preset = dotenv.env['CLOUDINARY_UPLOAD_PRESET'];
      debugPrint('[ENV] CLOUDINARY_CLOUD_NAME=${cloud ?? 'null'}');
      debugPrint('[ENV] CLOUDINARY_UPLOAD_PRESET=${preset ?? 'null'}');
      final apiBase = AppConfig.apiBaseUrl;
      debugPrint(
        '[ENV] API_BASE_URL=${apiBase.isEmpty ? 'null/empty' : apiBase}',
      );
      debugPrint('[ENV] FLAVOR=${AppConfig.flavor}');
    } catch (e) {
      debugPrint('[ENV] Error reading env keys: $e');
    }

    // 2) Firebase
    await Firebase.initializeApp(
      options: DefaultFirebaseOptions.currentPlatform,
    );
    debugPrint('🔥 Firebase initialized');

    // 3) Background handler - Đã được setup trong NotificationManager
    FirebaseMessaging.onBackgroundMessage(firebaseBackgroundHandler);
    debugPrint('🔄 Firebase background handler registered');

    // 4) Supabaser

    await Supabase.initialize(
      url: 'https://undznprwlqjpnxqsgyiv.supabase.co',
      anonKey: AppConfig.supabaseKey,
    );
    debugPrint('⚡ Supabase initialized');

    final auth = Supabase.instance.client.auth;
    if (auth.currentSession == null) {
      final email = dotenv.env['SUPABASE_DEV_EMAIL'] ?? '';
      final password = dotenv.env['SUPABASE_DEV_PASSWORD'] ?? '';
      try {
        await auth.signInWithPassword(email: email, password: password);
        debugPrint('[Supabase] signIn ok user=${auth.currentUser?.id}');
      } catch (e) {
        debugPrint('[Supabase] signIn error: $e');
      }
    }
    debugPrint('[Supabase] hasSession=${auth.currentSession != null}');

    // 5) Notification Manager
    final notificationManager = NotificationManager();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      notificationManager
          .initialize()
          .then((_) async {
            debugPrint('🔔 Notification manager initialized (deferred)');
            await notificationManager.setupFcmTapHandler();
            debugPrint('🎯 FCM tap handler registered');
          })
          .catchError((e, st) {
            debugPrint('❌ Deferred notification init failed: $e');
            if (kDebugMode) debugPrint(st.toString());
          });
    });

    // 6) Initialize new services (actual service instances are created
    // after initialization so they are available to providers passed to runApp)
  } catch (e, st) {
    debugPrint('❌ Initialization error: $e');
    debugPrint(st.toString());
  }

  // Repository & Provider setup
  // Use shared ApiClient so all internal backend calls have consistent headers
  final apiClient = ApiClient(tokenProvider: AuthStorage.getAccessToken);

  final authEndpoints = AuthEndpoints(AppConfig.apiBaseUrl);
  final authRepo = AuthRepository(
    AuthRemoteDataSource(endpoints: authEndpoints),
  );

  final hoRepo = HealthOverviewRepositoryImpl(
    HealthOverviewRemoteDataSource(
      api: apiClient,
      endpoints: HealthOverviewEndpoints(),
    ),
  );

  final settingsRepo = SettingsRepositoryImpl(
    SettingsRemoteDataSource(endpoints: SettingsEndpoints()),
  );

  // FCM: data source & registration (dùng endpoint đơn /fcm/token)
  final fcmDs = FcmRemoteDataSource(
    api: apiClient,
    endpoints: FcmEndpoints(AppConfig.apiBaseUrl),
  );
  final fcmReg = FcmRegistration(fcmDs);

  // Initialize services
  final sharedPermissionsDs = SharedPermissionsRemoteDataSource();
  final consentDs = ConsentRemoteDataSource();
  final auditService = AuditService();

  // Create service instances once here (avoid creating them inside init try-block)
  final deviceHealthService = DeviceHealthService();
  deviceHealthService.startHealthMonitoring();
  debugPrint('🏥 Device health monitoring started');

  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => ThemeProvider()),
        ChangeNotifierProvider(create: (_) => AuthProvider(authRepo)),
        ChangeNotifierProvider(create: (_) => HealthOverviewProvider(hoRepo)),
        ChangeNotifierProvider(create: (_) => ActivityProvider()),

        // Shared permissions data source
        Provider(create: (_) => sharedPermissionsDs),

        // Khi userId có giá trị -> load settings & đăng ký FCM token cho user hiện tại
        ChangeNotifierProxyProvider<AuthProvider, SettingsProvider>(
          create: (_) => SettingsProvider(repo: settingsRepo, userId: ''),
          update: (_, auth, previous) {
            final uid = auth.user?.id ?? '';
            final sp =
                previous ?? SettingsProvider(repo: settingsRepo, userId: uid);

            sp.updateUserId(uid, reload: false);
            if (uid.isNotEmpty) {
              sp.load();

              // Đăng ký FCM cho user hiện tại: getToken + onTokenRefresh -> gọi /api/fcm/token
              fcmReg.registerForUser(uid);
            }
            return sp;
          },
        ),

        // Image settings provider (feature-level list-based settings)
        ChangeNotifierProxyProvider<AuthProvider, ImageSettingsProvider>(
          create: (_) => ImageSettingsProvider(ImageSettingsRemoteDataSource()),
          update: (_, auth, previous) {
            final uid = auth.user?.id ?? '';
            final provider =
                previous ??
                ImageSettingsProvider(ImageSettingsRemoteDataSource());
            provider.updateUserId(uid);
            return provider;
          },
        ),

        // Alert settings provider: uses core settings remote data source that has
        // getAlertSettings/saveAlertSettings (user-scoped)
        ChangeNotifierProxyProvider<AuthProvider, AlertSettingsProvider>(
          create: (_) =>
              AlertSettingsProvider(core_ds.SettingsRemoteDataSource()),
          update: (_, auth, previous) {
            final uid = auth.user?.id ?? '';
            final provider =
                previous ??
                AlertSettingsProvider(core_ds.SettingsRemoteDataSource());
            provider.updateUserId(uid);
            return provider;
          },
        ),

        // Shared permissions provider
        ChangeNotifierProxyProvider<AuthProvider, SharedPermissionsProvider>(
          create: (_) => SharedPermissionsProvider(sharedPermissionsDs, ''),
          update: (_, auth, previous) {
            final uid = auth.user?.id ?? '';
            debugPrint(
              '🔄 [SharedPermissionsProvider] Updating with customerId: $uid',
            );
            final provider =
                previous ?? SharedPermissionsProvider(sharedPermissionsDs, uid);
            provider.updateCustomerId(uid);
            return provider;
          },
        ),

        // Consent provider
        ChangeNotifierProxyProvider<AuthProvider, ConsentProvider>(
          create: (_) => ConsentProvider(consentDs, ''),
          update: (_, auth, previous) {
            final uid = auth.user?.id ?? '';
            return previous ?? ConsentProvider(consentDs, uid);
          },
        ),

        // Services as providers (for access throughout the app)
        Provider<DeviceHealthService>(create: (_) => deviceHealthService),
        Provider<AuditService>(create: (_) => auditService),
        // Central subscription store (app-scoped)
        ChangeNotifierProvider(create: (_) => SubscriptionStore.instance),
      ],
      child: const MyApp(),
    ),
  );
}

// NavigatorKey global
class NavigatorKey {
  static final navigatorKey = GlobalKey<NavigatorState>();
}

// ScaffoldMessengerKey global
final scaffoldMessengerKey = GlobalKey<ScaffoldMessengerState>();

class MyApp extends StatefulWidget {
  const MyApp({super.key});
  @override
  State<MyApp> createState() => _MyAppState();
}

class _MyAppState extends State<MyApp> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      DeepLinkHandler.start();
    });
  }

  @override
  void dispose() {
    DeepLinkHandler.stop();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final themeProvider = Provider.of<ThemeProvider>(context);
    return MaterialApp(
      title: 'Detect Care App',
      navigatorKey: NavigatorKey.navigatorKey,
      scaffoldMessengerKey: scaffoldMessengerKey,
      theme: ThemeProvider.lightTheme,
      darkTheme: ThemeProvider.darkTheme,
      themeMode: themeProvider.themeMode,
      localizationsDelegates: [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      supportedLocales: const [Locale('vi', 'VN'), Locale('en', 'US')],
      home: const AuthGate(),
      routes: {
        '/settings': (_) => const SettingsScreen(),
        '/camera_error_ticket': (_) => const CameraErrorTicketScreen(),
        '/setup': (_) => const HouseholdSetupScreen(),
        '/caregiver_management': (_) => const CaregiverManagementScreen(),
        '/caregiver_list': (_) => const CaregiverListScreen(),
        '/add_caregiver': (_) => const AddCaregiverScreen(),
        '/assignments': (_) => const AssignmentsScreen(),
        '/patient_profile': (_) => const PatientProfileScreen(),
        '/update_patient_info': (context) {
          final args = ModalRoute.of(context)?.settings.arguments;
          PatientInfo? patient;
          if (args != null) {
            if (args is PatientInfo) {
              patient = args;
            } else if (args is Map<String, dynamic>) {
              patient = PatientInfo.fromJson(args);
            }
          }
          return UpdatePatientInfoScreen();
        },
      },
    );
  }
}
