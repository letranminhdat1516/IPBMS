import 'package:detect_care_app/features/shared_permissions/screens/permission_request_detail_screen.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:detect_care_app/features/shared_permissions/data/shared_permissions_remote_data_source.dart';

class PermissionRequestListScreen extends StatefulWidget {
  final String customerId;
  const PermissionRequestListScreen({super.key, required this.customerId});

  @override
  State<PermissionRequestListScreen> createState() =>
      _PermissionRequestListScreenState();
}

class _PermissionRequestListScreenState
    extends State<PermissionRequestListScreen> {
  final _api = SharedPermissionsRemoteDataSource();
  bool _loading = true;
  List<Map<String, dynamic>> _requests = [];
  String _selectedStatus = 'PENDING';

  @override
  void initState() {
    super.initState();
    _fetchRequests();
  }

  Future<void> _fetchRequests() async {
    debugPrint(
      '[PermissionRequestList] fetchRequests -> customerId=${widget.customerId}',
    );
    try {
      final data = await _api.getAllPermissionRequests(
        customerId: widget.customerId,
      );
      debugPrint('[PermissionRequestList] API returned ${data.length} items');
      setState(() {
        _requests = data;
        _loading = false;
      });
    } catch (e, st) {
      debugPrint(
        '[PermissionRequestList] Error loading requests for customerId=${widget.customerId}: $e',
      );
      debugPrint(st.toString());
      setState(() => _loading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Lỗi tải danh sách: $e'),
            backgroundColor: Colors.red.shade400,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  String _formatDate(String? iso) {
    if (iso == null) return '-';
    return DateFormat('dd/MM/yyyy HH:mm').format(DateTime.parse(iso));
  }

  List<Map<String, dynamic>> get _filteredRequests {
    if (_selectedStatus.isEmpty || _selectedStatus.toUpperCase() == 'ALL') {
      return _requests;
    }
    return _requests.where((r) {
      final s = (r['status'] ?? r['state'] ?? 'PENDING')
          .toString()
          .toUpperCase();
      return s == _selectedStatus.toUpperCase();
    }).toList();
  }

  Color _statusColor(String status) {
    switch (status.toUpperCase()) {
      case 'APPROVED':
        return const Color(0xFF10B981);
      case 'REJECTED':
        return const Color(0xFFEF4444);
      default:
        return const Color(0xFFF59E0B);
    }
  }

  Color _statusBackgroundColor(String status) {
    switch (status.toUpperCase()) {
      case 'APPROVED':
        return const Color(0xFFD1FAE5);
      case 'REJECTED':
        return const Color(0xFFFEE2E2);
      default:
        return const Color(0xFFFEF3C7);
    }
  }

  IconData _getTypeIcon(String? type) {
    if (type == null) return Icons.lock_outline;
    if (type.toLowerCase().contains('read')) return Icons.visibility_outlined;
    if (type.toLowerCase().contains('write')) return Icons.edit_outlined;
    return Icons.security_outlined;
  }

  String _getPermissionTypeName(String? type) {
    if (type == null) return 'Không xác định';
    switch (type) {
      case 'log_access_days':
        return 'Quyền truy cập nhật ký';
      case 'alert_read':
        return 'Quyền xem cảnh báo';
      case 'alert_ack':
        return 'Quyền chỉnh sửa cảnh báo';
      case 'profile_view':
        return 'Quyền xem hồ sơ';
      case 'stream_view':
        return 'Xem camera';
      case 'report_access_days':
        return 'Quyền xem báo cáo';
      default:
        return type.replaceAll('_', ' ').toUpperCase();
    }
  }

  String _mapStatusLabel(String? status) {
    if (status == null || status.isEmpty) return '-';
    final v = status.toString().toLowerCase();
    if (v.contains('pend')) return 'Đang chờ';
    if (v.contains('approve') || v.contains('accept')) return 'Đã duyệt';
    if (v.contains('reject') || v.contains('deny')) return 'Đã từ chối';
    if (v.contains('cancel')) return 'Đã huỷ';
    return status.toString();
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
          'Yêu cầu quyền truy cập',
          style: TextStyle(
            color: Color(0xFF1E293B),
            fontSize: 20,
            fontWeight: FontWeight.w700,
            letterSpacing: -0.5,
          ),
        ),
      ),
      body: _loading
          ? const Center(
              child: CircularProgressIndicator(
                valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF1E40AF)),
              ),
            )
          : RefreshIndicator(
              color: const Color(0xFF1E40AF),
              onRefresh: _fetchRequests,
              child: Column(
                children: [
                  Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 8,
                    ),
                    child: Row(
                      children: [
                        const Text(
                          'Lọc theo trạng thái: ',
                          style: TextStyle(fontWeight: FontWeight.w600),
                        ),
                        const SizedBox(width: 8),
                        DropdownButton<String>(
                          value: _selectedStatus,
                          items: const [
                            DropdownMenuItem(
                              value: 'PENDING',
                              child: Text('Đang chờ'),
                            ),
                            DropdownMenuItem(
                              value: 'APPROVED',
                              child: Text('Đã duyệt'),
                            ),
                            DropdownMenuItem(
                              value: 'REJECTED',
                              child: Text('Đã từ chối'),
                            ),
                            DropdownMenuItem(
                              value: 'ALL',
                              child: Text('Tất cả'),
                            ),
                          ],
                          onChanged: (v) {
                            if (v == null) return;
                            setState(() => _selectedStatus = v);
                          },
                        ),
                        const Spacer(),
                        Padding(
                          padding: const EdgeInsets.only(right: 16.0),
                          child: Text(
                            '${_filteredRequests.length} mục',
                            style: TextStyle(color: Colors.grey.shade600),
                          ),
                        ),
                      ],
                    ),
                  ),
                  Expanded(
                    child: _filteredRequests.isEmpty
                        ? Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(
                                  Icons.folder_open_outlined,
                                  size: 80,
                                  color: Colors.grey.shade300,
                                ),
                                const SizedBox(height: 16),
                                Text(
                                  'Không có yêu cầu nào',
                                  style: TextStyle(
                                    fontSize: 16,
                                    color: Colors.grey.shade600,
                                  ),
                                ),
                              ],
                            ),
                          )
                        : ListView.builder(
                            padding: const EdgeInsets.all(16),
                            itemCount: _filteredRequests.length,
                            itemBuilder: (context, index) {
                              final r = _filteredRequests[index];
                              return Container(
                                margin: const EdgeInsets.only(bottom: 12),
                                decoration: BoxDecoration(
                                  color: Colors.white,
                                  borderRadius: BorderRadius.circular(16),
                                  boxShadow: [
                                    BoxShadow(
                                      color: const Color(
                                        0xFF1E40AF,
                                      ).withAlpha((0.08 * 255).round()),
                                      blurRadius: 10,
                                      offset: const Offset(0, 2),
                                    ),
                                  ],
                                ),
                                child: Material(
                                  color: Colors.transparent,
                                  child: InkWell(
                                    borderRadius: BorderRadius.circular(16),
                                    onTap: () {
                                      Navigator.push(
                                        context,
                                        MaterialPageRoute(
                                          builder: (_) =>
                                              PermissionRequestDetailScreen(
                                                caregiverId:
                                                    r['caregiver_id'] ??
                                                    r['caregiverId'] ??
                                                    '',
                                                request: r,
                                              ),
                                        ),
                                      );
                                    },
                                    child: Padding(
                                      padding: const EdgeInsets.all(16),
                                      child: Row(
                                        children: [
                                          Container(
                                            width: 48,
                                            height: 48,
                                            decoration: BoxDecoration(
                                              color: const Color(
                                                0xFF1E40AF,
                                              ).withAlpha((0.1 * 255).round()),
                                              borderRadius:
                                                  BorderRadius.circular(12),
                                            ),
                                            child: Icon(
                                              _getTypeIcon(r['type']),
                                              color: const Color(0xFF1E40AF),
                                              size: 24,
                                            ),
                                          ),
                                          const SizedBox(width: 16),
                                          Expanded(
                                            child: Column(
                                              crossAxisAlignment:
                                                  CrossAxisAlignment.start,
                                              children: [
                                                Text(
                                                  _getPermissionTypeName(
                                                    r['type']?.toString(),
                                                  ),
                                                  style: const TextStyle(
                                                    fontSize: 16,
                                                    fontWeight: FontWeight.w600,
                                                    color: Color(0xFF1E293B),
                                                  ),
                                                ),
                                                const SizedBox(height: 4),
                                                Container(
                                                  padding:
                                                      const EdgeInsets.symmetric(
                                                        horizontal: 8,
                                                        vertical: 2,
                                                      ),
                                                  decoration: BoxDecoration(
                                                    color:
                                                        const Color(
                                                          0xFF1E40AF,
                                                        ).withAlpha(
                                                          (0.1 * 255).round(),
                                                        ),
                                                    borderRadius:
                                                        BorderRadius.circular(
                                                          6,
                                                        ),
                                                  ),
                                                  child: Text(
                                                    (r['scope'] ?? '-')
                                                        .toString(),
                                                    style: const TextStyle(
                                                      fontSize: 12,
                                                      color: Color(0xFF1E40AF),
                                                      fontWeight:
                                                          FontWeight.w500,
                                                    ),
                                                  ),
                                                ),
                                                const SizedBox(height: 8),
                                                Row(
                                                  children: [
                                                    Container(
                                                      padding:
                                                          const EdgeInsets.symmetric(
                                                            horizontal: 10,
                                                            vertical: 4,
                                                          ),
                                                      decoration: BoxDecoration(
                                                        color:
                                                            _statusBackgroundColor(
                                                              r['status'] ?? '',
                                                            ),
                                                        borderRadius:
                                                            BorderRadius.circular(
                                                              8,
                                                            ),
                                                      ),
                                                      child: Text(
                                                        _mapStatusLabel(
                                                          r['status']
                                                              ?.toString(),
                                                        ),
                                                        style: TextStyle(
                                                          fontSize: 12,
                                                          fontWeight:
                                                              FontWeight.w600,
                                                          color: _statusColor(
                                                            r['status'] ?? '',
                                                          ),
                                                        ),
                                                      ),
                                                    ),
                                                    const SizedBox(width: 8),
                                                    Expanded(
                                                      child: Text(
                                                        _formatDate(
                                                          r['decidedAt'],
                                                        ),
                                                        style: TextStyle(
                                                          fontSize: 12,
                                                          color: Colors
                                                              .grey
                                                              .shade600,
                                                        ),
                                                        overflow: TextOverflow
                                                            .ellipsis,
                                                      ),
                                                    ),
                                                  ],
                                                ),
                                                if (r['reason'] != null) ...[
                                                  const SizedBox(height: 6),
                                                  Text(
                                                    r['reason'],
                                                    style: TextStyle(
                                                      fontSize: 13,
                                                      color:
                                                          Colors.grey.shade700,
                                                    ),
                                                    maxLines: 1,
                                                    overflow:
                                                        TextOverflow.ellipsis,
                                                  ),
                                                ],
                                              ],
                                            ),
                                          ),
                                          const SizedBox(width: 8),
                                          Icon(
                                            Icons.arrow_forward_ios_rounded,
                                            size: 16,
                                            color: Colors.grey.shade400,
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
}
