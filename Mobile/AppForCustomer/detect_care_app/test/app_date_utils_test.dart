import 'package:flutter_test/flutter_test.dart';
import 'package:detect_care_app/core/utils/date_utils.dart';

void main() {
  group('AppDateUtils.formatDobForDisplay', () {
    test('parses ISO date (yyyy-MM-dd)', () {
      final input = '1990-05-20';
      final out = AppDateUtils.formatDobForDisplay(input);
      expect(out, '20/05/1990');
    });

    test('parses ISO datetime with timezone', () {
      final input = '1990-05-20T00:00:00.000Z';
      final out = AppDateUtils.formatDobForDisplay(input);
      expect(out, '20/05/1990');
    });

    test('parses dd/MM/yyyy input', () {
      final input = '20/05/1990';
      final out = AppDateUtils.formatDobForDisplay(input);
      expect(out, '20/05/1990');
    });

    test('parses dd-MM-yyyy input', () {
      final input = '20-05-1990';
      final out = AppDateUtils.formatDobForDisplay(input);
      expect(out, '20/05/1990');
    });

    test('empty string returns empty', () {
      final input = '';
      final out = AppDateUtils.formatDobForDisplay(input);
      expect(out, '');
    });

    test('malformed string returns original', () {
      final input = 'not-a-date';
      final out = AppDateUtils.formatDobForDisplay(input);
      expect(out, input);
    });
  });
}
