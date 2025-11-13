import 'dart:convert';
import 'dart:io';
import 'package:detect_care_app/core/network/api_client.dart';
import 'package:detect_care_app/features/auth/data/auth_storage.dart';
import 'package:http/http.dart' as http;

class SupportTicketsRemoteDataSource {
  final ApiClient _client;

  SupportTicketsRemoteDataSource(this._client);

  //  GET /tickets/meta
  Future<Map<String, dynamic>> getMeta() async {
    final http.Response res = await _client.get('/tickets/meta');
    return json.decode(res.body) as Map<String, dynamic>;
  }

  //  GET /tickets
  Future<Map<String, dynamic>> getAllTickets() async {
    final http.Response res = await _client.get('/tickets');
    return json.decode(res.body) as Map<String, dynamic>;
  }

  //  GET /tickets/{id}
  Future<Map<String, dynamic>> getTicketById(String id) async {
    final http.Response res = await _client.get('/tickets/$id');
    return json.decode(res.body) as Map<String, dynamic>;
  }

  // POST /tickets
  Future<Map<String, dynamic>> createTicket(Map<String, dynamic> body) async {
    final http.Response res = await _client.post('/tickets', body: body);
    // Debug: log server response when non-2xx to aid debugging
    try {
      if (res.statusCode < 200 || res.statusCode >= 300) {
        print(
          '[TICKETS] createTicket status=${res.statusCode} body=${res.body}',
        );
      }
    } catch (_) {}
    return json.decode(res.body) as Map<String, dynamic>;
  }

  // POST /credential_images
  // Used to register an image credential (called after uploading to Cloudinary)
  Future<Map<String, dynamic>> createCredentialImage(
    Map<String, dynamic> body,
  ) async {
    final http.Response res = await _client.post(
      '/credential_images',
      body: body,
    );
    try {
      if (res.statusCode < 200 || res.statusCode >= 300) {
        print('[CREDENTIAL_IMAGES] status=${res.statusCode} body=${res.body}');
      }
    } catch (_) {}
    return json.decode(res.body) as Map<String, dynamic>;
  }

  // POST /credential_images (multipart file upload)
  // Uploads file directly to backend; backend will handle storing the file
  Future<Map<String, dynamic>> createCredentialImageFromFile(File file) async {
    final base = _client.base.endsWith('/')
        ? _client.base.substring(0, _client.base.length - 1)
        : _client.base;
    final uri = Uri.parse('$base/credential_images');

    final req = http.MultipartRequest('POST', uri);
    try {
      final token = await AuthStorage.getAccessToken();
      if (token != null && token.isNotEmpty) {
        req.headers['Authorization'] = 'Bearer $token';
      }
    } catch (_) {}

    req.files.add(await http.MultipartFile.fromPath('file', file.path));

    try {
      final streamed = await req.send();
      final res = await http.Response.fromStream(streamed);
      if (res.statusCode < 200 || res.statusCode >= 300) {
        print(
          '[CREDENTIAL_IMAGES] multipart status=${res.statusCode} body=${res.body}',
        );
      }
      return json.decode(res.body) as Map<String, dynamic>;
    } catch (e) {
      print('[CREDENTIAL_IMAGES] multipart error: $e');
      rethrow;
    }
  }

  // PUT /tickets/{id}
  Future<Map<String, dynamic>> updateTicket(
    String id,
    Map<String, dynamic> body,
  ) async {
    final http.Response res = await _client.put('/tickets/$id', body: body);
    return json.decode(res.body) as Map<String, dynamic>;
  }

  // DELETE /tickets/{id}
  Future<Map<String, dynamic>> deleteTicket(String id) async {
    final http.Response res = await _client.delete('/tickets/$id');
    return json.decode(res.body) as Map<String, dynamic>;
  }
}
