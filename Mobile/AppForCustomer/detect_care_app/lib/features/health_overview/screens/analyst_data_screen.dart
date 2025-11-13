import 'package:detect_care_app/core/network/api_client.dart';
import 'package:detect_care_app/features/patient/data/doctors_remote_data_source.dart';
import 'package:detect_care_app/features/patient/repository/doctors_repository.dart';
import 'package:detect_care_app/features/patient/models/doctor_infor.dart';
import 'package:detect_care_app/features/patient/service/doctors_service.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../data/health_report_service.dart';
import 'package:detect_care_app/features/auth/data/auth_storage.dart';

class AnalystDataScreen extends StatefulWidget {
  final DateTimeRange? dayRange;
  final String? userId;

  const AnalystDataScreen({super.key, this.dayRange, this.userId});

  @override
  State<AnalystDataScreen> createState() => _AnalystDataScreenState();
}

class _AnalystDataScreenState extends State<AnalystDataScreen> {
  final _remote = HealthReportRemoteDataSource();
  late final DoctorsRepository _doctorsRepo;
  late final DoctorsService _doctorsService;

  bool _loading = false;
  String? _error;
  List<dynamic>? _entries;

  @override
  void initState() {
    super.initState();
    final api = ApiClient(tokenProvider: AuthStorage.getAccessToken);
    final doctorsRemote = DoctorsRemoteDataSource(api: api);
    _doctorsRepo = DoctorsRepository(remote: doctorsRemote);
    _doctorsService = DoctorsService(repo: _doctorsRepo);

    _load();
  }

  String _fmtDdMmY(DateTime d) => DateFormat('dd-MM-yyyy').format(d);

