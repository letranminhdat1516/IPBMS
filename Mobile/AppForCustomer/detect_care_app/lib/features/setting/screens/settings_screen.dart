import 'package:detect_care_app/features/auth/providers/auth_provider.dart';
import 'package:detect_care_app/features/assignments/screens/assignments_screen.dart';
import 'package:detect_care_app/features/camera/screens/live_camera_home_screen.dart';
import 'package:detect_care_app/features/debug/fcm_debug_screen.dart';
import 'package:detect_care_app/features/emergency_contacts/screens/emergency_contacts_screen.dart';
import 'package:detect_care_app/features/health_overview/screens/ai_suggestion_screen.dart';
import 'package:detect_care_app/features/home/screens/cancel_event_log_screen.dart';
import 'package:detect_care_app/features/patient/screens/doctor_info_screen.dart';
import 'package:detect_care_app/features/patient/service/doctors_service.dart';
import 'package:detect_care_app/features/patient/repository/doctors_repository.dart';
import 'package:detect_care_app/features/patient/data/doctors_remote_data_source.dart';
import 'package:detect_care_app/features/patient/screens/patient_profile_screen.dart';
import 'package:detect_care_app/features/patient/screens/sleep_checkin_screen.dart';
import 'package:detect_care_app/features/profile/screen/profile_screen.dart';
import 'package:detect_care_app/features/setting/screens/image_settings_screen.dart';
import 'package:detect_care_app/features/setup/utils/setup_flow_test_utils.dart';
import 'package:detect_care_app/features/subscription/providers/subscriptions_provider.dart';
import 'package:detect_care_app/features/subscription/screens/subscription_screen.dart';
import 'package:detect_care_app/features/shared_permissions/screens/permission_requests_screen.dart';
import 'package:detect_care_app/features/events/screens/propose_list_screen.dart';
import 'package:detect_care_app/features/support_tickets/screens/ticket_list_screen.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:detect_care_app/features/home/repository/event_repository.dart';
import 'package:detect_care_app/features/home/service/event_service.dart';
import 'package:detect_care_app/core/network/api_client.dart';
import 'package:detect_care_app/features/auth/data/auth_storage.dart';

