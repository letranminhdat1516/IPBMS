import 'dart:async';

import 'package:detect_care_app/features/auth/data/auth_storage.dart';
import 'package:detect_care_app/features/auth/models/user.dart' as auth;
import 'package:detect_care_app/features/auth/repositories/auth_repository.dart';
import 'package:detect_care_app/services/notification_manager.dart';
import 'package:detect_care_app/services/push_service.dart';
import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart' hide User;

enum AuthStatus {
  loading,
  unauthenticated,
  otpSent,
  otpVerified,
  authenticated,
}

class AuthProvider extends ChangeNotifier {
  // Constants for better maintainability
  static const Duration _defaultTimeout = Duration(seconds: 12);
  static const Duration _debounceDuration = Duration(seconds: 2);

  // Debounce tracking
  DateTime? _lastOtpRequest;
  Timer? _debounceTimer;
  int _requestCounter = 0;

  final AuthRepository repo;

  AuthStatus status = AuthStatus.loading;
  auth.User? user;

  bool fcmRegistered = false;
  String? _pendingPhone;
  String? get pendingPhone => _pendingPhone;

  String? lastOtpRequestMessage;
  String? lastOtpCallId;
  String? lastOtpExpiresIn;
  String? _cachedUserId;

  String? get currentUserId => user?.id ?? _cachedUserId;

  AuthProvider(this.repo) {
    if (kDebugMode) {
      debugPrint('🚀 [AuthProvider] Khởi tạo AuthProvider');
      debugPrint('📊 [AuthProvider] Bắt đầu tải dữ liệu từ preferences...');
    }
    _loadFromPrefs();
  }

  @override
  void dispose() {
    if (kDebugMode) {
      debugPrint('🗑️ [AuthProvider] Dispose AuthProvider');
    }
    _debounceTimer?.cancel();
    super.dispose();
  }

  Future<void> logout() async {
    if (kDebugMode) {
      debugPrint('🔄 [AuthProvider] Bắt đầu đăng xuất...');
      debugPrint(
        '👤 [AuthProvider] User hiện tại: ${user?.fullName ?? 'null'}',
      );
    }

    try {
      // Step 1: Call logout API to invalidate server-side session
      await _callLogoutApi().catchError((e) {
        if (kDebugMode) debugPrint('⚠️ Logout API call failed: $e');
      });

      // Step 2: Unregister FCM device token
      await _unregisterDeviceToken().catchError((e) {
        if (kDebugMode) debugPrint('⚠️ Device token unregister failed: $e');
      });

      // Step 3: Clear Supabase session to prevent stale session issues
      await _clearSupabaseSession().catchError((e) {
        if (kDebugMode) debugPrint('⚠️ Supabase session clear failed: $e');
      });

      // Step 4: Sequential cleanup - these should always succeed
      await _clearAuthStorage();
      _clearUserData();
      _setStatus(AuthStatus.unauthenticated);

      if (kDebugMode) {
        debugPrint('✅ [AuthProvider] Đăng xuất hoàn thành thành công');
      }
    } catch (e, stackTrace) {
      if (kDebugMode) {
        debugPrint('❌ [AuthProvider] Lỗi đăng xuất: $e');
        debugPrint('📋 Stack trace: $stackTrace');
      }
      // Even if logout fails, try to clear local state
      try {
        await _clearAuthStorage();
        await _clearSupabaseSession();
      } catch (clearError) {
        if (kDebugMode) {
          debugPrint('⚠️ Failed to clear storage: $clearError');
        }
      }
      _clearUserData();
      _setStatus(AuthStatus.unauthenticated);

      if (kDebugMode) {
        debugPrint('✅ [AuthProvider] Đăng xuất hoàn thành (với một số lỗi)');
      }
    }
  }

