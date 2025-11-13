import 'package:detect_care_app/core/network/api_client.dart';
import 'package:detect_care_app/features/auth/data/auth_storage.dart';

class EmergencyContactDto {
  final String id;
  final String name;
  final String relation;
  final String phone;
  final int alertLevel;

  EmergencyContactDto({
    required this.id,
    required this.name,
    required this.relation,
    required this.phone,
    required this.alertLevel,
  });

  factory EmergencyContactDto.fromJson(Map<String, dynamic> j) {
    int parseAlertLevel(dynamic v) {
      if (v == null) return 1;
      if (v is int) return v;
      return int.tryParse(v.toString()) ?? 1;
    }

    return EmergencyContactDto(
      id: (j['id'] ?? j['contact_id'] ?? '').toString(),
      name: j['name']?.toString() ?? '',
      relation: j['relation']?.toString() ?? '',
      phone: j['phone']?.toString() ?? '',
      alertLevel: parseAlertLevel(j['alert_level']),
    );
  }

  Map<String, dynamic> toBody() => {
    'name': name,
    'relation': relation,
    'phone': phone,
    'alert_level': alertLevel,
  };

  EmergencyContactDto copyWith({
    String? id,
    String? name,
    String? relation,
    String? phone,
    int? alertLevel,
  }) => EmergencyContactDto(
    id: id ?? this.id,
    name: name ?? this.name,
    relation: relation ?? this.relation,
    phone: phone ?? this.phone,
    alertLevel: alertLevel ?? this.alertLevel,
  );
}

class EmergencyContactsRemoteDataSource {
  final ApiClient _api;
  EmergencyContactsRemoteDataSource({ApiClient? api})
    : _api = api ?? ApiClient(tokenProvider: AuthStorage.getAccessToken);

  String _base(String userId) => '/users/$userId/emergency-contacts';

  Future<List<EmergencyContactDto>> list(String userId) async {
    final res = await _api.get(_base(userId));
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw Exception('List contacts failed: ${res.statusCode} ${res.body}');
    }
    final decoded = _api.extractDataFromResponse(res);

    final List list = (decoded is Map && decoded['data'] is List)
        ? decoded['data'] as List
        : decoded as List;

    return list
        .cast<Map<String, dynamic>>()
        .map<EmergencyContactDto>(EmergencyContactDto.fromJson)
        .toList();
  }

  Future<EmergencyContactDto> create(
    String userId,
    EmergencyContactDto body,
  ) async {
    final res = await _api.post(_base(userId), body: body.toBody());
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw Exception('Create contact failed: ${res.statusCode} ${res.body}');
    }
    final decoded = _api.extractDataFromResponse(res);
    if (decoded is! Map<String, dynamic>) {
      throw Exception('Unexpected create contact response: ${res.body}');
    }
    return EmergencyContactDto.fromJson(decoded);
  }

  Future<EmergencyContactDto> update(
    String userId,
    String contactId,
    EmergencyContactDto body,
  ) async {
    final res = await _api.put(
      '${_base(userId)}/$contactId',
      body: body.toBody(),
    );
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw Exception('Update contact failed: ${res.statusCode} ${res.body}');
    }
    final decoded = _api.extractDataFromResponse(res);
    if (decoded is! Map<String, dynamic>) {
      throw Exception('Unexpected update contact response: ${res.body}');
    }
    return EmergencyContactDto.fromJson(decoded);
  }

  Future<void> delete(String userId, String contactId) async {
    final res = await _api.delete('${_base(userId)}/$contactId');
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw Exception('Delete contact failed: ${res.statusCode} ${res.body}');
    }
  }
}
