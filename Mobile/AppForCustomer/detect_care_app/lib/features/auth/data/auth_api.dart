import 'package:flutter/foundation.dart';
import 'package:detect_care_app/core/network/api_client.dart';
import 'package:detect_care_app/features/auth/models/otp_request_result.dart';

class AuthApi {
  final ApiClient _api;
  AuthApi(this._api);

  Future<OtpRequestResult> requestOtp(
    String phone, {
    String method = 'sms',
  }) async {
    debugPrint('🔄 AuthApi: Yêu cầu OTP cho số $phone qua $method');
    try {
      final endpoint = '/auth/request-otp';
      debugPrint('📡 AuthApi: API Endpoint: $endpoint');
      debugPrint(
        '📤 AuthApi: Request Body: {"phone_number": "$phone", "method": "$method"}',
      );

      final res = await _api.post(
        endpoint,
        body: {'phone_number': phone, 'method': method},
      );

      Map<String, dynamic> response = const {};
      try {
        final decoded = _api.decodeResponseBody(res);
        if (decoded is Map<String, dynamic>) response = decoded;
      } catch (_) {
        // ignore decode errors, will handle status below
      }

      if (res.statusCode != 200) {
        final msg = response['message']?.toString() ?? 'OTP request failed';
        debugPrint('❌ AuthApi: Yêu cầu OTP thất bại: ${res.statusCode} $msg');
        throw Exception('Yêu cầu OTP thất bại: ${res.statusCode} $msg');
      }

      debugPrint('✅ AuthApi: OTP yêu cầu thành công cho $phone');
      debugPrint('📦 AuthApi: Response keys: ${response.keys.toList()}');

      // Check for new error format
      if (response['success'] == false) {
        final error = response['error'];
        if (error is Map) {
          final code = error['code']?.toString() ?? 'UNKNOWN_ERROR';
          final message = error['message']?.toString() ?? 'OTP request failed';
          debugPrint(
            '❌ AuthApi: OTP request failed with error: $code - $message',
          );
          throw Exception('Yêu cầu OTP thất bại: $code - $message');
        } else {
          debugPrint('❌ AuthApi: OTP request failed with unknown error format');
          throw Exception(
            'Yêu cầu OTP thất bại: ${response['error'] ?? 'Unknown error'}',
          );
        }
      }

      // Extract data from response - could be in 'data' key or directly in response
      final Map<String, dynamic> data;
      if (response.containsKey('data') && response['data'] is Map) {
        data = (response['data'] as Map).cast<String, dynamic>();
        debugPrint('📦 AuthApi: OTP data extracted from response.data');
      } else {
        data = response;
        debugPrint('📦 AuthApi: OTP data extracted directly from response');
      }

      debugPrint('📦 AuthApi: Final OTP data keys: ${data.keys.toList()}');
      debugPrint('📦 AuthApi: call_id value: ${data['call_id']}');

      return OtpRequestResult.fromJson(data);
    } catch (e) {
      debugPrint('❌ AuthApi: Lỗi yêu cầu OTP: $e');
      rethrow;
    }
  }

