import 'dart:convert';

import 'package:detect_care_app/core/config/app_config.dart';
import 'package:detect_care_app/core/network/api_client.dart';
import 'package:http/http.dart' as http;

import '../models/health_overview_models.dart';

class HealthOverviewService {
  static final String baseUrl = AppConfig.apiBaseUrl;
  final ApiProvider? _api;

  HealthOverviewService({ApiProvider? api}) : _api = api;

  Future<HealthOverviewData> getHealthOverviewData({
    String? patientId,
    String? startDate,
    String? endDate,
  }) async {
    try {
      final queryParams = <String, String>{};
      if (patientId != null) queryParams['userId'] = patientId;
      if (startDate != null) queryParams['startDate'] = startDate;
      if (endDate != null) queryParams['endDate'] = endDate;

      final uri = Uri.parse(
        '$baseUrl/health/reports/overview',
      ).replace(queryParameters: queryParams.isNotEmpty ? queryParams : null);

      http.Response response;
      if (_api != null) {
        final path = uri.path + (uri.hasQuery ? '?${uri.query}' : '');
        response = await _api.get(path).timeout(const Duration(seconds: 10));
      } else {
        response = await http
            .get(uri, headers: {'Content-Type': 'application/json'})
            .timeout(const Duration(seconds: 10));
      }

      if (response.statusCode != 200) {
        throw Exception(
          'Failed to load health overview data: ${response.statusCode} ${response.body}',
        );
      }

      dynamic jsonData;
      try {
        if (response.body.isEmpty) {
          throw Exception('Empty response body');
        }
        jsonData = json.decode(response.body);
      } catch (e) {
        throw Exception('Failed to parse response: $e');
      }

      final payload = (jsonData is Map && jsonData['data'] is Map)
          ? jsonData['data'] as Map<String, dynamic>
          : jsonData as Map<String, dynamic>;

      return HealthOverviewData.fromJson(payload);
    } catch (e) {
      throw Exception('Error fetching health overview data: $e');
    }
  }
}
