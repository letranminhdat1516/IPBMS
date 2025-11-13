import 'package:flutter/material.dart';

// ===== ENUMS =====
enum SuggestionCategory {
  fallRisk,
  sleepQuality,
  medicationReminder,
  deviceCheck,
  thresholdReview,
  generalCare,
}

enum SuggestionInteractionType { benefitsOnly, risksOnly, simpleAction }

// ===== MODEL =====
class Suggestion {
  final String id;
  final SuggestionCategory category;
  final String title;
  final String description;

  final SuggestionInteractionType? type;
  final List<String>? bullets;

  bool completed = false;
  bool ignored = false;
  DateTime? remindAt;

  Suggestion({
    required this.id,
    required this.category,
    required this.title,
    required this.description,
    this.type,
    this.bullets,
  });

  SuggestionInteractionType get effectiveType =>
      type ?? SuggestionInteractionType.simpleAction;
}

// ===== SCREEN =====
class AISuggestionsDemoScreen extends StatefulWidget {
  const AISuggestionsDemoScreen({super.key});

  @override
  State<AISuggestionsDemoScreen> createState() =>
      _AISuggestionsDemoScreenState();
}

class _AISuggestionsDemoScreenState extends State<AISuggestionsDemoScreen> {
  final suggestions = <Suggestion>[
    // ===== FALL RISK =====
    Suggestion(
      id: 'fall1',
      category: SuggestionCategory.fallRisk,
      title: 'Kiểm tra thảm trơn phòng khách',
      description: 'AI ghi nhận nhiều cảnh báo té ở một vị trí.',
      type: SuggestionInteractionType.benefitsOnly,
      bullets: [
        'Giảm 40–60% nguy cơ té ngã.',
        'Giảm cảnh báo sai.',
        'AI nhận diện posture chính xác hơn.',
      ],
    ),
    Suggestion(
      id: 'fall2',
      category: SuggestionCategory.fallRisk,
      title: 'Sắp lại đồ đạc khu vực hành lang',
      description:
          'Phát hiện 8 cảnh báo bất thường trong 3 ngày qua ở hành lang.',
      type: SuggestionInteractionType.benefitsOnly,
      bullets: [
        'Tạo lối đi rõ ràng, an toàn hơn.',
        'Giảm vật cản gây nguy hiểm.',
        'Cải thiện độ chính xác của AI.',
      ],
    ),
    Suggestion(
      id: 'fall3',
      category: SuggestionCategory.fallRisk,
      title: 'Tăng ánh sáng buổi tối',
      description: 'Nhiều cảnh báo xảy ra trong điều kiện thiếu sáng.',
      type: SuggestionInteractionType.benefitsOnly,
      bullets: [
        'Giảm nguy cơ té khi di chuyển ban đêm.',
        'Giúp AI nhận diện chính xác hơn.',
        'Người thân dễ quan sát hơn.',
      ],
    ),
    Suggestion(
      id: 'fall4',
      category: SuggestionCategory.fallRisk,
      title: 'Tối ưu góc đặt camera phòng ngủ',
      description: 'Camera hiện tại bị che khuất một phần, ảnh hưởng giám sát.',
      type: SuggestionInteractionType.simpleAction,
    ),

    // ===== SLEEP QUALITY =====
    Suggestion(
      id: 'sleep1',
      category: SuggestionCategory.sleepQuality,
      title: 'Ngủ sớm hơn 30 phút',
      description: 'Bạn ngủ quá muộn 5 ngày liên tiếp.',
      type: SuggestionInteractionType.risksOnly,
      bullets: [
        'Dễ mệt → tăng nguy cơ té.',
        'Nhịp sinh học rối loạn.',
        'Ảnh hưởng sức khỏe tim mạch.',
      ],
    ),
    Suggestion(
      id: 'sleep2',
      category: SuggestionCategory.sleepQuality,
      title: 'Ngủ thêm 1-2 giờ mỗi đêm',
      description: 'Thời gian ngủ trung bình chỉ 5.2 giờ/đêm trong tuần qua.',
      type: SuggestionInteractionType.risksOnly,
      bullets: [
        'Thiếu ngủ làm giảm khả năng phản ứng.',
        'Tăng nguy cơ ngã và tai nạn.',
        'Suy giảm trí nhớ và miễn dịch.',
      ],
    ),

    // ===== MEDICATION =====
    Suggestion(
      id: 'med1',
      category: SuggestionCategory.medicationReminder,
      title: 'Nhắc uống thuốc huyết áp',
      description: 'Chưa ghi nhận thuốc tối nay (8:00 PM).',
      type: SuggestionInteractionType.simpleAction,
    ),
    Suggestion(
      id: 'med2',
      category: SuggestionCategory.medicationReminder,
      title: 'Nhắc uống thuốc sáng',
      description: 'Đã quên thuốc 2 ngày liên tiếp.',
      type: SuggestionInteractionType.risksOnly,
      bullets: [
        'Ảnh hưởng hiệu quả điều trị.',
        'Có thể gây biến chứng nghiêm trọng.',
        'Khó kiểm soát bệnh lý nền.',
      ],
    ),

    // ===== DEVICE CHECK =====
    Suggestion(
      id: 'device1',
      category: SuggestionCategory.deviceCheck,
      title: 'Kiểm tra camera phòng khách',
      description: 'Camera offline từ 2 giờ trước, mất kết nối giám sát.',
      type: SuggestionInteractionType.simpleAction,
    ),
    Suggestion(
      id: 'device2',
      category: SuggestionCategory.deviceCheck,
      title: 'Cải thiện ánh sáng phòng ngủ',
      description: 'AI confidence thấp do thiếu sáng, chỉ đạt 62%.',
      type: SuggestionInteractionType.benefitsOnly,
      bullets: [
        'Tăng độ chính xác lên 85-95%.',
        'Giảm false alarm đáng kể.',
        'Phát hiện bất thường nhanh hơn.',
      ],
    ),
    Suggestion(
      id: 'device3',
      category: SuggestionCategory.deviceCheck,
      title: 'Điều chỉnh vị trí camera',
      description: 'Góc quay bị lệch, chỉ giám sát được 70% diện tích.',
      type: SuggestionInteractionType.simpleAction,
    ),

    // ===== THRESHOLD REVIEW =====
    Suggestion(
      id: 'threshold1',
      category: SuggestionCategory.thresholdReview,
      title: 'Xem lại threshold phòng khách',
      description: '18 false alarm trong 3 ngày, độ nhạy có thể quá cao.',
      type: SuggestionInteractionType.benefitsOnly,
      bullets: [
        'Giảm cảnh báo sai xuống 80%.',
        'Tăng độ tin cậy của hệ thống.',
        'Giảm stress cho người thân.',
      ],
    ),
    Suggestion(
      id: 'threshold2',
      category: SuggestionCategory.thresholdReview,
      title: 'Tối ưu độ nhạy ban đêm',
      description: 'Quá nhiều cảnh báo 10 PM - 6 AM khi chỉ nằm trên giường.',
      type: SuggestionInteractionType.benefitsOnly,
      bullets: [
        'Cải thiện chất lượng cảnh báo thực.',
        'Giảm nhiễu từ chuyển động nhỏ.',
        'AI học theo thói quen của bạn.',
      ],
    ),

    // ===== GENERAL CARE =====
    Suggestion(
      id: 'care1',
      category: SuggestionCategory.generalCare,
      title: 'Vận động nhẹ 15 phút',
      description:
          'Bạn đi lại rất ít trong 4 ngày qua, trung bình chỉ 8 phút/ngày.',
      type: SuggestionInteractionType.risksOnly,
      bullets: [
        'Tăng nguy cơ cứng khớp, yếu cơ.',
        'Ảnh hưởng tuần hoàn máu.',
        'Giảm khả năng cân bằng → dễ té.',
      ],
    ),
    Suggestion(
      id: 'care2',
      category: SuggestionCategory.generalCare,
      title: 'Kiểm tra xương khớp',
      description:
          'Phát hiện bạn ngồi liên tục >6 giờ mỗi ngày trong tuần qua.',
      type: SuggestionInteractionType.risksOnly,
      bullets: [
        'Ngồi lâu làm thoái hóa khớp.',
        'Tăng nguy cơ đau lưng, cứng vai.',
        'Ảnh hưởng khả năng vận động.',
      ],
    ),
    Suggestion(
      id: 'care3',
      category: SuggestionCategory.generalCare,
      title: 'Theo dõi hành vi bất thường',
      description:
          'AI phát hiện hành vi lặp lại bất thường: đi lại vòng tròn 5 lần/ngày.',
      type: SuggestionInteractionType.simpleAction,
    ),
  ];

