import 'package:detect_care_app/features/patient/models/doctor_infor.dart';
import 'package:detect_care_app/features/patient/repository/doctors_repository.dart';
import 'package:detect_care_app/features/auth/data/auth_storage.dart';
import 'package:intl/intl.dart';
import 'package:detect_care_app/core/utils/backend_enums.dart';

class DoctorsService {
  final DoctorsRepository repo;

  DoctorsService({required this.repo});

  Future<String?> _userId() async {
    return AuthStorage.getUserId();
  }

  Future<List<DoctorInfo>> getDoctors() async {
    final id = await _userId();
    if (id == null) throw Exception("No userId in storage");
    return repo.getDoctors(id);
  }

  Future<DoctorInfo> createDoctor(DoctorInfo doctor) async {
    final id = await _userId();
    if (id == null) throw Exception("No userId in storage");
    return repo.createDoctor(id, doctor);
  }

  Future<DoctorInfo> updateDoctor(
    String doctorId,
    Map<String, dynamic> update,
  ) async {
    final id = await _userId();
    if (id == null) throw Exception("No userId in storage");
    return repo.updateDoctor(id, doctorId, update);
  }

  Future<bool> deleteDoctor(String doctorId) async {
    final id = await _userId();
    if (id == null) throw Exception("No userId in storage");
    return repo.deleteDoctor(id, doctorId);
  }

  // Future<bool> sendEmailToDoctor({
  //   required String customerId,
  //   required String doctorId,
  //   required String subject,
  //   required String text,
  // }) {
  //   return repo.sendEmail(
  //     customerId: customerId,
  //     doctorId: doctorId,
  //     subject: subject,
  //     text: text,
  //   );
  // }

  Future<bool> sendEmailToDoctorForCurrentUser({
    required String doctorId,
    required String subject,
    required String text,
    String? html,
  }) async {
    final id = await _userId();
    if (id == null) throw Exception('No user id available');
    return repo.sendEmail(
      customerId: id,
      doctorId: doctorId,
      subject: subject,
      text: text,
      html: html,
    );
  }

