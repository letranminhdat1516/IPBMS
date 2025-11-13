import 'package:flutter_test/flutter_test.dart';
import 'package:detect_care_app/features/shared_permissions/utils/caregiver_resolver.dart';
import 'package:detect_care_app/features/auth/models/user.dart';

void main() {
  test('resolve by phone returns single match', () async {
    final users = [
      User(
        id: 'u-1',
        username: 'jdoe',
        fullName: 'John Doe',
        email: 'a@b.com',
        role: '',
        phone: '15551234567',
        isFirstLogin: false,
      ),
    ];

    final res = await resolveCaregiver(
      name: 'John Doe',
      phone: '+1 (555) 123-4567',
      search: (q) async => q.contains('555') ? users : [],
    );

    expect(res.resolved, isNotNull);
    expect(res.resolved!.caregiverId, 'u-1');
    expect(res.candidates, isNull);
  });

  test('resolve returns candidates on multiple matches', () async {
    final users = [
      User(
        id: 'u-1',
        username: 'a',
        fullName: 'A',
        email: '',
        role: '',
        phone: '111',
        isFirstLogin: false,
      ),
      User(
        id: 'u-2',
        username: 'b',
        fullName: 'B',
        email: '',
        role: '',
        phone: '222',
        isFirstLogin: false,
      ),
    ];

    final res = await resolveCaregiver(
      name: 'Someone',
      phone: '123',
      search: (q) async => users,
    );

    expect(res.resolved, isNull);
    expect(res.candidates, isNotNull);
    expect(res.candidates!.length, 2);
  });

  test('fallback generates deterministic id when no matches', () async {
    final name = 'Nguyễn Văn A';
    final phone = '+84 912-345-678';
    final res = await resolveCaregiver(
      name: name,
      phone: phone,
      search: (q) async => [],
    );

    expect(res.resolved, isNotNull);
    // Ensure phone digits are present at the end of generated id
    final digitsOnly = phone.replaceAll(RegExp(r'[^0-9]+'), '');
    expect(res.resolved!.caregiverId.endsWith(digitsOnly), isTrue);
    expect(res.resolved!.caregiverPhone, isNotNull);
    expect(res.resolved!.caregiverFullName, equals(name.trim()));
  });
}
