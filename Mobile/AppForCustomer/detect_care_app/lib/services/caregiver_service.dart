import 'package:detect_care_app/core/network/api_client.dart';
import 'package:detect_care_app/core/utils/logger.dart';
import 'package:detect_care_app/features/caregiver/data/caregiver_api.dart';

class CaregiverService {
  static final CaregiverService _instance = CaregiverService._internal();
  factory CaregiverService() => _instance;
  CaregiverService._internal();

  late final CaregiverApi _caregiverApi;

  void initialize(ApiClient apiClient) {
    _caregiverApi = CaregiverApi(apiClient);
  }

  /// Get caregiver contact information by ID
  Future<Map<String, dynamic>?> getCaregiverContact(String caregiverId) async {
    try {
      final caregiverData = await _caregiverApi.getCaregiver(caregiverId);

      if (caregiverData.isEmpty) {
        AppLogger.w('Caregiver not found: $caregiverId');
        return null;
      }

      // Extract contact information
      final phoneNumber = caregiverData['phone_number'] ?? caregiverData['phone'];
      final email = caregiverData['email'];

      if (phoneNumber == null || phoneNumber.toString().isEmpty) {
        AppLogger.w('Caregiver $caregiverId has no phone number');
        return null;
      }

      return {
        'id': caregiverId,
        'phone_number': phoneNumber.toString(),
        'email': email?.toString(),
        'full_name': caregiverData['full_name'] ?? caregiverData['name'] ?? '',
      };
    } catch (e) {
      AppLogger.apiError('Failed to get caregiver contact: $e');
      return null;
    }
  }

  /// Get caregiver phone number by ID
  Future<String?> getCaregiverPhoneNumber(String caregiverId) async {
    final contact = await getCaregiverContact(caregiverId);
    return contact?['phone_number'];
  }

  /// Get caregiver email by ID
  Future<String?> getCaregiverEmail(String caregiverId) async {
    final contact = await getCaregiverContact(caregiverId);
    return contact?['email'];
  }
}