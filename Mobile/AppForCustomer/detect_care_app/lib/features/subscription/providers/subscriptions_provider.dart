import 'package:detect_care_app/core/network/api_client.dart';
import 'package:detect_care_app/features/auth/data/auth_storage.dart';
import 'package:detect_care_app/features/subscription/models/subscription_model.dart';
import 'package:detect_care_app/features/subscription/utils/proration_calculator.dart';
import 'package:flutter/material.dart';
import 'package:detect_care_app/core/utils/logger.dart';

class SubscriptionsProvider extends ChangeNotifier {
  final ApiProvider api;
  SubscriptionsProvider({ApiProvider? apiProvider})
    : api = apiProvider ?? ApiClient(tokenProvider: AuthStorage.getAccessToken);

  bool isLoading = false;
  String? error;
  List<SubscriptionModel> subscriptions = [];

  Future<void> fetchMySubscriptions() async {
    try {
      final res = await api.get('/subscriptions/me');
      final data = api.extractDataFromResponse(res);
      List list = [];
      if (data is List) {
        list = data;
      } else if (data is Map) {
        // Common envelopes
        if (data['items'] is List) {
          list = data['items'];
        } else if (data['subscriptions'] is List) {
          list = data['subscriptions'];
        } else if (data['data'] is List) {
          list = data['data'];
        } else if (data['data'] is Map && data['data']['items'] is List) {
          list = data['data']['items'];
        } else {
          // Occasionally server returns a single subscription object for `/me`
          // Normalize it to a one-element list when keys look like a subscription
          final possible = Map<String, dynamic>.from(data);
          if (possible.containsKey('id') && possible.containsKey('status')) {
            list = [possible];
          }
        }
      }

      subscriptions = list
          .map((e) => SubscriptionModel.fromJson(Map<String, dynamic>.from(e)))
          .toList();
    } catch (e) {
      error = e.toString();
    } finally {
      isLoading = false;
      notifyListeners();
    }
  }

  /// Fetch subscription history (paginated). Returns raw list for callers.
  Future<List<SubscriptionModel>> fetchHistory({
    int page = 1,
    int limit = 20,
  }) async {
    try {
      final res = await api.get(
        '/subscriptions/history',
        query: {'page': page, 'limit': limit},
      );
      final data = api.extractDataFromResponse(res);
      List list = [];
      if (data is List) {
        list = data;
      } else if (data is Map) {
        if (data['items'] is List) {
          list = data['items'];
        } else if (data['data'] is List) {
          list = data['data'];
        } else if (data['data'] is Map && data['data']['items'] is List) {
          list = data['data']['items'];
        }
      }
      return list
          .map((e) => SubscriptionModel.fromJson(Map<String, dynamic>.from(e)))
          .toList();
    } catch (e) {
      throw Exception('Failed to fetch subscription history: $e');
    }
  }

  Future<bool> applyCoupon(String id, String couponCode) async {
    try {
      final res = await api.post(
        '/subscriptions/$id/apply-coupon',
        body: {'coupon_code': couponCode},
      );
      if (res.statusCode >= 200 && res.statusCode < 300) {
        await refreshSubscriptions();
        return true;
      }
      final data = api.extractDataFromResponse(res);
      error = data is String ? data : data?.toString();
      notifyListeners();
      return false;
    } catch (e) {
      error = e.toString();
      notifyListeners();
      return false;
    }
  }

  Future<bool> pauseSubscription(String id) async {
    return _postAction(id, 'pause', newStatus: 'paused');
  }

  Future<bool> resumeSubscription(String id) async {
    return _postAction(id, 'resume', newStatus: 'active');
  }

  Future<bool> downgradeSubscription(String id, String newPlanCode) async {
    try {
      final res = await api.post(
        '/subscriptions/$id/downgrade',
        body: {'target_plan_code': newPlanCode},
      );
      if (res.statusCode >= 200 && res.statusCode < 300) {
        await refreshSubscriptions();
        return true;
      }
      final data = api.extractDataFromResponse(res);
      error = data is String ? data : data?.toString();
      notifyListeners();
      return false;
    } catch (e) {
      error = e.toString();
      notifyListeners();
      return false;
    }
  }

