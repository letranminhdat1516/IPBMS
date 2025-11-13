import 'package:detect_care_app/features/auth/data/auth_storage.dart';
import 'package:flutter/foundation.dart';
import 'package:detect_care_app/features/subscription/data/service_package_api.dart';
import 'package:detect_care_app/features/subscription/stores/subscription_store.dart';

class CameraQuotaService {
  final ServicePackageApi _servicePackageApi;

  CameraQuotaService(this._servicePackageApi);

  /// Lấy camera quota hiện tại của user
  Future<int> getCurrentCameraQuota() async {
    try {
      final token = await AuthStorage.getAccessToken();
      debugPrint(
        '🔐 [CameraQuota] Access token: ${token != null ? 'Found' : 'Not found'}',
      );
      if (token == null) return 0;

      // Prefer cached plan data from SubscriptionStore to avoid an API call
      // when the app recently refreshed subscriptions (e.g., after payment).
      var planData = SubscriptionStore.instance.planData;
      planData ??= await _servicePackageApi.getCurrentPlan();

      // Extract plan data - handle both direct plan object and full subscriptions response
      Map<String, dynamic>? actualPlanData = planData;
      if (planData != null && planData['subscriptions'] is List) {
        // Extract plan from subscriptions response
        final subscriptions = planData['subscriptions'] as List;
        if (subscriptions.isNotEmpty) {
          final subscription = subscriptions[0] as Map<String, dynamic>;
          actualPlanData = subscription['plans'] as Map<String, dynamic>?;
        }
      }

      debugPrint('📋 [CameraQuota] Plan data: $actualPlanData');
      // If plan data is missing, assume a minimal default quota so basic users
      // can still add/manage a camera. This avoids blocking edits when the API
      // doesn't return an exFplicit camera_quota field.
      const defaultQuota = 1;
      if (actualPlanData == null) {
        debugPrint(
          '⚠️ [CameraQuota] Plan data is null - using default quota $defaultQuota',
        );
        return defaultQuota;
      }

      // Extract camera quota directly from the plan data
      final cameraQuota = actualPlanData['camera_quota'];
      debugPrint('📦 [CameraQuota] Camera quota from API: $cameraQuota');

      if (cameraQuota is int) {
        debugPrint('🎯 [CameraQuota] Final camera quota: $cameraQuota');
        return cameraQuota;
      } else if (cameraQuota is String) {
        final parsedQuota = int.tryParse(cameraQuota) ?? 0;
        debugPrint('🎯 [CameraQuota] Parsed camera quota: $parsedQuota');
        return parsedQuota > 0 ? parsedQuota : defaultQuota;
      } else {
        debugPrint(
          '❌ [CameraQuota] Invalid or missing camera_quota: $cameraQuota - using default $defaultQuota',
        );
        return defaultQuota;
      }
    } catch (e) {
      debugPrint('❌ [CameraQuota] Error getting camera quota: $e');
      // Error getting camera quota - silently fail in production
      return 0; // Default to 0 if error
    }
  }

  /// Kiểm tra xem có thể thêm camera mới không
  Future<CameraQuotaValidationResult> canAddCamera(
    int currentCameraCount,
  ) async {
    final quota = await getCurrentCameraQuota();

    if (quota == 0) {
      return CameraQuotaValidationResult(
        canAdd: false,
        message: 'Không thể xác định giới hạn camera. Vui lòng liên hệ hỗ trợ.',
        quota: 0,
        currentCount: currentCameraCount,
      );
    }

    if (currentCameraCount >= quota) {
      return CameraQuotaValidationResult(
        canAdd: false,
        message:
            'Đã đạt giới hạn $quota camera. Vui lòng nâng cấp gói dịch vụ.',
        quota: quota,
        currentCount: currentCameraCount,
        shouldUpgrade: true,
      );
    }

    if (currentCameraCount >= quota * 0.8) {
      // Cảnh báo khi đạt 80% quota
      return CameraQuotaValidationResult(
        canAdd: true,
        message:
            'Đã sử dụng $currentCameraCount/$quota camera. Sắp đạt giới hạn.',
        quota: quota,
        currentCount: currentCameraCount,
        shouldWarn: true,
      );
    }

    return CameraQuotaValidationResult(
      canAdd: true,
      quota: quota,
      currentCount: currentCameraCount,
    );
  }
}

class CameraQuotaValidationResult {
  final bool canAdd;
  final String? message;
  final int quota;
  final int currentCount;
  final bool shouldWarn;
  final bool shouldUpgrade;

  CameraQuotaValidationResult({
    required this.canAdd,
    this.message,
    required this.quota,
    required this.currentCount,
    this.shouldWarn = false,
    this.shouldUpgrade = false,
  });

  bool get isNearLimit => currentCount >= quota * 0.8;
  bool get isAtLimit => currentCount >= quota;
}
