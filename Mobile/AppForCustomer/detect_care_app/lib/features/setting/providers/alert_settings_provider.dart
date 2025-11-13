import 'package:detect_care_app/core/data/settings_remote_data_source.dart'
    as core_ds;
import 'package:detect_care_app/core/models/settings.dart';
import 'package:flutter/foundation.dart';

class AlertSettingsProvider extends ChangeNotifier {
  final core_ds.SettingsRemoteDataSource remote;
  String _userId = '';

  AlertSettingsProvider(this.remote);

  bool _loading = false;
  String? _error;
  AlertSettings? _settings;

  bool get loading => _loading;
  String? get error => _error;
  AlertSettings? get settings => _settings;

  void updateUserId(String uid) {
    if (_userId == uid) return;
    _userId = uid;
    if (_userId.isNotEmpty) load();
  }

  Future<void> load() async {
    if (_userId.isEmpty) return;
    if (_loading) return;
    _loading = true;
    _error = null;
    notifyListeners();
    try {
      _settings = await remote.getAlertSettings(_userId);
    } catch (e) {
      _error = e.toString();
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<void> save(AlertSettings settings) async {
    if (_userId.isEmpty) throw Exception('No user id');
    _loading = true;
    _error = null;
    notifyListeners();
    try {
      _settings = await remote.saveAlertSettings(_userId, settings);
    } catch (e) {
      _error = e.toString();
      rethrow;
    } finally {
      _loading = false;
      notifyListeners();
    }
  }
}
