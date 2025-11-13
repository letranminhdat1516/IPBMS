import 'package:detect_care_app/core/network/api_client.dart';
import 'package:detect_care_app/features/auth/data/auth_storage.dart';
import '../models/settings_models.dart';
import 'settings_endpoints.dart';

class SettingsRemoteDataSource {
  final ApiClient client;
  final SettingsEndpoints endpoints;
  SettingsRemoteDataSource({ApiClient? client, required this.endpoints})
    : client = client ?? ApiClient(tokenProvider: AuthStorage.getAccessToken);

  Future<AppSettings> fetchSettings() async {
    final res = await client
        .get('/me/settings')
        .timeout(const Duration(seconds: 15));

    if (res.statusCode != 200) {
      throw Exception('Fetch settings failed: ${res.statusCode} ${res.body}');
    }
    final Map<String, dynamic> payload = client.extractDataFromResponse(res);
    return AppSettings.fromJson(payload);
  }

  Future<AppSettings> updateSettings(
    String key,
    AppSettings settings, {
    bool patch = true,
  }) async {
    final body = settings.toJson();
    final res = patch
        ? await client.patch('/me/settings', body: body)
        : await client.put('/me/settings', body: body);

    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw Exception('Update settings failed: ${res.statusCode} ${res.body}');
    }
    final Map<String, dynamic> payload = client.extractDataFromResponse(res);
    return AppSettings.fromJson(payload);
  }
}
