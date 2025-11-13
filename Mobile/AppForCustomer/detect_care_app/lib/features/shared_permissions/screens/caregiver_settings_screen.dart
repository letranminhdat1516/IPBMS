import 'package:flutter/material.dart';

import 'package:detect_care_app/features/shared_permissions/data/shared_permissions_remote_data_source.dart';
import 'package:detect_care_app/features/shared_permissions/models/shared_permissions.dart';

class CaregiverSettingsScreen extends StatefulWidget {
  final String caregiverId;
  final String caregiverDisplay;
  final String customerId;

  const CaregiverSettingsScreen({
    super.key,
    required this.caregiverId,
    required this.caregiverDisplay,
    required this.customerId,
  });

  @override
  State<CaregiverSettingsScreen> createState() =>
      _CaregiverSettingsScreenState();
}

class _CaregiverSettingsScreenState extends State<CaregiverSettingsScreen> {
  late final SharedPermissionsRemoteDataSource _ds;

  Future<SharedPermissions>? _future;
  SharedPermissions? _value;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _ds = SharedPermissionsRemoteDataSource();
    _future = _load();
  }

  Future<SharedPermissions> _load() async {
    final data = await _ds.getSharedPermissions(
      customerId: widget.customerId,
      caregiverId: widget.caregiverId,
    );
    _value = data;
    return data;
  }

  Future<void> _save() async {
    if (_value == null) return;
    setState(() => _saving = true);
    try {
      final saved = await _ds.updateSharedPermissions(
        customerId: widget.customerId,
        caregiverId: widget.caregiverId,
        data: _value!,
      );
      setState(() => _value = saved);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('Đã lưu thiết lập'),
          backgroundColor: Colors.green[600],
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Lưu thất bại: $e'),
          backgroundColor: Colors.red[600],
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
      );
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  void _toggleChannel(String ch, bool on) {
    final now = List<String>.from(_value?.notificationChannel ?? const []);
    if (on) {
      if (!now.contains(ch)) now.add(ch);
    } else {
      now.removeWhere((e) => e == ch);
    }
    setState(() {
      _value = _value?.copyWith(notificationChannel: now);
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Thiết lập Caregiver',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w600,
                color: Color(0xFF1E293B),
              ),
            ),
            Text(
              widget.caregiverDisplay,
              style: const TextStyle(
                fontSize: 14,
                color: Color(0xFF64748B),
                fontWeight: FontWeight.w400,
              ),
            ),
          ],
        ),
        backgroundColor: Colors.white,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        iconTheme: const IconThemeData(color: Color(0xFF64748B)),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Container(height: 1, color: const Color(0xFFE2E8F0)),
        ),
      ),
      body: FutureBuilder<SharedPermissions>(
        future: _future,
        builder: (context, snap) {
          if (snap.connectionState != ConnectionState.done) {
            return const Center(
              child: CircularProgressIndicator(
                strokeWidth: 3,
                color: Color(0xFF3B82F6),
              ),
            );
          }
          if (snap.hasError) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.error_outline, size: 48, color: Colors.red[400]),
                  const SizedBox(height: 16),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 24),
                    child: Text(
                      'Không thể tải thiết lập chia sẻ quyền',
                      style: TextStyle(color: Colors.red[600], fontSize: 16),
                      textAlign: TextAlign.center,
                    ),
                  ),
                  const SizedBox(height: 8),
                  TextButton(
                    onPressed: () => setState(() => _future = _load()),
                    child: const Text('Thử lại'),
                  ),
                ],
              ),
            );
          }

          final v = _value!;
          return SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Permissions Section
                _buildSection(
                  title: 'Quyền truy cập',
                  icon: Icons.security_outlined,
                  children: [
                    _buildSwitchTile(
                      title: 'Xem live stream',
                      subtitle: 'Cho phép xem camera trực tiếp',
                      icon: Icons.videocam_outlined,
                      value: v.streamView,
                      onChanged: (b) =>
                          setState(() => _value = v.copyWith(streamView: b)),
                    ),
                    _buildSwitchTile(
                      title: 'Xem hồ sơ bệnh nhân',
                      subtitle: 'Truy cập thông tin cá nhân',
                      icon: Icons.person_outline,
                      value: v.profileView,
                      onChanged: (b) =>
                          setState(() => _value = v.copyWith(profileView: b)),
                    ),
                  ],
                ),

                const SizedBox(height: 20),

                // Alerts Section
                _buildSection(
                  title: 'Cảnh báo',
                  icon: Icons.notifications_outlined,
                  children: [
                    _buildSwitchTile(
                      title: 'Xem cảnh báo',
                      subtitle: 'Có thể đọc các thông báo cảnh báo',
                      icon: Icons.visibility_outlined,
                      value: v.alertRead,
                      onChanged: (b) =>
                          setState(() => _value = v.copyWith(alertRead: b)),
                    ),
                    _buildSwitchTile(
                      title: 'Cập nhật cảnh báo',
                      subtitle: 'Có thể xác nhận và cập nhật cảnh báo',
                      icon: Icons.edit_notifications_outlined,
                      value: v.alertAck,
                      onChanged: (b) =>
                          setState(() => _value = v.copyWith(alertAck: b)),
                    ),
                  ],
                ),

                const SizedBox(height: 20),

                // Data Access Section
                _buildSection(
                  title: 'Truy cập dữ liệu',
                  icon: Icons.data_usage_outlined,
                  children: [
                    _buildNumberTile(
                      title: 'Số ngày xem logs',
                      subtitle: 'Thời gian truy cập lịch sử hoạt động',
                      icon: Icons.history,
                      value: v.logAccessDays,
                      onChanged: (n) =>
                          setState(() => _value = v.copyWith(logAccessDays: n)),
                    ),
                    _buildNumberTile(
                      title: 'Số ngày xem báo cáo',
                      subtitle: 'Thời gian truy cập báo cáo tổng hợp',
                      icon: Icons.assessment_outlined,
                      value: v.reportAccessDays,
                      onChanged: (n) => setState(
                        () => _value = v.copyWith(reportAccessDays: n),
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 20),

                // Notification Channels Section
                _buildSection(
                  title: 'Kênh thông báo',
                  icon: Icons.send_outlined,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Chọn cách thức nhận thông báo',
                            style: TextStyle(
                              color: Color(0xFF64748B),
                              fontSize: 14,
                            ),
                          ),
                          const SizedBox(height: 12),
                          Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: [
                              _buildChannelChip(
                                'push',
                                'Push',
                                Icons.notifications_active,
                                v.notificationChannel.contains('push'),
                              ),
                              _buildChannelChip(
                                'sms',
                                'SMS',
                                Icons.sms_outlined,
                                v.notificationChannel.contains('sms'),
                              ),
                              _buildChannelChip(
                                'email',
                                'Email',
                                Icons.email_outlined,
                                v.notificationChannel.contains('email'),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 32),

                // Save Button
                SizedBox(
                  width: double.infinity,
                  child: FilledButton.icon(
                    onPressed: _saving ? null : _save,
                    style: FilledButton.styleFrom(
                      backgroundColor: const Color(0xFF3B82F6),
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    icon: _saving
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : const Icon(Icons.save_outlined, size: 20),
                    label: Text(
                      _saving ? 'Đang lưu...' : 'Lưu thay đổi',
                      style: const TextStyle(
                        fontWeight: FontWeight.w600,
                        fontSize: 16,
                        color: Colors.white,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildSection({
    required String title,
    required IconData icon,
    required List<Widget> children,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF64748B).withValues(alpha: 0.08 * 255),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: const BoxDecoration(
              border: Border(
                bottom: BorderSide(color: Color(0xFFF1F5F9), width: 1),
              ),
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: const Color(0xFF3B82F6).withValues(alpha: 0.1 * 255),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(icon, size: 20, color: const Color(0xFF3B82F6)),
                ),
                const SizedBox(width: 12),
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF1E293B),
                  ),
                ),
              ],
            ),
          ),
          ...children,
        ],
      ),
    );
  }

  Widget _buildSwitchTile({
    required String title,
    required String subtitle,
    required IconData icon,
    required bool value,
    required ValueChanged<bool> onChanged,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          Icon(icon, size: 20, color: const Color(0xFF64748B)),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w500,
                    color: Color(0xFF1E293B),
                  ),
                ),
                Text(
                  subtitle,
                  style: const TextStyle(
                    fontSize: 13,
                    color: Color(0xFF64748B),
                  ),
                ),
              ],
            ),
          ),
          Switch(
            value: value,
            onChanged: onChanged,
            activeColor: const Color(0xFF2E7BF0),
            inactiveThumbColor: const Color(0xFF94A3B8),
            inactiveTrackColor: const Color(0xFFE2E8F0),
          ),
        ],
      ),
    );
  }

  Widget _buildNumberTile({
    required String title,
    required String subtitle,
    required IconData icon,
    required int value,
    required ValueChanged<int> onChanged,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          Icon(icon, size: 20, color: const Color(0xFF64748B)),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w500,
                    color: Color(0xFF1E293B),
                  ),
                ),
                Text(
                  subtitle,
                  style: const TextStyle(
                    fontSize: 13,
                    color: Color(0xFF64748B),
                  ),
                ),
              ],
            ),
          ),
          Container(
            decoration: BoxDecoration(
              color: const Color(0xFFF1F5F9),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                IconButton(
                  onPressed: value > 0 ? () => onChanged(value - 1) : null,
                  icon: const Icon(Icons.remove, size: 18),
                  color: value > 0
                      ? const Color(0xFF64748B)
                      : const Color(0xFFCBD5E1),
                  padding: const EdgeInsets.all(8),
                  constraints: const BoxConstraints(
                    minWidth: 36,
                    minHeight: 36,
                  ),
                ),
                Container(
                  width: 40,
                  alignment: Alignment.center,
                  child: Text(
                    '$value',
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF1E293B),
                    ),
                  ),
                ),
                IconButton(
                  onPressed: () => onChanged(value + 1),
                  icon: const Icon(Icons.add, size: 18),
                  color: const Color(0xFF64748B),
                  padding: const EdgeInsets.all(8),
                  constraints: const BoxConstraints(
                    minWidth: 36,
                    minHeight: 36,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildChannelChip(
    String value,
    String label,
    IconData icon,
    bool selected,
  ) {
    return FilterChip(
      label: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            icon,
            size: 16,
            color: selected ? const Color(0xFF3B82F6) : const Color(0xFF64748B),
          ),
          const SizedBox(width: 4),
          Text(
            label,
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w500,
              color: selected
                  ? const Color(0xFF3B82F6)
                  : const Color(0xFF64748B),
            ),
          ),
        ],
      ),
      selected: selected,
      onSelected: (on) => _toggleChannel(value, on),
      backgroundColor: Colors.white,
      selectedColor: const Color(0xFF3B82F6).withValues(alpha: 0.1 * 255),
      checkmarkColor: const Color(0xFF3B82F6),
      side: BorderSide(
        color: selected ? const Color(0xFF3B82F6) : const Color(0xFFE2E8F0),
        width: 1.5,
      ),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
    );
  }
}
