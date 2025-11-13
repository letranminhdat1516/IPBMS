class EventEndpoints {
  //  Table & View
  static const String eventsTable = 'event_detections';
  static const String eventsView = 'event_detections_view';
  static const String snapshotsTable = 'snapshots';

  //  Base columns
  static const String eventId = 'event_id';
  static const String snapshotId = 'snapshot_id';
  static const String userId = 'user_id';
  static const String cameraId = 'camera_id';
  static const String roomId = 'room_id';
  static const String eventType = 'event_type'; // enum
  static const String eventDescription = 'event_description'; // text
  static const String detectionData = 'detection_data'; // jsonb
  static const String aiAnalysisResult = 'ai_analysis_result'; // jsonb
  static const String confidenceScore = 'confidence_score'; // numeric
  static const String boundingBoxes = 'bounding_boxes'; // jsonb
  static const String status = 'status'; // enum
  static const String contextData = 'context_data'; // jsonb
  static const String detectedAt = 'detected_at'; // timestamptz
  static const String verifiedAt = 'verified_at'; // timestamptz
  static const String verifiedBy = 'verified_by'; // uuid
  static const String acknowledgedAt = 'acknowledged_at'; // timestamptz
  static const String acknowledgedBy = 'acknowledged_by'; // uuid
  static const String dismissedAt = 'dismissed_at'; // timestamptz
  static const String createdAt = 'created_at'; // timestamptz

  //  Snapshot columns
  static const String cloudUrl = 'cloud_url';
  static const String imagePath = 'image_path';
  static const String capturedAt = 'captured_at';

  //  New fields for caregiver–customer confirmation flow
  static const String proposedStatus = 'proposed_status'; // trạng thái đề xuất
  static const String previousStatus = 'previous_status'; // trạng thái cũ
  static const String confirmationState =
      'confirmation_state'; // CONFIRMED_BY_CUSTOMER / REJECTED_BY_CUSTOMER / CAREGIVER_UPDATED
  static const String pendingUntil = 'pending_until'; // thời hạn auto-approve
  static const String pendingReason =
      'pending_reason'; // lý do caregiver gửi đề xuất
  static const String proposedBy = 'proposed_by';
  //  Selects
  static const String selectList =
      'event_id,event_type,event_description,confidence_score,status,'
      'proposed_status,previous_status,confirmation_state,pending_until,pending_reason,'
      'detected_at,created_at';

  static const String selectDetail = selectList;

  static const List<String> defaultSelect = [
    eventId,
    status,
    eventType,
    confidenceScore,
    detectedAt,
    createdAt,
  ];

  static const List<String> detailedSelect = [
    eventId,
    snapshotId,
    userId,
    cameraId,
    roomId,
    eventType,
    eventDescription,
    detectionData,
    aiAnalysisResult,
    confidenceScore,
    boundingBoxes,
    status,
    proposedStatus,
    previousStatus,
    confirmationState,
    pendingUntil,
    pendingReason,
    contextData,
    detectedAt,
    verifiedAt,
    verifiedBy,
    acknowledgedAt,
    acknowledgedBy,
    dismissedAt,
    createdAt,
  ];

  static String selectCols(Iterable<String> cols) => cols.join(',');
}
