import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:detect_care_app/features/events/data/events_remote_data_source.dart';

class ProposalDetailScreen extends StatefulWidget {
  final String eventId;
  const ProposalDetailScreen({super.key, required this.eventId});

  @override
  State<ProposalDetailScreen> createState() => _ProposalDetailScreenState();
}

class _ProposalDetailScreenState extends State<ProposalDetailScreen> {
  final _api = EventsRemoteDataSource();
  bool _loading = true;
  Map<String, dynamic> _event = {};
  List<Map<String, dynamic>> _history = [];
  List<Map<String, dynamic>> _files = [];
  String _proposedByLabel = '-';

  // Theme colors
  static const primaryBlue = Color(0xFF2563EB);
  static const lightBlue = Color(0xFFEFF6FF);
  static const accentBlue = Color(0xFF3B82F6);
  static const darkBlue = Color(0xFF1E40AF);
  static const bgColor = Color(0xFFF8FAFC);

  @override
  void initState() {
    super.initState();
    _loadAll();
  }

  Future<void> _loadAll() async {
    setState(() => _loading = true);
    try {
      final data = await _api.getEventById(eventId: widget.eventId);

      print('[EVENT_DETAIL] keys: ${data.keys.join(', ')}');
      print('[EVENT_DETAIL] proposal_state: ${data['proposal_state']}');

      final history = (data['history'] is List)
          ? List<Map<String, dynamic>>.from(data['history'])
          : [];

      List<Map<String, dynamic>> files = [];
      final snapshots = data['snapshots'];
      if (snapshots is Map && snapshots['files'] is List) {
        files = List<Map<String, dynamic>>.from(snapshots['files']);
      } else if (data['snapshot_url'] != null) {
        files = [
          {'cloud_url': data['snapshot_url']},
        ];
      }

      setState(() {
        _event = data;
        _history = List<Map<String, dynamic>>.from(history);
        _files = files;
        _loading = false;
      });
      // Resolve proposed_by to a display label when it's an id.
      try {
        final proposed = data['proposed_by'];
        if (proposed == null) {
          setState(() => _proposedByLabel = '-');
        } else if (proposed is Map) {
          setState(
            () => _proposedByLabel =
                (proposed['full_name'] ??
                        proposed['username'] ??
                        proposed['name'] ??
                        proposed['user_id'] ??
                        proposed['id'] ??
                        proposed.toString())
                    .toString(),
          );
        } else {
          // Attempt to fetch user/profile by id from the API. If the endpoint
          // doesn't exist or fails, fall back to showing the raw id.
          final idStr = proposed.toString();
          final user = await _api.getUserById(userId: idStr);
          if (user != null) {
            setState(
              () => _proposedByLabel =
                  (user['full_name'] ??
                          user['username'] ??
                          user['name'] ??
                          user['user_id'] ??
                          idStr)
                      .toString(),
            );
          } else {
            setState(() => _proposedByLabel = idStr);
          }
        }
      } catch (_) {
        // Non-fatal: leave label as-is
      }
    } catch (e) {
      setState(() => _loading = false);
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Lỗi tải dữ liệu: $e')));
    }
  }

