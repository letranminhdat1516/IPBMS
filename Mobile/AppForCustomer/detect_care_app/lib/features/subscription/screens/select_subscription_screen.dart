import 'package:detect_care_app/core/config/app_config.dart';
import 'package:detect_care_app/features/auth/data/auth_storage.dart';
import 'package:flutter/material.dart';
import 'package:detect_care_app/core/utils/logger.dart';
import 'package:detect_care_app/core/utils/action_locker.dart';
import 'package:detect_care_app/features/subscription/models/subscription_model.dart';
// import 'package:detect_care_app/features/subscription/widgets/subscription_card.dart';
import '../providers/subscriptions_provider.dart';
import 'upgrade_subscription_screen.dart';

import '../constants/plan_constants.dart';
import '../controllers/subscription_controller.dart';
import '../data/service_package_api.dart';
import '../models/plan.dart';

import '../stores/subscription_store.dart';
import 'package:provider/provider.dart';
import '../widgets/error_message_widget.dart';
import '../widgets/loading_widget.dart';
import '../widgets/plan_list_item.dart';
import 'payment/payment_screen.dart';

class SelectSubscriptionScreen extends StatefulWidget {
  final Map<String, dynamic>? preloadedSubscription;
  const SelectSubscriptionScreen({super.key, this.preloadedSubscription});

  @override
  State<SelectSubscriptionScreen> createState() =>
      _SelectSubscriptionScreenState();
}

class _SelectSubscriptionScreenState extends State<SelectSubscriptionScreen> {
  // Billing term selection: 1 (monthly), 6, 12 (months prepaid)
  final int _selectedTerm = 1;
  int? _selectedPlanIndex;
  List<Plan> _plans = [];
  bool _loading = true;
  String? _error;
  Map<String, dynamic>? _subscription;
  late final SubscriptionController _controller;
  bool _processingUpgrade = false;

  @override
  void initState() {
    super.initState();
    _controller = SubscriptionController(ServicePackageApi());
    // No direct subscription here; UI will react to changes via Provider in
    // build() so we don't have to manage listener lifecycle manually.
    if (widget.preloadedSubscription != null) {
      _subscription = widget.preloadedSubscription;
      _loading = false;
      // Nếu có plan_code, chọn luôn gói từ fallback plans
      final planCode = _subscription?['code'];
      if (planCode != null) {
        final idx = PlanConstants.fallbackPlans.indexWhere(
          (p) => p.code == planCode,
        );
        if (idx != -1) {
          _selectedPlanIndex = idx;
          _plans = List<Plan>.from(
            PlanConstants.fallbackPlans,
          ); // Copy để sử dụng
        }
      }
    } else {
      _initScreen();
    }
  }

  @override
  void dispose() {
    // No manual listener to remove (we use Provider in build()).
    super.dispose();
  }

