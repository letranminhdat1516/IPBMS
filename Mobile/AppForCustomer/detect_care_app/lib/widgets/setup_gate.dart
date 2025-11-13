import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../features/setup/providers/setup_flow_manager.dart';
import '../features/setup/screens/household_setup_screen.dart';
import '../features/home/screens/home_screen.dart';
import '../features/auth/providers/auth_provider.dart';
import '../features/auth/data/auth_storage.dart';
import '../utils/logger.dart';

class SetupGate extends StatefulWidget {
  const SetupGate({super.key});

  @override
  State<SetupGate> createState() => _SetupGateState();
}

class _SetupGateState extends State<SetupGate> {
  late SetupFlowManager _setupManager;
  bool _isLoading = true;
  bool _isFirstTimeUser = false;
  bool _isChecking = false;
  late AuthProvider _authProvider;
  int _retryCount = 0;
  static const int _maxRetries = 5;

  @override
  void initState() {
    super.initState();
    _setupManager = SetupFlowManager();
    // Delay provider access until after first frame
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      Logger.i('🔧 [SetupGate] Post-frame init callback running');
      _authProvider = context.read<AuthProvider>();
      Logger.d('🔧 [SetupGate] AuthProvider obtained: status=${_authProvider.status}');
      // Listen to auth state changes so we can re-run setup checks when auth completes
      _authProvider.addListener(_onAuthChanged);

      // Perform an initial check (will return early if auth not present)
      _checkSetupStatus();
    });
  }

  void _onAuthChanged() {
    // When auth becomes authenticated (or otpVerified), re-run the setup check
    if (!mounted) return;
    final status = _authProvider.status;
    Logger.d('🔔 [SetupGate] _onAuthChanged triggered, new status=$status');
    if (status == AuthStatus.authenticated ||
        status == AuthStatus.otpVerified) {
      _triggerCheckWithDelay();
    }
  }

  Future<void> _triggerCheckWithDelay() async {
    if (_isChecking) return; // guard concurrent triggers
    _isChecking = true;
    Logger.d('⏳ [SetupGate] Triggering delayed check (will wait 200ms)');
    // small delay to avoid racing with SharedPreferences writes
    await Future.delayed(const Duration(milliseconds: 200));
    if (!mounted) {
      _isChecking = false;
      return;
    }
    Logger.d('⏳ [SetupGate] Delay complete, running setup check');
    if (!mounted) return;
    await _checkSetupStatus();
    _isChecking = false;
    Logger.d('⏳ [SetupGate] Delayed check finished');
  }

  Future<void> _checkSetupStatus() async {
    // mark we're actively checking so multiple triggers don't overlap
    if (!mounted) return;
    setState(() {
      _isLoading = true;
    });
    try {
      // First verify we have valid authentication
      Logger.d('🔐 [SetupGate] _checkSetupStatus starting - reading stored auth values');
      final userId = await AuthStorage.getUserId();
      Logger.d('🔐 [SetupGate] getUserId -> ${userId ?? "<null>"}');
      final accessToken = await AuthStorage.getAccessToken();
      Logger.d('🔐 [SetupGate] getAccessToken -> ${accessToken != null ? "<present>" : "<null>"}');

      Logger.d('🔐 [SetupGate] Checking authentication...');
      Logger.d('🔐 [SetupGate] User ID: ${userId != null ? "Found" : "Not found"}');
      Logger.d('🔐 [SetupGate] Access Token: ${accessToken != null ? "Found" : "Not found"}');

      if (userId == null ||
          userId.trim().isEmpty ||
          accessToken == null ||
          accessToken.trim().isEmpty) {
        Logger.w('❌ [SetupGate] Missing authentication; will retry if appropriate');
        // If auth status is already authenticated but prefs haven't been written
        // yet (race), schedule a few delayed retries. Also stop showing the
        // setup loading indicator so the UI reflects authentication progress.
        if (!mounted) return;
        setState(() {
          _isLoading = false;
        });

        if ((_authProvider.status == AuthStatus.authenticated ||
                _authProvider.status == AuthStatus.otpVerified) &&
            _retryCount < _maxRetries) {
          Logger.d('🔁 [SetupGate] Scheduling retry #${_retryCount + 1} of $_maxRetries');
          _retryCount++;
          _triggerCheckWithDelay();
        }
        return;
      }

      // Additional check: ensure access token is not a fallback placeholder
      if (accessToken == 'supabase_session_fallback') {
        Logger.w('❌ [SetupGate] Found fallback token, clearing and staying in loading state');
        try {
          await AuthStorage.clear();
        } catch (e) {
          Logger.w('⚠️ [SetupGate] Failed to clear fallback auth data: $e');
        }
        return;
      }

      Logger.i('✅ [SetupGate] Authentication verified, checking setup status...');

      Logger.d('🏗️ [SetupGate] Calling SetupFlowManager.initialize()');
      if (!mounted) return;
      await _setupManager.initialize(context);
      Logger.d('🏗️ [SetupGate] SetupFlowManager.initialize() returned');
      final isFirstTime = await _setupManager.isFirstTimeUser();

      if (!mounted) return;
      setState(() {
        _isFirstTimeUser = isFirstTime;
        _isLoading = false;
      });

      Logger.i('🏗️ [SetupGate] First time user: $isFirstTime');
      Logger.i('🏗️ [SetupGate] Setup completed: ${_setupManager.isSetupCompleted}');
    } catch (e) {
      Logger.e('❌ [SetupGate] Error checking setup status: $e');
      // Clear potentially corrupted auth data and reset setup state
      try {
        await AuthStorage.clear();
        await _setupManager.resetSetup(null);
        Logger.i('🧹 [SetupGate] Cleared corrupted auth/setup data');
      } catch (clearError) {
        Logger.w('⚠️ [SetupGate] Failed to clear corrupted data: $clearError');
      }
      if (!mounted) return;
      setState(() {
        _isLoading = false;
        _isFirstTimeUser = false; // Default to not first time to prevent setup loop
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    // Get current auth status
    final authProvider = context.watch<AuthProvider>();

    // If authentication is not complete, show loading
    if (authProvider.status != AuthStatus.authenticated &&
        authProvider.status != AuthStatus.otpVerified) {
      Logger.d('🔐 [SetupGate] Authentication not complete: ${authProvider.status}');
      return const Scaffold(
        backgroundColor: Color(0xFFF8FBFF),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              CircularProgressIndicator(color: Color(0xFF2E7BF0)),
              SizedBox(height: 16),
              Text(
                'Đang hoàn tất xác thực...',
                style: TextStyle(color: Color(0xFF64748B), fontSize: 16),
              ),
            ],
          ),
        ),
      );
    }

    if (_isLoading) {
      return const Scaffold(
        backgroundColor: Color(0xFFF8FBFF),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              CircularProgressIndicator(color: Color(0xFF2E7BF0)),
              SizedBox(height: 16),
              Text(
                'Đang kiểm tra thiết lập...',
                style: TextStyle(color: Color(0xFF64748B), fontSize: 16),
              ),
            ],
          ),
        ),
      );
    }

    // If first time user or setup not completed, show setup flow
    if (_isFirstTimeUser || !_setupManager.isSetupCompleted) {
      Logger.i('🏗️ [SetupGate] Showing HouseholdSetupScreen');
      return ChangeNotifierProvider.value(
        value: _setupManager,
        child: const HouseholdSetupScreen(),
      );
    }

    // Setup completed, show main app
    Logger.i('🏠 [SetupGate] Setup completed, showing HomeScreen');
    return const HomeScreen();
  }

  @override
  void dispose() {
    // Remove auth listener (if set) and don't dispose _setupManager here as it
    // might be used by HouseholdSetupScreen
    try {
      Logger.d('🧾 [SetupGate] dispose called - removing auth listener');
      _authProvider.removeListener(_onAuthChanged);
    } catch (_) {
      // ignore - listener may not have been registered yet
    }
    super.dispose();
  }
}
