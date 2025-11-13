import 'dart:convert' as convert;
// removed dart:developer dev.log usage - replaced with print

import 'package:detect_care_app/core/network/api_client.dart';
import 'package:detect_care_app/features/auth/data/auth_storage.dart';
import 'package:detect_care_app/features/events/data/events_remote_data_source.dart';
import 'package:detect_care_app/features/home/data/event_endpoints.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../models/event_log.dart';

class EventService {
  final _supabase = Supabase.instance.client;
  final ApiProvider _api;
  EventService.withDefaultClient()
    : _api = ApiClient(tokenProvider: AuthStorage.getAccessToken);
  EventService(this._api);

  void debugProbe() {
    final session = _supabase.auth.currentSession;
    print(
      'EventService probe:'
      '\n- hasSession: ${session != null}'
      '\n- userId: ${session?.user.id}'
      '\n- expired: ${session?.isExpired}',
    );

    // Non-blocking extra debug prints (only in debug builds)
    if (kDebugMode) {
      try {
        // Print locally stored AuthStorage user id to compare with Supabase session
        AuthStorage.getUserId().then((storedId) {
          print('[EventService] AuthStorage userId: ${storedId ?? "<none>"}');
        });

        // Print a short masked preview of the session access token (don't log full token)
        final token = session?.accessToken;
        if (token != null && token.isNotEmpty) {
          final preview = token.length > 12
              ? '${token.substring(0, 12)}...'
              : token;
          print('[EventService] Supabase session token preview: $preview');
        }
      } catch (_) {
        // ignore errors in debug probe
      }
    }
  }

