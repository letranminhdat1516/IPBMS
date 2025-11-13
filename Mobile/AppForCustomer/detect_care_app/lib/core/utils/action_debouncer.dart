import 'dart:async';

/// A small helper to prevent double execution of actions keyed by a string.
///
/// Usage:
/// final debouncer = ActionDebouncer();
/// await debouncer.run('upgrade', () async { await apiCall(); });
class ActionDebouncer {
  final Map<String, bool> _running = {};

  /// Run [action] if no other action with the same [key] is currently running.
  /// Returns null immediately if an action with the same key is already running.
  Future<T?> run<T>(String key, Future<T> Function() action) async {
    if (_running[key] == true) return null;
    _running[key] = true;
    try {
      final res = await action();
      return res;
    } finally {
      _running.remove(key);
    }
  }

  bool isRunning(String key) => _running[key] == true;
}