  @override
  Widget build(BuildContext context) {
    final visible = suggestions.where((s) {
      if (s.completed || s.ignored) return false;
      if (s.remindAt != null && s.remindAt!.isAfter(DateTime.now()))
        return false;
      return true;
    }).toList();

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        elevation: 0,
        title: const Text(
          "Gợi ý từ AI",
          style: TextStyle(fontWeight: FontWeight.w700, fontSize: 20),
        ),
        backgroundColor: Colors.white,
        foregroundColor: const Color(0xFF1E293B),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Container(color: const Color(0xFFE2E8F0), height: 1),
        ),
      ),
      body: visible.isEmpty
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Container(
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      color: const Color(0xFFEFF6FF),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.check_circle_outline,
                      size: 64,
                      color: Color(0xFF3B82F6),
                    ),
                  ),
                  const SizedBox(height: 24),
                  const Text(
                    "Tất cả gợi ý đã hoàn thành!",
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF475569),
                    ),
                  ),
                ],
              ),
            )
          : ListView(
              padding: const EdgeInsets.all(16),
              children: visible
                  .map(
                    (s) => SuggestionCard(
                      item: s,
                      onUpdate: () => setState(() {}),
                    ),
                  )
                  .toList(),
            ),
    );
  }
}

// ===== CARD =====
class SuggestionCard extends StatelessWidget {
  final Suggestion item;
  final VoidCallback onUpdate;

