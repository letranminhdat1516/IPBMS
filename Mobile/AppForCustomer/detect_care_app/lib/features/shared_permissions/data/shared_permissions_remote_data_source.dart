import 'dart:convert';

import 'package:detect_care_app/core/network/api_client.dart';
import 'package:detect_care_app/features/auth/data/auth_storage.dart';
import 'package:detect_care_app/features/shared_permissions/models/caregiver_invitation.dart';
import 'package:detect_care_app/features/shared_permissions/models/caregiver_permission.dart';
import 'package:detect_care_app/features/shared_permissions/models/shared_permissions.dart';

class SharedPermissionsRemoteDataSource {
  final ApiClient _apiClient;

  SharedPermissionsRemoteDataSource({ApiClient? apiClient})
    : _apiClient =
          apiClient ?? ApiClient(tokenProvider: AuthStorage.getAccessToken);

  /// Get all permissions for a customer
  Future<List<CaregiverPermission>> getPermissions({
    required String customerId,
  }) async {
    final response = await _apiClient.get(
      '/customers/$customerId/shared-permissions',
    );

    print(
      '[SharedPermissionsAPI] GET /customers/$customerId/shared-permissions -> status=${response.statusCode} body=${response.body}',
    );

    if (response.statusCode == 200) {
      final data = _apiClient.extractDataFromResponse(response);
      if (data is List) {
        return data.map((item) => CaregiverPermission.fromJson(item)).toList();
      }
      return [];
    } else {
      throw Exception('Failed to load permissions');
    }
  }

  /// Get specific permission for a caregiver
  Future<CaregiverPermission?> getPermission({
    required String customerId,
    required String caregiverId,
  }) async {
    final response = await _apiClient.get(
      '/customers/$customerId/shared-permissions/$caregiverId',
    );

    print(
      '[SharedPermissionsAPI] GET /customers/$customerId/shared-permissions/$caregiverId -> status=${response.statusCode} body=${response.body}',
    );

    if (response.statusCode == 200) {
      final data = _apiClient.extractDataFromResponse(response);
      return CaregiverPermission.fromJson(data);
    } else if (response.statusCode == 404) {
      return null;
    } else {
      throw Exception('Failed to load permission');
    }
  }

  /// Create or update permissions for a caregiver
  Future<CaregiverPermission> updatePermissions({
    required String customerId,
    required String caregiverId,
    required String caregiverUsername,
    String? caregiverPhone,
    required String caregiverFullName,
    required SharedPermissions permissions,
  }) async {
    final permission = CaregiverPermission(
      customerId: customerId,
      caregiverId: caregiverId,
      caregiverUsername: caregiverUsername,
      caregiverFullName: caregiverFullName,
      permissions: permissions,
    );

    final path = '/customers/$customerId/shared-permissions/$caregiverId';
    final body = permission.toJson();
    print('[SharedPermissionsAPI] PUT $path REQUEST body=${json.encode(body)}');

    final response = await _apiClient.put(path, body: body);

    print(
      '[SharedPermissionsAPI] PUT $path RESPONSE status=${response.statusCode} body=${response.body}',
    );

    if (response.statusCode == 200 || response.statusCode == 201) {
      final data = _apiClient.extractDataFromResponse(response);
      return CaregiverPermission.fromJson(data);
    } else {
      throw Exception('Failed to update permissions');
    }
  }

  /// Direct PUT using a raw permissions payload. This accepts a Map that
  /// matches the backend shared-permissions JSON shape (e.g. stream_view,
  /// alert_read, notification_channel, etc) and sends it to the
  /// /customers/{customerId}/shared-permissions/{caregiverId} endpoint.
  ///
  /// Returns the parsed [CaregiverPermission] on success (200/201).
  Future<CaregiverPermission> putSharedPermissionsRaw({
    required String customerId,
    required String caregiverId,
    required Map<String, dynamic> permissionsPayload,
  }) async {
    final path = '/customers/$customerId/shared-permissions/$caregiverId';
    print(
      '[SharedPermissionsAPI] PUT $path REQUEST body=${json.encode(permissionsPayload)}',
    );

    final response = await _apiClient.put(path, body: permissionsPayload);

    print(
      '[SharedPermissionsAPI] PUT $path RESPONSE status=${response.statusCode} body=${response.body}',
    );

    if (response.statusCode == 200 || response.statusCode == 201) {
      final data = _apiClient.extractDataFromResponse(response);
      return CaregiverPermission.fromJson(data);
    }

    throw Exception(
      'Failed to PUT shared-permissions: ${response.statusCode} ${response.body}',
    );
  }

