import 'package:detect_care_app/core/network/api_client.dart';
import 'package:detect_care_app/features/auth/data/auth_storage.dart';

class Snapshot {
  final String snapshotId;
  final String? cloudUrl;
  final String? imagePath;

  Snapshot({required this.snapshotId, this.cloudUrl, this.imagePath});

  factory Snapshot.fromJson(Map<String, dynamic> j) => Snapshot(
    snapshotId: (j['snapshot_id'] ?? j['id'] ?? '').toString(),
    cloudUrl: (j['cloud_url'] ?? j['url'])?.toString(),
    imagePath: (j['image_path'] ?? j['path'])?.toString(),
  );
}

class SnapshotsRemoteDataSource {
  final ApiClient _api;
  SnapshotsRemoteDataSource({ApiClient? api})
    : _api = api ?? ApiClient(tokenProvider: AuthStorage.getAccessToken);

  Future<Snapshot> getById(String id) async {
    final res = await _api.get('/snapshots/$id');
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw Exception('Fetch snapshot failed: ${res.statusCode} ${res.body}');
    }
    final Map<String, dynamic> data = _api.extractDataFromResponse(res);
    return Snapshot.fromJson(data);
  }

  Future<List<Snapshot>> getManyByIds(List<String> ids) async {
    if (ids.isEmpty) return const [];
    final unique = ids.toSet().toList();

    final res = await _api.get('/snapshots', query: {'ids': unique.join(',')});
    if (res.statusCode >= 200 && res.statusCode < 300) {
      final Map<String, dynamic> response = _api.decodeResponseBody(res);
      final dynamic data = response.containsKey('data')
          ? response['data']
          : response;
      final List list = data is List ? data : <dynamic>[];
      return list
          .cast<Map>()
          .map((e) => Snapshot.fromJson(e.cast<String, dynamic>()))
          .toList();
    }

    final out = <Snapshot>[];
    for (final id in unique) {
      final one = await getById(id);
      out.add(one);
    }
    return out;
  }
}
