import 'package:flutter/material.dart';
import '../widgets/fcm_quick_send_sheet.dart';

/// Utility class for showing FCM quick send sheet
class FcmQuickSendUtils {
  /// Shows the FCM quick send sheet as a modal bottom sheet
  ///
  /// Returns a Future that completes when the sheet is dismissed
  static Future<void> showQuickSend(BuildContext context) {
    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      isDismissible: true,
      enableDrag: true,
      builder: (context) => const FcmQuickSendSheet(),
    );
  }

  /// Shows the FCM quick send sheet with custom configuration
  ///
  /// [isDismissible] - whether the sheet can be dismissed by tapping outside
  /// [enableDrag] - whether the sheet can be dragged to dismiss
  /// [useRootNavigator] - whether to use the root navigator
  static Future<void> showQuickSendCustom(
    BuildContext context, {
    bool isDismissible = true,
    bool enableDrag = true,
    bool useRootNavigator = false,
  }) {
    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      isDismissible: isDismissible,
      enableDrag: enableDrag,
      useRootNavigator: useRootNavigator,
      builder: (context) => const FcmQuickSendSheet(),
    );
  }

  /// Shows a floating action button that opens the FCM quick send sheet
  ///
  /// This can be used as a FloatingActionButton in Scaffold
  static Widget buildQuickSendFAB(
    BuildContext context, {
    String? heroTag,
    Color? backgroundColor,
    Color? foregroundColor,
  }) {
    return FloatingActionButton.extended(
      heroTag: heroTag,
      backgroundColor: backgroundColor ?? Theme.of(context).primaryColor,
      foregroundColor: foregroundColor ?? Colors.white,
      onPressed: () => showQuickSend(context),
      icon: const Icon(Icons.notifications_active_rounded),
      label: const Text('Gửi thông báo'),
    );
  }

  /// Shows an app bar action that opens the FCM quick send sheet
  ///
  /// This can be used in AppBar actions
  static Widget buildQuickSendAction(
    BuildContext context, {
    Color? iconColor,
    double? iconSize,
  }) {
    return IconButton(
      onPressed: () => showQuickSend(context),
      icon: Icon(
        Icons.notifications_active_rounded,
        color: iconColor,
        size: iconSize,
      ),
      tooltip: 'Gửi thông báo',
    );
  }

  /// Shows a text button that opens the FCM quick send sheet
  ///
  /// This can be used inline in other UI components
  static Widget buildQuickSendButton(
    BuildContext context, {
    String? text,
    TextStyle? style,
    ButtonStyle? buttonStyle,
  }) {
    return TextButton.icon(
      onPressed: () => showQuickSend(context),
      icon: const Icon(Icons.notifications_active_rounded),
      label: Text(text ?? 'Gửi thông báo'),
      style: buttonStyle,
    );
  }

  /// Shows an elevated button that opens the FCM quick send sheet
  ///
  /// This can be used as a prominent call-to-action
  static Widget buildQuickSendElevatedButton(
    BuildContext context, {
    String? text,
    ButtonStyle? style,
    bool isLoading = false,
  }) {
    return ElevatedButton.icon(
      onPressed: isLoading ? null : () => showQuickSend(context),
      icon: isLoading
          ? const SizedBox(
              width: 20,
              height: 20,
              child: CircularProgressIndicator(strokeWidth: 2),
            )
          : const Icon(Icons.notifications_active_rounded),
      label: Text(text ?? 'Gửi thông báo'),
      style: style,
    );
  }
}
