import 'package:flutter/foundation.dart';
import 'package:detect_care_app/features/shared_permissions/data/shared_permissions_remote_data_source.dart';
import 'package:detect_care_app/features/shared_permissions/models/caregiver_permission.dart';
import 'package:detect_care_app/features/shared_permissions/models/shared_permissions.dart';

class SharedPermissionsProvider with ChangeNotifier {
  final SharedPermissionsRemoteDataSource _dataSource;
  String _customerId;

  SharedPermissionsProvider(this._dataSource, this._customerId);

  String get customerId => _customerId;

  List<CaregiverPermission> _permissions = [];
  bool _isLoading = false;
  String? _error;

  List<CaregiverPermission> get permissions => _permissions;
  bool get isLoading => _isLoading;
  String? get error => _error;

  void updateCustomerId(String newCustomerId) {
    if (_customerId != newCustomerId) {
      _customerId = newCustomerId;
      // Reload permissions with new customer ID
      if (_customerId.isNotEmpty) {
        loadPermissions();
      }
    }
  }

  Future<void> loadPermissions() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _permissions = await _dataSource.getPermissions(customerId: customerId);
    } catch (e) {
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> updatePermission({
    required String caregiverId,
    required String caregiverUsername,
    String? caregiverPhone,
    required String caregiverFullName,
    required SharedPermissions permissions,
  }) async {
    try {
      final updatedPermission = await _dataSource.updatePermissions(
        customerId: customerId,
        caregiverId: caregiverId,
        caregiverUsername: caregiverUsername,
        caregiverPhone: caregiverPhone,
        caregiverFullName: caregiverFullName,
        permissions: permissions,
      );

      final index = _permissions.indexWhere(
        (p) => p.caregiverId == caregiverId,
      );
      if (index >= 0) {
        _permissions[index] = updatedPermission;
      } else {
        _permissions.add(updatedPermission);
      }
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      rethrow;
    }
  }

  Future<void> removePermission({required String caregiverId}) async {
    try {
      await _dataSource.removePermissions(
        customerId: customerId,
        caregiverId: caregiverId,
      );

      _permissions.removeWhere((p) => p.caregiverId == caregiverId);
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      rethrow;
    }
  }

  Future<CaregiverPermission?> getPermission({
    required String caregiverId,
  }) async {
    try {
      return await _dataSource.getPermission(
        customerId: customerId,
        caregiverId: caregiverId,
      );
    } catch (e) {
      _error = e.toString();
      notifyListeners();
      rethrow;
    }
  }

  // Legacy methods for backward compatibility
  Future<void> loadInvitations() async {
    await loadPermissions();
  }

  Future<void> sendInvitation({
    required String caregiverEmail,
    required String caregiverName,
    required SharedPermissions permissions,
  }) async {
    // For now, this is a no-op since we use direct permissions
    // In the future, this could be implemented to send invitations
    throw UnimplementedError(
      'Invitation system not implemented. Use direct permissions instead.',
    );
  }
}
