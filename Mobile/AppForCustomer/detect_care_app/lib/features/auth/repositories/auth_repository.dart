import 'package:flutter/foundation.dart';
import 'package:detect_care_app/features/auth/data/auth_remote_data_source.dart';
import 'package:detect_care_app/features/auth/models/otp_request_result.dart';
import 'package:detect_care_app/features/auth/models/user.dart';
import 'package:detect_care_app/features/auth/models/login_result.dart';

class AuthRepository {
  final AuthRemoteDataSource remote;
  AuthRepository(this.remote);

  Future<User> register(String phone, String password) {
    debugPrint('🔄 AuthRepository: Đăng ký user với số $phone');
    try {
      final result = remote.createUser(phone, password);
      debugPrint('✅ AuthRepository: Đăng ký thành công cho $phone');
      return result;
    } catch (e) {
      debugPrint('❌ AuthRepository: Lỗi đăng ký cho $phone: $e');
      rethrow;
    }
  }

  Future<OtpRequestResult> sendOtp(String phone) {
    debugPrint('🔄 AuthRepository: Gửi OTP cho số $phone');
    try {
      final result = remote.sendOtp(phone);
      debugPrint('✅ AuthRepository: OTP gửi thành công cho $phone');
      return result;
    } catch (e) {
      debugPrint('❌ AuthRepository: Lỗi gửi OTP cho $phone: $e');
      rethrow;
    }
  }

  Future<LoginResult> verifyOtp(String phone, String code) {
    debugPrint('🔄 AuthRepository: Xác thực OTP cho số $phone');
    try {
      final result = remote.verifyOtp(phone, code);
      debugPrint('✅ AuthRepository: OTP xác thực thành công cho $phone');
      return result;
    } catch (e) {
      debugPrint('❌ AuthRepository: Lỗi xác thực OTP cho $phone: $e');
      rethrow;
    }
  }

  Future<OtpRequestResult> requestOtp(String phone) {
    debugPrint('🔄 AuthRepository: Yêu cầu OTP cho số $phone');
    try {
      final result = remote.sendOtp(phone);
      debugPrint('✅ AuthRepository: OTP yêu cầu thành công cho $phone');
      return result;
    } catch (e) {
      debugPrint('❌ AuthRepository: Lỗi yêu cầu OTP cho $phone: $e');
      rethrow;
    }
  }

  Future<User?> me() async {
    debugPrint('🔄 AuthRepository: Lấy thông tin user hiện tại');
    try {
      final result = await remote.me();
      debugPrint('✅ AuthRepository: Lấy thông tin user thành công');
      return result;
    } catch (e) {
      debugPrint(
        '⚠️ AuthRepository: Lỗi lấy thông tin user (có thể bỏ qua): $e',
      );
      return null;
    }
  }

  Future<void> logout() async {
    debugPrint('🔄 AuthRepository: Đăng xuất user');
    try {
      await remote.logout();
      debugPrint('✅ AuthRepository: Đăng xuất thành công');
    } catch (e) {
      debugPrint('⚠️ AuthRepository: Lỗi đăng xuất (có thể bỏ qua): $e');
      // Don't rethrow - logout should always succeed locally
    }
  }
}
