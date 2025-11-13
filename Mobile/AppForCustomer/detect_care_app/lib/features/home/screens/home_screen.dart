import 'dart:async';
import 'dart:developer' as dev;

import 'package:detect_care_app/core/events/app_events.dart';
import 'package:detect_care_app/core/network/api_client.dart';
import 'package:detect_care_app/core/theme/app_theme.dart';
import 'package:detect_care_app/core/widgets/custom_bottom_nav_bar.dart';
import 'package:detect_care_app/features/health_overview/screens/ai_suggestion_screen.dart';
import 'package:detect_care_app/features/home/screens/low_confidence_events_screen.dart';
import 'package:detect_care_app/features/assignments/screens/assignments_screen.dart';
import 'package:detect_care_app/features/auth/data/auth_storage.dart';
import 'package:detect_care_app/features/auth/providers/auth_provider.dart';
import 'package:detect_care_app/features/camera/screens/live_camera_home_screen.dart';
import 'package:detect_care_app/features/health_overview/screens/health_overview_screen.dart';
import 'package:detect_care_app/features/home/constants/filter_constants.dart';
import 'package:detect_care_app/features/home/constants/types.dart';
import 'package:detect_care_app/features/home/models/event_log.dart';
import 'package:detect_care_app/features/home/models/log_entry.dart';
import 'package:detect_care_app/features/home/repository/event_repository.dart';
import 'package:detect_care_app/features/home/screens/high_confidence_events_screen.dart';
import 'package:detect_care_app/features/home/service/event_service.dart';
import 'package:detect_care_app/features/notification/screens/notification_screen.dart';
import 'package:detect_care_app/features/notification/screens/send_notification_screen.dart';
import 'package:detect_care_app/features/profile/screen/profile_screen.dart';
import 'package:detect_care_app/features/search/screens/search_screen.dart';
import 'package:detect_care_app/features/setting/screens/settings_screen.dart';
import 'package:detect_care_app/features/setup/demo/setup_trigger_helper.dart';
import 'package:detect_care_app/features/subscription/data/payment_api.dart';
import 'package:detect_care_app/features/subscription/screens/invoices_screen.dart';
import 'package:detect_care_app/features/subscription/stores/subscription_store.dart';
import 'package:detect_care_app/services/notification_api_service.dart';
import 'package:detect_care_app/services/supabase_service.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:provider/provider.dart';

