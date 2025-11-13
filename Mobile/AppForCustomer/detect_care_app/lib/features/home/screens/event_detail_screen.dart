import 'dart:async';
import 'package:detect_care_app/core/network/api_client.dart';
import 'package:detect_care_app/features/auth/data/auth_storage.dart';
import 'package:detect_care_app/features/home/repository/event_repository.dart';
import 'package:detect_care_app/features/home/service/event_service.dart';
import 'package:detect_care_app/features/events/screens/proposal_review_screen.dart';

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/event_log.dart';

class EventDetailScreen extends StatefulWidget {
  final String eventId;
  final bool openedFromFCM;
  const EventDetailScreen({
    super.key,
    required this.eventId,
    this.openedFromFCM = false,
  });

  @override
  State<EventDetailScreen> createState() => _EventDetailScreenState();
}

class _EventDetailScreenState extends State<EventDetailScreen> {
  late final EventRepository _repo;
  EventLog? _event;
  bool _loading = true;
  String? _error;

  Timer? _timer;
  Duration _remaining = Duration.zero;
  DateTime? _deadline;

  @override
  void initState() {
    super.initState();
    _repo = EventRepository(
      EventService(
        ApiClient(tokenProvider: () async => AuthStorage.getAccessToken()),
      ),
    );
    _load();
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final evt = await _repo.getEventDetails(widget.eventId);
      _event = evt;

      _deadline =
          evt.pendingUntil ??
          DateTime.now().toUtc().add(const Duration(days: 1));
      if (_isPendingReview) _startCountdown();

      setState(() => _loading = false);
    } catch (e) {
      setState(() {
        _loading = false;
        _error = e.toString();
      });
    }
  }

  bool get _isPendingReview {
    if (_event == null) return false;
    final e = _event!;
    final hasProposal =
        e.proposedStatus != null && e.proposedStatus!.isNotEmpty;
    final waiting = e.confirmationState == 'CAREGIVER_UPDATED';
    return hasProposal && waiting;
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
    setState(() {
      _remaining = diff.isNegative ? Duration.zero : diff;
    });
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

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    if (_error != null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Chi tiết sự kiện')),
        body: Center(child: Text('Lỗi: $_error')),
      );
    }

    final e = _event!;
    return Scaffold(
      appBar: AppBar(title: const Text('Chi tiết sự kiện')),
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            _kv('Sự kiện', e.eventDescription ?? e.eventType),
            _kv('Trạng thái hiện tại', e.status),
            _kv('Loại sự kiện', e.eventType),
            _kv('Độ tin cậy', e.confidenceScore.toStringAsFixed(2)),
            if (e.detectedAt != null)
              _kv(
                'Thời gian phát hiện',
                DateFormat('dd/MM/yyyy HH:mm').format(e.detectedAt!.toLocal()),
              ),
            if (e.imageUrls.isNotEmpty) ...[
              const SizedBox(height: 12),
              Text(
                'Ảnh liên quan',
                style: const TextStyle(fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 8),
              SizedBox(
                height: 160,
                child: ListView.builder(
                  scrollDirection: Axis.horizontal,
                  itemCount: e.imageUrls.length,
                  itemBuilder: (context, index) {
                    final url = e.imageUrls[index];
                    return Padding(
                      padding: const EdgeInsets.only(right: 12.0),
                      child: InkWell(
                        onTap: () {
                          Navigator.of(context).push(
                            MaterialPageRoute(
                              builder: (_) => _ImageGalleryPage(
                                images: e.imageUrls,
                                initialIndex: index,
                              ),
                            ),
                          );
                        },
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(8),
                          child: Image.network(
                            url,
                            width: 220,
                            height: 160,
                            fit: BoxFit.cover,
                            errorBuilder: (_, __, ___) => Container(
                              width: 220,
                              height: 160,
                              color: Colors.grey.shade200,
                              child: const Icon(Icons.broken_image, size: 40),
                            ),
                          ),
                        ),
                      ),
                    );
                  },
                ),
              ),
            ],
            if (e.pendingReason != null && e.pendingReason!.isNotEmpty)
              _kv('Lý do chờ duyệt', e.pendingReason!),
            if (_isPendingReview) ...[
              const SizedBox(height: 8),
              _proposalBlock(e),
            ],
          ],
        ),
      ),
      bottomNavigationBar: _buildBottomAction(e),
    );
  }

  Widget _proposalBlock(EventLog e) {
    final deadlineLocal =
        (_deadline ?? DateTime.now().toUtc().add(const Duration(days: 1)))
            .toLocal();
    final timeStr = DateFormat('dd/MM/yyyy HH:mm').format(deadlineLocal);

    return Container(
      margin: const EdgeInsets.only(top: 8),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.amber.shade50,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.amber.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.pending_outlined, color: Colors.amber.shade700),
              const SizedBox(width: 8),
              const Text(
                'Caregiver đề xuất thay đổi',
                style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
              ),
            ],
          ),
          const SizedBox(height: 8),
          _kv('Trạng thái đề xuất', e.proposedStatus ?? '-'),
          if (e.previousStatus != null)
            _kv('Trạng thái trước đó', e.previousStatus!),
          if (e.proposedEventType != null)
            _kv('Loại sự kiện mới', e.proposedEventType!),
          const SizedBox(height: 8),
          Row(
            children: [
              const Icon(Icons.timer, size: 18),
              const SizedBox(width: 6),
              Text(
                'Tự động chấp nhận sau: ${_fmtDuration(_remaining)}',
                style: const TextStyle(fontWeight: FontWeight.w600),
              ),
            ],
          ),
          Text(
            'Hạn duyệt: $timeStr',
            style: const TextStyle(color: Colors.black54),
          ),
          const SizedBox(height: 8),
          Text(
            'Nếu bạn không phản hồi trước thời hạn, hệ thống sẽ tự động chấp nhận đề xuất.',
            style: TextStyle(color: Colors.amber.shade800, fontSize: 12),
          ),
        ],
      ),
    );
  }

  Widget _buildBottomAction(EventLog e) {
    if (_isPendingReview) {
      return Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: ElevatedButton.icon(
          icon: const Icon(Icons.rule_folder_outlined),
          label: const Text('Duyệt cập nhật'),
          style: ElevatedButton.styleFrom(
            backgroundColor: Colors.orange.shade700,
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(vertical: 14),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
          ),
          onPressed: () {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) => ProposalReviewScreen(eventId: e.eventId),
              ),
            );
          },
        ),
      );
    }

    // Nếu event không chờ duyệt → hiện nút cập nhật sự kiện
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: ElevatedButton.icon(
        icon: const Icon(Icons.edit_outlined),
        label: const Text('Cập nhật sự kiện'),
        style: ElevatedButton.styleFrom(
          backgroundColor: Colors.blueAccent,
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(vertical: 14),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
        onPressed: () {
          Navigator.pushNamed(context, '/update-event', arguments: e);
        },
      ),
    );
  }

  Widget _kv(String k, String v) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 140,
            child: Text(k, style: const TextStyle(color: Colors.black54)),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(v, style: const TextStyle(fontWeight: FontWeight.w600)),
          ),
        ],
      ),
    );
  }
}

