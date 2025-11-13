import 'package:detect_care_app/core/network/api_client.dart';
import 'package:detect_care_app/core/utils/phone_utils.dart';
import 'package:flutter/cupertino.dart';

// API cho các thao tác với caregiver
class CaregiverApi {
  final ApiClient _api;
  CaregiverApi(this._api);

  /// Tạo mới caregiver (POST /caregivers)
  /// Trả về thông tin caregiver vừa tạo
  Future<Map<String, dynamic>> createCaregiver({
    required String username,
    required String fullName,
    required String email,
    required String phone,
    required String pin,
  }) async {
    // convert phone number to 84
    // Chuyển đổi số điện thoại sang định dạng bắt đầu bằng '84'
    phone = PhoneUtils.formatVietnamesePhone(phone);

    final res = await _api.post(
      '/caregivers',
      body: {
        'username': username,
        'full_name': fullName,
        'email': email,
        'phone_number': phone,
        'pin': pin,
      },
    );
    // Nếu status code khác 201 thì báo lỗi
    if (res.statusCode != 201) {
      throw Exception(
        'Đăng ký caregiver thất bại: ${res.statusCode} ${res.body}',
      );
    }

    debugPrint('Đăng ký caregiver thành công: ${res.statusCode} ${res.body}');

    // Parse response with new format
    final Map<String, dynamic> response = _api.decodeResponseBody(res);
    debugPrint(
      '📦 CaregiverApi: Create response keys: ${response.keys.toList()}',
    );

    // Check for new error format
    if (response['success'] == false) {
      final error = response['error'];
      if (error is Map) {
        final code = error['code']?.toString() ?? 'UNKNOWN_ERROR';
        final message =
            error['message']?.toString() ?? 'Create caregiver failed';
        debugPrint(
          '❌ CaregiverApi: Create failed with error: $code - $message',
        );
        throw Exception('Đăng ký caregiver thất bại: $code - $message');
      } else {
        debugPrint('❌ CaregiverApi: Create failed with unknown error format');
        throw Exception(
          'Đăng ký caregiver thất bại: ${response['error'] ?? 'Unknown error'}',
        );
      }
    }

    // Extract data from response using helper
    final Map<String, dynamic> data = _api.extractDataFromResponse(res);
    debugPrint('📦 CaregiverApi: Create data extracted from response');

    return data;
  }

  /// Lấy thông tin caregiver theo id (GET /caregivers/:id)
  Future<Map<String, dynamic>> getCaregiver(String id) async {
    final res = await _api.get('/caregivers/$id');
    if (res.statusCode != 200) {
      throw Exception('Lấy caregiver thất bại: ${res.statusCode} ${res.body}');
    }

    // Parse response with new format
    final Map<String, dynamic> response = _api.decodeResponseBody(res);
    debugPrint('📦 CaregiverApi: Get response keys: ${response.keys.toList()}');

    // Check for new error format
    if (response['success'] == false) {
      final error = response['error'];
      if (error is Map) {
        final code = error['code']?.toString() ?? 'UNKNOWN_ERROR';
        final message = error['message']?.toString() ?? 'Get caregiver failed';
        debugPrint('❌ CaregiverApi: Get failed with error: $code - $message');
        throw Exception('Lấy caregiver thất bại: $code - $message');
      } else {
        debugPrint('❌ CaregiverApi: Get failed with unknown error format');
        throw Exception(
          'Lấy caregiver thất bại: ${response['error'] ?? 'Unknown error'}',
        );
      }
    }

    // Extract data from response using helper
    final Map<String, dynamic> data = _api.extractDataFromResponse(res);
    debugPrint('📦 CaregiverApi: Get data extracted from response');

    return data;
  }

