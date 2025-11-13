import '../../../core/config/app_config.dart';

class AuthEndpoints {
  final String base;

  const AuthEndpoints(this.base);

  String get users => '$base/users';
  // New backend (NestJS) auth endpoints under /auth
  String get requestOtp => '$base/auth/request-otp';
  String get login => '$base/auth/login';
  String get me => '$base/auth/me';
  String get logout => '$base/auth/logout';
  // Legacy placeholders kept for compatibility
  String get sendOtp => '$base/send-otp';
  String get verifyOtp => '$base/verify-otp';
  String get setPin => '$base/set-pin';
  String get hasPin => '$base/has-pin';
  String get verifyPin => '$base/verify-pin';
}

AuthEndpoints makeAuthEndpoints() => AuthEndpoints(AppConfig.apiBaseUrl);
