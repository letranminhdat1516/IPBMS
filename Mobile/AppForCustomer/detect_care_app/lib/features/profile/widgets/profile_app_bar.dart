import 'package:detect_care_app/core/theme/app_theme.dart';
import 'package:flutter/material.dart';
import 'profile_constants.dart';

/// Animated AppBar for profile screen
class ProfileAppBar extends StatelessWidget implements PreferredSizeWidget {
  final bool isEditing;
  final VoidCallback onEditToggle;
  final VoidCallback onBackPressed;

  const ProfileAppBar({
    super.key,
    required this.isEditing,
    required this.onEditToggle,
    required this.onBackPressed,
  });

  @override
  Size get preferredSize => const Size.fromHeight(kToolbarHeight);

  @override
  Widget build(BuildContext context) {
    return AppBar(
      backgroundColor: AppTheme.scaffoldBackground,
      elevation: 0,
      centerTitle: true,
      title: AnimatedSwitcher(
        duration: ProfileConstants.switchDuration,
        child: Text(
          isEditing ? 'Chỉnh sửa hồ sơ' : 'Hồ sơ cá nhân',
          key: ValueKey<bool>(isEditing),
          style: const TextStyle(
            color: AppTheme.primaryBlue,
            fontSize: 18,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
      leading: IconButton(
        icon: AnimatedSwitcher(
          duration: ProfileConstants.iconSwitchDuration,
          child: Icon(
            isEditing ? Icons.close : Icons.arrow_back_ios_new,
            key: ValueKey<bool>(isEditing),
            color: AppTheme.primaryBlue,
          ),
        ),
        onPressed: onBackPressed,
      ),
      actions: [
        AnimatedSwitcher(
          duration: ProfileConstants.iconSwitchDuration,
          child: IconButton(
            key: ValueKey<bool>(isEditing),
            icon: Icon(
              isEditing ? Icons.check : Icons.edit,
              color: isEditing ? AppTheme.accentGreen : AppTheme.textMuted,
            ),
            onPressed: onEditToggle,
          ),
        ),
      ],
    );
  }
}
