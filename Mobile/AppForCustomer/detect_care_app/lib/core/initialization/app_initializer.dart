import 'package:detect_care_app/core/config/app_config.dart';
import 'package:detect_care_app/core/data/consent_remote_data_source.dart';
import 'package:detect_care_app/core/network/api_client.dart';
import 'package:detect_care_app/core/providers/consent_provider.dart';
import 'package:detect_care_app/core/providers/theme_provider.dart';
import 'package:detect_care_app/core/services/audit_service.dart';
import 'package:detect_care_app/core/services/device_health_service.dart';
import 'package:detect_care_app/core/utils/app_lifecycle.dart';
import 'package:detect_care_app/core/utils/deep_link_handler.dart';
import 'package:detect_care_app/features/auth/data/auth_endpoints.dart';
import 'package:detect_care_app/features/auth/data/auth_remote_data_source.dart';
import 'package:detect_care_app/features/auth/data/auth_storage.dart';
import 'package:detect_care_app/features/auth/providers/auth_provider.dart';
import 'package:detect_care_app/features/auth/repositories/auth_repository.dart';
import 'package:detect_care_app/features/fcm/data/fcm_endpoints.dart';
import 'package:detect_care_app/features/fcm/data/fcm_remote_data_source.dart';
import 'package:detect_care_app/features/fcm/services/fcm_registration.dart';
import 'package:detect_care_app/features/health_overview/data/health_overview_endpoints.dart';
import 'package:detect_care_app/features/health_overview/data/health_overview_remote_data_source.dart';
import 'package:detect_care_app/features/health_overview/data/health_overview_repository_impl.dart';
import 'package:detect_care_app/features/health_overview/providers/health_overview_provider.dart';
import 'package:detect_care_app/features/setting/data/settings_endpoints.dart';
import 'package:detect_care_app/features/setting/data/settings_remote_data_source.dart';
import 'package:detect_care_app/features/setting/data/settings_repository_impl.dart';
import 'package:detect_care_app/features/setting/providers/settings_provider.dart';
import 'package:detect_care_app/features/shared_permissions/data/shared_permissions_remote_data_source.dart';
import 'package:detect_care_app/features/activity/providers/activity_provider.dart';
import 'package:detect_care_app/features/shared_permissions/providers/invitations_provider.dart';
import 'package:detect_care_app/firebase_options.dart';
import 'package:detect_care_app/services/notification_manager.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:provider/provider.dart';
import 'package:provider/single_child_widget.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// App initialization and dependency injection manager
class AppInitializer {
  static final AppInitializer _instance = AppInitializer._internal();
  factory AppInitializer() => _instance;
  AppInitializer._internal();

  // HTTP client field removed; use ApiClient instances where needed.
  late final NotificationManager _notificationManager;
  late final DeviceHealthService _deviceHealthService;
  late final AuditService _auditService;

  /// Initialize all app dependencies
  Future<void> initialize() async {
    WidgetsFlutterBinding.ensureInitialized();
    AppLifecycle.init();

    try {
      await _initializeEnvironment();
      await _initializeFirebase();
      await _initializeSupabase();
      await _initializeServices();
      await _initializeDeepLinkHandler();

      debugPrint('✅ App initialization completed successfully');
    } catch (e, st) {
      debugPrint('❌ App initialization error: $e');
      debugPrint(st.toString());
      rethrow;
    }
  }

  Future<void> _initializeEnvironment() async {
    await dotenv.load(
      fileName: const String.fromEnvironment(
        'ENV_FILE',
        defaultValue: '.env.dev',
      ),
    );
    debugPrint('📝 Environment loaded');
  }

  Future<void> _initializeFirebase() async {
    await Firebase.initializeApp(
      options: DefaultFirebaseOptions.currentPlatform,
    );
    debugPrint('🔥 Firebase initialized');
  }

  Future<void> _initializeSupabase() async {
    await Supabase.initialize(
      url: 'https://undznprwlqjpnxqsgyiv.supabase.co',
      anonKey: AppConfig.supabaseKey,
    );

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
  }

