import 'dart:convert';

import 'package:detect_care_app/core/network/api_client.dart';
import 'package:detect_care_app/features/auth/data/auth_storage.dart';
import 'package:detect_care_app/core/utils/logger.dart';

class Assignment {
  final String assignmentId;
  final String caregiverId;
  final String customerId;
  final bool isActive;
  final String assignedAt;
  final String? unassignedAt;
  final String? notes;
  final String? assignmentType;
  final String? status;
  final String? createdAt;
  final String? updatedAt;
  final String? caregiverName;
  final String? caregiverPhone;
  final String? caregiverEmail;
  final String? caregiverSpecialization;
  final String? customerName;
  final Map<String, dynamic>? sharedPermissions;

  const Assignment({
    required this.assignmentId,
    required this.caregiverId,
    required this.customerId,
    required this.isActive,
    required this.assignedAt,
    this.unassignedAt,
    this.notes,
    this.assignmentType,
    this.status,
    this.createdAt,
    this.updatedAt,
    this.caregiverName,
    this.caregiverPhone,
    this.caregiverEmail,
    this.caregiverSpecialization,
    this.customerName,
    this.sharedPermissions,
  });

  factory Assignment.fromJson(Map<String, dynamic> json) {
    String? stringOrNull(dynamic v) => (v is String && v.isNotEmpty) ? v : null;

    final caregiverObj = json['caregiver'] as Map<String, dynamic>?;
    final customerObj = json['customer'] as Map<String, dynamic>?;

    return Assignment(
      assignmentId: (json['assignment_id'] ?? json['id'] ?? '').toString(),
      caregiverId: (json['caregiver_id'] ?? '').toString(),
      customerId: (json['customer_id'] ?? '').toString(),
      isActive: json['is_active'] == true || json['status'] == 'active',
      assignedAt: (json['assigned_at'] ?? json['created_at'] ?? '').toString(),
      unassignedAt: stringOrNull(json['unassigned_at']),
      notes: stringOrNull(json['assignment_notes'] ?? json['notes']),
      assignmentType: stringOrNull(json['assignment_type']),
      status: stringOrNull(json['status']),
      createdAt: stringOrNull(json['created_at']),
      updatedAt: stringOrNull(json['updated_at']),
      caregiverName: stringOrNull(
        caregiverObj?['full_name'] ?? json['caregiver_name'],
      ),
      caregiverPhone: stringOrNull(
        caregiverObj?['phone'] ?? json['caregiver_phone'],
      ),
      caregiverEmail: stringOrNull(
        caregiverObj?['email'] ?? json['caregiver_email'],
      ),
      caregiverSpecialization: stringOrNull(
        caregiverObj?['specialization'] ?? json['caregiver_specialization'],
      ),
      customerName: stringOrNull(
        customerObj?['full_name'] ?? json['customer_name'],
      ),

      sharedPermissions: () {
        String normalizeKey(String key) {
          var s = key.toString();
          s = s.replaceAll(':', '_').replaceAll('-', '_').replaceAll('/', '_');
          s = s.replaceAll(RegExp(r'\s+'), '_');
          s = s.replaceAll(RegExp(r'[^a-zA-Z0-9_]'), '');
          return s.toLowerCase();
        }

        bool toBool(dynamic v) =>
            v == true || v == '1' || v == 'true' || v == 'True' || v == 1;

        try {
          final p = json['shared_permissions'] ?? json['permissions'];
          if (p == null) return null;
          if (p is Map) {
            final map = <String, bool>{};
            p.forEach((k, v) {
              final origKey = k.toString();
              final norm = normalizeKey(origKey);
              final val = toBool(v);
              map[norm] = val;
              if (norm != origKey) map[origKey] = val;
            });
            return map;
          }
          if (p is String && p.isNotEmpty) {
            final decoded = jsonDecode(p);
            if (decoded is Map) {
              final map = <String, bool>{};
              decoded.forEach((k, v) {
                final origKey = k.toString();
                final norm = normalizeKey(origKey);
                final val = toBool(v);
                map[norm] = val;
                if (norm != origKey) map[origKey] = val;
              });
              return map;
            }
          }
        } catch (_) {
          // ignore parsing errors and fall through to null
        }
        return null;
      }(),
    );
  }
}

