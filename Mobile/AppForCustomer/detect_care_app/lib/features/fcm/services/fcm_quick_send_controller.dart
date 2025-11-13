import 'package:detect_care_app/core/config/app_config.dart';
import 'package:detect_care_app/core/network/api_client.dart';
import 'package:detect_care_app/features/auth/data/auth_storage.dart';
import 'package:flutter/foundation.dart';

import '../../assignments/data/assignments_remote_data_source.dart';
import '../data/fcm_endpoints.dart';
import '../data/fcm_remote_data_source.dart';
import 'fcm_registration.dart';

class FcmQuickSendController {
  final FcmRemoteDataSource _fcmDs;
  final FcmRegistration _fcmReg;
  final AssignmentsRemoteDataSource _assignDs;

  FcmQuickSendController._(this._fcmDs, this._fcmReg, this._assignDs);

  factory FcmQuickSendController.create() {
    final fcmDs = FcmRemoteDataSource(
      api: ApiClient(tokenProvider: AuthStorage.getAccessToken),
      endpoints: FcmEndpoints(AppConfig.apiBaseUrl),
    );
    return FcmQuickSendController._(
      fcmDs,
      FcmRegistration(fcmDs),
      AssignmentsRemoteDataSource(),
    );
  }

  Future<List<String>> _getAcceptedActiveCustomerIds() async {
    debugPrint('🔍 FcmController: Starting _getAcceptedActiveCustomerIds()...');

    final list = await _assignDs.listPending();
    debugPrint('🔍 FcmController: Found ${list.length} assignments');

    if (list.isEmpty) {
      debugPrint('❌ FcmController: No assignments returned from API');
      return [];
    }

    for (final a in list) {
      debugPrint(
        '   Assignment: ID=${a.assignmentId}, Status="${a.status}", Active=${a.isActive}, CustomerID=${a.customerId}',
      );
    }

    final filtered = list
        .where((a) {
          final status = a.status?.toLowerCase();
          final isValidStatus =
              (status == 'accepted' ||
              status == 'active' ||
              status == 'approved');
          final isActive = a.isActive;

          debugPrint(
            '     Checking assignment ${a.assignmentId}: status="$status" isValidStatus=$isValidStatus, isActive=$isActive',
          );

          return isValidStatus && isActive;
        })
        .map((a) => a.customerId)
        .where((id) => id.isNotEmpty)
        .toSet()
        .toList();

    debugPrint(
      '🔍 FcmController: Filtered ${filtered.length} customer IDs: $filtered',
    );

    if (filtered.isEmpty) {
      debugPrint('❌ FcmController: No valid customer IDs after filtering');
    }

    return filtered;
  }

  Future<Map<String, dynamic>> sendMessage({
    required String caregiverId,
    required String message,
    String? toCustomerId,
  }) async {
    debugPrint('🚀 [FcmController] sendMessage started');
    debugPrint('👨‍⚕️ [FcmController] Caregiver ID: $caregiverId');
    debugPrint(
      '💬 [FcmController] Message: "$message" (${message.length} chars)',
    );
    debugPrint('🎯 [FcmController] Target customer: ${toCustomerId ?? "ALL"}');

    if (message.trim().isEmpty) {
      debugPrint('❌ [FcmController] Message is empty');
      throw ArgumentError('Message không được để trống');
    }

    if (message.length > 512) {
      debugPrint('❌ [FcmController] Message too long: ${message.length}/512');
      throw ArgumentError('Message không được dài quá 512 ký tự');
    }

    debugPrint('📱 [FcmController] Registering FCM token for caregiver...');
    await _fcmReg.registerForUser(caregiverId, type: 'device');
    await _fcmReg.getCurrentTokenSafely();

    final List<String> toUserIds;
    if (toCustomerId == null || toCustomerId.isEmpty) {
      debugPrint('👥 [FcmController] Getting all active customers...');
      toUserIds = await _getAcceptedActiveCustomerIds();
    } else {
      debugPrint(
        '🎯 [FcmController] Targeting specific customer: $toCustomerId',
      );
      toUserIds = [toCustomerId];
    }

    debugPrint('📤 [FcmController] Final recipient list: $toUserIds');

    if (toUserIds.isEmpty) {
      debugPrint('❌ [FcmController] No recipients found');
      return {'successCount': 0, 'failureCount': 0, 'info': 'no_recipients'};
    }

    if (toUserIds.length > 50) {
      debugPrint(
        '❌ [FcmController] Too many recipients: ${toUserIds.length}/50',
      );
      throw ArgumentError('Không thể gửi cho quá 50 người nhận');
    }

    debugPrint('🚀 [FcmController] Sending FCM message...');
    return await _fcmDs.pushMessage(
      toUserIds: toUserIds,
      direction: 'caregiver_to_customer',
      category: 'report',
      message: message,
      fromUserId: caregiverId,
    );
  }

