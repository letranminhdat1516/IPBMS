import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:detect_care_app/core/utils/logger.dart';

class SmsService {
  static const String _baseUrl = 'https://api.twilio.com'; // Example SMS provider
  final String accountSid;
  final String authToken;
  final String fromNumber;

  SmsService({
    required this.accountSid,
    required this.authToken,
    required this.fromNumber,
  });

  Future<bool> sendSms({
    required String to,
    required String message,
    String? from,
  }) async {
    try {
      AppLogger.api('Sending SMS to $to: ${message.substring(0, 50)}...');

      final url = Uri.parse('$_baseUrl/2010-04-01/Accounts/$accountSid/Messages.json');

      final credentials = base64Encode(utf8.encode('$accountSid:$authToken'));

      final response = await http.post(
        url,
        headers: {
          'Authorization': 'Basic $credentials',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: {
          'To': to,
          'From': from ?? fromNumber,
          'Body': message,
        },
      );

      AppLogger.api('SMS API response status: ${response.statusCode}');

      if (response.statusCode == 201) {
        final data = json.decode(response.body);
        AppLogger.api('SMS sent successfully. SID: ${data['sid']}');
        return true;
      } else {
        AppLogger.apiError('Failed to send SMS: ${response.statusCode} - ${response.body}');
        return false;
      }
    } catch (e) {
      AppLogger.apiError('Error sending SMS: $e');
      return false;
    }
  }

  Future<bool> sendBulkSms({
    required List<String> recipients,
    required String message,
    String? from,
  }) async {
    bool allSuccessful = true;

    for (final recipient in recipients) {
      final success = await sendSms(
        to: recipient,
        message: message,
        from: from,
      );

      if (!success) {
        allSuccessful = false;
      }

      // Add small delay between SMS to avoid rate limiting
      await Future.delayed(const Duration(milliseconds: 100));
    }

    return allSuccessful;
  }
}