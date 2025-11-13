class DoctorInfo {
  final String id;
  final String name;
  final String email;
  final String phone;
  final String specialty;
  final String notes;

  DoctorInfo({
    required this.id,
    required this.name,
    required this.email,
    required this.phone,
    required this.specialty,
    required this.notes,
  });

  factory DoctorInfo.fromJson(Map<String, dynamic> json) {
    return DoctorInfo(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      email: json['email'] ?? '',
      phone: json['phone'] ?? '',
      specialty: json['specialty'] ?? '',
      notes: json['notes'] ?? '',
    );
  }

  Map<String, dynamic> toJson() => {
    "name": name,
    "email": email,
    "phone": phone,
    "specialty": specialty,
    "notes": notes,
  };
}
