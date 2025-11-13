import 'package:flutter/foundation.dart';

class User {
  final String id;
  final String username;
  final String fullName;
  final String email;
  final String role;
  final String phone;
  final bool isFirstLogin;
  final bool isActive;
  final String? avatarUrl;

  User({
    required this.id,
    required this.username,
    required this.fullName,
    required this.email,
    required this.role,
    required this.phone,
    this.isFirstLogin = false,
    this.isActive = false,
    this.avatarUrl,
  });

  static String _s(dynamic v) => v == null ? '' : v.toString();
  static bool _b(dynamic v) {
    if (v is bool) return v;
    if (v is num) return v != 0;
    if (v is String) return v.toLowerCase() == 'true';
    return false;
  }

  // Helper method to convert numeric ID to UUID format if needed
  static String _ensureUuidFormat(String id) {
    if (id.isEmpty) return id;

    // Check if already UUID format
    final uuidRegex = RegExp(
      r'^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
    );
    if (uuidRegex.hasMatch(id)) {
      return id;
    }

    // If numeric ID, pad with zeros and format as UUID
    if (RegExp(r'^\d+$').hasMatch(id)) {
      // Pad to 32 chars with leading zeros, then format as UUID
      final padded = id.padLeft(32, '0');
      return '${padded.substring(0, 8)}-${padded.substring(8, 12)}-${padded.substring(12, 16)}-${padded.substring(16, 20)}-${padded.substring(20, 32)}';
    }

    // If string ID, hash it to create a pseudo-UUID
    final hash = id.hashCode.abs().toString().padLeft(10, '0');
    final pseudoUuid = '${hash}00-0000-0000-0000-${hash.padLeft(12, '0')}';
    debugPrint(
      '🔄 [User] Converting non-UUID ID "$id" to pseudo-UUID: $pseudoUuid',
    );
    return pseudoUuid;
  }

  factory User.fromJson(Map<String, dynamic> j) {
    final rawId = j['user_id'] ?? j['id'];
    final processedId = _s(rawId);
    final uuidFormattedId = _ensureUuidFormat(processedId);

    // Debug log the user ID format
    debugPrint(
      '🔍 [User.fromJson] Raw ID from backend: "$rawId" (type: ${rawId.runtimeType})',
    );
    debugPrint('🔍 [User.fromJson] Processed ID: "$processedId"');
    debugPrint('🔍 [User.fromJson] UUID formatted ID: "$uuidFormattedId"');
    debugPrint('🔍 [User.fromJson] Final ID length: ${uuidFormattedId.length}');

    return User(
      id: uuidFormattedId,
      username: _s(j['username']),
      fullName: _s(j['full_name'] ?? j['username']),
      email: _s(j['email']),
      role: _s(j['role']),
      phone: _s(j['phone_number'] ?? j['phone']),
      isFirstLogin: _b(j['is_first_login']),
      isActive: _b(j['is_active']),
      avatarUrl: j['avatar_url']?.toString(),
    );
  }

  Map<String, dynamic> toJson() => {
    'user_id': id,
    'username': username,
    'full_name': fullName,
    'email': email,
    'role': role,
    'phone_number': phone,
    'is_first_login': isFirstLogin,
    'is_active': isActive,
    'avatar_url': avatarUrl,
  };
}
