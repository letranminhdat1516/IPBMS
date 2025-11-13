// lib/screens/otp_verifications_screen.dart

import 'dart:async';

import 'package:detect_care_app/features/home/screens/home_screen.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../providers/auth_provider.dart';
import '../widgets/six_digit_input.dart';
import 'phone_login_screen.dart';

enum VerificationType { register, forgotPassword }

class OtpVerificationsScreen extends StatefulWidget {
  final String phoneNumber;
  final VerificationType verificationType;

  const OtpVerificationsScreen({
    super.key,
    required this.phoneNumber,
    required this.verificationType,
  });

  @override
  State<OtpVerificationsScreen> createState() => _OtpVerificationsScreenState();
}

class _OtpVerificationsScreenState extends State<OtpVerificationsScreen> {
  Timer? _timer;
  final int _resendCountdown = 30;
  bool _isLoading = false;
  String _otpCode = '';
  String? _serverMessage;
  final _otpFieldKey = GlobalKey();

  // Thêm ValueNotifier để tránh setState liên tục
  final _countdownNotifier = ValueNotifier<int>(30);

  // Thêm debouncing cho resend button
  bool _isResending = false;
  Timer? _resendDebounceTimer;

  @override
  void initState() {
    super.initState();
    print(
      '🔄 OtpVerificationsScreen: Khởi tạo màn hình OTP cho số ${widget.phoneNumber}',
    );
    // OTP đã được gửi bởi PhoneLoginScreen hoặc resend button
    // Chỉ cần load message từ AuthProvider
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      if (!mounted) return;
      final auth = context.read<AuthProvider>();
      print(
        '🔎 OtpVerificationsScreen.initState: raw lastOtpRequestMessage="${auth.lastOtpRequestMessage}"',
      );
      setState(() {
        _serverMessage = _processServerMessage(auth.lastOtpRequestMessage);
      });
    });
    _startResendTimer();
  }

  void _startResendTimer() {
    _countdownNotifier.value = 30;
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (_countdownNotifier.value > 0) {
        _countdownNotifier.value--;
      } else {
        t.cancel();
      }
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    _countdownNotifier.dispose();
    _resendDebounceTimer?.cancel();
    super.dispose();
  }

  Future<void> _onSubmit(String code) async {
    print(
      '🔄 OtpVerificationsScreen: Bắt đầu xác thực OTP $code cho số ${widget.phoneNumber}',
    );
    final navigator = Navigator.of(context);
    final messenger = ScaffoldMessenger.of(context);
    setState(() => _isLoading = true);
    try {
      final auth = context.read<AuthProvider>();
      await auth.verifyOtp(widget.phoneNumber, code);
      print(
        '✅ OtpVerificationsScreen: OTP xác thực thành công, chuyển sang HomeScreen',
      );
      if (!mounted) return;
      navigator.pushReplacement(
        MaterialPageRoute(builder: (_) => const HomeScreen()),
      );
    } catch (e) {
      print('❌ OtpVerificationsScreen: Lỗi xác thực OTP: $e');
      if (!mounted) return;
      final friendly = _mapVerifyOtpErrorToMessage(e);
      // show both inline message and snackbar for visibility
      setState(() => _serverMessage = friendly);
      messenger.showSnackBar(SnackBar(content: Text(friendly)));
    } finally {
      if (mounted) setState(() => _isLoading = false);
      print('🔄 OtpVerificationsScreen: Hoàn thành xử lý OTP');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FBFF),

      body: Container(
        width: double.infinity,
        height: MediaQuery.of(context).size.height,
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [Color(0xFFF8FBFF), Color(0xFFF0F7FF)],
          ),
        ),
        child: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 40),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                AnimatedSwitcher(
                  duration: const Duration(milliseconds: 200),
                  child: Container(
                    key: const ValueKey('header'),
                    padding: const EdgeInsets.all(40),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(
                            0xFF2E7BF0,
                          ).withValues(alpha: 0.08),
                          blurRadius: 20,
                          offset: const Offset(0, 4),
                        ),
                      ],
                      border: Border.all(
                        color: const Color(0xFF2E7BF0).withValues(alpha: 0.1),
                      ),
                    ),
                    child: Column(
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: const [
                            Icon(
                              Icons.shield_rounded,
                              color: Color(0xFF2E7BF0),
                              size: 32,
                            ),
                            SizedBox(width: 10),
                            Text(
                              'Vision AI',
                              style: TextStyle(
                                fontSize: 28,
                                fontWeight: FontWeight.w600,
                                color: Color(0xFF1E3A8A),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Xác thực OTP để bảo vệ tài khoản của bạn',
                          style: TextStyle(
                            fontSize: 14,
                            color: const Color(0xFF64748B),
                          ),
                          textAlign: TextAlign.center,
                        ),
                      ],
                    ),
                  ),
                ),

                const SizedBox(height: 50),

                AnimatedSwitcher(
                  duration: const Duration(milliseconds: 200),
                  child: Container(
                    key: const ValueKey('otpform'),
                    padding: const EdgeInsets.all(32),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(
                            0xFF2E7BF0,
                          ).withValues(alpha: 0.05),
                          blurRadius: 15,
                          offset: const Offset(0, 2),
                        ),
                      ],
                      border: Border.all(
                        color: const Color(0xFFE2E8F0),
                        width: 1,
                      ),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Text(
                          'Nhập mã OTP đã gửi đến',
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w500,
                            color: Color(0xFF1E3A8A),
                          ),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 4),
                        Text(
                          widget.phoneNumber,
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF2E7BF0),
                          ),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 12),
                        if (_serverMessage != null &&
                            _serverMessage!.isNotEmpty)
                          Padding(
                            padding: const EdgeInsets.only(bottom: 8),
                            child: Row(
                              children: [
                                const Icon(
                                  Icons.error_outline,
                                  color: Colors.red,
                                  size: 18,
                                ),
                                const SizedBox(width: 6),
                                Expanded(
                                  child: Text(
                                    _serverMessage!,
                                    style: const TextStyle(color: Colors.red),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        SixDigitInputField(
                          key: _otpFieldKey,
                          onCompleted: (code) {
                            setState(() => _otpCode = code);
                            if (code.length == 6 && !_isLoading) {
                              _onSubmit(code);
                            }
                          },
                          // enablePaste: true, // nếu widget hỗ trợ
                        ),
                        const SizedBox(height: 24),
                        if (_resendCountdown > 0)
                          ValueListenableBuilder<int>(
                            valueListenable: _countdownNotifier,
                            builder: (context, countdown, child) {
                              final auth = context.read<AuthProvider>();
                              final expires = auth.lastOtpExpiresIn;
                              if (expires != null && expires.isNotEmpty) {
                                return Text(
                                  'Hết hạn sau $expires',
                                  textAlign: TextAlign.center,
                                );
                              }
                              return Text(
                                'Gửi lại sau $countdown giây',
                                textAlign: TextAlign.center,
                              );
                            },
                          )
                        else
                          TextButton(
                            onPressed: _isResending
                                ? null
                                : () async {
                                    print(
                                      '🔄 OtpVerificationsScreen: Gửi lại OTP cho số ${widget.phoneNumber}',
                                    );

                                    // Prevent multiple rapid clicks
                                    if (_isResending) {
                                      print(
                                        '⏳ OtpVerificationsScreen: Đang gửi lại OTP, bỏ qua click',
                                      );
                                      return;
                                    }

                                    setState(() => _isResending = true);

                                    try {
                                      final auth = context.read<AuthProvider>();
                                      await auth.sendOtp(widget.phoneNumber);
                                      print(
                                        '✅ OtpVerificationsScreen: Gửi lại OTP thành công',
                                      );
                                      if (!mounted) return;
                                      setState(() {
                                        _serverMessage = _processServerMessage(
                                          auth.lastOtpRequestMessage,
                                        );
                                      });
                                      _startResendTimer();
                                    } catch (e) {
                                      print(
                                        '❌ OtpVerificationsScreen: resend exception: $e',
                                      );
                                      print(
                                        '❌ OtpVerificationsScreen: Lỗi gửi lại OTP: $e',
                                      );
                                      if (!mounted) return;
                                      setState(() {
                                        _serverMessage = _processServerMessage(
                                          e.toString(),
                                        );
                                      });
                                    } finally {
                                      // Add small delay before allowing another resend
                                      _resendDebounceTimer?.cancel();
                                      _resendDebounceTimer = Timer(
                                        const Duration(seconds: 2),
                                        () {
                                          if (mounted) {
                                            setState(
                                              () => _isResending = false,
                                            );
                                          }
                                        },
                                      );
                                    }
                                  },
                            child: _isResending
                                ? const SizedBox(
                                    width: 16,
                                    height: 16,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                    ),
                                  )
                                : const Text('Gửi lại mã OTP'),
                          ),
                        const SizedBox(height: 24),
                        ElevatedButton(
                          onPressed: (_otpCode.length == 6 && !_isLoading)
                              ? () => _onSubmit(_otpCode)
                              : null,
                          style: ElevatedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 16),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                            backgroundColor: const Color(0xFF2E7BF0),
                          ),
                          child: AnimatedSwitcher(
                            duration: const Duration(milliseconds: 300),
                            child: _isLoading
                                ? const SizedBox(
                                    width: 24,
                                    height: 24,
                                    child: CircularProgressIndicator(
                                      color: Colors.white,
                                      strokeWidth: 2,
                                    ),
                                  )
                                : const Text(
                                    'Xác nhận',
                                    style: TextStyle(
                                      color: Colors.white,
                                      fontSize: 16,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),

                const SizedBox(height: 24),

                TextButton(
                  onPressed: () => Navigator.pushReplacement(
                    context,
                    MaterialPageRoute(builder: (_) => const PhoneLoginScreen()),
                  ),
                  child: const Text(
                    'Quay lại đăng nhập bằng số điện thoại',
                    style: TextStyle(color: Color(0xFF2E7BF0), fontSize: 14),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  /// Process server message to show user-friendly text
  String? _processServerMessage(String? message) {
    if (message == null || message.isEmpty) return null;

    final lower = message.toLowerCase();

    if (lower.contains('please use firebase') ||
        lower.contains('use_firebase') ||
        lower.contains('firebase phone')) {
      print(
        '🔍 _processServerMessage: matched firebase-fallback for message="$message"',
      );
      return 'Mã OTP đã được gửi. Vui lòng kiểm tra điện thoại.';
    }

    if (lower.contains('sms service') ||
        lower.contains('service unavailable') ||
        lower.contains('sms unavailable')) {
      return 'Hệ thống SMS đang bảo trì. Vui lòng thử lại sau hoặc liên hệ hỗ trợ.';
    }

    if (message.toLowerCase().contains('rate limit') ||
        message.toLowerCase().contains('too many requests')) {
      print(
        '🔍 _processServerMessage: matched rate-limit for message="$message"',
      );
      return 'Quá nhiều yêu cầu. Vui lòng đợi một lúc rồi thử lại.';
    }

    if (message.toLowerCase().contains('invalid phone') ||
        message.toLowerCase().contains('phone number')) {
      print(
        '🔍 _processServerMessage: matched invalid-phone for message="$message"',
      );
      return 'Số điện thoại không hợp lệ. Vui lòng kiểm tra lại.';
    }

    if (message.toLowerCase().contains('network') ||
        message.toLowerCase().contains('connection')) {
      print('🔍 _processServerMessage: matched network for message="$message"');
      return 'Lỗi kết nối mạng. Vui lòng kiểm tra và thử lại.';
    }

    // For other messages, return as is but limit length
    if (message.length > 100) {
      return '${message.substring(0, 97)}...';
    }

    return message;
  }

  String _mapVerifyOtpErrorToMessage(Object e) {
    try {
      final raw = e.toString();
      final lower = raw.toLowerCase();

      if (raw.trimLeft().startsWith('{') && raw.contains(':')) {
        try {
          final body = raw;
          final messageMatch = RegExp(
            r'"message"\s*:\s*"([^"]+)"',
            caseSensitive: false,
          ).firstMatch(body);
          final errorMatch = RegExp(
            r'"error"\s*:\s*"([^"]+)"',
            caseSensitive: false,
          ).firstMatch(body);
          final msg = messageMatch?.group(1) ?? errorMatch?.group(1);
          if (msg != null && msg.isNotEmpty) {
            return _normalizeToFriendly(msg);
          }
        } catch (_) {
          // ignore JSON parsing fallback
        }
      }

      // Check for Vietnamese server messages first
      if (lower.contains('mã otp') ||
          lower.contains('otp không đúng') ||
          lower.contains('mã không đúng') ||
          lower.contains('invalid otp')) {
        return 'Mã OTP không đúng. Vui lòng kiểm tra và thử lại.';
      }

      if (lower.contains('expired') ||
          lower.contains('hết hạn') ||
          lower.contains('timeout')) {
        return 'Mã OTP đã hết hạn. Vui lòng yêu cầu mã mới.';
      }

      if (lower.contains('too many') ||
          lower.contains('rate limit') ||
          lower.contains('quá nhiều')) {
        return 'Bạn đã thử quá nhiều lần. Vui lòng đợi một lúc rồi thử lại.';
      }

      if (lower.contains('network') ||
          lower.contains('socket') ||
          lower.contains('failed host lookup') ||
          lower.contains('kết nối')) {
        return 'Lỗi kết nối mạng. Vui lòng kiểm tra kết nối và thử lại.';
      }

      return _normalizeToFriendly(raw);
    } catch (err) {
      return 'Lỗi xác thực OTP. Vui lòng thử lại.';
    }
  }

  String _normalizeToFriendly(String raw) {
    final s = raw.trim();
    if (s.isEmpty) return 'Lỗi xác thực OTP. Vui lòng thử lại.';
    // Shorten very long messages
    if (s.length > 120) return '${s.substring(0, 117)}...';
    // Capitalize first letter for nicer display
    return s[0].toUpperCase() + s.substring(1);
  }
}