class AssignmentsRemoteDataSource {
  final ApiClient _api;
  AssignmentsRemoteDataSource({ApiClient? api})
    : _api = api ?? ApiClient(tokenProvider: AuthStorage.getAccessToken);

  bool _isValidUUID(String? id) {
    if (id == null || id.isEmpty) return false;
    final uuidRegex = RegExp(
      r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
      caseSensitive: false,
    );
    return uuidRegex.hasMatch(id);
  }

  /// Tạo assignment mới (POST /assignments)
  /// Tạo một assignment mới giữa customer và caregiver
  ///
  /// Parameters:
  /// - caregiverId: ID của caregiver (phải là UUID hợp lệ)
  /// - customerId: ID của customer (phải là UUID hợp lệ)
  /// - notes: Ghi chú cho assignment (optional)
  ///
  /// Returns: Assignment object với thông tin đã tạo
  ///
  /// Throws:
  /// - Exception nếu caregiverId hoặc customerId không hợp lệ
  /// - Exception nếu server trả về lỗi
  /// - Exception nếu response không chứa dữ liệu hợp lệ
  Future<Assignment> create({
    required String caregiverId,
    required String customerId,
    String? notes,
  }) async {
    AppLogger.api(
      '\n📝 Creating new assignment: caregiver=$caregiverId customer=$customerId notes=${notes ?? 'N/A'}',
    );

    // Validate IDs
    if (!_isValidUUID(caregiverId)) {
      throw Exception('Invalid caregiver_id format: $caregiverId');
    }
    if (!_isValidUUID(customerId)) {
      throw Exception('Invalid customer_id format: $customerId');
    }

    final payload = {
      'caregiver_id': caregiverId,
      'customer_id': customerId,
      if (notes != null && notes.isNotEmpty) 'assignment_notes': notes,
    };

    final res = await _api.post('/caregiver-invitations', body: payload);

    if (res.statusCode < 200 || res.statusCode >= 300) {
      AppLogger.apiError(
        'Assignment creation failed: ${res.statusCode} ${res.body}',
      );
      throw Exception(
        'Create assignment failed: ${res.statusCode} ${res.body}',
      );
    }

    AppLogger.api('Assignment creation raw response: ${res.body}');
    if (res.body.isEmpty) {
      AppLogger.apiError('Empty response body from server');
      throw Exception('Server returned empty response');
    }

    try {
      final dynamic response = _api.decodeResponseBody(res);
      AppLogger.api('📦 Decoded JSON: $response');

      final Map<String, dynamic> data;
      if (response is List) {
        if (response.isEmpty) {
          AppLogger.apiError('Empty array response');
          throw Exception('Server returned empty array');
        }
        if (response[0] is! Map<String, dynamic>) {
          AppLogger.apiError('First item in array is not a map');
          throw Exception('Invalid response format');
        }
        data = response[0] as Map<String, dynamic>;
      } else {
        if (response['success'] == false) {
          final error = response['error'] ?? 'Unknown error';
          AppLogger.apiError('Server returned error: $error');
          throw Exception('Server error: $error');
        }
        if (response['data'] is Map<String, dynamic>) {
          data = response['data'] as Map<String, dynamic>;
        } else {
          data = response;
        }
      }

      if (!data.containsKey('assignment_id') && !data.containsKey('id')) {
        AppLogger.apiError('Response missing assignment ID');
        throw Exception('Response missing assignment data');
      }

      final assignment = Assignment.fromJson(data);
      if (assignment.assignmentId.isEmpty ||
          assignment.caregiverId.isEmpty ||
          assignment.customerId.isEmpty) {
        AppLogger.apiError(
          'Created assignment is invalid: ID="${assignment.assignmentId}" caregiver="${assignment.caregiverId}" customer="${assignment.customerId}"',
        );
        throw Exception('Created assignment is invalid');
      }

      AppLogger.api(
        'Assignment created successfully: id=${assignment.assignmentId} assignedAt=${assignment.assignedAt} active=${assignment.isActive}',
      );
      return assignment;
    } catch (e) {
      AppLogger.apiError('Error creating assignment: $e');
      throw Exception('Failed to process server response: $e');
    }
  }

