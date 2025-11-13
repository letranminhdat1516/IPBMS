import 'package:intl/intl.dart';

/// Utility helpers for date parsing/formatting used in the app.
class AppDateUtils {
  /// Parse an ISO-8601 date / datetime or common local formats and return a
  /// user-friendly display string in `dd/MM/yyyy` format. If parsing fails,
  /// returns the original input.
  static String formatDobForDisplay(String isoOrRaw) {
    if (isoOrRaw.isEmpty) return '';

    // Try to parse ISO-8601 first
    try {
      final dt = DateTime.parse(isoOrRaw);
      return DateFormat('dd/MM/yyyy').format(dt);
    } catch (_) {
      // not full ISO
    }

    // Try common patterns: yyyy-MM-dd, dd/MM/yyyy, dd-MM-yyyy
    final patterns = [
      DateFormat('yyyy-MM-dd'),
      DateFormat('dd/MM/yyyy'),
      DateFormat('dd-MM-yyyy'),
    ];
    for (final pattern in patterns) {
      try {
        final dt = pattern.parseStrict(isoOrRaw);
        return DateFormat('dd/MM/yyyy').format(dt);
      } catch (_) {
        // ignore
      }
    }

    // If all parsing fails, return original string (safe fallback)
    return isoOrRaw;
  }
}
