# Detect Care — Hệ thống giám sát bệnh nhân bằng AI (AI Patient Monitoring)

Giải pháp giám sát bệnh nhân thời gian thực sử dụng Computer Vision và AI để phát hiện hành vi bất thường (ngã, co giật, bất động kéo dài) và gửi cảnh báo kịp thời cho nhân viên y tế.

> Từ khoá chính (SEO): giám sát bệnh nhân, AI, computer vision, phát hiện ngã, ứng dụng Flutter, backend NestJS, real-time alerts

---

## Tóm tắt (Meta)

- Mục tiêu: Xây dựng pipeline `Snapshot → Analyze → Alert` cho camera y tế.
- Đối tượng: bệnh viện, trung tâm chăm sóc, viện dưỡng lão, ứng dụng quản lý caregiver.
- Kỹ thuật: AI (pose estimation, object detection), Flutter mobile app, REST API, WebSocket cho realtime.

---

## Tính năng chính

- Phát hiện hành vi bất thường: ngã, co giật, bất động.
- Lưu trữ snapshot & metadata (thời gian, camera, confidence).
- Hệ thống cảnh báo realtime (push/FCM, email, webhooks).
- Quản lý quyền truy cập: role-based (doctor, nurse, admin, caregiver).
- Dashboard web & mobile (Flutter) để xem camera, lịch sử, báo cáo.
- Tùy chỉnh cấu hình hình ảnh và lưu trữ (retention, compression).

---

## Kiến trúc hệ thống (ngắn gọn)

- VisionCore (Ingest): thu thập ảnh từ RTSP / HTTP snapshot, enqueue xử lý.
- VisionAI (Analyze): model phát hiện, pose estimation, trả về JSON (bbox, keypoints, scores).
- VisionCare (Dashboard): web + mobile client hiển thị luồng, lịch sử, và cảnh báo.
- Uploads & Storage: lưu ảnh/video vào Cloud (S3/Cloudinary) hoặc NAS.

Tech stack gợi ý:

- Frontend: `Flutter` (mobile), `Next.js` (web)
- Backend: `Node.js`/`NestJS` hoặc `FastAPI` (Python) cho AI
- Models: `YOLOv8-Pose`, `MediaPipe`, `BLIP-2` cho captioning
- Database: `Postgres` hoặc `MongoDB`

---

## Cài đặt nhanh (Developer)

1. Cài Flutter & Dart: [https://flutter.dev](https://flutter.dev)
2. Clone repository:

```bash
git clone <repo-url>
cd detect_care_app
```

3. Cài dependencies & chạy app mobile (dev):

```bash
flutter pub get
flutter run
```

4. Chạy tests:

```bash
flutter test
```

---

## Cấp độ tích hợp AI (gợi ý)

- Level 1 — Motion detection: phát hiện chuyển động và lấy snapshot.
- Level 2 — Pose estimation: YOLOv8-Pose để phát hiện tư thế và cảnh báo.
- Level 3 — Context-aware: kết hợp lịch/medical profile để giảm false-positive.

---

## API & Thông tin endpoint (tóm tắt)

- `GET /api/cameras` — danh sách camera
- `POST /api/uploads` — upload trực tiếp snapshot
- `GET /api/events` — lấy sự kiện đã phát hiện
- `POST /api/assignments` — gán caregiver

Xem thêm tài liệu API trong thư mục `docs/` và `openapi/`.

---

## Networking & ApiClient Pattern

Ứng dụng sử dụng `ApiClient` làm lớp trừu tượng cho tất cả các cuộc gọi HTTP đến backend nội bộ. `ApiClient` tự động thêm header Authorization (Bearer token) và xử lý envelope response chuẩn hóa.

### Cách sử dụng

- **Inject ApiClient**: Trong `main.dart`, `ApiClient` được tạo với `tokenProvider` và inject vào các data sources.
- **ApiProvider interface**: Các service classes nhận `ApiProvider?` để có thể sử dụng `ApiClient` hoặc fallback.
- **Migration guidance**:
  - Sử dụng `ApiClient` cho tất cả endpoint backend nội bộ.
  - Giữ `package:http` trực tiếp chỉ cho third-party services (e.g., Twilio, external APIs).
  - Khi thêm service mới, inject `ApiProvider` và fallback to `ApiClient(tokenProvider: AuthStorage.getAccessToken)` nếu không được cung cấp.

Ví dụ:

```dart
class MyService {
  final ApiProvider? _api;

  MyService({ApiProvider? api}) : _api = api;

  Future<void> fetchData() async {
    final provider = _api ?? ApiClient(tokenProvider: AuthStorage.getAccessToken);
    final response = await provider.get('/my-endpoint');
    // Xử lý response...
  }
}
```

---

## Triển khai & vận hành

- Khuyến nghị deploy: Docker + Kubernetes cho backend & ai workers.
- Giám sát: Prometheus + Grafana cho metrics, Sentry cho lỗi.

---

## Đóng góp

- Mở PR vào branch `dev`. Tuân thủ lint & unit tests.
- Thêm mô tả chi tiết cho feature/bugfix và cập nhật `CHANGELOG.md`.

---

## Liên hệ

- Maintainer: `vision-ai-capstone` team
- Email: [devteam@example.com](mailto:devteam@example.com)

---

## Ghi chú SEO & từ khoá

- Sử dụng từ khoá: "giám sát bệnh nhân", "phát hiện ngã", "AI chăm sóc sức khỏe", "camera y tế", "real-time alerts" trong phần tiêu đề, mô tả và section headings để cải thiện khả năng tìm thấy trên công cụ tìm kiếm.