import '../widgets/tab_selector.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});
  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen>
    with SingleTickerProviderStateMixin, WidgetsBindingObserver {
  int _selectedIndex = 4; // Home screen index
  String _selectedTab = 'warning';
  String _selectedStatus = HomeFilters.defaultStatus;
  String _selectedPeriod = HomeFilters.defaultPeriod;

  DateTimeRange? _selectedDayRange = HomeFilters.defaultDayRange;
  final TextEditingController _searchController = TextEditingController();

  late final EventRepository _eventRepository;
  late final SupabaseService _supa;
  late final PaymentApi _paymentApi;

  List<LogEntry> _logs = [];
  bool _isLoading = false;
  String? _error;
  int _invoiceCount = 0;
  int _notificationCount = 0;

  Timer? _searchDebounce;
  Timer? _notificationRefreshTimer;
  StreamSubscription<void>? _eventsChangedSub;
  Map<String, dynamic>? _lastObservedStorePlan;
  @override
  void initState() {
    super.initState();

    _eventRepository = EventRepository(
      EventService(ApiClient(tokenProvider: AuthStorage.getAccessToken)),
    );

    EventService(
      ApiClient(tokenProvider: AuthStorage.getAccessToken),
    ).debugProbe();
    _supa = SupabaseService();
    _paymentApi = PaymentApi(
      baseUrl: dotenv.env['API_BASE_URL'] ?? '',
      apiProvider: ApiClient(tokenProvider: AuthStorage.getAccessToken),
    );
    _initSupabaseConnection();
    _searchController.addListener(() {
      _searchDebounce?.cancel();
      _searchDebounce = Timer(const Duration(milliseconds: 350), _refreshLogs);
      setState(() {});
    });
    _refreshLogs();
    _loadNotifications();
    _loadNotificationCount();

    // SubscriptionStore updates are consumed via Provider in build() so we
    // don't manually subscribe here.

    // Listen for app-wide event updates and refresh logs when signaled
    _eventsChangedSub = AppEvents.instance.eventsChanged.listen((_) {
      if (mounted) _refreshLogs();
    });

    // Refresh notification count every 5 minutes
    _notificationRefreshTimer = Timer.periodic(
      const Duration(minutes: 5),
      (_) => _loadNotificationCount(),
    );
  }

  void _loadNotifications() async {
    try {
      final token = await AuthStorage.getAccessToken();
      if (token == null) {
        setState(() => _invoiceCount = 0);
        return;
      }

      final count = await _paymentApi.getInvoiceCount(token);
      if (mounted) {
        setState(() => _invoiceCount = count);
      }
    } catch (e) {
      debugPrint('Error loading invoice count: $e');
      if (mounted) {
        setState(() => _invoiceCount = 0);
      }
    }
  }

  void _loadNotificationCount() async {
    try {
      final service = NotificationApiService();
      final count = await service.getUnreadCount();
      if (mounted) {
        setState(() => _notificationCount = count);
      }
      debugPrint(
        '[Home] Loaded notification count from API: $_notificationCount',
      );
    } catch (e) {
      debugPrint('Error loading notification count: $e');
      if (mounted) setState(() => _notificationCount = 0);
    }
  }

  void _resetNotificationCount() {
    // Call this when user views notifications
    setState(() => _notificationCount = 0);
    debugPrint('[Home] Reset notification count to 0');
  }

  @override
  void dispose() {
    _searchDebounce?.cancel();
    _notificationRefreshTimer?.cancel();
    _searchController.dispose();
    _supa.dispose();
    _eventsChangedSub?.cancel();
    // No manual subscription to remove; build() watches the provider.
    super.dispose();
  }

  Future<void> _refreshLogs() async {
    if (!mounted) return;

    final authProvider = context.read<AuthProvider>();
    debugPrint('[Home] Refresh with auth status: ${authProvider.status}');
    debugPrint('[Home] Refresh with userID: ${authProvider.currentUserId}');

    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      if (authProvider.status != AuthStatus.authenticated ||
          authProvider.currentUserId == null) {
        if (!mounted) return;
        setState(() {
          _logs = [];
          _error = 'Chưa đăng nhập. Vui lòng đăng nhập để xem cảnh báo.';
          _isLoading = false;
        });
        return;
      }

      final events = await _eventRepository.getEvents(
        page: 1,
        limit: 20,
        status: _selectedStatus,
        dayRange: _selectedDayRange,
        period: _selectedPeriod,
        search: _searchController.text.isNotEmpty
            ? _searchController.text
            : null,
      );

      dev.log(
        'UI got events=${events.length}, firstIds=${events.take(3).map((e) => e.eventId).toList()}',
        name: 'HomeScreen',
      );
      print(
        'UI got events=${events.length}, '
        'firstIds=${events.take(3).map((e) => e.eventId).toList()}',
      );

      if (!mounted) return;
      // Merge fetched events with in-memory realtime events to avoid losing
      // items that were inserted locally from the realtime subscription but
      // might not yet appear in the pull snapshot (race / eventual consistency).
      final mergedMap = <String, LogEntry>{};
      // Put fetched events first (they reflect server state)
      for (final e in events) {
        mergedMap[e.eventId] = e;
      }
      // Add any existing in-memory events that aren't present in fetched set
      for (final e in _logs) {
        if (!mergedMap.containsKey(e.eventId)) mergedMap[e.eventId] = e;
      }

      final merged = mergedMap.values.toList()
        ..sort((a, b) {
          final aDt =
              a.detectedAt ??
              a.createdAt ??
              DateTime.fromMillisecondsSinceEpoch(0);
          final bDt =
              b.detectedAt ??
              b.createdAt ??
              DateTime.fromMillisecondsSinceEpoch(0);
          return bDt.compareTo(aDt);
        });

      setState(() {
        _logs = merged;
        _error = null;
        _isLoading = false;
      });
    } catch (e, stack) {
      debugPrint('Error refreshing logs: $e');
      debugPrint('$stack');
      if (!mounted) return;
      setState(() {
        _error = 'Không thể tải sự kiện: ${e.toString()}';
        _isLoading = false;
      });
    }
  }

  void _initSupabaseConnection() {
    if (!mounted) return;
    try {
      _supa.initRealtimeSubscription(
        onEventReceived: (map) {
          if (!mounted) return;
          try {
            final e = EventLog.fromJson(map);
            setState(() {
              if (_logs.any((event) => event.eventId == e.eventId)) {
                final index = _logs.indexWhere(
                  (event) => event.eventId == e.eventId,
                );
                _logs[index] = e;
              } else {
                _logs.insert(0, e);
                // Increase notification count for new events
                _notificationCount++;
                HapticFeedback.selectionClick();
              }
            });
            dev.log(
              'realtime new=${e.eventId} type=${e.eventType}, notificationCount=$_notificationCount',
              name: 'HomeScreen',
            );
          } catch (e) {
            dev.log('Error processing event: $e', name: 'HomeScreen', error: e);
          }
        },
      );
    } catch (e) {
      dev.log(
        'Error initializing Supabase connection: $e',
        name: 'HomeScreen',
        error: e,
      );
    }
  }

  // Handle navigation
  void onTap(int index) {
    if (_selectedIndex != index) {
      setState(() => _selectedIndex = index);
    }
  }

  @override
  Widget build(BuildContext context) {
    // Watch the SubscriptionStore so this widget rebuilds when subscription
    // state changes. When the plan data actually changes we trigger a
    // post-frame refresh for invoices/notifications to avoid doing async
    // work directly during build.
    final store = context.watch<SubscriptionStore>();
    final currentPlan = store.planData;
    if (!mapEquals(_lastObservedStorePlan, currentPlan)) {
      _lastObservedStorePlan = currentPlan;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        // Refresh invoice and notification counts when subscription updates
        _loadNotifications();
        _loadNotificationCount();
        setState(() {});
      });
    }
    return Scaffold(
      backgroundColor: AppTheme.scaffoldBackground,
      appBar: AppBar(
        backgroundColor: Colors.white,
        // title: Text(
        //   _appBarTitle(),
        //   style: const TextStyle(color: AppTheme.text),
        // ),
        centerTitle: false,
        leading: IconButton(
          onPressed: () => Navigator.of(
            context,
          ).push(MaterialPageRoute(builder: (_) => const SettingsScreen())),
          icon: const Icon(
            Icons.settings,
            color: AppTheme.primaryBlue,
            size: 24,
          ),
          splashRadius: 20,
        ),
        actions: [
          // Search now opens Search Screen
          Semantics(
            button: true,
            label: 'Tìm kiếm',
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8.0),
              child: IconButton(
                tooltip: 'Tìm kiếm',
                onPressed: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(builder: (_) => const SearchScreen()),
                  );
                },
                icon: const Icon(
                  Icons.search,
                  color: AppTheme.primaryBlue,
                  size: 24,
                ),
                splashRadius: 20,
              ),
            ),
          ),
          // Invoice icon with badge
          // Stack(
          //   alignment: Alignment.center,
          //   children: [
          //     Semantics(
          //       button: true,
          //       label: 'Hóa đơn',
          //       child: Padding(
          //         padding: const EdgeInsets.symmetric(horizontal: 6.0),
          //         child: IconButton(
          //           tooltip: 'Hóa đơn',
          //           onPressed: () {
          //             Navigator.of(context).push(
          //               MaterialPageRoute(
          //                 builder: (_) => const InvoicesScreen(),
          //               ),
          //             );
          //           },
          //           icon: const Icon(
          //             Icons.receipt_long,
          //             color: AppTheme.primaryBlue,
          //           ),
          //           splashRadius: 24,
          //         ),
          //       ),
          //     ),
          //     if (_invoiceCount > 0)
          //       Positioned(
          //         right: 6,
          //         top: 8,
          //         child: Semantics(
          //           label: '$_invoiceCount hóa đơn',
          //           child: Container(
          //             padding: const EdgeInsets.symmetric(
          //               horizontal: 4,
          //               vertical: 2,
          //             ),
          //             decoration: BoxDecoration(
          //               color: const Color(0xFFE53935),
          //               borderRadius: BorderRadius.circular(8),
          //               border: Border.all(color: Colors.white, width: 1),
          //             ),
          //             constraints: const BoxConstraints(
          //               minWidth: 12,
          //               minHeight: 12,
          //             ),
          //             child: Text(
          //               _invoiceCount > 99 ? '99+' : _invoiceCount.toString(),
          //               style: const TextStyle(
          //                 color: Colors.white,
          //                 fontSize: 10,
          //                 fontWeight: FontWeight.bold,
          //               ),
          //               textAlign: TextAlign.center,
          //             ),
          //           ),
          //         ),
          //       ),
          //   ],
          // ),
          // Notification icon with badge
          Stack(
            alignment: Alignment.center,
            children: [
              Semantics(
                button: true,
                label: 'Thông báo',
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 6.0),
                  child: IconButton(
                    tooltip: 'Thông báo',
                    onPressed: () async {
                      // Capture NavigatorState before async gap to avoid using
                      // BuildContext after awaits (prevents analyzer warning).
                      final navigator = Navigator.of(context);

                      // When user opens notifications, mark them all as read
                      try {
                        final service = NotificationApiService();
                        final success = await service.markAllAsRead();
                        if (success) {
                          _resetNotificationCount();
                        }
                      } catch (e) {
                        debugPrint('Error marking notifications as read: $e');
                      }

                      WidgetsBinding.instance.addPostFrameCallback((_) {
                        try {
                          navigator.push(
                            MaterialPageRoute(
                              builder: (_) => const NotificationScreen(),
                            ),
                          );
                        } catch (e) {
                          // swallow navigation errors to avoid red screen
                          debugPrint('Navigation error (notification): $e');
                        }
                      });
                    },
                    icon: const Icon(
                      Icons.notifications,
                      color: AppTheme.primaryBlue,
                    ),
                    splashRadius: 24,
                  ),
                ),
              ),
              if (_notificationCount > 0)
                Positioned(
                  right: 6,
                  top: 8,
                  child: Semantics(
                    label: '$_notificationCount thông báo',
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 4,
                        vertical: 2,
                      ),
                      decoration: BoxDecoration(
                        color: const Color(0xFFE53935),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: Colors.white, width: 1),
                      ),
                      constraints: const BoxConstraints(
                        minWidth: 12,
                        minHeight: 12,
                      ),
                      child: Text(
                        _notificationCount > 99
                            ? '99+'
                            : _notificationCount.toString(),
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ),
                  ),
                ),
            ],
          ),
          // // Send notification icon
          // Semantics(
          //   button: true,
          //   label: 'Gửi thông báo',
          //   child: Padding(
          //     padding: const EdgeInsets.symmetric(horizontal: 8.0),
          //     child: IconButton(
          //       tooltip: 'Gửi thông báo',
          //       onPressed: () {
          //         Navigator.of(context).push(
          //           MaterialPageRoute(
          //             builder: (_) => const SendNotificationScreen(),
          //           ),
          //         );
          //       },
          //       icon: const Icon(
          //         Icons.send,
          //         color: AppTheme.primaryBlue,
          //         size: 24,
          //       ),
          //       splashRadius: 20,
          //     ),
          //   ),
          // ),
          // AI Suggestion
          // Send notification icon
          Semantics(
            button: true,
            label: 'Gợi Ý AI',
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8.0),
              child: IconButton(
                tooltip: 'Gợi Ý AI',
                onPressed: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => const AISuggestionsDemoScreen(),
                    ),
                  );
                },
                icon: Container(
                  decoration: BoxDecoration(
                    color: AppTheme.primaryBlue.withOpacity(0.1),
                    shape: BoxShape.circle,
                  ),
                  padding: const EdgeInsets.all(6),
                  child: const Icon(
                    // Icons.smart_toy_outlined,
                    Icons.lightbulb,
                    color: AppTheme.primaryBlue,
                    size: 26,
                  ),
                ),

                splashRadius: 22,
              ),
            ),
          ),
        ],
      ),

      body: _buildContentByIndex(),
      floatingActionButton: Semantics(
        button: true,
        label: 'Trang chính',
        child: FloatingActionButton(
          heroTag: 'fab_home',

          onPressed: () {
            if (_selectedIndex != 4) {
              setState(() => _selectedIndex = 4);
            }
          },
          shape: const CircleBorder(),
          backgroundColor: AppTheme.primaryBlue,
          elevation: 6,
          child: const Icon(Icons.home, color: Colors.white, size: 32),
        ),
      ),
      floatingActionButtonLocation: FloatingActionButtonLocation.centerDocked,
      // Bottom navigation bar (dock FAB into the BottomAppBar notch)
      bottomNavigationBar: CustomBottomNavBar(
        currentIndex: _selectedIndex,
        onTap: onTap,
        // Notifications/Invoices moved to bottom index 2 - set badge here
        badgeCounts: {2: _invoiceCount},
        borderRadius: 30,
        bottomMargin: 15,
        horizontalMargin: 10,
      ),
    );
  }

  // _appBarTitle intentionally removed; AppBar title is static or managed
  // elsewhere. Keeping this file concise avoids unused declarations.

  Widget _buildContentByIndex() {
    switch (_selectedIndex) {
      case 0:
        return const LiveCameraHomeScreen();
      case 1:
        // HomeScreen provides the AppBar for top-level navigation. When
        // embedding AssignmentsScreen here we disable its internal AppBar to
        // avoid rendering two headers.
        return const AssignmentsScreen(embedInParent: true);
      case 2:
        // When shown inside HomeScreen tabs we want the invoices screen to
        // reuse the parent's AppBar, so construct it with embedInParent=true.
        return const InvoicesScreen(embedInParent: true);
      case 3:
        // When embedded in HomeScreen tabs, allow ProfileScreen to reuse the
        // parent's AppBar by setting embedInParent=true.
        return const ProfileScreen(embedInParent: true);
      case 4:
        return Column(
          children: [
            TabSelector(
              selectedTab: _selectedTab,
              onTabChanged: (t) => setState(() {
                _selectedTab = t;
                // Ensure the status filter default depends on the tab:
                // - HighConfidence ('warning') uses the global default ('abnormal')
                // - LowConfidence ('activity') uses 'all' (shows unknown + suspect)
                if (t == 'activity') {
                  _selectedStatus = 'all';
                } else if (t == 'warning') {
                  _selectedStatus = HomeFilters.defaultStatus;
                }
              }),
            ),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: _buildContentByTab(),
              ),
            ),
          ],
        );
      default:
        return const SizedBox.shrink();
    }
  }

  Widget _buildContentByTab() {
    switch (_selectedTab) {
      case 'warning':
        if (_isLoading) {
          return const Center(child: CircularProgressIndicator());
        }
        if (_error != null) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(_error!, style: const TextStyle(color: Colors.red)),
                const SizedBox(height: 16),
                ElevatedButton(
                  onPressed: _refreshLogs,
                  child: const Text('Thử lại'),
                ),
              ],
            ),
          );
        }
        return HighConfidenceEventsScreen(
          logs: _logs,
          selectedStatus: _selectedStatus,
          selectedDayRange: _selectedDayRange,
          selectedPeriod: _selectedPeriod,
          onRefresh: _refreshLogs,
          onStatusChanged: (v) {
            setState(() => _selectedStatus = v ?? HomeFilters.defaultStatus);
            _refreshLogs();
          },
          onDayRangeChanged: (v) {
            setState(
              () => _selectedDayRange = v ?? HomeFilters.defaultDayRange,
            );
            _refreshLogs();
          },
          onPeriodChanged: (v) {
            setState(() => _selectedPeriod = v ?? HomeFilters.defaultPeriod);
            _refreshLogs();
          },
        );
      case 'activity':
        return LowConfidenceEventsScreen(
          logs: _logs,
          selectedDayRange: _selectedDayRange,
          selectedStatus: _selectedStatus,
          selectedPeriod: _selectedPeriod,
          onDayRangeChanged: (v) {
            setState(
              () => _selectedDayRange = v ?? HomeFilters.defaultDayRange,
            );
            _refreshLogs();
          },
          onStatusChanged: (v) {
            setState(() => _selectedStatus = v ?? HomeFilters.defaultStatus);
            _refreshLogs();
          },
          onPeriodChanged: (v) {
            setState(() => _selectedPeriod = v ?? HomeFilters.defaultPeriod);
            _refreshLogs();
          },
          onRefresh: _refreshLogs,
          onEventUpdated: (eventId, {bool? confirmed}) {
            try {
              _refreshLogs();
            } catch (_) {}
          },
        );
      case 'report':
        return const HealthOverviewScreen();
      default:
        return const SizedBox.shrink();
    }
  }

  // Debug method to show setup flow trigger menu
  // keep debug menu available for dev builds; analyzer: unused_member may flag it
  // ignore: unused_element
  void _showSetupDebugMenu() {
    bool isDebug = false;
    assert(isDebug = true);

    if (!isDebug) return; // Only show in debug mode

    SetupTriggerHelper.showDebugMenu(context);
  }
}
