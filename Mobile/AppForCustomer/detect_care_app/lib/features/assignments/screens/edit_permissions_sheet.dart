import 'dart:convert';

import 'package:detect_care_app/features/assignments/data/assignments_remote_data_source.dart';
import 'package:detect_care_app/features/shared_permissions/models/shared_permissions.dart';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

class EditPermissionsSheet extends StatefulWidget {
  final Assignment assignment;
  final int index;

  const EditPermissionsSheet({
    super.key,
    required this.assignment,
    required this.index,
  });

  @override
  State<EditPermissionsSheet> createState() => _EditPermissionsSheetState();
}

class _EditPermissionsSheetState extends State<EditPermissionsSheet> {
  late bool streamView;
  late bool alertRead;
  late bool alertAck;
  late bool profileView;
  late int logAccessDays;
  late int reportAccessDays;
  late Set<String> notificationChannel;

  @override
  void initState() {
    super.initState();
    final existing = widget.assignment.sharedPermissions ?? {};

    streamView = existing['stream_view'] == true;
    alertRead = existing['alert_read'] == true;
    alertAck = existing['alert_ack'] == true;
    profileView = existing['profile_view'] == true;

    logAccessDays = (existing['log_access_days'] is int)
        ? (existing['log_access_days'] as int)
        : int.tryParse(existing['log_access_days']?.toString() ?? '') ?? 0;
    reportAccessDays = (existing['report_access_days'] is int)
        ? (existing['report_access_days'] as int)
        : int.tryParse(existing['report_access_days']?.toString() ?? '') ?? 0;

    notificationChannel = <String>{};
    if (existing['notification_channel'] is List) {
      for (final v in existing['notification_channel'] as List) {
        notificationChannel.add(v.toString());
      }
    }

    notificationChannel.add('push');

    _hydrateFromLocalPersisted();
  }

  Future<void> _hydrateFromLocalPersisted() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final key =
          'assignment_shared_permissions_${widget.assignment.assignmentId}';
      final s = prefs.getString(key);
      if (s == null || s.isEmpty) return;
      final decoded = json.decode(s) as Map<String, dynamic>;

      final nv = <String, dynamic>{};
      decoded.forEach((k, v) => nv[k.toString()] = v);