  Future<Map<String, dynamic>> loginWithOtp(String phone, String code) async {
    debugPrint('🔄 AuthApi: Đăng nhập với OTP cho số $phone');
    try {
      final endpoint = '/auth/login';
      debugPrint('📡 AuthApi: API Endpoint: $endpoint');
      debugPrint(
        '📤 AuthApi: Request Body: {"phone_number": "$phone", "otp_code": "***"}',
      );

      final res = await _api.post(
        endpoint,
        body: {'phone_number': phone, 'otp_code': code},
      );

      if (res.statusCode != 200) {
        debugPrint(
          '❌ AuthApi: Đăng nhập thất bại: ${res.statusCode} ${res.body}',
        );
        throw Exception('Đăng nhập thất bại: ${res.statusCode} ${res.body}');
      }

      debugPrint('✅ AuthApi: Đăng nhập thành công với OTP cho $phone');

      // Parse response with new format
      final decoded = _api.decodeResponseBody(res);
      if (decoded is! Map<String, dynamic>) {
        debugPrint('📦 AuthApi: Login response not a map: ${res.body}');
        throw Exception('Unexpected login response');
      }
      final Map<String, dynamic> response = decoded;
      debugPrint('📦 AuthApi: Login response keys: ${response.keys.toList()}');

      // Check for new error format
      if (response['success'] == false) {
        final error = response['error'];
        if (error is Map) {
          final code = error['code']?.toString() ?? 'UNKNOWN_ERROR';
          final message = error['message']?.toString() ?? 'Login failed';
          debugPrint('❌ AuthApi: Login failed with error: $code - $message');
          throw Exception('Đăng nhập thất bại: $code - $message');
        } else {
          debugPrint('❌ AuthApi: Login failed with unknown error format');
          throw Exception(
            'Đăng nhập thất bại: ${response['error'] ?? 'Unknown error'}',
          );
        }
      }

      // Extract data from response - could be in 'data' key or directly in response
      final Map<String, dynamic> data;
      if (response.containsKey('data') && response['data'] is Map) {
        data = (response['data'] as Map).cast<String, dynamic>();
        debugPrint('📦 AuthApi: Data extracted from response.data');
      } else {
        data = response;
        debugPrint('📦 AuthApi: Data extracted directly from response');
      }

      debugPrint('📦 AuthApi: Final data keys: ${data.keys.toList()}');
      return data;
    } catch (e) {
      debugPrint('❌ AuthApi: Lỗi đăng nhập với OTP: $e');
      rethrow;
    }
  }

  Future<Map<String, dynamic>> me() async {
    debugPrint('🔄 AuthApi: Lấy thông tin hồ sơ user');
    try {
      final endpoint = '/auth/me';
      debugPrint('📡 AuthApi: API Endpoint: $endpoint');

      final res = await _api.get(endpoint);
      if (res.statusCode != 200) {
        debugPrint(
          '❌ AuthApi: Lấy thông tin hồ sơ thất bại: ${res.statusCode} ${res.body}',
        );
        throw Exception(
          'Lấy thông tin hồ sơ thất bại: ${res.statusCode} ${res.body}',
        );
      }

      debugPrint('✅ AuthApi: Lấy thông tin hồ sơ thành công');

      // Parse response with new format
      final decoded = _api.decodeResponseBody(res);
      if (decoded is! Map<String, dynamic>) {
        debugPrint('📦 AuthApi: Me response not a map: ${res.body}');
        throw Exception('Unexpected me response');
      }
      final Map<String, dynamic> response = decoded;
      debugPrint('📦 AuthApi: Me response keys: ${response.keys.toList()}');

      // Check for new error format
      if (response['success'] == false) {
        final error = response['error'];
        if (error is Map) {
          final code = error['code']?.toString() ?? 'UNKNOWN_ERROR';
          final message = error['message']?.toString() ?? 'Get profile failed';
          debugPrint(
            '❌ AuthApi: Get profile failed with error: $code - $message',
          );
          throw Exception('Lấy thông tin hồ sơ thất bại: $code - $message');
        } else {
          debugPrint('❌ AuthApi: Get profile failed with unknown error format');
          throw Exception(
            'Lấy thông tin hồ sơ thất bại: ${response['error'] ?? 'Unknown error'}',
          );
        }
      }

      // Extract data from response - could be in 'data' key or directly in response
      final Map<String, dynamic> data;
      if (response.containsKey('data') && response['data'] is Map) {
        data = (response['data'] as Map).cast<String, dynamic>();
        debugPrint('📦 AuthApi: Me data extracted from response.data');
      } else {
        data = response;
        debugPrint('📦 AuthApi: Me data extracted directly from response');
      }

      debugPrint('📦 AuthApi: Me final data keys: ${data.keys.toList()}');
      return data;
    } catch (e) {
      debugPrint('❌ AuthApi: Lỗi lấy thông tin hồ sơ: $e');
      rethrow;
    }
  }

  Future<void> logout() async {
    debugPrint('🔄 AuthApi: Đăng xuất user');
    try {
      final endpoint = '/auth/logout';
      debugPrint('📡 AuthApi: API Endpoint: $endpoint');

      await _api.post(endpoint);
      debugPrint('✅ AuthApi: Đăng xuất thành công');
    } catch (e) {
      debugPrint('⚠️ AuthApi: Lỗi đăng xuất (có thể bỏ qua): $e');
      // Không throw exception vì logout thường không quan trọng
    }
  }
}
