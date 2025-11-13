// import 'package:flutter_test/flutter_test.dart';
// import 'package:shared_preferences/shared_preferences.dart';
// import 'package:detect_care_app/features/setting/providers/image_settings_provider.dart';
// import 'package:detect_care_app/features/setting/data/image_settings_remote_data_source.dart';
// import 'package:detect_care_app/core/network/api_client.dart';
// import 'package:http/http.dart' as http;

// class FakeResponse extends http.Response {
//   FakeResponse(super.body, super.statusCode);
// }

// class FakeApiProvider implements ApiProvider {
//   final List<Map<String, dynamic>> _settings;
//   FakeApiProvider(this._settings);

//   @override
//   Future<http.Response> get(
//     String path, {
//     Map<String, dynamic>? query,
//     Map<String, String>? extraHeaders,
//   }) async {
//     // Return the list as JSON-like string (tests will parse via extractData)
//     final body = '[${_settings.map((e) => e).toList()}]';
//     return FakeResponse(body, 200);
//   }

//   @override
//   Future<http.Response> post(
//     String path, {
//     Object? body,
//     Map<String, dynamic>? query,
//     Map<String, String>? extraHeaders,
//   }) async {
//     return FakeResponse('{}', 200);
//   }

//   @override
//   Future<http.Response> put(
//     String path, {
//     Object? body,
//     Map<String, dynamic>? query,
//     Map<String, String>? extraHeaders,
//   }) async {
//     return FakeResponse('{}', 200);
//   }

//   @override
//   Future<http.Response> patch(
//     String path, {
//     Object? body,
//     Map<String, dynamic>? query,
//     Map<String, String>? extraHeaders,
//   }) async {
//     return FakeResponse('{}', 200);
//   }

//   @override
//   Future<http.Response> delete(
//     String path, {
//     Map<String, dynamic>? query,
//     Object? body,
//     Map<String, String>? extraHeaders,
//   }) async {
//     return FakeResponse('{}', 200);
//   }

//   @override
//   dynamic extractDataFromResponse(http.Response res) {
//     // Simulate decoded list of maps
//     return _settings;
//   }
// }

// void main() {
//   TestWidgetsFlutterBinding.ensureInitialized();

//   setUp(() async {
//     // Setup SharedPreferences for testing with user ID
//     SharedPreferences.setMockInitialValues({
//       'user_id': 'test-user-123',
//       'access_token': 'mock-token',
//     });
//   });

//   test('ImageSettingsProvider loadSettings uses remote', () async {
//     final fakeData = [
//       {
//         'id': '1',
//         'key': 'enableImageSaving',
//         'value': null,
//         'is_enabled': true,
//       },
//       {
//         'id': '2',
//         'key': 'normalRetentionDays',
//         'value': '30',
//         'is_enabled': true,
//       },
//     ];

//     final fakeApi = FakeApiProvider(fakeData);
//     final remote = ImageSettingsRemoteDataSource(api: fakeApi);
//     final provider = ImageSettingsProvider(remote);

//     await provider.loadSettings();

//     expect(provider.settings, isNotEmpty);
//     final saved = provider.settings.firstWhere(
//       (s) => s.key == 'enableImageSaving',
//     );
//     expect(saved.isEnabled, isTrue);
//   });
// }