  Future<Map<String, dynamic>> upgradeSubscriptionWithProration(
    String id,
    String newPlanCode, {
    Map<String, dynamic>? currentPlanDetails,
    Map<String, dynamic>? newPlanDetails,
  }) async {
    try {
      // Get current subscription details if not provided
      final currentSub = subscriptions.firstWhere(
        (sub) => sub.id == id,
        orElse: () => throw Exception('Subscription not found'),
      );

      // Fetch plan details if not provided
      final currentPlan =
          currentPlanDetails ?? await fetchPlanDetails(currentSub.planCode);
      final newPlan = newPlanDetails ?? await fetchPlanDetails(newPlanCode);

      if (currentPlan == null || newPlan == null) {
        throw Exception('Plan details not available');
      }

      // Calculate proration
      final proration = ProrationCalculator.calculateProration(
        oldPrice: (currentPlan['price'] as num?)?.toDouble() ?? 0.0,
        newPrice: (newPlan['price'] as num?)?.toDouble() ?? 0.0,
        currentPeriodStart: currentSub.currentPeriodStart,
        currentPeriodEnd: currentSub.currentPeriodEnd,
      );

      // Call upgrade API with proration info
      final res = await api.post(
        '/subscriptions/$id/upgrade',
        body: {
          'target_plan_code': newPlanCode,
          'proration_charge': proration['proration_charge'],
          'proration_credit': proration['proration_credit'],
          'effective_immediately': true,
        },
      );

      if (res.statusCode >= 200 && res.statusCode < 300) {
        await refreshSubscriptions();
        return {
          'success': true,
          'proration': proration,
          'invoice_url': null, // Will be populated by backend
        };
      }

      final data = api.extractDataFromResponse(res);
      error = data is String ? data : data?.toString();
      notifyListeners();
      return {'success': false, 'error': error};
    } catch (e) {
      error = e.toString();
      notifyListeners();
      return {'success': false, 'error': error};
    }
  }

  Future<bool> cancelSubscription(String id) async {
    return _postAction(id, 'cancel', newStatus: 'cancelled');
  }

  /// Shared helper for pause/resume/cancel actions.
  Future<bool> _postAction(
    String id,
    String actionPath, {
    String? newStatus,
  }) async {
    try {
      final res = await api.post('/subscriptions/$id/$actionPath');
      if (res.statusCode >= 200 && res.statusCode < 300) {
        // Refresh subscriptions to get updated state
        await refreshSubscriptions();
        return true;
      }
      final data = api.extractDataFromResponse(res);
      error = data is String ? data : data?.toString();
      notifyListeners();
      return false;
    } catch (e) {
      error = e.toString();
      notifyListeners();
      return false;
    }
  }

  Future<void> refreshSubscriptions() async {
    await fetchMySubscriptions();
  }

  /// Fetch detailed information about a specific plan
  Future<Map<String, dynamic>?> fetchPlanDetails(String planCode) async {
    try {
      final res = await api.get('/plan/$planCode');
      final data = api.extractDataFromResponse(res);
      return data is Map<String, dynamic> ? data : null;
    } catch (e) {
      error = e.toString();
      notifyListeners();
      return null;
    }
  }

  /// Request a manual renewal link (PUT /plan/renew).
  /// [billingPeriod] expects values like 'monthly' or 'yearly'.
  /// [billingType] expects 'prepaid' or 'postpaid'.
  Future<Map<String, dynamic>?> requestManualRenewal({
    String? billingPeriod,
    String? billingType,
  }) async {
    try {
      final body = <String, dynamic>{
        if (billingPeriod != null) 'billing_period': billingPeriod,
        if (billingType != null) 'billing_type': billingType,
      };
      final res = await api.put('/plan/renew', body: body);
      if (res.statusCode == 200 || res.statusCode == 201) {
        final data = api.extractDataFromResponse(res);
        return data is Map<String, dynamic> ? data : null;
      }
      final data = api.extractDataFromResponse(res);
      error = data is String ? data : data?.toString();
      notifyListeners();
      return null;
    } catch (e) {
      error = e.toString();
      notifyListeners();
      return null;
    }
  }

  /// Get pending manual renewal if exists (GET /plan/renew)
  Future<Map<String, dynamic>?> getPendingManualRenewal() async {
    try {
      final res = await api.get('/plan/renew');
      if (res.statusCode == 200) {
        final data = api.extractDataFromResponse(res);
        return data is Map<String, dynamic> ? data : null;
      }
      return null;
    } catch (e) {
      error = e.toString();
      notifyListeners();
      return null;
    }
  }

