import 'dart:async';
import 'package:detect_care_app/core/utils/logger.dart';
import 'package:detect_care_app/services/alert_settings_manager.dart';
import 'package:detect_care_app/services/notification_manager.dart';
import 'package:detect_care_app/services/sms_service.dart';
import 'package:detect_care_app/services/emergency_contact_service.dart';
import 'package:detect_care_app/services/caregiver_service.dart';
import 'package:detect_care_app/services/call_service.dart';
import 'package:detect_care_app/services/email_service.dart';
import 'package:detect_care_app/services/alert_retry_exceptions.dart';

class AlertRetryService {
  static final AlertRetryService _instance = AlertRetryService._internal();
  factory AlertRetryService() => _instance;
  AlertRetryService._internal();

  final Map<String, Timer> _activeRetries = {};
  final Map<String, int> _retryCounts = {};
  final Map<String, DateTime> _lastRetryTimes = {};

  // Service dependencies
  late final SmsService _smsService;
  late final EmergencyContactService _emergencyContactService;
  late final CaregiverService _caregiverService;
  late final CallService _callService;
  late final EmailService _emailService;

  // Current user context
  String? _currentUserId;

  // Circuit breaker state for notification channels
  final Map<String, DateTime> _circuitBreakerOpen = {};
  final Map<String, int> _circuitBreakerFailures = {};
  static const int _maxConsecutiveFailures = 3;
  static const Duration _circuitBreakerTimeout = Duration(minutes: 5);

  // Notification retry configuration
  static const int _maxNotificationRetries = 2;
  static const Duration _notificationRetryDelay = Duration(seconds: 5);

  void initializeServices({
    required SmsService smsService,
    required EmergencyContactService emergencyContactService,
    required CaregiverService caregiverService,
    required CallService callService,
    required EmailService emailService,
  }) {
    _smsService = smsService;
    _emergencyContactService = emergencyContactService;
    _caregiverService = caregiverService;
    _callService = callService;
    _emailService = emailService;
  }

  void setCurrentUserId(String userId) {
    // Validate input parameter
    if (userId.isEmpty) {
      throw InvalidParameterException('userId', 'cannot be empty');
    }

    _currentUserId = userId;
    AppLogger.i('Set current user ID for alert service: $userId');
  }

  /// Check if a notification channel is available (not in circuit breaker state)
  bool _isChannelAvailable(String channel) {
    final openTime = _circuitBreakerOpen[channel];
    if (openTime == null) return true;

    if (DateTime.now().difference(openTime) > _circuitBreakerTimeout) {
      // Circuit breaker timeout expired, reset
      _circuitBreakerOpen.remove(channel);
      _circuitBreakerFailures.remove(channel);
      AppLogger.i('Circuit breaker reset for channel: $channel');
      return true;
    }

    return false;
  }

  /// Handle notification failure with circuit breaker pattern
  void _handleNotificationFailure(String channel, dynamic error) {
    final failures = _circuitBreakerFailures[channel] ?? 0;
    _circuitBreakerFailures[channel] = failures + 1;

    if (_circuitBreakerFailures[channel]! >= _maxConsecutiveFailures) {
      _circuitBreakerOpen[channel] = DateTime.now();
      AppLogger.w('Circuit breaker opened for channel: $channel after $failures failures');
    }

    AppLogger.apiError('Notification failed for channel $channel: $error');
  }

  /// Execute notification with retry logic
  Future<void> _executeNotificationWithRetry(
    String channel,
    Future<void> Function() notificationFunction,
  ) async {
    if (!_isChannelAvailable(channel)) {
      AppLogger.w('Channel $channel is in circuit breaker state, skipping notification');
      return;
    }

    for (int attempt = 0; attempt <= _maxNotificationRetries; attempt++) {
      try {
        await notificationFunction();
        // Success - reset failure count
        _circuitBreakerFailures.remove(channel);
        return;
      } catch (e) {
        AppLogger.w('Notification attempt ${attempt + 1} failed for channel $channel: $e');

        if (attempt < _maxNotificationRetries) {
          await Future.delayed(_notificationRetryDelay * (attempt + 1));
        } else {
          // All retries failed
          _handleNotificationFailure(channel, e);
          throw NotificationFailedException(channel, e);
        }
      }
    }
  }