  Future<List<String>> _getAcceptedActiveCaregiverIds() async {
    debugPrint(
      '🔍 FcmController: Starting _getAcceptedActiveCaregiverIds()...',
    );

    try {
      final list = await _assignDs.listPending();
      debugPrint('🔍 FcmController: API returned ${list.length} assignments');

      if (list.isEmpty) {
        debugPrint('❌ FcmController: No assignments returned from API');
        return [];
      }

      for (final a in list) {
        debugPrint(
          '   Assignment: ID=${a.assignmentId}, Status="${a.status}", Active=${a.isActive}, CaregiverID=${a.caregiverId}',
        );
        debugPrint(
          '     Raw assignment data: assignmentId=${a.assignmentId.length} chars, caregiverId=${a.caregiverId.length} chars',
        );
      }

      final filtered = list
          .where((a) {
            final status = a.status?.toLowerCase();
            final isValidStatus =
                (status == 'accepted' ||
                status == 'active' ||
                status == 'approved');
            final isActive = a.isActive;
            final hasValidCaregiver =
                a.caregiverId.isNotEmpty &&
                a.caregiverId.length > 10; // Basic UUID check

            debugPrint(
              '     Checking assignment ${a.assignmentId}: status="$status" isValidStatus=$isValidStatus, isActive=$isActive, hasValidCaregiver=$hasValidCaregiver',
            );

            return isValidStatus && isActive && hasValidCaregiver;
          })
          .map((a) => a.caregiverId)
          .where((id) => id.isNotEmpty)
          .toSet()
          .toList();

      debugPrint(
        '🔍 FcmController: Filtered ${filtered.length} caregiver IDs: $filtered',
      );

      if (filtered.isEmpty) {
        debugPrint('❌ FcmController: No valid caregiver IDs after filtering');
        debugPrint(
          '❌ Original assignments: ${list.map((a) => 'ID=${a.assignmentId}, Status=${a.status}, Active=${a.isActive}, CaregiverID=${a.caregiverId}').join('; ')}',
        );
      }

      return filtered;
    } catch (e) {
      debugPrint(
        '❌ FcmController: Error in _getAcceptedActiveCaregiverIds: $e',
      );
      rethrow;
    }
  }

  Future<Map<String, dynamic>> sendMessageAsCustomer({
    required String customerId,
    required String message,
    String? toCaregiverId,
  }) async {
    debugPrint('🚀 [FcmController] sendMessageAsCustomer started');
    debugPrint('👤 [FcmController] Customer ID: $customerId');
    debugPrint(
      '💬 [FcmController] Message: "$message" (${message.length} chars)',
    );
    debugPrint(
      '🎯 [FcmController] Target caregiver: ${toCaregiverId ?? "ALL"}',
    );

    if (message.trim().isEmpty) {
      debugPrint('❌ [FcmController] Message is empty');
      throw ArgumentError('Message không được để trống');
    }

    if (message.length > 512) {
      debugPrint('❌ [FcmController] Message too long: ${message.length}/512');
      throw ArgumentError('Message không được dài quá 512 ký tự');
    }

    debugPrint('📱 [FcmController] Registering FCM token for customer...');
    await _fcmReg.registerForUser(customerId, type: 'device');
    await _fcmReg.getCurrentTokenSafely();

    final List<String> toUserIds;
    if (toCaregiverId == null || toCaregiverId.isEmpty) {
      debugPrint('� [FcmController] Getting all active caregivers...');
      toUserIds = await _getAcceptedActiveCaregiverIds();
    } else {
      debugPrint(
        '🎯 [FcmController] Targeting specific caregiver: $toCaregiverId',
      );
      toUserIds = [toCaregiverId];
    }

    debugPrint('� [FcmController] Final recipient list: $toUserIds');

    if (toUserIds.isEmpty) {
      debugPrint('❌ [FcmController] No recipients found');
      return {'successCount': 0, 'failureCount': 0, 'info': 'no_recipients'};
    }

    if (toUserIds.length > 50) {
      debugPrint(
        '❌ [FcmController] Too many recipients: ${toUserIds.length}/50',
      );
      throw ArgumentError('Không thể gửi cho quá 50 người nhận');
    }

    debugPrint('🚀 [FcmController] Sending FCM message...');

    return await _fcmDs.pushMessage(
      toUserIds: toUserIds,
      direction: 'customer_to_caregiver',
      category: 'report',
      message: message,
      fromUserId: customerId,
    );
  }

  void dispose() {
    _fcmReg.dispose();
  }
}
