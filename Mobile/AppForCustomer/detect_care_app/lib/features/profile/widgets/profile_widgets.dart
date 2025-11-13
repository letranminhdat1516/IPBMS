import 'package:detect_care_app/core/theme/app_theme.dart';
import 'package:flutter/material.dart';

import 'profile_constants.dart';

/// Widget for displaying profile information row
class ProfileInfoRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;

  const ProfileInfoRow({
    super.key,
    required this.icon,
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(vertical: 6),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(ProfileConstants.fieldBorderRadius),
        color: AppTheme.surfaceBackground,
        boxShadow: [
          BoxShadow(
            color: AppTheme.shadowColorLight,
            blurRadius: ProfileConstants.infoShadowBlur,
            offset: const Offset(0, 1),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: AppTheme.primaryBlue.withValues(alpha: 0.12 * 255),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(
              icon,
              color: AppTheme.primaryBlue,
              size: ProfileConstants.infoIconSize,
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: AppTheme.textMuted,
                    letterSpacing: 0.4,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  value.isNotEmpty ? value : 'Chưa cập nhật',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: value.isNotEmpty
                        ? AppTheme.text
                        : AppTheme.textMuted,
                  ),
                ),
              ],
            ),
          ),
          if (value.isNotEmpty) ...[
            const SizedBox(width: 8),
            Container(width: 1, height: 36, color: AppTheme.dividerColor),
            const SizedBox(width: 8),
            Icon(
              Icons.check_circle,
              color: AppTheme.accentGreen,
              size: ProfileConstants.checkIconSize,
            ),
          ],
        ],
      ),
    );
  }
}

/// Widget for profile edit field
class ProfileEditField extends StatelessWidget {
  final IconData icon;
  final String label;
  final TextEditingController controller;
  final TextInputType? keyboardType;
  final String? Function(String?)? validator;
  final int? maxLines;
  final String? hintText;

  const ProfileEditField({
    super.key,
    required this.icon,
    required this.label,
    required this.controller,
    this.keyboardType,
    this.validator,
    this.maxLines = 1,
    this.hintText,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(vertical: 6),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(ProfileConstants.fieldBorderRadius),
        color: AppTheme.surfaceBackground,
        boxShadow: [
          BoxShadow(
            color: AppTheme.shadowColorLight,
            blurRadius: ProfileConstants.fieldShadowBlur,
            offset: const Offset(0, 1),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            width: 54,
            height: 54,
            margin: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppTheme.primaryBlue.withValues(alpha: 0.08 * 255),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(
              icon,
              color: AppTheme.primaryBlue,
              size: ProfileConstants.editIconSize,
            ),
          ),
          Expanded(
            child: TextFormField(
              controller: controller,
              keyboardType: keyboardType,
              maxLines: maxLines,
              decoration: InputDecoration(
                labelText: label,
                hintText: hintText,
                labelStyle: TextStyle(
                  color: AppTheme.textSecondary,
                  fontWeight: FontWeight.w500,
                ),
                hintStyle: TextStyle(color: AppTheme.textMuted, fontSize: 14),
                border: InputBorder.none,
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 12,
                ),
                focusedBorder: InputBorder.none,
                enabledBorder: InputBorder.none,
                errorBorder: InputBorder.none,
                focusedErrorBorder: InputBorder.none,
              ),
              style: const TextStyle(color: AppTheme.text, fontSize: 16),
              validator: validator,
            ),
          ),
        ],
      ),
    );
  }
}

/// Widget for animated profile avatar with edit affordance
class ProfileAvatar extends StatelessWidget {
  final String? avatarUrl;
  final String? username;

  const ProfileAvatar({super.key, this.avatarUrl, this.username});

  @override
  Widget build(BuildContext context) {
    return Stack(
      alignment: Alignment.center,
      children: [
        Container(
          padding: const EdgeInsets.all(ProfileConstants.avatarBorderWidth),
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            gradient: LinearGradient(
              colors: [
                AppTheme.primaryBlue,
                AppTheme.primaryBlueLight,
                AppTheme.accentGreen,
              ],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
          ),
          child: Container(
            padding: const EdgeInsets.all(ProfileConstants.avatarInnerPadding),
            decoration: const BoxDecoration(
              shape: BoxShape.circle,
              color: AppTheme.cardBackground,
            ),
            child: CircleAvatar(
              radius: ProfileConstants.avatarRadius,
              backgroundColor: AppTheme.surfaceBackground,
              // If an avatarUrl is provided, show it as the background image
              backgroundImage: (avatarUrl != null && avatarUrl!.isNotEmpty)
                  ? NetworkImage(avatarUrl!)
                  : null,
              // Only show the placeholder icon when there is no image
              child: (avatarUrl != null && avatarUrl!.isNotEmpty)
                  ? null
                  : Icon(
                      Icons.person,
                      size: ProfileConstants.avatarIconSize,
                      color: AppTheme.textMuted,
                    ),
              onBackgroundImageError: (_, __) {
                // If loading the image fails, keep the placeholder icon visible
                // Note: CircleAvatar doesn't rebuild automatically here; callers
                // that provide avatarUrl should handle fallback if needed.
                // We log the error for debugging.
                // (No-op in this stateless widget to avoid setState.)
              },
            ),
          ),
        ),
        Positioned(
          right: ProfileConstants.avatarBorderWidth - 2,
          bottom: ProfileConstants.avatarBorderWidth - 2,
          child: Material(
            color: Colors.white,
            elevation: 1.5,
            shape: const CircleBorder(),
            child: InkWell(
              onTap: () {
                // TODO: hook up avatar picker
              },
              customBorder: const CircleBorder(),
              child: Padding(
                padding: const EdgeInsets.all(6.0),
                child: Icon(Icons.edit, size: 18, color: AppTheme.primaryBlue),
              ),
            ),
          ),
        ),
      ],
    );
  }
}