  Future<void> _initializeServices() async {
    // http.Client is no longer stored globally; ApiClient will be used
    // where repositories/services need it.
    _notificationManager = NotificationManager();
    _deviceHealthService = DeviceHealthService();
    _auditService = AuditService();

    await _notificationManager.initialize();
    _deviceHealthService.startHealthMonitoring();

    debugPrint('🔔 Notification manager initialized');
    debugPrint('🏥 Device health monitoring started');
    debugPrint('📊 Audit service initialized');
  }

  Future<void> _initializeDeepLinkHandler() async {
    await DeepLinkHandler.initialize();
    debugPrint('🔗 DeepLinkHandler initialized');
  }

  /// Create all repositories
  Repositories createRepositories() {
    return Repositories(
      authRepository: AuthRepository(
        AuthRemoteDataSource(endpoints: AuthEndpoints(AppConfig.apiBaseUrl)),
      ),
      healthOverviewRepository: HealthOverviewRepositoryImpl(
        HealthOverviewRemoteDataSource(
          api: ApiClient(tokenProvider: AuthStorage.getAccessToken),
          endpoints: HealthOverviewEndpoints(),
        ),
      ),
      settingsRepository: SettingsRepositoryImpl(
        SettingsRemoteDataSource(endpoints: SettingsEndpoints()),
      ),
      fcmRegistration: FcmRegistration(
        FcmRemoteDataSource(
          api: ApiClient(tokenProvider: AuthStorage.getAccessToken),
          endpoints: FcmEndpoints(AppConfig.apiBaseUrl),
        ),
      ),
    );
  }

  /// Create all providers
  List<SingleChildWidget> createProviders(Repositories repos) {
    final sharedPermissionsDs = SharedPermissionsRemoteDataSource();
    final consentDs = ConsentRemoteDataSource();

    return [
      ChangeNotifierProvider(create: (_) => ThemeProvider()),
      ChangeNotifierProvider(create: (_) => AuthProvider(repos.authRepository)),
      ChangeNotifierProvider(
        create: (_) => HealthOverviewProvider(repos.healthOverviewRepository),
      ),
      // Activity provider (admin)
      ChangeNotifierProvider(create: (_) => ActivityProvider()),
      // Activity provider (admin features)
      ChangeNotifierProxyProvider<AuthProvider, ActivityProvider>(
        create: (_) => ActivityProvider(),
        update: (_, auth, previous) {
          return previous ?? ActivityProvider();
        },
      ),

      // Settings provider with FCM registration
      ChangeNotifierProxyProvider<AuthProvider, SettingsProvider>(
        create: (_) =>
            SettingsProvider(repo: repos.settingsRepository, userId: ''),
        update: (_, auth, previous) {
          final uid = auth.user?.id ?? '';
          final sp =
              previous ??
              SettingsProvider(repo: repos.settingsRepository, userId: uid);

          sp.updateUserId(uid, reload: false);
          if (uid.isNotEmpty) {
            sp.load();
            repos.fcmRegistration.registerForUser(uid);
          }
          return sp;
        },
      ),

      // Shared permissions provider
      ChangeNotifierProxyProvider<AuthProvider, SharedPermissionsProvider>(
        create: (_) => SharedPermissionsProvider(sharedPermissionsDs, ''),
        update: (_, auth, previous) {
          final uid = auth.user?.id ?? '';
          return previous ??
              SharedPermissionsProvider(sharedPermissionsDs, uid);
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

      // Services as providers
      Provider<DeviceHealthService>(create: (_) => _deviceHealthService),
      Provider<AuditService>(create: (_) => _auditService),
    ];
  }
}

/// Container for all repositories
class Repositories {
  const Repositories({
    required this.authRepository,
    required this.healthOverviewRepository,
    required this.settingsRepository,
    required this.fcmRegistration,
  });

  final AuthRepository authRepository;
  final HealthOverviewRepositoryImpl healthOverviewRepository;
  final SettingsRepositoryImpl settingsRepository;
  final FcmRegistration fcmRegistration;
}