  Future<List<EventLog>> fetchLogs({
    int page = 1,
    int limit = 100,
    String? status,
    DateTimeRange? dayRange,
    String? period,
    String? search,
    String? lifecycleState,
  }) async {
    try {
      // final session = _supabase.auth.currentSession;
      // if (session == null) {
      //   print('[EventService.fetchLogs] No Supabase session found');
      //   return [];
      // }

      print(
        'filters status=$status, dayRange=${dayRange != null ? "${dayRange.start}..${dayRange.end}" : "null"}, period=$period, search=$search, page=$page, limit=$limit',
      );

      final session = _supabase.auth.currentSession;
      List<Map<String, dynamic>> normalized = [];

      if (session == null) {
        print(
          '[EventService.fetchLogs] No Supabase session found - using REST /events',
        );
        try {
          final ds = EventsRemoteDataSource();
          final list = await ds.listEvents(
            page: page,
            limit: limit,
            extraQuery: lifecycleState != null && lifecycleState.isNotEmpty
                ? {'lifecycle_state': lifecycleState}
                : null,
          );
          for (final r in list) {
            final m = await _normalizeRow(r);
            normalized.add(m);
          }
        } catch (restErr) {
          print('[EventService] REST fetch failed: $restErr');
          return [];
        }
      } else {
        var query = _supabase
            .from(EventEndpoints.eventsTable)
            .select(EventEndpoints.selectList);

        if (status != null && status.isNotEmpty && status != 'All') {
          query = query.eq(EventEndpoints.status, status);
        }

        if (lifecycleState != null && lifecycleState.isNotEmpty) {
          query = query.eq('lifecycle_state', lifecycleState);
        }

        if (dayRange != null) {
          final startUtc = DateTime(
            dayRange.start.year,
            dayRange.start.month,
            dayRange.start.day,
          ).toUtc();
          final endUtc = DateTime(
            dayRange.end.year,
            dayRange.end.month,
            dayRange.end.day + 1,
          ).toUtc();

          query = query
              .gte(EventEndpoints.detectedAt, startUtc.toIso8601String())
              .lt(EventEndpoints.detectedAt, endUtc.toIso8601String());
        }

        if (search != null && search.isNotEmpty) {
          final s = search.replaceAll("'", "''");
          query = query.or(
            '${EventEndpoints.eventType}.ilike.%$s%,'
            '${EventEndpoints.eventDescription}.ilike.%$s%',
          );
        }

        final from = (page - 1) * limit;
        final to = page * limit - 1;

        try {
          final rows = await query
              .order(EventEndpoints.detectedAt, ascending: false)
              .range(from, to);

          _logRawRows(rows);
          print('[EventService] RAW rows len=${(rows as List).length}');

          for (final r in (rows as List)) {
            final m = await _normalizeRow(r as Map<String, dynamic>);
            normalized.add(m);
          }
        } catch (e) {
          print(
            '[EventService] Supabase fetch failed, falling back to REST /events: $e',
          );

          try {
            final ds = EventsRemoteDataSource();
            final list = await ds.listEvents(
              page: page,
              limit: limit,
              extraQuery: lifecycleState != null && lifecycleState.isNotEmpty
                  ? {'lifecycle_state': lifecycleState}
                  : null,
            );
            for (final r in list) {
              final m = await _normalizeRow(r);
              normalized.add(m);
            }
          } catch (restErr) {
            print('[EventService] REST fallback also failed: $restErr');
            return [];
          }
        }
      }

      _logNormalizedSample(normalized);

      List<String> _normalizedIds = [];
      try {
        _normalizedIds = normalized
            .map((e) => (e['eventId'] ?? e['event_id'] ?? e['id'])?.toString())
            .where((e) => e != null)
            .cast<String>()
            .toList();
        print(
          '[EventService.fetchLogs] NORMALIZED_IDS len=${_normalizedIds.length} sample=${_normalizedIds.take(50).toList()}',
        );
      } catch (_) {}

      try {
        // Print a larger sample (up to 50) of normalized rows including the
        // confirmation field so we can compare confirm/confirm_status across
        // pipeline stages.
        final sampleNorm = normalized
            .take(50)
            .map(
              (m) => {
                'eventId': m['eventId'] ?? m['event_id'] ?? m['id'],
                'confirm':
                    m['confirm_status'] ??
                    m['confirmed'] ??
                    m['confirmStatus'] ??
                    m['confirmationState'],
              },
            )
            .toList();
        print(
          '[EventService] NORMALIZED length=${normalized.length} sample=$sampleNorm',
        );
      } catch (_) {}

      List<Map<String, dynamic>> working = List.from(normalized);

      if (status != null &&
          status.isNotEmpty &&
          status.toLowerCase() != 'all') {
        if (status.toLowerCase() == 'abnormal') {
          working = working.where((e) {
            final s = (e['status']?.toString() ?? '').toLowerCase();
            return s == 'danger' || s == 'warning';
          }).toList();
        } else {
          working = working
              .where(
                (e) =>
                    (e['status']?.toString() ?? '').toLowerCase() ==
                    status.toLowerCase(),
              )
              .toList();
        }
      }

      if (dayRange != null) {
        final startUtc = DateTime(
          dayRange.start.year,
          dayRange.start.month,
          dayRange.start.day,
        ).toUtc();
        final endUtc = DateTime(
          dayRange.end.year,
          dayRange.end.month,
          dayRange.end.day + 1,
        ).toUtc();
        print(
          '[EventService.fetchLogs] Applying dayRange filter: startUtc=$startUtc endUtc=$endUtc (local start=${dayRange.start} end=${dayRange.end})',
        );

        try {
          final sample = working.take(8).map((e) => e['detectedAt']).toList();
          print(
            '[EventService.fetchLogs] Sample normalized detectedAt (raw): $sample',
          );
          for (final s in sample) {
            try {
              final parsed = _parseDetectedAtAny(s);
              print(
                '[EventService.fetchLogs] parsed detectedAt sample: raw=$s parsed=${parsed?.toUtc()}',
              );
            } catch (_) {}
          }
        } catch (_) {}

        working = working.where((e) {
          try {
            final dt = _parseDetectedAtAny(e['detectedAt']);
            if (dt == null) return false;
            final t = dt.toUtc();
            return !t.isBefore(startUtc) && t.isBefore(endUtc);
          } catch (_) {
            return false;
          }
        }).toList();
        try {
          final workingIds = working
              .map(
                (e) => (e['eventId'] ?? e['event_id'] ?? e['id'])?.toString(),
              )
              .where((e) => e != null)
              .cast<String>()
              .toList();
          print(
            '[EventService.fetchLogs] AFTER dayRange filter working_len=${working.length} ids=${workingIds.take(50).toList()}',
          );
        } catch (_) {}
      }

      final filtered = (period == null || period.isEmpty || period == 'All')
          ? working
          : working
                .where((e) => _matchesPeriod(e['detectedAt'], period))
                .toList();

      try {
        final filteredIds = filtered
            .map((e) => (e['eventId'] ?? e['event_id'] ?? e['id'])?.toString())
            .where((e) => e != null)
            .cast<String>()
            .toList();
        print(
          '[EventService.fetchLogs] AFTER period filter filtered_len=${filtered.length} ids=${filteredIds.take(50).toList()}',
        );
      } catch (_) {}

      try {
        // Also print confirm fields for the filtered set to spot which items
        // were removed by the period filter.
        final sampleFiltered = filtered
            .take(50)
            .map(
              (m) => {
                'eventId': m['eventId'] ?? m['event_id'] ?? m['id'],
                'confirm':
                    m['confirm_status'] ??
                    m['confirmed'] ??
                    m['confirmStatus'] ??
                    m['confirmationState'],
              },
            )
            .toList();
        print(
          '[EventService] FILTERED length=${filtered.length} sample=$sampleFiltered',
        );
      } catch (_) {}

      try {
        for (final row in filtered) {
          try {
            final id =
                row[EventEndpoints.eventId] ??
                row['event_id'] ??
                row['eventId'];
            final ca = row['created_at'] ?? row['createdAt'];
            print('[EventService.fetchLogs] row event=$id created_at=$ca');
          } catch (_) {}
        }
      } catch (_) {}

      List<Map<String, dynamic>> finalList = List.from(filtered);
      if (lifecycleState == null || lifecycleState.isEmpty) {
        finalList = finalList.where((e) {
          try {
            final ls = (e['lifecycle_state'] ?? e['lifecycleState'])
                ?.toString();
            if (ls == null || ls.isEmpty) return true;
            return ls.toLowerCase() != 'canceled';
          } catch (_) {
            return true;
          }
        }).toList();
        try {
          final finalIds = finalList
              .map(
                (e) => (e['eventId'] ?? e['event_id'] ?? e['id'])?.toString(),
              )
              .where((e) => e != null)
              .cast<String>()
              .toList();
          final dropped = _normalizedIds
              .where((id) => !finalIds.contains(id))
              .toList();
          print(
            '[EventService.fetchLogs] FINAL length=${finalList.length} final_ids=${finalIds.take(50).toList()} dropped_count=${dropped.length} dropped_sample=${dropped.take(50).toList()}',
          );
        } catch (_) {}
      }

      return finalList.map(EventLog.fromJson).toList();
    } catch (e) {
      print('[EventService.fetchLogs] Error fetching logs: $e');
      if (e is PostgrestException) {
        print(
          '[EventService] PostgrestException code=${e.code}, details=${e.details}, hint=${e.hint}, message=${e.message}',
        );
      }
      rethrow;
    }
  }

