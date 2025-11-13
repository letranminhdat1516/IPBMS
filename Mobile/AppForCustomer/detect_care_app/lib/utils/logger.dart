import 'dart:collection';
import 'package:flutter/foundation.dart';

/// Lightweight logger wrapper used across the app.
/// - Honors debug mode (no-op in release builds)
/// - Adds a short timestamp and level prefix
/// - Suppresses identical messages appearing repeatedly within a short window
class Logger {
  static final _recent = HashMap<String, DateTime>();
  static const _suppressWindow = Duration(milliseconds: 800);

  static bool get enabled => kDebugMode;

  static void _log(String level, String message) {
    if (!enabled) return;
    final now = DateTime.now();
    final key = '[$level[0m:$message';
    final last = _recent[key];
    if (last != null && now.difference(last) < _suppressWindow) {
      // skip duplicate within short window
      return;
    }
    _recent[key] = now;
    final ts = now.toIso8601String();
    // Use debugPrint to avoid truncation issues in flutter
    debugPrint('[$ts] [$level] $message');
  }

  static void d(String message) => _log('DEBUG', message);
  static void i(String message) => _log('INFO', message);
  static void w(String message) => _log('WARN', message);
  static void e(String message) => _log('ERROR', message);
}
