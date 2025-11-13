import 'package:flutter/material.dart';
import 'package:detect_care_app/features/setup/utils/setup_flow_test_utils.dart';

/// Demo screen to test setup flow functionality
/// This can be accessed during development for testing
class SetupFlowDemo extends StatelessWidget {
  const SetupFlowDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Setup Flow Demo'),
        backgroundColor: const Color(0xFF2E7BF0),
        foregroundColor: Colors.white,
      ),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text(
              'Setup Flow Testing',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: Color(0xFF1E293B),
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 32),

            _buildDemoCard(
              context,
              icon: Icons.refresh,
              title: 'Reset to First Time User',
              subtitle:
                  'Clears all setup progress and makes user go through setup again',
              color: Colors.orange,
              onTap: () async {
                await SetupFlowTestUtils.resetToFirstTimeUser();
                if (context.mounted) {
                  _showSnackBar(context, 'Reset to first time user complete!');
                }
              },
            ),

            const SizedBox(height: 16),

            _buildDemoCard(
              context,
              icon: Icons.check_circle,
              title: 'Complete All Steps',
              subtitle: 'Marks all setup steps as completed for testing',
              color: Colors.green,
              onTap: () async {
                await SetupFlowTestUtils.completeAllSteps();
                if (context.mounted) {
                  _showSnackBar(context, 'All setup steps completed!');
                }
              },
            ),

            const SizedBox(height: 16),

            _buildDemoCard(
              context,
              icon: Icons.info,
              title: 'Show Setup Status',
              subtitle: 'Display current setup progress and debug information',
              color: const Color(0xFF2E7BF0),
              onTap: () async {
                await SetupFlowTestUtils.showSetupDebugDialog(context);
              },
            ),

            const SizedBox(height: 32),

            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.amber.shade50,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.amber.shade200),
              ),
              child: Column(
                children: [
                  Icon(
                    Icons.warning_amber,
                    color: Colors.amber.shade700,
                    size: 32,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Development Tool',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: Colors.amber.shade700,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'This screen is for testing setup flow during development. Remove from production build.',
                    style: TextStyle(
                      fontSize: 14,
                      color: Colors.amber.shade700,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDemoCard(
    BuildContext context, {
    required IconData icon,
    required String title,
    required String subtitle,
    required Color color,
    required VoidCallback onTap,
  }) {
    return Card(
      elevation: 2,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, color: color, size: 24),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF1E293B),
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      subtitle,
                      style: TextStyle(
                        fontSize: 14,
                        color: Colors.grey.shade600,
                      ),
                    ),
                  ],
                ),
              ),
              Icon(
                Icons.arrow_forward_ios,
                color: Colors.grey.shade400,
                size: 16,
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showSnackBar(BuildContext context, String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: const Color(0xFF10B981),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }
}
