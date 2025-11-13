import 'dart:async';
import 'package:detect_care_app/features/home/models/event_log.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import 'package:detect_care_app/core/network/api_client.dart';
import 'package:detect_care_app/features/auth/data/auth_storage.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:detect_care_app/features/home/repository/event_repository.dart';
import 'package:detect_care_app/features/home/service/event_service.dart';

class ProposalReviewScreen extends StatefulWidget {
  final String eventId;

  const ProposalReviewScreen({super.key, required this.eventId});

  @override
  State<ProposalReviewScreen> createState() => _ProposalReviewScreenState();
}

class _ProposalReviewScreenState extends State<ProposalReviewScreen> {
  late final EventRepository _repo;
  EventLog? _event;
  bool _loading = true;
  String? _error;

  // countdown
  Timer? _timer;
  DateTime? _deadline;
  Duration _remaining = Duration.zero;

  // user note (optional)
  final TextEditingController _noteCtl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _repo = EventRepository(
      EventService(ApiClient(tokenProvider: AuthStorage.getAccessToken)),
    );
    _load();
  }

  @override
  void dispose() {
    _timer?.cancel();
    _noteCtl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      try {
        final tok = await AuthStorage.getAccessToken();
        debugPrint(
          '[ProposalReviewScreen] AuthStorage accessToken present: ${tok != null}',
        );
      } catch (_) {}
      try {
        final session = Supabase.instance.client.auth.currentSession;
        debugPrint(
          '[ProposalReviewScreen] Supabase session: ${session != null ? 'hasSession user=${session.user.id}' : 'no session'}',
        );
      } catch (_) {}

      final e = await _repo.getEventDetails(widget.eventId);
      _event = e;

      // deadline: ưu tiên từ BE, nếu null -> fallback 48h
      _deadline =
          e.pendingUntil ??
          DateTime.now().toUtc().add(const Duration(hours: 48));

      // nếu đúng là case pending (CAREGIVER_UPDATED) → đếm ngược
      if (_isPending(e)) _startCountdown();

      if (mounted) {
        setState(() => _loading = false);
      }
    } catch (err) {
      if (mounted) {
        setState(() {
          _error = err.toString();
          _loading = false;
        });
      }
    }
  }

  bool _isPending(EventLog e) {
    final hasProposal =
        (e.proposedStatus != null && e.proposedStatus!.isNotEmpty) ||
        (e.proposedEventType != null && e.proposedEventType!.isNotEmpty);
    return hasProposal && e.confirmationState == 'CAREGIVER_UPDATED';
  }

  bool get _isExpired {
    if (_deadline == null) return false;
    return DateTime.now().toUtc().isAfter(_deadline!);
  }

  void _startCountdown() {
    _timer?.cancel();
    _tick();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) => _tick());
  }

  void _tick() {
    if (!mounted) return;
    final now = DateTime.now().toUtc();
    final dl = _deadline ?? now;
    final diff = dl.difference(now);
    setState(() => _remaining = diff.isNegative ? Duration.zero : diff);
  }

  String _fmtDuration(Duration d) {
    final days = d.inDays;
    final hours = d.inHours % 24;
    final mins = d.inMinutes % 60;
    final secs = d.inSeconds % 60;

    if (days > 0) return '${days}d ${hours}h ${mins}m ${secs}s';
    if (hours > 0) return '${hours}h ${mins}m ${secs}s';
    return '${mins}m ${secs}s';
  }

  Future<void> _approve() async {
    if (_event == null) return;
    final messenger = ScaffoldMessenger.of(context);

    try {
      final updated = await _repo.confirmEvent(_event!.eventId);
      setState(() => _event = updated);

      messenger.showSnackBar(
        SnackBar(
          content: const Text('Bạn đã đồng ý đề xuất. Trạng thái đã cập nhật.'),
          backgroundColor: Colors.green[600],
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
      );
      Navigator.of(context).pop(true);
    } catch (e) {
      messenger.showSnackBar(
        SnackBar(
          content: Text('Lỗi xác nhận: $e'),
          backgroundColor: Colors.red[600],
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
      );
    }
  }

  Future<void> _reject() async {
    if (_event == null) return;
    final messenger = ScaffoldMessenger.of(context);
    final notes = _noteCtl.text.trim().isEmpty ? null : _noteCtl.text.trim();

    try {
      final updated = await _repo.rejectEvent(_event!.eventId, notes: notes);
      setState(() => _event = updated);

      messenger.showSnackBar(
        SnackBar(
          content: const Text('Bạn đã từ chối đề xuất.'),
          backgroundColor: Colors.orange[700],
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
      );
      Navigator.of(context).pop(true);
    } catch (e) {
      messenger.showSnackBar(
        SnackBar(
          content: Text('Lỗi từ chối: $e'),
          backgroundColor: Colors.red[600],
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return Scaffold(
        backgroundColor: const Color(0xFFF8FAFC),
        appBar: AppBar(
          elevation: 0,
          title: const Text('Review Proposal'),
          backgroundColor: Colors.blue[700],
          foregroundColor: Colors.white,
        ),
        body: Center(child: CircularProgressIndicator(color: Colors.blue[600])),
      );
    }
    if (_error != null) {
      return Scaffold(
        backgroundColor: const Color(0xFFF8FAFC),
        appBar: AppBar(
          elevation: 0,
          title: const Text('Review Proposal'),
          backgroundColor: Colors.blue[700],
          foregroundColor: Colors.white,
        ),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.error_outline, size: 64, color: Colors.red[400]),
              const SizedBox(height: 16),
              Text(
                'Lỗi: $_error',
                style: TextStyle(color: Colors.red[700], fontSize: 16),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      );
    }

    final e = _event!;
    final isPending = _isPending(e);
    final deadlineLocal = (_deadline ?? DateTime.now().toUtc()).toLocal();
    final deadlineStr = DateFormat('dd/MM/yyyy HH:mm').format(deadlineLocal);

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        elevation: 0,
        title: const Text(
          'Review Proposal',
          style: TextStyle(fontWeight: FontWeight.w600),
        ),
        backgroundColor: Colors.blue[700],
        foregroundColor: Colors.white,
        centerTitle: true,
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Event Info Card
          _buildCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _sectionHeader(
                  icon: Icons.event_note,
                  title: 'Thông tin sự kiện',
                  color: Colors.blue[700]!,
                ),
                const SizedBox(height: 12),
                _kv('Sự kiện', e.eventDescription ?? e.eventType),
                _kv('Trạng thái hiện tại', e.status),
                if (e.eventType.isNotEmpty) _kv('Event type', e.eventType),
                if (e.detectedAt != null)
                  _kv(
                    'Phát hiện lúc',
                    DateFormat(
                      'dd/MM/yyyy HH:mm',
                    ).format(e.detectedAt!.toLocal()),
                  ),
              ],
            ),
          ),

          const SizedBox(height: 16),

          if (isPending) ...[
            // Proposal Card
            _buildCard(
              color: Colors.blue[50]!,
              borderColor: Colors.blue[200]!,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _sectionHeader(
                    icon: Icons.edit_note,
                    title: 'Caregiver đề xuất thay đổi',
                    color: Colors.blue[700]!,
                  ),
                  const SizedBox(height: 12),
                  _compareRow(
                    'Trạng thái',
                    current: e.status,
                    proposed: e.proposedStatus ?? '-',
                    currentColor: _statusColor(e.status),
                    proposedColor: _statusColor(e.proposedStatus ?? ''),
                  ),
                  if (e.proposedEventType != null &&
                      e.proposedEventType!.isNotEmpty)
                    _compareRow(
                      'Event type',
                      current: e.eventType,
                      proposed: e.proposedEventType!,
                      currentColor: Colors.blue[700]!,
                      proposedColor: Colors.blue[700]!,
                    ),
                  if ((e.pendingReason ?? '').isNotEmpty) ...[
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.blue[100]!),
                      ),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Icon(
                            Icons.info_outline,
                            color: Colors.blue[600],
                            size: 20,
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Lý do caregiver',
                                  style: TextStyle(
                                    color: Colors.blue[700],
                                    fontWeight: FontWeight.w600,
                                    fontSize: 13,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  e.pendingReason!,
                                  style: TextStyle(
                                    color: Colors.grey[800],
                                    fontSize: 14,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ],
              ),
            ),

            const SizedBox(height: 16),

            // Countdown Card
            _countdownCard(
              remaining: _remaining,
              deadlineStr: deadlineStr,
              expired: _isExpired,
            ),

            const SizedBox(height: 16),

            // Note Input Card
            _buildCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(Icons.notes, color: Colors.blue[700], size: 20),
                      const SizedBox(width: 8),
                      Text(
                        'Ghi chú (tùy chọn)',
                        style: TextStyle(
                          color: Colors.blue[700],
                          fontWeight: FontWeight.w600,
                          fontSize: 15,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _noteCtl,
                    maxLength: 240,
                    maxLines: 3,
                    decoration: InputDecoration(
                      hintText: 'Nhập ghi chú khi duyệt / từ chối...',
                      hintStyle: TextStyle(color: Colors.grey[400]),
                      filled: true,
                      fillColor: const Color(0xFFF8FAFC),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide(color: Colors.blue[200]!),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide(color: Colors.blue[200]!),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide(
                          color: Colors.blue[600]!,
                          width: 2,
                        ),
                      ),
                      counterText: '',
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 20),

            // Action Buttons
            Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: _isExpired ? null : _approve,
                    icon: const Icon(Icons.check_circle_outline, size: 20),
                    label: const Text(
                      'Đồng ý',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.blue[600],
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      elevation: 2,
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: _isExpired ? null : _reject,
                    icon: const Icon(Icons.cancel_outlined, size: 20),
                    label: const Text(
                      'Từ chối',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.white,
                      foregroundColor: Colors.grey[700],
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                        side: BorderSide(color: Colors.grey[300]!),
                      ),
                      elevation: 0,
                    ),
                  ),
                ),
              ],
            ),

            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.blue[50],
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.blue[100]!),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(
                    Icons.lightbulb_outline,
                    color: Colors.blue[700],
                    size: 18,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Lưu ý: Nếu bạn không phản hồi trước hạn, hệ thống sẽ tự động xử lý theo chính sách (thường là auto-approve).',
                      style: TextStyle(
                        color: Colors.blue[800],
                        fontSize: 12,
                        height: 1.4,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ] else ...[
            _infoBanner(
              text:
                  'Sự kiện này hiện không có đề xuất nào cần duyệt. Bạn chỉ đang xem chi tiết.',
              icon: Icons.verified_user_outlined,
            ),
          ],

          const SizedBox(height: 20),
        ],
      ),
    );
  }

  // ============== UI helpers ==============

  Widget _buildCard({required Widget child, Color? color, Color? borderColor}) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color ?? Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: borderColor ?? Colors.blue.withAlpha((0.1 * 255).round()),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.blue.withAlpha((0.05 * 255).round()),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: child,
    );
  }

  Widget _sectionHeader({
    required IconData icon,
    required String title,
    required Color color,
  }) {
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: color.withAlpha((0.1 * 255).round()),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(icon, color: color, size: 20),
        ),
        const SizedBox(width: 12),
        Text(
          title,
          style: TextStyle(
            color: color,
            fontWeight: FontWeight.w700,
            fontSize: 16,
          ),
        ),
      ],
    );
  }

  Widget _kv(String k, String v) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 140,
            child: Text(
              k,
              style: TextStyle(color: Colors.grey[600], fontSize: 14),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              v,
              style: TextStyle(
                fontWeight: FontWeight.w600,
                color: Colors.grey[900],
                fontSize: 14,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _compareRow(
    String label, {
    required String current,
    required String proposed,
    required Color currentColor,
    required Color proposedColor,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.blue[100]!),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: TextStyle(
              color: Colors.blue[700],
              fontWeight: FontWeight.w600,
              fontSize: 13,
            ),
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: _chip(
                  'Hiện tại',
                  current,
                  background: currentColor.withAlpha((0.1 * 255).round()),
                  fg: currentColor,
                ),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 8),
                child: Icon(
                  Icons.arrow_forward,
                  size: 18,
                  color: Colors.blue[600],
                ),
              ),
              Expanded(
                child: _chip(
                  'Đề xuất',
                  proposed,
                  background: proposedColor.withAlpha((0.1 * 255).round()),
                  fg: proposedColor,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _chip(
    String title,
    String value, {
    required Color background,
    required Color fg,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: fg.withAlpha((0.3 * 255).round())),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: TextStyle(
              color: fg.withAlpha((0.8 * 255).round()),
              fontWeight: FontWeight.w500,
              fontSize: 11,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            value.isEmpty ? '-' : value,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              color: fg,
              fontWeight: FontWeight.w700,
              fontSize: 14,
            ),
          ),
        ],
      ),
    );
  }

  Widget _countdownCard({
    required Duration remaining,
    required String deadlineStr,
    required bool expired,
  }) {
    final text = expired
        ? 'Đã quá hạn phê duyệt — hệ thống sẽ tự xử lý.'
        : 'Tự động xử lý sau: ${_fmtDuration(remaining)}';

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: expired
              ? [Colors.red[50]!, Colors.red[100]!]
              : [Colors.blue[50]!, Colors.blue[100]!],
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: expired ? Colors.red[200]! : Colors.blue[200]!,
          width: 1.5,
        ),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(
              expired ? Icons.error_outline : Icons.timer_outlined,
              color: expired ? Colors.red[700] : Colors.blue[700],
              size: 24,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  text,
                  style: TextStyle(
                    fontWeight: FontWeight.w700,
                    fontSize: 15,
                    color: expired ? Colors.red[900] : Colors.blue[900],
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Hạn duyệt: $deadlineStr',
                  style: TextStyle(
                    color: expired ? Colors.red[700] : Colors.blue[700],
                    fontSize: 13,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _infoBanner({required String text, required IconData icon}) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.blue[50],
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.blue[200]!),
      ),
      child: Row(
        children: [
          Icon(icon, color: Colors.blue[700], size: 24),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              text,
              style: TextStyle(
                color: Colors.blue[800],
                fontSize: 14,
                height: 1.4,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Color _statusColor(String status) {
    switch (status.toLowerCase()) {
      case 'danger':
        return const Color(0xFFE53E3E);
      case 'warning':
        return const Color(0xFFFF8C00);
      case 'normal':
        return const Color(0xFF2F855A);
      default:
        return Colors.blue[700]!;
    }
  }
}
