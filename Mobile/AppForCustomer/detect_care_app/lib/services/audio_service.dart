import 'package:flutter_ringtone_player/flutter_ringtone_player.dart';
import 'package:detect_care_app/core/utils/logger.dart';

abstract class AudioServiceBase {
  Future<void> play({bool urgent = false});
  Future<void> stop();
}

class AudioService implements AudioServiceBase {
  AudioService._();

  static AudioServiceBase instance = AudioService._();

  bool _isPlaying = false;

  @override
  Future<void> play({bool urgent = false}) async {
    try {
      if (_isPlaying) return;
      _isPlaying = true;
      if (urgent) {
        // Play alarm/urgent sound
        FlutterRingtonePlayer().playAlarm();
      } else {
        FlutterRingtonePlayer().playNotification();
      }
    } catch (e, st) {
      AppLogger.e('AudioService.play error: $e', e, st);
      _isPlaying = false;
    }
  }

  /// Stop any playing sound initiated by this service.
  @override
  Future<void> stop() async {
    try {
      if (!_isPlaying) return;
      FlutterRingtonePlayer().stop();
    } catch (e, st) {
      AppLogger.e('AudioService.stop error: $e', e, st);
    } finally {
      _isPlaying = false;
    }
  }
}
