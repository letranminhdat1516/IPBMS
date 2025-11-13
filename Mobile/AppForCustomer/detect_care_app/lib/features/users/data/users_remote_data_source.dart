import 'package:detect_care_app/core/network/api_client.dart';
import 'package:detect_care_app/features/auth/data/auth_storage.dart';
import 'package:detect_care_app/features/auth/models/user.dart';

class UsersRemoteDataSource {
  final ApiClient _api;
  UsersRemoteDataSource({ApiClient? api})
    : _api = api ?? ApiClient(tokenProvider: AuthStorage.getAccessToken);

  Future<List<User>> listUsers({
    String? role,
    String? search,
    int? page,
    int? limit,
  }) async {
    final res = await _api.get(
      '/users',
      query: {
        if (role != null && role.isNotEmpty) 'role': role,
        if (search != null && search.isNotEmpty) 'search': search,
        if (page != null) 'page': page,
        if (limit != null) 'limit': limit,
      },
    );
    if (res.statusCode != 200) {
      throw Exception('List users failed: ${res.statusCode} ${res.body}');
    }
    final Map<String, dynamic> response = _api.decodeResponseBody(res);
    final dynamic data = response.containsKey('data')
        ? response['data']
        : response;
    if (data is List) {
      return data
          .whereType<Map>()
          .map((e) => User.fromJson(e.cast<String, dynamic>()))
          .toList();
    } else {
      throw Exception('Invalid response format for users list');
    }
  }
}
