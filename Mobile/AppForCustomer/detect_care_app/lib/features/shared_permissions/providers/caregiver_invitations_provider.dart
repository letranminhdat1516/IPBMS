import 'package:flutter/foundation.dart';
import 'package:detect_care_app/features/shared_permissions/data/shared_permissions_remote_data_source.dart';
import 'package:detect_care_app/features/shared_permissions/models/caregiver_invitation.dart';

class CaregiverInvitationsProvider with ChangeNotifier {
  final SharedPermissionsRemoteDataSource _dataSource;

  CaregiverInvitationsProvider(this._dataSource);

  // For caregivers - pending invitations
  List<CaregiverInvitation> _pendingInvitations = [];
  bool _isLoadingPending = false;
  String? _pendingError;

  // For caregivers - all assignments
  List<CaregiverInvitation> _caregiverAssignments = [];
  bool _isLoadingCaregiverAssignments = false;
  String? _caregiverAssignmentsError;

  // For customers - all assignments
  List<CaregiverInvitation> _customerAssignments = [];
  bool _isLoadingCustomerAssignments = false;
  String? _customerAssignmentsError;

  // Getters
  List<CaregiverInvitation> get pendingInvitations => _pendingInvitations;
  bool get isLoadingPending => _isLoadingPending;
  String? get pendingError => _pendingError;

  List<CaregiverInvitation> get caregiverAssignments => _caregiverAssignments;
  bool get isLoadingCaregiverAssignments => _isLoadingCaregiverAssignments;
  String? get caregiverAssignmentsError => _caregiverAssignmentsError;

  List<CaregiverInvitation> get customerAssignments => _customerAssignments;
  bool get isLoadingCustomerAssignments => _isLoadingCustomerAssignments;
  String? get customerAssignmentsError => _customerAssignmentsError;

  // Load pending invitations for current caregiver
  Future<void> loadPendingInvitations() async {
    _isLoadingPending = true;
    _pendingError = null;
    notifyListeners();

    try {
      _pendingInvitations = await _dataSource.getPendingAssignments();
    } catch (e) {
      _pendingError = e.toString();
    } finally {
      _isLoadingPending = false;
      notifyListeners();
    }
  }

  // Load assignments for current caregiver
  Future<void> loadCaregiverAssignments({String? status}) async {
    _isLoadingCaregiverAssignments = true;
    _caregiverAssignmentsError = null;
    notifyListeners();

    try {
      _caregiverAssignments = await _dataSource.getAssignmentsForCaregiver(
        status: status,
      );
    } catch (e) {
      _caregiverAssignmentsError = e.toString();
    } finally {
      _isLoadingCaregiverAssignments = false;
      notifyListeners();
    }
  }

  // Load assignments for current customer
  Future<void> loadCustomerAssignments({String? status}) async {
    _isLoadingCustomerAssignments = true;
    _customerAssignmentsError = null;
    notifyListeners();

    try {
      _customerAssignments = await _dataSource.getAssignmentsForCustomer(
        status: status,
      );
    } catch (e) {
      _customerAssignmentsError = e.toString();
    } finally {
      _isLoadingCustomerAssignments = false;
      notifyListeners();
    }
  }

  // Accept invitation
  Future<void> acceptInvitation(String assignmentId) async {
    try {
      final updatedInvitation = await _dataSource.acceptAssignment(
        assignmentId: assignmentId,
      );

      // Update in pending list
      final pendingIndex = _pendingInvitations.indexWhere(
        (inv) => inv.id == assignmentId,
      );
      if (pendingIndex >= 0) {
        _pendingInvitations[pendingIndex] = updatedInvitation;
        notifyListeners();
      }

      // Update in caregiver assignments list
      final caregiverIndex = _caregiverAssignments.indexWhere(
        (inv) => inv.id == assignmentId,
      );
      if (caregiverIndex >= 0) {
        _caregiverAssignments[caregiverIndex] = updatedInvitation;
        notifyListeners();
      }
    } catch (e) {
      rethrow;
    }
  }

  // Reject invitation
  Future<void> rejectInvitation(String assignmentId) async {
    try {
      final updatedInvitation = await _dataSource.rejectAssignment(
        assignmentId: assignmentId,
      );

      // Update in pending list
      final pendingIndex = _pendingInvitations.indexWhere(
        (inv) => inv.id == assignmentId,
      );
      if (pendingIndex >= 0) {
        _pendingInvitations[pendingIndex] = updatedInvitation;
        notifyListeners();
      }

      // Update in caregiver assignments list
      final caregiverIndex = _caregiverAssignments.indexWhere(
        (inv) => inv.id == assignmentId,
      );
      if (caregiverIndex >= 0) {
        _caregiverAssignments[caregiverIndex] = updatedInvitation;
        notifyListeners();
      }
    } catch (e) {
      rethrow;
    }
  }

  // Create new assignment (for customers)
  Future<CaregiverInvitation> createAssignment({
    required String caregiverId,
    String? assignmentNotes,
  }) async {
    final invitation = await _dataSource.createAssignment(
      caregiverId: caregiverId,
      assignmentNotes: assignmentNotes,
    );

    // Add to customer assignments list
    _customerAssignments.add(invitation);
    notifyListeners();

    return invitation;
  }

  // Unassign by ID
  Future<void> unassignById(String assignmentId) async {
    await _dataSource.unassignById(assignmentId: assignmentId);

    // Remove from lists
    _pendingInvitations.removeWhere((inv) => inv.id == assignmentId);
    _caregiverAssignments.removeWhere((inv) => inv.id == assignmentId);
    _customerAssignments.removeWhere((inv) => inv.id == assignmentId);
    notifyListeners();
  }

  // Unassign by pair
  Future<void> unassignByPair({
    required String caregiverId,
    required String customerId,
  }) async {
    await _dataSource.unassignByPair(
      caregiverId: caregiverId,
      customerId: customerId,
    );

    // Remove from lists
    _pendingInvitations.removeWhere(
      (inv) => inv.caregiverId == caregiverId && inv.customerId == customerId,
    );
    _caregiverAssignments.removeWhere(
      (inv) => inv.caregiverId == caregiverId && inv.customerId == customerId,
    );
    _customerAssignments.removeWhere(
      (inv) => inv.caregiverId == caregiverId && inv.customerId == customerId,
    );
    notifyListeners();
  }

  // Refresh all data
  Future<void> refreshAll() async {
    await Future.wait([
      loadPendingInvitations(),
      loadCaregiverAssignments(),
      loadCustomerAssignments(),
    ]);
  }
}
