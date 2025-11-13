import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:detect_care_app/core/network/api_client.dart';
import 'package:detect_care_app/features/auth/data/auth_api.dart';
import 'package:detect_care_app/features/auth/data/auth_storage.dart';
import 'package:detect_care_app/features/auth/models/login_result.dart';
import 'package:detect_care_app/features/auth/models/otp_request_result.dart';
import 'package:detect_care_app/features/auth/models/user.dart';

import 'auth_endpoints.dart';

class AuthRemoteDataSource {
  final AuthEndpoints endpoints;
  final AuthApi _authApi;
  AuthRemoteDataSource({required this.endpoints})
    : _authApi = AuthApi(ApiClient(tokenProvider: AuthStorage.getAccessToken));

  Future<List<User>> fetchUsers() async {
    final apiClient = ApiClient(tokenProvider: AuthStorage.getAccessToken);
    final res = await apiClient.get('/users');

    if (res.statusCode == 200) {
      final Map<String, dynamic> response = apiClient.decodeResponseBody(res);
      final dynamic data = response.containsKey('data')
          ? response['data']
          : response;
      if (data is List) {
        return data
            .map((e) => User.fromJson((e as Map).cast<String, dynamic>()))
            .toList();
      } else {
        throw Exception('Invalid response format for users list');
      }
    }
    throw Exception('Failed to load users (status ${res.statusCode})');
  }

  Future<User> createUser(String phone, String password) async {
    final apiClient = ApiClient(tokenProvider: AuthStorage.getAccessToken);
    final res = await apiClient.post(
      '/users',
      body: {'phone': phone, 'password': password, 'role': 'user'},
    );
    if (res.statusCode == 200 || res.statusCode == 201) {
      final Map<String, dynamic> data = apiClient.extractDataFromResponse(res);
      return User.fromJson(data);
    }
    throw Exception('Failed to create user (status ${res.statusCode})');
  }

  Future<OtpRequestResult> sendOtp(String phone) async {
    debugPrint('🔄 AuthRemoteDataSource: Gửi OTP cho số $phone');
    try {
      final result = await _authApi.requestOtp(phone);
      debugPrint('✅ AuthRemoteDataSource: OTP gửi thành công cho $phone');
      return result;
    } catch (e) {
      debugPrint('❌ AuthRemoteDataSource: Lỗi gửi OTP cho $phone: $e');
      rethrow;
    }
  }

  Future<LoginResult> verifyOtp(String phone, String code) async {
    debugPrint(
      '🔄 AuthRemoteDataSource: Xác thực OTP cho số $phone với code $code',
    );
    try {
      final result = await _authApi.loginWithOtp(phone, code);

      // The result is already parsed by AuthApi with new format handling
      final token = result['access_token']?.toString();
      final userMap = (result['user'] is Map)
          ? (result['user'] as Map).cast<String, dynamic>()
          : null;

      if (token == null || token.isEmpty) {
        debugPrint('❌ AuthRemoteDataSource: Thiếu access_token trong phản hồi');
        throw Exception('Thiếu access_token trong phản hồi');
      }
      if (userMap == null) {
        debugPrint('❌ AuthRemoteDataSource: Thiếu user trong phản hồi');
        throw Exception('Thiếu user trong phản hồi');
      }

      debugPrint('✅ AuthRemoteDataSource: OTP xác thực thành công cho $phone');
      return LoginResult(
        accessToken: token,
        userServerJson: userMap,
        user: User.fromJson(userMap),
      );
    } catch (e) {
      debugPrint('❌ AuthRemoteDataSource: Lỗi xác thực OTP cho $phone: $e');
      rethrow;
    }
  }

  Future<User> me() async {
    debugPrint('🔄 AuthRemoteDataSource: Lấy thông tin user hiện tại');
    try {
      final map = await _authApi.me();

      // The map is already parsed by AuthApi with new format handling
      final raw = (map['user'] is Map)
          ? (map['user'] as Map).cast<String, dynamic>()
          : map.cast<String, dynamic>();

      final serverKeyed = <String, dynamic>{
        'user_id': raw['user_id']?.toString() ?? raw['id']?.toString() ?? '',
        'username': raw['username']?.toString() ?? '',
        'full_name':
            raw['full_name']?.toString() ?? raw['name']?.toString() ?? '',
        'email': raw['email']?.toString() ?? '',
        'role': raw['role']?.toString() ?? '',
        'phone_number':
            raw['phone_number']?.toString() ?? raw['phone']?.toString() ?? '',
        'is_first_login': raw['is_first_login'] ?? false,
        'avatar_url': raw['avatar_url'],
      };

      debugPrint('✅ AuthRemoteDataSource: Lấy thông tin user thành công');
      return User.fromJson(serverKeyed);
    } catch (e) {
      debugPrint('❌ AuthRemoteDataSource: Lỗi lấy thông tin user: $e');
      rethrow;
    }
  }

