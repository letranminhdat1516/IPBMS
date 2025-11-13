import 'package:detect_care_app/features/auth/utils/validators.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('Validators.validatePhone', () {
    test('returns error for empty input', () {
      final res = Validators.validatePhone('');
      expect(res, isNotNull);
      expect(res, contains('Vui lòng nhập'));
    });

    test('returns error for too short', () {
      final res = Validators.validatePhone('0123');
      expect(res, isNotNull);
      expect(res, contains('Số điện thoại không hợp lệ'));
    });

    test('returns error for too long', () {
      final res = Validators.validatePhone('012345678901234');
      expect(res, isNotNull);
      expect(res, contains('Số điện thoại không hợp lệ'));
    });

    test('returns error for invalid format', () {
      final res = Validators.validatePhone('abcdefg');
      expect(res, isNotNull);
      expect(res, contains('không hợp lệ'));
    });

    test('accepts valid local phone', () {
      final res = Validators.validatePhone('0823944945');
      expect(res, isNull);
    });

    test('accepts valid with country code', () {
      final res = Validators.validatePhone('+84823944945');
      expect(res, isNull);
    });
  });
}
