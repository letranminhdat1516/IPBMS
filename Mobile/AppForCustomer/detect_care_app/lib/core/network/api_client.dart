import 'dart:convert';

import 'package:detect_care_app/core/config/app_config.dart';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:detect_care_app/core/navigation/root_navigator.dart';
import 'package:detect_care_app/features/auth/data/auth_storage.dart';

typedef TokenProvider = Future<String?> Function();

abstract class ApiProvider {
  Future<http.Response> get(
    String path, {
    Map<String, dynamic>? query,
    Map<String, String>? extraHeaders,
  });
  Future<http.Response> post(
    String path, {
    Object? body,
    Map<String, dynamic>? query,
    Map<String, String>? extraHeaders,
  });
  Future<http.Response> put(
    String path, {
    Object? body,
    Map<String, dynamic>? query,
    Map<String, String>? extraHeaders,
  });
  Future<http.Response> patch(
    String path, {
    Object? body,
    Map<String, dynamic>? query,
    Map<String, String>? extraHeaders,
  });
  Future<http.Response> delete(
    String path, {
    Map<String, dynamic>? query,
    Object? body,
    Map<String, String>? extraHeaders,
  });
  Future<http.Response> postMultipart(
    String path, {
    required Map<String, String> fields,
    required List<http.MultipartFile> files,
    Map<String, dynamic>? query,
    Map<String, String>? extraHeaders,
  });
  dynamic extractDataFromResponse(http.Response res);
}

class ApiClient implements ApiProvider {
  final http.Client _client;
  final TokenProvider? _tokenProvider;
  final String base;

  ApiClient({http.Client? client, TokenProvider? tokenProvider})
    : _client = client ?? http.Client(),
      _tokenProvider = tokenProvider,
      base = AppConfig.apiBaseUrl;

  Uri _uri(String path, [Map<String, dynamic>? query]) {
    final normalizedBase = base.endsWith('/')
        ? base.substring(0, base.length - 1)
        : base;
    final normalizedPath = path.startsWith('/') ? path : '/$path';
    final uri = Uri.parse('$normalizedBase$normalizedPath');
    if (query == null || query.isEmpty) return uri;
    final qp = <String, String>{};
    query.forEach((k, v) {
      if (v == null) return;
      if (v is List) {
        qp[k] = v.join(',');
      } else {
        qp[k] = v.toString();
      }
    });
    return uri.replace(queryParameters: qp);
  }

