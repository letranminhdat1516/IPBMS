import '../data/service_package_api.dart';
import '../models/plan.dart';

class SubscriptionController {
  final ServicePackageApi api;
  SubscriptionController(this.api);

  Future<List<Plan>> fetchPlans() async {
    return await api.fetchPlans();
  }

  Future<Map<String, dynamic>?> getCurrentPlan() async {
    return await api.getCurrentPlan();
  }

  Future<Map<String, dynamic>?> getCurrentQuota() async {
    return await api.getCurrentQuota();
  }

  Future<Map<String, dynamic>> registerFreePlan(String planCode) async {
    return await api.registerFreePlan(planCode);
  }

  Future<Map<String, dynamic>> upgradeSubscription(
    String subscriptionId,
    String targetPlanCode, {
    double? prorationAmount,
    bool? effectiveImmediately,
  }) async {
    return await api.upgradeSubscription(
      subscriptionId: subscriptionId,
      targetPlanCode: targetPlanCode,
      prorationAmount: prorationAmount,
      effectiveImmediately: effectiveImmediately,
    );
  }

  Future<Map<String, dynamic>> scheduleDowngrade(String targetPlanCode) async {
    return await api.scheduleDowngrade(targetPlanCode: targetPlanCode);
  }
}
