import 'dart:collection';
import 'dart:async';

import 'package:detect_care_app/core/utils/logger.dart';
import 'package:detect_care_app/features/home/models/event_log.dart';
import 'package:detect_care_app/features/home/models/log_entry.dart';

import '../../services/audio_service.dart';
import '../ui/in_app_alert.dart';
import '../utils/app_lifecycle.dart';
import 'package:detect_care_app/features/home/service/event_service.dart';

class AlertCoordinator {
  static final _shownAt = HashMap<String, DateTime>();
  static final _pendingTimers = HashMap<String, Timer>();

  static void handle(LogEntry? e) {
    if (e == null) return;

    if (e.eventId.trim().isEmpty) {
      AppLogger.w('⚠️ AlertCoordinator: skipping event with empty eventId');
      return;
    }
    if ((e is EventLog) && e.eventType.trim().isEmpty) {
      AppLogger.w(
        '⚠️ AlertCoordinator: skipping event with empty eventType (id=${e.eventId})',
      );
      return;
    }
    if (e.lifecycleState != null &&
        e.lifecycleState!.toUpperCase() == 'CANCELED') {
      final existing = _pendingTimers.remove(e.eventId);
      existing?.cancel();
      AppLogger.i('ℹ️ Event ${e.eventId} is CANCELED — skipping alert');
      return;
    }

    AppLogger.i('\n🔎 AlertCoordinator scheduling EventLog: ${e.eventId}');
    try {
      AppLogger.d(e.toString());
    } catch (_) {}

    final prev = _pendingTimers.remove(e.eventId);
    if (prev != null) {
      prev.cancel();
      AppLogger.i(
        '🛑 Cancelled previous pending timer for ${e.eventId} (rescheduling)',
      );
    }

    final timer = Timer(const Duration(seconds: 30), () {
      // Timer fired — remove reference
      _pendingTimers.remove(e.eventId);

      // Run the async double-check and show logic
      _checkAndShow(e);
    });

    _pendingTimers[e.eventId] = timer;
  }

  static Future<void> _checkAndShow(LogEntry e) async {
    try {
      // Double-check latest status from server before showing to avoid races
      EventLog? latest;
      try {
        final svc = EventService.withDefaultClient();
        latest = await svc.fetchLogDetail(e.eventId);
        AppLogger.i(
          '🔎 Double-check fetched latest event ${e.eventId} lifecycle=${latest.lifecycleState}',
        );
      } catch (err) {
        AppLogger.w(
          '⚠️ Double-check fetch failed for ${e.eventId}: $err — proceeding with local event',
        );
      }

      final toUse = latest ?? (e is EventLog ? e : null);

      // If latest indicates CANCELED, do not show
      final ls = (toUse?.lifecycleState ?? e.lifecycleState)
          ?.toString()
          .toUpperCase();
      if (ls != null && ls == 'CANCELED') {
        AppLogger.i(
          '✋ Event ${e.eventId} marked CANCELED on server — not showing alert',
        );
        return;
      }

      // Double-check duplicate protection
      if (_isDuplicate(e.eventId)) return;

      AppLogger.i('⏰ 30s elapsed for event ${e.eventId}, showing alert now');

      // If app not in foreground, delay until it becomes foreground (existing behavior)
      if (!AppLifecycle.isForeground) {
        AppLogger.i('⏳ App not in foreground yet — delaying alert...');
        Future.delayed(const Duration(seconds: 2), () {
          if (AppLifecycle.isForeground) {
            AppLogger.i('✅ App now foreground, showing alert');
            try {
              if (toUse != null) {
                final ev = toUse;
                final urgent =
                    ev.confidenceScore > 0.85 ||
                    ev.eventType.toLowerCase() == 'fall_detection';
                AudioService.instance.play(urgent: urgent);
              } else {
                AudioService.instance.play(urgent: false);
              }
            } catch (_) {}
            InAppAlert.show(toUse ?? e);
          } else {
            AppLogger.w('⚠️ Still not foreground after delay, skipping alert');
          }
        });
        return;
      }

      // Play audio for foreground alert and let InAppAlert handle stopping it
      try {
        if (toUse != null) {
          final ev = toUse;
          final urgent =
              ev.confidenceScore > 0.85 ||
              ev.eventType.toLowerCase() == 'fall_detection';
          AudioService.instance.play(urgent: urgent);
        } else {
          AudioService.instance.play(urgent: false);
        }
      } catch (_) {}

      InAppAlert.show(toUse ?? e);
    } catch (outer) {
      AppLogger.e('❌ _checkAndShow error for ${e.eventId}: $outer');
      // If double-check failed catastrophically, fall back to showing the original event
      try {
        if (!_isDuplicate(e.eventId)) {
          AudioService.instance.play(urgent: false);
          InAppAlert.show(e);
        }
      } catch (_) {}
    }
  }

  static bool _isDuplicate(String id) {
    if (id.isEmpty) return false;
    final now = DateTime.now();
    _shownAt.removeWhere((_, t) => now.difference(t).inMinutes >= 2);
    final seen = _shownAt.containsKey(id);
    if (!seen) _shownAt[id] = now;
    return seen;
  }

  static LogEntry? fromData(Map<String, dynamic> data) {
    final isSystemEvent = data['type'] == 'system_event';

    if (isSystemEvent) {
      return EventLog.fromJson(data);
    }
    return null;
  }

  static void handleDeeplink(String deeplink) {
    AppLogger.i('🔗 Deeplink received: $deeplink');
  }
}
