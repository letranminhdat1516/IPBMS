import 'package:detect_care_app/core/network/api_client.dart';
import 'package:detect_care_app/features/patient/models/doctor_infor.dart';

class DoctorsRemoteDataSource {
  final ApiClient api;

  DoctorsRemoteDataSource({required this.api});

  Future<List<DoctorInfo>> getDoctors(String patientId) async {
    final res = await api.get('/patients/$patientId/doctors');
    final data = api.extractDataFromResponse(res);
    if (data is List) {
      return data.map((e) => DoctorInfo.fromJson(e)).toList();
    }
    return [];
  }

  Future<DoctorInfo> createDoctor(String patientId, DoctorInfo doctor) async {
    final res = await api.post(
      '/patients/$patientId/doctors',
      body: doctor.toJson(),
    );
    final data = api.extractDataFromResponse(res);
    return DoctorInfo.fromJson(data);
  }

  Future<DoctorInfo> updateDoctor(
    String patientId,
    String doctorId,
    Map<String, dynamic> update,
  ) async {
    final res = await api.put(
      '/patients/$patientId/doctors/$doctorId',
      body: update,
    );
    final data = api.extractDataFromResponse(res);
    return DoctorInfo.fromJson(data);
  }

  Future<bool> deleteDoctor(String patientId, String doctorId) async {
    final res = await api.delete('/patients/$patientId/doctors/$doctorId');
    final data = api.extractDataFromResponse(res);
    return data == true || (data is Map && data['success'] == true);
  }

  Future<bool> sendEmailToDoctor({
    required String customerId,
    required String doctorId,
    required String subject,
    required String text,
    String? html,
  }) async {
    final path = '/patients/$customerId/doctors/$doctorId/email';

    final body = {"subject": subject, "text": text};
    if (html != null) body['html'] = html;

    final res = await api.post(path, body: body);
    final decoded = api.decodeResponseBody(res);

    if (res.statusCode >= 200 && res.statusCode < 300) {
      return decoded['success'] == true;
    }

    throw Exception(decoded['message'] ?? 'Không gửi được email');
  }
}