  /// Xóa assignment theo ID (DELETE /assignments/:id)
  /// Xóa hoàn toàn một assignment khỏi hệ thống
  ///
  /// Parameters:
  /// - assignmentId: ID của assignment cần xóa
  ///
  /// Returns:
  /// - null nếu xóa thành công (204 No Content)
  /// - Assignment object nếu server trả về dữ liệu
  ///
  /// Throws: Exception nếu xóa thất bại
  Future<Assignment?> deleteById(String assignmentId) async {
    AppLogger.api('Deleting assignment: $assignmentId');
    final res = await _api.delete('/caregiver-invitations/$assignmentId');
    AppLogger.api(
      'Delete response: status=${res.statusCode} body=${res.body} headers=${res.headers}',
    );

    if (res.statusCode == 204 || res.body.isEmpty) {
      print('✅ Assignment deleted successfully (no content)');
      return null;
    }

    if (res.statusCode < 200 || res.statusCode >= 300) {
      if (res.statusCode == 500) {
        AppLogger.apiError(
          'Server error on delete. Attempting to parse error details...',
        );
        try {
          final Map<String, dynamic> response = _api.decodeResponseBody(res);
          final errorMsg =
              response['message'] ??
              response['error'] ??
              'Unknown server error';
          throw Exception('Server error: $errorMsg');
        } catch (e) {
          AppLogger.apiError('Could not parse error details: $e');
        }
      }
      throw Exception(
        'Delete assignment failed: ${res.statusCode} ${res.body}',
      );
    }

    final Map<String, dynamic> map = _api.extractDataFromResponse(res);
    return Assignment.fromJson(map);
  }

  Future<int> deleteByPair({
    required String caregiverId,
    required String customerId,
  }) async {
    final res = await _api.delete(
      '/assignments',
      query: {'caregiver_id': caregiverId, 'customer_id': customerId},
    );

    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw Exception('Delete pair failed: ${res.statusCode} ${res.body}');
    }

    if (res.body.isEmpty) return 0;

    final Map<String, dynamic> response = _api.decodeResponseBody(res);

    if (response is num) return (response as num).toInt();

    if (response.containsKey('data')) {
      final data = response['data'];
      if (data is num) return data.toInt();
    }

    int? pickNum(dynamic v) => (v is num) ? v.toInt() : null;

    for (final k in ['updated', 'deleted', 'count', 'affected', 'changes']) {
      final n = pickNum(response[k]);
      if (n != null) return n;
    }

    final data = response['data'];
    if (data is List) return data.length;
    if (data is Map) {
      for (final k in ['updated', 'deleted', 'count', 'affected', 'changes']) {
        final n = pickNum(data[k]);
        if (n != null) return n;
      }
    }

