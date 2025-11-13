// Integration test for Setup Flow
// Run with: flutter test test/setup_flow_integration_test.dart

import 'package:flutter_test/flutter_test.dart';
import 'package:detect_care_app/features/setup/models/setup_step.dart';
import 'package:detect_care_app/features/setup/models/setup_progress.dart';
import 'package:detect_care_app/features/setup/providers/setup_flow_manager.dart';
import 'package:detect_care_app/features/setup/data/setup_progress_repository.dart';

/// Test-specific repository that uses in-memory storage instead of SharedPreferences
class TestSetupProgressRepository implements SetupProgressRepository {
  static const String _setupProgressKey = 'household_setup_progress';
  static const String _isFirstTimeUserKey = 'is_first_time_user';

  final Map<String, dynamic> _storage = {};

  @override
  Future<SetupProgress> getSetupProgress() async {
    final progressJson = _storage[_setupProgressKey];
    if (progressJson == null) {
      return _createDefaultSetupProgress();
    }
    return SetupProgress.fromJson(progressJson);
  }

  @override
  Future<void> saveSetupProgress(SetupProgress progress) async {
    _storage[_setupProgressKey] = progress.toJson();
  }

  @override
  Future<bool> isFirstTimeUser() async {
    return _storage[_isFirstTimeUserKey] ?? true;
  }

  @override
  Future<void> setFirstTimeUser(bool isFirstTime) async {
    _storage[_isFirstTimeUserKey] = isFirstTime;
  }

  @override
  Future<void> clearSetupProgress() async {
    _storage.remove(_setupProgressKey);
    _storage[_isFirstTimeUserKey] = true;
  }

  SetupProgress _createDefaultSetupProgress() {
    return SetupProgress(
      steps: [
        SetupStep(
          type: SetupStepType.welcome,
          title: 'Welcome',
          description: 'Welcome to the setup',
          isCompleted: false,
          order: 0,
        ),
        SetupStep(
          type: SetupStepType.patientProfile,
          title: 'Patient Profile',
          description: 'Set up patient profile',
          isCompleted: false,
          order: 1,
        ),
        SetupStep(
          type: SetupStepType.caregiverSetup,
          title: 'Caregiver Setup',
          description: 'Set up caregiver information',
          isCompleted: false,
          order: 2,
        ),
        SetupStep(
          type: SetupStepType.imageSettings,
          title: 'Image Settings',
          description: 'Configure image settings',
          isCompleted: false,
          order: 3,
        ),
        SetupStep(
          type: SetupStepType.alertSettings,
          title: 'Alert Settings',
          description: 'Configure alert preferences',
          isCompleted: false,
          order: 4,
        ),
        SetupStep(
          type: SetupStepType.completion,
          title: 'Complete',
          description: 'Setup is complete',
          isCompleted: false,
          order: 5,
        ),
      ],
    );
  }
}

void main() {
  late SetupFlowManager setupManager;
  late TestSetupProgressRepository repository;

  setUp(() {
    repository = TestSetupProgressRepository();
    setupManager = SetupFlowManager(repository: repository);
  });

  group('Setup Flow Integration Tests', () {
    test('Setup flow initialization creates default steps', () async {
      await setupManager.initialize(null);

      expect(setupManager.progress.steps.length, equals(6));
      expect(setupManager.progress.currentStepIndex, equals(0));
      expect(setupManager.isSetupCompleted, isFalse);

      // Check all step types are present
      final stepTypes = setupManager.progress.steps
          .map((step) => step.type)
          .toList();
      expect(stepTypes, contains(SetupStepType.welcome));
      expect(stepTypes, contains(SetupStepType.patientProfile));
      expect(stepTypes, contains(SetupStepType.caregiverSetup));
      expect(stepTypes, contains(SetupStepType.imageSettings));
      expect(stepTypes, contains(SetupStepType.alertSettings));
      expect(stepTypes, contains(SetupStepType.completion));
    });

    test('First time user check works correctly', () async {
      await setupManager.initialize(null);

      // Should be first time user initially
      final isFirstTime = await setupManager.isFirstTimeUser();
      expect(isFirstTime, isTrue);

      // After completing setup, should not be first time user
      await setupManager.completeSetup(null);
      final isFirstTimeAfter = await setupManager.isFirstTimeUser();
      expect(isFirstTimeAfter, isFalse);
    });

    test('Setup progress can be saved and loaded', () async {
      await setupManager.initialize(null);

      // Complete first step
      await setupManager.completeStep(SetupStepType.welcome);
      // `completeStep` now only marks the step completed; advance explicitly
      await setupManager.nextStep();

      expect(setupManager.progress.currentStepIndex, equals(1));
      expect(setupManager.progress.steps[0].isCompleted, isTrue);

      // Create new manager with the SAME repository to load progress
      final newManager = SetupFlowManager(repository: repository);
      await newManager.initialize(null);

      // Verify progress was loaded correctly
      expect(newManager.progress.currentStepIndex, equals(1));
      expect(newManager.progress.steps[0].isCompleted, isTrue);
    });

    test('Setup completion marks setup as completed', () async {
      await setupManager.initialize(null);

      await setupManager.completeSetup(null);

      expect(setupManager.isSetupCompleted, isTrue);
      expect(setupManager.progress.isSetupCompleted, isTrue);
    });

    test('Progress percentage calculation works correctly', () async {
      await setupManager.initialize(null);

      // Initially 0% complete
      expect(setupManager.progress.completionPercentage, equals(0.0));

      // Complete first step (1/6 = ~16.67%)
      await setupManager.completeStep(SetupStepType.welcome);
      await setupManager.nextStep();
      expect(setupManager.progress.completionPercentage, closeTo(0.1667, 0.01));

      // Complete setup (marks as completed but doesn't complete all steps)
      await setupManager.completeSetup(null);
      expect(setupManager.isSetupCompleted, isTrue);
      // Percentage should still be based on actual completed steps
      expect(setupManager.progress.completionPercentage, closeTo(0.1667, 0.01));
    });
  });
}