  /// Fetch payment history/invoices
  Future<List<Map<String, dynamic>>> fetchInvoices({
    int page = 1,
    int limit = 20,
  }) async {
    try {
      final res = await api.get(
        '/transactions/billing/history',
        query: {'page': page, 'limit': limit},
      );
      final data = api.extractDataFromResponse(res);
      if (data is Map<String, dynamic> && data['items'] is List) {
        return List<Map<String, dynamic>>.from(data['items']);
      }
      return [];
    } catch (e) {
      error = e.toString();
      notifyListeners();
      return [];
    }
  }

  /// Generate invoice PDF
  Future<Map<String, dynamic>> generateInvoicePdf(String invoiceId) async {
    try {
      // First try the new transactions PDF endpoint which may return raw PDF bytes.
      try {
        final res = await api.get(
          '/transactions/$invoiceId/pdf',
          extraHeaders: {'Accept': 'application/pdf'},
        );

        if (res.statusCode == 200) {
          final contentType = res.headers['content-type'] ?? '';
          // If backend returns PDF bytes directly, return them in a map so callers
          // can handle downloading/viewing. We return bytes under `pdfBytes` key.
          if (contentType.contains('application/pdf')) {
            return {'pdfBytes': res.bodyBytes, 'contentType': contentType};
          }

          // If response is JSON (e.g., { data: { url: ... } }), attempt to decode
          // using the usual extractor and return that structure.
          try {
            final data = api.extractDataFromResponse(res);
            if (data is Map<String, dynamic>) return data;
          } catch (_) {
            // ignore and fallback
          }
        }
      } catch (e) {
        // Log and fall through to legacy endpoint fallback
        AppLogger.api('Transactions PDF endpoint not available: $e');
      }

      // Fallback to legacy invoice generation endpoint if transactions PDF
      // is not supported by the backend. This keeps compatibility with older
      // backends that still expose the invoice generation API.
      final res2 = await api.post(
        '/invoices/generate',
        body: {'invoiceId': invoiceId},
      );
      final data2 = api.extractDataFromResponse(res2);
      if (data2 is Map<String, dynamic>) return data2;
      return {};
    } catch (e) {
      error = e.toString();
      notifyListeners();
      return {};
    }
  }

  /// Fetch current plan usage statistics and entitlements
  Future<Map<String, dynamic>?> fetchPlanUsage() async {
    try {
      final res = await api.get('/dashboard/plan-usage');
      final data = api.extractDataFromResponse(res);
      if (data is Map<String, dynamic>) {
        // Log the full response for debugging
        AppLogger.api('Plan usage data: $data');
        return data;
      }
      return null;
    } catch (e) {
      error = e.toString();
      notifyListeners();
      return null;
    }
  }

  /// Fetch subscription entitlements (alternative API if needed)
  Future<Map<String, dynamic>?> fetchEntitlements() async {
    try {
      final res = await api.get('/subscriptions/entitlements');
      final data = api.extractDataFromResponse(res);
      return data is Map<String, dynamic> ? data : null;
    } catch (e) {
      // Fallback to plan-usage if entitlements endpoint doesn't exist
      AppLogger.api(
        'Entitlements API not available, falling back to plan-usage',
      );
      return await fetchPlanUsage();
    }
  }

  /// Fetch billing history with advanced filtering and pagination
  Future<List<Map<String, dynamic>>> fetchBillingHistory({
    String? userId,
    DateTime? startDate,
    DateTime? endDate,
    String? status,
    int page = 1,
    int limit = 20,
  }) async {
    try {
      final query = <String, dynamic>{'page': page, 'limit': limit};

      if (userId != null) query['userId'] = userId;
      if (startDate != null) query['startDate'] = startDate.toIso8601String();
      if (endDate != null) query['endDate'] = endDate.toIso8601String();
      if (status != null) query['status'] = status;

      final res = await api.get('/transactions/billing/history', query: query);
      final data = api.extractDataFromResponse(res);

      if (data is Map<String, dynamic> && data['data'] is List) {
        return List<Map<String, dynamic>>.from(data['data']);
      }
      return [];
    } catch (e) {
      error = e.toString();
      notifyListeners();
      return [];
    }
  }

