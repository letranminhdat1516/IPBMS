import 'package:detect_care_app/features/auth/providers/auth_provider.dart';
import 'package:detect_care_app/features/auth/screens/otp_verifications_screen.dart';
import 'package:detect_care_app/features/auth/screens/phone_login_screen.dart';
import 'package:detect_care_app/widgets/setup_gate.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

class AuthGate extends StatelessWidget {
  const AuthGate({super.key});
  @override
  Widget build(BuildContext context) {
    return Consumer<AuthProvider>(
      builder: (_, auth, __) {
        debugPrint('🔄 [AuthGate] Rebuilding with status: ${auth.status}');

        switch (auth.status) {
          case AuthStatus.loading:
            debugPrint(
              '⏳ [AuthGate] Auth loading - showing SetupGate for setup check',
            );
            return const SetupGate();
          case AuthStatus.unauthenticated:
            debugPrint('🔓 [AuthGate] Showing PhoneLoginScreen');
            return const PhoneLoginScreen();
          case AuthStatus.otpSent:
            debugPrint('📱 [AuthGate] Showing OtpVerificationsScreen');
            return OtpVerificationsScreen(
              phoneNumber: auth.pendingPhone!,
              verificationType: VerificationType.register,
            );
          case AuthStatus.otpVerified:
            debugPrint('✅ [AuthGate] Showing SetupGate (otpVerified)');
            return const SetupGate();
          case AuthStatus.authenticated:
            debugPrint('🏠 [AuthGate] Showing SetupGate (authenticated)');
            return const SetupGate();
        }
      },
    );
  }
}
