class OtpRequestResult {
  final int? r;
  final String message;
  final String? callId;
  final String? formattedPhoneNumber;
  final String? _expiresIn;

  String? get expiresIn => _expiresIn;

  const OtpRequestResult({
    this.r,
    required this.message,
    this.callId,
    this.formattedPhoneNumber,
    String? expiresIn,
  }) : _expiresIn = expiresIn;

  factory OtpRequestResult.fromJson(Map<String, dynamic> json) =>
      OtpRequestResult(
        r: json['r'] is int ? json['r'] as int : int.tryParse('${json['r']}'),
        message: (json['message'] ?? '').toString(),
        callId: json['call_id']?.toString(),
        formattedPhoneNumber: json['phone_number']?.toString(),
        expiresIn: json['expires_in']?.toString(),
      );
}
