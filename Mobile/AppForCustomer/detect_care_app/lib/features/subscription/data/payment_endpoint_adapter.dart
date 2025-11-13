import 'dart:async';
import 'dart:convert';

import '../../../core/network/api_client.dart';
import '../../../core/utils/logger.dart';
import '../../auth/data/auth_storage.dart';

class PaymentEndpointAdapter {
  final String baseUrl;
  final ApiProvider? apiProvider;

  PaymentEndpointAdapter({required this.baseUrl, this.apiProvider});

  ApiProvider _provider() =>
      apiProvider ?? ApiClient(tokenProvider: AuthStorage.getAccessToken);

  Map<String, String> _buildHeaders({String? token, String? idempotencyKey}) {
    final headers = <String, String>{};
    if (idempotencyKey != null) headers['Idempotency-Key'] = idempotencyKey;
    if (token?.isNotEmpty == true) headers['Authorization'] = 'Bearer $token';
    return headers;
  }

  /// Generic request helper with retry logic. Returns decoded JSON (Map/List/primitive)
  /// when a successful status code is received.
  Future<dynamic> _requestWithRetries(
    String method,
    String path, {
    Object? body,
    Map<String, String>? extraHeaders,
    List<int>? successStatusCodes,
    int maxRetries = 3,
  }) async {
    successStatusCodes ??= [200];
    for (int attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        AppLogger.api('Attempt $attempt/$maxRetries: $method $path');
        final provider = _provider();
        final httpResponse = await _callProvider(
          provider,
          method,
          path,
          body: body,
          extraHeaders: extraHeaders,
        );

        if (successStatusCodes.contains(httpResponse.statusCode)) {
          // Prefer provider's extractor when available to handle
          // standardized responses of the form { success, data, error }
          try {
            final extracted = provider.extractDataFromResponse(httpResponse);
            return extracted;
          } catch (_) {
            // Fallback to raw JSON decode if provider can't extract
            try {
              return json.decode(httpResponse.body);
            } catch (e) {
              // If decode fails, return raw body
              return httpResponse.body;
            }
          }
        }

        if (attempt == maxRetries) {
          throw Exception(
            'Failed $method $path after $maxRetries attempts (status=${httpResponse.statusCode})',
          );
        }
      } catch (e) {
        AppLogger.apiError('Error during $method $path: $e');
        if (attempt == maxRetries) rethrow;
        // otherwise continue to retry
      }
    }

