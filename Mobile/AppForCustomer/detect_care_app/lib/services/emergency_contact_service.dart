import 'package:detect_care_app/core/utils/logger.dart';
import 'package:detect_care_app/features/emergency_contacts/data/emergency_contacts_remote_data_source.dart';
import 'package:detect_care_app/services/sms_service.dart';

class EmergencyContactService {
  final EmergencyContactsRemoteDataSource _contactsDataSource;
  final SmsService _smsService;

  EmergencyContactService({
    required EmergencyContactsRemoteDataSource contactsDataSource,
    required SmsService smsService,
  }) : _contactsDataSource = contactsDataSource,
       _smsService = smsService;

  Future<void> notifyEmergencyContacts({
    required String alertId,
    required String message,
    required String userId,
  }) async {
    try {
      AppLogger.i('Starting emergency contact notification for alert $alertId');

      // Fetch emergency contacts for the user
      final contacts = await _contactsDataSource.list(userId);

      if (contacts.isEmpty) {
        AppLogger.w('No emergency contacts found for user $userId');
        return;
      }

      // Group contacts by priority level
      final priority1Contacts = contacts.where((c) => c.alertLevel == 1).toList();
      final priority2Contacts = contacts.where((c) => c.alertLevel == 2).toList();

      AppLogger.i('Found ${priority1Contacts.length} priority 1 and ${priority2Contacts.length} priority 2 contacts');

      // Notify priority 1 contacts first
      if (priority1Contacts.isNotEmpty) {
        await _notifyContactsGroup(
          contacts: priority1Contacts,
          message: '[ƯU TIÊN 1] $message',
          alertId: alertId,
        );
      }

      // Notify priority 2 contacts after a delay
      if (priority2Contacts.isNotEmpty) {
        await Future.delayed(const Duration(seconds: 30)); // Wait 30 seconds
        await _notifyContactsGroup(
          contacts: priority2Contacts,
          message: '[ƯU TIÊN 2] $message',
          alertId: alertId,
        );
      }

      AppLogger.i('Emergency contact notification completed for alert $alertId');

    } catch (e) {
      AppLogger.apiError('Error notifying emergency contacts: $e');
      throw Exception('Failed to notify emergency contacts: $e');
    }
  }

  Future<void> _notifyContactsGroup({
    required List<EmergencyContactDto> contacts,
    required String message,
    required String alertId,
  }) async {
    final phoneNumbers = contacts.map((c) => c.phone).where((phone) => phone.isNotEmpty).toList();

    AppLogger.i('Notifying ${contacts.length} contacts for alert $alertId');

    // Send SMS to all contacts in the group
    final smsSuccess = await _smsService.sendBulkSms(
      recipients: phoneNumbers,
      message: message,
    );

    if (smsSuccess) {
      AppLogger.i('Successfully sent SMS notifications to ${contacts.length} contacts');
    } else {
      AppLogger.w('Some SMS notifications may have failed');
    }

    // Log notification for each contact
    for (final contact in contacts) {
      await _logEmergencyNotification(
        alertId: alertId,
        contactId: contact.id,
        contactName: contact.name,
        contactPhone: contact.phone,
        message: message,
      );
    }
  }

  Future<void> _logEmergencyNotification({
    required String alertId,
    required String contactId,
    required String contactName,
    required String contactPhone,
    required String message,
  }) async {
    try {
      // TODO: Implement logging to backend API
      AppLogger.i('Logged emergency notification: Alert $alertId -> $contactName ($contactPhone)');
    } catch (e) {
      AppLogger.apiError('Error logging emergency notification: $e');
    }
  }

  Future<List<EmergencyContactDto>> getEmergencyContacts(String userId) async {
    return await _contactsDataSource.list(userId);
  }
}