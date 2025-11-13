import 'package:flutter_test/flutter_test.dart';
import 'package:detect_care_app/features/activity/models/activity_models.dart';
import 'package:detect_care_app/features/activity/providers/activity_provider.dart';
import 'package:detect_care_app/features/activity/repositories/activity_repository.dart';

class MockActivityRepository extends ActivityRepository {
  @override
  Future<List<ActivityLog>> getActivityLogs({
    int page = 1,
    int limit = 20,
    String? actorId,
    String? action,
    String? resourceName,
    ActivitySeverity? severity,
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    // Mock implementation
    return [
      ActivityLog(
        id: 'test-id',
        actorId: 'test-actor',
        action: 'user_login',
        resourceName: 'auth',
        severity: ActivitySeverity.info,
        createdAt: DateTime.now(),
        meta: {'ip': '192.168.1.1', 'user_agent': 'Test Agent'},
      ),
    ];
  }
}

void main() {
  late ActivityProvider activityProvider;
  late MockActivityRepository mockRepository;

  setUp(() {
    mockRepository = MockActivityRepository();
    activityProvider = ActivityProvider(repository: mockRepository);
  });

  group('ActivityProvider', () {
    test('initial state', () {
      expect(activityProvider.isLoading, false);
      expect(activityProvider.error, null);
      expect(activityProvider.activityLogs, isEmpty);
      expect(activityProvider.activitySummary, null);
    });

    test('loadActivityLogs success', () async {
      await activityProvider.loadActivityLogs();

      expect(activityProvider.isLoading, false);
      expect(activityProvider.error, null);
      expect(activityProvider.activityLogs.length, 1);
      expect(activityProvider.activityLogs.first.id, 'test-id');
    });

    test('clearActivityLogs', () {
      activityProvider.clearActivityLogs();
      expect(activityProvider.activityLogs, isEmpty);
    });

    test('clearAll', () {
      activityProvider.clearAll();
      expect(activityProvider.activityLogs, isEmpty);
      expect(activityProvider.activitySummary, null);
      expect(activityProvider.error, null);
    });
  });
}