  Future<Map<String, String>> buildActivityEmail({
    required Map<String, dynamic> activity,
    required String dateLabel,
  }) async {
    final status = activity['status']?.toString() ?? 'unknown';
    final summary = activity['aiSummary']?.toString() ?? '';
    final suggestion = activity['actionSuggestion']?.toString() ?? '';

    String time = '';
    try {
      final t = activity['start_time']?.toString();
      if (t != null && t.isNotEmpty) {
        final dt = DateTime.parse(t);
        time = DateFormat('HH:mm').format(dt);
      }
    } catch (_) {
      time = '';
    }

    final viStatus = BackendEnums.statusToVietnamese(status.toLowerCase());

    final subject = switch (status.toLowerCase()) {
      'danger' => '[Khẩn cấp] Báo cáo sự kiện nguy hiểm của bệnh nhân',
      'warning' => 'Báo cáo sự kiện cảnh báo sức khỏe của bệnh nhân',
      _ => 'Thông tin theo dõi sức khỏe bệnh nhân',
    };

    final hasSummary = summary.trim().isNotEmpty;
    final hasSuggest = suggestion.trim().isNotEmpty;
    final summaryLine = hasSummary ? '• Phân tích AI: $summary\n' : '';
    final suggestLine = hasSuggest ? '• Khuyến nghị: $suggestion\n' : '';

    final userJson = await AuthStorage.getUserJson();
    String patientName = '';
    if (userJson != null) {
      patientName =
          (userJson['name'] as String?) ??
          (userJson['full_name'] as String?) ??
          (((userJson['first_name'] as String?) ?? '') +
              (((userJson['last_name'] as String?) ?? '').isNotEmpty
                  ? ' ' + (userJson['last_name'] as String)
                  : ''));
      patientName = patientName.trim();
    }

    final text =
        """
Bác sĩ thân mến,

${patientName.isNotEmpty ? 'Bệnh nhân: $patientName\n\n' : ''}Dưới đây là thông tin sự kiện sức khỏe của bệnh nhân trong ngày $dateLabel:

• Thời điểm: ${time.isEmpty ? 'Không rõ' : time}
• Mức độ: $viStatus
$summaryLine$suggestLine
Bác sĩ vui lòng xem xét và cho ý kiến hướng dẫn tiếp theo.

Trân trọng.
""";

    final safePatient = patientName.isNotEmpty
        ? '<p><strong>Bệnh nhân:</strong> ${_escapeHtml(patientName)}</p>'
        : '';
    final safeTime = _escapeHtml(time.isEmpty ? 'Không rõ' : time);
    final safeViStatus = _escapeHtml(viStatus);
    final safeSummary = _escapeHtml(summary);
    final safeSuggestion = _escapeHtml(suggestion);

    final html =
        '''
<html>
<body style="font-family: Arial, Helvetica, sans-serif; color: #1f2937;">
  <div style="max-width:700px;margin:0 auto;padding:18px;background:#fff;border-radius:8px;border:1px solid #e6eef8;">
    <h2 style="color:#2563eb;margin:0 0 8px 0;">${_escapeHtml(subject)}</h2>
    $safePatient
    <p style="margin:4px 0;"><strong>Ngày:</strong> ${_escapeHtml(dateLabel)}</p>
    <p style="margin:4px 0;"><strong>Thời điểm:</strong> $safeTime</p>
    <p style="margin:4px 0;"><strong>Mức độ:</strong> <span style="font-weight:700;color:#0b8457;">$safeViStatus</span></p>
    ${safeSummary.isNotEmpty ? '<div style="margin-top:12px;padding:10px;background:#f8fafc;border-radius:6px;"><strong>Phân tích AI:</strong><div>${safeSummary}</div></div>' : ''}
    ${safeSuggestion.isNotEmpty ? '<div style="margin-top:8px;padding:10px;background:#fff7ed;border-radius:6px;border:1px solid #fde68a;"><strong>Khuyến nghị:</strong><div>${safeSuggestion}</div></div>' : ''}
    <p style="margin-top:12px;color:#111;font-weight:600">Bác sĩ vui lòng xem xét và cho ý kiến hướng dẫn tiếp theo.</p>
    <p style="margin-top:12px;color:#6b7280;">Trân trọng.</p>
  </div>
</body>
</html>
''';

    return {'subject': subject, 'text': text, 'html': html};
  }

  String _escapeHtml(String s) {
    return s
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
  }

