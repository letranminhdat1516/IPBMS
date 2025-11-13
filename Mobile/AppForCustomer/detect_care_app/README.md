# Detect Care – Hệ thống giám sát bệnh nhân bằng AI

> Ứng dụng Flutter giúp caregiver và nhân viên y tế theo dõi bệnh nhân theo thời gian thực, nhận cảnh báo khi phát hiện hành vi bất thường và quản lý gói dịch vụ.

## Mục lục

1. [Tổng quan](#tổng-quan)
2. [Điểm nổi bật](#điểm-nổi-bật)
3. [Kiến trúc & Luồng dữ liệu](#kiến-trúc--luồng-dữ-liệu)
4. [Cấu trúc mã nguồn](#cấu-trúc-mã-nguồn)
5. [Yêu cầu hệ thống](#yêu-cầu-hệ-thống)
6. [Bắt đầu nhanh](#bắt-đầu-nhanh)
7. [Lệnh hữu ích](#lệnh-hữu-ích)
8. [Cấu hình & Môi trường](#cấu-hình--môi-trường)
9. [Networking & ApiClient](#networking--apiclient)
10. [Subscription & Payment](#subscription--payment)
11. [Triển khai & vận hành](#triển-khai--vận-hành)
12. [Đóng góp](#đóng-góp)
13. [Tài liệu & liên hệ](#tài-liệu--liên-hệ)

---

## Tổng quan

Detect Care kết hợp computer vision và AI để phát hiện:

- Ngã, co giật, bất động kéo dài.
- Bệnh nhân rời giường, rơi khỏi tầm giám sát.
- Hoạt động bất thường tại khu vực chăm sóc đặc biệt.

Các cảnh báo được gửi về ứng dụng di động, dashboard web, FCM, webhook hoặc email để caregiver phản ứng kịp thời. README này tập trung vào hướng dẫn developer: cài đặt, kiến trúc, chuẩn giao tiếp API và các điểm mở rộng chính.

## Điểm nổi bật

- **AI real-time**: mô hình YOLO/Pose xác định sự kiện ngay trong vài trăm ms.
- **Đa kênh cảnh báo**: FCM push, webhook, email, SMS dự phòng.
- **Quản lý quyền chặt chẽ**: role doctor/nurse/admin/caregiver với quota camera.
- **Subscription linh hoạt**: nhiều gói dịch vụ, hỗ trợ nâng cấp/hạ cấp, proration.
- **Ứng dụng đa nền tảng**: Flutter (iOS/Android/Web/MacOS) + dashboard tùy chọn.

## Kiến trúc & Luồng dữ liệu

1. **VisionCore (Ingest)**

   - Nhận stream RTSP/HTTP, snapshot theo chu kỳ.
   - Đưa frame vào hàng đợi (Kafka/Redis/AMQP).

2. **VisionAI (Analyze)**

   - Worker chạy mô hình YOLO/Pose, trả về bbox, keypoints, confidence.
   - Áp dụng business rules (thời gian bất động, vùng nguy hiểm...).

3. **Backend API**

   - REST/WebSocket lưu trữ event, phát cảnh báo, quản lý user, subscription.
   - Tích hợp thanh toán, webhook, thông báo hệ thống.

4. **Ứng dụng khách**

   - Flutter app cho caregiver/doctor.
   - Dashboard web (Next.js) cho admin/operations.

5. **Lưu trữ**
   - Media: S3/Cloudinary/NAS.
   - Metadata: PostgreSQL hoặc MongoDB.
   - Quan trắc: Prometheus + Grafana, log forwarding về Elastic/Sentry.

## Cấu trúc mã nguồn

```
detect_care_app/
├── lib/
│   ├── core/              # cấu hình, logger, networking, theme
│   ├── features/          # mô-đun chức năng (alerts, subscription, media,…)
│   ├── widgets/           # widget chia sẻ giữa màn hình
│   └── services/          # lớp dịch vụ hỗ trợ (notification, sms, …)
├── assets/                # icon, ảnh, lottie...
├── docs/, openapi/        # tài liệu API, đặc tả endpoint
├── android/, ios/, web/, macos/, linux/, windows/
└── tools/, test/, coverage/
```

Xem thêm từng mô-đun tại `lib/features/<module>`; ví dụ `lib/features/subscription` chứa API, provider, controller, mixin logic cho subscription.

## Yêu cầu hệ thống

- [Flutter](https://flutter.dev) >= 3.19 và Dart tương ứng.
- Android Studio hoặc Xcode nếu build native.
- FVM (khuyến nghị) để cố định version Flutter.
- CLI khác:
  - `melos` (nếu chạy workspace script tùy chọn).
  - `firebase-tools` khi cần deploy notifications.
- Thiết bị thử nghiệm:
  - iOS 13+, Android 8+, Chrome (web).

Chạy `flutter doctor` để xác nhận môi trường trước khi phát triển.

## Bắt đầu nhanh

```bash
# 1. Clone dự án
git clone <repo-url>
cd detect_care_app

# 2. Cài dependency
flutter pub get

# 3. Cấu hình file môi trường (xem thêm phần Cấu hình)
cp .env.dev .env.local   # hoặc tạo thủ công

# 4. Chạy ứng dụng
flutter run

# 5. Chạy test
flutter test
```

> **Lưu ý:** dự án sử dụng nhiều native plugin. Nếu build thất bại, kiểm tra log Gradle/Xcode hoặc chạy lại `pod install` trong thư mục `ios`.

## Lệnh hữu ích

| Tác vụ                 | Lệnh mẫu                                       |
| ---------------------- | ---------------------------------------------- |
| Kiểm tra format & lint | `flutter analyze`                              |
| Chạy toàn bộ test      | `flutter test`                                 |
| Chạy test file đơn     | `flutter test test/<file>.dart`                |
| Theo dõi log AppLogger | Sử dụng DevTools logging / `flutter run -v`    |
| Build release Android  | `flutter build apk --release`                  |
| Build ipa (CI)         | `flutter build ipa --export-options-plist ...` |

## Cấu hình & Môi trường

- **AppConfig** (`lib/core/config/app_config.dart`) đọc biến môi trường cho: `apiBaseUrl`, `wsBaseUrl`, `paymentConfig`, v.v.
- File `.env.dev` chứa ví dụ; tạo `.env.local` hoặc dùng Flutter flavors để tách `dev/staging/prod`.
- Các khóa quan trọng:
  - `API_BASE_URL`
  - `PAYMENT_BASE_URL`
  - `SENTRY_DSN`, `FIREBASE_*`
  - `SUPABASE_URL`, `SUPABASE_KEY` (nếu bật module tương ứng)
- Khi build CI/CD, inject biến môi trường thông qua `--dart-define` hoặc `flutter_dotenv`.

## Networking & ApiClient

Toàn bộ request nội bộ đều đi qua `ApiClient` (`lib/core/network/api_client.dart`):

- Thêm header Authorization (Bearer) tự động nhờ `AuthStorage.getAccessToken`.
- Chuẩn hoá response envelope (`{success, data, message}`) và throw exception với nội dung dễ debug.
- Có thể mock bằng `ApiProvider` trong unit/integration test.

Ví dụ:

```dart
class ServicePackageApi {
  final ApiClient _apiClient;
  ServicePackageApi()
      : _apiClient = ApiClient(tokenProvider: AuthStorage.getAccessToken);

  Future<List<Plan>> fetchPlans() async {
    final resp = await _apiClient.get('/plan');
    final data = _apiClient.extractDataFromResponse(resp);
    return (data as List).map((e) => Plan.fromJson(e)).toList();
  }
}
```

**Gợi ý:** Giữ `package:http` cho dịch vụ bên thứ ba; với backend nội bộ luôn thông qua `ApiClient` để đồng nhất logging, retry, error handling.

## Subscription & Payment

- Logic nằm tại `lib/features/subscription/`:
  - `data/`: adapter API (`ServicePackageApi`, `PaymentEndpointAdapter`).
  - `controllers/`: `SubscriptionController` cung cấp API cao cấp cho UI.
  - `mixins/`: `SubscriptionLogic` gom logic fetch plan, chọn gói, guard payment.
  - `screens/`: `select_subscription_screen.dart`, `payment/` nắm UI chính.
- Các bước chính:
  1. `SubscriptionLogic` tải danh sách gói + subscription hiện tại và xác định gói đang dùng (match theo ID/code/price/name).
  2. Khi nâng cấp, UI gọi `upgradeSubscription` → server chuẩn bị giao dịch.  
     Nếu response yêu cầu thanh toán hoặc có `transactionId/payment_url`, app điều hướng đến `PaymentScreen`.
  3. Đăng ký gói miễn phí gọi thẳng `registerFreePlan`.
- Logger (`AppLogger.api`) sử dụng tiếng Việt để align với vận hành trong nước; khi debug nên bật filter `Subscription`/`Payment`.

## Triển khai & vận hành

- **Đóng gói**: backend + worker trong Docker, deploy Kubernetes / ECS.  
  Ứng dụng Flutter phát hành qua TestFlight, Firebase App Distribution, hoặc cửa hàng chính thức.
- **Giám sát**:
  - Metrics: Prometheus + Grafana.
  - Lỗi: Sentry, Firebase Crashlytics.
  - Alerting: PagerDuty/Slack webhook từ backend.
- **Mức độ AI đề xuất**:
  1. Motion detection cơ bản (level 1).
  2. Pose estimation (YOLOv8-Pose) cho phát hiện ngã (level 2).
  3. Context-aware (kết hợp lịch dùng thuốc/hồ sơ bệnh án để giảm false-positive) – level 3.

## Đóng góp

1. Tạo branch từ `dev`: `feature/<tên>` hoặc `fix/<tên>`.
2. Giữ commit nhỏ, mô tả rõ.  
   Chạy `flutter format`, `flutter analyze`, `flutter test` trước khi push.
3. Mở Pull Request:
   - Mô tả vấn đề, cách giải quyết, ảnh chụp (nếu UI).
   - Viết unit test cho logic quan trọng.
   - Cập nhật README/CHANGELOG khi thay đổi đáng kể.

## Tài liệu & liên hệ

- Tài liệu API: thư mục `docs/` & `openapi/`.
- Endpoint phổ biến:
  - `GET /api/cameras`
  - `GET /api/events`
  - `POST /api/uploads`
  - `POST /api/assignments`
- Liên hệ: `vision-ai-capstone` team — [devteam@example.com](mailto:devteam@example.com)

---

Nếu cần thêm phần hướng dẫn cụ thể (ví dụ thiết lập Firebase, cấu hình CI/CD, hay tích hợp module AI mới), hãy tạo issue hoặc cập nhật README theo template trên.
