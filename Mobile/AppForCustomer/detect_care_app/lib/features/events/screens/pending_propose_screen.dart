import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'proposal_review_screen.dart';

class PendingProposeScreen extends StatefulWidget {
  const PendingProposeScreen({super.key});

  @override
  State<PendingProposeScreen> createState() => _PendingProposeScreenState();
}

class _PendingProposeScreenState extends State<PendingProposeScreen> {
  final supabase = Supabase.instance.client;
  RealtimeChannel? _channel;
  List<Map<String, dynamic>> _pendingList = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadInitialData();
    _subscribeRealtime();
  }

  @override
  void dispose() {
    _channel?.unsubscribe();
    super.dispose();
  }

  Future<void> _loadInitialData() async {
    setState(() => _loading = true);
    try {
      final rows = await supabase
          .from('event_detections')
          .select(
            'event_id, event_type, proposed_status, proposed_reason, proposed_by, confirmation_state, created_at',
          )
          .or('confirmation_state.eq.pending,proposed_status.is.not.null')
          .order('created_at', ascending: false);

      setState(() {
        _pendingList = (rows as List).cast<Map<String, dynamic>>();
        _loading = false;
      });
    } catch (e) {
      debugPrint('⚠️ Error fetching pending propose: $e');
      setState(() => _loading = false);
    }
  }

  void _subscribeRealtime() {
    _channel = supabase.channel('realtime:event_detections_pending');

    _channel!
        .onPostgresChanges(
          event: PostgresChangeEvent.insert,
          schema: 'public',
          table: 'event_detections',
          callback: (payload) {
            final row = payload.newRecord;
            if (_isPending(row)) {
              debugPrint('🟢 New pending propose detected: ${row['event_id']}');
              setState(() {
                _pendingList.insert(0, row);
              });
            }
          },
        )
        .onPostgresChanges(
          event: PostgresChangeEvent.update,
          schema: 'public',
          table: 'event_detections',
          callback: (payload) {
            final updated = payload.newRecord;

            final idx = _pendingList.indexWhere(
              (e) => e['event_id'] == updated['event_id'],
            );

            if (_isPending(updated)) {
              if (idx == -1) {
                setState(() => _pendingList.insert(0, updated));
              } else {
                setState(() => _pendingList[idx] = updated);
              }
            } else if (idx != -1) {
              setState(() => _pendingList.removeAt(idx));
            }
          },
        )
        .subscribe((status, error) {
          if (error != null) {
            debugPrint('❌ Realtime subscription error: $error');
            return;
          }
          if (status == RealtimeSubscribeStatus.subscribed) {
            debugPrint('✅ Subscribed to Realtime: pending proposals');
          }
        });
  }

  bool _isPending(Map<String, dynamic>? row) {
    if (row == null) return false;
    final confirmation = row['confirmation_state']?.toString();
    final proposed = row['proposed_status'];
    return confirmation == 'pending' || proposed != null;
  }

  String _formatDateTime(String? dateTime) {
    if (dateTime == null || dateTime.isEmpty) return '—';
    try {
      final dt = DateTime.parse(dateTime);
      return '${dt.day}/${dt.month}/${dt.year} ${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
    } catch (e) {
      return dateTime;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        elevation: 0,
        title: const Text(
          'Đề xuất chờ duyệt',
          style: TextStyle(fontWeight: FontWeight.w600, fontSize: 20),
        ),
        backgroundColor: Colors.blue[700],
        foregroundColor: Colors.white,
        centerTitle: true,
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: Colors.blue))
          : _pendingList.isEmpty
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.check_circle_outline,
                    size: 80,
                    color: Colors.blue[300],
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Không có đề xuất nào đang chờ xem xét',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w500,
                      color: Colors.grey[700],
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Tất cả các đề xuất đã được xem xét',
                    style: TextStyle(fontSize: 14, color: Colors.grey[500]),
                  ),
                ],
              ),
            )
          : RefreshIndicator(
              onRefresh: _loadInitialData,
              color: Colors.blue,
              child: Column(
                children: [
                  // Header với số lượng
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [Colors.blue[700]!, Colors.blue[600]!],
                      ),
                      borderRadius: const BorderRadius.only(
                        bottomLeft: Radius.circular(24),
                        bottomRight: Radius.circular(24),
                      ),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.pending_actions,
                          color: Colors.white,
                          size: 24,
                        ),
                        const SizedBox(width: 12),
                        Text(
                          '${_pendingList.length} Đề xuất đang chờ xem xét',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  // List
                  Expanded(
                    child: ListView.builder(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      itemCount: _pendingList.length,
                      itemBuilder: (context, index) {
                        final item = _pendingList[index];
                        final eventType = item['event_type'] ?? 'Unknown';
                        final status = item['proposed_status'] ?? '—';
                        final reason = item['proposed_reason'] ?? '—';
                        final by = item['proposed_by'] ?? '—';
                        final createdAt = _formatDateTime(item['created_at']);

                        return Container(
                          margin: const EdgeInsets.only(bottom: 12),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(16),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.blue.withAlpha(
                                  (0.08 * 255).round(),
                                ),
                                blurRadius: 8,
                                offset: const Offset(0, 2),
                              ),
                            ],
                          ),
                          child: Material(
                            color: Colors.transparent,
                            child: InkWell(
                              borderRadius: BorderRadius.circular(16),
                              onTap: () async {
                                final result = await Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (_) => ProposalReviewScreen(
                                      eventId: item['event_id'],
                                    ),
                                  ),
                                );
                                if (result == true) {
                                  _loadInitialData();
                                }
                              },
                              child: Padding(
                                padding: const EdgeInsets.all(16),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    // Header row
                                    Row(
                                      children: [
                                        Container(
                                          padding: const EdgeInsets.all(10),
                                          decoration: BoxDecoration(
                                            color: Colors.blue[50],
                                            borderRadius: BorderRadius.circular(
                                              12,
                                            ),
                                          ),
                                          child: Icon(
                                            Icons.event_note,
                                            color: Colors.blue[700],
                                            size: 24,
                                          ),
                                        ),
                                        const SizedBox(width: 12),
                                        Expanded(
                                          child: Column(
                                            crossAxisAlignment:
                                                CrossAxisAlignment.start,
                                            children: [
                                              Text(
                                                eventType,
                                                style: TextStyle(
                                                  fontWeight: FontWeight.w600,
                                                  fontSize: 16,
                                                  color: Colors.grey[900],
                                                ),
                                              ),
                                              const SizedBox(height: 4),
                                              Row(
                                                children: [
                                                  Icon(
                                                    Icons.access_time,
                                                    size: 14,
                                                    color: Colors.grey[500],
                                                  ),
                                                  const SizedBox(width: 4),
                                                  Text(
                                                    createdAt,
                                                    style: TextStyle(
                                                      fontSize: 13,
                                                      color: Colors.grey[600],
                                                    ),
                                                  ),
                                                ],
                                              ),
                                            ],
                                          ),
                                        ),
                                        Icon(
                                          Icons.arrow_forward_ios,
                                          size: 16,
                                          color: Colors.grey[400],
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 16),
                                    // Divider
                                    Divider(height: 1, color: Colors.grey[200]),
                                    const SizedBox(height: 12),
                                    // Info rows
                                    _buildInfoRow(
                                      icon: Icons.assignment_turned_in,
                                      label: 'Trạng thái đề xuất',
                                      value: status,
                                      valueColor: Colors.blue[700]!,
                                    ),
                                    const SizedBox(height: 8),
                                    _buildInfoRow(
                                      icon: Icons.description,
                                      label: 'Lý do đề xuất',
                                      value: reason,
                                    ),
                                    const SizedBox(height: 8),
                                    _buildInfoRow(
                                      icon: Icons.person,
                                      label: 'Người đề xuất',
                                      value: by,
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

  Widget _buildInfoRow({
    required IconData icon,
    required String label,
    required String value,
    Color? valueColor,
  }) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 16, color: Colors.blue[600]),
        const SizedBox(width: 8),
        Expanded(
          child: RichText(
            text: TextSpan(
              style: TextStyle(fontSize: 14, color: Colors.grey[700]),
              children: [
                TextSpan(
                  text: '$label: ',
                  style: const TextStyle(fontWeight: FontWeight.w500),
                ),
                TextSpan(
                  text: value,
                  style: TextStyle(
                    color: valueColor ?? Colors.grey[800],
                    fontWeight: valueColor != null
                        ? FontWeight.w600
                        : FontWeight.normal,
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
