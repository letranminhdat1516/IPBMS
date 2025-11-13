import 'package:detect_care_app/features/assignments/data/assignments_remote_data_source.dart';
import 'package:detect_care_app/features/assignments/screens/assignments_constants.dart';
import 'package:flutter/material.dart';

class AssignmentListItem extends StatefulWidget {
  final Assignment assignment;
  final Function(Assignment, int) onEditPermissions;
  final Function(Assignment) onUnassign;
  final int index;

  const AssignmentListItem({
    super.key,
    required this.assignment,
    required this.onEditPermissions,
    required this.onUnassign,
    required this.index,
  });

  @override
  State<AssignmentListItem> createState() => _AssignmentListItemState();
}

class _AssignmentListItemState extends State<AssignmentListItem> {
  late Set<String> _expandedAssignments;

  @override
  void initState() {
    super.initState();
    _expandedAssignments = <String>{};
  }

  String _formatIso(String? iso) {
    if (iso == null || iso.isEmpty) return '';
    try {
      final dt = DateTime.parse(iso).toLocal();
      return '${dt.day.toString().padLeft(2, '0')}/${dt.month.toString().padLeft(2, '0')}/${dt.year} ${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
    } catch (_) {
      return iso;
    }
  }

  @override
  Widget build(BuildContext context) {
    final a = widget.assignment;
    final statusRaw = (a.status ?? '').toString();
    final status = statusRaw.toLowerCase();
    final isAccepted = status == 'accepted';

    final displayName = (a.caregiverName != null && a.caregiverName!.isNotEmpty)
        ? a.caregiverName!
        : (a.caregiverId.isNotEmpty ? a.caregiverId : 'Caregiver');

    String pretty(String k) {
      final s = k.replaceAll('_', ' ').replaceAll('-', ' ');
      if (s.isEmpty) return s;
      return s[0].toUpperCase() + s.substring(1);
    }

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      elevation: 0.8,
      child: InkWell(
        onTap: () {
          setState(() {
            if (_expandedAssignments.contains(a.assignmentId)) {
              _expandedAssignments.remove(a.assignmentId);
            } else {
              _expandedAssignments.add(a.assignmentId);
            }
          });
        },
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Avatar / Icon
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: AssignmentsConstants.accentBlue,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(Icons.person, color: Colors.white, size: 22),
              ),
              const SizedBox(width: 12),

              // Main details
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            displayName,
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        const SizedBox(width: 8),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'Mời lúc: ${_formatIso(a.assignedAt)}',
                      style: TextStyle(
                        color: Colors.grey.shade600,
                        fontSize: 13,
                      ),
                    ),
                    const SizedBox(height: 6),
                    // Status pill
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: (status == 'accepted')
                            ? Colors.green.shade50
                            : (status == 'pending' || status == 'invited')
                            ? Colors.orange.shade50
                            : Colors.grey.shade50,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                          color: (status == 'accepted')
                              ? Colors.green.shade200
                              : (status == 'pending' || status == 'invited')
                              ? Colors.orange.shade200
                              : Colors.grey.shade200,
                        ),
                      ),
                      child: Text(
                        statusRaw.isNotEmpty
                            ? (status == 'accepted'
                                  ? 'Đã chấp nhận'
                                  : (status == 'pending' || status == 'invited')
                                  ? 'Đang chờ'
                                  : statusRaw)
                            : 'Không xác định',
                        style: TextStyle(
                          color: (status == 'accepted')
                              ? Colors.green.shade800
                              : (status == 'pending' || status == 'invited')
                              ? Colors.orange.shade800
                              : Colors.grey.shade800,
                          fontWeight: FontWeight.w700,
                          fontSize: 12,
                        ),
                      ),
                    ),
                    const SizedBox(height: 10),

                    if (a.sharedPermissions != null &&
                        a.sharedPermissions!.isNotEmpty)
                      Builder(
                        builder: (ctx2) {
                          Widget mkChip(String label, {bool enabled = true}) {
                            return Chip(
                              label: Text(label),
                              backgroundColor: enabled
                                  ? Colors.green.shade50
                                  : Colors.grey.shade100,
                              labelStyle: TextStyle(
                                color: enabled
                                    ? Colors.green.shade800
                                    : Colors.grey.shade700,
                                fontWeight: FontWeight.w600,
                              ),
                              side: BorderSide(
                                color: enabled
                                    ? Colors.green.shade200
                                    : Colors.grey.shade200,
                              ),
                            );
                          }

                          // Build full list of chips
                          final fullChips = a.sharedPermissions!.entries
                              .expand<Widget>((e) {
                                final key = e.key.toString();
                                final dynamic val = e.value;

                                // Numeric fields
                                if (key == 'log_access_days' ||
                                    key == 'report_access_days') {
                                  int n = 0;
                                  if (val is int) {
                                    n = val;
                                  } else if (val is String) {
                                    n = int.tryParse(val) ?? 0;
                                  }
                                  final label = key == 'log_access_days'
                                      ? 'Số ngày xem log: $n'
                                      : 'Số ngày xem báo cáo: $n';
                                  return [mkChip(label, enabled: n > 0)];
                                }

                                // Notification channels (expand list)
                                if (key == 'notification_channel') {
                                  final List<String> list = [];
                                  if (val is List) {
                                    for (final it in val) {
                                      list.add(it.toString());
                                    }
                                  } else if (val is String) {
                                    list.addAll(
                                      val.split(',').map((s) => s.trim()),
                                    );
                                  }
                                  return list.map((ch) {
                                    final lower = ch.toLowerCase();
                                    final label = lower == 'push'
                                        ? 'Push'
                                        : (lower == 'sms'
                                              ? 'SMS'
                                              : (lower == 'email'
                                                    ? 'Email'
                                                    : (lower == 'call' ||
                                                              lower ==
                                                                  'phone' ||
                                                              lower == 'voice'
                                                          ? 'Gọi'
                                                          : pretty(ch))));
                                    return mkChip(label, enabled: true);
                                  });
                                }

                                final vn = <String, String>{
                                  'stream_view': 'Xem luồng',
                                  'alert_read': 'Đọc thông báo',
                                  'alert_ack': 'Xác nhận thông báo',
                                  'profile_view': 'Xem hồ sơ',
                                };

                                final enabled =
                                    val == true || val == '1' || val == 1;
                                final label = vn.containsKey(key)
                                    ? vn[key]!
                                    : pretty(key);
                                return [mkChip(label, enabled: enabled)];
                              })
                              .toList();

                          final isExpanded = _expandedAssignments.contains(
                            a.assignmentId,
                          );

                          if (!isExpanded) {
                            final summaryLabels = <String>[];
                            try {
                              for (final e in a.sharedPermissions!.entries) {
                                final k = e.key.toString();
                                final dynamic v = e.value;
                                if (k == 'notification_channel') {
                                  final chs = <String>[];
                                  if (v is List) {
                                    chs.addAll(v.map((e) => e.toString()));
                                  } else if (v is String) {
                                    chs.addAll(
                                      v.split(',').map((s) => s.trim()),
                                    );
                                  }
                                  for (final ch in chs) {
                                    final lower = ch.toLowerCase();
                                    if (lower == 'call' ||
                                        lower == 'phone' ||
                                        lower == 'voice') {
                                      summaryLabels.add('Gọi');
                                    } else if (lower == 'push') {
                                      summaryLabels.add('Push');
                                    } else if (lower == 'sms') {
                                      summaryLabels.add('SMS');
                                    } else if (lower == 'email') {
                                      summaryLabels.add('Email');
                                    }
                                  }
                                } else if (k == 'log_access_days' ||
                                    k == 'report_access_days') {
                                  int n = 0;
                                  if (v is int) {
                                    n = v;
                                  } else if (v is String) {
                                    n = int.tryParse(v) ?? 0;
                                  }
                                  if (n > 0) {
                                    summaryLabels.add(
                                      k == 'log_access_days'
                                          ? 'Log: $n'
                                          : 'Báo cáo: $n',
                                    );
                                  }
                                } else {
                                  final enabled =
                                      v == true || v == '1' || v == 1;
                                  if (enabled) {
                                    final vnMap = <String, String>{
                                      'stream_view': 'Xem luồng',
                                      'alert_read': 'Đọc thông báo',
                                      'alert_ack': 'Xác nhận thông báo',
                                      'profile_view': 'Xem hồ sơ',
                                    };
                                    summaryLabels.add(
                                      vnMap.containsKey(k)
                                          ? vnMap[k]!
                                          : pretty(k),
                                    );
                                  }
                                }
                              }
                            } catch (_) {}

                            final summary = summaryLabels.isNotEmpty
                                ? summaryLabels.join(', ')
                                : 'Không có quyền';
                            return Padding(
                              padding: const EdgeInsets.only(top: 6.0),
                              child: Text(
                                summary,
                                style: TextStyle(
                                  color: Colors.grey.shade700,
                                  fontSize: 13,
                                ),
                              ),
                            );
                          }

                          return Wrap(
                            spacing: 8,
                            runSpacing: 6,
                            children: fullChips,
                          );
                        },
                      ),
                  ],
                ),
              ),

              Column(
                children: [
                  if (isAccepted)
                    IconButton(
                      icon: const Icon(Icons.edit),
                      tooltip: 'Sửa quyền chia sẻ',
                      onPressed: () =>
                          widget.onEditPermissions(a, widget.index),
                    ),
                  IconButton(
                    icon: const Icon(Icons.link_off),
                    tooltip: 'Hủy gán',
                    onPressed: () async {
                      final ok = await showDialog<bool>(
                        context: context,
                        builder: (dctx) => AlertDialog(
                          backgroundColor: Colors.white,
                          title: const Text('Xác nhận hủy gán'),
                          content: const Text(
                            'Bạn có chắc muốn hủy gán / hủy lời mời này không?',
                          ),
                          actions: [
                            TextButton(
                              onPressed: () => Navigator.pop(dctx, false),
                              child: const Text('Hủy'),
                            ),
                            TextButton(
                              onPressed: () => Navigator.pop(dctx, true),
                              style: TextButton.styleFrom(
                                backgroundColor: Colors.red.shade600,
                                foregroundColor: Colors.white,
                              ),
                              child: const Text('Xác nhận'),
                            ),
                          ],
                        ),
                      );
                      if (ok == true) widget.onUnassign(a);
                    },
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