  void scheduleAlertRetry({
    required String alertId,
    required String caregiverId,
    required String message,
    required AlertSettings settings,
    required String severity,
  }) {
    // Validate input parameters
    if (alertId.isEmpty) {
      throw InvalidParameterException('alertId', 'cannot be empty');
    }
    if (caregiverId.isEmpty) {
      throw InvalidParameterException('caregiverId', 'cannot be empty');
    }
    if (message.isEmpty) {
      throw InvalidParameterException('message', 'cannot be empty');
    }
    if (severity.isEmpty) {
      throw InvalidParameterException('severity', 'cannot be empty');
    }
    if (!['low', 'medium', 'high', 'critical'].contains(severity.toLowerCase())) {
      throw InvalidParameterException('severity', 'must be one of: low, medium, high, critical');
    }

    final retryKey = '$alertId-$caregiverId';
    AppLogger.i('Scheduling alert retry: $retryKey, severity: $severity, message length: ${message.length}');

    // Cancel existing retry if any
    _cancelRetry(retryKey);

    final retryCount = _retryCounts[retryKey] ?? 0;
    if (retryCount >= settings.retrySettings.maxRetries) {
      AppLogger.w('Alert $retryKey reached max retries ($retryCount), escalating');
      _escalateAlert(alertId, caregiverId, message, settings, severity);
      return;
    }

    // Calculate delay with exponential backoff
    final delay = _calculateDelay(retryCount, settings.retrySettings);
    AppLogger.i('Scheduling retry $retryCount for $retryKey in ${delay.inSeconds}s');

    _activeRetries[retryKey] = Timer(delay, () async {
      _retryCounts[retryKey] = retryCount + 1;
      _lastRetryTimes[retryKey] = DateTime.now();

      AppLogger.i('Executing retry $retryCount for $retryKey');

      // Send retry notification
      await _sendRetryNotification(caregiverId, message, settings, severity);

      // Schedule next retry or escalation
      scheduleAlertRetry(
        alertId: alertId,
        caregiverId: caregiverId,
        message: message,
        settings: settings,
        severity: severity,
      );
    });
  }

  void cancelAlertRetry(String alertId, String caregiverId) {
    // Validate input parameters
    if (alertId.isEmpty) {
      throw InvalidParameterException('alertId', 'cannot be empty');
    }
    if (caregiverId.isEmpty) {
      throw InvalidParameterException('caregiverId', 'cannot be empty');
    }

    final retryKey = '$alertId-$caregiverId';
    final wasActive = _activeRetries.containsKey(retryKey);
    _cancelRetry(retryKey);

    if (wasActive) {
      AppLogger.i('Cancelled active alert retry: $retryKey');
    } else {
      AppLogger.d('No active retry found to cancel: $retryKey');
    }
  }

  void _cancelRetry(String retryKey) {
    _activeRetries[retryKey]?.cancel();
    _activeRetries.remove(retryKey);
  }

  Duration _calculateDelay(int retryCount, RetrySettings settings) {
    final delay =
        settings.initialDelay * (settings.backoffMultiplier * retryCount);
    return delay > settings.maxDelay ? settings.maxDelay : delay;
  }

  Future<void> _sendRetryNotification(
    String caregiverId,
    String message,
    AlertSettings settings,
    String severity,
  ) async {
    final notificationManager = NotificationManager();

    // Send push notification
    if (settings.shouldShowPush(severity)) {
      await notificationManager.showNotification(
        title: 'Cảnh báo khẩn cấp - Thử lại',
        body: message,
        urgent: severity == 'critical',
      );
    }

    // Send SMS if enabled and this is a retry
    if (settings.sms) {
      await _sendSmsRetry(caregiverId, message);
    }

    // Send email if enabled
    if (settings.email) {
      await _sendEmailRetry(caregiverId, message);
    }
  }

  void _escalateAlert(
    String alertId,
    String caregiverId,
    String message,
    AlertSettings settings,
    String severity,
  ) {
    AppLogger.i('Escalating alert $alertId for caregiver $caregiverId');

    // Send escalation notifications asynchronously
    _sendEscalationNotifications(alertId, caregiverId, message, settings, severity);
  }

  Future<void> _sendEscalationNotifications(
    String alertId,
    String caregiverId,
    String message,
    AlertSettings settings,
    String severity,
  ) async {
    for (final channel in settings.retrySettings.escalationChannels) {
      switch (channel) {
        case 'sms':
          await _sendEscalationSMS(caregiverId, message);
          break;
        case 'call':
          await _sendEscalationCall(caregiverId, message);
          break;
        case 'emergency_contact':
          await _notifyEmergencyContacts(alertId, message);
          break;
      }
    }
  }

