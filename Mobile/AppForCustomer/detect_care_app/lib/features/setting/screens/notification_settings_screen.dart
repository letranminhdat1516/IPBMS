import 'package:detect_care_app/core/network/api_client.dart';
import 'package:detect_care_app/features/auth/data/auth_storage.dart';
import 'package:detect_care_app/features/setting/data/notification_settings_remote_data_source.dart';
import 'package:detect_care_app/features/setting/repositories/notification_settings_repository.dart';
import 'package:detect_care_app/features/setting/services/notification_settings_service.dart';
import 'package:flutter/material.dart';

class NotificationSettingsScreen extends StatefulWidget {
  const NotificationSettingsScreen({super.key});

  @override
  State<NotificationSettingsScreen> createState() =>
      _NotificationSettingsScreenState();
}

class _NotificationSettingsScreenState extends State<NotificationSettingsScreen>
    with TickerProviderStateMixin {
  late AnimationController _fadeController;
  late AnimationController _scaleController;
  late Animation<double> _fadeAnimation;
  late Animation<double> _scaleAnimation;

  // Notification settings state
  bool _appNotifications = true;
  bool _emailNotifications = false;
  bool _smsNotifications = false;
  bool _callNotifications = false;
  bool _deviceAlerts = false;
  bool _masterNotifications = true;
  bool _saving = false;
  late final NotificationSettingsService _service;

  @override
  void initState() {
    super.initState();

    // 1. Tạo controller cho scale
    _scaleController = AnimationController(
      duration: const Duration(milliseconds: 600),
      vsync: this,
    );

    // 2. Gán _scaleAnimation từ controller vừa tạo
    _scaleAnimation = Tween<double>(begin: 0.8, end: 1.0).animate(
      CurvedAnimation(parent: _scaleController, curve: Curves.elasticOut),
    );

    // 3. Tạo controller cho fade
    _fadeController = AnimationController(
      duration: const Duration(milliseconds: 800),
      vsync: this,
    );

    // 4. Gán _fadeAnimation
    _fadeAnimation = Tween<double>(
      begin: 0.0,
      end: 1.0,
    ).animate(CurvedAnimation(parent: _fadeController, curve: Curves.easeOut));

    // 5. Chạy animation
    _fadeController.forward();
    Future.delayed(const Duration(milliseconds: 200), () {
      _scaleController.forward();
      // Load provider settings after animations to avoid jank
      WidgetsBinding.instance.addPostFrameCallback((_) async {
        _service = NotificationSettingsService(
          NotificationSettingsRepository(
            NotificationSettingsRemoteDataSource(
              ApiClient(tokenProvider: AuthStorage.getAccessToken),
            ),
          ),
        );
        try {
          final list = await _service.getAllSettings();
          if (!mounted) return;
          setState(() {
            for (final s in list) {
              switch (s.settingKey) {
                case 'notification.push_enabled':
                  _appNotifications = s.isEnabled;
                  break;
                case 'notification.email_enabled':
                  _emailNotifications = s.isEnabled;
                  break;
                case 'notification.sms_enabled':
                  _smsNotifications = s.isEnabled;
                  break;
                case 'notification.enable_call_notification':
                  _callNotifications = s.isEnabled;
                  break;
                default:
                  break;
              }
            }
          });
        } catch (e) {
          debugPrint('Error loading settings: $e');
        }
      });
    });
  }

  @override
  void dispose() {
    _fadeController.dispose();
    _scaleController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        centerTitle: true,
        backgroundColor: Colors.white,
        elevation: 0,
        shadowColor: Colors.black.withValues(alpha: 0.1),
        leading: Container(
          margin: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: const Color(0xFFF8FAFC),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFFE2E8F0)),
          ),
          child: IconButton(
            onPressed: () => Navigator.pop(context),
            icon: const Icon(
              Icons.arrow_back_ios_new,
              color: Color(0xFF374151),
              size: 18,
            ),
          ),
        ),
        title: const Text(
          'Cài đặt kênh thông báo',
          style: TextStyle(
            color: Color(0xFF1E293B),
            fontSize: 20,
            fontWeight: FontWeight.w700,
            letterSpacing: -0.5,
          ),
        ),
        actions: [
          Container(
            margin: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: const Color(0xFFF8FAFC),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
          ),
        ],
      ),
      body: FadeTransition(
        opacity: _fadeAnimation,
        child: ScaleTransition(
          scale: _scaleAnimation,
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildHeader(),
                const SizedBox(height: 28),
                // _buildMasterSwitch(),
                // const SizedBox(height: 20),
                // _buildChannelSelector(),
                // const SizedBox(height: 28),
                _buildNotificationSettings(),
                const SizedBox(height: 32),
                _buildQuickActions(),
                const SizedBox(height: 24),
                _buildSaveButton(),
                const SizedBox(height: 12),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 6.0),
                  child: Text(
                    'Ghi chú: Một số kênh là bắt buộc vì yêu cầu y tế',
                    style: TextStyle(
                      fontSize: 12,
                      color: const Color(0xFF64748B),
                    ),
                    textAlign: TextAlign.center,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildChannelSelector() {
    final channels = [
      {'label': 'Push', 'enabled': true},
      {'label': 'SMS', 'enabled': false},
      {'label': 'Email', 'enabled': false},
    ];

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Kênh thông báo',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 8),
          const Text(
            'Chọn cách thức nhận thông báo',
            style: TextStyle(color: Color(0xFF64748B)),
          ),
          const SizedBox(height: 12),
          Row(
            children: channels.map((c) {
              final enabled = c['enabled'] as bool;
              return Padding(
                padding: const EdgeInsets.only(right: 8.0),
                child: ChoiceChip(
                  label: Text(c['label'] as String),
                  selected: enabled,
                  onSelected: enabled ? (_) {} : null,
                  backgroundColor: const Color(0xFFF8FAFC),
                  selectedColor: const Color(0xFFF8FAFC),
                  disabledColor: const Color(0xFFF3F4F6),
                  labelStyle: TextStyle(
                    color: enabled
                        ? const Color(0xFF2E7BF0)
                        : const Color(0xFF9CA3AF),
                  ),
                ),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }

  Widget _buildHeader() {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            const Color(0xFF2E7BF0).withValues(alpha: 0.05),
            const Color(0xFF06B6D4).withValues(alpha: 0.05),
          ],
        ),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFE2E8F0), width: 1),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [const Color(0xFF2E7BF0), const Color(0xFF06B6D4)],
              ),
              borderRadius: BorderRadius.circular(16),
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFF2E7BF0).withValues(alpha: 0.3),
                  blurRadius: 8,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: const Icon(
              Icons.notifications_active,
              color: Colors.white,
              size: 28,
            ),
          ),
          const SizedBox(width: 20),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Kênh thông báo',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF1E293B),
                    letterSpacing: -0.5,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  'Cấu hình cách thức nhận thông báo khẩn cấp và cảnh báo',
                  style: TextStyle(
                    fontSize: 14,
                    color: const Color(0xFF64748B),
                    fontWeight: FontWeight.w500,
                    height: 1.4,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // Widget _buildMasterSwitch() {
  //   return Container(
  //     padding: const EdgeInsets.all(20),
  //     decoration: BoxDecoration(
  //       color: Colors.white,
  //       borderRadius: BorderRadius.circular(16),
  //       border: Border.all(
  //         color: _masterNotifications
  //             ? const Color(0xFF2E7BF0).withValues(alpha: 0.3)
  //             : const Color(0xFFE2E8F0),
  //         width: _masterNotifications ? 2 : 1,
  //       ),
  //       boxShadow: [
  //         BoxShadow(
  //           color: _masterNotifications
  //               ? const Color(0xFF2E7BF0).withValues(alpha: 0.1)
  //               : Colors.black.withValues(alpha: 0.03),
  //           blurRadius: 8,
  //           offset: const Offset(0, 2),
  //         ),
  //       ],
  //     ),
  //     child: Row(
  //       children: [
  //         // Container(
  //         //   padding: const EdgeInsets.all(12),
  //         //   decoration: BoxDecoration(
  //         //     gradient: _masterNotifications
  //         //         ? LinearGradient(
  //         //             colors: [
  //         //               const Color(0xFF2E7BF0),
  //         //               const Color(0xFF06B6D4),
  //         //             ],
  //         //           )
  //         //         : null,
  //         //     color: _masterNotifications ? null : const Color(0xFFF1F5F9),
  //         //     borderRadius: BorderRadius.circular(12),
  //         //   ),
  //         //   child: Icon(
  //         //     _masterNotifications
  //         //         ? Icons.notifications_active
  //         //         : Icons.notifications_off,
  //         //     color: _masterNotifications
  //         //         ? Colors.white
  //         //         : const Color(0xFF64748B),
  //         //     size: 24,
  //         //   ),
  //         // ),

  //         // const SizedBox(width: 16),
  //         // Expanded(
  //         //   child: Column(
  //         //     crossAxisAlignment: CrossAxisAlignment.start,
  //         //     children: [
  //         //       Text(
  //         //         'Bật/Tắt tất cả thông báo',
  //         //         style: TextStyle(
  //         //           fontSize: 16,
  //         //           fontWeight: FontWeight.w600,
  //         //           color: _masterNotifications
  //         //               ? const Color(0xFF1E293B)
  //         //               : const Color(0xFF64748B),
  //         //         ),
  //         //       ),
  //         //       const SizedBox(height: 4),
  //         //       Text(
  //         //         'Điều khiển toàn bộ hệ thống thông báo',
  //         //         style: TextStyle(
  //         //           fontSize: 13,
  //         //           color: const Color(0xFF64748B),
  //         //           fontWeight: FontWeight.w400,
  //         //         ),
  //         //       ),
  //         //     ],
  //         //   ),
  //         // ),
  //         // Switch(
  //         //   value: _masterNotifications,
  //         //   onChanged: (value) {
  //         //     setState(() {
  //         //       _masterNotifications = value;
  //         //       if (!value) {
  //         //         _appNotifications = false;
  //         //         _emailNotifications = false;
  //         //         _smsNotifications = false;
  //         //         _callNotifications = false;
  //         //         _deviceAlerts = false;
  //         //       }
  //         //     });
  //         //   },
  //         //   activeColor: Colors.white,
  //         //   activeTrackColor: const Color(0xFF2E7BF0),
  //         //   inactiveThumbColor: const Color(0xFFD1D5DB),
  //         //   inactiveTrackColor: const Color(0xFFF3F4F6),
  //         // ),
  //       ],
  //     ),
  //   );
  // }

  Widget _buildNotificationSettings() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Text(
              'Phương thức thông báo',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w700,
                color: Color(0xFF1E293B),
                letterSpacing: -0.5,
              ),
            ),
            const Spacer(),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: const Color(0xFF10B981).withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(
                  color: const Color(0xFF10B981).withValues(alpha: 0.2),
                ),
              ),
              child: Text(
                '${_getActiveNotificationsCount()}/5 active',
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF10B981),
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        AnimatedOpacity(
          opacity: _masterNotifications ? 1.0 : 0.5,
          duration: const Duration(milliseconds: 300),
          child: Column(
            children: [
              AbsorbPointer(
                absorbing: true,
                child: _buildNotificationOption(
                  icon: Icons.phone_android,
                  title: 'Thông báo qua app',
                  subtitle:
                      'Push notification trực tiếp từ ứng dụng (không thể tắt)',
                  value: true,
                  color: const Color(0xFF2E7BF0),
                  enabled: true,
                  onChanged: (_) {},
                ),
              ),

              const SizedBox(height: 16),
              _buildNotificationOption(
                icon: Icons.email_outlined,
                title: 'Email',
                subtitle: 'Gửi thông báo qua email đã đăng ký',
                value: _emailNotifications && _masterNotifications,
                color: const Color(0xFF10B981),
                enabled: _masterNotifications,
                onChanged: _masterNotifications
                    ? (value) {
                        setState(() {
                          _emailNotifications = value;
                        });
                      }
                    : null,
              ),
              const SizedBox(height: 16),
              _buildNotificationOption(
                icon: Icons.sms_outlined,
                title: 'SMS',
                subtitle: 'Gửi tin nhắn đến số điện thoại',
                value: _smsNotifications && _masterNotifications,
                color: const Color(0xFFF59E0B),
                enabled: _masterNotifications,
                onChanged: _masterNotifications
                    ? (value) {
                        setState(() {
                          _smsNotifications = value;
                        });
                      }
                    : null,
              ),
              const SizedBox(height: 16),
              _buildNotificationOption(
                icon: Icons.devices_other,
                title: 'Cảnh báo thiết bị (Đang phát triển)',
                subtitle: 'Thông báo trực tiếp từ thiết bị - Sắp có',
                value: false, // Always false for developing feature
                color: const Color(0xFF6B7280),
                enabled: false, // Disabled
                onChanged: null, // No action
              ),
              const SizedBox(height: 16),
              _buildNotificationOption(
                icon: Icons.phone_outlined,
                title: 'Thông báo bằng cuộc gọi',
                subtitle: 'Gọi điện khi có cảnh báo khẩn cấp',
                value: _callNotifications && _masterNotifications,
                color: const Color(0xFFEF4444),
                enabled: _masterNotifications,
                onChanged: _masterNotifications
                    ? (value) {
                        setState(() {
                          _callNotifications = value;
                        });
                      }
                    : null,
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildNotificationOption({
    required IconData icon,
    required String title,
    required String subtitle,
    required bool value,
    required Color color,
    required bool enabled,
    required ValueChanged<bool>? onChanged,
  }) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: value && enabled
              ? color.withValues(alpha: 0.3)
              : const Color(0xFFE2E8F0),
          width: value && enabled ? 2 : 1,
        ),
        boxShadow: [
          BoxShadow(
            color: value && enabled
                ? color.withValues(alpha: 0.08)
                : Colors.black.withValues(alpha: 0.03),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: value && enabled
                  ? color.withValues(alpha: 0.1)
                  : const Color(0xFFF1F5F9),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: value && enabled
                    ? color.withValues(alpha: 0.2)
                    : Colors.transparent,
              ),
            ),
            child: Icon(
              icon,
              color: value && enabled ? color : const Color(0xFF64748B),
              size: 22,
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    color: enabled
                        ? const Color(0xFF1E293B)
                        : const Color(0xFF64748B),
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  subtitle,
                  style: const TextStyle(
                    fontSize: 13,
                    color: Color(0xFF64748B),
                    fontWeight: FontWeight.w400,
                    height: 1.3,
                  ),
                ),
              ],
            ),
          ),
          Switch(
            value: value,
            onChanged: onChanged,
            activeColor: Colors.white,
            activeTrackColor: color,
            inactiveThumbColor: const Color(0xFFD1D5DB),
            inactiveTrackColor: const Color(0xFFF3F4F6),
            materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
          ),
        ],
      ),
    );
  }

  Widget _buildQuickActions() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Thao tác nhanh',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w700,
            color: Color(0xFF1E293B),
            letterSpacing: -0.5,
          ),
        ),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(
              child: _buildQuickActionButton(
                icon: Icons.select_all,
                label: 'Bật tất cả',
                color: const Color(0xFF10B981),
                onPressed: () {
                  setState(() {
                    _masterNotifications = true;
                    _appNotifications = true;
                    _emailNotifications = true;
                    _smsNotifications = true;
                    _callNotifications = true;
                    _deviceAlerts = true;
                  });
                },
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _buildQuickActionButton(
                icon: Icons.clear_all,
                label: 'Tắt tất cả',
                color: const Color(0xFFEF4444),
                onPressed: () {
                  setState(() {
                    _masterNotifications = false;
                    _appNotifications = true;
                    _emailNotifications = false;
                    _smsNotifications = false;
                    _callNotifications = false;
                    _deviceAlerts = false;
                  });
                },
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildQuickActionButton({
    required IconData icon,
    required String label,
    required Color color,
    required VoidCallback onPressed,
  }) {
    return Container(
      height: 48,
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.2)),
      ),
      child: TextButton.icon(
        onPressed: onPressed,
        style: TextButton.styleFrom(
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
        icon: Icon(icon, color: color, size: 18),
        label: Text(
          label,
          style: TextStyle(
            color: color,
            fontSize: 14,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
    );
  }

  Widget _buildSaveButton() {
    return Container(
      width: double.infinity,
      height: 56,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [const Color(0xFF2E7BF0), const Color(0xFF06B6D4)],
        ),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF2E7BF0).withValues(alpha: 0.3),
            blurRadius: 12,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: ElevatedButton.icon(
        onPressed: _saving
            ? null
            : () async {
                setState(() {
                  _saving = true;
                });

                try {
                  // Use the shared service instance created in initState
                  await _service.toggleSetting(
                    'notification.email_enabled',
                    _emailNotifications,
                  );
                  await _service.toggleSetting(
                    'notification.sms_enabled',
                    _smsNotifications,
                  );
                  await _service.toggleSetting(
                    'notification.enable_call_notification',
                    _callNotifications,
                  );
                  await _service.toggleSetting(
                    'notification.push_enabled',
                    _appNotifications,
                  );

                  if (!mounted) return;
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Row(
                        children: const [
                          Icon(Icons.check_circle, color: Colors.white),
                          SizedBox(width: 12),
                          Text(
                            'Đã lưu cài đặt thông báo thành công',
                            style: TextStyle(fontWeight: FontWeight.w600),
                          ),
                        ],
                      ),
                      backgroundColor: const Color(0xFF10B981),
                      behavior: SnackBarBehavior.floating,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.all(Radius.circular(12)),
                      ),
                      margin: const EdgeInsets.all(16),
                    ),
                  );

                  // After successful update, go back to the previous screen
                  if (mounted) Navigator.pop(context);
                } catch (e) {
                  if (mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('Lưu thất bại: ${e.toString()}')),
                    );
                  }
                } finally {
                  if (mounted) {
                    setState(() {
                      _saving = false;
                    });
                  }
                }
              },

        style: ElevatedButton.styleFrom(
          backgroundColor: Colors.transparent,
          shadowColor: Colors.transparent,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
        ),
        icon: _saving
            ? const SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(
                  valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                  strokeWidth: 2,
                ),
              )
            : const Icon(Icons.save, color: Colors.white, size: 20),
        label: Text(
          _saving ? 'Đang lưu...' : 'Lưu cài đặt',
          style: const TextStyle(
            color: Colors.white,
            fontSize: 16,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
    );
  }

  int _getActiveNotificationsCount() {
    int count = 0;
    if (_appNotifications) count++;
    if (_emailNotifications && _masterNotifications) count++;
    if (_smsNotifications && _masterNotifications) count++;
    if (_callNotifications && _masterNotifications) count++;
    if (_deviceAlerts && _masterNotifications) count++;
    return count;
  }
}