  /// Lấy danh sách caregivers có phân trang (GET /caregivers)
  Future<List<Map<String, dynamic>>> getCaregivers({
    int page = 1,
    int limit = 20,
  }) async {
    final res = await _api.get(
      '/caregivers',
      query: {'page': page, 'limit': limit},
    );
    if (res.statusCode != 200) {
      throw Exception(
        'Lấy danh sách caregivers thất bại: ${res.statusCode} ${res.body}',
      );
    }

    // Parse response with new format
    final Map<String, dynamic> response = _api.decodeResponseBody(res);
    debugPrint(
      '📦 CaregiverApi: Get list response keys: ${response.keys.toList()}',
    );

    // Check for new error format
    if (response['success'] == false) {
      final error = response['error'];
      if (error is Map) {
        final code = error['code']?.toString() ?? 'UNKNOWN_ERROR';
        final message = error['message']?.toString() ?? 'Get caregivers failed';
        debugPrint(
          '❌ CaregiverApi: Get list failed with error: $code - $message',
        );
        throw Exception('Lấy danh sách caregivers thất bại: $code - $message');
      } else {
        debugPrint('❌ CaregiverApi: Get list failed with unknown error format');
        throw Exception(
          'Lấy danh sách caregivers thất bại: ${response['error'] ?? 'Unknown error'}',
        );
      }
    }

    // Extract data from response - could be in 'data' key or directly in response
    final dynamic data;
    if (response.containsKey('data')) {
      data = response['data'];
      debugPrint('📦 CaregiverApi: List data extracted from response.data');
    } else {
      data = response;
      debugPrint('📦 CaregiverApi: List data extracted directly from response');
    }

    // Trả về danh sách caregivers (có thể là List hoặc Map chứa items)
    if (data is List) {
      return List<Map<String, dynamic>>.from(data);
    } else if (data is Map && data['items'] is List) {
      return List<Map<String, dynamic>>.from(data['items']);
    }
    throw Exception('Dữ liệu trả về không hợp lệ');
  }

  /// Cập nhật thông tin caregiver (PUT /caregivers/:id)
  Future<Map<String, dynamic>> updateCaregiver(
    String id,
    Map<String, dynamic> body,
  ) async {
    final res = await _api.put('/caregivers/$id', body: body);
    if (res.statusCode != 200) {
      throw Exception(
        'Cập nhật caregiver thất bại: ${res.statusCode} ${res.body}',
      );
    }

    // Parse response with new format
    final Map<String, dynamic> response = _api.decodeResponseBody(res);
    debugPrint(
      '📦 CaregiverApi: Update response keys: ${response.keys.toList()}',
    );

    // Check for new error format
    if (response['success'] == false) {
      final error = response['error'];
      if (error is Map) {
        final code = error['code']?.toString() ?? 'UNKNOWN_ERROR';
        final message =
            error['message']?.toString() ?? 'Update caregiver failed';
        debugPrint(
          '❌ CaregiverApi: Update failed with error: $code - $message',
        );
        throw Exception('Cập nhật caregiver thất bại: $code - $message');
      } else {
        debugPrint('❌ CaregiverApi: Update failed with unknown error format');
        throw Exception(
          'Cập nhật caregiver thất bại: ${response['error'] ?? 'Unknown error'}',
        );
      }
    }

    // Extract data from response using helper
    final Map<String, dynamic> data = _api.extractDataFromResponse(res);
    debugPrint('📦 CaregiverApi: Update data extracted from response');

    return data;
  }

  /// Đổi trạng thái caregiver (PATCH /caregivers/:id/status)
  /// status: 'approved' | 'rejected'
  Future<Map<String, dynamic>> patchCaregiverStatus(
    String id,
    String status,
  ) async {
    final res = await _api.patch(
      '/caregivers/$id/status',
      body: {'status': status},
    );
    if (res.statusCode != 200) {
      throw Exception(
        'Cập nhật trạng thái caregiver thất bại: ${res.statusCode} ${res.body}',
      );
    }

    // Parse response with new format
    final Map<String, dynamic> response = _api.decodeResponseBody(res);
    debugPrint(
      '📦 CaregiverApi: Patch status response keys: ${response.keys.toList()}',
    );

    // Check for new error format
    if (response['success'] == false) {
      final error = response['error'];
      if (error is Map) {
        final code = error['code']?.toString() ?? 'UNKNOWN_ERROR';
        final message =
            error['message']?.toString() ?? 'Patch caregiver status failed';
        debugPrint(
          '❌ CaregiverApi: Patch status failed with error: $code - $message',
        );
        throw Exception(
          'Cập nhật trạng thái caregiver thất bại: $code - $message',
        );
      } else {
        debugPrint(
          '❌ CaregiverApi: Patch status failed with unknown error format',
        );
        throw Exception(
          'Cập nhật trạng thái caregiver thất bại: ${response['error'] ?? 'Unknown error'}',
        );
      }
    }

    // Extract data from response using helper
    final Map<String, dynamic> data = _api.extractDataFromResponse(res);
    debugPrint('📦 CaregiverApi: Patch status data extracted from response');

    return data;
  }

