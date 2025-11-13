import 'package:detect_care_app/features/events/screens/propose_detail_screen.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:detect_care_app/features/events/data/events_remote_data_source.dart';

class ProposalListScreen extends StatefulWidget {
  const ProposalListScreen({super.key});

  @override
  State<ProposalListScreen> createState() => _ProposalListScreenState();
}

class _ProposalListScreenState extends State<ProposalListScreen> {
  final _api = EventsRemoteDataSource();
  bool _loading = true;
  List<Map<String, dynamic>> _proposals = [];
  String _statusFilter = 'all';
  int _currentCount = 0;

  final List<Map<String, String>> _statusOptions = [
    {'key': 'all', 'label': 'Tất cả'},
    {'key': 'pending', 'label': 'Đang chờ duyệt'},
    {'key': 'approved', 'label': 'Đã chấp nhận'},
    {'key': 'rejected', 'label': 'Đã từ chối'},
  ];

  @override
  void initState() {
    super.initState();
    _loadProposals();
  }

  Future<void> _loadProposals() async {
    try {
      final result = await _api.listProposals(status: _statusFilter);
      dynamic raw;
      if (result.containsKey('proposals')) {
        raw = result['proposals'];
      } else if (result.containsKey('data') &&
          result['data'] is Map &&
          (result['data'] as Map).containsKey('proposals')) {
        raw = (result['data'] as Map)['proposals'];
      }

      final List<Map<String, dynamic>> parsed = [];
      if (raw is List) {
        for (var item in raw) {
          if (item is Map) parsed.add(Map<String, dynamic>.from(item));
        }
      }

      for (var p in parsed) {
        if (p['proposal_state'] == null) {
          debugPrint(
            '[PROPOSAL] missing proposal_state for event_id=${p['event_id']}',
          );
        }
      }

      setState(() {
        _proposals = parsed;
        _currentCount = parsed.length;
        _loading = false;
      });
    } catch (e) {
      setState(() => _loading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Không thể tải danh sách đề xuất: $e'),
          backgroundColor: Colors.red.shade600,
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  DateTime? _parseIso(dynamic iso) {
    if (iso == null) return null;
    if (iso is DateTime) return iso.toLocal();
    try {
      return DateTime.parse(iso.toString()).toLocal();
    } catch (_) {
      return null;
    }
  }

  String _fmtDateFromDate(DateTime? dt) {
    if (dt == null) return '-';
    return DateFormat('HH:mm dd/MM/yyyy').format(dt.toLocal());
  }

  Color _statusColor(String status) {
    switch (status) {
      case 'pending':
        return const Color(0xFFF59E0B);
      case 'danger':
      case 'rejected':
        return const Color(0xFFEF4444);
      case 'normal':
      case 'approved':
        return const Color(0xFF10B981);
      default:
        return const Color(0xFF6B7280);
    }
  }

  Color _statusBackgroundColor(String status) {
    switch (status) {
      case 'pending':
        return const Color(0xFFFEF3C7);
      case 'danger':
      case 'rejected':
        return const Color(0xFFFEE2E2);
      case 'normal':
      case 'approved':
        return const Color(0xFFD1FAE5);
      default:
        return const Color(0xFFF3F4F6);
    }
  }

  String _translateEventType(String? type) {
    switch (type) {
      case 'fall':
        return 'Ngã';
      case 'abnormal_behavior':
        return 'Hành vi bất thường';
      case 'emergency':
        return 'Khẩn cấp';
      case 'normal_activity':
        return 'Hoạt động bình thường';
      case 'sleep':
        return 'Ngủ nghỉ';
      default:
        return '-';
    }
  }

  String _translateStatus(String? s) {
    switch (s) {
      case 'normal':
        return 'Bình thường';
      case 'warning':
        return 'Cảnh báo';
      case 'danger':
        return 'Nguy hiểm';
      default:
        return s ?? '-';
    }
  }

  String _translateProposalState(String? s) {
    switch (s) {
      case 'pending':
        return 'Đang chờ duyệt';
      case 'approved':
        return 'Đã chấp nhận';
      case 'rejected':
        return 'Đã từ chối';
      default:
        return '-';
    }
  }

  IconData _getStatusIcon(String status) {
    switch (status) {
      case 'pending':
        return Icons.schedule_rounded;
      case 'approved':
        return Icons.check_circle_rounded;
      case 'rejected':
        return Icons.cancel_rounded;
      default:
        return Icons.help_outline_rounded;
    }
  }

  String _buildChangeLabel(Map<String, dynamic> p) {
    final prevStatus = p['status'];
    final nextStatus = p['proposed_status'];
    final prevType = p['event_type'];
    final nextType = p['proposed_event_type'];

    if (prevType != null && nextType != null && prevType != nextType) {
      return 'Thay đổi loại sự kiện';
    }

    if (prevStatus != null && nextStatus != null && prevStatus != nextStatus) {
      return 'Thay đổi trạng thái';
    }

    return 'Cập nhật sự kiện';
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
          'Đề Xuất Thay Đổi Sự Kiện',
          style: TextStyle(
            color: Color(0xFF1E293B),
            fontSize: 20,
            fontWeight: FontWeight.w700,
            letterSpacing: -0.5,
          ),
        ),
        actions: [
          PopupMenuButton<String>(
            tooltip: 'Sắp xếp',
            onSelected: (v) {
              setState(() {
                if (v == 'new') {
                  _proposals.sort((a, b) {
                    final aDate =
                        _parseIso(a['detected_at']) ??
                        DateTime.fromMillisecondsSinceEpoch(0);
                    final bDate =
                        _parseIso(b['detected_at']) ??
                        DateTime.fromMillisecondsSinceEpoch(0);
                    return bDate.compareTo(aDate);
                  });
                } else {
                  _proposals.sort((a, b) {
                    final aDate =
                        _parseIso(a['detected_at']) ??
                        DateTime.fromMillisecondsSinceEpoch(0);
                    final bDate =
                        _parseIso(b['detected_at']) ??
                        DateTime.fromMillisecondsSinceEpoch(0);
                    return aDate.compareTo(bDate);
                  });
                }
              });
            },
            itemBuilder: (_) => [
              const PopupMenuItem(value: 'new', child: Text('Mới nhất trước')),
              const PopupMenuItem(value: 'old', child: Text('Cũ nhất trước')),
            ],
            icon: const Icon(Icons.sort),
          ),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Container(height: 1, color: const Color(0xFFE2E8F0)),
        ),
      ),
      body: _loading
          ? const Center(
              child: CircularProgressIndicator(color: Color(0xFF3B82F6)),
            )
          : RefreshIndicator(
              color: const Color(0xFF3B82F6),
              onRefresh: _loadProposals,
              child: Column(
                children: [
                  // Filter chips
                  Container(
                    color: Colors.white,
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 12,
                    ),
                    child: SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: Row(
                        children: _statusOptions.map((opt) {
                          final key = opt['key']!;
                          final label = opt['label']!;
                          final selected = key == _statusFilter;
                          final display = selected
                              ? '$label (${_currentCount.toString()})'
                              : label;

                          return Padding(
                            padding: const EdgeInsets.only(right: 8),
                            child: FilterChip(
                              label: Text(
                                display,
                                style: TextStyle(
                                  color: selected
                                      ? Colors.white
                                      : const Color(0xFF475569),
                                  fontWeight: selected
                                      ? FontWeight.w600
                                      : FontWeight.w500,
                                  fontSize: 14,
                                ),
                              ),
                              selected: selected,
                              onSelected: (v) {
                                if (v && _statusFilter != key) {
                                  setState(() {
                                    _statusFilter = key;
                                    _loading = true;
                                  });
                                  _loadProposals();
                                }
                              },
                              backgroundColor: const Color(0xFFF1F5F9),
                              selectedColor: const Color(0xFF3B82F6),
                              checkmarkColor: Colors.white,
                              side: BorderSide(
                                color: selected
                                    ? const Color(0xFF3B82F6)
                                    : const Color(0xFFE2E8F0),
                                width: 1,
                              ),
                              padding: const EdgeInsets.symmetric(
                                horizontal: 12,
                                vertical: 8,
                              ),
                            ),
                          );
                        }).toList(),
                      ),
                    ),
                  ),

                  const SizedBox(height: 8),

                  // Proposal list
                  Expanded(
                    child: _proposals.isEmpty
                        ? Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(
                                  Icons.inbox_rounded,
                                  size: 64,
                                  color: Colors.grey.shade300,
                                ),
                                const SizedBox(height: 16),
                                Text(
                                  'Không có đề xuất nào',
                                  style: TextStyle(
                                    fontSize: 16,
                                    color: Colors.grey.shade600,
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                              ],
                            ),
                          )
                        : ListView.builder(
                            padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                            itemCount: _proposals.length,
                            itemBuilder: (context, i) {
                              final p = _proposals[i];
                              final proposalState =
                                  p['proposal_state'] ?? 'pending';
                              final reason = p['proposed_reason'];
                              final detectedAt = p['detected_at'];
                              final prevType = _translateEventType(
                                p['event_type'],
                              );
                              final nextType = _translateEventType(
                                p['proposed_event_type'],
                              );
                              final prevStatus = _translateStatus(p['status']);
                              final nextStatus = _translateStatus(
                                p['proposed_status'],
                              );

                              return Container(
                                margin: const EdgeInsets.only(bottom: 12),
                                decoration: BoxDecoration(
                                  color: Colors.white,
                                  borderRadius: BorderRadius.circular(16),
                                  boxShadow: [
                                    BoxShadow(
                                      color: const Color(
                                        0xFF3B82F6,
                                      ).withAlpha((0.08 * 255).round()),
                                      blurRadius: 8,
                                      offset: const Offset(0, 2),
                                    ),
                                  ],
                                ),
                                child: Material(
                                  color: Colors.transparent,
                                  child: InkWell(
                                    onTap: () {
                                      Navigator.push(
                                        context,
                                        MaterialPageRoute(
                                          builder: (_) => ProposalDetailScreen(
                                            eventId: p['event_id'],
                                          ),
                                        ),
                                      );
                                    },
                                    borderRadius: BorderRadius.circular(16),
                                    child: Padding(
                                      padding: const EdgeInsets.all(16),
                                      child: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          // Header
                                          Row(
                                            children: [
                                              Expanded(
                                                child: Text(
                                                  _buildChangeLabel(p),
                                                  style: const TextStyle(
                                                    fontSize: 16,
                                                    fontWeight: FontWeight.w600,
                                                    color: Color(0xFF1E293B),
                                                  ),
                                                ),
                                              ),
                                              const SizedBox(width: 8),
                                              Container(
                                                padding:
                                                    const EdgeInsets.symmetric(
                                                      horizontal: 10,
                                                      vertical: 6,
                                                    ),
                                                decoration: BoxDecoration(
                                                  color: _statusBackgroundColor(
                                                    proposalState,
                                                  ),
                                                  borderRadius:
                                                      BorderRadius.circular(8),
                                                ),
                                                child: Row(
                                                  mainAxisSize:
                                                      MainAxisSize.min,
                                                  children: [
                                                    Icon(
                                                      _getStatusIcon(
                                                        proposalState,
                                                      ),
                                                      size: 14,
                                                      color: _statusColor(
                                                        proposalState,
                                                      ),
                                                    ),
                                                    const SizedBox(width: 4),
                                                    Text(
                                                      _translateProposalState(
                                                        proposalState,
                                                      ),
                                                      style: TextStyle(
                                                        fontSize: 12,
                                                        fontWeight:
                                                            FontWeight.w600,
                                                        color: _statusColor(
                                                          proposalState,
                                                        ),
                                                      ),
                                                    ),
                                                  ],
                                                ),
                                              ),
                                            ],
                                          ),

                                          const SizedBox(height: 12),

                                          // Change information
                                          Container(
                                            padding: const EdgeInsets.all(12),
                                            decoration: BoxDecoration(
                                              color: const Color(0xFFF8FAFC),
                                              borderRadius:
                                                  BorderRadius.circular(12),
                                              border: Border.all(
                                                color: const Color(0xFFE2E8F0),
                                              ),
                                            ),
                                            child: Column(
                                              children: [
                                                Row(
                                                  children: [
                                                    const Icon(
                                                      Icons.circle,
                                                      size: 8,
                                                      color: Color(0xFF64748B),
                                                    ),
                                                    const SizedBox(width: 8),
                                                    Expanded(
                                                      child: Text(
                                                        '$prevType • $prevStatus',
                                                        style: const TextStyle(
                                                          fontSize: 14,
                                                          color: Color(
                                                            0xFF64748B,
                                                          ),
                                                        ),
                                                      ),
                                                    ),
                                                  ],
                                                ),
                                                const Padding(
                                                  padding: EdgeInsets.symmetric(
                                                    vertical: 6,
                                                  ),
                                                  child: Icon(
                                                    Icons
                                                        .arrow_downward_rounded,
                                                    size: 16,
                                                    color: Color(0xFF3B82F6),
                                                  ),
                                                ),
                                                Row(
                                                  children: [
                                                    const Icon(
                                                      Icons.circle,
                                                      size: 8,
                                                      color: Color(0xFF3B82F6),
                                                    ),
                                                    const SizedBox(width: 8),
                                                    Expanded(
                                                      child: Text(
                                                        '$nextType • $nextStatus',
                                                        style: const TextStyle(
                                                          fontSize: 14,
                                                          color: Color(
                                                            0xFF1E293B,
                                                          ),
                                                          fontWeight:
                                                              FontWeight.w600,
                                                        ),
                                                      ),
                                                    ),
                                                  ],
                                                ),
                                              ],
                                            ),
                                          ),

                                          if (reason != null &&
                                              reason.toString().isNotEmpty) ...[
                                            const SizedBox(height: 12),
                                            Row(
                                              crossAxisAlignment:
                                                  CrossAxisAlignment.start,
                                              children: [
                                                const Icon(
                                                  Icons.info_outline_rounded,
                                                  size: 16,
                                                  color: Color(0xFF64748B),
                                                ),
                                                const SizedBox(width: 8),
                                                Expanded(
                                                  child: Text(
                                                    reason.toString(),
                                                    style: const TextStyle(
                                                      fontSize: 13,
                                                      color: Color(0xFF64748B),
                                                      fontStyle:
                                                          FontStyle.italic,
                                                    ),
                                                  ),
                                                ),
                                              ],
                                            ),
                                          ],

                                          const SizedBox(height: 12),

                                          // Timing information
                                          Builder(
                                            builder: (ctx) {
                                              final pendingRaw =
                                                  p['pending_until'] ??
                                                  p['pendingUntil'];
                                              final pendingDt = _parseIso(
                                                pendingRaw,
                                              );
                                              final detectedDt = _parseIso(
                                                detectedAt,
                                              );

                                              if (proposalState == 'pending') {
                                                final base =
                                                    pendingDt ?? detectedDt;
                                                if (base == null) {
                                                  return _buildInfoRow(
                                                    Icons.access_time_rounded,
                                                    'Ngày gửi đề xuất',
                                                    '-',
                                                    isWarning: false,
                                                  );
                                                }
                                                final deadline = base.add(
                                                  const Duration(hours: 48),
                                                );
                                                final now = DateTime.now();
                                                final remaining = deadline
                                                    .difference(now);

                                                String countdown;
                                                bool isUrgent = false;

                                                if (remaining.isNegative) {
                                                  countdown = 'Đã hết hạn';
                                                  isUrgent = true;
                                                } else {
                                                  final days = remaining.inDays;
                                                  final hours =
                                                      remaining.inHours % 24;
                                                  final mins =
                                                      remaining.inMinutes % 60;

                                                  if (days > 0) {
                                                    countdown =
                                                        '$days ngày $hours giờ';
                                                  } else if (hours > 0) {
                                                    countdown =
                                                        '$hours giờ $mins phút';
                                                    isUrgent = hours < 6;
                                                  } else {
                                                    countdown = '$mins phút';
                                                    isUrgent = true;
                                                  }
                                                  countdown += ' còn lại';
                                                }

                                                return _buildInfoRow(
                                                  Icons.access_time_rounded,
                                                  'Hạn xét duyệt',
                                                  '${_fmtDateFromDate(deadline)} • $countdown',
                                                  isWarning: isUrgent,
                                                );
                                              } else {
                                                final showDt =
                                                    pendingDt ?? detectedDt;
                                                return _buildInfoRow(
                                                  Icons.access_time_rounded,
                                                  'Ngày gửi đề xuất',
                                                  _fmtDateFromDate(showDt),
                                                  isWarning: false,
                                                );
                                              }
                                            },
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                                ),
                              );
                            },
                          ),
                  ),
                ],
              ),
            ),
    );
  }

  Widget _buildInfoRow(
    IconData icon,
    String label,
    String value, {
    bool isWarning = false,
  }) {
    return Row(
      children: [
        Icon(
          icon,
          size: 16,
          color: isWarning ? const Color(0xFFF59E0B) : const Color(0xFF64748B),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: RichText(
            text: TextSpan(
              children: [
                TextSpan(
                  text: '$label: ',
                  style: const TextStyle(
                    fontSize: 13,
                    color: Color(0xFF64748B),
                  ),
                ),
                TextSpan(
                  text: value,
                  style: TextStyle(
                    fontSize: 13,
                    color: isWarning
                        ? const Color(0xFFF59E0B)
                        : const Color(0xFF1E293B),
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
