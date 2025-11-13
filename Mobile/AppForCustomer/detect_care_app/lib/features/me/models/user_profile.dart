class UserProfile {
  final String userId;
  final String? bio;
  final String? website;
  final String? location;
  final String? avatarUrl;
  final DateTime? dateOfBirth;
  final String? gender;
  final Map<String, dynamic>? metadata;
  final DateTime createdAt;
  final DateTime updatedAt;

  const UserProfile({
    required this.userId,
    this.bio,
    this.website,
    this.location,
    this.avatarUrl,
    this.dateOfBirth,
    this.gender,
    this.metadata,
    required this.createdAt,
    required this.updatedAt,
  });

  factory UserProfile.fromJson(Map<String, dynamic> json) {
    return UserProfile(
      userId: json['user_id'] as String,
      bio: json['bio'] as String?,
      website: json['website'] as String?,
      location: json['location'] as String?,
      avatarUrl: json['avatar_url'] as String?,
      dateOfBirth: json['date_of_birth'] != null
          ? DateTime.parse(json['date_of_birth'] as String)
          : null,
      gender: json['gender'] as String?,
      metadata: json['metadata'] as Map<String, dynamic>?,
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: DateTime.parse(json['updated_at'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'user_id': userId,
      if (bio != null) 'bio': bio,
      if (website != null) 'website': website,
      if (location != null) 'location': location,
      if (avatarUrl != null) 'avatar_url': avatarUrl,
      if (dateOfBirth != null) 'date_of_birth': dateOfBirth!.toIso8601String(),
      if (gender != null) 'gender': gender,
      if (metadata != null) 'metadata': metadata,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
    };
  }

  UserProfile copyWith({
    String? userId,
    String? bio,
    String? website,
    String? location,
    String? avatarUrl,
    DateTime? dateOfBirth,
    String? gender,
    Map<String, dynamic>? metadata,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return UserProfile(
      userId: userId ?? this.userId,
      bio: bio ?? this.bio,
      website: website ?? this.website,
      location: location ?? this.location,
      avatarUrl: avatarUrl ?? this.avatarUrl,
      dateOfBirth: dateOfBirth ?? this.dateOfBirth,
      gender: gender ?? this.gender,
      metadata: metadata ?? this.metadata,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}