  Future<Map<String, String>> _headers([Map<String, String>? extra]) async {
    final headers = <String, String>{'Content-Type': 'application/json'};
    final token = await _tokenProvider?.call();
    if (AppConfig.logHttpRequests) {
      debugPrint(
        '[HTTP] Token provider result: ${token != null ? 'TOKEN_PRESENT' : 'NO_TOKEN'}',
      );
      if (token != null && token.isNotEmpty) {
        debugPrint('[HTTP] Token length: ${token.length}');
      }
    }
    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    }
    if (extra != null) headers.addAll(extra);
    return headers;
  }

  void _logRequest(
    String method,
    Uri uri,
    Map<String, String> headers,
    Object? body,
  ) {
    if (!AppConfig.logHttpRequests) return;
    final maskedHeaders = Map<String, String>.from(headers);
    if (maskedHeaders.containsKey('Authorization')) {
      final auth = maskedHeaders['Authorization']!;
      maskedHeaders['Authorization'] = auth.length > 16
          ? '${auth.substring(0, 16)}…(masked)'
          : '(masked)';
    }
    Object? maskedBody = body;
    try {
      if (body is String) {
        final jsonBody = json.decode(body);
        if (jsonBody is Map) {
          final copy = Map<String, dynamic>.from(jsonBody);
          if (copy.containsKey('otp_code')) copy['otp_code'] = '***';
          if (copy.containsKey('password')) copy['password'] = '***';
          maskedBody = json.encode(copy);
        }
      }
    } catch (_) {}
    debugPrint('[HTTP] → $method ${uri.toString()}');
    debugPrint('  headers=${json.encode(maskedHeaders)}');
    if (maskedBody != null && maskedBody.toString().isNotEmpty) {
      debugPrint('  body=$maskedBody');
    }
  }

  void _logResponse(String method, Uri uri, http.Response res, Duration dt) {
    if (!AppConfig.logHttpRequests) return;
    debugPrint(
      '[HTTP] ← $method ${uri.toString()} (${res.statusCode}) in ${dt.inMilliseconds}ms',
    );
  }

  Future<void> _handleUnauthorized() async {
    try {
      await AuthStorage.clear();
    } catch (_) {}
    navigateToLoginAndClearStack();
  }

  /// Decode response body safely. Returns decoded JSON (Map/List/primitive)
  /// or null if body is empty. Throws on invalid JSON.
  dynamic decodeResponseBody(http.Response res) {
    final body = res.body;
    if (body.trim().isEmpty) return null;
    try {
      return json.decode(body);
    } catch (e) {
      debugPrint('[HTTP] Failed to decode JSON response: ${e.toString()}');
      debugPrint('[HTTP] Response body: $body');
      throw Exception('Invalid JSON response');
    }
  }

  /// Extract "data" key when server uses standardized { success, data, error }
  /// fallback to decoded value otherwise.
  @override
  dynamic extractDataFromResponse(http.Response res) {
    final decoded = decodeResponseBody(res);
    if (decoded is Map && decoded.containsKey('data')) return decoded['data'];
    return decoded;
  }

  @override
  Future<http.Response> get(
    String path, {
    Map<String, dynamic>? query,
    Map<String, String>? extraHeaders,
  }) async {
    final uri = _uri(path, query);
    final headers = await _headers(extraHeaders);
    final sw = Stopwatch()..start();
    _logRequest('GET', uri, headers, null);
    final res = await _client.get(uri, headers: headers);
    sw.stop();
    _logResponse('GET', uri, res, sw.elapsed);
    if (res.statusCode == 401) await _handleUnauthorized();
    return res;
  }

  @override
  Future<http.Response> post(
    String path, {
    Object? body,
    Map<String, dynamic>? query,
    Map<String, String>? extraHeaders,
  }) async {
    final uri = _uri(path, query);
    final headers = await _headers(extraHeaders);
    final encodedBody = body == null ? null : json.encode(body);
    final sw = Stopwatch()..start();
    _logRequest('POST', uri, headers, encodedBody);
    final res = await _client.post(uri, headers: headers, body: encodedBody);
    sw.stop();
    _logResponse('POST', uri, res, sw.elapsed);
    if (res.statusCode == 401) await _handleUnauthorized();
    return res;
  }

  @override
  Future<http.Response> put(
    String path, {
    Object? body,
    Map<String, dynamic>? query,
    Map<String, String>? extraHeaders,
  }) async {
    final uri = _uri(path, query);
    final headers = await _headers(extraHeaders);
    final encodedBody = body == null ? null : json.encode(body);
    final sw = Stopwatch()..start();
    _logRequest('PUT', uri, headers, encodedBody);
    final res = await _client.put(uri, headers: headers, body: encodedBody);
    sw.stop();
    _logResponse('PUT', uri, res, sw.elapsed);
    if (res.statusCode == 401) await _handleUnauthorized();
    return res;
  }

  @override
  Future<http.Response> patch(
    String path, {
    Object? body,
    Map<String, dynamic>? query,
    Map<String, String>? extraHeaders,
  }) async {
    final uri = _uri(path, query);
    final headers = await _headers(extraHeaders);
    final encodedBody = body == null ? null : json.encode(body);
    final sw = Stopwatch()..start();
    _logRequest('PATCH', uri, headers, encodedBody);
    final res = await _client.patch(uri, headers: headers, body: encodedBody);
    sw.stop();
    _logResponse('PATCH', uri, res, sw.elapsed);
    if (res.statusCode == 401) await _handleUnauthorized();
    return res;
  }

  @override
  Future<http.Response> delete(
    String path, {
    Map<String, dynamic>? query,
    Object? body,
    Map<String, String>? extraHeaders,
  }) async {
    final uri = _uri(path, query);
    final headers = await _headers(extraHeaders);
    final encodedBody = body == null ? null : json.encode(body);
    final sw = Stopwatch()..start();
    _logRequest('DELETE', uri, headers, encodedBody);
    final res = await _client.delete(uri, headers: headers, body: encodedBody);
    sw.stop();
    _logResponse('DELETE', uri, res, sw.elapsed);
    if (res.statusCode == 401) await _handleUnauthorized();
    return res;
  }

  Future<http.Response> postMultipart(
    String path, {
    required Map<String, String> fields,
    required List<http.MultipartFile> files,
    Map<String, dynamic>? query,
    Map<String, String>? extraHeaders,
  }) async {
    final uri = _uri(path, query);

    final token = await _tokenProvider?.call();
    final headers = <String, String>{
      if (token != null && token.isNotEmpty) 'Authorization': 'Bearer $token',
      'Accept': 'application/json',
      if (extraHeaders != null) ...extraHeaders,
    };

    if (AppConfig.logHttpRequests) {
      debugPrint('[HTTP] → MULTIPART POST $uri');
      debugPrint('  fields=${json.encode(fields)}');
      debugPrint('  files=${files.map((f) => f.filename).toList()}');
    }

    final request = http.MultipartRequest("POST", uri);
    request.headers.addAll(headers);
    request.fields.addAll(fields);
    request.files.addAll(files);

    final sw = Stopwatch()..start();
    final streamed = await request.send();
    final res = await http.Response.fromStream(streamed);
    sw.stop();

    if (AppConfig.logHttpRequests) {
      debugPrint(
        '[HTTP] ← MULTIPART $uri (${res.statusCode}) in ${sw.elapsedMilliseconds}ms',
      );
    }

    if (res.statusCode == 401) {
      await _handleUnauthorized();
    }

    return res;
  }
}
