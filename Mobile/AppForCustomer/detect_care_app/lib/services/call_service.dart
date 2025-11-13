import 'package:detect_care_app/core/utils/logger.dart';
import 'package:url_launcher/url_launcher.dart';

class CallService {
  static final CallService _instance = CallService._internal();
  factory CallService() => _instance;
  CallService._internal();

  /// Make a phone call to the specified number
  Future<void> makeCall(String phoneNumber, {String? message}) async {
    try {
      final Uri callUri = Uri(scheme: 'tel', path: phoneNumber);

      if (await canLaunchUrl(callUri)) {
        await launchUrl(callUri);
        AppLogger.i(
          'Initiated call to $phoneNumber${message != null ? ' with message: $message' : ''}',
        );
      } else {
        AppLogger.w('Cannot make call: Device does not support phone calls');
        throw Exception('Device does not support phone calls');
      }
    } catch (e) {
      AppLogger.apiError('Failed to make call to $phoneNumber: $e');
      rethrow;
    }
  }

  /// Make an emergency call with escalation message
  Future<void> makeEscalationCall(String phoneNumber, String message) async {
    try {
      // For escalation calls, we can include a message in logs but the actual call
      // will just dial the number since most mobile platforms don't support
      // automated voice messages through tel: URI
      await makeCall(phoneNumber, message: '[ESCALATION] $message');
    } catch (e) {
      AppLogger.apiError('Failed to make escalation call: $e');
      rethrow;
    }
  }

  /// Check if the device can make phone calls
  Future<bool> canMakeCalls() async {
    final Uri testUri = Uri(scheme: 'tel', path: '123');
    return await canLaunchUrl(testUri);
  }
}
