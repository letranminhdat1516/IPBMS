import 'dart:convert';

import 'package:detect_care_app/core/network/api_client.dart';
import 'package:detect_care_app/features/shared_permissions/data/shared_permissions_remote_data_source.dart';
import 'package:detect_care_app/features/shared_permissions/models/shared_permissions.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

SharedPermissionsRemoteDataSource _buildDataSource(
  Future<http.Response> Function(http.Request) handler,
) {
  final client = MockClient(handler);
  final apiClient = ApiClient(
    client: client,
    tokenProvider: () async => 'mock-token',
  );
  return SharedPermissionsRemoteDataSource(apiClient: apiClient);
}

Map<String, dynamic> _sampleInvitation({String status = 'pending'}) => {
  'id': 'inv-1',
  'caregiver_id': 'care-1',
  'caregiver_name': 'Care Giver',
  'caregiver_email': 'care@example.com',
  'customer_id': 'cust-1',
  'customer_name': 'Customer One',
  'status': status,
  'created_at': '2025-01-01T00:00:00Z',
  'responded_at': null,
  'permissions': {
    'stream_view': true,
    'alert_read': true,
    'alert_ack': false,
    'log_access_days': 7,
    'report_access_days': 30,
    'notification_channel': ['push'],
    'profile_view': true,
  },
};

void main() {
  setUpAll(() {
    dotenv.testLoad(fileInput: 'API_BASE_URL=https://example.com');
  });

  group('SharedPermissionsRemoteDataSource', () {
    test('getInvitations sends customer_id and parses response', () async {
      late http.Request captured;
      final dataSource = _buildDataSource((request) async {
        captured = request;
        expect(request.method, 'GET');
        expect(request.url.path, '/customers/cust-1/invitations');
        expect(request.headers['authorization'], 'Bearer mock-token');

        return http.Response(
          jsonEncode({
            'success': true,
            'data': [_sampleInvitation()],
          }),
          200,
          headers: {'content-type': 'application/json'},
        );
      });

      final invitations = await dataSource.getInvitations(customerId: 'cust-1');

      expect(captured, isNotNull);
      expect(invitations, hasLength(1));
      expect(invitations.first.caregiverEmail, 'care@example.com');
      expect(invitations.first.permissions?.streamView, isTrue);
    });

    test('sendInvitation posts payload with customer_id', () async {
      late Map<String, dynamic> body;
      final permissions = SharedPermissions(
        streamView: true,
        alertRead: false,
        alertAck: true,
        logAccessDays: 5,
        reportAccessDays: 10,
        notificationChannel: const ['push', 'sms'],
        profileView: true,
      );

      final dataSource = _buildDataSource((request) async {
        expect(request.method, 'POST');
        expect(request.url.path, '/customers/cust-1/invitations');
        body = jsonDecode(request.body) as Map<String, dynamic>;
        expect(body['caregiver_email'], 'care@example.com');
        expect(body['permissions'], isA<Map>());
        return http.Response(
          jsonEncode({'success': true, 'data': _sampleInvitation()}),
          201,
          headers: {'content-type': 'application/json'},
        );
      });

      final invitation = await dataSource.sendInvitation(
        customerId: 'cust-1',
        caregiverEmail: 'care@example.com',
        caregiverName: 'Care Giver',
        permissions: permissions,
      );

      expect(body['permissions']['alert_ack'], isTrue);
      expect(invitation.customerId, 'cust-1');
    });

    test('revokeInvitation includes customer_id query', () async {
      final dataSource = _buildDataSource((request) async {
        expect(request.method, 'DELETE');
        expect(request.url.path, '/customers/cust-1/invitations/inv-1/revoke');
        return http.Response('', 204);
      });

      await dataSource.revokeInvitation(
        customerId: 'cust-1',
        invitationId: 'inv-1',
      );
    });

    test('respondInvitation posts accept payload with message', () async {
      late Map<String, dynamic> body;
      final dataSource = _buildDataSource((request) async {
        expect(request.method, 'POST');
        expect(request.url.path, '/customers/cust-1/invitations/inv-1/respond');
        body = jsonDecode(request.body) as Map<String, dynamic>;
        expect(body['accept'], isTrue);
        expect(body['message'], 'accepted');
        return http.Response(
          '{}',
          200,
          headers: {'content-type': 'application/json'},
        );
      });

      await dataSource.respondInvitation(
        customerId: 'cust-1',
        invitationId: 'inv-1',
        accept: true,
        message: 'accepted',
      );

      expect(body['accept'], isTrue);
    });

    test(
      'getSharedPermissions sends both customer and caregiver ids',
      () async {
        final dataSource = _buildDataSource((request) async {
          expect(request.method, 'GET');
          expect(request.url.path, '/shared-permissions/check-access');
          expect(request.url.queryParameters['customer_id'], 'cust-1');
          expect(request.url.queryParameters['caregiver_id'], 'care-1');
          return http.Response(
            jsonEncode({
              'success': true,
              'data': {
                'stream_view': true,
                'alert_read': true,
                'alert_ack': false,
                'log_access_days': 3,
                'report_access_days': 12,
                'notification_channel': ['push'],
                'profile_view': true,
              },
            }),
            200,
            headers: {'content-type': 'application/json'},
          );
        });

        final permissions = await dataSource.getSharedPermissions(
          customerId: 'cust-1',
          caregiverId: 'care-1',
        );

        expect(permissions.alertRead, isTrue);
        expect(permissions.reportAccessDays, 12);
      },
    );

    test('updateSharedPermissions sends identifiers in body', () async {
      late Map<String, dynamic> body;
      final data = SharedPermissions(
        streamView: true,
        alertRead: true,
        alertAck: true,
        logAccessDays: 14,
        reportAccessDays: 30,
        notificationChannel: const ['push'],
        profileView: false,
      );

      final dataSource = _buildDataSource((request) async {
        expect(request.method, 'PUT');
        expect(request.url.path, '/shared-permissions');
        body = jsonDecode(request.body) as Map<String, dynamic>;
        expect(body['customer_id'], 'cust-1');
        expect(body['caregiver_id'], 'care-1');
        expect(body['permissions']['profile_view'], isFalse);
        return http.Response(
          jsonEncode({'success': true, 'data': data.toJson()}),
          200,
          headers: {'content-type': 'application/json'},
        );
      });

      final updated = await dataSource.updateSharedPermissions(
        customerId: 'cust-1',
        caregiverId: 'care-1',
        data: data,
      );

      expect(updated.profileView, isFalse);
      expect(body['permissions']['alert_read'], isTrue);
    });
  });
}