  /// Fetch admin subscription management with advanced search and filters
  Future<Map<String, dynamic>> fetchAdminSubscriptions({
    int page = 1,
    int limit = 20,
    String? status,
    String? planCode,
    String? userId,
    String? search,
    DateTime? startDate,
    DateTime? endDate,
    String? sortBy,
    String? sortOrder,
  }) async {
    try {
      final query = <String, dynamic>{'page': page, 'limit': limit};

      if (status != null) query['status'] = status;
      if (planCode != null) query['planCode'] = planCode;
      if (userId != null) query['userId'] = userId;
      if (search != null) query['search'] = search;
      if (startDate != null) query['startDate'] = startDate.toIso8601String();
      if (endDate != null) query['endDate'] = endDate.toIso8601String();
      if (sortBy != null) query['sortBy'] = sortBy;
      if (sortOrder != null) query['sortOrder'] = sortOrder;

      final res = await api.get(
        '/subscriptions/admin/subscriptions',
        query: query,
      );
      final data = api.extractDataFromResponse(res);

      if (data is Map<String, dynamic>) {
        return data;
      }
      return {'data': [], 'pagination': {}};
    } catch (e) {
      error = e.toString();
      notifyListeners();
      return {'data': [], 'pagination': {}};
    }
  }

  /// Fetch current user's quota usage
  Future<Map<String, dynamic>> fetchMyQuota() async {
    try {
      final res = await api.get('/quotas/me');
      final data = api.extractDataFromResponse(res);

      if (data is Map<String, dynamic>) {
        return data;
      }
      return {};
    } catch (e) {
      error = e.toString();
      notifyListeners();
      return {};
    }
  }

  /// Fetch current user's quota usage history
  Future<Map<String, dynamic>> fetchMyQuotaHistory({
    int page = 1,
    int limit = 20,
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    try {
      final query = <String, dynamic>{'page': page, 'limit': limit};

      if (startDate != null) query['startDate'] = startDate.toIso8601String();
      if (endDate != null) query['endDate'] = endDate.toIso8601String();

      final res = await api.get('/quotas/me/history', query: query);
      final data = api.extractDataFromResponse(res);

      if (data is Map<String, dynamic>) {
        return data;
      }
      return {'data': [], 'pagination': {}};
    } catch (e) {
      error = e.toString();
      notifyListeners();
      return {'data': [], 'pagination': {}};
    }
  }

  /// Admin fetch all users' quota usage
  Future<Map<String, dynamic>> fetchAdminUsersQuota({
    int page = 1,
    int limit = 20,
    String? search,
    String? status,
  }) async {
    try {
      final query = <String, dynamic>{'page': page, 'limit': limit};

      if (search != null) query['search'] = search;
      if (status != null) query['status'] = status;

      final res = await api.get('/quotas/admin/users', query: query);
      final data = api.extractDataFromResponse(res);

      if (data is Map<String, dynamic>) {
        return data;
      }
      return {'data': [], 'pagination': {}};
    } catch (e) {
      error = e.toString();
      notifyListeners();
      return {'data': [], 'pagination': {}};
    }
  }

  /// Admin fetch specific user's quota usage
  Future<Map<String, dynamic>> fetchAdminUserQuota(String userId) async {
    try {
      final res = await api.get('/quotas/admin/users/$userId');
      final data = api.extractDataFromResponse(res);

      if (data is Map<String, dynamic>) {
        return data;
      }
      return {};
    } catch (e) {
      error = e.toString();
      notifyListeners();
      return {};
    }
  }

  /// Admin update user's quota
  Future<bool> updateAdminUserQuota(
    String userId,
    Map<String, dynamic> quotaData,
  ) async {
    try {
      final res = await api.put('/quotas/admin/users/$userId', body: quotaData);
      api.extractDataFromResponse(res);
      return true;
    } catch (e) {
      error = e.toString();
      notifyListeners();
      return false;
    }
  }

  /// Admin reset user's quota
  Future<bool> resetAdminUserQuota(String userId) async {
    try {
      final res = await api.post('/quotas/admin/users/$userId/reset');
      api.extractDataFromResponse(res);
      return true;
    } catch (e) {
      error = e.toString();
      notifyListeners();
      return false;
    }
  }

  /// Admin fetch quota analytics
  Future<Map<String, dynamic>> fetchAdminQuotaAnalytics({
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    try {
      final query = <String, dynamic>{};

      if (startDate != null) query['startDate'] = startDate.toIso8601String();
      if (endDate != null) query['endDate'] = endDate.toIso8601String();

      final res = await api.get('/quotas/admin/analytics', query: query);
      final data = api.extractDataFromResponse(res);

      if (data is Map<String, dynamic>) {
        return data;
      }
      return {};
    } catch (e) {
      error = e.toString();
      notifyListeners();
      return {};
    }
  }
}