  /// Remove permissions for a caregiver
  Future<void> removePermissions({
    required String customerId,
    required String caregiverId,
  }) async {
    final response = await _apiClient.delete(
      '/customers/$customerId/shared-permissions/$caregiverId',
    );

    print(
      '[SharedPermissionsAPI] DELETE /customers/$customerId/shared-permissions/$caregiverId -> status=${response.statusCode} body=${response.body}',
    );

    if (response.statusCode != 200 && response.statusCode != 204) {
      throw Exception('Failed to remove permissions');
    }
  }

  // Legacy invitation methods - kept for compatibility but not used with direct permissions
  /// Get all invitations for a customer (legacy - not used)
  Future<List<CaregiverInvitation>> getInvitations({
    required String customerId,
  }) async {
    final response = await _apiClient.get('/customers/$customerId/invitations');

    if (response.statusCode == 200) {
      final data = _apiClient.extractDataFromResponse(response);
      if (data is List) {
        return data.map((item) => CaregiverInvitation.fromJson(item)).toList();
      }
      return [];
    } else {
      throw Exception('Failed to load invitations');
    }
  }

  /// Get all caregiver assignments (new API)
  Future<List<CaregiverInvitation>> getAssignments({
    String? caregiverId,
    String? customerId,
  }) async {
    final queryParams = <String, String>{};
    if (caregiverId != null) queryParams['caregiver_id'] = caregiverId;
    if (customerId != null) queryParams['customer_id'] = customerId;

    final response = await _apiClient.get(
      '/caregiver-invitations',
      query: queryParams.isNotEmpty ? queryParams : null,
    );

    print(
      '[SharedPermissionsAPI] GET /caregiver-invitations query=$queryParams -> status=${response.statusCode} body=${response.body}',
    );

    if (response.statusCode == 200) {
      final data = _apiClient.extractDataFromResponse(response);
      if (data is List) {
        return data.map((item) => CaregiverInvitation.fromJson(item)).toList();
      }
      return [];
    } else {
      throw Exception('Failed to load assignments');
    }
  }

  /// Get assignments for current caregiver
  Future<List<CaregiverInvitation>> getAssignmentsForCaregiver({
    String? status,
  }) async {
    final queryParams = <String, String>{};
    if (status != null) queryParams['status'] = status;

    final response = await _apiClient.get(
      '/caregiver-invitations/caregiver/me',
      query: queryParams.isNotEmpty ? queryParams : null,
    );

    print(
      '[SharedPermissionsAPI] GET /caregiver-invitations/caregiver/me query=$queryParams -> status=${response.statusCode} body=${response.body}',
    );

    if (response.statusCode == 200) {
      final data = _apiClient.extractDataFromResponse(response);
      if (data is List) {
        return data.map((item) => CaregiverInvitation.fromJson(item)).toList();
      }
      return [];
    } else {
      throw Exception('Failed to load caregiver assignments');
    }
  }

  /// Get assignments for current customer
  Future<List<CaregiverInvitation>> getAssignmentsForCustomer({
    String? status,
  }) async {
    final queryParams = <String, String>{};
    if (status != null) queryParams['status'] = status;

    final response = await _apiClient.get(
      '/caregiver-invitations/customer/me',
      query: queryParams.isNotEmpty ? queryParams : null,
    );

    print(
      '[SharedPermissionsAPI] GET /caregiver-invitations/customer/me query=$queryParams -> status=${response.statusCode} body=${response.body}',
    );

    if (response.statusCode == 200) {
      final data = _apiClient.extractDataFromResponse(response);
      if (data is List) {
        return data.map((item) => CaregiverInvitation.fromJson(item)).toList();
      }
      return [];
    } else {
      throw Exception('Failed to load customer assignments');
    }
  }