  Future<void> sendOtp(String phone) async {
    _requestCounter++;
    final requestId = _requestCounter;

    if (kDebugMode) {
      debugPrint(
        '📱 [AuthProvider] sendOtp() được gọi với phone: $phone (Request #$requestId)',
      );
      debugPrint('📡 [AuthProvider] Sử dụng backend API để gửi OTP');
      debugPrint(
        '🕒 [AuthProvider] Timestamp: ${DateTime.now().toIso8601String()}',
      );
      debugPrint(
        '🔄 [AuthProvider] Last OTP request: ${_lastOtpRequest?.toIso8601String() ?? 'null'}',
      );
    }

    if (_lastOtpRequest != null &&
        DateTime.now().difference(_lastOtpRequest!) < _debounceDuration) {
      if (kDebugMode) {
        debugPrint(
          '⏳ [AuthProvider] Yêu cầu OTP #$requestId bị debounce (quá nhanh)',
        );
        debugPrint(
          '⏰ [AuthProvider] Thời gian còn lại: ${(_debounceDuration - DateTime.now().difference(_lastOtpRequest!)).inSeconds}s',
        );
      }
      return;
    }

    _lastOtpRequest = DateTime.now();

    if (kDebugMode) {
      debugPrint(
        '✅ [AuthProvider] Debounce passed for request #$requestId, proceeding with OTP request',
      );
      debugPrint('📞 [AuthProvider] Đang gửi OTP đến: $phone');
      debugPrint('🔄 [AuthProvider] Gọi repo.sendOtp()...');
    }

    try {
      final result = await repo.sendOtp(phone);
      lastOtpRequestMessage = result.message;
      lastOtpCallId = result.callId;
      lastOtpExpiresIn = result.expiresIn;
      _pendingPhone = phone;

      if (kDebugMode) {
        debugPrint('📨 [AuthProvider] Nhận kết quả từ backend:');
        debugPrint('   - Message: ${result.message}');
        debugPrint('   - Call ID: ${result.callId}');
        debugPrint('   - Formatted Phone: ${result.formattedPhoneNumber}');
      }

      if (kDebugMode) {
        debugPrint('✅ [AuthProvider] OTP đã gửi thành công qua backend API');
      }
      _setStatus(AuthStatus.otpSent);
    } catch (e) {
      if (kDebugMode) {
        debugPrint('❌ [AuthProvider] Lỗi gửi OTP: $e');
      }
      _setStatus(AuthStatus.unauthenticated);
      lastOtpRequestMessage = 'Lỗi gửi OTP. Vui lòng thử lại. Chi tiết: $e';
      rethrow;
    }
  }

  Future<void> verifyOtp(String phone, String code, {String? callId}) async {
    if (kDebugMode) {
      debugPrint('🔍 [AuthProvider] verifyOtp() được gọi:');
      debugPrint('   - Phone: $phone');
      debugPrint('   - Code: $code');
      debugPrint('   - Call ID: $callId');
      debugPrint('🔄 [AuthProvider] Bắt đầu xác thực OTP...');
    }

    _setStatus(AuthStatus.loading);

    try {
      final res = await repo.verifyOtp(phone, code).timeout(_defaultTimeout);

      if (kDebugMode) {
        debugPrint('✅ [AuthProvider] OTP verification response received:');
        debugPrint('   - Access Token length: ${res.accessToken.length}');
        debugPrint(
          '   - Access Token preview: ${res.accessToken.substring(0, 20)}...',
        );
        debugPrint('   - User ID: ${res.user.id}');
        debugPrint('   - User Name: ${res.user.fullName}');
        debugPrint('   - User Phone: ${res.user.phone}');
        debugPrint('   - User JSON keys: ${res.userServerJson.keys.toList()}');
        debugPrint('🔍 [AuthProvider] User server JSON content:');
        res.userServerJson.forEach((key, value) {
          debugPrint('     $key: $value');
        });
      }

      debugPrint('🔍 [AuthProvider] Saving auth result to storage...');
      debugPrint(
        '⏱️ [AuthProvider] Calling AuthStorage.saveAuthResult at: ${DateTime.now().toIso8601String()}',
      );
      await AuthStorage.saveAuthResult(
        accessToken: res.accessToken,
        userJson: res.userServerJson,
      );
      debugPrint(
        '⏱️ [AuthProvider] AuthStorage.saveAuthResult returned at: ${DateTime.now().toIso8601String()}',
      );

      user = res.user;
      _cachedUserId = user!.id;

      if (kDebugMode) {
        debugPrint('✅ [AuthProvider] User authenticated successfully:');
        debugPrint('   - Local user object: ${user!.fullName} (${user!.id})');
        debugPrint('   - Cached user ID: $_cachedUserId');
      }
      if (kDebugMode) {
        debugPrint('[Auth] OTP verified -> authenticated as ${user!.fullName}');
        debugPrint('[Auth] Access Token: ${res.accessToken}');
      }

      _setStatus(AuthStatus.authenticated);
      await _registerDeviceToken();
    } catch (err) {
      if (kDebugMode) {
        debugPrint('❌ [AuthProvider] Xác thực OTP thất bại: $err');
      }
      _setStatus(AuthStatus.unauthenticated);
      rethrow;
    }
  }