  /// Xóa caregiver (DELETE /caregivers/:id hoặc /caregivers/:id/soft)
  /// Nếu soft=true thì xóa mềm
  Future<bool> deleteCaregiver(String id, {bool soft = false}) async {
    final path = soft ? '/caregivers/$id/soft' : '/caregivers/$id';
    final res = await _api.delete(path);
    if (res.statusCode != 200) {
      throw Exception('Xóa caregiver thất bại: ${res.statusCode} ${res.body}');
    }

    // Parse response with new format
    final Map<String, dynamic> response = _api.decodeResponseBody(res);
    debugPrint(
      '📦 CaregiverApi: Delete response keys: ${response.keys.toList()}',
    );

    // Check for new error format
    if (response['success'] == false) {
      final error = response['error'];
      if (error is Map) {
        final code = error['code']?.toString() ?? 'UNKNOWN_ERROR';
        final message =
            error['message']?.toString() ?? 'Delete caregiver failed';
        debugPrint(
          '❌ CaregiverApi: Delete failed with error: $code - $message',
        );
        throw Exception('Xóa caregiver thất bại: $code - $message');
      } else {
        debugPrint('❌ CaregiverApi: Delete failed with unknown error format');
        throw Exception(
          'Xóa caregiver thất bại: ${response['error'] ?? 'Unknown error'}',
        );
      }
    }

    // Extract data from response - could be in 'data' key or directly in response
    final dynamic data = _api.extractDataFromResponse(res);
    debugPrint('📦 CaregiverApi: Delete data extracted from response');

    return data is Map && data['deleted'] == true;
  }

  /// Tìm kiếm caregivers theo từ khóa (GET /caregivers/search)
  Future<List<Map<String, dynamic>>> searchCaregivers({
    required String keyword,
    int page = 1,
    int limit = 20,
    String order = 'desc',
  }) async {
    final res = await _api.get(
      '/caregivers/search',
      query: {'keyword': keyword, 'page': page, 'limit': limit, 'order': order},
    );
    if (res.statusCode != 200) {
      throw Exception(
        'Tìm kiếm caregivers thất bại: ${res.statusCode} ${res.body}',
      );
    }

    // Parse response with new format
    final Map<String, dynamic> response = _api.decodeResponseBody(res);
    debugPrint(
      '📦 CaregiverApi: Search response keys: ${response.keys.toList()}',
    );

    // Check for new error format
    if (response['success'] == false) {
      final error = response['error'];
      if (error is Map) {
        final code = error['code']?.toString() ?? 'UNKNOWN_ERROR';
        final message =
            error['message']?.toString() ?? 'Search caregivers failed';
        debugPrint(
          '❌ CaregiverApi: Search failed with error: $code - $message',
        );
        throw Exception('Tìm kiếm caregivers thất bại: $code - $message');
      } else {
        debugPrint('❌ CaregiverApi: Search failed with unknown error format');
        throw Exception(
          'Tìm kiếm caregivers thất bại: ${response['error'] ?? 'Unknown error'}',
        );
      }
    }

    // Extract data from response - could be in 'data' key or directly in response
    final dynamic data;
    if (response.containsKey('data')) {
      data = response['data'];
      debugPrint('📦 CaregiverApi: Search data extracted from response.data');
    } else {
      data = response;
      debugPrint(
        '📦 CaregiverApi: Search data extracted directly from response',
      );
    }

    if (data is List) {
      return List<Map<String, dynamic>>.from(data);
    } else if (data is Map && data['items'] is List) {
      return List<Map<String, dynamic>>.from(data['items']);
    }
    throw Exception('Dữ liệu trả về không hợp lệ');
  }
}