  /// Get assignments by customer ID
  Future<List<CaregiverInvitation>> getAssignmentsByCustomer({
    required String customerId,
  }) async {
    final response = await _apiClient.get(
      '/caregiver-invitations/by-customer/$customerId',
    );

    print(
      '[SharedPermissionsAPI] GET /caregiver-invitations/by-customer/$customerId -> status=${response.statusCode} body=${response.body}',
    );

    if (response.statusCode == 200) {
      final data = _apiClient.extractDataFromResponse(response);
      if (data is List) {
        return data.map((item) => CaregiverInvitation.fromJson(item)).toList();
      }
      return [];
    } else {
      throw Exception('Failed to load assignments by customer');
    }
  }

  /// Get pending assignments for current caregiver
  Future<List<CaregiverInvitation>> getPendingAssignments() async {
    final response = await _apiClient.get('/caregiver-invitations/pending');

    print(
      '[SharedPermissionsAPI] GET /caregiver-invitations/pending -> status=${response.statusCode} body=${response.body}',
    );

    if (response.statusCode == 200) {
      final data = _apiClient.extractDataFromResponse(response);
      if (data is List) {
        return data.map((item) => CaregiverInvitation.fromJson(item)).toList();
      }
      return [];
    } else {
      throw Exception('Failed to load pending assignments');
    }
  }

  /// Accept caregiver assignment
  Future<CaregiverInvitation> acceptAssignment({
    required String assignmentId,
  }) async {
    final response = await _apiClient.post(
      '/caregiver-invitations/$assignmentId/accept',
    );

    print(
      '[SharedPermissionsAPI] POST /caregiver-invitations/$assignmentId/accept -> status=${response.statusCode} body=${response.body}',
    );

    if (response.statusCode == 200) {
      final data = _apiClient.extractDataFromResponse(response);
      return CaregiverInvitation.fromJson(data);
    } else {
      throw Exception('Failed to accept assignment');
    }
  }

  /// Reject caregiver assignment
  Future<CaregiverInvitation> rejectAssignment({
    required String assignmentId,
  }) async {
    final response = await _apiClient.post(
      '/caregiver-invitations/$assignmentId/reject',
    );

    print(
      '[SharedPermissionsAPI] POST /caregiver-invitations/$assignmentId/reject -> status=${response.statusCode} body=${response.body}',
    );

    if (response.statusCode == 200) {
      final data = _apiClient.extractDataFromResponse(response);
      return CaregiverInvitation.fromJson(data);
    } else {
      throw Exception('Failed to reject assignment');
    }
  }

  /// Unassign caregiver by assignment ID
  Future<void> unassignById({required String assignmentId}) async {
    final response = await _apiClient.delete(
      '/caregiver-invitations/$assignmentId',
    );

    print(
      '[SharedPermissionsAPI] DELETE /caregiver-invitations/$assignmentId -> status=${response.statusCode} body=${response.body}',
    );

    if (response.statusCode != 200 && response.statusCode != 204) {
      throw Exception('Failed to unassign caregiver');
    }
  }

  /// Unassign caregiver by pair
  Future<void> unassignByPair({
    required String caregiverId,
    required String customerId,
  }) async {
    final body = {'caregiver_id': caregiverId, 'customer_id': customerId};

    final response = await _apiClient.delete(
      '/caregiver-invitations/pair',
      body: body,
    );

    print(
      '[SharedPermissionsAPI] DELETE /caregiver-invitations/pair REQUEST body=${json.encode(body)} -> status=${response.statusCode} body=${response.body}',
    );

    if (response.statusCode != 200 && response.statusCode != 204) {
      throw Exception('Failed to unassign caregiver pair');
    }
  }

