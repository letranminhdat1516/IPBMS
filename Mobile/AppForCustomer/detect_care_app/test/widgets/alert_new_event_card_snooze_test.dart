import 'package:detect_care_app/features/home/widgets/alert_new_event_card.dart';
import 'package:detect_care_app/services/audio_service.dart';
import 'package:detect_care_app/l10n/vi.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

class FakeAudioService implements AudioServiceBase {
  bool playCalled = false;
  bool stopCalled = false;
  int playCount = 0;
  int stopCount = 0;

  @override
  Future<void> play({bool urgent = false}) async {
    playCalled = true;
    playCount += 1;
  }

  @override
  Future<void> stop() async {
    stopCalled = true;
    stopCount += 1;
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('AlertEventCard snooze/audio', () {
    late AudioServiceBase original;
    late FakeAudioService fakeAudio;

    setUp(() {
      // replace global instance with a fake
      original = AudioService.instance;
      fakeAudio = FakeAudioService();
      AudioService.instance = fakeAudio;
    });

    tearDown(() {
      // restore original
      AudioService.instance = original;
    });

    testWidgets(
      'snooze triggers stop() and expiry triggers play()',
      (tester) async {
        final card = AlertEventCard(
          eventId: 'evt-1',
          eventType: 'fall',
          timestamp: DateTime.now(),
          severity: 'critical',
          description: 'Test description',
        );

        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              // Provide a larger canvas so the Positioned controls (top/right)
              // are visible and hittable in tests.
              body: SizedBox(
                width: 720,
                height: 900,
                child: Center(child: card),
              ),
            ),
          ),
        );

        // ensure widget built (avoid pumpAndSettle because the card has ongoing
        // repeating animations; pump a couple frames instead)
        await tester.pump();
        await tester.pump(const Duration(milliseconds: 100));

        // Open popup menu via the PopupMenuButton state (more reliable than tap
        // because the button is positioned).
        final popupFinder = find.byType(PopupMenuButton<int>);
        expect(popupFinder, findsOneWidget);
        final dynamic popupState = tester.state(popupFinder);
        // Show the menu
        popupState.showButtonMenu();
        await tester.pump();
        await tester.pump(const Duration(milliseconds: 200));

        // Tap the localized 30s entry
        final menuItem30 = find.text(L10nVi.snooze30s);
        expect(menuItem30, findsOneWidget);
        await tester.tap(menuItem30);
        // let the menu selection process
        await tester.pump();
        await tester.pump(const Duration(milliseconds: 200));

        // After selecting snooze, fake.stop should have been called
        expect(fakeAudio.stopCalled, isTrue);
        expect(fakeAudio.stopCount, greaterThanOrEqualTo(1));

        // The badge should appear with '30s' (or similar). Wait a short period.
        await tester.pump();
        await tester.pump(const Duration(milliseconds: 100));
        expect(find.textContaining('30'), findsWidgets);

        // Advance time by 31 seconds to let the snooze expire and the timer fire
        await tester.pump(const Duration(seconds: 31));
        // avoid pumpAndSettle because animations repeat; a short pump is enough
        await tester.pump();
        await tester.pump(const Duration(milliseconds: 200));

        // After expiry, fake.play should have been called once
        expect(fakeAudio.playCalled, isTrue);
        expect(fakeAudio.playCount, greaterThanOrEqualTo(1));
      },
      timeout: const Timeout(Duration(seconds: 10)),
    );
  });
}
