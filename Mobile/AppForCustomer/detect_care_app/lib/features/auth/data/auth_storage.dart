import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

// Simple in-memory cache to avoid hitting SharedPreferences repeatedly during
// app startup. This reduces sync/blocking costs when multiple components
// read auth values in quick succession.
class _AuthCache {
  static String? userId;
  static String? accessToken;
  static Map<String, dynamic>? userJson;
}

class AuthStorage {
  static const kUserPhone = 'user_phone';
  static const kUserPin = 'user_pin';
  static const kUserId = 'user_id';
  static const kAccessToken = 'access_token';
  static const kUserJson = 'user_json';

  static Future<void> saveCredentials({
    required String phone,
    required String pin,
    required String userId,
    String? accessToken,
  }) async {
    debugPrint('🔄 AuthStorage: Lưu thông tin đăng nhập cho user $userId');
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(kUserPhone, phone);
      await prefs.setString(kUserPin, pin);
      await prefs.setString(kUserId, userId);
      if (accessToken != null) {
        await prefs.setString(kAccessToken, accessToken);
      }
      // Update in-memory cache
      _AuthCache.userId = userId;
      if (accessToken != null) _AuthCache.accessToken = accessToken;
      debugPrint('✅ AuthStorage: Thông tin đăng nhập đã lưu thành công');
    } catch (e) {
      debugPrint('❌ AuthStorage: Lỗi lưu thông tin đăng nhập: $e');
      rethrow;
    }
  }

  static Future<void> saveAuthResult({
    required String accessToken,
    required Map<String, dynamic> userJson,
  }) async {
    debugPrint('🔍 [AuthStorage] Saving auth result...');
    debugPrint('🔍 [AuthStorage] Access token length: ${accessToken.length}');
    debugPrint('🔍 [AuthStorage] User JSON keys: ${userJson.keys.toList()}');

    final userId =
        userJson['user_id'] as String? ?? userJson['id'] as String? ?? '';
    debugPrint(
      '🔍 [AuthStorage] Raw user ID from backend: "${userJson['user_id'] ?? userJson['id']}" (type: ${(userJson['user_id'] ?? userJson['id']).runtimeType})',
    );
    debugPrint('🔍 [AuthStorage] Processed user ID: "$userId"');
    debugPrint('🔍 [AuthStorage] User ID empty: ${userId.isEmpty}');

    try {
      final prefs = await SharedPreferences.getInstance();

      // Save each piece of data individually with logging
      debugPrint('🔍 [AuthStorage] Saving access token...');
      await prefs.setString(kAccessToken, accessToken);
      debugPrint('✅ [AuthStorage] Access token written to SharedPreferences');

      debugPrint('🔍 [AuthStorage] Saving user ID: "$userId"');
      await prefs.setString(kUserId, userId);
      // Update in-memory cache ASAP so other callers don't hit disk
      _AuthCache.userId = userId;
      _AuthCache.userJson = userJson;
      _AuthCache.accessToken = accessToken;
      debugPrint('✅ [AuthStorage] User ID written to SharedPreferences');

      debugPrint('🔍 [AuthStorage] Saving user JSON...');
      await prefs.setString(kUserJson, jsonEncode(userJson));
      debugPrint('✅ [AuthStorage] User JSON written to SharedPreferences');

      // Verify what was actually saved
      // Skip verbose verification logging in production to reduce startup noise.
      if (const bool.fromEnvironment(
        'DEBUG_AUTH_STORAGE',
        defaultValue: false,
      )) {
        final savedToken = prefs.getString(kAccessToken);
        final savedUserId = prefs.getString(kUserId);
        final savedUserJson = prefs.getString(kUserJson);

        debugPrint('🔍 [AuthStorage] Verification after save:');
        debugPrint('   - Token saved: ${savedToken != null ? 'YES' : 'NO'}');
        debugPrint(
          '   - User ID saved: ${savedUserId != null ? 'YES' : 'NO'} (value: "$savedUserId")',
        );
        debugPrint(
          '   - User JSON saved: ${savedUserJson != null ? 'YES' : 'NO'}',
        );

        debugPrint('✅ [AuthStorage] Auth result saved successfully');
        debugPrint(
          '⏱️ [AuthStorage] saveAuthResult completed at: ${DateTime.now().toIso8601String()}',
        );
      }
    } catch (e) {
      debugPrint('❌ [AuthStorage] Error saving auth result: $e');
      rethrow;
    }
  }

  static Future<String?> getUserId() async {
    try {
      // Prefer the in-memory cached value to avoid synchronous disk reads
      if (_AuthCache.userId != null) return _AuthCache.userId;

      final prefs = await SharedPreferences.getInstance();
      final userId = prefs.getString(kUserId);

      if (userId != null) {
        if (const bool.fromEnvironment(
          'DEBUG_AUTH_STORAGE',
          defaultValue: false,
        )) {
          debugPrint('🔍 [AuthStorage] Getting user ID...');
          debugPrint('� [AuthStorage] User ID found: YES');
          debugPrint('🔍 [AuthStorage] User ID value: $userId');
        }
        _AuthCache.userId = userId;
      } else {
        if (const bool.fromEnvironment(
          'DEBUG_AUTH_STORAGE',
          defaultValue: false,
        )) {
          debugPrint('� [AuthStorage] User ID found: NO');
          final allKeys = prefs.getKeys();
          debugPrint('🔍 [AuthStorage] All stored keys: $allKeys');
        }
      }

      return userId;
    } catch (e) {
      debugPrint('❌ [AuthStorage] Error getting user ID: $e');
      return null;
    }
  }

  static Future<(String?, String?)> getPhonePin() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final phone = prefs.getString(kUserPhone);
      final pin = prefs.getString(kUserPin);
      if (const bool.fromEnvironment(
        'DEBUG_AUTH_STORAGE',
        defaultValue: false,
      )) {
        debugPrint(
          '🔄 AuthStorage: Lấy phone/pin - Phone: ${phone != null ? 'Có' : 'Không'}, PIN: ${pin != null ? 'Có' : 'Không'}',
        );
      }
      return (phone, pin);
    } catch (e) {
      debugPrint('❌ AuthStorage: Lỗi lấy phone/pin: $e');
      return (null, null);
    }
  }

  static Future<String?> getAccessToken() async {
    try {
      if (_AuthCache.accessToken != null) return _AuthCache.accessToken;

      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString(kAccessToken);
      if (const bool.fromEnvironment(
        'DEBUG_AUTH_STORAGE',
        defaultValue: false,
      )) {
        debugPrint('🔍 [AuthStorage] Getting access token...');
        debugPrint(
          '� [AuthStorage] Access token found: ${token != null ? 'YES' : 'NO'}',
        );
        if (token != null) {
          debugPrint('🔍 [AuthStorage] Token length: ${token.length}');
          debugPrint(
            '🔍 [AuthStorage] Token preview: ${token.length > 20 ? token.substring(0, 20) : token}...',
          );
        }
      }
      if (token != null) _AuthCache.accessToken = token;
      return token;
    } catch (e) {
      debugPrint('❌ [AuthStorage] Error getting access token: $e');
      return null;
    }
  }

  static Future<Map<String, dynamic>?> getUserJson() async {
    try {
      if (_AuthCache.userJson != null) return _AuthCache.userJson;
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(kUserJson);
      if (raw == null) {
        if (const bool.fromEnvironment(
          'DEBUG_AUTH_STORAGE',
          defaultValue: false,
        )) {
          debugPrint('🔄 AuthStorage: Không tìm thấy user JSON');
        }
        return null;
      }
      final userJson = jsonDecode(raw) as Map<String, dynamic>;
      _AuthCache.userJson = userJson;
      if (const bool.fromEnvironment(
        'DEBUG_AUTH_STORAGE',
        defaultValue: false,
      )) {
        debugPrint('✅ AuthStorage: Lấy user JSON thành công');
      }
      return userJson;
    } catch (e) {
      debugPrint('❌ AuthStorage: Lỗi lấy user JSON: $e');
      return null;
    }
  }

  static Future<String?> getUserRole() async {
    try {
      final userJson = await getUserJson();
      final role = userJson?['role'] as String?;
      debugPrint('🔄 AuthStorage: Lấy role - ${role ?? 'Không tìm thấy'}');
      return role;
    } catch (e) {
      debugPrint('❌ AuthStorage: Lỗi lấy role: $e');
      return null;
    }
  }

  static Future<void> clear() async {
    debugPrint('🔄 AuthStorage: Xóa tất cả dữ liệu auth');
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(kUserPhone);
      await prefs.remove(kUserPin);
      await prefs.remove(kUserId);
      await prefs.remove(kAccessToken);
      await prefs.remove(kUserJson); // NEW
      // Clear in-memory cache as well
      _AuthCache.userId = null;
      _AuthCache.accessToken = null;
      _AuthCache.userJson = null;
      debugPrint('✅ AuthStorage: Đã xóa tất cả dữ liệu auth thành công');
    } catch (e) {
      debugPrint('❌ AuthStorage: Lỗi xóa dữ liệu auth: $e');
      rethrow;
    }
  }
}
