export function getNotificationMessage(event: any): string {
  const timestamp = new Date(event.detected_at).toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
  });
  const messages: Record<string, string> = {
    fall_detection: `🚨 Phát hiện có người ngã lúc ${timestamp}. Vui lòng kiểm tra ngay!`,
    abnormal_behavior: `⚠️ Phát hiện hành vi bất thường lúc ${timestamp}. Cần theo dõi.`,
    emergency: `🆘 Tình huống khẩn cấp được phát hiện lúc ${timestamp}. Cần hỗ trợ ngay!`,
    inactivity: `😴 Không có hoạt động được phát hiện từ ${timestamp}. Kiểm tra tình trạng.`,
    intrusion: `🚪 Phát hiện có người lạ lúc ${timestamp}. Kiểm tra camera.`,
    medication_reminder: `💊 Đến giờ uống thuốc - ${timestamp}`,
    sleep: `😴 Giấc ngủ được ghi nhận lúc ${timestamp}.`,
  };
  return (
    messages[event.event_type] ||
    `📱 Sự kiện mới được phát hiện lúc ${timestamp}. Vui lòng kiểm tra.`
  );
}
