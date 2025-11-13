class CameraErrorTicket {
  final String? id;
  final String userId;
  final String errorType;
  final String description;
  final String? phone;
  final bool allowContact;
  final List<String>? imageUrls;
  final String status;
  final DateTime createdAt;
  final DateTime? updatedAt;

  const CameraErrorTicket({
    this.id,
    required this.userId,
    required this.errorType,
    required this.description,
    this.phone,
    required this.allowContact,
    this.imageUrls,
    this.status = 'pending',
    required this.createdAt,
    this.updatedAt,
  });

  factory CameraErrorTicket.fromJson(Map<String, dynamic> json) {
    return CameraErrorTicket(
      id: json['id'] as String?,
      userId: json['user_id'] as String,
      errorType: json['error_type'] as String,
      description: json['description'] as String,
      phone: json['phone'] as String?,
      allowContact: json['allow_contact'] as bool? ?? true,
      imageUrls: json['image_urls'] != null
          ? List<String>.from(json['image_urls'])
          : null,
      status: json['status'] as String? ?? 'pending',
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: json['updated_at'] != null
          ? DateTime.parse(json['updated_at'] as String)
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      if (id != null) 'id': id,
      'user_id': userId,
      'error_type': errorType,
      'description': description,
      if (phone != null) 'phone': phone,
      'allow_contact': allowContact,
      if (imageUrls != null) 'image_urls': imageUrls,
      'status': status,
      'created_at': createdAt.toIso8601String(),
      if (updatedAt != null) 'updated_at': updatedAt!.toIso8601String(),
    };
  }

  CameraErrorTicket copyWith({
    String? id,
    String? userId,
    String? errorType,
    String? description,
    String? phone,
    bool? allowContact,
    List<String>? imageUrls,
    String? status,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return CameraErrorTicket(
      id: id ?? this.id,
      userId: userId ?? this.userId,
      errorType: errorType ?? this.errorType,
      description: description ?? this.description,
      phone: phone ?? this.phone,
      allowContact: allowContact ?? this.allowContact,
      imageUrls: imageUrls ?? this.imageUrls,
      status: status ?? this.status,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}