      if (!mounted) return;
      setState(() {
        streamView = nv['stream_view'] == true || nv['stream:view'] == true;
        alertRead = nv['alert_read'] == true || nv['alert:read'] == true;
        alertAck = nv['alert_ack'] == true || nv['alert:ack'] == true;
        profileView = nv['profile_view'] == true || nv['profile:view'] == true;

        logAccessDays = (nv['log_access_days'] is int)
            ? (nv['log_access_days'] as int)
            : int.tryParse(nv['log_access_days']?.toString() ?? '') ??
                  logAccessDays;

        reportAccessDays = (nv['report_access_days'] is int)
            ? (nv['report_access_days'] as int)
            : int.tryParse(nv['report_access_days']?.toString() ?? '') ??
                  reportAccessDays;

        if (nv['notification_channel'] is List) {
          notificationChannel = <String>{};
          for (final v in nv['notification_channel'] as List) {
            notificationChannel.add(v.toString());
          }
          notificationChannel.add('push');
        }
      });
    } catch (_) {
      // ignore failures
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final blue = const Color(0xFF007AFF);
    final lightBg = Colors.white;

    return Container(
      color: lightBg,
      padding: EdgeInsets.only(
        left: 16,
        right: 16,
        top: 20,
        bottom: MediaQuery.of(context).viewInsets.bottom + 20,
      ),
      child: StatefulBuilder(
        builder: (c, setC) {
          return Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Text(
                  'Chỉnh sửa quyền chia sẻ',
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: blue,
                  ),
                ),
              ),
              const SizedBox(height: 16),
              _buildSwitchTile(
                title: 'Xem luồng',
                subtitle: 'Cho phép xem luồng video/sự kiện',
                value: streamView,
                onChanged: (v) => setC(() => streamView = v),
              ),
              _buildSwitchTile(
                title: 'Đọc thông báo',
                subtitle: 'Cho phép xem nội dung thông báo',
                value: alertRead,
                onChanged: (v) => setC(() => alertRead = v),
              ),
              _buildSwitchTile(
                title: 'Xác nhận thông báo',
                subtitle: 'Cho phép đánh dấu đã xử lý thông báo',
                value: alertAck,
                onChanged: (v) => setC(() => alertAck = v),
              ),
              _buildSwitchTile(
                title: 'Xem hồ sơ',
                subtitle: 'Cho phép xem thông tin hồ sơ người dùng',
                value: profileView,
                onChanged: (v) => setC(() => profileView = v),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      initialValue: logAccessDays.toString(),
                      keyboardType: TextInputType.number,
                      decoration: InputDecoration(
                        labelText: 'Số ngày xem log',
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ),
                      onChanged: (v) =>
                          setC(() => logAccessDays = int.tryParse(v) ?? 0),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: TextFormField(
                      initialValue: reportAccessDays.toString(),
                      keyboardType: TextInputType.number,
                      decoration: InputDecoration(
                        labelText: 'Số ngày xem báo cáo',
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ),
                      onChanged: (v) =>
                          setC(() => reportAccessDays = int.tryParse(v) ?? 0),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),
              Text(
                'Kênh thông báo',
                style: theme.textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w600,
                  color: blue,
                ),
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  FilterChip(
                    label: const Text('Push (bắt buộc)'),
                    selected: true,
                    onSelected: null, //  không thể tắt
                    backgroundColor: blue.withValues(alpha: 0.08),
                    selectedColor: blue.withValues(alpha: 0.2),
                    labelStyle: TextStyle(
                      color: blue,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  FilterChip(
                    label: const Text('SMS'),
                    selected: notificationChannel.contains('sms'),
                    onSelected: (v) => setC(
                      () => v
                          ? notificationChannel.add('sms')
                          : notificationChannel.remove('sms'),
                    ),
                  ),
                  FilterChip(
                    label: const Text('Email'),
                    selected: notificationChannel.contains('email'),
                    onSelected: (v) => setC(
                      () => v
                          ? notificationChannel.add('email')
                          : notificationChannel.remove('email'),
                    ),
                  ),
                  FilterChip(
                    label: const Text('Gọi'),
                    selected:
                        notificationChannel.contains('call') ||
                        notificationChannel.contains('phone') ||
                        notificationChannel.contains('voice'),
                    onSelected: (v) => setC(
                      () => v
                          ? notificationChannel.add('call')
                          : notificationChannel.remove('call'),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                'Push notification trực tiếp từ ứng dụng (không thể tắt)',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: Colors.redAccent,
                  fontStyle: FontStyle.italic,
                ),
              ),
              const SizedBox(height: 20),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      style: OutlinedButton.styleFrom(
                        foregroundColor: blue,
                        side: BorderSide(color: blue),
                      ),
                      onPressed: () =>
                          Navigator.of(context).pop<SharedPermissions?>(null),
                      child: const Text('Huỷ'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: blue,
                        foregroundColor: Colors.white,
                      ),
                      onPressed: () {
                        final sp = SharedPermissions(
                          streamView: streamView,
                          alertRead: alertRead,
                          alertAck: alertAck,
                          logAccessDays: logAccessDays,
                          reportAccessDays: reportAccessDays,
                          notificationChannel: notificationChannel.toList()
                            ..add('push'),
                          profileView: profileView,
                        );
                        Navigator.of(context).pop(sp);
                      },
                      child: const Text('Lưu'),
                    ),
                  ),
                ],
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildSwitchTile({
    required String title,
    required String subtitle,
    required bool value,
    required ValueChanged<bool> onChanged,
  }) {
    final blue = const Color(0xFF007AFF);
    return SwitchListTile(
      title: Text(
        title,
        style: TextStyle(fontWeight: FontWeight.w600, color: blue),
      ),
      subtitle: Text(subtitle, style: TextStyle(color: Colors.grey[700])),
      value: value,
      onChanged: onChanged,
      activeColor: blue,
    );
  }
}
