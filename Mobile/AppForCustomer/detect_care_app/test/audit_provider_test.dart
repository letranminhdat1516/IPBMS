import 'package:flutter_test/flutter_test.dart';
import 'package:detect_care_app/features/audit/models/audit_models.dart';
import 'package:detect_care_app/features/audit/providers/audit_provider.dart';
import 'package:detect_care_app/features/audit/repositories/audit_repository.dart';

class MockAuditRepository extends AuditRepository {
  @override
  Future<List<AuditEvent>> getAllAuditEvents({
    int page = 1,
    int limit = 20,
    String? action,
    String? resourceType,
    String? userId,
    DateTime? startDate,
    DateTime? endDate,
  }) async {
    // Mock implementation
    return [
      AuditEvent(
        id: 'test-id',
        userId: 'test-user',
        action: 'CREATE',
        resourceType: 'USER',
        timestamp: DateTime.now(),
        ipAddress: '192.168.1.1',
        userAgent: 'Test Agent',
      ),
    ];
  }
}

void main() {
  late AuditProvider auditProvider;
  late MockAuditRepository mockRepository;

  setUp(() {
    mockRepository = MockAuditRepository();
    auditProvider = AuditProvider(repository: mockRepository);
  });

  group('AuditProvider', () {
    test('initial state', () {
      expect(auditProvider.isLoading, false);
      expect(auditProvider.error, null);
      expect(auditProvider.auditEvents, isEmpty);
      expect(auditProvider.auditSummary, null);
    });

    test('loadAllAuditEvents success', () async {
      await auditProvider.loadAllAuditEvents();

      expect(auditProvider.isLoading, false);
      expect(auditProvider.error, null);
      expect(auditProvider.auditEvents.length, 1);
      expect(auditProvider.auditEvents.first.id, 'test-id');
    });

    test('clearAuditEvents', () {
      auditProvider.clearAuditEvents();
      expect(auditProvider.auditEvents, isEmpty);
    });

    test('clearAll', () {
      auditProvider.clearAll();
      expect(auditProvider.auditEvents, isEmpty);
      expect(auditProvider.auditSummary, null);
      expect(auditProvider.error, null);
    });
  });
}
