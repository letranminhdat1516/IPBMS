import 'package:flutter_test/flutter_test.dart';
import 'package:detect_care_app/features/shared_permissions/models/caregiver_permission.dart';

void main() {
  test('CaregiverPermission.fromJson accepts colon and underscore keys', () {
    final jsonColon = {
      'caregiver_id': 'cg-1',
      'caregiver_username': 'alice',
      'permissions': {
        'stream:view': true,
        'alert:read': false,
        'alert:ack': true,
        'profile:view': true,
        'log_access_days': 5,
        'report_access_days': 2,
        'notification_channel': ['push', 'sms'],
      },
    };

    final jsonUnderscore = {
      'caregiver_id': 'cg-1',
      'caregiver_username': 'alice',
      'permissions': {
        'stream_view': true,
        'alert_read': false,
        'alert_ack': true,
        'profile_view': true,
        'log_access_days': 5,
        'report_access_days': 2,
        'notification_channel': ['push', 'sms'],
      },
    };

    final p1 = CaregiverPermission.fromJson(jsonColon);
    final p2 = CaregiverPermission.fromJson(jsonUnderscore);

    expect(p1.caregiverId, equals(p2.caregiverId));
    expect(p1.caregiverUsername, equals(p2.caregiverUsername));
    expect(p1.permissions.streamView, equals(p2.permissions.streamView));
    expect(p1.permissions.alertRead, equals(p2.permissions.alertRead));
    expect(p1.permissions.alertAck, equals(p2.permissions.alertAck));
    expect(p1.permissions.profileView, equals(p2.permissions.profileView));
    expect(p1.permissions.logAccessDays, equals(p2.permissions.logAccessDays));
    expect(
      p1.permissions.reportAccessDays,
      equals(p2.permissions.reportAccessDays),
    );
    expect(
      p1.permissions.notificationChannel,
      equals(p2.permissions.notificationChannel),
    );
  });
}