    return 1;
  }

  /// Lấy danh sách assignments theo customer ID (GET /assignments/by-customer/:id)
  /// Lấy tất cả assignments của một customer
  ///
  /// Parameters:
  /// - customerId: ID của customer
  /// - activeOnly: Chỉ lấy assignments đang active (default: true)
  ///
  /// Returns: List&lt;Assignment&gt; - danh sách assignments
  ///
  /// Throws: Exception nếu fetch thất bại
  Future<List<Assignment>> listByCustomer({
    required String customerId,
    bool activeOnly = true,
  }) async {
    final res = await _api.get(
      '/customers/$customerId/invitations',
      query: {'active_only': activeOnly.toString()},
    );

    AppLogger.api(
      'AssignmentsRemoteDataSource.listByCustomer: status=${res.statusCode}',
    );
    AppLogger.api(
      'AssignmentsRemoteDataSource.listByCustomer: body=${res.body}',
    );

    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw Exception(
        'Fetch assignments by customer failed: ${res.statusCode} ${res.body}',
      );
    }

    dynamic decoded;
    try {
      decoded = _api.decodeResponseBody(res);
    } catch (e) {
      AppLogger.apiError('Failed to decode response body: $e');
      throw Exception('Invalid JSON response for assignments list: $e');
    }

    AppLogger.api(
      'AssignmentsRemoteDataSource.listByCustomer: decoded=$decoded',
    );

    final List list;
    if (decoded is List) {
      list = decoded;
    } else if (decoded is Map &&
        decoded.containsKey('data') &&
        decoded['data'] is List) {
      list = (decoded['data'] as List);
    } else {
      final dynamic extracted = _api.extractDataFromResponse(res);
      if (extracted is List) {
        list = extracted;
      } else {
        print(
          '❌ AssignmentsRemoteDataSource.listByCustomer: Unexpected response format: $decoded',
        );
        throw Exception('Unexpected response format for assignments list');
      }
    }

    final assignments = list
        .cast<Map>()
        .map((e) => Assignment.fromJson(e.cast<String, dynamic>()))
        .toList();

    AppLogger.api(
      'AssignmentsRemoteDataSource.listByCustomer: parsed=${assignments.length}',
    );
    return assignments;
  }

  /// Lấy danh sách assignments dựa trên role của user hiện tại
  /// - Nếu role = 'caregiver': lấy customers được gán cho caregiver
  /// - Nếu role = 'customer': lấy caregivers được gán cho customer
  Future<List<Assignment>> listPending({bool? isActive, String? status}) async {
    final Map<String, String> query = {};
    if (isActive != null) query['active_only'] = isActive.toString();
    if (status != null) query['status'] = status;

    final res = await _api.get(
      '/caregiver-invitations/customer/me',
      query: query,
    );
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw Exception('Fetch pending failed: ${res.statusCode} ${res.body}');
    }

    final decoded = json.decode(res.body);
    final List data;
    if (decoded is List) {
      data = decoded;
    } else if (decoded is Map && decoded['data'] is List) {
      data = decoded['data'] as List;
    } else {
      throw Exception('Unexpected response format for pending assignments');
    }

    final assignments = data
        .cast<Map>()
        .map((e) => Assignment.fromJson(e.cast<String, dynamic>()))
        .toList();

    assignments.sort((a, b) {
      final dateA = DateTime.tryParse(a.assignedAt) ?? DateTime(0);
      final dateB = DateTime.tryParse(b.assignedAt) ?? DateTime(0);
      return dateB.compareTo(dateA);
    });
    // print("assignments: $assignments");

    return assignments;
  }

  Future<List<Assignment>> listInvitations({
    String? status, // optional: 'pending' | 'accepted' | 'rejected'
  }) async {
    final Map<String, String> query = {};
    if (status != null && status.isNotEmpty) {
      query['status'] = status;
    }

    final res = await _api.get(
      '/caregiver-invitations/customer/me',
      query: query,
    );
    AppLogger.api('listInvitations raw body: ${res.body}');

    AppLogger.api(
      'listInvitations(): GET /caregiver-invitations/customer/me?status=${query['status'] ?? ''} → ${res.statusCode}',
    );

    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw Exception(
        'Fetch invitations failed: ${res.statusCode} ${res.body}',
      );
    }

    final decoded = json.decode(res.body);

    final List data;
    if (decoded is Map && decoded['data'] is List) {
      data = decoded['data'] as List;
    } else if (decoded is List) {
      data = decoded;
    } else {
      throw Exception(
        'Unexpected response format from /caregiver-invitations/customer/me',
      );
    }

    final assignments = data
        .cast<Map>()
        .map((e) => Assignment.fromJson(e.cast<String, dynamic>()))
        .toList();

    assignments.sort((a, b) {
      final dateA = DateTime.tryParse(a.assignedAt) ?? DateTime(0);
      final dateB = DateTime.tryParse(b.assignedAt) ?? DateTime(0);
      return dateB.compareTo(dateA);
    });
    AppLogger.api('listInvitations parsed=${assignments.length}');
    return assignments;
  }

  Future<Assignment> accept(String assignmentId) async {
    final res = await _api.post('/caregiver-invitations/$assignmentId/accept');

    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw Exception(
        'Accept assignment failed: ${res.statusCode} ${res.body}',
      );
    }

    final decoded = json.decode(res.body);
    final data = (decoded is Map && decoded['data'] is Map)
        ? (decoded['data'] as Map).cast<String, dynamic>()
        : decoded as Map<String, dynamic>;

    return Assignment.fromJson(data);
  }

  Future<Assignment> reject(String assignmentId) async {
    final res = await _api.post('/caregiver-invitations/$assignmentId/reject');

    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw Exception(
        'Reject assignment failed: ${res.statusCode} ${res.body}',
      );
    }

    final decoded = json.decode(res.body);
    final data = (decoded is Map && decoded['data'] is Map)
        ? (decoded['data'] as Map).cast<String, dynamic>()
        : decoded as Map<String, dynamic>;

    return Assignment.fromJson(data);
  }
}
