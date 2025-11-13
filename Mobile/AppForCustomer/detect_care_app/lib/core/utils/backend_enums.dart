class BackendEnums {
  static String statusToVietnamese(String? status) {
    if (status == null) return 'Không xác định';
    switch (status) {
      case 'danger':
        return 'Nguy hiểm';
      case 'warning':
        return 'Cảnh báo';
      case 'normal':
        return 'Bình thường';
      case 'unknown':
        return 'Không xác định';
      case 'suspect':
        return 'Đáng ngờ';
      case 'abnormal':
        return 'Bất thường';
      default:
        return status;
    }
  }

  static String confirmStatusToVietnamese(dynamic confirm) {
    if (confirm is bool && confirm) return 'Xác nhận';
    return 'Chưa xác nhận';
  }

  static String eventTypeToVietnamese(String? type) {
    if (type == null) return 'Không xác định';
    switch (type) {
      case 'fall':
        return 'Ngã';
      case 'abnormal_behavior':
        return 'Hành vi bất thường';
      case 'emergency':
        return 'Tình huống khẩn cấp';
      case 'normal_activity':
        return 'Hoạt động bình thường';
      case 'sleep':
        return 'Ngủ nghỉ';
      default:
        return type;
    }
  }

  static const Map<String, String> daysOfWeekVi = {
    'monday': 'Thứ Hai',
    'tuesday': 'Thứ Ba',
    'wednesday': 'Thứ Tư',
    'thursday': 'Thứ Năm',
    'friday': 'Thứ Sáu',
    'saturday': 'Thứ Bảy',
    'sunday': 'Chủ nhật',
  };

  static String habitTypeToVietnamese(String? type) {
    if (type == null) return 'Không xác định';
    switch (type) {
      case 'sleep':
        return 'Ngủ nghỉ';
      case 'meal':
        return 'Ăn uống';
      case 'medication':
        return 'Uống thuốc';
      case 'activity':
        return 'Hoạt động';
      case 'bathroom':
        return 'Vệ sinh cá nhân';
      case 'therapy':
        return 'Trị liệu';
      case 'social':
        return 'Giao tiếp xã hội';
      default:
        return type;
    }
  }

  static String frequencyToVietnamese(String? freq) {
    if (freq == null) return 'Không xác định';
    switch (freq) {
      case 'daily':
        return 'Hằng ngày';
      case 'weekly':
        return 'Hằng tuần';
      case 'custom':
        return 'Tùy chọn';
      default:
        return freq;
    }
  }

  static String lifecycleStateToVietnamese(String? state) {
    if (state == null) return 'Không xác định';
    switch (state) {
      // case 'Created':
      //   return 'Đã khởi tạo';
      // case 'Labelled':
      //   return 'Đã gán nhãn (AI phân loại)';
      // case 'Verified':
      //   return 'Đã xác minh';
      // case 'Analyzed':
      //   return 'Đã phân tích';
      case 'Notified':
        return 'Đã gửi thông báo';
      case 'Acknowledged':
        return 'Người dùng đã phản hồi';
      case 'AutoCall':
        return 'Đang tự động gọi khẩn cấp';
      case 'EmergencyResponseReceived':
        return 'Đã có phản hồi từ liên hệ khẩn cấp';
      case 'AlarmActivated':
        return 'Chuông cảnh báo đã kích hoạt';
      case 'Resolved':
        return 'Sự kiện đã được xử lý';
      case 'Canceled':
        return 'Đã hủy';
      default:
        return state;
    }
  }
}