  String buildEmailText({
    required String date,
    required String time,
    required String status,
    required String summary,
    required String suggestion,
  }) {
    final hasSummary = summary.trim().isNotEmpty;
    final hasSuggest = suggestion.trim().isNotEmpty;

    final summaryLine = hasSummary ? '• Phân tích AI: $summary\n' : '';
    final suggestLine = hasSuggest ? '• Khuyến nghị: $suggestion\n' : '';

    return """
Bác sĩ thân mến,

Dưới đây là thông tin sự kiện sức khỏe của bệnh nhân trong ngày $date:

• Thời điểm: $time
• Mức độ: $status
$summaryLine$suggestLine
Bác sĩ vui lòng xem xét và cho ý kiến hướng dẫn tiếp theo.

Trân trọng.
""";
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
      _entries = null;
    });

    try {
      final userId = widget.userId ?? await AuthStorage.getUserId();
      if (userId == null) throw Exception('User ID not available');
      final r =
          widget.dayRange ??
          DateTimeRange(start: DateTime.now(), end: DateTime.now());
      final from = _fmtDdMmY(r.start);
      final to = _fmtDdMmY(r.end);

      final res = await _remote.fetchAnalystUserJsonRange(
        userId: userId,
        from: from,
        to: to,
        includeData: true,
      );

      if (res is Map && res['data'] is List) {
        setState(() => _entries = List.from(res['data'] as List));
      } else {
        setState(() => _entries = []);
      }
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      setState(() => _loading = false);
    }
  }

  Color _getStatusColor(String? status) {
    switch (status?.toLowerCase()) {
      case 'danger':
        return const Color(0xFFDC2626);
      case 'warning':
        return const Color(0xFFF59E0B);
      default:
        return const Color(0xFF10B981);
    }
  }

  IconData _getStatusIcon(String? status) {
    switch (status?.toLowerCase()) {
      case 'danger':
        return Icons.error_rounded;
      case 'warning':
        return Icons.warning_rounded;
      default:
        return Icons.check_circle_rounded;
    }
  }

  String _formatTime(String? timeStr) {
    if (timeStr == null) return '';
    try {
      final dt = DateTime.parse(timeStr);
      return DateFormat('HH:mm').format(dt);
    } catch (_) {
      return '';
    }
  }

  Widget _buildStatusBadge(String? status) {
    final color = _getStatusColor(status);
    final icon = _getStatusIcon(status);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 16, color: color),
          const SizedBox(width: 6),
          Text(
            status ?? 'Unknown',
            style: TextStyle(
              color: color,
              fontSize: 13,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActivityCard(
    Map<String, dynamic> activity, {
    required String parentDateLabel,
  }) {
    final status = activity['status']?.toString() ?? 'Unknown';
    final aiSummary = activity['aiSummary']?.toString() ?? '';
    final actionSuggestion = activity['actionSuggestion']?.toString() ?? '';
    final startTime = _formatTime(activity['start_time']?.toString());
    final statusColor = _getStatusColor(status);

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.03),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header with time and status
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: statusColor.withOpacity(0.05),
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
                    color: const Color(0xFF3B82F6).withOpacity(0.1),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(
                    Icons.access_time_rounded,
                    color: Color(0xFF3B82F6),
                    size: 20,
                  ),
                ),
                const SizedBox(width: 12),
                Text(
                  startTime.isNotEmpty ? startTime : 'N/A',
                  style: const TextStyle(
                    color: Color(0xFF1E293B),
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const Spacer(),
                _buildStatusBadge(status),
              ],
            ),
          ),

          // AI Summary + Suggestion
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(6),
                      decoration: BoxDecoration(
                        color: const Color(0xFF3B82F6).withOpacity(0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Icon(
                        Icons.psychology_rounded,
                        color: Color(0xFF3B82F6),
                        size: 16,
                      ),
                    ),
                    const SizedBox(width: 8),
                    const Text(
                      'Phân tích AI',
                      style: TextStyle(
                        color: Color(0xFF64748B),
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        letterSpacing: 0.5,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Text(
                  aiSummary.isEmpty ? '—' : aiSummary,
                  style: const TextStyle(
                    color: Color(0xFF334155),
                    fontSize: 14,
                    height: 1.5,
                  ),
                ),

                if (actionSuggestion.isNotEmpty) ...[
                  const SizedBox(height: 16),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF1F5F9),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Icon(
                          Icons.lightbulb_outline_rounded,
                          color: Color(0xFF3B82F6),
                          size: 20,
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'Khuyến nghị',
                                style: TextStyle(
                                  color: Color(0xFF3B82F6),
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                actionSuggestion,
                                style: const TextStyle(
                                  color: Color(0xFF475569),
                                  fontSize: 13,
                                  height: 1.4,
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

          // Nút gửi email
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
            child: SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF3B82F6),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  padding: const EdgeInsets.symmetric(
                    vertical: 12,
                    horizontal: 14,
                  ),
                ),
                onPressed: () => _sendToDoctor(activity, parentDateLabel),
                icon: const Icon(Icons.email_rounded, color: Colors.white),
                label: const Text(
                  "Gửi cho bác sĩ",
                  style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDateCard(Map<String, dynamic> entry) {
    final dateLabel = entry['date']?.toString() ?? ''; // "17-10-2025"
    final data = entry['data'];
    final analyses = data?['analyses'] as List? ?? [];

    // Count statuses
    int dangerCount = 0;
    int warningCount = 0;
    int totalEvents = 0;

    for (var analysis in analyses) {
      final daily = analysis['dailyActivityLog'] as List? ?? [];
      totalEvents += daily.length;
      for (var activity in daily) {
        final status = activity['status']?.toString().toLowerCase();
        if (status == 'danger') dangerCount++;
        if (status == 'warning') warningCount++;
      }
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 15,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Date Header
          Container(
            padding: const EdgeInsets.all(20),
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                colors: [Color(0xFF3B82F6), Color(0xFF2563EB)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.only(
                topLeft: Radius.circular(20),
                topRight: Radius.circular(20),
              ),
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
                        Icons.calendar_today_rounded,
                        color: Colors.white,
                        size: 20,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        dateLabel,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 18,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 6,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.2),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        '$totalEvents sự kiện',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
                if (dangerCount > 0 || warningCount > 0) ...[
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      if (dangerCount > 0) ...[
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 10,
                            vertical: 6,
                          ),
                          decoration: BoxDecoration(
                            color: const Color(0xFFDC2626).withOpacity(0.2),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: const [
                              Icon(
                                Icons.error_rounded,
                                color: Colors.white,
                                size: 14,
                              ),
                              SizedBox(width: 6),
                              Text(
                                'Nguy hiểm',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 8),
                      ],
                      if (warningCount > 0)
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 10,
                            vertical: 6,
                          ),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF59E0B).withOpacity(0.2),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: const [
                              Icon(
                                Icons.warning_rounded,
                                color: Colors.white,
                                size: 14,
                              ),
                              SizedBox(width: 6),
                              Text(
                                'Cảnh báo',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ),
                        ),
                    ],
                  ),
                ],
              ],
            ),
          ),

          // Activities
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                for (var analysis in analyses) ...[
                  if (analysis['mostActivePeriod'] != null ||
                      analysis['mostAbnormalPeriod'] != null) ...[
                    Row(
                      children: [
                        if (analysis['mostActivePeriod'] != null) ...[
                          Expanded(
                            child: Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: const Color(0xFFF0F9FF),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(
                                  color: const Color(
                                    0xFF3B82F6,
                                  ).withOpacity(0.2),
                                ),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text(
                                    'Hoạt động nhiều nhất',
                                    style: TextStyle(
                                      color: Color(0xFF64748B),
                                      fontSize: 11,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    analysis['mostActivePeriod']?.toString() ??
                                        '',
                                    style: const TextStyle(
                                      color: Color(0xFF3B82F6),
                                      fontSize: 14,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                        if (analysis['mostActivePeriod'] != null &&
                            analysis['mostAbnormalPeriod'] != null)
                          const SizedBox(width: 8),
                        if (analysis['mostAbnormalPeriod'] != null) ...[
                          Expanded(
                            child: Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: const Color(0xFFFEF3C7),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(
                                  color: const Color(
                                    0xFFF59E0B,
                                  ).withOpacity(0.2),
                                ),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text(
                                    'Bất thường nhất',
                                    style: TextStyle(
                                      color: Color(0xFF92400E),
                                      fontSize: 11,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    analysis['mostAbnormalPeriod']
                                            ?.toString() ??
                                        '',
                                    style: const TextStyle(
                                      color: Color(0xFFF59E0B),
                                      fontSize: 14,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                    const SizedBox(height: 16),
                  ],

                  // Activities cho ngày này
                  for (var activity
                      in (analysis['dailyActivityLog'] as List? ?? []))
                    _buildActivityCard(
                      activity as Map<String, dynamic>,
                      parentDateLabel: dateLabel,
                    ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        centerTitle: true,
        backgroundColor: Colors.white,
        elevation: 0,
        shadowColor: Colors.black.withOpacity(0.05),
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
          'Phân tích hoạt động',
          style: TextStyle(
            color: Color(0xFF1E293B),
            fontSize: 20,
            fontWeight: FontWeight.w700,
            letterSpacing: -0.5,
          ),
        ),
        actions: [
          Container(
            margin: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: const Color(0xFFF8FAFC),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: IconButton(
              onPressed: _sendAllAnalyses,
              icon: const Icon(
                Icons.send_to_mobile_rounded,
                color: Color(0xFF64748B),
                size: 20,
              ),
              tooltip: 'Gửi toàn bộ phân tích',
            ),
          ),
          Container(
            margin: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: const Color(0xFFF8FAFC),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            // child: IconButton(
            //   onPressed: _load,
            //   icon: const Icon(
            //     Icons.refresh_rounded,
            //     color: Color(0xFF64748B),
            //     size: 20,
            //   ),
            // ),
          ),
        ],
      ),
      body: SafeArea(
        child: _loading
            ? _buildLoading()
            : _error != null
            ? _buildError()
            : (_entries == null || _entries!.isEmpty)
            ? _buildEmpty()
            : ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: _entries!.length,
                itemBuilder: (_, i) =>
                    _buildDateCard(_entries![i] as Map<String, dynamic>),
              ),
      ),
    );
  }

  Widget _buildLoading() => Center(
    child: Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
            boxShadow: [
              BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 20),
            ],
          ),
          child: const CircularProgressIndicator(
            valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF3B82F6)),
          ),
        ),
        const SizedBox(height: 16),
        const Text(
          'Đang tải dữ liệu...',
          style: TextStyle(
            color: Color(0xFF64748B),
            fontSize: 14,
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    ),
  );

  Widget _buildError() => Center(
    child: Container(
      margin: const EdgeInsets.all(20),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFDC2626)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(
            Icons.error_outline_rounded,
            color: Color(0xFFDC2626),
            size: 48,
          ),
          const SizedBox(height: 12),
          const Text(
            'Có lỗi xảy ra',
            style: TextStyle(
              color: Color(0xFF1E293B),
              fontSize: 18,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            _error!,
            textAlign: TextAlign.center,
            style: const TextStyle(color: Color(0xFF64748B), fontSize: 14),
          ),
        ],
      ),
    ),
  );

  Widget _buildEmpty() => Center(
    child: Container(
      margin: const EdgeInsets.all(20),
      padding: const EdgeInsets.all(32),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: const Color(0xFF3B82F6).withOpacity(0.1),
              borderRadius: BorderRadius.circular(20),
            ),
            child: const Icon(
              Icons.inbox_rounded,
              color: Color(0xFF3B82F6),
              size: 48,
            ),
          ),
          const SizedBox(height: 16),
          const Text(
            'Chưa có dữ liệu',
            style: TextStyle(
              color: Color(0xFF1E293B),
              fontSize: 18,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Không tìm thấy dữ liệu phân tích\ntrong khoảng thời gian này',
            textAlign: TextAlign.center,
            style: TextStyle(color: Color(0xFF64748B), fontSize: 14),
          ),
        ],
      ),
    ),
  );

  Future<void> _sendToDoctor(
    Map<String, dynamic> activity,
    String dateLabel,
  ) async {
    try {
      final doctors = await _doctorsService.getDoctors();
      if (doctors.isEmpty) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Không tìm thấy bác sĩ nào để gửi.'),
            backgroundColor: Colors.orange,
          ),
        );
        return;
      }

      String? chosenDoctorId;
      if (doctors.length == 1) {
        chosenDoctorId = doctors.first.id;
      } else {
        chosenDoctorId = await _chooseDoctorDialog(context, doctors);
      }

      if (chosenDoctorId == null || chosenDoctorId.isEmpty) {
        return;
      }

      final email = await _doctorsService.buildActivityEmail(
        activity: activity,
        dateLabel: dateLabel,
      );

      final ok = await _doctorsService.sendEmailToDoctorForCurrentUser(
        doctorId: chosenDoctorId,
        subject: email['subject']!,
        text: email['text']!,
        html: email['html'],
      );

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            ok ? "Đã gửi email cho bác sĩ" : "Không gửi được email",
          ),
          backgroundColor: ok ? Colors.green : Colors.red,
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text("Lỗi: $e"), backgroundColor: Colors.red),
      );
    }
  }

  Future<String?> _chooseDoctorDialog(
    BuildContext ctx,
    List<DoctorInfo> doctors,
  ) {
    return showDialog<String>(
      context: ctx,
      builder: (context) {
        return SimpleDialog(
          title: const Text('Chọn bác sĩ nhận email'),
          children: doctors.map((d) {
            return SimpleDialogOption(
              onPressed: () => Navigator.of(context).pop(d.id),
              child: ListTile(
                contentPadding: EdgeInsets.zero,
                title: Text(d.name.isNotEmpty ? d.name : d.email),
                subtitle: d.specialty.isNotEmpty ? Text(d.specialty) : null,
                trailing: d.email.isNotEmpty ? Text(d.email) : null,
              ),
            );
          }).toList(),
        );
      },
    );
  }

  Future<void> _sendAllAnalyses() async {
    try {
      if (_entries == null || _entries!.isEmpty) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Không có dữ liệu phân tích để gửi.'),
            backgroundColor: Colors.orange,
          ),
        );
        return;
      }

      final doctors = await _doctorsService.getDoctors();
      if (doctors.isEmpty) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Không tìm thấy bác sĩ nào để gửi.'),
            backgroundColor: Colors.orange,
          ),
        );
        return;
      }

      String? chosenDoctorId;
      if (doctors.length == 1) {
        chosenDoctorId = doctors.first.id;
      } else {
        chosenDoctorId = await _chooseDoctorDialog(context, doctors);
      }

      if (chosenDoctorId == null || chosenDoctorId.isEmpty) return;

      final ok = await _doctorsService.sendAnalystReportForCurrentUser(
        doctorId: chosenDoctorId,
        entries: _entries!,
      );

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            ok ? 'Đã gửi toàn bộ dữ liệu phân tích' : 'Không gửi được dữ liệu',
          ),
          backgroundColor: ok ? Colors.green : Colors.red,
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Lỗi: $e'), backgroundColor: Colors.red),
      );
    }
  }
}
