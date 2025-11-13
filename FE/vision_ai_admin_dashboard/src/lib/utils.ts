import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Chuyển số điện thoại về dạng bắt đầu bằng 84 (loại bỏ ký tự không phải số)
// Ví dụ: "+84 901 234 567" -> "84901234567"; "0901234567" -> "84901234567"; "0084901234567" -> "84901234567"
export function normalizePhoneTo84(input: string | number | null | undefined): string {
  const raw = String(input ?? '').replace(/\D/g, '');
  if (!raw) return '';
  // Nếu đã bắt đầu bằng 84
  if (raw.startsWith('84')) return raw;
  // Nếu là 0084...
  if (raw.startsWith('0084')) return '84' + raw.slice(4);
  // Nếu bắt đầu bằng 0 -> bỏ hết 0 đầu rồi thêm 84
  if (raw.startsWith('0')) {
    const withoutLeadingZeros = raw.replace(/^0+/, '');
    return '84' + withoutLeadingZeros;
  }
  // Mặc định thêm 84 phía trước
  return '84' + raw;
}

// Che số điện thoại chỉ hiện 4 số cuối (để bảo vệ privacy)
// Ví dụ: "0901234567" -> "*** **** 4567"
export function maskPhoneNumber(phone: string | number | null | undefined): string {
  const phoneStr = String(phone ?? '').trim();
  if (!phoneStr) return '';

  // Chuẩn hóa phone number trước
  const normalized = normalizePhoneTo84(phoneStr);
  if (!normalized || normalized.length <= 4) return normalized;

  // Format phone number trước khi mask
  const formatted = formatPhoneNumber(normalized);
  if (!formatted || formatted === normalized) {
    // Fallback nếu format không thành công
    const visibleEnd = normalized.substring(normalized.length - 4);
    const masked = '*'.repeat(Math.max(0, normalized.length - 4));
    return `${masked}${visibleEnd}`;
  }

  // Mask: chỉ hiện 4 số cuối
  const parts = formatted.split(' ');
  if (parts.length >= 2) {
    // Mask tất cả phần trừ phần cuối cùng
    const maskedParts = parts.slice(0, -1).map((part) => '*'.repeat(part.length));
    const lastPart = parts[parts.length - 1];
    return [...maskedParts, lastPart].join(' ');
  }

  // Fallback: mask tất cả trừ 4 số cuối
  const visibleEnd = formatted.substring(formatted.length - 4);
  const masked = '*'.repeat(Math.max(0, formatted.length - 4));
  return `${masked}${visibleEnd}`;
}

// Format số điện thoại theo chuẩn Việt Nam
// Ví dụ: "84901234567" -> "0901 234 567"
export function formatPhoneNumber(phone: string | number | null | undefined): string {
  const phoneStr = String(phone ?? '').replace(/\D/g, '');
  if (!phoneStr) return '';

  // Chuẩn hóa về format Việt Nam
  let formatted = phoneStr;
  if (phoneStr.startsWith('84') && phoneStr.length === 11) {
    formatted = '0' + phoneStr.slice(2);
  } else if (phoneStr.startsWith('84') && phoneStr.length === 12) {
    formatted = '0' + phoneStr.slice(2);
  } else if (!phoneStr.startsWith('0') && phoneStr.length === 9) {
    formatted = '0' + phoneStr;
  }

  // Xử lý trường hợp đặc biệt: số bắt đầu bằng 0000 (từ +84...)
  if (formatted.startsWith('0000') && formatted.length === 11) {
    formatted = '0' + formatted.slice(4);
  }

  // Format theo pattern XXX XXX XXXX cho số 10 chữ số
  if (formatted.length === 10 && formatted.startsWith('0')) {
    return `${formatted.slice(0, 4)} ${formatted.slice(4, 7)} ${formatted.slice(7)}`;
  }

  // Format theo pattern XXXX XXX XXX cho số 10 chữ số không bắt đầu bằng 0
  if (formatted.length === 10 && !formatted.startsWith('0')) {
    return `${formatted.slice(0, 4)} ${formatted.slice(4, 7)} ${formatted.slice(7)}`;
  }

  // Format theo pattern XXX XXX XXX cho số 9 chữ số
  if (formatted.length === 9) {
    return `${formatted.slice(0, 3)} ${formatted.slice(3, 6)} ${formatted.slice(6)}`;
  }

  // Format theo pattern XXXX XXX XXX cho số 11 chữ số (quốc tế)
  if (formatted.length === 11 && formatted.startsWith('84')) {
    const local = formatted.slice(2); // Bỏ 84
    return `${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7)}`;
  }

  return formatted;
}

