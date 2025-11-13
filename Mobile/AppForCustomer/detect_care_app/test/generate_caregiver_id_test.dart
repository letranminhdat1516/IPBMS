import 'package:flutter_test/flutter_test.dart';
import 'package:detect_care_app/features/shared_permissions/utils/caregiver_id.dart';

void main() {
  test(
    'generateCaregiverId returns sanitized lowercase name and digits-only phone',
    () {
      // ASCII name - expect exact transformation
      final idAscii = generateCaregiverId('John Doe', '+1 (555) 123-4567');
      expect(idAscii, 'john_doe_15551234567');

      // Unicode name - can't predict exact normalized letters because we replace non [a-z0-9]
      // Ensure digits-only phone part is preserved and the name part is sanitized
      final idUnicode = generateCaregiverId('Nguyễn Văn A', '+84 912-345-678');
      final parts = idUnicode.split('_');
      expect(parts.length >= 2, isTrue);
      final phonePart = parts.last;
      expect(phonePart, '84912345678');
      final namePart = parts.sublist(0, parts.length - 1).join('_');
      expect(RegExp(r'^[a-z0-9_]+$').hasMatch(namePart), isTrue);
    },
  );
}
