import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:detect_care_app/features/events/data/events_remote_data_source.dart';
import 'package:detect_care_app/core/network/api_client.dart';

class _FakeApi implements ApiProvider {
  final http.Response response;
  _FakeApi(this.response);

  @override
  Future<http.Response> delete(
    String path, {
    Map<String, dynamic>? query,
    Object? body,
    Map<String, String>? extraHeaders,
  }) {
    throw UnimplementedError();
  }

  @override
  Future<http.Response> get(
    String path, {
    Map<String, dynamic>? query,
    Map<String, String>? extraHeaders,
  }) {
    throw UnimplementedError();
  }

  @override
  Future<http.Response> patch(
    String path, {
    Object? body,
    Map<String, dynamic>? query,
    Map<String, String>? extraHeaders,
  }) async {
    return response;
  }

  @override
  Future<http.Response> post(
    String path, {
    Object? body,
    Map<String, dynamic>? query,
    Map<String, String>? extraHeaders,
  }) {
    throw UnimplementedError();
  }

  @override
  Future<http.Response> put(
    String path, {
    Object? body,
    Map<String, dynamic>? query,
    Map<String, String>? extraHeaders,
  }) {
    throw UnimplementedError();
  }

  @override
  dynamic extractDataFromResponse(http.Response res) {
    return json.decode(res.body);
  }
}

void main() {
  group('EventsRemoteDataSource.updateEvent', () {
    test('completes on 200', () async {
      final res = http.Response(json.encode({'ok': true}), 200);
      final fake = _FakeApi(res);
      final ds = EventsRemoteDataSource(api: fake);

      await ds.updateEvent(eventId: 'e1', status: 'handled', notes: 'ok');
    });

    test('throws on 500', () async {
      final res = http.Response('server error', 500);
      final fake = _FakeApi(res);
      final ds = EventsRemoteDataSource(api: fake);

      expect(
        () => ds.updateEvent(eventId: 'e2', status: 'skipped', notes: ''),
        throwsA(isA<Exception>()),
      );
    });
  });
}