// Format ngày tháng theo chuẩn Việt Nam
export function formatDateVN(date: Date | string | number): string {
  const d = new Date(date);
  return d.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

// Format ngày giờ theo chuẩn Việt Nam
export function formatDateTimeVN(date: Date | string | number): string {
  const d = new Date(date);
  return d.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Capitalize first letter của mỗi từ
export function capitalizeWords(str: string): string {
  return str
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Generate random ID
export function generateId(length: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Debounce function
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Che email chỉ hiện 3 ký tự đầu và domain (để bảo vệ privacy)
// Ví dụ: "user@example.com" -> "use***@example.com"
export function maskEmail(email: string | null | undefined): string {
  const emailStr = String(email ?? '');
  if (!emailStr || !emailStr.includes('@')) return emailStr;

  const [local, domain] = emailStr.split('@');
  if (local.length <= 3) return `${local}***@${domain}`;

  const visibleStart = local.substring(0, 3);
  const masked = '*'.repeat(Math.max(0, local.length - 3));
  return `${visibleStart}${masked}@${domain}`;
}

// Che tên chỉ hiện ký tự đầu và cuối (để bảo vệ privacy)
// Ví dụ: "Nguyễn Văn A" -> "N*** A"
export function maskName(name: string | null | undefined): string {
  const nameStr = String(name ?? '').trim();
  if (!nameStr) return '';

  const parts = nameStr.split(' ');
  if (parts.length === 1) {
    // Tên đơn: chỉ hiện ký tự đầu
    if (nameStr.length <= 2) return nameStr;
    return `${nameStr.charAt(0)}${'*'.repeat(nameStr.length - 2)}${nameStr.charAt(nameStr.length - 1)}`;
  }

  // Tên có nhiều phần: hiện ký tự đầu của phần đầu và toàn bộ phần cuối
  const firstPart = parts[0];
  const lastPart = parts[parts.length - 1];

  if (firstPart.length <= 2) {
    return `${firstPart} ${lastPart}`;
  }

  const firstMasked = `${firstPart.charAt(0)}${'*'.repeat(firstPart.length - 2)}${firstPart.charAt(firstPart.length - 1)}`;
  return `${firstMasked} ${lastPart}`;
}

// Che ID chỉ hiện 4 ký tự đầu và 4 ký tự cuối (để bảo vệ privacy)
// Ví dụ: "42d344e5-b5a7-4e4e-bee6-44f43e75f977" -> "42d3****75f977"
export function maskId(id: string | null | undefined): string {
  const idStr = String(id ?? '').trim();
  if (!idStr) return '';

  if (idStr.length <= 8) {
    // Nếu ID ngắn, chỉ hiện 2 ký tự đầu
    return `${idStr.substring(0, 2)}${'*'.repeat(Math.max(0, idStr.length - 2))}`;
  }

  // Hiện 4 ký tự đầu và 6 ký tự cuối
  const start = idStr.substring(0, 4);
  const end = idStr.substring(idStr.length - 6);
  const middle = '*'.repeat(Math.max(0, idStr.length - 10));

  return `${start}${middle}${end}`;
}

// Che address chỉ hiện địa chỉ gần đúng (để bảo vệ privacy)
// Ví dụ: "123 Nguyễn Văn Linh, Quận 7, TP.HCM" -> "*** Nguyễn Văn Linh, Quận 7, TP.HCM"
export function maskAddress(address: string | null | undefined): string {
  const addressStr = String(address ?? '').trim();
  if (!addressStr) return '';

  // Tách theo dấu phẩy
  const parts = addressStr.split(',');
  if (parts.length >= 2) {
    // Mask phần đầu (số nhà/đường) và giữ phần sau (quận/thành phố)
    const firstPart = parts[0].trim();
    const restParts = parts.slice(1).join(',');

    // Mask số nhà nhưng giữ tên đường
    const words = firstPart.split(' ');
    if (words.length >= 2) {
      const maskedFirst = words[0].replace(/[0-9]/g, '*');
      return `${maskedFirst} ${words.slice(1).join(' ')}${restParts}`;
    }
  }

  return addressStr;
}

// Format tiền tệ VND
// Ví dụ: 1000000 -> "1.000.000 ₫"
export function formatCurrencyVND(amount: string | number | null | undefined): string {
  const num = Number(amount);
  if (isNaN(num)) return '0 ₫';

  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

// Che một phần số tiền (hiện mức độ thay vì số chính xác)
// Ví dụ: 1500000 -> "1.5M ₫" hoặc 50000 -> "<100K ₫"
export function maskAmount(amount: string | number | null | undefined): string {
  const num = Number(amount);
  if (isNaN(num) || num === 0) return '0 ₫';

  if (num < 1000) {
    return '<1K ₫';
  } else if (num < 10000) {
    return '<10K ₫';
  } else if (num < 100000) {
    return '<100K ₫';
  } else if (num < 1000000) {
    const rounded = Math.floor(num / 10000) * 10;
    return `~${rounded}K ₫`;
  } else if (num < 10000000) {
    const rounded = Math.floor(num / 100000) / 10;
    return `~${rounded}M ₫`;
  } else {
    const rounded = Math.floor(num / 1000000);
    return `~${rounded}M ₫`;
  }
}

// Currency formatting utilities
export function formatCurrency(
  amount: number | string | null | undefined,
  options: {
    currency?: string;
    locale?: string;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
    compact?: boolean;
  } = {}
): string {
  const {
    currency = 'VND',
    locale = 'vi-VN',
    minimumFractionDigits = 0,
    maximumFractionDigits = 0,
    compact = false,
  } = options;

  if (amount === null || amount === undefined || amount === '') {
    return '0 ₫';
  }

  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

  if (isNaN(numAmount)) {
    return '0 ₫';
  }

  if (compact && Math.abs(numAmount) >= 1000000) {
    return formatCompactCurrency(numAmount);
  }

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits,
      maximumFractionDigits,
    }).format(numAmount);
  } catch (_error) {
    // Fallback for unsupported locales/currencies
    return `${numAmount.toLocaleString('vi-VN')} ₫`;
  }
}

// Format currency in compact form (K, M, B)
export function formatCompactCurrency(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || amount === '') {
    return '0 ₫';
  }

  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

  if (isNaN(numAmount)) {
    return '0 ₫';
  }

  const absAmount = Math.abs(numAmount);

  if (absAmount >= 1000000000) {
    // Billions
    const value = (numAmount / 1000000000).toFixed(1);
    return `${value}B ₫`;
  } else if (absAmount >= 1000000) {
    // Millions
    const value = (numAmount / 1000000).toFixed(1);
    return `${value}M ₫`;
  } else if (absAmount >= 1000) {
    // Thousands
    const value = (numAmount / 1000).toFixed(1);
    return `${value}K ₫`;
  } else {
    return `${numAmount.toLocaleString('vi-VN')} ₫`;
  }
}

// Format currency with specific precision
export function formatCurrencyWithPrecision(
  amount: number | string | null | undefined,
  precision: number = 2
): string {
  return formatCurrency(amount, {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  });
}

// Format currency for display in input fields (without currency symbol)
export function formatCurrencyInput(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || amount === '') {
    return '';
  }

  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

  if (isNaN(numAmount)) {
    return '';
  }

  return numAmount.toLocaleString('vi-VN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

// Parse currency string back to number
export function parseCurrency(value: string | null | undefined): number {
  if (!value) return 0;

  // Remove currency symbols and separators
  const cleaned = value
    .replace(/[^\d.,-]/g, '') // Keep only digits, dots, commas, and minus
    .replace(/\./g, '') // Remove dots (thousands separators)
    .replace(',', '.'); // Convert comma to dot (decimal separator)

  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

// Format percentage
export function formatPercentage(
  value: number | string | null | undefined,
  decimals: number = 1
): string {
  if (value === null || value === undefined || value === '') {
    return '0%';
  }

  const numValue = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(numValue)) {
    return '0%';
  }

  return `${numValue.toFixed(decimals)}%`;
}

// Format file size
export function formatFileSize(bytes: number | string | null | undefined): string {
  if (bytes === null || bytes === undefined || bytes === '') {
    return '0 B';
  }

  const numBytes = typeof bytes === 'string' ? parseFloat(bytes) : bytes;

  if (isNaN(numBytes) || numBytes === 0) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const k = 1024;
  const i = Math.floor(Math.log(numBytes) / Math.log(k));

  return `${(numBytes / Math.pow(k, i)).toFixed(1)} ${units[i]}`;
}

/**
 * Extract variables from email template content
 * Finds all {{variableName}} patterns in the content
 */
export function extractVariables(content: string): string[] {
  if (!content) return [];

  // Match {{variableName}} patterns
  const variableRegex = /\{\{([^}]+)\}\}/g;
  const matches = content.match(variableRegex);

  if (!matches) return [];

  // Extract variable names and remove duplicates
  const variables = matches
    .map((match) => match.slice(2, -2).trim()) // Remove {{ and }}
    .filter((name) => name.length > 0) // Remove empty variables
    .filter((name, index, arr) => arr.indexOf(name) === index); // Remove duplicates

  return variables;
}

/**
 * Get predefined variables for each email template type
 */
export function getPredefinedVariables(templateType: string): string[] {
  const predefinedMap: Record<string, string[]> = {
    password_reset: ['userName', 'resetUrl', 'expiryTime'],
    welcome: ['userName', 'loginUrl', 'supportEmail', 'appName'],
    subscription_expiry: ['userName', 'planName', 'renewalUrl', 'expiryDate', 'amount'],
    security_alert: ['userName', 'loginTime', 'ipAddress', 'deviceInfo', 'actionUrl'],
  };

  return predefinedMap[templateType] || [];
}

/**
 * Merge variables from multiple sources (predefined, existing, extracted)
 */
export function mergeVariables(...variableArrays: string[][]): string[] {
  const allVariables = variableArrays.flat();
  return [...new Set(allVariables)].sort();
}

/**
 * Suggest variables based on template type and current content
 */
export function suggestVariables(
  templateType: string,
  currentVariables: string[],
  _content?: string
): string[] {
  const predefined = getPredefinedVariables(templateType);

  // Return predefined variables that are not already in current variables
  return predefined.filter((variable) => !currentVariables.includes(variable));
}
