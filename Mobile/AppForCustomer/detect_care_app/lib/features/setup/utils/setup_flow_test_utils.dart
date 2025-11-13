import 'package:detect_care_app/features/setup/providers/setup_flow_manager.dart';
import 'package:detect_care_app/features/setup/models/setup_step.dart';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Utility class to help with testing and debugging the setup flow
class SetupFlowTestUtils {
  /// Reset setup flow to first time user state for testing
  static Future<void> resetToFirstTimeUser() async {
    final setupManager = SetupFlowManager();
    await setupManager.resetSetup(null);
    debugPrint('🔄 [SetupFlowTestUtils] Reset to first time user');
  }

  /// Complete entire setup for testing
  static Future<void> completeAllSteps() async {
    final setupManager = SetupFlowManager();
    await setupManager.initialize(null);

    // Complete all steps by completing each and advancing to the next step.
    final steps = List<SetupStep>.from(setupManager.progress.steps);
    for (final step in steps) {
      await setupManager.completeStep(step.type);
      // Advance to the next step if available
      if (setupManager.hasNextStep) {
        await setupManager.nextStep();
      }
    }

    // Populate SharedPreferences with the expected keys so validators pass
    // during completeSetup(). Tests use the in-memory SharedPreferences mock.
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('patient_name', 'Test User');
      await prefs.setString('patient_dob', '2000-01-01');
      await prefs.setString('patient_gender', 'other');
      await prefs.setString('caregiver_data', '[]');
      await prefs.setString('image_monitoring_mode', 'motion');
      await prefs.setBool('alert_master_notifications', true);
      await prefs.setBool('alert_app_notifications', true);
    } catch (e) {
      debugPrint('Error populating prefs for test completion: $e');
    }

    // Ensure the flow is marked completed
    await setupManager.completeSetup(null);

    debugPrint('✅ [SetupFlowTestUtils] Completed all setup steps');
  }

  /// Get current setup status for debugging
  static Future<Map<String, dynamic>> getSetupStatus() async {
    final setupManager = SetupFlowManager();
    await setupManager.initialize(null);

    final status = {
      'isFirstTimeUser': await setupManager.isFirstTimeUser(),
      'isSetupCompleted': setupManager.isSetupCompleted,
      'currentStepIndex': setupManager.progress.currentStepIndex,
      // Return as 0-100 percentage for easier assertions in tests
      'completionPercentage': setupManager.completionPercentage * 100.0,
      'completedSteps': setupManager.progress.steps
          .where((step) => step.isCompleted)
          .map((step) => step.type.name)
          .toList(),
      'totalSteps': setupManager.progress.steps.length,
    };

    debugPrint('📊 [SetupFlowTestUtils] Setup Status: $status');
    return status;
  }

  /// Show debug dialog with setup status
  static Future<void> showSetupDebugDialog(BuildContext context) async {
    final status = await getSetupStatus();

    if (!context.mounted) return;

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Setup Flow Debug'),
        content: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              _buildStatusRow(
                'First Time User',
                status['isFirstTimeUser'].toString(),
              ),
              _buildStatusRow(
                'Setup Completed',
                status['isSetupCompleted'].toString(),
              ),
              _buildStatusRow(
                'Current Step',
                status['currentStepIndex'].toString(),
              ),
              _buildStatusRow(
                'Progress',
                '${(status['completionPercentage']).toInt()}%',
              ),
              _buildStatusRow('Total Steps', status['totalSteps'].toString()),
              const SizedBox(height: 16),
              const Text(
                'Completed Steps:',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              ...status['completedSteps'].map<Widget>(
                (step) => Padding(
                  padding: const EdgeInsets.only(left: 16),
                  child: Text('• $step'),
                ),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Close'),
          ),
          TextButton(
            onPressed: () async {
              Navigator.of(context).pop();
              await resetToFirstTimeUser();
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Reset to first time user')),
                );
              }
            },
            child: const Text('Reset'),
          ),
          TextButton(
            onPressed: () async {
              Navigator.of(context).pop();
              await completeAllSteps();
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Completed all steps')),
                );
              }
            },
            child: const Text('Complete All'),
          ),
        ],
      ),
    );
  }

  static Widget _buildStatusRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        children: [
          Expanded(child: Text('$label:')),
          Text(value, style: const TextStyle(fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }
}
