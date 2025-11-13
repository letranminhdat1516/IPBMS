import 'package:detect_care_app/features/me/data/me_profile_remote_data_source.dart';
import 'package:detect_care_app/features/me/models/user_profile.dart';
import 'package:flutter/material.dart';

class MeProfileProvider extends ChangeNotifier {
  final MeProfileRemoteDataSource _dataSource;

  MeProfileProvider({MeProfileRemoteDataSource? dataSource})
    : _dataSource = dataSource ?? MeProfileRemoteDataSource();

  bool _isLoading = false;
  String? _error;
  UserProfile? _profile;

  bool get isLoading => _isLoading;
  String? get error => _error;
  UserProfile? get profile => _profile;

  Future<void> loadProfile() async {
    try {
      _isLoading = true;
      _error = null;
      notifyListeners();

      final profile = await _dataSource.getProfile();
      _profile = profile;
    } catch (e) {
      _error = e.toString();
      _profile = null;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> updateProfile({
    String? bio,
    String? website,
    String? location,
    String? avatarUrl,
    DateTime? dateOfBirth,
    String? gender,
    Map<String, dynamic>? metadata,
  }) async {
    try {
      _isLoading = true;
      _error = null;
      notifyListeners();

      final updatedProfile = await _dataSource.updateProfile(
        bio: bio,
        website: website,
        location: location,
        avatarUrl: avatarUrl,
        dateOfBirth: dateOfBirth,
        gender: gender,
        metadata: metadata,
      );

      _profile = updatedProfile;
      return true;
    } catch (e) {
      _error = e.toString();
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }
}