  /// Send invitation to caregiver. Accepts permission keys as a list of
  /// strings to match backend API (e.g. ['stream_view','alert_read',...]).
  Future<CaregiverInvitation> sendInvitation({
    required String customerId,
    required String caregiverEmail,
    required String caregiverName,
    required Object permissions,
    int? durationHours,
  }) async {
    // permissions can be either a List<String> of permission keys (new
    // behaviour) or a SharedPermissions object (legacy). Convert to the
    // appropriate body format.
    dynamic permsBody;
    if (permissions is List<String>) {
      permsBody = permissions;
    } else {
      // Assume it's a SharedPermissions-like object with toJson()
      try {
        permsBody = (permissions as dynamic).toJson();
      } catch (_) {
        // Fallback: wrap unknown value
        permsBody = permissions;
      }
    }

    final body = {
      'caregiver_email': caregiverEmail,
      'caregiver_name': caregiverName,
      'permissions': permsBody,
      if (durationHours != null) 'duration': durationHours,
    };

    final response = await _apiClient.post(
      '/customers/$customerId/invitations',
      body: body,
    );

    print(
      '[SharedPermissionsAPI] POST /customers/$customerId/invitations REQUEST body=${json.encode(body)} -> status=${response.statusCode} body=${response.body}',
    );

    if (response.statusCode == 201 || response.statusCode == 200) {
      final data = _apiClient.extractDataFromResponse(response);
      return CaregiverInvitation.fromJson(data);
    } else {
      throw Exception('Failed to send invitation');
    }
  }

  /// Create new caregiver assignment (new API)
  Future<CaregiverInvitation> createAssignment({
    required String caregiverId,
    String? assignmentNotes,
  }) async {
    final body = {
      'caregiver_id': caregiverId,
      if (assignmentNotes != null) 'assignment_notes': assignmentNotes,
    };

    final response = await _apiClient.post(
      '/caregiver-invitations',
      body: body,
    );

    print(
      '[SharedPermissionsAPI] POST /caregiver-invitations REQUEST body=${json.encode(body)} -> status=${response.statusCode} body=${response.body}',
    );

    if (response.statusCode == 201 || response.statusCode == 200) {
      final data = _apiClient.extractDataFromResponse(response);
      return CaregiverInvitation.fromJson(data);
    } else {
      throw Exception('Failed to create assignment');
    }
  }

  /// Revoke invitation (legacy - not used)
  Future<void> revokeInvitation({
    required String customerId,
    required String invitationId,
  }) async {
    final response = await _apiClient.delete(
      '/customers/$customerId/invitations/$invitationId/revoke',
    );

    print(
      '[SharedPermissionsAPI] DELETE /customers/$customerId/invitations/$invitationId/revoke -> status=${response.statusCode} body=${response.body}',
    );

    if (response.statusCode != 200 && response.statusCode != 204) {
      throw Exception('Failed to revoke invitation');
    }
  }

  /// Get pending invitations for caregiver (legacy - not used)
  Future<List<CaregiverInvitation>> getPendingInvitations({
    required String caregiverId,
  }) async {
    final response = await _apiClient.get(
      '/caregivers/$caregiverId/invitations/pending',
    );

    print(
      '[SharedPermissionsAPI] GET /caregivers/$caregiverId/invitations/pending -> status=${response.statusCode} body=${response.body}',
    );

    if (response.statusCode == 200) {
      final data = _apiClient.extractDataFromResponse(response);
      if (data is List) {
        return data.map((item) => CaregiverInvitation.fromJson(item)).toList();
      }
      return [];
    } else {
      throw Exception('Failed to load pending invitations');
    }
  }

  /// Respond to invitation (legacy - not used)
  Future<void> respondInvitation({
    required String customerId,
    required String invitationId,
    required bool accept,
    String? message,
  }) async {
    final response = await _apiClient.post(
      '/customers/$customerId/invitations/$invitationId/respond',
      body: {'accept': accept, if (message != null) 'message': message},
    );

    print(
      '[SharedPermissionsAPI] POST /customers/$customerId/invitations/$invitationId/respond REQUEST body=${json.encode({'accept': accept, if (message != null) 'message': message})} -> status=${response.statusCode} body=${response.body}',
    );

    if (response.statusCode != 200) {
      throw Exception('Failed to respond to invitation');
    }
  }

  /// Get shared permissions for caregiver (legacy - not used)
  Future<SharedPermissions> getSharedPermissions({
    required String customerId,
    required String caregiverId,
  }) async {
    final response = await _apiClient.get(
      '/shared-permissions/check-access',
      query: {'customer_id': customerId, 'caregiver_id': caregiverId},
    );

    print(
      '[SharedPermissionsAPI] GET /shared-permissions/check-access query=${json.encode({'customer_id': customerId, 'caregiver_id': caregiverId})} -> status=${response.statusCode} body=${response.body}',
    );

    if (response.statusCode == 200) {
      final data = _apiClient.extractDataFromResponse(response);
      return SharedPermissions.fromJson(data);
    } else {
      throw Exception('Failed to load shared permissions');
    }
  }