  Future<EventLog> fetchLogDetail(String id) async {
    try {
      final session = _supabase.auth.currentSession;
      if (session != null) {
        try {
          print('[EventService] fetchLogDetail: using Supabase for id=$id');
          final row = await _supabase
              .from(EventEndpoints.eventsTable)
              .select(EventEndpoints.selectDetail)
              .eq(EventEndpoints.eventId, id)
              .single();

          final normalized = await _normalizeRow(row);
          return EventLog.fromJson(normalized);
        } catch (e) {
          print(
            '[EventService] Supabase fetchLogDetail failed: $e — will try backend API fallback',
          );
        }
      } else {
        print(
          '[EventService] No Supabase session available — will try backend API fallback for id=$id',
        );
      }

      print('[EventService] fetchLogDetail: calling backend API /events/$id');
      final res = await _api.get('/events/$id');
      print('[EventService] backend fetch status=${res.statusCode}');
      if (res.statusCode == 200) {
        final data = _api.extractDataFromResponse(res);
        return EventLog.fromJson(data);
      } else if (res.statusCode == 401 || res.statusCode == 403) {
        throw Exception(
          'Không có quyền truy cập dữ liệu sự kiện (${res.statusCode})',
        );
      } else if (res.statusCode == 404) {
        throw Exception('Không tìm thấy sự kiện (404)');
      } else {
        throw Exception('Lỗi khi tải dữ liệu sự kiện (${res.statusCode})');
      }
    } catch (e) {
      print('[EventService.fetchLogDetail] Error fetching log detail: $e');
      if (e is PostgrestException) {
        print(
          '[EventService] PostgrestException in fetchLogDetail: code=${e.code}, message=${e.message}, details=${e.details}',
        );
        if (e.code == '42501' ||
            e.message.toLowerCase().contains('permission denied')) {
          throw Exception(
            'Không có quyền truy cập dữ liệu sự kiện (${e.message})',
          );
        }
      }
      rethrow;
    }
  }