    throw Exception('Unexpected error in request $method $path');
  }

  Future<dynamic> _callProvider(
    ApiProvider provider,
    String method,
    String path, {
    Object? body,
    Map<String, String>? extraHeaders,
  }) {
    switch (method.toUpperCase()) {
      case 'GET':
        return provider.get(path, extraHeaders: extraHeaders);
      case 'POST':
        return provider.post(path, body: body, extraHeaders: extraHeaders);
      case 'PUT':
        return provider.put(path, body: body, extraHeaders: extraHeaders);
      case 'PATCH':
        return provider.patch(path, body: body, extraHeaders: extraHeaders);
      case 'DELETE':
        return provider.delete(path, body: body, extraHeaders: extraHeaders);
      default:
        throw UnsupportedError('Unsupported HTTP method: $method');
    }
  }

  /// Get plans list
  /// Get plans list
  /// Target: GET /api/plan
  Future<Map<String, dynamic>> getPlans({
    String? token,
    int maxRetries = 3,
  }) async {
    final path = '/plan';
    final headers = _buildHeaders(token: token);

    final responseData = await _requestWithRetries(
      'GET',
      path,
      extraHeaders: headers,
      maxRetries: maxRetries,
    );

    if (responseData is List) {
      return {'success': true, 'data': responseData};
    } else if (responseData is Map<String, dynamic>) {
      return responseData;
    }

    throw Exception('Unexpected response shape from getPlans');
  }

  /// Create checkout session
  /// Legacy: POST /payments/vnpay (with plan_code, amount, user_id)
  /// Target: POST /api/payments/create (FE expects this endpoint to create checkout/payment sessions)
  Future<Map<String, dynamic>> createCheckoutSession({
    required String planCode,
    required int amount,
    String? token,
    String? userId,
    String? idempotencyKey,
    String? billingType,
    int maxRetries = 3,
  }) async {
    // Use standardized target endpoint for creating checkout/payment sessions
    final path = '/payments/create';
    final body = {
      'plan_code': planCode,
      'amount': amount,
      if (userId != null) 'user_id': userId,
      if (billingType != null) 'billing_type': billingType,
    };
    final headers = _buildHeaders(token: token, idempotencyKey: idempotencyKey);

    try {
      final responseData = await _requestWithRetries(
        'POST',
        path,
        body: body,
        extraHeaders: headers,
        successStatusCodes: [200, 201],
        maxRetries: maxRetries,
      );

      // If backend returns a wrapper like { success: true, data: ... }, the
      // provider.extractDataFromResponse already returns the inner data.
      if (responseData is Map<String, dynamic>) {
        return {'success': true, 'data': responseData};
      }

      // If responseData is a list or primitive, return as data
      return {'success': true, 'data': responseData};
    } catch (e) {
      AppLogger.apiError('createCheckoutSession failed: $e');
      // Surface error to caller
      return {'success': false, 'error': e.toString()};
    }
  }

  /// Prepare upgrade for a subscription
  /// POST /subscriptions/:subscriptionId/upgrade
  /// Request body: { plan_code, paymentProvider: 'vn_pay', idempotencyKey }
  /// Response expected: { status, amountDue, proration, transactionId, ... }
  Future<Map<String, dynamic>> prepareUpgrade({
    required String subscriptionId,
    required String planCode,

    /// Optional billing cycle / duration identifier (e.g. 'monthly', 'yearly', or custom code)
    String? billingCycle,
    String paymentProvider = 'vn_pay',
    String? token,
    String? idempotencyKey,
    int maxRetries = 3,
  }) async {
    final path =
        '/subscriptions/${Uri.encodeComponent(subscriptionId)}/upgrade';
    final body = {
      'plan_code': planCode,
      if (billingCycle != null) 'billing_cycle': billingCycle,
      'paymentProvider': paymentProvider,
    };
    final headers = _buildHeaders(token: token, idempotencyKey: idempotencyKey);

    try {
      final responseData = await _requestWithRetries(
        'POST',
        path,
        body: body,
        extraHeaders: headers,
        successStatusCodes: [200, 201],
        maxRetries: maxRetries,
      );

      // Expect backend to return an object with amountDue and status
      if (responseData is Map<String, dynamic>) {
        return {'success': true, 'data': responseData};
      }

      return {'success': true, 'data': responseData};
    } catch (e) {
      AppLogger.apiError('prepareUpgrade failed: $e');
      return {'success': false, 'error': e.toString()};
    }
  }

  /// Create VNPay payment
  /// POST /payments/vnpay
  /// Payload: { plan_code, description? } and Idempotency-Key in header
  /// Response: { payment_id, payment_url, vnpTxnRef, amount, ... }
  Future<Map<String, dynamic>> createVnPayPayment({
    required String planCode,

    /// Optional billing cycle/duration to create payment for (e.g. 'monthly', 'yearly')
    String? billingCycle,
    String? description,
    String? token,
    String? idempotencyKey,
    int maxRetries = 3,
  }) async {
    final path = '/payments/vnpay';
    final body = {
      'plan_code': planCode,
      if (billingCycle != null) 'billing_cycle': billingCycle,
      if (description != null) 'description': description,
    };
    final headers = _buildHeaders(token: token, idempotencyKey: idempotencyKey);

    try {
      final responseData = await _requestWithRetries(
        'POST',
        path,
        body: body,
        extraHeaders: headers,
        successStatusCodes: [200, 201],
        maxRetries: maxRetries,
      );

      if (responseData is Map<String, dynamic>) {
        return {'success': true, 'data': responseData};
      }

      return {'success': true, 'data': responseData};
    } catch (e) {
      AppLogger.apiError('createVnPayPayment failed: $e');
      return {'success': false, 'error': e.toString()};
    }
  }

  /// Poll payment status with the schedule:
  /// - 2s interval, 5 attempts
  /// - then 5s interval, 6 attempts
  /// Total ~40s-60s depending on delays. Returns last status or timeout.
  Future<Map<String, dynamic>> pollPaymentStatus({
    required String paymentId,
    String? token,
    int shortIntervalSeconds = 2,
    int shortAttempts = 5,
    int longIntervalSeconds = 5,
    int longAttempts = 6,
  }) async {
    // headers not required here because getStatus builds headers internally

    Future<Map<String, dynamic>> checkOnce() async {
      try {
        final statusResp = await getStatus(
          sessionId: paymentId,
          token: token,
          maxRetries: 1,
        );
        return statusResp;
      } catch (e) {
        return {'success': false, 'error': e.toString()};
      }
    }

    // short attempts
    for (int i = 0; i < shortAttempts; i++) {
      final resp = await checkOnce();
      if (resp['success'] == true) {
        final data = resp['data'];
        // Attempt to locate status field in various shapes
        final status = data is Map<String, dynamic>
            ? (data['status'] ?? data['payment_status'] ?? data['state'])
            : null;
        if (status == 'paid' || status == 'applied' || status == 'success') {
          return {'success': true, 'data': data};
        }
        // If backend indicates pending but contains other useful fields, still return when final
      }
      // wait
      await Future.delayed(Duration(seconds: shortIntervalSeconds));
    }

    // long attempts
    for (int i = 0; i < longAttempts; i++) {
      final resp = await checkOnce();
      if (resp['success'] == true) {
        final data = resp['data'];
        final status = data is Map<String, dynamic>
            ? (data['status'] ?? data['payment_status'] ?? data['state'])
            : null;
        if (status == 'paid' || status == 'applied' || status == 'success') {
          return {'success': true, 'data': data};
        }
      }
      await Future.delayed(Duration(seconds: longIntervalSeconds));
    }

    return {
      'success': false,
      'error': 'timeout',
      'message':
          'Payment status polling timed out. Please check manually later.',
    };
  }

  /// Get payment/subscription status
  /// Legacy: GET /payments/querydr/{vnpTxnRef}
  /// Target: GET /api/payments/querydr/{sessionId}
  /// Returns: {success: bool, data: dynamic, headers: Map<String, String>, error?: String}
  Future<Map<String, dynamic>> getStatus({
    String? sessionId,
    String? token,
    int maxRetries = 3,
  }) async {
    final headers = _buildHeaders(token: token);
    if (sessionId == null) {
      throw ArgumentError('sessionId required for checking status');
    }

    final encodedSession = Uri.encodeComponent(sessionId);

    // Primary (current) status endpoint (VNPay querydr passthrough)
    final queryDrPath = '/payments/querydr/$encodedSession';
    final response = await _requestWithRetriesReturnHeaders(
      _provider(),
      'GET',
      queryDrPath,
      extraHeaders: headers,
      maxRetries: maxRetries,
    );

    if (response['data'] != null) {
      return {
        'success': true,
        'data': response['data'],
        'headers': response['headers'],
      };
    }

    AppLogger.api('Primary status endpoint returned no data, trying fallbacks');

    final fallbacks = [
      // Legacy/query variants
      '/payments/$encodedSession/status',
      '/subscriptions/status?session_id=$encodedSession',
      '/transactions/$encodedSession',
    ];

    for (final fb in fallbacks) {
      AppLogger.api('Trying fallback status endpoint: $fb');
      final fbResponse = await _requestWithRetriesReturnHeaders(
        _provider(),
        'GET',
        fb,
        extraHeaders: headers,
        maxRetries: 1,
      );
      if (fbResponse['data'] != null) {
        return {
          'success': true,
          'data': fbResponse['data'],
          'headers': fbResponse['headers'],
        };
      }
    }

    return {
      'success': false,
      'error': 'Failed to retrieve payment status for session: $sessionId',
      'headers': <String, String>{},
    };
  }

  /// Create subscription after payment
  /// Legacy: POST /subscriptions/paid (with payment_id, plan_code)
  /// Target: Not needed - subscription created automatically via checkout
  Future<Map<String, dynamic>> createSubscriptionAfterPayment({
    String? paymentId,
    required String planCode,
    String? token,
    String? idempotencyKey,
    int maxRetries = 3,
  }) async {
    final headers = _buildHeaders(token: token, idempotencyKey: idempotencyKey);

    // Target architecture: subscription is created automatically after
    // successful checkout on the backend. To surface the subscription to
    // the client, fetch the user's subscriptions list and return it.
    final path = '/subscriptions/me';
    final responseData = await _requestWithRetries(
      'GET',
      path,
      extraHeaders: headers,
      maxRetries: maxRetries,
    );
    return {'success': true, 'data': responseData};
  }

  /// Variant of _requestWithRetries that returns both parsed data and
  /// response headers so callers can use server headers (e.g. Retry-After).
  Future<Map<String, dynamic>> _requestWithRetriesReturnHeaders(
    ApiProvider provider,
    String method,
    String path, {
    Object? body,
    Map<String, String>? extraHeaders,
    List<int>? successStatusCodes,
    int maxRetries = 3,
  }) async {
    successStatusCodes ??= [200];
    for (int attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        AppLogger.api('Attempt(headers) $attempt/$maxRetries: $method $path');
        final httpResponse = await _callProvider(
          provider,
          method,
          path,
          body: body,
          extraHeaders: extraHeaders,
        );

        if (successStatusCodes.contains(httpResponse.statusCode)) {
          try {
            final extracted = provider.extractDataFromResponse(httpResponse);
            return {
              'data': extracted,
              'headers': Map<String, String>.from(httpResponse.headers ?? {}),
            };
          } catch (_) {
            try {
              final decoded = json.decode(httpResponse.body);
              return {
                'data': decoded,
                'headers': Map<String, String>.from(httpResponse.headers ?? {}),
              };
            } catch (e) {
              return {
                'data': httpResponse.body,
                'headers': Map<String, String>.from(httpResponse.headers ?? {}),
              };
            }
          }
        }

        if (attempt == maxRetries) {
          throw Exception(
            'Failed $method $path after $maxRetries attempts (status=${httpResponse.statusCode})',
          );
        }
      } catch (e) {
        AppLogger.apiError('Error during $method $path (headers): $e');
        if (attempt == maxRetries) rethrow;
        // otherwise continue to retry
      }
    }

    throw Exception('Unexpected error in request $method $path');
  }
}
