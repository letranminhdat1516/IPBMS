import 'package:flutter/foundation.dart';
import 'package:detect_care_app/core/data/consent_remote_data_source.dart';
import 'package:detect_care_app/core/models/user_consent.dart';

class ConsentProvider with ChangeNotifier {
  final ConsentRemoteDataSource _dataSource;
  final String userId;

  ConsentProvider(this._dataSource, this.userId);

  List<UserConsent> _consents = [];
  bool _isLoading = false;
  String? _error;

  List<UserConsent> get consents => _consents;
  bool get isLoading => _isLoading;
  String? get error => _error;

  bool hasConsented(ConsentType type) {
    final consent = _consents.firstWhere(
      (c) => c.type == type,
      orElse: () => UserConsent(
        id: '',
        userId: userId,
        type: type,
        version: '1.0',
        consented: false,
      ),
    );
    return consent.consented;
  }

  Future<void> loadConsents() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _consents = await _dataSource.getUserConsents(userId);
    } catch (e) {
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> giveConsent({
    required ConsentType type,
    required String version,
    String? ipAddress,
    String? userAgent,
    Map<String, dynamic>? metadata,
  }) async {
    try {
      final consent = await _dataSource.createConsent(
        userId: userId,
        type: type,
        version: version,
        consented: true,
        ipAddress: ipAddress,
        userAgent: userAgent,
        metadata: metadata,
      );
      _consents.add(consent);
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      rethrow;
    }
  }

  Future<void> revokeConsent({
    required String consentId,
    String? ipAddress,
    String? userAgent,
    Map<String, dynamic>? metadata,
  }) async {
    try {
      final updatedConsent = await _dataSource.updateConsent(
        userId: userId,
        consentId: consentId,
        consented: false,
        ipAddress: ipAddress,
        userAgent: userAgent,
        metadata: metadata,
      );

      final index = _consents.indexWhere((c) => c.id == consentId);
      if (index != -1) {
        _consents[index] = updatedConsent;
        notifyListeners();
      }
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      rethrow;
    }
  }

  Future<Map<String, dynamic>> getConsentPolicy(ConsentType type) async {
    return await _dataSource.getConsentPolicy(type);
  }
}