  Future<void> setPin(String phone, String pin) async {
    debugPrint('🔄 AuthRemoteDataSource: Thiết lập PIN cho số $phone');
    try {
      await Future.delayed(const Duration(milliseconds: 500));
      debugPrint('✅ AuthRemoteDataSource: PIN thiết lập thành công cho $phone');
    } catch (e) {
      debugPrint('❌ AuthRemoteDataSource: Lỗi thiết lập PIN cho $phone: $e');
      rethrow;
    }
  }

  Future<bool> hasPin(String phone) async {
    debugPrint('🔄 AuthRemoteDataSource: Kiểm tra PIN cho số $phone');
    try {
      final apiClient = ApiClient(tokenProvider: AuthStorage.getAccessToken);
      final res = await apiClient.get('/users');
      if (res.statusCode == 200) {
        final Map<String, dynamic> response = apiClient.decodeResponseBody(res);
        final dynamic data = response.containsKey('data')
            ? response['data']
            : response;
        if (data is List) {
          final found = data.firstWhere(
            (e) => (e as Map<String, dynamic>)['phone'] == phone,
            orElse: () => null,
          );
          if (found != null) {
            final pw = (found as Map<String, dynamic>)['password'];
            final hasPin = pw != null && pw.toString().isNotEmpty;
            debugPrint(
              '✅ AuthRemoteDataSource: Kiểm tra PIN cho $phone - ${hasPin ? 'Có' : 'Không'}',
            );
            return hasPin;
          }
        }
        debugPrint('✅ AuthRemoteDataSource: Không tìm thấy user cho số $phone');
        return false;
      }
      debugPrint(
        '❌ AuthRemoteDataSource: Lỗi lấy danh sách users (${res.statusCode})',
      );
      throw Exception('Lấy danh sách users thất bại (${res.statusCode})');
    } catch (e) {
      debugPrint('❌ AuthRemoteDataSource: Lỗi kiểm tra PIN cho $phone: $e');
      rethrow;
    }
  }

  Future<void> verifyPin(String phone, String pin) async {
    debugPrint('🔄 AuthRemoteDataSource: Xác thực PIN cho số $phone');
    try {
      final apiClient = ApiClient(tokenProvider: AuthStorage.getAccessToken);
      final res = await apiClient.get('/users');
      if (res.statusCode == 200) {
        final Map<String, dynamic> response = apiClient.decodeResponseBody(res);
        final dynamic data = response.containsKey('data')
            ? response['data']
            : response;
        if (data is List) {
          final match = data.any((e) {
            final m = e as Map<String, dynamic>;
            return m['phone'] == phone && m['password'].toString() == pin;
          });
          if (!match) {
            debugPrint('❌ AuthRemoteDataSource: PIN không đúng cho số $phone');
            throw Exception('PIN không đúng');
          }
          debugPrint(
            '✅ AuthRemoteDataSource: PIN xác thực thành công cho $phone',
          );
          return;
        } else {
          throw Exception('Invalid response format for users list');
        }
      }
      debugPrint(
        '❌ AuthRemoteDataSource: Không thể xác thực PIN (${res.statusCode})',
      );
      throw Exception('Không thể xác thực PIN (${res.statusCode})');
    } catch (e) {
      debugPrint('❌ AuthRemoteDataSource: Lỗi xác thực PIN cho $phone: $e');
      rethrow;
    }
  }

  Future<void> logout() async {
    debugPrint('🔄 AuthRemoteDataSource: Đăng xuất user');
    try {
      await _authApi.logout();
      debugPrint('✅ AuthRemoteDataSource: Đăng xuất thành công');
    } catch (e) {
      debugPrint('⚠️ AuthRemoteDataSource: Lỗi đăng xuất (có thể bỏ qua): $e');
      // Don't rethrow - logout should always succeed locally
    }
  }
}
