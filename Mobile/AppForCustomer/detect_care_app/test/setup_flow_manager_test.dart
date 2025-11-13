import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:detect_care_app/features/setup/providers/setup_flow_manager.dart';
import 'package:detect_care_app/features/setup/data/setup_progress_repository.dart';
import 'package:detect_care_app/features/setup/models/setup_step.dart';

void main() {
  group('SetupFlowManager auto-skip patient profile', () {
    test('auto-skips when patient data exists in SharedPreferences', () async {
      // Mock SharedPreferences to contain patient data
      SharedPreferences.setMockInitialValues({
        'patient_name': 'Nguyen Van A',
        'patient_dob': '1990-05-20',
        'patient_gender': 'male',
      });

      final repo = SetupProgressRepository();
      final manager = SetupFlowManager(repository: repo);

      // initialize with no BuildContext (allowed)
      await manager.initialize(null);

      expect(
        manager.autoSkippedPatientProfile,
        isTrue,
        reason: 'Should mark auto-skipped when patient data present',
      );

      // Ensure the patientProfile step is marked completed
      final completed = manager.isStepCompleted(SetupStepType.patientProfile);
      expect(completed, isTrue);
    });
  });
}