  Future<EventLog> createLog(Map<String, dynamic> data) async {
    try {
      final row = await _supabase
          .from(EventEndpoints.eventsTable)
          .insert(data)
          .select(EventEndpoints.selectDetail)
          .single();

      final normalized = await _normalizeRow(row);
      return EventLog.fromJson(normalized);
    } catch (e) {
      print('[EventService.createLog] Error creating log: $e');
      if (e is PostgrestException &&
          (e.code == '42501' || e.message.contains('permission denied'))) {
        print('[EventService] Permission denied in createLog - throwing');
        throw Exception('Không có quyền tạo sự kiện mới');
      }
      rethrow;
    }
  }

  Future<void> deleteLog(String id) async {
    try {
      await _supabase
          .from(EventEndpoints.eventsTable)
          .delete()
          .eq(EventEndpoints.eventId, id);
    } catch (e) {
      print('[EventService.deleteLog] Error deleting log: $e');
      if (e is PostgrestException &&
          (e.code == '42501' || e.message.contains('permission denied'))) {
        print('[EventService] Permission denied in deleteLog - throwing');
        throw Exception('Không có quyền xóa sự kiện');
      }
      rethrow;
    }
  }

  Future<Map<String, dynamic>> _normalizeRow(Map<String, dynamic> row) async {
    final rawDetected = row[EventEndpoints.detectedAt];
    final dt = _parseDetectedAtAny(rawDetected);
    final detectedAtIso = dt?.toUtc().toIso8601String();

    DateTime? toDate(dynamic v) {
      if (v == null) return null;
      if (v is DateTime) return v;
      if (v is String) {
        try {
          return DateTime.parse(_normalizeIso8601(v));
        } catch (_) {}
      }
      return null;
    }

    final rawCreated = row[EventEndpoints.createdAt];
    final createdDt = toDate(rawCreated);
    final createdAtIso = createdDt?.toUtc().toIso8601String();

    bool toBool(dynamic v) {
      if (v == null) return false;
      if (v is bool) return v;
      if (v is num) return v != 0;
      if (v is String) {
        final s = v.trim().toLowerCase();
        if (['true', 't', '1', 'yes', 'y'].contains(s)) return true;
        return false;
      }
      return false;
    }

    // Derive a boolean confirm flag from multiple possible fields; if the
    // confirmation_state string indicates a confirmed value (contains 'confirm')
    // consider it confirmed.
    final rawConfirmCandidates = [
      row['confirm_status'],
      row['confirmed'],
      row['confirmStatus'],
    ];
    bool parsedConfirm = false;
    for (final c in rawConfirmCandidates) {
      if (c != null) {
        parsedConfirm = toBool(c);
        break;
      }
    }
    if (!parsedConfirm) {
      final cs = row[EventEndpoints.confirmationState];
      if (cs != null) {
        try {
          final s = cs.toString().toLowerCase();
          if (s.contains('confirm')) parsedConfirm = true;
        } catch (_) {}
      }
    }

    return {
      // ─────────────── Base info ───────────────
      'eventId': row[EventEndpoints.eventId],
      'eventType': row[EventEndpoints.eventType],
      'eventDescription': row[EventEndpoints.eventDescription],
      'confidenceScore': row[EventEndpoints.confidenceScore] ?? 0,
      'status': row[EventEndpoints.status],
      'detectedAt': detectedAtIso,

      'created_at': createdAtIso,
      'createdAt': createdAtIso,
      // Preserve lifecycle_state from the backend so callers can filter or
      // inspect it later. This field may be set to 'CANCELED' for removed
      // events.
      'lifecycle_state': row['lifecycle_state'] ?? row['lifecycleState'],

      // ─────────────── Proposal / Confirmation ───────────────
      'confirmationState': row[EventEndpoints.confirmationState],

      'confirm_status': parsedConfirm,
      'confirmStatus': parsedConfirm,
      'proposedStatus': row[EventEndpoints.proposedStatus],
      'pendingReason': row[EventEndpoints.pendingReason],
      'previousStatus': row[EventEndpoints.previousStatus],
      'proposedBy': row[EventEndpoints.proposedBy],
      'pendingUntil': toDate(
        row[EventEndpoints.pendingUntil],
      )?.toUtc().toIso8601String(),

      // ─────────────── Optional snapshot ───────────────
      'snapshotId': row[EventEndpoints.snapshotId],
    };
  }