  /// Update shared permissions for caregiver (legacy - not used)
  Future<SharedPermissions> updateSharedPermissions({
    required String customerId,
    required String caregiverId,
    required SharedPermissions data,
  }) async {
    final response = await _apiClient.put(
      '/shared-permissions',
      body: {
        'customer_id': customerId,
        'caregiver_id': caregiverId,
        'permissions': data.toJson(),
      },
    );

    print(
      '[SharedPermissionsAPI] PUT /shared-permissions REQUEST body=${json.encode({'customer_id': customerId, 'caregiver_id': caregiverId, 'permissions': data.toJson()})} -> status=${response.statusCode} body=${response.body}',
    );

    if (response.statusCode == 200) {
      final responseData = _apiClient.extractDataFromResponse(response);
      return SharedPermissions.fromJson(responseData);
    } else {
      throw Exception('Failed to update shared permissions');
    }
  }

  // ===================== PERMISSION REQUESTS =====================

  /// Lấy danh sách yêu cầu quyền truy cập đang chờ duyệt (PENDING)
  /// GET /api/permission-requests/customers/{customerId}/pending?status=PENDING
  Future<List<Map<String, dynamic>>> getPendingPermissionRequests({
    required String customerId,
    String status = 'PENDING',
  }) async {
    final res = await _apiClient.get(
      '/permission-requests/customers/$customerId/pending',
      query: {'status': status},
    );

    print(
      '[PermissionRequestsAPI] GET /permission-requests/customers/$customerId/pending?status=$status -> ${res.statusCode}\nBody: ${res.body}',
    );

    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw Exception(
        'Failed to fetch pending permission requests: ${res.statusCode} ${res.body}',
      );
    }

