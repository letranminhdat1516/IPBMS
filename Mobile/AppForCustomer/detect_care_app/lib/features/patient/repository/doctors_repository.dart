import 'package:detect_care_app/features/patient/data/doctors_remote_data_source.dart';
import 'package:detect_care_app/features/patient/models/doctor_infor.dart';

class DoctorsRepository {
  final DoctorsRemoteDataSource remote;

  DoctorsRepository({required this.remote});

  Future<List<DoctorInfo>> getDoctors(String patientId) =>
      remote.getDoctors(patientId);

  Future<DoctorInfo> createDoctor(String patientId, DoctorInfo doctor) =>
      remote.createDoctor(patientId, doctor);

  Future<DoctorInfo> updateDoctor(
    String patientId,
    String doctorId,
    Map<String, dynamic> update,
  ) => remote.updateDoctor(patientId, doctorId, update);

  Future<bool> deleteDoctor(String patientId, String doctorId) =>
      remote.deleteDoctor(patientId, doctorId);
  Future<bool> sendEmail({
    required String customerId,
    required String doctorId,
    required String subject,
    required String text,
    String? html,
  }) {
    return remote.sendEmailToDoctor(
      customerId: customerId,
      doctorId: doctorId,
      subject: subject,
      text: text,
      html: html,
    );
  }
}
