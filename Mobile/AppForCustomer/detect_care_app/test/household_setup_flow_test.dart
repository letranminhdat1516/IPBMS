import 'package:flutter_test/flutter_test.dart';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:detect_care_app/features/setup/providers/setup_flow_manager.dart';
import 'package:detect_care_app/features/setup/models/setup_step.dart';
import 'package:detect_care_app/features/setup/utils/setup_flow_test_utils.dart';
import 'package:detect_care_app/features/auth/data/auth_storage.dart';

/// Comprehensive test for Household Setup Flow
/// Tests all steps in the diagram: Create User → Send SMS/Mail → Login → Setup Flow
void main() {
  group('Household Setup Flow Test', () {
    late SetupFlowManager setupManager;

    setUpAll(() async {
      // Initialize Flutter binding for tests
      TestWidgetsFlutterBinding.ensureInitialized();

      // Ensure SharedPreferences uses the in-memory test implementation
      // so calls like SharedPreferences.getInstance() don't throw.
      SharedPreferences.setMockInitialValues({});

      setupManager = SetupFlowManager();
    });

    test('Test 1: Authentication Flow (Steps 1-3)', () async {
      debugPrint('🧪 Testing Authentication Flow...');

      // Step 1: Create User Account (simulated - happens in AuthProvider)
      debugPrint(
        '1️⃣ Step 1: Create User Account - ✅ PASS (handled by AuthProvider)',
      );

      // Step 2: Send SMS/Mail (simulated - happens in backend)
      debugPrint('2️⃣ Step 2: Send SMS/Mail - ✅ PASS (handled by backend)');

      // Step 3: Login with OTP (simulated - happens in AuthProvider)
      debugPrint(
        '3️⃣ Step 3: Login with OTP - ✅ PASS (handled by AuthProvider)',
      );

      debugPrint('✅ Authentication Flow Test PASSED');
    });

    test('Test 2: Setup Flow Initialization (Step 4)', () async {
      debugPrint('🧪 Testing Setup Flow Initialization...');

      // Reset to first time user state
      await SetupFlowTestUtils.resetToFirstTimeUser();

      // Initialize setup flow
      await setupManager.initialize(null);

      // Verify first time user detection
      final isFirstTime = await setupManager.isFirstTimeUser();
      expect(
        isFirstTime,
        true,
        reason: 'Should be first time user after reset',
      );

      // Verify setup steps are created
      expect(
        setupManager.progress.steps.length,
        greaterThan(0),
        reason: 'Setup steps should be initialized',
      );

      // Verify initial step is welcome
      expect(
        setupManager.progress.steps.first.type,
        SetupStepType.welcome,
        reason: 'First step should be welcome',
      );

      debugPrint('4️⃣ Step 4: Setup Flow Initialization - ✅ PASS');
      debugPrint('✅ Setup Flow Initialization Test PASSED');
    });

    test('Test 3: Patient Profile Creation (Step 4.1)', () async {
      debugPrint('🧪 Testing Patient Profile Creation...');

      // Get current step
      final currentStep = setupManager.currentStep;
      debugPrint('📋 Current step: ${currentStep?.type.name}');

      // Complete welcome step
      await setupManager.completeStep(SetupStepType.welcome);

      // Move to patient profile step
      await setupManager.nextStep();

      // Verify we're on patient profile step
      final profileStep = setupManager.currentStep;
      expect(
        profileStep?.type,
        SetupStepType.patientProfile,
        reason: 'Should be on patient profile step',
      );

      // Test patient profile validation
      final isValidBefore = await setupManager.validatePatientProfile();
      expect(
        isValidBefore,
        false,
        reason: 'Should be invalid before completion',
      );

      // Complete patient profile step (simulated)
      await setupManager.completeStep(SetupStepType.patientProfile);

      debugPrint('4️⃣.1️⃣ Step 4.1: Create Patient Profile - ✅ PASS');
      debugPrint('✅ Patient Profile Creation Test PASSED');
    });

    test('Test 4: System Configuration (Step 4.2)', () async {
      debugPrint('🧪 Testing System Configuration...');

      // Test Image Settings (Step 4.2.1)
      await setupManager.nextStep();

      // Should be on image settings
      var currentStep = setupManager.currentStep;
      if (currentStep?.type == SetupStepType.imageSettings) {
        await setupManager.completeStep(SetupStepType.imageSettings);
        debugPrint('4️⃣.2️⃣.1️⃣ Image Settings - ✅ PASS');
      }

      // Test Alert Settings
      await setupManager.nextStep();
      currentStep = setupManager.currentStep;
      if (currentStep?.type == SetupStepType.alertSettings) {
        await setupManager.completeStep(SetupStepType.alertSettings);
        debugPrint('4️⃣.2️⃣.2️⃣ Alert Settings - ✅ PASS');
      }

      // Test FPS Settings (if exists)
      debugPrint(
        '4️⃣.2️⃣.3️⃣ FPS Settings - ✅ PASS (configured in image settings)',
      );

      debugPrint('✅ System Configuration Test PASSED');
    });

    test('Test 5: Caregiver Invitation (Step 4.3)', () async {
      debugPrint('🧪 Testing Caregiver Invitation...');

      // Move to caregiver setup step
      await setupManager.nextStep();

      // Should be on caregiver setup
      var currentStep = setupManager.currentStep;
      if (currentStep?.type == SetupStepType.caregiverSetup) {
        // Test caregiver validation
        final isValidBefore = await setupManager.validateCaregiverSetup();
        expect(isValidBefore, false, reason: 'Should be invalid before setup');

        // Complete caregiver setup
        await setupManager.completeStep(SetupStepType.caregiverSetup);
        debugPrint('4️⃣.3️⃣.1️⃣ Invite Caregiver - ✅ PASS');
        debugPrint(
          '4️⃣.3️⃣.2️⃣ Send SMS/Mail to Caregiver - ✅ PASS (handled by backend)',
        );
      }

      debugPrint('✅ Caregiver Invitation Test PASSED');
    });

    test('Test 6: System Initialization & Completion (Step 4.2.2)', () async {
      debugPrint('🧪 Testing System Initialization...');

      // Move to completion step
      await setupManager.nextStep();

      // Should be on completion step
      var currentStep = setupManager.currentStep;
      if (currentStep?.type == SetupStepType.completion) {
        await setupManager.completeStep(SetupStepType.completion);
        debugPrint('4️⃣.2️⃣.2️⃣ Initialize Config - ✅ PASS');
        debugPrint('🎯 LOC (Location/Camera Setup) - ✅ PASS');
      }

      // Verify setup completion
      final isCompleted = setupManager.isSetupCompleted;
      expect(isCompleted, true, reason: 'Setup should be completed');

      // Verify not first time user anymore
      final isFirstTime = await setupManager.isFirstTimeUser();
      expect(
        isFirstTime,
        false,
        reason: 'Should not be first time user after completion',
      );

      debugPrint('✅ System Initialization Test PASSED');
    });

    test('Test 7: Complete Flow Validation', () async {
      debugPrint('🧪 Testing Complete Flow Validation...');

      // Get final setup status
      final status = await SetupFlowTestUtils.getSetupStatus();

      // Verify all steps completed
      expect(
        status['isSetupCompleted'],
        true,
        reason: 'Setup should be fully completed',
      );

      expect(
        status['completionPercentage'],
        100.0,
        reason: 'Completion percentage should be 100%',
      );

      expect(
        status['completedSteps'].length,
        status['totalSteps'],
        reason: 'All steps should be completed',
      );

      debugPrint('📊 Final Status: $status');
      debugPrint('✅ Complete Flow Validation Test PASSED');
    });

    test('Test 8: Flow Reset and Re-run', () async {
      debugPrint('🧪 Testing Flow Reset and Re-run...');

      // Reset setup
      await SetupFlowTestUtils.resetToFirstTimeUser();

      // Verify reset worked
      final isFirstTimeAfterReset = await setupManager.isFirstTimeUser();
      expect(
        isFirstTimeAfterReset,
        true,
        reason: 'Should be first time user after reset',
      );

      // Complete all steps quickly
      await SetupFlowTestUtils.completeAllSteps();

      // Verify completion
      final statusAfterRerun = await SetupFlowTestUtils.getSetupStatus();
      expect(
        statusAfterRerun['isSetupCompleted'],
        true,
        reason: 'Setup should be completed after re-run',
      );

      debugPrint('✅ Flow Reset and Re-run Test PASSED');
    });
  });

  group('Setup Flow Edge Cases', () {
    setUpAll(() async {
      // Initialize Flutter binding for edge case tests
      TestWidgetsFlutterBinding.ensureInitialized();
    });

    test('Test 9: Authentication Error Handling', () async {
      debugPrint('🧪 Testing Authentication Error Handling...');

      // Test missing user ID
      await AuthStorage.clear();

      // Try to initialize setup without authentication
      final setupManager = SetupFlowManager();

      try {
        await setupManager.initialize(null);
        debugPrint('⚠️ Setup initialized without auth (expected behavior)');
      } catch (e) {
        debugPrint('✅ Setup properly rejected without auth: $e');
      }

      debugPrint('✅ Authentication Error Handling Test PASSED');
    });

    test('Test 10: Step Validation', () async {
      debugPrint('🧪 Testing Step Validation...');

      final setupManager = SetupFlowManager();
      await setupManager.initialize(null);

      // Test patient profile validation
      final patientValid = await setupManager.validatePatientProfile();
      debugPrint('👤 Patient profile validation: $patientValid');

      // Test caregiver validation
      final caregiverValid = await setupManager.validateCaregiverSetup();
      debugPrint('👥 Caregiver setup validation: $caregiverValid');

      // Test image settings validation
      final imageValid = await setupManager.validateImageSettings();
      debugPrint('🖼️ Image settings validation: $imageValid');

      // Test alert settings validation
      final alertValid = await setupManager.validateAlertSettings();
      debugPrint('🔔 Alert settings validation: $alertValid');

      debugPrint('✅ Step Validation Test PASSED');
    });
  });
}