    final decoded = json.decode(res.body);
    if (decoded is List) {
      return decoded.cast<Map<String, dynamic>>();
    } else if (decoded is Map && decoded['data'] is List) {
      return (decoded['data'] as List).cast<Map<String, dynamic>>();
    } else {
      throw Exception(
        'Unexpected response format from permission-requests: ${res.body}',
      );
    }
  }

  /// Duyệt yêu cầu quyền truy cập
  /// POST /api/permission-requests/{id}/approve
  Future<Map<String, dynamic>> approvePermissionRequest({
    required String requestId,
    required String decisionReason,
    bool override = true,
    String mode = 'replace',
  }) async {
    final body = {
      'decisionReason': decisionReason,
      'override': override,
      'mode': mode,
    };

    final res = await _apiClient.post(
      '/permission-requests/$requestId/approve',
      body: body,
    );

    print(
      '[PermissionRequestsAPI] POST /permission-requests/$requestId/approve '
      '-> ${res.statusCode}\nRequest: ${json.encode(body)}\nResponse: ${res.body}',
    );

    if (res.statusCode == 200 || res.statusCode == 201) {
      final decoded = json.decode(res.body);
      return decoded is Map<String, dynamic> ? decoded : {'data': decoded};
    } else if (res.statusCode == 403) {
      throw Exception('Không có quyền duyệt yêu cầu này (403)');
    } else if (res.statusCode == 404) {
      throw Exception('Không tìm thấy yêu cầu quyền (404)');
    } else {
      throw Exception(
        'Approve permission request failed: ${res.statusCode} ${res.body}',
      );
    }
  }

  /// Từ chối yêu cầu quyền truy cập
  /// POST /api/permission-requests/{id}/reject
  Future<Map<String, dynamic>> rejectPermissionRequest({
    required String requestId,
    required String decisionReason,
  }) async {
    final body = {'decisionReason': decisionReason};

    final res = await _apiClient.post(
      '/permission-requests/$requestId/reject',
      body: body,
    );

    print(
      '[PermissionRequestsAPI] POST /permission-requests/$requestId/reject '
      '-> ${res.statusCode}\nRequest: ${json.encode(body)}\nResponse: ${res.body}',
    );

    if (res.statusCode == 200 || res.statusCode == 201) {
      final decoded = json.decode(res.body);
      return decoded is Map<String, dynamic> ? decoded : {'data': decoded};
    } else if (res.statusCode == 404) {
      throw Exception('Không tìm thấy yêu cầu quyền (404)');
    } else {
      throw Exception(
        'Reject permission request failed: ${res.statusCode} ${res.body}',
      );
    }
  }

  /// Từ chối hàng loạt yêu cầu quyền truy cập
  /// POST /api/permission-requests/bulk/reject
  Future<Map<String, dynamic>> bulkRejectPermissionRequests({
    required List<String> requestIds,
    required String decisionReason,
  }) async {
    final body = {'ids': requestIds, 'decisionReason': decisionReason};

    final res = await _apiClient.post(
      '/permission-requests/bulk/reject',
      body: body,
    );

    print(
      '[PermissionRequestsAPI] POST /permission-requests/bulk/reject '
      '-> ${res.statusCode}\nRequest: ${json.encode(body)}\nResponse: ${res.body}',
    );

    if (res.statusCode == 200 || res.statusCode == 201) {
      final decoded = json.decode(res.body);
      return decoded is Map<String, dynamic> ? decoded : {'data': decoded};
    } else {
      throw Exception(
        'Bulk reject permission requests failed: ${res.statusCode} ${res.body}',
      );
    }
  }

  /// Duyệt hàng loạt yêu cầu quyền truy cập
  /// POST /api/permission-requests/bulk/approve
  Future<Map<String, dynamic>> bulkApprovePermissionRequests({
    required List<String> requestIds,
    required String decisionReason,
    bool override = true,
  }) async {
    final body = {
      'ids': requestIds,
      'decisionReason': decisionReason,
      'override': override,
    };

    final res = await _apiClient.post(
      '/permission-requests/bulk/approve',
      body: body,
    );

    print(
      '[PermissionRequestsAPI] POST /permission-requests/bulk/approve '
      '-> ${res.statusCode}\nRequest: ${json.encode(body)}\nResponse: ${res.body}',
    );

    if (res.statusCode == 200 || res.statusCode == 201) {
      final decoded = json.decode(res.body);
      return decoded is Map<String, dynamic> ? decoded : {'data': decoded};
    } else {
      throw Exception(
        'Bulk approve permission requests failed: ${res.statusCode} ${res.body}',
      );
    }
  }

  /// Lấy tất cả permission requests của 1 customer (bao gồm đã duyệt và từ chối)
  /// GET /api/permission-requests/customers/{customerId}/all
  Future<List<Map<String, dynamic>>> getAllPermissionRequests({
    required String customerId,
  }) async {
    final path = '/permission-requests/customers/$customerId/all';
    print(
      '[PermissionRequestsAPI] getAllPermissionRequests called with customerId="$customerId" path="$path"',
    );
    if (customerId.isEmpty) {
      print(
        '[PermissionRequestsAPI] WARNING: customerId is empty — this will likely cause 404',
      );
    }

    final res = await _apiClient.get(path);

    print(
      '[PermissionRequestsAPI] GET $path -> ${res.statusCode}\nBody: ${res.body}',
    );

    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw Exception(
        'Failed to fetch all permission requests: ${res.statusCode} ${res.body}',
      );
    }

    final decoded = json.decode(res.body);
    if (decoded is Map && decoded['data'] is List) {
      return (decoded['data'] as List).cast<Map<String, dynamic>>();
    } else {
      throw Exception(
        'Unexpected response format when fetching all permission requests: ${res.body}',
      );
    }
  }

  /// Xem chi tiết một permission request (kèm history)
  /// GET /api/permission-requests/{id}
  Future<Map<String, dynamic>> getPermissionRequestDetail({
    required String requestId,
  }) async {
    final res = await _apiClient.get('/permission-requests/$requestId');

    print(
      '[PermissionRequestsAPI] GET /permission-requests/$requestId '
      '-> ${res.statusCode}\nBody: ${res.body}',
    );

    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw Exception(
        'Failed to fetch permission request detail: ${res.statusCode} ${res.body}',
      );
    }

    final decoded = json.decode(res.body);
    if (decoded is Map && decoded['data'] is Map) {
      return decoded['data'] as Map<String, dynamic>;
    } else {
      throw Exception(
        'Unexpected response format from permission-request detail: ${res.body}',
      );
    }
  }
}
