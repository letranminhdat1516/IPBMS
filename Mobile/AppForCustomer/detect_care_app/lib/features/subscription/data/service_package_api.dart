import 'package:detect_care_app/core/network/api_client.dart';
import 'package:detect_care_app/core/utils/logger.dart';

import '../../auth/data/auth_storage.dart';
import '../models/plan.dart';

class ServicePackageApi {
  final ApiClient _apiClient;
  ServicePackageApi()
    : _apiClient = ApiClient(tokenProvider: AuthStorage.getAccessToken);

  // Public endpoint - no authentication required
  Future<List<Plan>> fetchPlans() async {
    // Use shared ApiClient to fetch public plans so we get consistent logging
    // and response decoding. The endpoint is public so no auth header is
    // required; ApiClient will still set Content-Type and log the request.
    final response = await _apiClient.get('/plan');

    AppLogger.api('[ServicePackageApi] GET /plans');
    AppLogger.api('Response status: ${response.statusCode}');
    AppLogger.api('Response body: ${response.body}');

    if (response.statusCode == 200) {
      // Safe JSON decoding with error handling using ApiClient helper
      dynamic responseData;
      try {
        responseData = _apiClient.decodeResponseBody(response);
      } catch (e) {
        throw Exception('Failed to parse response: $e');
      }

      // Handle new standardized response format
      if (responseData is Map<String, dynamic> &&
          responseData['success'] == true) {
        final data = responseData['data'];
        if (data is List) {
          return data.map((e) => Plan.fromJson(e)).toList();
        } else if (data is Map<String, dynamic>) {
          return [Plan.fromJson(data)];
        } else {
          throw Exception('Dữ liệu plans không hợp lệ');
        }
      }
      // Fallback for old format (direct array or object)
      else if (responseData is List) {
        return responseData.map((e) => Plan.fromJson(e)).toList();
      } else if (responseData is Map<String, dynamic>) {
        return [Plan.fromJson(responseData)];
      } else {
        throw Exception('Định dạng response không hợp lệ');
      }
    } else {
      throw Exception(
        'Không thể lấy danh sách gói dịch vụ: ${response.statusCode}',
      );
    }
  }

  // Get specific plan by code - authenticated
  Future<Plan?> fetchPlanByCode(String code) async {
    try {
      final response = await _apiClient.get('/plan/$code');

      if (response.statusCode == 200) {
        final responseData = _apiClient.extractDataFromResponse(response);

        // Handle new standardized response format
        if (responseData is Map<String, dynamic> &&
            responseData['success'] == true) {
          final data = responseData['data'];
          if (data is Map<String, dynamic>) {
            return Plan.fromJson(data);
          } else {
            AppLogger.api('Failed to fetch plan $code: Invalid data format');
            return null;
          }
        }
        // Fallback for old format
        else if (responseData is Map<String, dynamic>) {
          return Plan.fromJson(responseData);
        } else {
          AppLogger.api(
            'Failed to fetch plan $code: Unexpected response format',
          );
          return null;
        }
      } else {
        AppLogger.api('Failed to fetch plan $code: ${response.statusCode}');
        return null;
      }
    } catch (e) {
      AppLogger.apiError('Error fetching plan $code: $e');
      return null;
    }
  }

