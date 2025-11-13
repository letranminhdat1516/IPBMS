import 'package:detect_care_app/core/network/api_client.dart';
import 'package:detect_care_app/features/auth/data/auth_storage.dart';
import 'package:detect_care_app/features/camera_error_ticket/models/camera_error_ticket.dart';
import 'package:flutter/foundation.dart';

class CameraErrorTicketsRemoteDataSource {
  final ApiClient _apiClient;

  CameraErrorTicketsRemoteDataSource({ApiClient? apiClient})
    : _apiClient =
          apiClient ?? ApiClient(tokenProvider: AuthStorage.getAccessToken);

  /// POST /camera-error-tickets - Create new camera error ticket
  Future<CameraErrorTicket> createTicket({
    required String errorType,
    required String description,
    String? phone,
    required bool allowContact,
    List<String>? imageUrls,
  }) async {
    final body = {
      'error_type': errorType,
      'description': description,
      if (phone != null) 'phone': phone,
      'allow_contact': allowContact,
      if (imageUrls != null && imageUrls.isNotEmpty) 'image_urls': imageUrls,
    };

    final response = await _apiClient.post('/camera-error-tickets', body: body);

    debugPrint(
      '[CameraErrorTicketsAPI] POST /camera-error-tickets REQUEST body=$body -> status=${response.statusCode} body=${response.body}',
    );

    if (response.statusCode == 201 || response.statusCode == 200) {
      final data = _apiClient.extractDataFromResponse(response);
      return CameraErrorTicket.fromJson(data);
    } else {
      throw Exception('Failed to create camera error ticket');
    }
  }

  /// GET /camera-error-tickets - Get user's camera error tickets
  Future<List<CameraErrorTicket>> getTickets({
    int page = 1,
    int limit = 20,
  }) async {
    final query = {'page': page, 'limit': limit};

    final response = await _apiClient.get(
      '/camera-error-tickets',
      query: query,
    );

    debugPrint(
      '[CameraErrorTicketsAPI] GET /camera-error-tickets query=$query -> status=${response.statusCode} body=${response.body}',
    );

    if (response.statusCode == 200) {
      final data = _apiClient.extractDataFromResponse(response);
      if (data is List) {
        return data.map((item) => CameraErrorTicket.fromJson(item)).toList();
      }
      return [];
    } else {
      throw Exception('Failed to load camera error tickets');
    }
  }

  /// GET /camera-error-tickets/{id} - Get specific ticket
  Future<CameraErrorTicket> getTicket(String ticketId) async {
    final response = await _apiClient.get('/camera-error-tickets/$ticketId');

    debugPrint(
      '[CameraErrorTicketsAPI] GET /camera-error-tickets/$ticketId -> status=${response.statusCode} body=${response.body}',
    );

    if (response.statusCode == 200) {
      final data = _apiClient.extractDataFromResponse(response);
      return CameraErrorTicket.fromJson(data);
    } else if (response.statusCode == 404) {
      throw Exception('Camera error ticket not found');
    } else {
      throw Exception('Failed to load camera error ticket');
    }
  }

  /// PATCH /camera-error-tickets/{id} - Update ticket status
  Future<CameraErrorTicket> updateTicketStatus({
    required String ticketId,
    required String status,
  }) async {
    final body = {'status': status};

    final response = await _apiClient.patch(
      '/camera-error-tickets/$ticketId',
      body: body,
    );

    debugPrint(
      '[CameraErrorTicketsAPI] PATCH /camera-error-tickets/$ticketId REQUEST body=$body -> status=${response.statusCode} body=${response.body}',
    );

    if (response.statusCode == 200) {
      final data = _apiClient.extractDataFromResponse(response);
      return CameraErrorTicket.fromJson(data);
    } else {
      throw Exception('Failed to update camera error ticket status');
    }
  }
}
