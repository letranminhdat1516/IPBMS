import 'package:detect_care_app/core/utils/phone_utils.dart';

class Validators {
  static String? validateName(String? value) {
    if (value == null || value.trim().isEmpty) {
      return 'Vui lòng nhập họ tên';
    }
    return null;
  }

  static String? validateEmail(String? value) {
    if (value == null ||
        !RegExp(r'^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$').hasMatch(value)) {
      return 'Vui lòng nhập email hợp lệ';
    }
    return null;
  }

  static String? validatePhone(String? value) {
    final v = value ?? '';
    if (v.trim().isEmpty) {
      return 'Vui lòng nhập số điện thoại.';
    }

    final cleaned = v.replaceAll(RegExp(r'\D'), '');

    // If there are no digit characters at all, it's an invalid format (e.g., alphabetic input)
    if (cleaned.isEmpty) {
      return 'Số điện thoại không hợp lệ. Vui lòng nhập theo định dạng 0xxxxxxxxx hoặc +84xxxxxxxxx. Ví dụ: 0823xxxxxxx';
    }

    if (cleaned.length < 9) {
      return 'Số điện thoại không hợp lệ. Vui lòng kiểm tra lại.';
    }

    if (cleaned.length > 11) {
      return 'Số điện thoại không hợp lệ. Vui lòng kiểm tra lại.';
    }

    // Use PhoneUtils to validate common Vietnamese formats
    if (!PhoneUtils.isValidVietnamesePhone(v)) {
      return 'Số điện thoại không hợp lệ. Vui lòng nhập theo định dạng 0xxxxxxxxx hoặc +84xxxxxxxxx. Ví dụ: 0823xxxxxxx';
    }

    return null;
  }

  static String? validatePassword(String? value) {
    if (value == null || value.trim().isEmpty) {
      return 'Vui lòng nhập mật khẩu';
    }
    if (value.length < 6) {
      return 'Mật khẩu phải có ít nhất 6 ký tự';
    }
    return null;
  }

  static String? validateConfirmPassword(
    String? value,
    String originalPassword,
  ) {
    if (value == null || value.isEmpty) {
      return 'Vui lòng xác nhận mật khẩu';
    }
    if (value != originalPassword) {
      return 'Mật khẩu không khớp';
    }
    return null;
  }
}
