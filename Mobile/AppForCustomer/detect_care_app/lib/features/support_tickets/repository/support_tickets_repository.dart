import 'dart:io';
import '../data/support_tickets_remote_data_source.dart';

class SupportTicketsRepository {
  final SupportTicketsRemoteDataSource _remote;

  SupportTicketsRepository(this._remote);

  Future<Map<String, dynamic>> getMeta() => _remote.getMeta();

  Future<Map<String, dynamic>> getAllTickets() => _remote.getAllTickets();

  Future<Map<String, dynamic>> getTicketById(String id) =>
      _remote.getTicketById(id);

  Future<Map<String, dynamic>> createTicket(Map<String, dynamic> data) =>
      _remote.createTicket(data);

  Future<Map<String, dynamic>> createCredentialImage(
    Map<String, dynamic> data,
  ) => _remote.createCredentialImage(data);

  Future<Map<String, dynamic>> createCredentialImageFromFile(File file) =>
      _remote.createCredentialImageFromFile(file);

  Future<Map<String, dynamic>> updateTicket(
    String id,
    Map<String, dynamic> data,
  ) => _remote.updateTicket(id, data);

  Future<Map<String, dynamic>> deleteTicket(String id) =>
      _remote.deleteTicket(id);
}
