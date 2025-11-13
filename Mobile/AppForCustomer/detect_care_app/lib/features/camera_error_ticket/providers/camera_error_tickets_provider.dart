import 'package:detect_care_app/features/camera_error_ticket/data/camera_error_tickets_remote_data_source.dart';
import 'package:detect_care_app/features/camera_error_ticket/models/camera_error_ticket.dart';
import 'package:flutter/material.dart';

class CameraErrorTicketsProvider extends ChangeNotifier {
  final CameraErrorTicketsRemoteDataSource _dataSource;

  CameraErrorTicketsProvider({CameraErrorTicketsRemoteDataSource? dataSource})
    : _dataSource = dataSource ?? CameraErrorTicketsRemoteDataSource();

  bool _isLoading = false;
  String? _error;
  List<CameraErrorTicket> _tickets = [];

  bool get isLoading => _isLoading;
  String? get error => _error;
  List<CameraErrorTicket> get tickets => _tickets;

  Future<void> loadTickets({int page = 1, int limit = 20}) async {
    try {
      _isLoading = true;
      _error = null;
      notifyListeners();

      final tickets = await _dataSource.getTickets(page: page, limit: limit);
      _tickets = tickets;
    } catch (e) {
      _error = e.toString();
      _tickets = [];
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<CameraErrorTicket?> createTicket({
    required String errorType,
    required String description,
    String? phone,
    required bool allowContact,
    List<String>? imageUrls,
  }) async {
    try {
      _isLoading = true;
      _error = null;
      notifyListeners();

      final ticket = await _dataSource.createTicket(
        errorType: errorType,
        description: description,
        phone: phone,
        allowContact: allowContact,
        imageUrls: imageUrls,
      );

      // Add to local list
      _tickets.insert(0, ticket);

      return ticket;
    } catch (e) {
      _error = e.toString();
      return null;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<CameraErrorTicket?> getTicket(String ticketId) async {
    try {
      return await _dataSource.getTicket(ticketId);
    } catch (e) {
      _error = e.toString();
      return null;
    }
  }

  Future<bool> updateTicketStatus({
    required String ticketId,
    required String status,
  }) async {
    try {
      _isLoading = true;
      _error = null;
      notifyListeners();

      final updatedTicket = await _dataSource.updateTicketStatus(
        ticketId: ticketId,
        status: status,
      );

      // Update local list
      final index = _tickets.indexWhere((t) => t.id == ticketId);
      if (index != -1) {
        _tickets[index] = updatedTicket;
      }

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