  // ===================== UI Helpers =====================
  String _fmtDate(String? iso) {
    if (iso == null) return '-';
    return DateFormat('HH:mm dd/MM/yyyy').format(DateTime.parse(iso));
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
      case 'warning':
        return 'Cảnh báo';
      case 'danger':
        return 'Nguy hiểm';
      case 'normal':
        return 'Bình thường';
      case 'confirmed':
        return 'Đã xác nhận';
      default:
        return '-';
    }
  }

  Color _statusColor(String? s) {
    switch (s) {
      case 'warning':
        return Colors.orange.shade600;
      case 'danger':
        return Colors.red.shade600;
      case 'normal':
        return Colors.green.shade600;
      case 'confirmed':
        return primaryBlue;
      default:
        return Colors.grey.shade600;
    }
  }

  String _actionText(String? s) {
    switch (s?.toLowerCase()) {
      case 'edited':
        return 'Chỉnh sửa';
      case 'created':
        return 'Tạo mới';
      case 'approved':
        return 'Duyệt';
      case 'rejected':
        return 'Từ chối';
      default:
        return s ?? '-';
    }
  }

  Widget _buildSection(String title, IconData icon, List<Widget> children) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: primaryBlue.withOpacity(0.08),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: lightBlue,
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(16),
                topRight: Radius.circular(16),
              ),
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(icon, color: primaryBlue, size: 20),
                ),
                const SizedBox(width: 12),
                Text(
                  title,
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                    color: darkBlue,
                  ),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: children,
            ),
          ),
        ],
      ),
    );
  }

  Widget _infoRow(String label, String value, {Color? color}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Expanded(
            flex: 4,
            child: Text(
              label,
              style: TextStyle(
                fontWeight: FontWeight.w600,
                color: Colors.grey.shade700,
                fontSize: 14,
              ),
            ),
          ),
          Expanded(
            flex: 6,
            child: Text(
              value,
              style: TextStyle(
                color: color ?? Colors.grey.shade900,
                fontSize: 14,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatusBadge(String? status) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: _statusColor(status).withOpacity(0.1),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: _statusColor(status).withOpacity(0.3),
          width: 1,
        ),
      ),
      child: Text(
        _translateStatus(status),
        style: TextStyle(
          color: _statusColor(status),
          fontWeight: FontWeight.w600,
          fontSize: 13,
        ),
      ),
    );
  }

  // ===================== Actions =====================
  Future<void> _onApprovePressed() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: Colors.green.shade50,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(Icons.check_circle, color: Colors.green.shade600),
            ),
            const SizedBox(width: 12),
            const Text('Xác nhận duyệt'),
          ],
        ),
        content: const Text('Bạn có chắc muốn duyệt đề xuất này không?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text('Hủy', style: TextStyle(color: Colors.grey.shade600)),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.green.shade600,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(10),
              ),
            ),
            child: const Text('Duyệt'),
          ),
        ],
      ),
    );
    if (ok != true) return;
    await _api.approveProposal(_event['event_id']);
    _loadAll();
  }

  Future<void> _onRejectPressed() async {
    final ctl = TextEditingController();
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: Colors.red.shade50,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(Icons.cancel, color: Colors.red.shade600),
            ),
            const SizedBox(width: 12),
            const Text('Từ chối đề xuất'),
          ],
        ),
        content: TextField(
          controller: ctl,
          decoration: InputDecoration(
            hintText: 'Nhập lý do từ chối (tùy chọn)',
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: BorderSide(color: Colors.grey.shade300),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: const BorderSide(color: primaryBlue),
            ),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text('Hủy', style: TextStyle(color: Colors.grey.shade600)),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red.shade600,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(10),
              ),
            ),
            child: const Text('Từ chối'),
          ),
        ],
      ),
    );
    if (ok != true) return;
    await _api.rejectProposal(_event['event_id']);
    _loadAll();
  }

  // ===================== BUILD =====================
  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return Scaffold(
        backgroundColor: bgColor,
        body: Center(child: CircularProgressIndicator(color: primaryBlue)),
      );
    }

    if (_event.isEmpty) {
      return Scaffold(
        backgroundColor: bgColor,
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.event_busy, size: 64, color: Colors.grey.shade400),
              const SizedBox(height: 16),
              Text(
                'Không có dữ liệu',
                style: TextStyle(
                  fontSize: 16,
                  color: Colors.grey.shade600,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
      );
    }

    final cam = _event['cameras'] ?? {};
    final eventType = _event['event_type'];
    final proposedType = _event['proposed_event_type'];
    final status = _event['status'];
    final proposedStatus = _event['proposed_status'];

    return Scaffold(
      backgroundColor: bgColor,
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
          'Chi tiết đề xuất',
          style: TextStyle(
            color: Color(0xFF1E293B),
            fontSize: 20,
            fontWeight: FontWeight.w700,
            letterSpacing: -0.5,
          ),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Status Header Card
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [primaryBlue, accentBlue],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(16),
                boxShadow: [
                  BoxShadow(
                    color: primaryBlue.withOpacity(0.3),
                    blurRadius: 15,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.2),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Icon(
                          Icons.event_note,
                          color: Colors.white,
                          size: 24,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Trạng thái yêu cầu',
                              style: TextStyle(
                                color: Colors.white70,
                                fontSize: 13,
                              ),
                            ),
                            Text(
                              _event['proposal_state']
                                      ?.toString()
                                      .toUpperCase() ??
                                  'Đang chờ duyệt',
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 20,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Thông tin đề xuất
            _buildSection('Thông tin đề xuất', Icons.lightbulb_outline, [
              _infoRow('Sự kiện ban đầu', _translateEventType(eventType)),
              Divider(color: Colors.grey.shade200, height: 16),
              _infoRow('Đề xuất thành', _translateEventType(proposedType)),
              Divider(color: Colors.grey.shade200, height: 16),
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 8),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    Expanded(
                      flex: 4,
                      child: Text(
                        'Trạng thái ban đầu',
                        style: TextStyle(
                          fontWeight: FontWeight.w600,
                          color: Colors.grey.shade700,
                          fontSize: 14,
                        ),
                      ),
                    ),
                    Expanded(flex: 6, child: _buildStatusBadge(status)),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 8),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    Expanded(
                      flex: 4,
                      child: Text(
                        'Trạng thái đề xuất',
                        style: TextStyle(
                          fontWeight: FontWeight.w600,
                          color: Colors.grey.shade700,
                          fontSize: 14,
                        ),
                      ),
                    ),
                    Expanded(flex: 6, child: _buildStatusBadge(proposedStatus)),
                  ],
                ),
              ),
              Divider(color: Colors.grey.shade200, height: 16),
              _infoRow('Lý do đề xuất', _event['proposed_reason'] ?? '-'),
            ]),

            // Thông tin phát hiện
            _buildSection('Thông tin phát hiện', Icons.radar, [
              _infoRow(
                'Độ tin cậy',
                _event['confidence_score']?.toString() ?? '-',
              ),
              Divider(color: Colors.grey.shade200, height: 16),
              _infoRow('Thời gian phát hiện', _fmtDate(_event['detected_at'])),
            ]),

            // Ảnh snapshot
            _buildSection('Ảnh snapshot', Icons.photo_library, [
              if (_files.isEmpty)
                Center(
                  child: Padding(
                    padding: const EdgeInsets.all(20),
                    child: Column(
                      children: [
                        Icon(
                          Icons.image_not_supported,
                          size: 48,
                          color: Colors.grey.shade400,
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Không có ảnh snapshot',
                          style: TextStyle(color: Colors.grey.shade600),
                        ),
                      ],
                    ),
                  ),
                ),
              if (_files.isNotEmpty)
                SizedBox(
                  height: 180,
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    separatorBuilder: (_, __) => const SizedBox(width: 12),
                    itemCount: _files.length,
                    itemBuilder: (_, i) => Container(
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(12),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.1),
                            blurRadius: 8,
                            offset: const Offset(0, 2),
                          ),
                        ],
                      ),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(12),
                        child: Image.network(
                          _files[i]['cloud_url'],
                          width: 200,
                          height: 180,
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => Container(
                            color: Colors.grey.shade200,
                            width: 200,
                            height: 180,
                            alignment: Alignment.center,
                            child: Icon(
                              Icons.broken_image,
                              size: 48,
                              color: Colors.grey.shade400,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
            ]),

            // Người đề xuất + Camera
            _buildSection('Người đề xuất & Camera', Icons.videocam, [
              _infoRow('Đề xuất bởi', _proposedByLabel),
              Divider(color: Colors.grey.shade200, height: 16),
              _infoRow('Camera', cam['camera_name'] ?? '-'),
              Divider(color: Colors.grey.shade200, height: 16),
              _infoRow('Vị trí', cam['location_in_room'] ?? '-'),
            ]),

            // Lịch sử xử lý
            _buildSection(
              'Lịch sử xử lý',
              Icons.history,
              _history.isEmpty
                  ? [
                      Center(
                        child: Padding(
                          padding: const EdgeInsets.all(20),
                          child: Column(
                            children: [
                              Icon(
                                Icons.history_toggle_off,
                                size: 48,
                                color: Colors.grey.shade400,
                              ),
                              const SizedBox(height: 8),
                              Text(
                                'Không có lịch sử',
                                style: TextStyle(color: Colors.grey.shade600),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ]
                  : _history.map((h) {
                      final prevStatus = h['previous_status'];
                      final newStatus = h['new_status'];
                      final prevType = h['previous_event_type'];
                      final newType = h['new_event_type'];
                      final action = _actionText(h['action']);
                      final actor = h['actor_name'] ?? 'Hệ thống';
                      final time = _fmtDate(h['created_at']);

                      return Container(
                        margin: const EdgeInsets.only(bottom: 12),
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: lightBlue,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: primaryBlue.withOpacity(0.2),
                          ),
                        ),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: Icon(
                                Icons.history,
                                color: primaryBlue,
                                size: 20,
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    action,
                                    style: const TextStyle(
                                      fontWeight: FontWeight.bold,
                                      fontSize: 15,
                                      color: darkBlue,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    '$actor • $time',
                                    style: TextStyle(
                                      color: Colors.grey.shade600,
                                      fontSize: 13,
                                    ),
                                  ),
                                  if (prevStatus != null || newStatus != null)
                                    Padding(
                                      padding: const EdgeInsets.only(top: 8),
                                      child: Text(
                                        'Trạng thái: ${_translateStatus(prevStatus)} → ${_translateStatus(newStatus)}',
                                        style: TextStyle(
                                          fontSize: 13,
                                          color: _statusColor(newStatus),
                                          fontWeight: FontWeight.w500,
                                        ),
                                      ),
                                    ),
                                  if (prevType != null || newType != null)
                                    Padding(
                                      padding: const EdgeInsets.only(top: 4),
                                      child: Text(
                                        'Sự kiện: ${_translateEventType(prevType)} → ${_translateEventType(newType)}',
                                        style: TextStyle(
                                          fontSize: 13,
                                          color: Colors.grey.shade700,
                                        ),
                                      ),
                                    ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      );
                    }).toList(),
            ),

            // Hành động
            if ((_event['proposal_state'] ?? '').toString().toLowerCase() == '')
              Container(
                margin: const EdgeInsets.only(top: 8),
                child: Row(
                  children: [
                    Expanded(
                      child: ElevatedButton.icon(
                        icon: const Icon(Icons.close),
                        label: const Text('Từ chối'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.white,
                          foregroundColor: Colors.red.shade600,
                          elevation: 0,
                          side: BorderSide(
                            color: Colors.red.shade600,
                            width: 2,
                          ),
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        onPressed: _onRejectPressed,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: ElevatedButton.icon(
                        icon: const Icon(Icons.check),
                        label: const Text('Duyệt đề xuất'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.green.shade600,
                          foregroundColor: Colors.white,
                          elevation: 2,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        onPressed: _onApprovePressed,
                      ),
                    ),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }
}
