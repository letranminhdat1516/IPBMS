import 'package:detect_care_app/core/theme/app_theme.dart';
import 'package:detect_care_app/features/auth/providers/auth_provider.dart';
import 'package:detect_care_app/widgets/auth_gate.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'profile_constants.dart';

/// Save button for profile editing
class ProfileSaveButton extends StatelessWidget {
  final bool isLoading;
  final VoidCallback onPressed;

  const ProfileSaveButton({
    super.key,
    required this.isLoading,
    required this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.symmetric(vertical: 8),
      child: ElevatedButton.icon(
        icon: isLoading
            ? const SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                ),
              )
            : const Icon(Icons.save, color: Colors.white),
        label: Text(isLoading ? 'Đang lưu...' : 'Lưu thay đổi'),
        style: ElevatedButton.styleFrom(
          backgroundColor: AppTheme.primaryBlue,
          padding: const EdgeInsets.symmetric(vertical: 16),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(
              ProfileConstants.buttonBorderRadius,
            ),
          ),
          elevation: 4,
          shadowColor: AppTheme.primaryBlue.withValues(alpha: 77),
        ),
        onPressed: isLoading ? null : onPressed,
      ),
    );
  }
}

/// Logout button with confirmation dialog
class ProfileLogoutButton extends StatefulWidget {
  const ProfileLogoutButton({super.key});

  @override
  State<ProfileLogoutButton> createState() => _ProfileLogoutButtonState();
}

class _ProfileLogoutButtonState extends State<ProfileLogoutButton> {
  bool _isLoggingOut = false;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.symmetric(vertical: 8),
      child: OutlinedButton.icon(
        style: OutlinedButton.styleFrom(
          side: BorderSide(color: AppTheme.dangerColor, width: 1.5),
          padding: const EdgeInsets.symmetric(vertical: 16),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(
              ProfileConstants.buttonBorderRadius,
            ),
          ),
          backgroundColor: AppTheme.dangerColor.withValues(alpha: 13),
        ),
        icon: _isLoggingOut
            ? const SizedBox(
                width: 16,
                height: 16,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  valueColor: AlwaysStoppedAnimation<Color>(
                    AppTheme.dangerColor,
                  ),
                ),
              )
            : const Icon(Icons.logout, color: AppTheme.dangerColor),
        label: Text(
          _isLoggingOut ? 'Đang đăng xuất...' : 'Đăng xuất',
          style: const TextStyle(
            color: AppTheme.dangerColor,
            fontWeight: FontWeight.bold,
            fontSize: 16,
          ),
        ),
        onPressed: _isLoggingOut ? null : () => _showLogoutDialog(context),
      ),
    );
  }

  void _showLogoutDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(
            ProfileConstants.dialogBorderRadius,
          ),
        ),
        title: Row(
          children: [
            Icon(
              Icons.warning_amber_rounded,
              color: AppTheme.dangerColor,
              size: 28,
            ),
            const SizedBox(width: 12),
            const Text(
              'Xác nhận đăng xuất',
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
          ],
        ),
        content: const Text(
          'Bạn có chắc chắn muốn đăng xuất khỏi tài khoản?',
          style: TextStyle(fontSize: 16),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            style: TextButton.styleFrom(
              foregroundColor: AppTheme.textSecondary,
            ),
            child: const Text('Hủy', style: TextStyle(fontSize: 16)),
          ),
          ElevatedButton(
            onPressed: () => _handleLogout(context),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.dangerColor,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
              ),
            ),
            child: const Text(
              'Đăng xuất',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _handleLogout(BuildContext context) async {
    if (_isLoggingOut) {
      debugPrint(
        '⚠️ [ProfileLogoutButton] Logout already in progress, ignoring',
      );
      return;
    }

    setState(() {
      _isLoggingOut = true;
    });

    try {
      debugPrint('🔄 [ProfileLogoutButton] User confirmed logout');

      // Close dialog first
      if (context.mounted) {
        Navigator.pop(context);
      }

      debugPrint('🔄 [ProfileLogoutButton] Calling auth.logout()...');
      await context.read<AuthProvider>().logout();
      debugPrint('✅ [ProfileLogoutButton] auth.logout() completed');

      // Clear navigation stack and navigate to AuthGate
      if (context.mounted) {
        debugPrint('🔄 [ProfileLogoutButton] Clearing navigation stack...');
        await _clearNavigationAndNavigate(context);
        debugPrint('✅ [ProfileLogoutButton] Navigation stack cleared');
      }
    } catch (e) {
      debugPrint('❌ [ProfileLogoutButton] Error during logout: $e');
      if (context.mounted) {
        _showErrorSnackBar(context, 'Có lỗi xảy ra khi đăng xuất');
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoggingOut = false;
        });
      }
    }
  }

  Future<void> _clearNavigationAndNavigate(BuildContext context) async {
    await Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => const AuthGate()),
      (route) => false,
    );
  }

  void _showErrorSnackBar(BuildContext context, String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: AppTheme.dangerColor,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      ),
    );
  }
}
