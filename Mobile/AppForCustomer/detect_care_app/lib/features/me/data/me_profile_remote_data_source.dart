import 'package:detect_care_app/core/network/api_client.dart';
import 'package:detect_care_app/features/auth/data/auth_storage.dart';
import 'package:detect_care_app/features/me/models/user_profile.dart';
import 'package:flutter/foundation.dart';

class MeProfileRemoteDataSource {
  final ApiClient _apiClient;

  MeProfileRemoteDataSource({ApiClient? apiClient})
    : _apiClient =
          apiClient ?? ApiClient(tokenProvider: AuthStorage.getAccessToken);

  /// GET /me/profile - Get user profile information
  Future<UserProfile> getProfile() async {
    final response = await _apiClient.get('/me/profile');

    debugPrint(
      '[MeProfileAPI] GET /me/profile -> status=${response.statusCode} body=${response.body}',
    );

    if (response.statusCode == 200) {
      final data = _apiClient.extractDataFromResponse(response);
      return UserProfile.fromJson(data);
    } else if (response.statusCode == 404) {
      throw Exception('User profile not found');
    } else {
      throw Exception('Failed to load user profile');
    }
  }

  /// PUT /me/profile - Update user profile
  Future<UserProfile> updateProfile({
    String? bio,
    String? website,
    String? location,
    String? avatarUrl,
    DateTime? dateOfBirth,
    String? gender,
    Map<String, dynamic>? metadata,
  }) async {
    final body = <String, dynamic>{};

    if (bio != null) body['bio'] = bio;
    if (website != null) body['website'] = website;
    if (location != null) body['location'] = location;
    if (avatarUrl != null) body['avatar_url'] = avatarUrl;
    if (dateOfBirth != null) {
      body['date_of_birth'] = dateOfBirth.toIso8601String();
    }
    if (gender != null) body['gender'] = gender;
    if (metadata != null) body['metadata'] = metadata;

    final response = await _apiClient.put('/me/profile', body: body);

    debugPrint(
      '[MeProfileAPI] PUT /me/profile REQUEST body=$body -> status=${response.statusCode} body=${response.body}',
    );

    if (response.statusCode == 200) {
      final data = _apiClient.extractDataFromResponse(response);
      return UserProfile.fromJson(data);
    } else {
      throw Exception('Failed to update user profile');
    }
  }
}
