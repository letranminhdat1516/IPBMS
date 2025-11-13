import 'dart:convert';

import 'package:detect_care_app/features/assignments/data/assignments_remote_data_source.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('Assignment.fromJson', () {
    test('parses nested caregiver/customer objects', () {
      final assignment = Assignment.fromJson({
        'assignment_id': 'assign-1',
        'caregiver_id': 'care-1',
        'customer_id': 'cust-1',
        'is_active': true,
        'assigned_at': '2025-01-01T00:00:00Z',
        'caregiver': {
          'full_name': 'Care Giver',
          'phone': '+84123456789',
          'email': 'care@example.com',
          'specialization': 'nurse',
        },
        'customer': {
          'full_name': 'Customer One',
        },
        'shared_permissions': {
          'stream_view': true,
          'alert_read': false,
        },
      });

      expect(assignment.assignmentId, 'assign-1');
      expect(assignment.caregiverName, 'Care Giver');
      expect(assignment.customerName, 'Customer One');
      expect(assignment.sharedPermissions?['stream_view'], isTrue);
      expect(assignment.sharedPermissions?['alert_read'], isFalse);
    });

    test('parses shared_permissions JSON string fallback', () {
      final assignment = Assignment.fromJson({
        'id': 'assign-2',
        'caregiver_id': 'care-2',
        'customer_id': 'cust-2',
        'status': 'active',
        'created_at': '2025-01-02T00:00:00Z',
        'shared_permissions': jsonEncode({
          'stream_view': true,
          'alert_ack': true,
        }),
      });

      expect(assignment.assignmentId, 'assign-2');
      expect(assignment.isActive, isTrue);
      expect(assignment.sharedPermissions?['stream_view'], isTrue);
      expect(assignment.sharedPermissions?['alert_ack'], isTrue);
    });
  });
}
