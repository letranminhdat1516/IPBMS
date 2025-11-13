import 'package:detect_care_app/features/patient/data/medical_info_remote_data_source.dart';
import 'package:detect_care_app/features/patient/models/sleep_checkin.dart';
import 'package:flutter/material.dart';
import 'package:detect_care_app/features/auth/data/auth_storage.dart';
import 'package:detect_care_app/features/patient/utils/datetime_ext.dart';
import '../../../../../core/theme/app_theme.dart';

class SleepCheckinScreen extends StatefulWidget {
  const SleepCheckinScreen({super.key});

  @override
  State<SleepCheckinScreen> createState() => _SleepCheckinScreenState();
}

class _SleepCheckinScreenState extends State<SleepCheckinScreen> {
  bool _loading = false;
  SleepCheckinPage? _history;

  String? _lastState; // sleep hoặc awake

  @override
  void initState() {
    super.initState();
    _loadHistory();
  }

  Future<void> _loadHistory() async {
    setState(() => _loading = true);
    try {
      final uid = await AuthStorage.getUserId();
      if (uid == null || uid.isEmpty) {
        debugPrint('[SleepCheckin] no user id available');
        setState(() => _loading = false);
        return;
      }

      final ds = MedicalInfoRemoteDataSource();
      final page = await ds.getSleepCheckins(uid, limit: 20);

      setState(() {
        _history = page;
        if (page.items.isNotEmpty) {
          _lastState = page.items.first.state;
        }
      });
    } catch (e) {
      debugPrint("Load history error: $e");
    } finally {
      setState(() => _loading = false);
    }
  }