  Future<void> _sendEscalationSMS(String caregiverId, String message) async {
    // Validate input parameters
    if (caregiverId.isEmpty) {
      throw InvalidParameterException('caregiverId', 'cannot be empty');
    }
    if (message.isEmpty) {
      throw InvalidParameterException('message', 'cannot be empty');
    }

    await _executeNotificationWithRetry('sms', () async {
      // Get caregiver phone number from API
      final caregiverPhone = await _caregiverService.getCaregiverPhoneNumber(caregiverId);

      if (caregiverPhone == null || caregiverPhone.isEmpty) {
        throw ContactInfoMissingException(caregiverId, 'phone number');
      }

      await _smsService.sendSms(
        to: caregiverPhone,
        message: '[ESCALATION] $message',
      );
      AppLogger.i('Sent escalation SMS to caregiver $caregiverId at $caregiverPhone');
    });
  }

  Future<void> _sendEscalationCall(String caregiverId, String message) async {
    // Validate input parameters
    if (caregiverId.isEmpty) {
      throw InvalidParameterException('caregiverId', 'cannot be empty');
    }
    if (message.isEmpty) {
      throw InvalidParameterException('message', 'cannot be empty');
    }

    await _executeNotificationWithRetry('call', () async {
      // Get caregiver phone number from API
      final caregiverPhone = await _caregiverService.getCaregiverPhoneNumber(caregiverId);

      if (caregiverPhone == null || caregiverPhone.isEmpty) {
        throw ContactInfoMissingException(caregiverId, 'phone number');
      }

      await _callService.makeEscalationCall(caregiverPhone, message);
      AppLogger.i('Made escalation call to caregiver $caregiverId at $caregiverPhone');
    });
  }

  Future<void> _notifyEmergencyContacts(String alertId, String message) async {
    // Validate input parameters
    if (alertId.isEmpty) {
      throw InvalidParameterException('alertId', 'cannot be empty');
    }
    if (message.isEmpty) {
      throw InvalidParameterException('message', 'cannot be empty');
    }

    await _executeNotificationWithRetry('emergency_contact', () async {
      // Get user ID from current context
      final userId = _currentUserId;
      if (userId == null || userId.isEmpty) {
        throw AlertRetryException('No current user ID set for emergency contact notification', code: 'USER_CONTEXT_MISSING');
      }

      await _emergencyContactService.notifyEmergencyContacts(
        alertId: alertId,
        message: message,
        userId: userId,
      );
      AppLogger.i('Notified emergency contacts for alert $alertId (user: $userId)');
    });
  }

  // Get retry status for monitoring
  Map<String, dynamic> getRetryStatus(String alertId, String caregiverId) {
    // Validate input parameters
    if (alertId.isEmpty) {
      throw InvalidParameterException('alertId', 'cannot be empty');
    }
    if (caregiverId.isEmpty) {
      throw InvalidParameterException('caregiverId', 'cannot be empty');
    }

    final retryKey = '$alertId-$caregiverId';
    return {
      'retry_count': _retryCounts[retryKey] ?? 0,
      'last_retry': _lastRetryTimes[retryKey]?.toIso8601String(),
      'is_active': _activeRetries.containsKey(retryKey),
      'next_retry': _calculateNextRetryTime(retryKey),
    };
  }

  /// Get circuit breaker status for monitoring
  Map<String, dynamic> getCircuitBreakerStatus() {
    final now = DateTime.now();
    final status = <String, dynamic>{};

    for (final entry in _circuitBreakerOpen.entries) {
      final channel = entry.key;
      final openTime = entry.value;
      final timeRemaining = _circuitBreakerTimeout - now.difference(openTime);

      status[channel] = {
        'is_open': true,
        'failures': _circuitBreakerFailures[channel] ?? 0,
        'opened_at': openTime.toIso8601String(),
        'time_remaining_seconds': timeRemaining.inSeconds > 0 ? timeRemaining.inSeconds : 0,
      };
    }

    // Add closed channels with failure counts
    for (final entry in _circuitBreakerFailures.entries) {
      final channel = entry.key;
      if (!status.containsKey(channel)) {
        status[channel] = {
          'is_open': false,
          'failures': entry.value,
        };
      }
    }

    return status;
  }