  DateTime? _parseDetectedAtAny(dynamic v) {
    if (v == null) return null;
    if (v is DateTime) return v;
    if (v is String) {
      final norm = _normalizeIso8601(v);
      try {
        return DateTime.parse(norm);
      } catch (_) {
        return null;
      }
    }
    return null;
  }

  String _normalizeIso8601(String s) {
    var out = s.trim();
    if (out.contains(' ') && !out.contains('T')) {
      out = out.replaceFirst(' ', 'T');
    }
    out = out.replaceFirstMapped(RegExp(r'([+-]\d{2})$'), (m) => '${m[1]}:00');
    out = out.replaceFirst(RegExp(r'\+00(?::00)?$'), 'Z');
    return out;
  }

  bool _matchesPeriod(dynamic detectedAt, String period) {
    final dt = _parseDetectedAtAny(detectedAt);
    if (dt == null) return false;
    final h = dt.toLocal().hour;

    final p = period.toLowerCase();

    switch (p) {
      case 'all':
        return true;
      case '00-06':
        return h >= 0 && h < 6;
      case '06-12':
        return h >= 6 && h < 12;
      case '12-18':
        return h >= 12 && h < 18;
      case '18-24':
        return h >= 18 && h < 24;
      case 'morning': // legacy: 05:00–11:59
        return h >= 5 && h < 12;
      case 'afternoon': // legacy: 12:00–17:59
        return h >= 12 && h < 18;
      case 'evening': // legacy: 18:00–21:59
        return h >= 18 && h < 22;
      case 'night': // legacy: 22:00–04:59
        return h >= 22 || h < 5;
      default:
        return true;
    }
  }

  void _logRawRows(Object rows) {
    try {
      final list = rows as List;
      print('[EventService.fetchLogs] RAW rows len=${list.length}');

      final sample = list.take(3).map((e) {
        final m = (e as Map).cast<String, dynamic>();
        return {
          'event_id': m[EventEndpoints.eventId],
          'event_type': m[EventEndpoints.eventType],
          'status': m[EventEndpoints.status],
          'detected_at': m[EventEndpoints.detectedAt],
          'snapshot_id': m[EventEndpoints.snapshotId],
          'snapshots': m['snapshots'],
        };
      }).toList();

      print(
        '[EventService.fetchLogs] RAW sample(<=3)=${convert.jsonEncode(sample)}',
      );
    } catch (err) {
      print('[EventService.fetchLogs] RAW log failed: $err');
    }
  }

  void _logNormalizedSample(List<Map<String, dynamic>> norm) {
    try {
      final sample = norm.take(3).toList();
      print(
        '[EventService.fetchLogs] NORMALIZED sample(<=3)=${convert.jsonEncode(sample)}',
      );
    } catch (err) {
      print('[EventService.fetchLogs] NORMALIZED log failed: $err');
    }
  }

  Future<EventLog> confirmEvent(String eventId) async {
    try {
      final body = {'action': 'approve'};
      print('[EventService.confirmEvent] 📤 confirmEvent($eventId): $body');

      final res = await _api.post('/events/$eventId/confirm', body: body);
      print(
        '[EventService.confirmEvent] 📥 confirmEvent status: ${res.statusCode}',
      );

      if (res.statusCode >= 200 && res.statusCode < 300) {
        final data = _api.extractDataFromResponse(res);
        return EventLog.fromJson(data);
      } else {
        throw Exception('Không thể xác nhận đề xuất (${res.statusCode})');
      }
    } catch (e) {
      print(
        '[EventService.confirmEvent] ❌ EventService.confirmEvent error: $e',
      );
      rethrow;
    }
  }