  Future<void> _handleCheckin() async {
    setState(() => _loading = true);
    try {
      final uid = await AuthStorage.getUserId();
      if (uid == null || uid.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Người dùng chưa đăng nhập')),
        );
        return;
      }

      final ds = MedicalInfoRemoteDataSource();

      final state = _lastState == "sleep" ? "awake" : "sleep";

      await ds.sleepCheckin(uid, state: state, timestamp: DateTime.now());

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('Ghi nhận thành công'),
          backgroundColor: Colors.green.shade600,
          behavior: SnackBarBehavior.floating,
          duration: const Duration(seconds: 2),
        ),
      );

      await _loadHistory();
    } catch (e) {
      debugPrint("Checkin error: $e");
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text("Lỗi khi ghi nhận: $e")));
    } finally {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isSleeping = _lastState == "sleep";
    final nextAction = isSleeping ? "Tỉnh dậy" : "Đi ngủ";
    final nextIcon = isSleeping ? Icons.wb_sunny : Icons.nightlight_round;
    final nextColor = isSleeping ? Colors.amber.shade400 : AppTheme.primaryBlue;

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
          'Giấc ngủ hôm nay',
          style: TextStyle(
            color: Color(0xFF1E293B),
            fontSize: 20,
            fontWeight: FontWeight.w700,
            letterSpacing: -0.5,
          ),
        ),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadHistory,
              child: ListView(
                padding: const EdgeInsets.all(20),
                children: [
                  _buildStatusCard(),
                  const SizedBox(height: 24),
                  _buildCheckinButton(nextAction, nextIcon, nextColor),
                  const SizedBox(height: 32),
                  _buildHistoryTimeline(),
                ],
              ),
            ),
    );
  }

  // -----------------------
  // UI Components
  // -----------------------

  Widget _buildStatusCard() {
    if (_lastState == null) {
      return _emptyStatusCard();
    }

    final last = _history?.items.first;
    final isSleeping = _lastState == "sleep";
    final displayTime = (last?.checkinAt ?? last?.createdAt) ?? '';

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: const [
          BoxShadow(color: Colors.black12, blurRadius: 8, offset: Offset(0, 2)),
        ],
      ),
      child: Row(
        children: [
          Icon(
            isSleeping ? Icons.nightlight_round : Icons.wb_sunny,
            size: 38,
            color: isSleeping ? AppTheme.primaryBlue : Colors.amber.shade400,
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Text(
              isSleeping
                  ? "Đang ngủ từ ${displayTime.toDateTimeDisplay()}"
                  : "Đang thức từ ${displayTime.toDateTimeDisplay()}",
              style: const TextStyle(
                fontSize: 17,
                color: Colors.black87,
                height: 1.3,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _emptyStatusCard() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: const [
          BoxShadow(color: Colors.black12, blurRadius: 8, offset: Offset(0, 2)),
        ],
      ),
      child: Row(
        children: [
          Icon(Icons.help_outline, size: 36, color: Colors.grey.shade600),
          const SizedBox(width: 16),
          const Expanded(
            child: Text(
              "Chưa có dữ liệu giấc ngủ nào",
              style: TextStyle(fontSize: 17, color: Colors.black87),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCheckinButton(String label, IconData icon, Color color) {
    return SizedBox(
      width: double.infinity,
      height: 58,
      child: ElevatedButton.icon(
        onPressed: _handleCheckin,
        icon: Icon(icon, size: 26),
        label: Text(label, style: const TextStyle(fontSize: 18)),
        style: ElevatedButton.styleFrom(
          backgroundColor: color,
          foregroundColor: Colors.white,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
        ),
      ),
    );
  }

  Widget _buildHistoryTimeline() {
    final list = _history?.items ?? [];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          "Lịch sử gần đây",
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
        ),
        const SizedBox(height: 16),

        if (list.isEmpty)
          const Padding(
            padding: EdgeInsets.only(top: 20),
            child: Text(
              "Chưa có bản ghi nào.",
              style: TextStyle(fontSize: 16, color: Colors.black54),
            ),
          ),

        ..._buildGroupedHistory(list),
      ],
    );
  }

  List<Widget> _buildGroupedHistory(List<SleepCheckin> list) {
    if (list.isEmpty) return [];

    final Map<String, List<SleepCheckin>> grouped = {};
    for (var item in list) {
      final dateKey = _formatDateKey(
        _toDateTime(item.checkinAt ?? item.createdAt),
      );
      grouped.putIfAbsent(dateKey, () => []).add(item);
    }

    final widgets = <Widget>[];
    grouped.forEach((dateKey, items) {
      widgets.add(
        _buildDateHeader(
          _toDateTime(items.first.checkinAt ?? items.first.createdAt),
        ),
      );
      widgets.add(const SizedBox(height: 12));

      widgets.add(
        Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            boxShadow: const [
              BoxShadow(
                color: Colors.black12,
                blurRadius: 8,
                offset: Offset(0, 2),
              ),
            ],
          ),
          child: Column(
            children: [
              for (var i = 0; i < items.length; i++) ...[
                _buildHistoryItem(
                  items[i],
                  isFirst: i == 0,
                  isLast: i == items.length - 1,
                ),
                if (i < items.length - 1)
                  Divider(height: 1, color: Colors.grey.shade200),
              ],
            ],
          ),
        ),
      );

      // Tính toán tổng giờ ngủ trong ngày
      final sleepDuration = _calculateDailySleep(items);
      if (sleepDuration != null) {
        widgets.add(
          Padding(
            padding: const EdgeInsets.only(top: 8, bottom: 4, left: 4),
            child: Row(
              children: [
                Icon(Icons.bedtime, size: 16, color: Colors.grey.shade600),
                const SizedBox(width: 6),
                Text(
                  'Tổng: ${_formatDuration(sleepDuration)}',
                  style: TextStyle(
                    fontSize: 14,
                    color: Colors.grey.shade700,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
        );
      }

      widgets.add(const SizedBox(height: 20));
    });

    return widgets;
  }

  String _formatDateKey(DateTime date) {
    return '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
  }

  Widget _buildDateHeader(DateTime date) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final yesterday = today.subtract(const Duration(days: 1));
    final dateOnly = DateTime(date.year, date.month, date.day);

    String label;
    if (dateOnly == today) {
      label = 'Hôm nay';
    } else if (dateOnly == yesterday) {
      label = 'Hôm qua';
    } else {
      final weekdays = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
      label =
          '${weekdays[date.weekday % 7]}, ${date.day}/${date.month}/${date.year}';
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            AppTheme.primaryBlue.withOpacity(0.1),
            AppTheme.primaryBlue.withOpacity(0.05),
          ],
        ),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 15,
          fontWeight: FontWeight.w600,
          color: AppTheme.primaryBlue,
        ),
      ),
    );
  }

  Duration? _calculateDailySleep(List<SleepCheckin> items) {
    Duration total = Duration.zero;
    DateTime? lastSleep;

    for (var item in items.reversed) {
      final created = _toDateTime(item.checkinAt ?? item.createdAt);
      if (item.state == 'sleep') {
        lastSleep = created;
      } else if (item.state == 'awake' && lastSleep != null) {
        total += created.difference(lastSleep);
        lastSleep = null;
      }
    }

    if (lastSleep != null && items.first.state == 'sleep') {
      total += DateTime.now().difference(lastSleep);
    }

    return total.inMinutes > 0 ? total : null;
  }

  String _formatDuration(Duration duration) {
    final hours = duration.inHours;
    final minutes = duration.inMinutes.remainder(60);

    if (hours > 0 && minutes > 0) {
      return '$hours giờ $minutes phút';
    } else if (hours > 0) {
      return '$hours giờ';
    } else {
      return '$minutes phút';
    }
  }

  Widget _buildHistoryItem(
    SleepCheckin e, {
    bool isFirst = false,
    bool isLast = false,
  }) {
    final icon = e.state == "sleep" ? Icons.nightlight_round : Icons.wb_sunny;
    final color = e.state == "sleep"
        ? AppTheme.primaryBlue
        : Colors.amber.shade400;

    return Container(
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: color.withOpacity(0.1),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, size: 24, color: color),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  e.state == 'sleep' ? 'Đi ngủ' : 'Thức dậy',
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w500,
                    color: Colors.black87,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  _formatTime(e.checkinAt ?? e.createdAt),
                  style: TextStyle(fontSize: 14, color: Colors.grey.shade600),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  String _formatTime(dynamic dtLike) {
    try {
      final dt = _toDateTime(dtLike);
      final hour = dt.hour.toString().padLeft(2, '0');
      final minute = dt.minute.toString().padLeft(2, '0');
      return '$hour:$minute';
    } catch (_) {
      return dtLike?.toString() ?? '';
    }
  }

  DateTime _toDateTime(dynamic v) {
    if (v is DateTime) return v;
    if (v is String) {
      try {
        return DateTime.parse(v).toLocal();
      } catch (_) {
        try {
          final ms = int.parse(v);
          return DateTime.fromMillisecondsSinceEpoch(ms).toLocal();
        } catch (_) {
          return DateTime.now();
        }
      }
    }
    return DateTime.now();
  }
}
