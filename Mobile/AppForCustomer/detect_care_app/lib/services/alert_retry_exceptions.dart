/// Custom exceptions for Alert Retry Service
class AlertRetryException implements Exception {
  final String message;
  final String? code;
  final dynamic originalError;

  AlertRetryException(this.message, {this.code, this.originalError});

  @override
  String toString() => 'AlertRetryException: $message${code != null ? ' ($code)' : ''}';
}

class CaregiverNotFoundException extends AlertRetryException {
  CaregiverNotFoundException(String caregiverId)
      : super('Caregiver not found: $caregiverId', code: 'CAREGIVER_NOT_FOUND');
}

class ContactInfoMissingException extends AlertRetryException {
  ContactInfoMissingException(String caregiverId, String contactType)
      : super('Missing $contactType for caregiver: $caregiverId', code: 'CONTACT_INFO_MISSING');
}

class ServiceNotConfiguredException extends AlertRetryException {
  ServiceNotConfiguredException(String serviceName)
      : super('$serviceName service not configured', code: 'SERVICE_NOT_CONFIGURED');
}

class NotificationFailedException extends AlertRetryException {
  NotificationFailedException(String channel, dynamic error)
      : super('Failed to send $channel notification', code: 'NOTIFICATION_FAILED', originalError: error);
}

class InvalidParameterException extends AlertRetryException {
  InvalidParameterException(String parameter, String reason)
      : super('Invalid parameter $parameter: $reason', code: 'INVALID_PARAMETER');
}