  Future<EventLog> rejectEvent(String eventId, {String? notes}) async {
    try {
      final body = {
        'action': 'reject',
        if (notes != null && notes.isNotEmpty) 'notes': notes,
      };
      print('[EventService.rejectEvent] 📤 rejectEvent($eventId): $body');

      final res = await _api.post('/events/$eventId/reject', body: body);
      print(
        '[EventService.rejectEvent] 📥 rejectEvent status: ${res.statusCode}',
      );

      if (res.statusCode >= 200 && res.statusCode < 300) {
        final data = _api.extractDataFromResponse(res);
        return EventLog.fromJson(data);
      } else {
        throw Exception('Không thể từ chối đề xuất (${res.statusCode})');
      }
    } catch (e) {
      print('[EventService.rejectEvent] ❌ EventService.rejectEvent error: $e');
      rethrow;
    }
  }

  Future<EventLog> confirmProposal(String eventId, {String? notes}) async {
    try {
      final body = {
        'action': 'approve',
        if (notes != null && notes.isNotEmpty) 'notes': notes,
      };

      print(
        '[EventService.confirmProposal] 📤 [Customer] confirmProposal($eventId): $body',
      );
      final res = await _api.post('/events/$eventId/confirm', body: body);

      print(
        '[EventService.confirmProposal] 📥 [Customer] confirmProposal status=${res.statusCode}',
      );
      if (res.statusCode >= 200 && res.statusCode < 300) {
        final data = _api.extractDataFromResponse(res);
        return EventLog.fromJson(data);
      }

      if (res.statusCode == 409) {
        throw Exception('Không có đề xuất nào đang chờ xác nhận.');
      } else if (res.statusCode == 403) {
        throw Exception('Bạn không có quyền thực hiện hành động này.');
      }

      throw Exception('Không thể xác nhận đề xuất (${res.statusCode})');
    } catch (e) {
      print('[EventService.confirmProposal] ❌ confirmProposal error: $e');
      rethrow;
    }
  }

  Future<EventLog> rejectProposal(String eventId, {String? notes}) async {
    try {
      final body = {
        'action': 'reject',
        if (notes != null && notes.isNotEmpty) 'notes': notes,
      };

      print(
        '[EventService.rejectProposal] 📤 [Customer] rejectProposal($eventId): $body',
      );
      final res = await _api.post('/events/$eventId/reject', body: body);

      print(
        '[EventService.rejectProposal] 📥 [Customer] rejectProposal status=${res.statusCode}',
      );
      if (res.statusCode >= 200 && res.statusCode < 300) {
        final data = _api.extractDataFromResponse(res);
        return EventLog.fromJson(data);
      }

      if (res.statusCode == 409) {
        throw Exception('Không có đề xuất nào đang chờ từ chối.');
      } else if (res.statusCode == 403) {
        throw Exception('Bạn không có quyền thực hiện hành động này.');
      }

      throw Exception('Không thể từ chối đề xuất (${res.statusCode})');
    } catch (e) {
      print('[EventService.rejectProposal] ❌ rejectProposal error: $e');
      rethrow;
    }
  }

  Future<List<Map<String, dynamic>>> listPendingProposals() async {
    try {
      print(
        '[EventService.listPendingProposals] 📤 [Customer] listPendingProposals',
      );
      final res = await _api.get('/events/pending-proposals');

      print(
        '[EventService.listPendingProposals] 📥 [Customer] listPendingProposals status=${res.statusCode}',
      );
      if (res.statusCode == 200) {
        final body = _api.extractDataFromResponse(res);
        final proposals = (body['proposals'] as List?) ?? [];
        return proposals.map((p) => Map<String, dynamic>.from(p)).toList();
      }

      throw Exception('Không thể tải danh sách đề xuất (${res.statusCode})');
    } catch (e) {
      print(
        '[EventService.listPendingProposals] ❌ listPendingProposals error: $e',
      );
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
      final rds = EventsRemoteDataSource(api: _api);

      final data = await rds.createManualAlert(
        cameraId: cameraId,
        imagePath: snapshotPath,
        notes: notes ?? "Manual alarm triggered from LiveCameraScreen",
        contextData: {
          "camera_name": cameraName,
          "stream_url": streamUrl,
          "source": "manual_button",
        },
      );

      return EventLog.fromJson(data);
    } catch (e) {
      print("❌ [EventService.sendManualAlarm] $e");
      rethrow;
    }
  }
}