  Future<void> _registerDeviceToken() async {
    if (kDebugMode) {
      debugPrint('📱 [AuthProvider] _registerDeviceToken() được gọi');
    }

    try {
      final jwt = await AuthStorage.getAccessToken();
      if (user?.id != null) {
        if (kDebugMode) {
          debugPrint(
            '🔄 [AuthProvider] Đăng ký device token cho user: ${user!.id}',
          );
        }

        try {
          await Future.wait([
            PushService.registerDeviceToken(userId: user!.id, jwt: jwt),
            NotificationManager().registerDeviceTokenAfterAuth(),
          ]);

          if (kDebugMode) {
            await NotificationManager().debugFCMStatus();
          }

          fcmRegistered = true;
          if (kDebugMode) {
            debugPrint('✅ [AuthProvider] Device token đã đăng ký thành công');
          }
        } catch (e) {
          fcmRegistered = false;
          if (kDebugMode) {
            debugPrint('⚠️ [AuthProvider] Đăng ký device token thất bại: $e');
          }
        }
      } else {
        if (kDebugMode) {
          debugPrint(
            '⚠️ [AuthProvider] Không thể đăng ký device token: user ID null',
          );
        }
      }
    } catch (e) {
      if (kDebugMode) {
        debugPrint('⚠️ [AuthProvider] Đăng ký device token thất bại: $e');
      }
      // Don't throw, this is not critical
    }
  }

  Future<void> _callLogoutApi() async {
    try {
      if (kDebugMode) {
        debugPrint('📡 [AuthProvider] Calling logout API...');
      }
      await repo.logout();
      if (kDebugMode) {
        debugPrint('✅ [AuthProvider] Logout API call successful');
      }
    } catch (e) {
      if (kDebugMode) {
        debugPrint('⚠️ [AuthProvider] Logout API call failed: $e');
        debugPrint('ℹ️ [AuthProvider] Continuing logout despite API failure');
      }
    }
  }

  Future<void> _unregisterDeviceToken() async {
    try {
      final jwt = await AuthStorage.getAccessToken();
      if (jwt != null) {
        await PushService.unregisterDeviceToken(jwt: jwt);
        if (kDebugMode) {
          debugPrint('✅ [AuthProvider] Device token unregistered');
        }
      }
    } catch (e) {
      if (kDebugMode) {
        debugPrint('⚠️ [AuthProvider] Device token unregistration failed: $e');
        debugPrint(
          'ℹ️ [AuthProvider] Continuing logout despite unregistration failure',
        );
      }
    }
  }

  Future<void> _clearSupabaseSession() async {
    try {
      final currentUser = Supabase.instance.client.auth.currentUser;
      if (currentUser != null) {
        if (kDebugMode) {
          debugPrint('🔄 [AuthProvider] Clearing Supabase session...');
        }
        await Supabase.instance.client.auth.signOut();
        if (kDebugMode) {
          debugPrint('✅ [AuthProvider] Supabase session cleared');
        }
      } else {
        if (kDebugMode) {
          debugPrint('ℹ️ [AuthProvider] No Supabase session to clear');
        }
      }
    } catch (e) {
      if (kDebugMode) {
        debugPrint('⚠️ [AuthProvider] Supabase session clear failed: $e');
        debugPrint(
          'ℹ️ [AuthProvider] Continuing logout despite Supabase clear failure',
        );
      }
    }
  }