  /// Get comprehensive service health metrics
  Map<String, dynamic> getServiceHealthMetrics() {
    final now = DateTime.now();
    final totalRetries = _retryCounts.values.fold<int>(0, (sum, count) => sum + count);
    final activeRetries = _activeRetries.length;
    final totalAlerts = _retryCounts.length;

    // Calculate average retry delay
    final delays = <Duration>[];
    for (final entry in _lastRetryTimes.entries) {
      final retryKey = entry.key;
      final retryCount = _retryCounts[retryKey] ?? 0;
      if (retryCount > 0) {
        // Use default retry settings for calculation
        final defaultSettings = RetrySettings(
          maxRetries: 3,
          initialDelay: const Duration(seconds: 30),
          maxDelay: const Duration(minutes: 5),
          backoffMultiplier: 2.0,
          escalationDelay: const Duration(minutes: 10),
          escalationChannels: ['sms', 'call'],
        );
        final delay = _calculateDelay(retryCount - 1, defaultSettings);
        delays.add(delay);
      }
    }

    final avgDelay = delays.isNotEmpty
        ? delays.fold<Duration>(Duration.zero, (sum, delay) => sum + delay) ~/ delays.length
        : Duration.zero;

    return {
      'timestamp': now.toIso8601String(),
      'active_retries': activeRetries,
      'total_alerts_processed': totalAlerts,
      'total_retry_attempts': totalRetries,
      'average_retry_delay_seconds': avgDelay.inSeconds,
      'circuit_breaker_status': getCircuitBreakerStatus(),
      'memory_usage': {
        'retry_counts': _retryCounts.length,
        'last_retry_times': _lastRetryTimes.length,
        'circuit_breaker_open': _circuitBreakerOpen.length,
        'circuit_breaker_failures': _circuitBreakerFailures.length,
      },
    };
  }

  DateTime? _calculateNextRetryTime(String retryKey) {
    if (!_activeRetries.containsKey(retryKey)) return null;

    final timer = _activeRetries[retryKey];
    if (timer == null) return null;

    // This is approximate since we don't have access to timer's scheduled time
    return DateTime.now().add(const Duration(seconds: 30)); // Placeholder
  }

  void dispose() {
    for (final timer in _activeRetries.values) {
      timer.cancel();
    }
    _activeRetries.clear();
    _retryCounts.clear();
    _lastRetryTimes.clear();
    _circuitBreakerOpen.clear();
    _circuitBreakerFailures.clear();
    AppLogger.i('AlertRetryService disposed');
  }

  Future<void> _sendSmsRetry(String caregiverId, String message) async {
    // Validate input parameters
    if (caregiverId.isEmpty) {
      throw InvalidParameterException('caregiverId', 'cannot be empty');
    }
    if (message.isEmpty) {
      throw InvalidParameterException('message', 'cannot be empty');
    }

    await _executeNotificationWithRetry('sms_retry', () async {
      // Get caregiver phone number from API
      final caregiverPhone = await _caregiverService.getCaregiverPhoneNumber(caregiverId);

      if (caregiverPhone == null || caregiverPhone.isEmpty) {
        throw ContactInfoMissingException(caregiverId, 'phone number');
      }

      await _smsService.sendSms(
        to: caregiverPhone,
        message: '[RETRY] $message',
      );
      AppLogger.i('Sent SMS retry to caregiver $caregiverId at $caregiverPhone');
    });
  }

  Future<void> _sendEmailRetry(String caregiverId, String message) async {
    // Validate input parameters
    if (caregiverId.isEmpty) {
      throw InvalidParameterException('caregiverId', 'cannot be empty');
    }
    if (message.isEmpty) {
      throw InvalidParameterException('message', 'cannot be empty');
    }

    await _executeNotificationWithRetry('email_retry', () async {
      // Get caregiver email from API
      final caregiverEmail = await _caregiverService.getCaregiverEmail(caregiverId);

      if (caregiverEmail == null || caregiverEmail.isEmpty) {
        throw ContactInfoMissingException(caregiverId, 'email');
      }

      if (!_emailService.isConfigured) {
        throw ServiceNotConfiguredException('Email');
      }

      await _emailService.sendRetryEmail(
        to: caregiverEmail,
        subject: 'Cảnh báo khẩn cấp - Thử lại',
        message: message,
      );
      AppLogger.i('Sent email retry to caregiver $caregiverId at $caregiverEmail');
    });
  }
}