  // Authenticated endpoints using ApiClient
  Future<Map<String, dynamic>?> getCurrentPlan() async {
    try {
      // Debug: Check if token is available
      final token = await AuthStorage.getAccessToken();
      AppLogger.api(
        '🔍 getCurrentPlan: Token available: ${token != null ? 'Yes' : 'No'}',
      );
      if (token != null) {
        AppLogger.api('🔍 getCurrentPlan: Token length: ${token.length}');
        AppLogger.api(
          '🔍 getCurrentPlan: Token starts with: ${token.length > 20 ? token.substring(0, 20) : token}...',
        );
      }

      final response = await _apiClient.get('/subscriptions/me');

      AppLogger.api('[ServicePackageApi] GET /subscriptions/me');
      AppLogger.api('Response status: ${response.statusCode}');
      AppLogger.api('Response headers: ${response.headers}');
      AppLogger.api('Response body: ${response.body}');

      if (response.statusCode == 200) {
        // Decode full response first so we can inspect the envelope if present
        final decoded = _apiClient.decodeResponseBody(response);

        // Handle new standardized response envelope: { success, data, ... }
        AppLogger.api(
          'Decoded response (envelope) type: ${decoded.runtimeType}',
        );
        AppLogger.api('Decoded response (envelope) content: $decoded');
        if (decoded is Map<String, dynamic> && decoded['success'] == true) {
          final data = decoded['data'];
          // Data may contain subscriptions key
          if (data is Map<String, dynamic> && data['subscriptions'] is List) {
            final subscriptions = data['subscriptions'] as List;
            if (subscriptions.isNotEmpty) {
              final subscription = subscriptions[0] as Map<String, dynamic>;
              AppLogger.api('Found subscription object: $subscription');
              AppLogger.api(
                'Subscription fields -> plan_code: ${subscription['plan_code'] ?? subscription['code']}, current_period_end: ${subscription['current_period_end']}, cancel_at_period_end: ${subscription['cancel_at_period_end']}',
              );
              // some APIs use 'plan' or 'plans' key - try both
              final plan =
                  (subscription['plans'] ?? subscription['plan'])
                      as Map<String, dynamic>?;
              AppLogger.api('✅ Current plan from subscription: $plan');
              AppLogger.api('Returning plan object (from subscription)');
              return plan;
            }
            if (subscriptions.isNotEmpty) {
              final subscription = subscriptions[0] as Map<String, dynamic>;
              // some APIs use 'plan' or 'plans' key - try both
              final plan =
                  (subscription['plans'] ?? subscription['plan'])
                      as Map<String, dynamic>?;

              if (plan != null) {
                AppLogger.api('✅ Current plan from subscription: $plan');
                AppLogger.api('Returning plan object (from subscription)');
                return plan;
              }

              // If the backend returns only a plan_code (common), derive a
              // minimal plan map so callers can still use plan_code.
              final planCode =
                  subscription['plan_code'] ?? subscription['code'];
              if (planCode != null) {
                final derived = <String, dynamic>{
                  'code': planCode,
                  'plan_code': planCode,
                  'plan_name': subscription['plan_name'] ?? planCode,
                };
                AppLogger.api('ℹ️ Derived plan from plan_code: $derived');
                AppLogger.api('Returning derived plan (plan_code only)');
                return derived;
              }

              AppLogger.api(
                '⚠️ Subscription found but no plan object or plan_code',
              );
              return null;
            }
          }
          AppLogger.api('⚠️ No subscriptions found in response envelope');
          return null;
        }

        // Fallback for older direct responses where decodeResponseBody returns
        // the top-level object (not wrapped in success/data)
        AppLogger.api('Decoded response (legacy) type: ${decoded.runtimeType}');
        AppLogger.api('Decoded response (legacy) content: $decoded');
        if (decoded is Map<String, dynamic>) {
          // If the map itself contains subscriptions
          if (decoded['subscriptions'] is List) {
            final subscriptions = decoded['subscriptions'] as List;
            if (subscriptions.isNotEmpty) {
              final subscription = subscriptions[0] as Map<String, dynamic>;
              AppLogger.api('Found legacy subscription object: $subscription');
              AppLogger.api(
                'Legacy subscription fields -> plan_code: ${subscription['plan_code'] ?? subscription['code']}, current_period_end: ${subscription['current_period_end']}, cancel_at_period_end: ${subscription['cancel_at_period_end']}',
              );
              final plan =
                  (subscription['plans'] ?? subscription['plan'])
                      as Map<String, dynamic>?;
              AppLogger.api('✅ Current plan from subscription (legacy): $plan');
              AppLogger.api('Returning plan object (legacy subscription)');
              return plan;
            }
            if (subscriptions.isNotEmpty) {
              final subscription = subscriptions[0] as Map<String, dynamic>;
              final plan =
                  (subscription['plans'] ?? subscription['plan'])
                      as Map<String, dynamic>?;

              if (plan != null) {
                AppLogger.api(
                  '✅ Current plan from subscription (legacy): $plan',
                );
                return plan;
              }

              final planCode =
                  subscription['plan_code'] ?? subscription['code'];
              if (planCode != null) {
                final derived = <String, dynamic>{
                  'code': planCode,
                  'plan_code': planCode,
                  'plan_name': subscription['plan_name'] ?? planCode,
                };
                AppLogger.api(
                  'ℹ️ Derived plan from plan_code (legacy): $derived',
                );
                AppLogger.api('Returning derived plan (legacy plan_code only)');
                return derived;
              }

              AppLogger.api('⚠️ No subscriptions found in legacy response');
              return null;
            }
            AppLogger.api('⚠️ No subscriptions found in legacy response');
            return null;
          }

          // If decoded looks like a plan object already
          AppLogger.api('✅ Current plan response (legacy): $decoded');
          AppLogger.api('Returning plan object (legacy top-level)');
          return decoded;
        }

        AppLogger.api('⚠️ Unexpected response format for current plan');
        return null;
      } else if (response.statusCode == 401) {
        AppLogger.api(
          '⚠️ Subscriptions endpoint returned 401 - Token may be expired or invalid',
        );
        return null;
      } else {
        AppLogger.api(
          '⚠️ Subscriptions endpoint returned ${response.statusCode}: ${response.body}',
        );
        return null;
      }
    } catch (e) {
      AppLogger.apiError('❌ Error fetching current plan: $e');
      return null;
    }
  }