  Future<void> _clearAuthStorage() async {
    try {
      await AuthStorage.clear();
      if (kDebugMode) {
        debugPrint('✅ [AuthProvider] AuthStorage cleared');
      }
    } catch (e) {
      if (kDebugMode) {
        debugPrint('⚠️ [AuthProvider] AuthStorage clear failed: $e');
      }
    }
  }

  void _clearUserData() {
    user = null;
    _cachedUserId = null;
    if (kDebugMode) {
      debugPrint('✅ [AuthProvider] User data cleared');
    }
  }

  void _setStatus(AuthStatus newStatus) {
    if (kDebugMode) {
      final supaUser = Supabase.instance.client.auth.currentUser;
      debugPrint(
        '🔄 [AuthProvider] Trạng thái: ${status.name} -> ${newStatus.name}',
      );
      debugPrint(
        '👤 [AuthProvider] Người dùng hiện tại: ${user?.id}, Supabase user: ${supaUser?.id}',
      );
    }
    status = newStatus;
    notifyListeners();
  }

  Future<void> _loadFromPrefs() async {
    if (kDebugMode) {
      debugPrint('📊 [AuthProvider] Loading data from preferences...');
      debugPrint('� [AuthProvider] Starting authentication state check...');
    }

    _setStatus(AuthStatus.loading);

    Timer? safetyTimer;
    safetyTimer = Timer(const Duration(seconds: 15), () {
      if (status == AuthStatus.loading) {
        if (kDebugMode) {
          debugPrint(
            '⏰ [AuthProvider] Safety timeout reached, resetting to unauthenticated',
          );
        }
        _setStatus(AuthStatus.unauthenticated);
      }
      safetyTimer?.cancel();
    });

    try {
      // First, check if we have stored credentials
      final token = await AuthStorage.getAccessToken();
      final userId = await AuthStorage.getUserId();
      final storedUserJson = await AuthStorage.getUserJson();

      if (kDebugMode) {
        debugPrint('🔍 [AuthProvider] Storage check results:');
        debugPrint(
          '   - Access Token: ${token != null ? 'EXISTS' : 'MISSING'}',
        );
        debugPrint(
          '   - User ID: ${userId != null ? 'EXISTS ($userId)' : 'MISSING'}',
        );
        debugPrint(
          '   - User JSON: ${storedUserJson != null ? 'EXISTS' : 'MISSING'}',
        );
      }

      if (token == null || userId == null) {
        if (kDebugMode) {
          debugPrint('❌ [AuthProvider] Missing required auth data in storage');
          debugPrint('   - Token missing: ${token == null}');
          debugPrint('   - User ID missing: ${userId == null}');
        }

        // Check if there's an active Supabase session
        final supabaseUser = Supabase.instance.client.auth.currentUser;
        if (supabaseUser != null) {
          if (kDebugMode) {
            debugPrint(
              '🔄 [AuthProvider] Found Supabase session for user: ${supabaseUser.id}',
            );
            debugPrint(
              '� [AuthProvider] Supabase user phone: ${supabaseUser.phone}',
            );
            debugPrint(
              '📧 [AuthProvider] Supabase user email: ${supabaseUser.email}',
            );
          }

          // Check if we have a JWT token before trying to call the API
          final existingToken = await AuthStorage.getAccessToken();
          if (existingToken != null && existingToken.isNotEmpty) {
            // We have a token, try to get user info from backend API
            try {
              final currentUser = await repo.me();
              if (currentUser != null) {
                if (kDebugMode) {
                  debugPrint(
                    '✅ [AuthProvider] Lấy được thông tin user từ API: ${currentUser.fullName}',
                  );
                }

                // Save the user info to AuthStorage for future use
                await AuthStorage.saveAuthResult(
                  accessToken: existingToken,
                  userJson: currentUser.toJson(),
                );

                user = currentUser;
                _cachedUserId = user!.id;
                _setStatus(AuthStatus.authenticated);
                await _registerDeviceToken();
                return;
              }
            } catch (e) {
              if (kDebugMode) {
                debugPrint(
                  '⚠️ [AuthProvider] Không thể lấy thông tin user từ API: $e',
                );
              }
            }
          } else {
            if (kDebugMode) {
              debugPrint(
                '⚠️ [AuthProvider] Có Supabase session nhưng không có JWT token - clearing stale session',
              );
            }

            // If we reach here, we have Supabase session but no valid JWT or user data
            // This likely means user was logged out but Supabase session persists
            // Clear the stale Supabase session to ensure clean state
            try {
              await Supabase.instance.client.auth.signOut();
              if (kDebugMode) {
                debugPrint('✅ [AuthProvider] Cleared stale Supabase session');
              }
            } catch (e) {
              if (kDebugMode) {
                debugPrint(
                  '⚠️ [AuthProvider] Failed to clear Supabase session: $e',
                );
              }
            }
          }
        }

        _setStatus(AuthStatus.unauthenticated);
        return;
      }

      if (kDebugMode) {
        debugPrint(
          '✅ [AuthProvider] Tìm thấy access token: ${token.substring(0, 20)}...',
        );
      }

      // final isSessionValid = await validateSession();
      // if (!isSessionValid) {
      //   if (kDebugMode) {
      //     debugPrint(
      //       '❌ [AuthProvider] Session validation failed - token may be expired',
      //     );
      //   }
      //   // Clear invalid auth data
      //   await AuthStorage.clear();
      //   _setStatus(AuthStatus.unauthenticated);
      //   return;
      // }

      final userJson = await AuthStorage.getUserJson();
      if (userJson != null) {
        user = auth.User.fromJson(userJson);
        _cachedUserId = user?.id;
        if (kDebugMode) {
          debugPrint('✅ [AuthProvider] Tải user từ JSON: ${user?.fullName}');
        }
      } else {
        _cachedUserId = await AuthStorage.getUserId();
        if (kDebugMode) {
          debugPrint(
            '⚠️ [AuthProvider] Không có user JSON, chỉ có user ID: $_cachedUserId',
          );
        }
      }

      if (kDebugMode) {
        debugPrint(
          '✅ [AuthProvider] Đã tải xong từ preferences, chuyển sang trạng thái authenticated',
        );
      }

      _setStatus(AuthStatus.authenticated);
      await _registerDeviceToken();
    } catch (e) {
      if (kDebugMode) {
        debugPrint('❌ [AuthProvider] Lỗi khi tải từ preferences: $e');
      }
      _setStatus(AuthStatus.unauthenticated);
    } finally {
      safetyTimer.cancel();
    }
  }