  const SuggestionCard({super.key, required this.item, required this.onUpdate});

  // -------- màu theo loại --------
  Color get accent {
    switch (item.category) {
      case SuggestionCategory.fallRisk:
        return const Color(0xFFEF4444); // Red-500
      case SuggestionCategory.sleepQuality:
        return const Color(0xFF3B82F6); // Blue-500
      case SuggestionCategory.medicationReminder:
        return const Color(0xFF8B5CF6); // Violet-500
      case SuggestionCategory.deviceCheck:
        return const Color(0xFFF59E0B); // Amber-500
      case SuggestionCategory.thresholdReview:
        return const Color(0xFF14B8A6); // Teal-500
      case SuggestionCategory.generalCare:
        return const Color(0xFF10B981); // Emerald-500
    }
  }

  Color get lightAccent {
    switch (item.category) {
      case SuggestionCategory.fallRisk:
        return const Color(0xFFFEE2E2);
      case SuggestionCategory.sleepQuality:
        return const Color(0xFFEFF6FF);
      case SuggestionCategory.medicationReminder:
        return const Color(0xFFF5F3FF);
      case SuggestionCategory.deviceCheck:
        return const Color(0xFFFEF3C7);
      case SuggestionCategory.thresholdReview:
        return const Color(0xFFCCFBF1);
      case SuggestionCategory.generalCare:
        return const Color(0xFFD1FAE5);
    }
  }