  Future<Map<String, dynamic>?> getCurrentQuota() async {
    try {
      final userId = await AuthStorage.getUserId();
      if (userId == null) return null;

      final response = await _apiClient.get('/users/$userId/quota');

      if (response.statusCode == 200) {
        final responseData = _apiClient.extractDataFromResponse(response);

        // Handle new standardized response format
        if (responseData is Map<String, dynamic> &&
            responseData['success'] == true) {
          return responseData['data'] as Map<String, dynamic>?;
        }
        // Fallback for old format
        else if (responseData is Map<String, dynamic>) {
          return responseData;
        } else {
          return null;
        }
      } else {
        return null;
      }
    } catch (e) {
      AppLogger.apiError('Error fetching current quota: $e');
      return null;
    }
  }

  Future<Map<String, dynamic>?> getCurrentSubscription() async {
    try {
      final response = await _apiClient.get('/subscriptions/me');

      if (response.statusCode == 200) {
        final responseData = _apiClient.extractDataFromResponse(response);

        // Handle new standardized response format
        if (responseData is Map<String, dynamic> &&
            responseData['success'] == true) {
          return responseData['data'] as Map<String, dynamic>?;
        }
        // Fallback for old format
        else if (responseData is Map<String, dynamic>) {
          return responseData;
        } else {
          return null;
        }
      } else {
        return null;
      }
    } catch (e) {
      AppLogger.apiError('Error fetching current subscription: $e');
      return null;
    }
  }

  Future<Map<String, dynamic>> registerFreePlan(String planCode) async {
    try {
      final response = await _apiClient.post(
        '/subscriptions',
        body: {'planCode': planCode},
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        final responseData = _apiClient.extractDataFromResponse(response);

        // Handle new standardized response format
        if (responseData is Map<String, dynamic> &&
            responseData['success'] == true) {
          return responseData['data'] as Map<String, dynamic>;
        }
        // Fallback for old format
        else if (responseData is Map<String, dynamic>) {
          return responseData;
        } else {
          return {'status': 'error', 'message': 'Đăng ký thất bại'};
        }
      } else {
        final responseData = _apiClient.extractDataFromResponse(response);
        return {
          'status': 'error',
          'message': responseData['message'] ?? 'Đăng ký thất bại',
        };
      }
    } catch (e) {
      return {'status': 'error', 'message': 'Đăng ký thất bại: $e'};
    }
  }

  Future<Map<String, dynamic>> upgradeSubscription({
    required String subscriptionId,
    required String targetPlanCode,
    double? prorationAmount,
    bool? effectiveImmediately,
  }) async {
    try {
      final body = {
        'target_plan_code': targetPlanCode,
        if (prorationAmount != null) 'proration_amount': prorationAmount,
        if (effectiveImmediately != null)
          'effective_immediately': effectiveImmediately,
      };

      final response = await _apiClient.post(
        '/subscriptions/$subscriptionId/upgrade',
        body: body,
      );

      AppLogger.api(
        '[ServicePackageApi] POST /subscriptions/$subscriptionId/upgrade REQUEST body=$body',
      );

      if (response.statusCode == 200) {
        final responseData = _apiClient.extractDataFromResponse(response);

        // Handle new standardized response format
        if (responseData is Map<String, dynamic> &&
            responseData['success'] == true) {
          AppLogger.api(
            '[ServicePackageApi] Upgrade response (standardized): ${responseData['data']}',
          );
          return responseData['data'] as Map<String, dynamic>;
        }
        // Fallback for old format
        else if (responseData is Map<String, dynamic>) {
          AppLogger.api(
            '[ServicePackageApi] Upgrade response (legacy): $responseData',
          );
          return responseData;
        } else {
          return {'status': 'error', 'message': 'Nâng cấp thất bại'};
        }
      } else {
        final responseData = _apiClient.extractDataFromResponse(response);
        return {
          'status': 'error',
          'message': responseData['message'] ?? 'Nâng cấp thất bại',
        };
      }
    } catch (e) {
      AppLogger.apiError(
        '[ServicePackageApi] Error upgrading subscription: $e',
      );
      return {'status': 'error', 'message': 'Nâng cấp thất bại: $e'};
    }
  }

  Future<Map<String, dynamic>> scheduleDowngrade({
    required String targetPlanCode,
  }) async {
    try {
      final response = await _apiClient.put(
        '/plan/downgrade',
        body: {'plan_code': targetPlanCode, 'payment_provider': 'vn_pay'},
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        final responseData = _apiClient.extractDataFromResponse(response);

        // Handle new standardized response format
        if (responseData is Map<String, dynamic> &&
            responseData['success'] == true) {
          return responseData['data'] as Map<String, dynamic>;
        }
        // Fallback for old format
        else if (responseData is Map<String, dynamic>) {
          return responseData;
        } else {
          return {'status': 'error', 'message': 'Lên lịch hạ cấp thất bại'};
        }
      } else {
        final responseData = _apiClient.extractDataFromResponse(response);
        return {
          'status': 'error',
          'message': responseData['message'] ?? 'Lên lịch hạ cấp thất bại',
        };
      }
    } catch (e) {
      return {'status': 'error', 'message': 'Lên lịch hạ cấp thất bại: $e'};
    }
  }
}