import '../widgets/settings_card.dart';
import 'package:detect_care_app/features/home/constants/filter_constants.dart';
import '../widgets/settings_divider.dart';
import '../widgets/settings_item.dart';
import 'notification_settings_screen.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  bool isDarkMode = false;

  bool _isDebugMode() {
    bool isDebug = false;
    assert(isDebug = true);
    return isDebug;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Column(
          children: [
            _buildHeader(context),
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const SizedBox(height: 24),

                    // ACCOUNT SECTION
                    _buildSectionTitle('TÀI KHOẢN'),
                    const SizedBox(height: 12),
                    _accountSection(),

                    const SizedBox(height: 24),

                    // ALERT SETTINGS SECTION
                    _buildSectionTitle('CÀI ĐẶT CẢNH BÁO'),
                    const SizedBox(height: 12),
                    _alertSettingsSection(context),

                    const SizedBox(height: 24),

                    _buildSectionTitle('QUẢN LÝ SỰ KIỆN'),
                    _eventManagersSection(),
                    const SizedBox(height: 24),

                    // OTHER SETTINGS SECTION
                    _buildSectionTitle('CÀI ĐẶT KHÁC'),
                    const SizedBox(height: 12),
                    _otherSettingsSection(),

                    const SizedBox(height: 24),

                    // DEVELOPER TOOLS SECTION (only in debug mode)
                    // if (_isDebugMode()) ...[
                    //   _buildSectionTitle('CÔNG CỤ PHÁT TRIỂN'),
                    //   const SizedBox(height: 12),
                    //   _developerToolsSection(),
                    //   const SizedBox(height: 24),
                    // ],

                    // const SizedBox(height: 32),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader(BuildContext context) {
    return Container(
      height: 56,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border(
          bottom: BorderSide(
            color: Theme.of(
              context,
            ).colorScheme.outlineVariant.withValues(alpha: 0.5),
            width: 0.5,
          ),
        ),
      ),
      child: Row(
        children: [
          const Spacer(),
          Expanded(
            flex: 0,
            child: Center(
              child: Text(
                'Cài đặt',
                textAlign: TextAlign.center,
                style: Theme.of(
                  context,
                ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w600),
              ),
            ),
          ),
          const Spacer(),
          Align(
            alignment: Alignment.topRight,
            child: IconButton(
              icon: const Icon(Icons.close),
              color: Theme.of(context).colorScheme.onSurface,
              onPressed: () => Navigator.of(context).pop(),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.only(left: 4),
      child: Text(
        title,
        style: Theme.of(context).textTheme.labelMedium?.copyWith(
          color: Theme.of(context).colorScheme.onSurfaceVariant,
          fontWeight: FontWeight.w500,
          letterSpacing: 0.5,
        ),
      ),
    );
  }

  // --- Extracted sections for readability ---
  Widget _accountSection() => SettingsCard(
    children: [
      SettingsItem(
        icon: Icons.person_outline,
        title: 'Hồ sơ cá nhân',
        onTap: () {
          Navigator.of(
            context,
          ).push(MaterialPageRoute(builder: (_) => const ProfileScreen()));
        },
      ),
      const SettingsDivider(),
      SettingsItem(
        icon: Icons.medical_information_outlined,
        title: 'Hồ sơ bệnh nhân',
        onTap: () => Navigator.of(
          context,
        ).push(MaterialPageRoute(builder: (_) => const PatientProfileScreen())),
      ),
      const SettingsDivider(),
      SettingsItem(
        icon: Icons.local_hospital_outlined,
        title: 'Thông tin bác sĩ',
        onTap: () => Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) => DoctorInfoScreen(
              service: DoctorsService(
                repo: DoctorsRepository(
                  remote: DoctorsRemoteDataSource(
                    api: ApiClient(tokenProvider: AuthStorage.getAccessToken),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
      // const SettingsDivider(),
      // SettingsItem(
      //   icon: Icons.people_outline,
      //   title: 'Chọn bệnh nhân',
      //   onTap: () => Navigator.of(
      //     context,
      //   ).push(MaterialPageRoute(builder: (_) => const PatientPickerScreen())),
      // ),
      // const SettingsDivider(),
      // SettingsItem(
      //   icon: Icons.supervisor_account_outlined,
      //   title: 'Quản lý người chăm sóc',
      //   onTap: () => Navigator.of(context).push(
      //     MaterialPageRoute(builder: (_) => const CaregiverManagementScreen()),
      //   ),
      // ),
      const SettingsDivider(),
      SettingsItem(
        icon: Icons.supervisor_account_outlined,
        title: 'Thiết lập người chăm sóc',
        onTap: () => Navigator.of(
          context,
        ).push(MaterialPageRoute(builder: (_) => const AssignmentsScreen())),
      ),
    ],
  );

  Widget _alertSettingsSection(BuildContext context) => SettingsCard(
    children: [
      // SettingsItem(
      //   icon: Icons.warning_outlined,
      //   title: 'Cài đặt hình ảnh',
      //   onTap: () {
      //     final auth = context.read<AuthProvider>();
      //     if (auth.status != AuthStatus.authenticated) {
      //       ScaffoldMessenger.of(context).showSnackBar(
      //         const SnackBar(
      //           content: Text(
      //             'Vui lòng đăng nhập để truy cập cài đặt hình ảnh',
      //           ),
      //         ),
      //       );
      //       return;
      //     }
      //     Navigator.of(context).push(
      //       MaterialPageRoute(builder: (_) => const ImageSettingsScreen()),
      //     );
      //   },
      // ),
      // const SettingsDivider(),
      SettingsItem(
        icon: Icons.notifications_outlined,
        title: 'Cài đặt kênh thông báo',
        onTap: () => Navigator.of(context).push(
          MaterialPageRoute(builder: (_) => const NotificationSettingsScreen()),
        ),
      ),
      const SettingsDivider(),

      SettingsItem(
        icon: Icons.schedule_outlined,
        title: 'Ưu tiên lên hệ khẩn cấp',
        onTap: () => Navigator.of(context).push(
          MaterialPageRoute(builder: (_) => const EmergencyContactsScreen()),
        ),
      ),
      const SettingsDivider(),
      SettingsItem(
        icon: Icons.image_outlined,
        title: 'Quản lý hình ảnh',
        onTap: () {
          final auth = context.read<AuthProvider>();
          if (auth.status != AuthStatus.authenticated) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text(
                  'Vui lòng đăng nhập để truy cập quản lý hình ảnh',
                ),
              ),
            );
            return;
          }
          Navigator.of(context).push(
            MaterialPageRoute(builder: (_) => const ImageSettingsScreen()),
          );
        },
      ),
      const SettingsDivider(),

      // SettingsItem(
      //   icon: Icons.pending_actions_outlined,
      //   title: 'Danh sách đề xuất',
      //   onTap: () => Navigator.of(
      //     context,
      //   ).push(MaterialPageRoute(builder: (_) => const PendingProposeScreen())),
      // ),

      // const SettingsDivider(),
      // SettingsItem(
      //   icon: Icons.local_activity_outlined,
      //   title: 'Quản lý nhật ký hoạt',
      //   onTap: () {},
      // ),
    ],
  );

  Widget _otherSettingsSection() => SettingsCard(
    children: [
      // SettingsSwitchItem(
      //   icon: Icons.dark_mode_outlined,
      //   title: 'Chế độ ban đêm',
      //   value: isDarkMode,
      //   onChanged: (v) => setState(() => isDarkMode = v),
      // ),
      // const SettingsDivider(),
      SettingsItem(
        icon: Icons.card_membership_outlined,
        title: 'Danh sách gói dịch vụ',
        onTap: () => Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) => ChangeNotifierProvider(
              create: (_) => SubscriptionsProvider(),
              child: const SubscriptionScreen(initialTabIndex: 0),
            ),
          ),
        ),
      ),

      const SettingsDivider(),
      SettingsItem(
        icon: Icons.bedtime_outlined,
        title: 'Giờ ngủ',
        onTap: () => Navigator.of(
          context,
        ).push(MaterialPageRoute(builder: (_) => SleepCheckinScreen())),
      ),
      SettingsItem(
        icon: Icons.person_add_alt_1_outlined,
        title: 'Yêu cầu xin cấp quyền',
        onTap: () {
          final auth = context.read<AuthProvider>();
          if (auth.status != AuthStatus.authenticated) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('Vui lòng đăng nhập để xem yêu cầu quyền'),
              ),
            );
            return;
          }
          Navigator.of(context).push(
            MaterialPageRoute(
              builder: (_) =>
                  PermissionRequestListScreen(customerId: auth.currentUserId!),
            ),
          );
        },
      ),
      const SettingsDivider(),
      // const SettingsDivider(),
      // SettingsItem(
      //   icon: Icons.lightbulb_outline,
      //   title: 'Ai Suggestions Demo',
      //   onTap: () => Navigator.of(
      //     context,
      //   ).push(MaterialPageRoute(builder: (_) => AISuggestionsDemoScreen())),
      // ),
      const SettingsDivider(),
      SettingsItem(
        icon: Icons.report_problem_outlined,
        title: 'Báo lỗi',
        onTap: () => Navigator.of(
          context,
        ).push(MaterialPageRoute(builder: (_) => TicketListScreen())),
      ),

      // const SettingsDivider(),
      // SettingsItem(
      //   icon: Icons.account_circle_outlined,
      //   title: 'Thanh toán',
      //   onTap: () {},
      // ),
      // const SettingsDivider(),
      // SettingsItem(
      //   icon: Icons.security_outlined,
      //   title: 'Bảo mật',
      //   onTap: () {},
      //   trailing: Container(
      //     width: 8,
      //     height: 8,
      //     decoration: const BoxDecoration(
      //       color: Colors.green,
      //       shape: BoxShape.circle,
      //     ),
      //   ),
      // ),
      // const SettingsDivider(),
      // SettingsItem(
      //   icon: Icons.language_outlined,
      //   title: 'Riêng tư',
      //   onTap: () {},
      //   trailing: Container(
      //     width: 8,
      //     height: 8,
      //     decoration: const BoxDecoration(
      //       color: Colors.orange,
      //       shape: BoxShape.circle,
      //     ),
      //   ),
      // ),
      // const SettingsDivider(),
      // SettingsItem(
      //   icon: Icons.help_outline,
      //   title: 'Trợ giúp & Hỗ trợ',
      //   onTap: () {},
      // ),
      // const SettingsDivider(),
      // SettingsItem(
      //   icon: Icons.camera_alt_outlined,
      //   title: 'Báo lỗi camera',
      //   onTap: () => Navigator.of(context).pushNamed('/camera_error_ticket'),
      // ),

      // const SettingsDivider(),
      // SettingsItem(
      //   icon: Icons.history_outlined,
      //   title: 'Lịch sử yêu cầu quyền',
      //   onTap: () {
      //     final auth = context.read<AuthProvider>();
      //     if (auth.status != AuthStatus.authenticated ||
      //         auth.currentUserId == null ||
      //         auth.currentUserId!.isEmpty) {
      //       ScaffoldMessenger.of(context).showSnackBar(
      //         const SnackBar(
      //           content: Text(
      //             'Vui lòng đăng nhập để xem lịch sử yêu cầu quyền',
      //           ),
      //         ),
      //       );
      //       return;
      //     }
      //     Navigator.of(context).push(
      //       MaterialPageRoute(
      //         builder: (_) =>
      //             PermissionRequestListScreen(customerId: auth.currentUserId!),
      //       ),
      //     );
      //   },
      // ),
      // const SettingsDivider(),
    ],
  );
  Widget _eventManagersSection() => SettingsCard(
    children: [
      SettingsItem(
        icon: Icons.list_alt,
        title: 'Danh sách đề xuất thay đổi',
        onTap: () => Navigator.of(
          context,
        ).push(MaterialPageRoute(builder: (_) => const ProposalListScreen())),
      ),
      const SettingsDivider(),
      SettingsItem(
        icon: Icons.event_busy,
        title: 'Danh sách sự kiện đã hủy',
        onTap: () async {
          showDialog(
            context: context,
            barrierDismissible: false,
            builder: (_) => const Center(child: CircularProgressIndicator()),
          );

          try {
            final repo = EventRepository(
              EventService(
                ApiClient(tokenProvider: AuthStorage.getAccessToken),
              ),
            );
            final events = await repo.getEvents(
              page: 1,
              limit: 200,
              lifecycleState: 'CANCELED',
            );
            try {
              print(
                '[Settings] fetched CANCELED events count=${events.length}',
              );
              for (final ev in events) {
                try {
                  print(
                    '[Settings] event id=${ev.eventId} status=${ev.status} detectedAt=${ev.detectedAt} createdAt=${ev.createdAt} confirm=${ev.confirmStatus} confirmationState=${ev.confirmationState}',
                  );
                  print('[Settings] event full map=${ev.toMapString()}');
                } catch (e) {
                  print('[Settings] error printing event details: $e');
                }
              }
            } catch (e) {
              print('[Settings] error printing fetched events: $e');
            }
            if (mounted) Navigator.of(context).pop();
            if (!mounted) return;
            Navigator.of(context).push(
              MaterialPageRoute(
                builder: (_) => CancelEventLogScreen(
                  logs: events,
                  selectedDayRange: HomeFilters.defaultDayRange,
                  selectedStatus: HomeFilters.defaultStatus,
                  selectedPeriod: HomeFilters.defaultPeriod,
                  onRefresh: () {},
                  onStatusChanged: (_) {},
                  onDayRangeChanged: (_) {},
                  onPeriodChanged: (_) {},
                ),
              ),
            );
          } catch (e) {
            if (mounted) Navigator.of(context).pop();
            if (mounted) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('Lỗi tải danh sách đã hủy: $e')),
              );
            }
          }
        },
      ),
      const SettingsDivider(),
      SettingsItem(
        icon: Icons.videocam_outlined,
        title: 'Danh sách camera',
        onTap: () => Navigator.of(
          context,
        ).push(MaterialPageRoute(builder: (_) => const LiveCameraHomeScreen())),
      ),
    ],
  );

  Widget _developerToolsSection() => SettingsCard(
    children: [
      SettingsItem(
        icon: Icons.bug_report_outlined,
        title: 'Gỡ lỗi FCM',
        onTap: () => Navigator.of(
          context,
        ).push(MaterialPageRoute(builder: (_) => const FCMDebugScreen())),
      ),
      SettingsItem(
        icon: Icons.settings_outlined,
        title: 'Kích hoạt quy trình cài đặt',
        onTap: () => _triggerSetupFlow(),
      ),
      SettingsItem(
        icon: Icons.refresh_outlined,
        title: 'Đặt lại quy trình cài đặt',
        onTap: () => _resetSetupFlow(),
      ),
      SettingsItem(
        icon: Icons.info_outline,
        title: 'Thông tin gỡ lỗi cài đặt',
        onTap: () => _showSetupDebugInfo(),
      ),
    ],
  );

  // Setup Flow Developer Methods
  Future<void> _triggerSetupFlow() async {
    try {
      await SetupFlowTestUtils.resetToFirstTimeUser();
      if (mounted) {
        Navigator.of(context).pushReplacementNamed('/setup');
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Đã kích hoạt quy trình cài đặt')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Error: $e')));
      }
    }
  }

  Future<void> _resetSetupFlow() async {
    try {
      await SetupFlowTestUtils.resetToFirstTimeUser();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Đã đặt lại trạng thái cài đặt về lần đầu sử dụng'),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Error: $e')));
      }
    }
  }

  Future<void> _showSetupDebugInfo() async {
    try {
      await SetupFlowTestUtils.showSetupDebugDialog(context);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Error: $e')));
      }
    }
  }
}
