import 'package:flutter/material.dart';
import 'package:detect_care_app/core/config/app_config.dart';
import 'package:detect_care_app/core/utils/logger.dart';

import '../constants/plan_constants.dart';
import '../controllers/subscription_controller.dart';
import '../data/service_package_api.dart';
import '../models/plan.dart';

/// Mixin that handles subscription-related logic for screens
mixin SubscriptionLogic<T extends StatefulWidget> on State<T> {
  late final SubscriptionController _controller;
  List<Plan> _plans = [];
  Map<String, dynamic>? _subscription;
  bool _loading = true;
  String? _error;
  int? _selectedPlanIndex;

  // Getters for state
  List<Plan> get plans => _plans;
  Map<String, dynamic>? get subscription => _subscription;
  bool get loading => _loading;
  String? get error => _error;
  int? get selectedPlanIndex => _selectedPlanIndex;

  // Setters for state
  set plans(List<Plan> value) => _plans = value;
  set subscription(Map<String, dynamic>? value) => _subscription = value;
  set loading(bool value) => _loading = value;
  set error(String? value) => _error = value;
  set selectedPlanIndex(int? value) => _selectedPlanIndex = value;

  @override
  void initState() {
    super.initState();
    _controller = SubscriptionController(ServicePackageApi());
  }

  /// Initialize the subscription screen data
  Future<void> initializeSubscriptionData() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      await _fetchPlans();
      await _fetchCurrentPlan();
    } catch (e) {
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  /// Fetch available plans from API
  Future<void> _fetchPlans() async {
    AppLogger.api('[API] GET ${AppConfig.apiBaseUrl}/plan');
    final fetchedPlans = await _controller.fetchPlans();
    setState(() {
      _plans = fetchedPlans;
    });
  }

  /// Fetch current user's subscription plan
  Future<void> _fetchCurrentPlan() async {
    try {
      AppLogger.api('[API] GET ${AppConfig.apiBaseUrl}/plan/current');
      final response = await _controller.getCurrentPlan();
      AppLogger.api('[FetchCurrentPlan] Full API response: $response');

      // Extract plan data - handle both direct plan object and full subscriptions response
      Map<String, dynamic>? planData = response;
      if (response != null && response['subscriptions'] is List) {
        // Extract plan from subscriptions response
        final subscriptions = response['subscriptions'] as List;
        if (subscriptions.isNotEmpty) {
          final subscription = subscriptions[0] as Map<String, dynamic>;
          planData = subscription['plans'] as Map<String, dynamic>?;
        }
      }

      AppLogger.api('[FetchCurrentPlan] Extracted plan data: $planData');
      AppLogger.api(
        '[FetchCurrentPlan] API response: plan_code=${planData?['code']}',
      );
      AppLogger.api(
        '[FetchCurrentPlan] Plans codes: ${_plans.map((p) => p.code).toList()}',
      );

      if (planData != null && planData['code'] != null) {
        // Use fetched plans list if available; otherwise fallback to built-in fallbackPlans
        final availablePlans = _plans.isNotEmpty
            ? _plans
            : PlanConstants.fallbackPlans;
        final idx = availablePlans.indexWhere(
          (p) => p.code == planData!['code'],
        );
        AppLogger.api('[FetchCurrentPlan] Selected plan index: $idx');

        setState(() {
          // If using fallback plans, copy them into _plans for display
          if (_plans.isEmpty) _plans = List<Plan>.from(availablePlans);
          _selectedPlanIndex = idx;
          _subscription = planData;
        });
      } else {
        AppLogger.api(
          '[FetchCurrentPlan] No plan_code found in response, cannot select plan.',
        );
        // Tự động chọn gói miễn phí nếu user chưa có subscription
        AppLogger.api(
          '[FetchCurrentPlan] Looking for free plan to auto-select...',
        );
        final availablePlans = _plans.isNotEmpty
            ? _plans
            : PlanConstants.fallbackPlans;
        final freePlanIdx = availablePlans.indexWhere((p) => p.price == 0);
        AppLogger.api('[FetchCurrentPlan] Free plan index: $freePlanIdx');

        if (freePlanIdx != -1) {
          AppLogger.api(
            '[FetchCurrentPlan] Auto-selecting free plan at index: $freePlanIdx',
          );
          setState(() {
            if (_plans.isEmpty) _plans = List<Plan>.from(availablePlans);
            _selectedPlanIndex = freePlanIdx;
            _subscription = planData; // Lưu response để biết trạng thái quota
          });
        } else {
          AppLogger.api('[FetchCurrentPlan] No free plan found');
        }
      }
    } catch (e) {
      AppLogger.apiError('[FetchCurrentPlan] Error: $e');
      // Không cần báo lỗi, chỉ không đánh dấu
    } finally {
      setState(() {
        _loading = false;
      });
    }
  }

  /// Handle plan selection
  void selectPlan(int index) {
    setState(() {
      _selectedPlanIndex = index;
    });
  }

  /// Refresh subscription data
  Future<void> refreshSubscriptionData() async {
    await initializeSubscriptionData();
  }
}
