import 'package:detect_care_app/services/alert_retry_service.dart';
import 'package:detect_care_app/services/sms_service.dart';
import 'package:detect_care_app/services/emergency_contact_service.dart';
import 'package:detect_care_app/services/caregiver_service.dart';
import 'package:detect_care_app/services/call_service.dart';
import 'package:detect_care_app/services/email_service.dart';
import 'package:detect_care_app/core/network/api_client.dart';
import 'package:detect_care_app/features/auth/data/auth_storage.dart';
import 'package:detect_care_app/features/emergency_contacts/data/emergency_contacts_remote_data_source.dart';

class ServiceInitializer {
  static bool _isInitialized = false;

  static Future<void> initializeServices() async {
    if (_isInitialized) return;

    // Initialize API Client
    final apiClient = ApiClient(tokenProvider: AuthStorage.getAccessToken);

    // Initialize Caregiver Service
    final caregiverService = CaregiverService();
    caregiverService.initialize(apiClient);

    // Initialize SMS Service with placeholder credentials
    // TODO: Load from environment variables or secure storage
    final smsService = SmsService(
      accountSid: 'AC_placeholder', // Replace with actual Twilio Account SID
      authToken: 'auth_placeholder', // Replace with actual Twilio Auth Token
      fromNumber: '+1234567890', // Replace with actual Twilio phone number
    );

    // Initialize Call Service
    final callService = CallService();

    // Initialize Emergency Contact Service
    final contactsDataSource = EmergencyContactsRemoteDataSource();
    final emergencyContactService = EmergencyContactService(
      contactsDataSource: contactsDataSource,
      smsService: smsService,
    );

    // Initialize Email Service with placeholder configuration
    // TODO: Load from environment variables or secure storage
    final emailService = EmailService();
    emailService.configure(
      smtpHost: 'smtp.gmail.com', // Replace with actual SMTP host
      smtpPort: 587, // Replace with actual SMTP port
      username: 'alerts@detectcare.com', // Replace with actual email
      password: 'placeholder_password', // Replace with actual password
      fromEmail: 'alerts@detectcare.com', // Replace with actual from email
    );

    // Initialize Alert Retry Service
    final alertRetryService = AlertRetryService();
    alertRetryService.initializeServices(
      smsService: smsService,
      emergencyContactService: emergencyContactService,
      caregiverService: caregiverService,
      callService: callService,
      emailService: emailService,
    );

    _isInitialized = true;
  }

  static bool get isInitialized => _isInitialized;
}
