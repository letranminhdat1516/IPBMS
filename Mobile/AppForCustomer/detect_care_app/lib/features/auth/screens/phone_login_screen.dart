// lib/screens/phone_login_screen.dart

import 'dart:async';

import 'package:detect_care_app/core/config/app_config.dart';
import 'package:detect_care_app/core/utils/phone_utils.dart';
import 'package:detect_care_app/features/auth/providers/auth_provider.dart';
import 'package:detect_care_app/features/auth/screens/forgot_password_screen.dart';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:provider/provider.dart';

import '../utils/validators.dart';
import 'otp_verifications_screen.dart';

class PhoneLoginScreen extends StatefulWidget {
  const PhoneLoginScreen({super.key});

  @override
  State<PhoneLoginScreen> createState() => _PhoneLoginScreenState();
}

class _PhoneLoginScreenState extends State<PhoneLoginScreen>
    with TickerProviderStateMixin {
  final _formKey = GlobalKey<FormState>();
  final phoneController = TextEditingController();

  late AnimationController _fadeController;
  late Animation<double> _fadeAnimation;
  bool _isLoading = false;

  // Thêm debounce timer
  Timer? _debounceTimer;

  @override
  void initState() {
    super.initState();
    _fadeController = AnimationController(
      duration: const Duration(milliseconds: 800),
      vsync: this,
    );

    _fadeAnimation = Tween<double>(
      begin: 0.0,
      end: 1.0,
    ).animate(CurvedAnimation(parent: _fadeController, curve: Curves.easeOut));

    _fadeController.forward();
  }

  @override
  void dispose() {
    _fadeController.dispose();
    _debounceTimer?.cancel();
    phoneController.dispose();
    super.dispose();
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
            physics: const AlwaysScrollableScrollPhysics(),
            child: ConstrainedBox(
              constraints: BoxConstraints(
                minHeight:
                    MediaQuery.of(context).size.height -
                    MediaQuery.of(context).padding.top -
                    MediaQuery.of(context).padding.bottom,
              ),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16.0),
                child: FadeTransition(
                  opacity: _fadeAnimation,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const SizedBox(height: 60),
                      _buildMedicalHeader(),
                      const SizedBox(height: 50),
                      _buildLoginForm(),
                      const SizedBox(height: 40),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildMedicalHeader() {
    return Container(
      padding: const EdgeInsets.all(40),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF2E7BF0).withValues(alpha: 0.08),
            blurRadius: 20,
            offset: const Offset(0, 4),
          ),
        ],
        border: Border.all(
          color: const Color(0xFF2E7BF0).withValues(alpha: 0.1),
          width: 1,
        ),
      ),
      child: Column(
        children: [
          const Text(
            'Vision AI',
            style: TextStyle(
              fontSize: 28,
              fontWeight: FontWeight.w600,
              color: Color(0xFF1E3A8A),
              letterSpacing: 0.5,
            ),
          ),

          const SizedBox(height: 8),

          Text(
            'Hệ thống giám sát sức khỏe gia đình',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 14,
              color: const Color(0xFF64748B),
              fontWeight: FontWeight.w400,
              height: 1.4,
            ),
          ),

          const SizedBox(height: 20),

          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              _buildTrustBadge(Icons.verified, 'Đã xác thực'),
              const SizedBox(width: 16),
              _buildTrustBadge(Icons.security, 'Bảo mật'),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildTrustBadge(IconData icon, String text) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: const Color(0xFF10B981).withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: const Color(0xFF10B981).withValues(alpha: 0.2),
          width: 1,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: const Color(0xFF10B981)),
          const SizedBox(width: 4),
          Text(
            text,
            style: const TextStyle(
              color: Color(0xFF10B981),
              fontSize: 11,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLoginForm() {
    return Container(
      padding: const EdgeInsets.all(32),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF2E7BF0).withValues(alpha: 0.05),
            blurRadius: 15,
            offset: const Offset(0, 2),
          ),
        ],
        border: Border.all(color: const Color(0xFFE2E8F0), width: 1),
      ),
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Login Header
            const Text(
              'Đăng nhập tài khoản',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w600,
                color: Color(0xFF1E3A8A),
              ),
              textAlign: TextAlign.center,
            ),

            const SizedBox(height: 8),

            Text(
              'Vui lòng nhập số điện thoại đã đăng kí',
              style: TextStyle(
                fontSize: 14,
                color: const Color(0xFF64748B),
                fontWeight: FontWeight.w400,
              ),
              textAlign: TextAlign.center,
            ),

            const SizedBox(height: 32),

            // Phone Input Label
            const Text(
              'Số điện thoại',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w500,
                color: Color(0xFF374151),
              ),
            ),

            const SizedBox(height: 8),

            // Phone Input
            Container(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFD1D5DB), width: 1.5),
                color: const Color(0xFFFAFBFC),
              ),
              child: TextFormField(
                controller: phoneController,
                keyboardType: TextInputType.phone,
                validator: Validators.validatePhone,
                onChanged: (value) {
                  // Debounce validation để tránh quá nhiều rebuild
                  _debounceTimer?.cancel();
                  _debounceTimer = Timer(const Duration(milliseconds: 300), () {
                    if (mounted) {
                      _formKey.currentState?.validate();
                    }
                  });
                },
                style: const TextStyle(
                  color: Color(0xFF374151),
                  fontSize: 16,
                  fontWeight: FontWeight.w400,
                ),
                decoration: InputDecoration(
                  hintText: 'Nhập số điện thoại của bạn',
                  hintStyle: TextStyle(
                    color: const Color(0xFF9CA3AF),
                    fontSize: 15,
                    fontWeight: FontWeight.w400,
                  ),
                  border: InputBorder.none,
                  contentPadding: const EdgeInsets.all(16),
                  prefixIcon: Container(
                    padding: const EdgeInsets.all(16),
                    child: const Icon(
                      Icons.phone,
                      color: Color(0xFF2E7BF0),
                      size: 20,
                    ),
                  ),
                ),
              ),
            ),

            const SizedBox(height: 10),

            // Forgot Password
            Align(
              alignment: Alignment.centerRight,
              child: TextButton(
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => const ForgotPasswordScreen(),
                    ),
                  );
                },
                child: const Text(
                  'Quên mật khẩu?',
                  style: TextStyle(
                    color: Color(0xFF2E7BF0),
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 20),

            // Login Button
            Container(
              height: 54,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(12),
                gradient: const LinearGradient(
                  begin: Alignment.centerLeft,
                  end: Alignment.centerRight,
                  colors: [Color(0xFF2E7BF0), Color(0xFF1E40AF)],
                ),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF2E7BF0).withValues(alpha: 0.3),
                    blurRadius: 8,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: ElevatedButton(
                onPressed: _isLoading
                    ? null
                    : () async {
                        final phone = phoneController.text.trim();
                        // Format phone number to start with '84'
                        final formattedPhone = PhoneUtils.formatVietnamesePhone(
                          phone,
                        );
                        debugPrint(
                          '🔄 PhoneLoginScreen: Bắt đầu xử lý số điện thoại $phone (formatted: $formattedPhone)',
                        );

                        final rawOk = PhoneUtils.isValidVietnamesePhone(phone);
                        final formattedOk = PhoneUtils.isValidVietnamesePhone(
                          formattedPhone,
                        );

                        debugPrint(
                          '🔍 Phone validation: rawOk=$rawOk formattedOk=$formattedOk',
                        );

                        if (!rawOk && !formattedOk) {
                          const msg =
                              'Số điện thoại không hợp lệ. Vui lòng nhập theo định dạng 0xxxxxxxxx hoặc +84xxxxxxxxx.';
                          debugPrint(
                            '❌ PhoneLoginScreen: Validation thất bại cho $phone / $formattedPhone - $msg',
                          );
                          if (!mounted) return;
                          ScaffoldMessenger.of(
                            context,
                          ).showSnackBar(const SnackBar(content: Text(msg)));
                          return;
                        }
                        setState(() => _isLoading = true);
                        debugPrint(
                          '🔄 PhoneLoginScreen: Kiểm tra kết nối API...',
                        );
                        try {
                          final isApiReachable = await _checkApiConnection(
                            AppConfig.apiBaseUrl,
                          );

                          if (!isApiReachable) {
                            debugPrint(
                              '❌ PhoneLoginScreen: Không thể kết nối API',
                            );
                            if (!mounted) return;
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text(
                                  'Không thể kết nối máy chủ. Kiểm tra API_BASE_URL và kết nối mạng.',
                                ),
                              ),
                            );
                            return;
                          }

                          debugPrint(
                            '✅ PhoneLoginScreen: Kết nối API thành công',
                          );

                          // Gửi OTP và để AuthGate handle navigation automatically
                          debugPrint(
                            '📱 PhoneLoginScreen: Gửi OTP cho số $formattedPhone',
                          );
                          if (!mounted) return;
                          final auth = context.read<AuthProvider>();
                          try {
                            await auth.sendOtp(formattedPhone);
                            debugPrint(
                              '✅ PhoneLoginScreen: OTP đã gửi, thực hiện điều hướng đến màn hình nhập OTP',
                            );
                            if (!mounted) return;
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text(
                                  'Mã OTP đã được gửi. Vui lòng kiểm tra tin nhắn.',
                                ),
                              ),
                            );

                            Navigator.pushReplacement(
                              context,
                              MaterialPageRoute(
                                builder: (_) => OtpVerificationsScreen(
                                  phoneNumber: formattedPhone,
                                  verificationType: VerificationType.register,
                                ),
                              ),
                            );
                          } catch (e) {
                            debugPrint(
                              '❌ PhoneLoginScreen: Lỗi khi gửi OTP: $e',
                            );
                            if (!mounted) return;
                            final friendly = _mapSendOtpErrorToMessage(e);
                            ScaffoldMessenger.of(
                              context,
                            ).showSnackBar(SnackBar(content: Text(friendly)));
                          }
                        } catch (err) {
                          debugPrint('❌ PhoneLoginScreen: Lỗi xử lý: $err');
                          if (!mounted) return;
                          final friendly = _mapSendOtpErrorToMessage(err);
                          ScaffoldMessenger.of(
                            context,
                          ).showSnackBar(SnackBar(content: Text(friendly)));
                        } finally {
                          if (mounted) setState(() => _isLoading = false);
                          debugPrint(
                            '🔄 PhoneLoginScreen: Hoàn thành xử lý cho số $formattedPhone',
                          );
                        }
                      },
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.transparent,
                  shadowColor: Colors.transparent,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
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
                        'Tiếp tục',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
              ),
            ),

            const SizedBox(height: 24),

            // Divider
            // Row(
            //   children: [
            //     Expanded(
            //       child: Container(height: 1, color: const Color(0xFFE5E7EB)),
            //     ),
            //     Padding(
            //       padding: const EdgeInsets.symmetric(horizontal: 16),
            //       child: Text(
            //         'Hoặc',
            //         style: TextStyle(
            //           color: const Color(0xFF9CA3AF),
            //           fontSize: 13,
            //           fontWeight: FontWeight.w400,
            //         ),
            //       ),
            //     ),
            //     Expanded(
            //       child: Container(height: 1, color: const Color(0xFFE5E7EB)),
            //     ),
            //   ],
            // ),

            // const SizedBox(height: 24),

            // Google Login Button
            // Container(
            //   height: 50,
            //   decoration: BoxDecoration(
            //     borderRadius: BorderRadius.circular(12),
            //     border: Border.all(color: const Color(0xFFD1D5DB), width: 1),
            //     color: Colors.white,
            //   ),
            //   child: ElevatedButton.icon(
            //     onPressed: () {},
            //     style: ElevatedButton.styleFrom(
            //       backgroundColor: Colors.white,
            //       foregroundColor: const Color(0xFF374151),
            //       shadowColor: Colors.transparent,
            //       shape: RoundedRectangleBorder(
            //         borderRadius: BorderRadius.circular(12),
            //       ),
            //     ),
            //     icon: Image.asset(
            //       'assets/google_logo.png', // Sử dụng local asset thay vì network
            //       width: 18,
            //       height: 18,
            //       errorBuilder: (context, error, stackTrace) => const Icon(
            //         Icons.account_circle,
            //         color: Color(0xFFDB4437),
            //         size: 18,
            //       ),
            //     ),
            //     label: const Text(
            //       'Đăng nhập với Google',
            //       style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500),
            //     ),
            //   ),
            // ),

            //   Container(
            //   height: 56,
            //   decoration: BoxDecoration(
            //     borderRadius: BorderRadius.circular(18),
            //     border: Border.all(
            //       color: Colors.white.withOpacity(0.2),
            //       width: 1,
            //     ),
            //     color: Colors.white.withOpacity(0.05),
            //   ),
            //   child: ElevatedButton.icon(
            //     onPressed: () {},
            //     style: ElevatedButton.styleFrom(
            //       backgroundColor: Colors.transparent,
            //       shadowColor: Colors.transparent,
            //       shape: RoundedRectangleBorder(
            //       borderRadius: BorderRadius.circular(18),
            //     ),
            //   ),
            //   icon: Container(
            //     padding: const EdgeInsets.all(6),
            //     decoration: BoxDecoration(
            //     color: Colors.white,
            //     borderRadius: BorderRadius.circular(8),
            //   ),
            //   child: const Icon(
            //     Icons.g_mobiledata,
            //     color: Color(0xFFDB4437),
            //     size: 18,
            //   ),
            // ),
            // label: const Text(
            //   'Tiếp tục với Google',
            //   style: TextStyle(
            //     color: Colors.white,
            //     fontSize: 14,
            //     fontWeight: FontWeight.w500,
            //   ),
            // ),
            //   ),
            // ),
          ],
        ),
      ),
    );
  }

  String _mapSendOtpErrorToMessage(Object e) {
    final msg = e.toString().toLowerCase();
    if (msg.contains('debounce') || msg.contains('too many')) {
      return 'Bạn đã gửi quá nhiều yêu cầu. Vui lòng đợi một lát rồi thử lại.';
    }

    if ((msg.contains('invalid') && msg.contains('phone')) ||
        msg.contains('invalid phone') ||
        msg.contains('phone number')) {
      return 'Số điện thoại không hợp lệ. Vui lòng kiểm tra lại.';
    }

    if (msg.contains('illegal argument') && msg.contains('isolate')) {
      return 'Lỗi nội bộ: không thể kiểm tra kết nối mạng. Vui lòng thử lại.';
    }
    if (msg.contains('timeout') ||
        msg.contains('timed out') ||
        msg.contains('socket')) {
      return 'Không thể kết nối tới máy chủ. Vui lòng kiểm tra kết nối mạng.';
    }
    if (msg.contains('otp request failed') ||
        msg.contains('service unavailable')) {
      return 'Không thể gửi mã OTP ngay bây giờ. Vui lòng thử lại sau.';
    }
    // fallback
    return 'Lỗi khi gửi OTP: ${e.toString()}';
  }

  // Widget _buildBottomActions() {
  //   return Column(
  //     children: [
  //       // Register prompt
  //       Row(
  //         mainAxisAlignment: MainAxisAlignment.center,
  //         children: [
  //           Text(
  //             'Chưa có tài khoản? ',
  //             style: TextStyle(
  //               color: const Color(0xFF6B7280),
  //               fontSize: 14,
  //               fontWeight: FontWeight.w400,
  //             ),
  //           ),
  //           TextButton(
  //             onPressed: () {
  //               Navigator.push(
  //                 context,
  //                 MaterialPageRoute(builder: (_) => RegisterScreen()),
  //               );
  //             },
  //             child: const Text(
  //               'Đăng ký ngay',
  //               style: TextStyle(
  //                 color: Color(0xFF2E7BF0),
  //                 fontSize: 14,
  //                 fontWeight: FontWeight.w600,
  //               ),
  //             ),
  //           ),
  //         ],
  //       ),

  // Thêm nút đăng ký caregiver
  // Row(
  //   mainAxisAlignment: MainAxisAlignment.center,
  //   children: [
  //     Text(
  //       'Bạn là caregiver? ',
  //       style: TextStyle(
  //         color: const Color(0xFF6B7280),
  //         fontSize: 14,
  //         fontWeight: FontWeight.w400,
  //       ),
  //     ),
  //     TextButton(
  //       onPressed: () {
  //         Navigator.push(
  //           context,
  //           MaterialPageRoute(builder: (_) => RegisterCaregiverScreen()),
  //         );
  //       },
  //       child: const Text(
  //         'Đăng ký caregiver',
  //         style: TextStyle(
  //           color: Color(0xFF2E7BF0),
  //           fontSize: 14,
  //           fontWeight: FontWeight.w600,
  //         ),
  //       ),
  //     ),
  //   ],
  // ),

  // const SizedBox(height: 16),
  // Container(
  //   padding: const EdgeInsets.all(16),
  //   decoration: BoxDecoration(
  //     color: const Color(0xFF10B981).withOpacity(0.05),
  //     borderRadius: BorderRadius.circular(12),
  //     border: Border.all(
  //       color: const Color(0xFF10B981).withOpacity(0.1),
  //       width: 1,
  //     ),
  //   ),
  //   child: Row(
  //     children: [
  //       const Icon(Icons.shield, color: Color(0xFF10B981), size: 16),
  //       const SizedBox(width: 8),
  //       Expanded(
  //         child: Text(
  //           'Thông tin của bạn được bảo vệ bởi mã hóa SSL 256-bit',
  //           style: TextStyle(
  //             color: const Color(0xFF065F46),
  //             fontSize: 12,
  //             fontWeight: FontWeight.w400,
  //           ),
  //         ),
  //       ),
  //     ],
  //   ),
  // ),
  //       ],
  //     );
  //   }
  // }

  Future<bool> _checkApiConnection(String apiUrl) async {
    try {
      final uri = Uri.parse('$apiUrl/health');
      debugPrint('🔍 Testing API connection to: ${uri.toString()}');

      final response = await http.get(uri).timeout(const Duration(seconds: 10));
      debugPrint('📡 API connection test result: ${response.statusCode}');

      return response.statusCode == 200;
    } catch (e) {
      debugPrint('❌ API connection test failed: $e');
      return false;
    }
  }
}