  IconData get categoryIcon {
    switch (item.category) {
      case SuggestionCategory.fallRisk:
        return Icons.warning_rounded;
      case SuggestionCategory.sleepQuality:
        return Icons.bedtime_rounded;
      case SuggestionCategory.medicationReminder:
        return Icons.medication_rounded;
      case SuggestionCategory.deviceCheck:
        return Icons.devices_rounded;
      case SuggestionCategory.thresholdReview:
        return Icons.tune_rounded;
      case SuggestionCategory.generalCare:
        return Icons.favorite_rounded;
    }
  }

  // -------- hành động chính theo loại gợi ý --------
  String get primaryLabel {
    switch (item.category) {
      case SuggestionCategory.fallRisk:
        return "Tôi đã xử lý";
      case SuggestionCategory.sleepQuality:
        return "Tôi sẽ điều chỉnh";
      case SuggestionCategory.medicationReminder:
        return "Đã nhắc thuốc";
      case SuggestionCategory.deviceCheck:
        return "Đã kiểm tra";
      case SuggestionCategory.thresholdReview:
        return "Tôi đã tối ưu";
      case SuggestionCategory.generalCare:
        return "Tôi đã vận động";
    }
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => _openDetail(context),
      child: Container(
        margin: const EdgeInsets.only(bottom: 16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: const Color(0xFF64748B).withOpacity(0.08),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header với icon
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: lightAccent,
                borderRadius: const BorderRadius.only(
                  topLeft: Radius.circular(16),
                  topRight: Radius.circular(16),
                ),
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Icon(categoryIcon, color: accent, size: 24),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          item.title,
                          style: const TextStyle(
                            fontSize: 17,
                            fontWeight: FontWeight.w700,
                            color: Color(0xFF0F172A),
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          item.description,
                          style: const TextStyle(
                            color: Color(0xFF64748B),
                            fontSize: 14,
                            height: 1.4,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            // ACTION BAR
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Expanded(
                    child: ElevatedButton(
                      onPressed: () => _doPrimary(context),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: accent,
                        foregroundColor: Colors.white,
                        elevation: 0,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      child: Text(
                        primaryLabel,
                        style: const TextStyle(
                          fontWeight: FontWeight.w600,
                          fontSize: 15,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton(
                    onPressed: () => _remindLater(context),
                    icon: const Icon(Icons.schedule_rounded),
                    style: IconButton.styleFrom(
                      backgroundColor: const Color(0xFFF1F5F9),
                      foregroundColor: const Color(0xFF64748B),
                    ),
                  ),
                  IconButton(
                    onPressed: () => _skip(context),
                    icon: const Icon(Icons.close_rounded),
                    style: IconButton.styleFrom(
                      backgroundColor: const Color(0xFFF1F5F9),
                      foregroundColor: const Color(0xFF64748B),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ============== DETAIL SHEET ==============
  void _openDetail(BuildContext context) {
    showModalBottomSheet(
      context: context,
      showDragHandle: true,
      backgroundColor: Colors.white,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => DraggableScrollableSheet(
        initialChildSize: 0.7,
        minChildSize: 0.5,
        maxChildSize: 0.95,
        expand: false,
        builder: (_, controller) => Padding(
          padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
          child: ListView(
            controller: controller,
            children: [
              // Header với icon lớn
              Center(
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: lightAccent,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Icon(categoryIcon, color: accent, size: 40),
                ),
              ),
              const SizedBox(height: 20),
              Text(
                item.title,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w700,
                  color: Color(0xFF0F172A),
                ),
              ),
              const SizedBox(height: 12),
              Text(
                item.description,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: Color(0xFF64748B),
                  height: 1.5,
                  fontSize: 15,
                ),
              ),
              const SizedBox(height: 32),

              if (item.effectiveType ==
                  SuggestionInteractionType.benefitsOnly) ...[
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: lightAccent,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Icon(Icons.check_circle, color: accent, size: 20),
                          const SizedBox(width: 8),
                          Text(
                            "Nếu bạn làm",
                            style: TextStyle(
                              color: accent,
                              fontWeight: FontWeight.w700,
                              fontSize: 16,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      ...(item.bullets ?? []).map(
                        (e) => Padding(
                          padding: const EdgeInsets.only(bottom: 8),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Container(
                                margin: const EdgeInsets.only(top: 6, right: 8),
                                width: 6,
                                height: 6,
                                decoration: BoxDecoration(
                                  color: accent,
                                  shape: BoxShape.circle,
                                ),
                              ),
                              Expanded(
                                child: Text(
                                  e,
                                  style: const TextStyle(
                                    height: 1.5,
                                    color: Color(0xFF334155),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],

              if (item.effectiveType ==
                  SuggestionInteractionType.risksOnly) ...[
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: lightAccent,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Icon(Icons.warning_rounded, color: accent, size: 20),
                          const SizedBox(width: 8),
                          Text(
                            "Nếu tiếp tục như vậy",
                            style: TextStyle(
                              color: accent,
                              fontWeight: FontWeight.w700,
                              fontSize: 16,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      ...(item.bullets ?? []).map(
                        (e) => Padding(
                          padding: const EdgeInsets.only(bottom: 8),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Container(
                                margin: const EdgeInsets.only(top: 6, right: 8),
                                width: 6,
                                height: 6,
                                decoration: BoxDecoration(
                                  color: accent,
                                  shape: BoxShape.circle,
                                ),
                              ),
                              Expanded(
                                child: Text(
                                  e,
                                  style: const TextStyle(
                                    height: 1.5,
                                    color: Color(0xFF334155),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],

              if (item.effectiveType ==
                  SuggestionInteractionType.simpleAction) ...[
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Row(
                        children: [
                          Icon(
                            Icons.lightbulb_rounded,
                            color: Color(0xFF3B82F6),
                            size: 20,
                          ),
                          SizedBox(width: 8),
                          Text(
                            "Cách thực hiện",
                            style: TextStyle(
                              fontWeight: FontWeight.w700,
                              fontSize: 16,
                              color: Color(0xFF0F172A),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      const Text(
                        "• Làm đúng theo gợi ý ở tiêu đề.\n"
                        "• Hệ thống sẽ ghi nhận và theo dõi tình trạng trong 48–72 giờ.",
                        style: TextStyle(height: 1.5, color: Color(0xFF475569)),
                      ),
                    ],
                  ),
                ),
              ],

              const SizedBox(height: 32),
              ElevatedButton(
                onPressed: () {
                  Navigator.pop(context);
                  _doPrimary(context);
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: accent,
                  foregroundColor: Colors.white,
                  elevation: 0,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                ),
                child: Text(
                  primaryLabel,
                  style: const TextStyle(
                    fontWeight: FontWeight.w600,
                    fontSize: 16,
                  ),
                ),
              ),
              const SizedBox(height: 12),
              OutlinedButton(
                onPressed: () {
                  Navigator.pop(context);
                  _remindLater(context);
                },
                style: OutlinedButton.styleFrom(
                  foregroundColor: const Color(0xFF64748B),
                  side: const BorderSide(color: Color(0xFFE2E8F0)),
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                ),
                child: const Text(
                  "Nhắc lại sau 2 ngày",
                  style: TextStyle(fontWeight: FontWeight.w600),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ============== ACTIONS ==============
  void _doPrimary(BuildContext context) {
    item.completed = true;
    onUpdate();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: const Text(
          "Đã ghi nhận — AI sẽ theo dõi thay đổi trong 48–72h.",
        ),
        backgroundColor: accent,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      ),
    );
  }

  void _remindLater(BuildContext context) {
    item.remindAt = DateTime.now().add(const Duration(days: 2));
    onUpdate();
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text("Sẽ nhắc lại sau 2 ngày."),
        backgroundColor: Color(0xFF3B82F6),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  void _skip(BuildContext context) {
    item.ignored = true;
    item.remindAt = DateTime.now().add(const Duration(days: 14));
    onUpdate();
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text("Đã bỏ qua — AI sẽ xem xét nhắc lại sau 14 ngày."),
        backgroundColor: Color(0xFF64748B),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }
}