class _ImageGalleryPage extends StatefulWidget {
  final List<String> images;
  final int initialIndex;
  const _ImageGalleryPage({required this.images, this.initialIndex = 0});

  @override
  State<_ImageGalleryPage> createState() => _ImageGalleryPageState();
}

class _ImageGalleryPageState extends State<_ImageGalleryPage> {
  late PageController _pc;
  late int _pageIndex;

  @override
  void initState() {
    super.initState();
    _pageIndex = widget.initialIndex.clamp(0, widget.images.length - 1);
    _pc = PageController(initialPage: _pageIndex);
  }

  @override
  void dispose() {
    _pc.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Text('${_pageIndex + 1}/${widget.images.length}'),
      ),
      body: PageView.builder(
        controller: _pc,
        itemCount: widget.images.length,
        onPageChanged: (i) => setState(() => _pageIndex = i),
        itemBuilder: (context, i) {
          final url = widget.images[i];
          return Center(
            child: InteractiveViewer(
              panEnabled: true,
              minScale: 1.0,
              maxScale: 4.0,
              child: Image.network(
                url,
                fit: BoxFit.contain,
                errorBuilder: (_, __, ___) => Container(
                  color: Colors.grey.shade900,
                  child: const Center(
                    child: Icon(
                      Icons.broken_image,
                      size: 48,
                      color: Colors.white,
                    ),
                  ),
                ),
                loadingBuilder: (ctx, child, progress) {
                  if (progress == null) return child;
                  return const Center(child: CircularProgressIndicator());
                },
              ),
            ),
          );
        },
      ),
    );
  }
}
