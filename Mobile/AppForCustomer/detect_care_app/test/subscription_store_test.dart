import 'package:flutter_test/flutter_test.dart';
import 'package:detect_care_app/features/subscription/stores/subscription_store.dart';
import 'package:detect_care_app/features/subscription/data/service_package_api.dart';

class _FakeServicePackageApi extends ServicePackageApi {
  @override
  Future<Map<String, dynamic>?> getCurrentPlan() async {
    // Return a deterministic fake plan payload
    return {
      'id': 'plan-test-1',
      'code': 'test_plan',
      'name': 'Test Plan',
      'status': 'active',
      'features': {'camera_quota': 5},
    };
  }
}

void main() {
  test(
    'SubscriptionStore.refresh updates cached plan and notifies listeners',
    () async {
      final store = SubscriptionStore.instance;

      // Inject fake API to avoid network
      store.setApi(_FakeServicePackageApi());

      // Ensure initial state is cleared for test isolation
      store.clear();
      expect(store.planData, isNull);

      var notified = false;
      void listener() => notified = true;
      store.addListener(listener);

      await store.refresh();

      expect(
        notified,
        isTrue,
        reason: 'Listeners should be notified after refresh',
      );
      expect(store.planData, isNotNull);
      expect(store.planData!['code'], equals('test_plan'));

      store.removeListener(listener);
    },
  );
}
