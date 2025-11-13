import 'dart:io';
import '../repository/support_tickets_repository.dart';

class SupportTicketsService {
  final SupportTicketsRepository _repo;

  SupportTicketsService(this._repo);

  //  Lấy metadata (statuses, categories, transitions)
  Future<Map<String, dynamic>> fetchMeta() async {
    final res = await _repo.getMeta();
    if (res['success'] == true) return res['data'] ?? {};
    throw Exception(res['message'] ?? 'Failed to fetch meta');
  }

  //  Lấy danh sách tất cả tickets
  Future<List<dynamic>> fetchAllTickets() async {
    final res = await _repo.getAllTickets();
    if (res['success'] == true) return res['data'] ?? [];
    throw Exception(res['message'] ?? 'Failed to fetch tickets');
  }

  //  Lấy chi tiết ticket theo ID
  Future<Map<String, dynamic>> fetchTicketById(String id) async {
    final res = await _repo.getTicketById(id);
    if (res.containsKey('ticket_id')) return res;
    if (res['success'] == true) return res['data'] ?? {};
    throw Exception(res['message'] ?? 'Failed to fetch ticket detail');
  }

  //  Tạo mới ticket
  Future<Map<String, dynamic>> createTicket(Map<String, dynamic> data) async {
    final res = await _repo.createTicket(data);
    if (res['message'] != null) return res;
    throw Exception(res['message'] ?? 'Failed to create ticket');
  }

  // Register a credential image (after client upload)
  Future<Map<String, dynamic>> createCredentialImage(
    Map<String, dynamic> data,
  ) async {
    final res = await _repo.createCredentialImage(data);
    try {
      print('[SERVICE] createCredentialImage raw response: $res');
    } catch (_) {}

    if (res['success'] == true) return res['data'] ?? {};

    final msg = res['message'] != null
        ? res['message'].toString()
        : 'Failed to create credential image';
    throw Exception('createCredentialImage failed: $msg | body: $res');
  }

  Future<Map<String, dynamic>> createCredentialImageFromFile(File file) async {
    final res = await _repo.createCredentialImageFromFile(file);
    try {
      print('[SERVICE] createCredentialImageFromFile raw response: $res');
    } catch (_) {}
    if (res['success'] == true) return res['data'] ?? {};
    final msg = res['message'] != null
        ? res['message'].toString()
        : 'Failed to create credential image from file';
    throw Exception('createCredentialImageFromFile failed: $msg | body: $res');
  }

  //  Cập nhật ticket
  Future<Map<String, dynamic>> updateTicket(
    String id,
    Map<String, dynamic> data,
  ) async {
    final res = await _repo.updateTicket(id, data);
    if (res['message'] != null) return res;
    throw Exception(res['message'] ?? 'Failed to update ticket');
  }

  //  Xóa ticket
  Future<Map<String, dynamic>> deleteTicket(String id) async {
    final res = await _repo.deleteTicket(id);
    if (res['message'] != null) return res;
    throw Exception(res['message'] ?? 'Failed to delete ticket');
  }
}
