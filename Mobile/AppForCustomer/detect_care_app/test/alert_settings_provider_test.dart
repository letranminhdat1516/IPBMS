import 'package:flutter_test/flutter_test.dart';
import 'package:detect_care_app/features/setting/providers/alert_settings_provider.dart';
import 'package:detect_care_app/core/models/settings.dart';
import 'package:detect_care_app/core/data/settings_remote_data_source.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:detect_care_app/core/network/api_client.dart';

class FakeApiProvider implements ApiProvider {
  final Map<String, dynamic> _defaultAlert = {
    'masterNotifications': true,
    'appNotifications': true,
    'emailNotifications': false,
    'smsNotifications': false,
    'callNotifications': false,
    'deviceAlerts': false,
  };

  @override
  Future<http.Response> get(
    String path, {
    Map<String, dynamic>? query,
    Map<String, String>? extraHeaders,
  }) async {
    return http.Response(jsonEncode(_defaultAlert), 200);
  }

  @override
  Future<http.Response> post(
    String path, {
    Object? body,
    Map<String, dynamic>? query,
    Map<String, String>? extraHeaders,
  }) async {
    // Echo back body as JSON
    final jsonBody = body == null
        ? jsonEncode(_defaultAlert)
        : jsonEncode(body);
    return http.Response(jsonBody, 200);
  }

  @override
  Future<http.Response> put(
    String path, {
    Object? body,
    Map<String, dynamic>? query,
    Map<String, String>? extraHeaders,
  }) async {
    final jsonBody = body == null
        ? jsonEncode(_defaultAlert)
        : jsonEncode(body);
    return http.Response(jsonBody, 200);
  }

  @override
  Future<http.Response> patch(
    String path, {
    Object? body,
    Map<String, dynamic>? query,
    Map<String, String>? extraHeaders,
  }) async {
    final jsonBody = body == null
        ? jsonEncode(_defaultAlert)
        : jsonEncode(body);
    return http.Response(jsonBody, 200);
  }

  @override
  Future<http.Response> delete(
    String path, {
    Map<String, dynamic>? query,
    Object? body,
    Map<String, String>? extraHeaders,
  }) async {
    return http.Response('{}', 200);
  }

  @override
  dynamic extractDataFromResponse(http.Response res) {
    final decoded = jsonDecode(res.body);
    return decoded;
  }
}

class FakeSettingsRemote extends SettingsRemoteDataSource {
  AlertSettings? _stored;

  FakeSettingsRemote() : super(api: FakeApiProvider());

  @override
  Future<AlertSettings> getAlertSettings(String userId) async {
    return _stored ??
        const AlertSettings(
          masterNotifications: true,
          appNotifications: true,
          emailNotifications: false,
          smsNotifications: false,
          callNotifications: false,
          deviceAlerts: false,
        );
  }

  @override
  Future<AlertSettings> saveAlertSettings(
    String userId,
    AlertSettings s,
  ) async {
    _stored = s;
    return _stored!;
  }
}

void main() {
  // No env required; FakeApiProvider avoids ApiClient and dotenv access.

  test('AlertSettingsProvider load and save', () async {
    final fake = FakeSettingsRemote();
    final prov = AlertSettingsProvider(fake);

    // Provider requires a non-empty user id to load/save settings.
    prov.updateUserId('test-user');
    // Wait for load to complete
    await prov.load();
    expect(prov.settings, isNotNull);
    expect(prov.settings!.masterNotifications, isTrue);

    final newS = prov.settings!.copyWith(appNotifications: false);

    await prov.save(newS);
    expect(prov.settings!.appNotifications, isFalse);
  });
}