  Future<void> _initScreen() async {
    final token = await AuthStorage.getAccessToken();
    // Always fetch public plans so unauthenticated users can view offerings.
    await _fetchPlans();

    // If user has an access token, fetch their current subscription to pre-select
    // the appropriate plan. If not authenticated, skip fetching current plan.
    if (token != null) {
      await _fetchCurrentPlan();
    } else {
      // Not authenticated — do not treat as an error; allow browsing plans.
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _fetchPlans() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    AppLogger.api('[API] GET ${AppConfig.apiBaseUrl}/plan');
    try {
      final plans = await _controller.fetchPlans();
      setState(() {
        _plans = plans;
        _loading = false;
      });
      await _fetchCurrentPlan();
    } catch (e) {
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

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
    }
  }

  Future<void> _onSelectPlan(Plan plan, int index) async {
    setState(() {
      _selectedPlanIndex = index;
    });
    AppLogger.api(
      '[SelectPlan] Plan selected: code=${plan.code}, price=${plan.price}, index=$index',
    );
    final token = await AuthStorage.getAccessToken();
    if (token == null) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Không tìm thấy access token')),
        );
      }
      return;
    }
    try {
      if (plan.price == 0) {
        AppLogger.api('[API] POST ${AppConfig.apiBaseUrl}/subscriptions');
        AppLogger.api('[SelectPlan] Register free plan: code=${plan.code}');
        final response = await _controller.registerFreePlan(plan.code);
        AppLogger.api('[SelectPlan] RegisterFreePlan API response: $response');
        if (response['status'] == 'active' || response['is_trial'] == true) {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text('Đăng ký thành công: ${plan.name}')),
            );
          }
        } else {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(
                  'Đăng ký thất bại: ${response['message'] ?? 'Lỗi không xác định'}',
                ),
              ),
            );
          }
        }
      } else {
        AppLogger.api(
          '[SelectPlan] Navigate to PaymentScreen with plan: code=${plan.code}, price=${plan.price}',
        );
        if (!mounted) return;
        final paymentResult = await Navigator.push<bool>(
          context,
          MaterialPageRoute(
            builder: (context) =>
                PaymentScreen(plan: plan, selectedTerm: _selectedTerm),
          ),
        );

        // If payment was successful, refresh the subscription data
        if (paymentResult == true) {
          await _fetchCurrentPlan();
        }
      }
    } catch (e) {
      AppLogger.apiError('[SelectPlan] RegisterFreePlan error: $e');
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Lỗi đăng ký: $e')));
      }
    }
  }

  Future<void> _onUpgradePlan(Plan plan) async {
    if (_processingUpgrade) return;
    setState(() {
      _processingUpgrade = true;
    });
    AppLogger.api(
      '[UpgradePlan] Upgrade plan pressed: code=${plan.code}, price=${plan.price}',
    );
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text('Xác nhận nâng cấp'),
        content: Text(
          'Bạn có chắc chắn muốn nâng cấp lên gói "${plan.name}" với giá ${plan.price ~/ 1000},000đ/tháng?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Hủy'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Xác nhận'),
          ),
        ],
      ),
    );
    if (confirm == true) {
      AppLogger.api(
        '[UpgradePlan] Confirmed upgrade. Preparing upgrade on server if subscription exists, otherwise launching payment for full plan.',
      );

      // Attempt to find existing subscription id so we can call prepare/upgrade
      String? subscriptionId;
      try {
        if (_subscription is Map<String, dynamic>) {
          final sub = _subscription as Map<String, dynamic>;
          subscriptionId =
              sub['subscription_id']?.toString() ?? sub['id']?.toString();
          // Some responses nest the subscription object
          if (subscriptionId == null && sub['subscription'] is Map) {
            final nested = sub['subscription'] as Map<String, dynamic>;
            subscriptionId =
                nested['subscription_id']?.toString() ??
                nested['id']?.toString();
          }
        }
        // Fallback: check central store cached data
        final storeData = SubscriptionStore.instance.planData;
        if (subscriptionId == null && storeData is Map<String, dynamic>) {
          if (storeData['subscriptions'] is List &&
              (storeData['subscriptions'] as List).isNotEmpty) {
            final s0 =
                (storeData['subscriptions'] as List).first
                    as Map<String, dynamic>;
            subscriptionId =
                s0['subscription_id']?.toString() ?? s0['id']?.toString();
          }
        }
      } catch (_) {}

      // If we have a subscriptionId, call prepare upgrade to get amountDue/tx
      if (subscriptionId != null) {
        setState(() => _processingUpgrade = true);
        try {
          final result = await _controller.upgradeSubscription(
            subscriptionId,
            plan.code,
          );
          AppLogger.api('[UpgradePlan] Prepare upgrade result: $result');
          if (result['status'] == 'error') {
            if (!mounted) return;
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text(result['message'] ?? 'Nâng cấp thất bại')),
            );
          } else {
            final rawAmount =
                result['amountDue'] ??
                result['amount_due'] ??
                result['amount'] ??
                0;
            final int? amountDue = rawAmount is String
                ? int.tryParse(rawAmount)
                : (rawAmount is int ? rawAmount : null);
            final tx =
                result['transactionId'] ??
                result['transaction_id'] ??
                result['txId'] ??
                result['transactionId'];
            if (amountDue != null && amountDue > 0) {
              if (!mounted) return;
              final paymentResult = await Navigator.push<bool>(
                context,
                MaterialPageRoute(
                  builder: (context) => PaymentScreen(
                    plan: plan,
                    selectedTerm: _selectedTerm,
                    overrideAmount: amountDue,
                    linkedTransactionId: tx?.toString(),
                  ),
                ),
              );
              if (paymentResult == true) {
                await _fetchCurrentPlan();
              }
            } else {
              // amountDue == 0 -> treated as applied
              if (!mounted) return;
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(result['message'] ?? 'Nâng cấp thành công!'),
                ),
              );
              await _fetchCurrentPlan();
            }
          }
        } catch (e) {
          AppLogger.apiError('[UpgradePlan] prepare/upgrade error: $e');
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text('Lỗi khi chuẩn bị nâng cấp: $e')),
            );
          }
        } finally {
          if (mounted) setState(() => _processingUpgrade = false);
        }
      } else {
        // No existing subscriptionId -> treat as new purchase, open PaymentScreen with full plan price
        if (!mounted) return;
        final paymentResult = await Navigator.push<bool>(
          context,
          MaterialPageRoute(
            builder: (context) =>
                PaymentScreen(plan: plan, selectedTerm: _selectedTerm),
          ),
        );
        if (paymentResult == true) {
          final token = await AuthStorage.getAccessToken();
          if (token != null) {
            final oldPlanCode = _subscription?['code'];
            await _fetchCurrentPlan();
            final newPlanCode = _subscription?['code'];
            if (oldPlanCode != null &&
                newPlanCode != null &&
                oldPlanCode != newPlanCode) {
              if (mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text('Nâng cấp gói thành công!')),
                );
              }
            }
          }
        }
      }
    }
    setState(() {
      _processingUpgrade = false;
    });
  }

  Future<void> _onSubscriptionAction(
    BuildContext context,
    String value,
    SubscriptionModel subscriptionModel,
    SubscriptionsProvider prov,
  ) async {
    // Prevent duplicate actions
    if (isActionLocked(subscriptionModel.id)) return;
    lockAction(subscriptionModel.id);
    try {
      switch (value) {
        case 'view':
          final details = await prov.fetchPlanDetails(
            subscriptionModel.planCode,
          );
          if (!mounted) return;
          // Safe to call showDialog because we checked `mounted`.
          // ignore: use_build_context_synchronously
          showDialog(
            context: context,
            builder: (_) => AlertDialog(
              title: Text(details?['name'] ?? subscriptionModel.planName),
              content: Text(details?['description'] ?? 'Chi tiết gói'),
              actions: [
                TextButton(
                  onPressed: () => Navigator.of(context).pop(),
                  child: const Text('Đóng'),
                ),
              ],
            ),
          );
          break;
        case 'downgrade':
        case 'change':
          if (!mounted) return;
          // Navigate to the upgrade/change screen with the newer
          // SubscriptionModel directly (no mapping required).
          // ignore: use_build_context_synchronously
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (ctx) => UpgradeSubscriptionScreen(
                currentSubscription: subscriptionModel,
                currentPlan: _plans.isNotEmpty
                    ? _plans[_selectedPlanIndex ?? 0]
                    : PlanConstants.fallbackPlans[0],
                availablePlans: _plans.isNotEmpty
                    ? _plans
                    : PlanConstants.fallbackPlans,
              ),
            ),
          );
          break;
        case 'cancel':
          final confirmed = await showDialog<bool>(
            context: context,
            builder: (dCtx) => AlertDialog(
              title: const Text('Xác nhận hủy'),
              content: const Text('Bạn có chắc chắn muốn hủy gói dịch vụ?'),
              actions: [
                TextButton(
                  onPressed: () => Navigator.of(dCtx).pop(false),
                  child: const Text('Hủy'),
                ),
                ElevatedButton(
                  style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
                  onPressed: () => Navigator.of(dCtx).pop(true),
                  child: const Text('Xác nhận'),
                ),
              ],
            ),
          );
          if (confirmed == true) {
            final ok = await prov.cancelSubscription(subscriptionModel.id);
            if (!mounted) return;
            // ignore: use_build_context_synchronously
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text(ok ? 'Đã hủy gói' : 'Hủy thất bại')),
            );
          }
          break;
        default:
          break;
      }
    } finally {
      unlockAction(subscriptionModel.id);
    }
  }

  void _handleStoreUpdates(BuildContext context) {
    // React to central SubscriptionStore updates via Provider. When the
    // store contains new plan data, apply it to local UI state so the
    // screen updates automatically after a refresh elsewhere in the app.
    try {
      final store = context.watch<SubscriptionStore>();
      final storePlan = store.planData;
      if (storePlan != null && storePlan != _subscription) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (!mounted) return;
          // Apply storePlan locally (reuse the same selection logic as
          // _fetchCurrentPlan but without making network calls).
          Map<String, dynamic>? planData = storePlan;
          if (planData['subscriptions'] is List) {
            final subscriptions = planData['subscriptions'] as List;
            if (subscriptions.isNotEmpty) {
              final subscription = subscriptions[0] as Map<String, dynamic>;
              planData = subscription['plans'] as Map<String, dynamic>?;
            }
          }

          if (planData != null && planData['code'] != null) {
            final availablePlans = _plans.isNotEmpty
                ? _plans
                : PlanConstants.fallbackPlans;
            final idx = availablePlans.indexWhere(
              (p) => p.code == planData!['code'],
            );
            setState(() {
              if (_plans.isEmpty) _plans = List<Plan>.from(availablePlans);
              _selectedPlanIndex = idx;
              _subscription = planData;
            });
          }
        });
      }
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    // React to central SubscriptionStore updates via Provider
    _handleStoreUpdates(context);

    // If the provider has finished loading but our local overlay `_loading` is
    // still true (for example in tests where network calls are mocked), clear
    // the overlay so the UI can render. Use a post-frame callback to avoid
    // calling setState synchronously during build.
    try {
      final prov = context.watch<SubscriptionsProvider>();
      if (_loading && !prov.isLoading) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (!mounted) return;
          setState(() => _loading = false);
        });
      }
    } catch (_) {}

    return Scaffold(
      // appBar: AppBar(
      //   centerTitle: true,
      //   backgroundColor: Colors.white,
      //   elevation: 0,
      //   shadowColor: Colors.black.withValues(alpha: 0.1),
      //   leading: Container(
      //     margin: const EdgeInsets.all(8),
      //     decoration: BoxDecoration(
      //       color: const Color(0xFFF8FAFC),
      //       borderRadius: BorderRadius.circular(12),
      //       border: Border.all(color: const Color(0xFFE2E8F0)),
      //     ),
      //     child: IconButton(
      //       onPressed: () => Navigator.pop(context),
      //       icon: const Icon(
      //         Icons.arrow_back_ios_new,
      //         color: Color(0xFF374151),
      //         size: 18,
      //       ),
      //     ),
      //   ),
      //   title: const Text(
      //     'Quản lý gói dịch vụ',
      //     style: TextStyle(
      //       color: Color(0xFF1E293B),
      //       fontSize: 20,
      //       fontWeight: FontWeight.w700,
      //       letterSpacing: -0.5,
      //     ),
      //   ),
      // ),
      body: Stack(
        children: [
          if (_error != null)
            ErrorMessageWidget(error: _error)
          else
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: ListView.separated(
                      itemCount: _plans.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 18),
                      itemBuilder: (ctx, i) {
                        return PlanListItem(
                          plan: _plans[i],
                          index: i,
                          selectedPlanIndex: _selectedPlanIndex,
                          subscription: _subscription,
                          selectedTerm: _selectedTerm,
                          allPlans: _plans,
                          onSelectPlan: _onSelectPlan,
                          onUpgradePlan: _onUpgradePlan,
                        );
                      },
                    ),
                  ),
                ],
              ),
            ),
          if (_loading)
            Positioned.fill(
              child: Container(
                color: Colors.white.withAlpha(220),
                child: const Center(
                  child: LoadingWidget(
                    message: 'Đang tải dữ liệu gói dịch vụ...',
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
} // class
