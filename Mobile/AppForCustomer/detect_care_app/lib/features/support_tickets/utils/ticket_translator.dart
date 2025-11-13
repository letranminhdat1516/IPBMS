class TicketTranslator {
  static const Map<String, String> statusMap = {
    'new': 'Mới tạo',
    'open': 'Đang mở',
    'in_progress': 'Đang xử lý',
    'waiting_for_customer': 'Chờ phản hồi khách hàng',
    'waiting_for_agent': 'Chờ nhân viên hỗ trợ',
    'resolved': 'Đã xử lý',
    'closed': 'Đã đóng',
    'reopened': 'Đã mở lại',
  };

  static const Map<String, String> categoryMap = {
    'technical': 'Kỹ thuật',
    'billing': 'Thanh toán',
    'general': 'Chung',
  };

  static String translateStatus(String? key) {
    if (key == null) return '-';
    return statusMap[key] ?? key;
  }

  static String translateCategory(String? key) {
    if (key == null) return '-';
    return categoryMap[key] ?? key;
  }

  static Map<String, List<String>> translateTransitions(
    Map<String, dynamic> transitions,
  ) {
    final result = <String, List<String>>{};
    transitions.forEach((k, v) {
      if (v is List) {
        result[translateStatus(k)] = v
            .map((e) => translateStatus(e.toString()))
            .toList();
      }
    });
    return result;
  }
}
