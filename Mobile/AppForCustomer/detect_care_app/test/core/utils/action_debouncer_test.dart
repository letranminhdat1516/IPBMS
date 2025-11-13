import 'package:detect_care_app/core/utils/action_debouncer.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('ActionDebouncer prevents concurrent runs with same key', () async {
    final debouncer = ActionDebouncer();
    int counter = 0;

    // Start a long running action
    final f1 = debouncer.run('key1', () async {
      await Future.delayed(const Duration(milliseconds: 200));
      counter++;
      return counter;
    });

    // Immediately try to run another action with same key. Should return null
    final f2 = debouncer.run('key1', () async {
      counter++;
      return counter;
    });

    final r1 = await f1;
    final r2 = await f2;

    expect(r1, 1);
    // Since second call should be ignored while first runs, r2 should be null
    expect(r2, isNull);
    // Counter must be 1
    expect(counter, 1);
  });

  test('ActionDebouncer allows sequential runs with same key', () async {
    final debouncer = ActionDebouncer();
    int counter = 0;

    final r1 = await debouncer.run('k', () async {
      counter++;
      return counter;
    });
    final r2 = await debouncer.run('k', () async {
      counter++;
      return counter;
    });

    expect(r1, 1);
    expect(r2, 2);
    expect(counter, 2);
  });
}
