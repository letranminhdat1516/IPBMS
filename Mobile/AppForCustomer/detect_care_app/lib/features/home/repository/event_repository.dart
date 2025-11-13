import 'package:detect_care_app/features/home/service/event_service.dart';
import '../models/event_log.dart';
import 'package:flutter/material.dart';
import 'dart:developer' as dev;

class EventRepository {
  final EventService _service;
  EventRepository(this._service);

  Future<List<EventLog>> getEvents({
    int page = 1,
    int limit = 100,
    String? status,
    DateTimeRange? dayRange,
    String? period,
    String? search,
    String? lifecycleState,
  }) async {
    try {
      final events = await _service.fetchLogs(
        page: page,
        limit: limit,
        status: status,
        dayRange: dayRange,
        period: period,
        search: search,
        lifecycleState: lifecycleState,
      );
      try {
        final sample = events.take(5).map((e) => e.eventId).toList();
        print(
          '[Repository] getEvents returned=${events.length} sampleIds=$sample',
        );
      } catch (_) {}
      return events;
    } catch (e) {
      dev.log('Repository error - getEvents: $e');
      rethrow;
    }
  }

  Future<EventLog> getEventDetails(String id) async {
    try {
      return await _service.fetchLogDetail(id);
    } catch (e) {
      dev.log('Repository error - getEventDetails: $e');
      rethrow;
    }
  }

  Future<EventLog> createEvent(Map<String, dynamic> data) async {
    try {
      return await _service.createLog(data);
    } catch (e) {
      dev.log('Repository error - createEvent: $e');
      rethrow;
    }
  }

  Future<void> deleteEvent(String id) async {
    try {
      await _service.deleteLog(id);
    } catch (e) {
      dev.log('Repository error - deleteEvent: $e');
      rethrow;
    }
  }

  Future<EventLog> confirmEvent(String eventId) async {
    try {
      dev.log('✅ [Repository] confirmEvent');
      return await _service.confirmEvent(eventId);
    } catch (e) {
      dev.log('❌ Repository confirmEvent error: $e');
      rethrow;
    }
  }

  Future<EventLog> rejectEvent(String eventId, {String? notes}) async {
    try {
      dev.log('🚫 [Repository] rejectEvent');
      return await _service.rejectEvent(eventId, notes: notes);
    } catch (e) {
      dev.log('❌ Repository rejectEvent error: $e');
      rethrow;
    }
  }

  Future<EventLog> confirmProposal(String eventId, {String? notes}) async {
    try {
      dev.log('✅ [Repository] confirmProposal');
      return await _service.confirmProposal(eventId, notes: notes);
    } catch (e) {
      dev.log('❌ Repository confirmProposal error: $e');
      rethrow;
    }
  }

  Future<EventLog> rejectProposal(String eventId, {String? notes}) async {
    try {
      dev.log('🚫 [Repository] rejectProposal');
      return await _service.rejectProposal(eventId, notes: notes);
    } catch (e) {
      dev.log('❌ Repository rejectProposal error: $e');
      rethrow;
    }
  }

  Future<List<Map<String, dynamic>>> listPendingProposals() async {
    try {
      dev.log('📄 [Repository] listPendingProposals');
      return await _service.listPendingProposals();
    } catch (e) {
      dev.log('❌ Repository listPendingProposals error: $e');
      rethrow;
    }
  }

  Future<EventLog> sendManualAlarm({
    required String cameraId,
    required String snapshotPath,
    String? cameraName,
    String? notes,
    String? streamUrl,
  }) async {
    try {
      return await _service.sendManualAlarm(
        cameraId: cameraId,
        snapshotPath: snapshotPath,
        cameraName: cameraName,
        notes: notes,
        streamUrl: streamUrl,
      );
    } catch (e) {
      dev.log("❌ Repository sendManualAlarm error: $e");
      rethrow;
    }
  }
}