  void resetToUnauthenticated() {
    _setStatus(AuthStatus.unauthenticated);
  }

  Future<String?> getUserIdFromPrefs() => AuthStorage.getUserId();

  // Validate current session by checking if token is still valid
  Future<bool> validateSession() async {
    try {
      if (kDebugMode) {
        debugPrint('🔍 [AuthProvider] Validating current session...');
      }

      final token = await AuthStorage.getAccessToken();
      if (token == null || token.isEmpty) {
        if (kDebugMode) {
          debugPrint('❌ [AuthProvider] No access token found');
        }
        return false;
      }

      // Try to get current user info to validate token with timeout
      final currentUser = await repo.me().timeout(
        const Duration(seconds: 10),
        onTimeout: () {
          if (kDebugMode) {
            debugPrint('⏰ [AuthProvider] Session validation timed out');
          }
          return null;
        },
      );

      if (currentUser != null) {
        if (kDebugMode) {
          debugPrint(
            '✅ [AuthProvider] Session is valid for user: ${currentUser.fullName}',
          );
        }
        return true;
      }

      if (kDebugMode) {
        debugPrint(
          '❌ [AuthProvider] Failed to get user info - session invalid',
        );
      }
      return false;
    } catch (e) {
      if (kDebugMode) {
        debugPrint('❌ [AuthProvider] Session validation failed: $e');
      }
      return false;
    }
  }
}
