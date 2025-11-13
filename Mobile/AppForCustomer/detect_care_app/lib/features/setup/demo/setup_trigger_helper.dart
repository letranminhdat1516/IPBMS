// Helper để trigger setup flow từ bất kỳ đâu trong app
// Sử dụng trong development và testing

import 'package:flutter/material.dart';
import '../utils/setup_flow_test_utils.dart';

class SetupTriggerHelper {
  /// Trigger setup flow bằng cách reset về first-time user và navigate
  static Future<void> triggerSetupFlow(BuildContext context) async {
    try {
      // Reset to first-time user
      await SetupFlowTestUtils.resetToFirstTimeUser();

      // Navigate to setup flow
      if (context.mounted) {
        Navigator.of(context).pushReplacementNamed('/setup');
      }
    } catch (e) {
      debugPrint('Error triggering setup flow: $e');
      if (context.mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Error triggering setup: $e')));
      }
    }
  }

  /// Navigate trực tiếp đến setup flow (không reset state)
  static void navigateToSetup(BuildContext context) {
    Navigator.of(context).pushNamed('/setup');
  }

  /// Reset setup state về first-time user
  static Future<void> resetToFirstTime() async {
    await SetupFlowTestUtils.resetToFirstTimeUser();
  }

  /// Complete tất cả steps (for testing)
  static Future<void> completeAllSteps() async {
    await SetupFlowTestUtils.completeAllSteps();
  }

  /// Show debug dialog
  static Future<void> showDebugInfo(BuildContext context) async {
    await SetupFlowTestUtils.showSetupDebugDialog(context);
  }

  /// Floating action button để quick trigger setup flow
  static Widget buildTriggerFAB(BuildContext context) {
    return FloatingActionButton.extended(
      onPressed: () => triggerSetupFlow(context),
      icon: const Icon(Icons.settings),
      label: const Text('Setup'),
      backgroundColor: Colors.blue[600],
    );
  }

  /// Quick trigger button widget
  static Widget buildTriggerButton(BuildContext context, {String? label}) {
    return ElevatedButton.icon(
      onPressed: () => triggerSetupFlow(context),
      icon: const Icon(Icons.settings),
      label: Text(label ?? 'Trigger Setup Flow'),
      style: ElevatedButton.styleFrom(
        backgroundColor: Colors.blue[600],
        foregroundColor: Colors.white,
      ),
    );
  }

  /// Debug menu với tất cả options
  static void showDebugMenu(BuildContext context) {
    showModalBottomSheet(
      context: context,
      builder: (context) => Container(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text(
              'Setup Flow Debug Menu',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),

            ListTile(
              leading: const Icon(Icons.play_arrow),
              title: const Text('Trigger Setup Flow'),
              subtitle: const Text('Reset & start setup'),
              onTap: () {
                Navigator.pop(context);
                triggerSetupFlow(context);
              },
            ),

            ListTile(
              leading: const Icon(Icons.refresh),
              title: const Text('Reset to First Time'),
              subtitle: const Text('Reset setup state only'),
              onTap: () async {
                Navigator.pop(context);
                await resetToFirstTime();
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Reset to first-time user!')),
                  );
                }
              },
            ),

            ListTile(
              leading: const Icon(Icons.check_circle),
              title: const Text('Complete All Steps'),
              subtitle: const Text('Mark all steps as completed'),
              onTap: () async {
                Navigator.pop(context);
                await completeAllSteps();
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('All steps completed!')),
                  );
                }
              },
            ),

            ListTile(
              leading: const Icon(Icons.info),
              title: const Text('Show Debug Info'),
              subtitle: const Text('View current setup status'),
              onTap: () {
                Navigator.pop(context);
                showDebugInfo(context);
              },
            ),

            ListTile(
              leading: const Icon(Icons.launch),
              title: const Text('Navigate to Setup'),
              subtitle: const Text('Go to setup (no reset)'),
              onTap: () {
                Navigator.pop(context);
                navigateToSetup(context);
              },
            ),
          ],
        ),
      ),
    );
  }
}
