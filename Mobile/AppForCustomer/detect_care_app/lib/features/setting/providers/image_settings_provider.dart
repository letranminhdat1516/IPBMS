import 'package:detect_care_app/features/setting/data/image_settings_remote_data_source.dart';
import 'package:flutter/material.dart';

class ImageSettingsProvider with ChangeNotifier {
  final ImageSettingsRemoteDataSource remoteDataSource;
  String _userId = '';

  ImageSettingsProvider(this.remoteDataSource);

  List<ImageSetting> _settings = [];
  bool _loading = false;

  List<ImageSetting> get settings => _settings;
  bool get loading => _loading;

  void updateUserId(String uid) {
    if (_userId == uid) return;
    _userId = uid;
    if (_userId.isNotEmpty) {
      loadImageSettings();
    } else {
      _settings = [];
      notifyListeners();
    }
  }

  Future<void> loadImageSettings() async {
    _loading = true;
    notifyListeners();
    try {
      if (_userId.isNotEmpty) {
        print('🔄 [ImageSettingsProvider] Loading settings for user: $_userId');
      } else {
        print('🔄 [ImageSettingsProvider] Loading settings (no user id)');
      }
      _settings = await remoteDataSource.fetchImageSettings();
      print('✅ [ImageSettingsProvider] Loaded ${_settings.length} settings');
    } catch (e) {
      print('❌ [ImageSettingsProvider] Failed to load settings: $e');
      _settings = [];
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<void> updateImageSetting(String key, String value) async {
    if (_userId.isEmpty) {
      print('⚠️ [ImageSettingsProvider] Cannot update setting: no user ID');
      return;
    }
    await remoteDataSource.updateImageSetting(key, value);
    await loadImageSettings();
  }

  // Future<void> toggleSetting(String key, bool enabled) async {
  //   if (_userId.isEmpty) {
  //     print(
  //       '⚠️ [ImageSettingsProvider] Cannot toggle setting: no user ID',
  //     );
  //     return;
  //   }
  //   await remoteDataSource.toggleImageSetting(key, enabled);
  //   await loadSettings();
  // }
}
