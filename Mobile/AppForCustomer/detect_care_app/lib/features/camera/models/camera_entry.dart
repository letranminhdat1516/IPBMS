import 'package:flutter/foundation.dart';

class CameraEntry {
  final String id;
  final String name;
  final String url;
  final String? thumb;
  final bool isOnline;

  const CameraEntry({
    required this.id,
    required this.name,
    required this.url,
    this.thumb,
    this.isOnline = true,
  });

  Map<String, dynamic> toJson() => {
    'camera_id': id,
    'camera_name': name,
    'rtsp_url': url,
    'thumb': thumb,
    'is_online': isOnline,
  };

  factory CameraEntry.fromJson(Map<String, dynamic> j) {
    // Ưu tiên sử dụng trường 'url' nếu có, nếu không thì xây dựng từ các thành phần
    String finalUrl = j['url']?.toString() ?? '';

    debugPrint('🔍 [CameraEntry] Parsing camera data:');
    debugPrint('  camera_id: ${j['camera_id']}');
    debugPrint('  rtsp_url: ${j['rtsp_url']}');
    debugPrint('  username: ${j['username']}');
    debugPrint('  password: ${j['password'] != null ? "***" : "null"}');

    // Nếu không có url, xây dựng từ rtsp_url + username/password
    if (finalUrl.isEmpty) {
      final rtspUrl = j['rtsp_url']?.toString() ?? '';
      final username = j['username']?.toString();
      final password = j['password']?.toString();

      debugPrint('  Building URL from components...');

      if (rtspUrl.isNotEmpty) {
        if (username != null && username.isNotEmpty) {
          try {
            final uri = Uri.parse(rtspUrl);
            final userInfo = password != null && password.isNotEmpty
                ? '${Uri.encodeComponent(username)}:${Uri.encodeComponent(password)}'
                : Uri.encodeComponent(username);

            // Xây dựng URL với authentication
            final port = uri.hasPort && uri.port != 0 ? ':${uri.port}' : '';
            finalUrl = '${uri.scheme}://$userInfo@${uri.host}$port${uri.path}';
            if (uri.query.isNotEmpty) {
              finalUrl += '?${uri.query}';
            }
            debugPrint('  ✅ Built authenticated URL: $finalUrl');
          } catch (e) {
            // Nếu parse lỗi, giữ nguyên rtsp_url
            finalUrl = rtspUrl;
            debugPrint('  ⚠️ Parse error, using original: $finalUrl');
          }
        } else {
          // Không có username, dùng rtsp_url gốc
          finalUrl = rtspUrl;
          debugPrint('  📝 No auth, using original URL: $finalUrl');
        }
      }
    } else {
      debugPrint('  📋 Using existing URL field: $finalUrl');
    }

    return CameraEntry(
      id: j['camera_id']?.toString() ?? '',
      name: j['camera_name']?.toString() ?? 'Camera',
      url: finalUrl,
      thumb: j['thumb']?.toString(),
      isOnline: j['is_online'] is bool
          ? j['is_online']
          : (j['is_online']?.toString() == 'true'),
    );
  }
}
