/**
 * Utility functions for validation
 */

/**
 * Validate email address
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number (Việt Nam)
 */
export function isValidPhoneNumber(phone: string): boolean {
  const phoneRegex = /^(0|\+84|84)[3|5|7|8|9][0-9]{8}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
}

/**
 * Validate password strength
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  score: number;
  feedback: string[];
} {
  const feedback: string[] = [];
  let score = 0;

  if (password.length >= 8) {
    score += 1;
  } else {
    feedback.push('Mật khẩu phải có ít nhất 8 ký tự');
  }

  if (/[a-z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Mật khẩu phải chứa ít nhất 1 chữ cái thường');
  }

  if (/[A-Z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Mật khẩu phải chứa ít nhất 1 chữ cái hoa');
  }

  if (/\d/.test(password)) {
    score += 1;
  } else {
    feedback.push('Mật khẩu phải chứa ít nhất 1 chữ số');
  }

  if (/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>?/]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Mật khẩu phải chứa ít nhất 1 ký tự đặc biệt');
  }

  return {
    isValid: score >= 4,
    score,
    feedback,
  };
}

/**
 * Validate required fields
 */
export function validateRequired(value: unknown, fieldName: string): string | null {
  if (value === null || value === undefined || value === '') {
    return `${fieldName} là bắt buộc`;
  }
  return null;
}

/**
 * Validate string length
 */
export function validateLength(
  value: string,
  min: number,
  max: number,
  fieldName: string
): string | null {
  if (value.length < min) {
    return `${fieldName} phải có ít nhất ${min} ký tự`;
  }
  if (value.length > max) {
    return `${fieldName} không được vượt quá ${max} ký tự`;
  }
  return null;
}