  Future<bool> sendAnalystReportForCurrentUser({
    required String doctorId,
    required List<dynamic> entries,
  }) async {
    final id = await _userId();
    if (id == null) throw Exception('No user id available');

    final subject = 'Báo cáo phân tích sức khỏe - Toàn bộ dữ liệu';
    final buffer = StringBuffer();
    final userJson = await AuthStorage.getUserJson();
    String patientName = '';
    if (userJson != null) {
      patientName =
          (userJson['name'] as String?) ??
          (userJson['full_name'] as String?) ??
          (((userJson['first_name'] as String?) ?? '') +
              (((userJson['last_name'] as String?) ?? '').isNotEmpty
                  ? ' ' + (userJson['last_name'] as String)
                  : ''));
      patientName = patientName.trim();
    }

    buffer.writeln('Kính gửi bác sĩ,');
    if (patientName.isNotEmpty) buffer.writeln('Bệnh nhân: $patientName');
    buffer.writeln(
      'Dưới đây là toàn bộ dữ liệu phân tích hoạt động của bệnh nhân:',
    );
    buffer.writeln();

    for (var e in entries) {
      try {
        final dateLabel = e['date']?.toString() ?? '';
        buffer.writeln('== Ngày: $dateLabel ==');
        final data = e['data'];
        final analyses = data != null && data['analyses'] is List
            ? List.from(data['analyses'] as List)
            : <dynamic>[];

        for (var analysis in analyses) {
          final mostActive = analysis['mostActivePeriod']?.toString() ?? '';
          final mostAbnormal = analysis['mostAbnormalPeriod']?.toString() ?? '';
          if (mostActive.isNotEmpty)
            buffer.writeln('- Hoạt động nhiều nhất: $mostActive');
          if (mostAbnormal.isNotEmpty)
            buffer.writeln('- Bất thường nhiều nhất: $mostAbnormal');

          final daily = analysis['dailyActivityLog'] as List? ?? [];
          for (var activity in daily) {
            final time = activity['start_time']?.toString() ?? '';
            final status = activity['status']?.toString() ?? '';
            final viStatus = BackendEnums.statusToVietnamese(
              status.toLowerCase(),
            );
            final summary = activity['aiSummary']?.toString() ?? '';
            final suggestion = activity['actionSuggestion']?.toString() ?? '';

            buffer.writeln(
              '  • Thời gian: ${time.isEmpty ? 'Không rõ' : time}',
            );
            buffer.writeln('    - Mức độ: $viStatus');
            if (summary.isNotEmpty)
              buffer.writeln('    - Phân tích AI: $summary');
            if (suggestion.isNotEmpty)
              buffer.writeln('    - Khuyến nghị: $suggestion');
          }
          buffer.writeln();
        }
      } catch (_) {
        // ignore malformed entry
      }
    }

    final text = buffer.toString();

    final htmlBuf = StringBuffer();
    htmlBuf.writeln(
      '<html><body style="font-family:Arial,Helvetica,sans-serif;color:#1f2937;">',
    );
    htmlBuf.writeln(
      '<div style="max-width:800px;margin:0 auto;padding:18px;">',
    );
    htmlBuf.writeln('<h2>${_escapeHtml(subject)}</h2>');
    if (patientName.isNotEmpty)
      htmlBuf.writeln(
        '<p><strong>Bệnh nhân:</strong> ${_escapeHtml(patientName)}</p>',
      );
    htmlBuf.writeln('<table style="width:100%;border-collapse:collapse;">');
    htmlBuf.writeln(
      '<thead><tr style="background:#f1f5f9"><th style="padding:8px;border:1px solid #e2e8f0">Ngày</th><th style="padding:8px;border:1px solid #e2e8f0">Thời</th><th style="padding:8px;border:1px solid #e2e8f0">Mức độ</th><th style="padding:8px;border:1px solid #e2e8f0">Tóm tắt</th><th style="padding:8px;border:1px solid #e2e8f0">Khuyến nghị</th></tr></thead>',
    );

    for (var e in entries) {
      try {
        final dateLabel = e['date']?.toString() ?? '';
        final data = e['data'];
        final analyses = data != null && data['analyses'] is List
            ? List.from(data['analyses'] as List)
            : <dynamic>[];

        for (var analysis in analyses) {
          final daily = analysis['dailyActivityLog'] as List? ?? [];
          for (var activity in daily) {
            final time = activity['start_time']?.toString() ?? '';
            final status = activity['status']?.toString() ?? '';
            final viStatus = BackendEnums.statusToVietnamese(
              status.toLowerCase(),
            );
            final summary = activity['aiSummary']?.toString() ?? '';
            final suggestion = activity['actionSuggestion']?.toString() ?? '';

            htmlBuf.writeln('<tr>');
            htmlBuf.writeln(
              '<td style="padding:8px;border:1px solid #e2e8f0">${_escapeHtml(dateLabel)}</td>',
            );
            htmlBuf.writeln(
              '<td style="padding:8px;border:1px solid #e2e8f0">${_escapeHtml(time)}</td>',
            );
            htmlBuf.writeln(
              '<td style="padding:8px;border:1px solid #e2e8f0">${_escapeHtml(viStatus)}</td>',
            );
            htmlBuf.writeln(
              '<td style="padding:8px;border:1px solid #e2e8f0">${_escapeHtml(summary)}</td>',
            );
            htmlBuf.writeln(
              '<td style="padding:8px;border:1px solid #e2e8f0">${_escapeHtml(suggestion)}</td>',
            );
            htmlBuf.writeln('</tr>');
          }
        }
      } catch (_) {}
    }

    htmlBuf.writeln('</table>');
    htmlBuf.writeln(
      '<p style="margin-top:12px;color:#111;font-weight:600">Bác sĩ vui lòng xem xét và cho hướng dẫn tiếp theo.</p>',
    );
    htmlBuf.writeln('<p style="color:#6b7280;margin-top:12px">Trân trọng.</p>');
    htmlBuf.writeln('</div></body></html>');

    final html = htmlBuf.toString();

    return repo.sendEmail(
      customerId: id,
      doctorId: doctorId,
      subject: subject,
      text: text,
      html: html,
    );
  }
}
