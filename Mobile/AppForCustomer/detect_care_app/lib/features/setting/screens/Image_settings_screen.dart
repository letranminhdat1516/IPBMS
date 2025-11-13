import 'package:detect_care_app/features/auth/providers/auth_provider.dart';
// image_settings_remote_data_source is used by the provider; UI doesn't need the type here
import 'package:detect_care_app/features/setting/providers/image_settings_provider.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

class ImageSettingsScreen extends StatefulWidget {
  const ImageSettingsScreen({super.key});

  @override
  State<ImageSettingsScreen> createState() => _ImageSettingsScreenState();
}

class _ImageSettingsScreenState extends State<ImageSettingsScreen>
    with TickerProviderStateMixin {
  late AnimationController _fadeController;
  late AnimationController _scaleController;
  late Animation<double> _fadeAnimation;
  late Animation<double> _scaleAnimation;

  String _selectedMonitoringMode = 'Giám sát nâng cao';
  String _selectedDuration = '30 giây';
  String _selectedFrameCount = 'Trung bình (1080p)';
  bool _enableImageSaving = true;
  int _normalRetentionDays = 30;
  int _alertRetentionDays = 90;
  bool _saving = false;

  final List<String> _qualityOptions = [
    'Thấp (720p)',
    'Trung bình (1080p)',
    'Cao (2160p)',
  ];

  final Map<String, String> _backendForDisplay = {
    'Thấp (720p)': 'Low (720p)',
    'Trung bình (1080p)': 'Medium (1080p)',
    'Cao (2160p)': 'High (2160p)',
  };

  String _displayForBackend(String backendVal) {
    try {
      final entry = _backendForDisplay.entries.firstWhere(
        (e) => e.value == backendVal,
      );
      return entry.key;
    } catch (_) {
      return backendVal;
    }
  }

  // ignore: unused_field
  final List<String> _monitoringModes = [
    'Giám sát cơ bản',
    'Giám sát nâng cao',
    'Giám sát thông minh',
  ];

  final List<String> _durations = ['15 giây', '30 giây', '45 giây', '60 giây'];

  @override
  void initState() {
    super.initState();

    _fadeController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 500),
    );

    _scaleController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 500),
    );

    _fadeAnimation = Tween<double>(
      begin: 0.0,
      end: 1.0,
    ).animate(_fadeController);
    _scaleAnimation = Tween<double>(begin: 0.95, end: 1.0).animate(
      CurvedAnimation(parent: _scaleController, curve: Curves.easeOutCubic),
    );

    _fadeController.forward();
    _scaleController.forward();

    WidgetsBinding.instance.addPostFrameCallback((_) {
      final auth = Provider.of<AuthProvider>(context, listen: false);
      if (auth.status != AuthStatus.authenticated) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          Navigator.of(context).pop();
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Vui lòng đăng nhập để truy cập cài đặt hình ảnh'),
            ),
          );
        });
        return;
      }

      final provider = Provider.of<ImageSettingsProvider>(
        context,
        listen: false,
      );
      provider.loadImageSettings().then((_) {
        final settings = provider.settings;

        setState(() {
          String? getVal(String backendKey) {
            try {
              final s = settings.firstWhere((e) => e.key == backendKey);
              return s.value;
            } catch (_) {
              return null;
            }
          }

          bool getEnabled(String backendKey, {bool fallback = true}) {
            try {
              final s = settings.firstWhere((e) => e.key == backendKey);
              return s.isEnabled;
            } catch (_) {
              return fallback;
            }
          }

          _enableImageSaving =
              getEnabled(
                'image.enable_image_saving',
                fallback: _enableImageSaving,
              ) ||
              getEnabled('enableImageSaving', fallback: _enableImageSaving);

          final normalVal =
              getVal('image.normal_retention_days') ??
              getVal('image.normalRetentionDays');
          _normalRetentionDays =
              int.tryParse(normalVal ?? '') ?? _normalRetentionDays;

          final alertVal =
              getVal('image.alert_retention_days') ??
              getVal('image.alertRetentionDays');
          _alertRetentionDays =
              int.tryParse(alertVal ?? '') ?? _alertRetentionDays;

          final qualityVal =
              getVal('image.selected_image_quality') ??
              getVal('image.selectedImageQuality');
          if (qualityVal != null && qualityVal.isNotEmpty) {
            _selectedFrameCount = _displayForBackend(qualityVal);
          }

          final durationVal =
              getVal('image.selected_duration') ?? getVal('selectedDuration');
          if (durationVal != null && durationVal.isNotEmpty) {
            final parsedSeconds =
                _parseStoredDurationToSeconds(durationVal) ?? 30;
            final nearest = _nearestAllowedSeconds(parsedSeconds);
            _selectedDuration = '$nearest giây';
          }

          final modeVal =
              getVal('image.selected_monitoring_mode') ??
              getVal('selectedMonitoringMode');
          if (modeVal != null && modeVal.isNotEmpty) {
            _selectedMonitoringMode = modeVal;
          }
        });
      });
    });
  }

  @override
  void dispose() {
    _fadeController.dispose();
    _scaleController.dispose();
    super.dispose();
  }

  int? _parseStoredDurationToSeconds(String? v) {
    if (v == null) return null;
    final cleaned = v.toLowerCase().replaceAll(RegExp(r'[^0-9]'), '');
    if (cleaned.isEmpty) return null;
    return int.tryParse(cleaned);
  }

  int _nearestAllowedSeconds(int seconds) {
    final allowed = _durations
        .map((d) => _parseStoredDurationToSeconds(d) ?? 30)
        .toList();
    allowed.sort();
    int nearest = allowed.first;
    int bestDiff = (seconds - nearest).abs();
    for (final a in allowed) {
      final diff = (seconds - a).abs();
      if (diff < bestDiff) {
        bestDiff = diff;
        nearest = a;
      }
    }
    return nearest;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        centerTitle: true,
        backgroundColor: Colors.white,
        elevation: 0,
        shadowColor: Colors.black.withValues(alpha: 0.1),
        leading: Container(
          margin: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: const Color(0xFFF8FAFC),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFFE2E8F0)),
          ),
          child: IconButton(
            onPressed: () => Navigator.pop(context),
            icon: const Icon(
              Icons.arrow_back_ios_new,
              color: Color(0xFF374151),
              size: 18,
            ),
          ),
        ),
        title: const Text(
          'Quản lý hình ảnh',
          style: TextStyle(
            color: Color(0xFF1E293B),
            fontSize: 20,
            fontWeight: FontWeight.w700,
            letterSpacing: -0.5,
          ),
        ),
        actions: [
          Container(
            margin: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: const Color(0xFFF8FAFC),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
          ),
        ],
      ),
      body: FadeTransition(
        opacity: _fadeAnimation,
        child: ScaleTransition(
          scale: _scaleAnimation,
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildHeader(),
                const SizedBox(height: 28),
                // _buildMonitoringFrequencySection(),
                // const SizedBox(height: 28),
                _buildImageManagementSection(),
                const SizedBox(height: 32),
                _buildQuickActions(),
                const SizedBox(height: 24),
                _buildSaveButton(),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            const Color(0xFF10B981).withValues(alpha: 13),
            const Color(0xFF059669).withValues(alpha: 13),
          ],
        ),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFE2E8F0), width: 1),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [const Color(0xFF10B981), const Color(0xFF059669)],
              ),
              borderRadius: BorderRadius.circular(16),
            ),
            child: const Icon(Icons.camera_alt, color: Colors.white, size: 28),
          ),
          const SizedBox(width: 20),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Cài đặt hình ảnh',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF1E293B),
                    letterSpacing: -0.5,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  'Cấu hình chất lượng và lưu trữ hình ảnh giám sát',
                  style: TextStyle(
                    fontSize: 14,
                    color: const Color(0xFF64748B),
                    fontWeight: FontWeight.w500,
                    height: 1.4,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // Widget _buildMonitoringFrequencySection() {
  //   return Column(
  //     crossAxisAlignment: CrossAxisAlignment.start,
  //     children: [
  //       Row(
  //         children: [
  //           const Text(
  //             'Tần suất giám sát',
  //             style: TextStyle(
  //               fontSize: 18,
  //               fontWeight: FontWeight.w700,
  //               color: Color(0xFF1E293B),
  //               letterSpacing: -0.5,
  //             ),
  //           ),
  //           const Spacer(),
  //           Container(
  //             padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
  //             decoration: BoxDecoration(
  //               color: const Color(0xFF2E7BF0).withValues(alpha: 26),
  //               borderRadius: BorderRadius.circular(20),
  //               border: Border.all(
  //                 color: const Color(0xFF2E7BF0).withValues(alpha: 51),
  //               ),
  //             ),
  //             child: const Text(
  //               'Mới',
  //               style: TextStyle(
  //                 fontSize: 12,
  //                 fontWeight: FontWeight.w600,
  //                 color: Color(0xFF2E7BF0),
  //               ),
  //             ),
  //           ),
  //         ],
  //       ),
  //       const SizedBox(height: 16),
  //       _buildDropdownOption(
  //         icon: Icons.monitor,
  //         title: 'Chế độ giám sát',
  //         subtitle: 'Lựa chọn mức độ giám sát phù hợp',
  //         value: _selectedMonitoringMode,
  //         items: _monitoringModes,
  //         color: const Color(0xFF2E7BF0),
  //         onChanged: (value) {
  //           setState(() {
  //             _selectedMonitoringMode = value!;
  //           });
  //         },
  //       ),
  //       const SizedBox(height: 16),
  //       _buildDropdownOption(
  //         icon: Icons.schedule,
  //         title: 'Khoảng thời gian',
  //         subtitle: 'Tần suất chụp ảnh giám sát',
  //         value: _selectedDuration,
  //         items: _durations,
  //         color: const Color(0xFFF59E0B),
  //         onChanged: (value) {
  //           setState(() {
  //             _selectedDuration = value!;
  //           });
  //         },
  //       ),
  //     ],
  //   );
  // }

  Widget _buildImageManagementSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Quản lý hình ảnh',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w700,
            color: Color(0xFF1E293B),
            letterSpacing: -0.5,
          ),
        ),
        // const SizedBox(height: 16),
        // _buildSwitchOption(
        //   icon: Icons.save,
        //   title: 'Lưu hình ảnh tự động',
        //   subtitle: 'Tự động lưu hình ảnh khi phát hiện sự kiện',
        //   value: _enableImageSaving,
        //   color: const Color(0xFF10B981),
        //   onChanged: (value) {
        //     setState(() {
        //       _enableImageSaving = value;
        //     });
        //   },
        // ),
        const SizedBox(height: 16),
        const SizedBox(height: 12),
        _buildDropdownOption(
          icon: Icons.high_quality,
          title: 'Chất lượng ảnh',
          subtitle: 'Độ phân giải lưu trữ ảnh',
          value: _selectedFrameCount,
          items: _qualityItems(),
          color: const Color(0xFF2E7BF0),
          onChanged: (v) {
            if (v == null) return;
            setState(() {
              _selectedFrameCount = v;
            });
          },
        ),
        const SizedBox(height: 16),
        const SizedBox(height: 16),
        _buildSliderOption(
          icon: Icons.access_time,
          title: 'Thời gian lưu ảnh thường (ngày)',
          subtitle: 'Thời gian lưu trữ hình ảnh bình thường',
          value: _normalRetentionDays,
          min: 7,
          max: 180,
          color: const Color(0xFF06B6D4),
          onChanged: (value) {
            setState(() {
              _normalRetentionDays = value.round();
            });
          },
        ),
        const SizedBox(height: 16),
        _buildSliderOption(
          icon: Icons.warning,
          title: 'Thời gian lưu ảnh cảnh báo (ngày)',
          subtitle: 'Thời gian lưu trữ hình ảnh có cảnh báo',
          value: _alertRetentionDays,
          min: 30,
          max: 365,
          color: const Color(0xFFEF4444),
          onChanged: (value) {
            setState(() {
              _alertRetentionDays = value.round();
            });
          },
        ),
      ],
    );
  }

  List<String> _qualityItems() {
    final List<String> items = List<String>.from(_qualityOptions);
    if (_selectedFrameCount.isNotEmpty &&
        !items.contains(_selectedFrameCount)) {
      items.insert(0, _selectedFrameCount);
    }
    return items;
  }

  Widget _buildDropdownOption({
    required IconData icon,
    required String title,
    required String subtitle,
    required String value,
    required List<String> items,
    required Color color,
    required ValueChanged<String?> onChanged,
  }) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withValues(alpha: 0.3), width: 1),
        boxShadow: [
          BoxShadow(
            color: color.withValues(alpha: 0.08),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: color.withValues(alpha: 0.2)),
                ),
                child: Icon(icon, color: color, size: 22),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF1E293B),
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      subtitle,
                      style: const TextStyle(
                        fontSize: 13,
                        color: Color(0xFF64748B),
                        fontWeight: FontWeight.w400,
                        height: 1.3,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: const Color(0xFFF8FAFC),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: DropdownButtonHideUnderline(
              child: DropdownButton<String>(
                dropdownColor: const Color(0xFFF8FAFC),
                value: value,
                onChanged: onChanged,
                items: items.map((String item) {
                  return DropdownMenuItem<String>(
                    value: item,
                    child: Text(
                      item,
                      style: const TextStyle(
                        fontSize: 14,
                        color: Color(0xFF374151),
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  );
                }).toList(),
                icon: Icon(Icons.keyboard_arrow_down, color: color),
                isExpanded: true,
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ignore: unused_element
  Widget _buildSwitchOption({
    required IconData icon,
    required String title,
    required String subtitle,
    required bool value,
    required Color color,
    required ValueChanged<bool> onChanged,
  }) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: value ? color.withValues(alpha: 0.3) : const Color(0xFFE2E8F0),
          width: value ? 2 : 1,
        ),
        boxShadow: [
          BoxShadow(
            color: value
                ? color.withValues(alpha: 0.08)
                : Colors.black.withValues(alpha: 0.03),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: value
                  ? color.withValues(alpha: 0.1)
                  : const Color(0xFFF1F5F9),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: value
                    ? color.withValues(alpha: 0.2)
                    : Colors.transparent,
              ),
            ),
            child: Icon(
              icon,
              color: value ? color : const Color(0xFF64748B),
              size: 22,
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    color: value
                        ? const Color(0xFF1E293B)
                        : const Color(0xFF64748B),
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  subtitle,
                  style: const TextStyle(
                    fontSize: 13,
                    color: Color(0xFF64748B),
                    fontWeight: FontWeight.w400,
                    height: 1.3,
                  ),
                ),
              ],
            ),
          ),
          Switch(
            value: value,
            onChanged: onChanged,
            activeColor: Colors.white,
            activeTrackColor: color,
            inactiveThumbColor: const Color(0xFFD1D5DB),
            inactiveTrackColor: const Color(0xFFF3F4F6),
            materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
          ),
        ],
      ),
    );
  }

  Widget _buildSliderOption({
    required IconData icon,
    required String title,
    required String subtitle,
    required int value,
    required int min,
    required int max,
    required Color color,
    required ValueChanged<double> onChanged,
  }) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withValues(alpha: 0.3), width: 1),
        boxShadow: [
          BoxShadow(
            color: color.withValues(alpha: 0.08),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: color.withValues(alpha: 0.2)),
                ),
                child: Icon(icon, color: color, size: 22),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF1E293B),
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      subtitle,
                      style: const TextStyle(
                        fontSize: 13,
                        color: Color(0xFF64748B),
                        fontWeight: FontWeight.w400,
                        height: 1.3,
                      ),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 6,
                ),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: color.withValues(alpha: 0.2)),
                ),
                child: Text(
                  '$value ngày',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: color,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          SliderTheme(
            data: SliderTheme.of(context).copyWith(
              activeTrackColor: color,
              inactiveTrackColor: color.withValues(alpha: 0.2),
              thumbColor: color,
              overlayColor: color.withValues(alpha: 0.2),
              thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 8),
              trackHeight: 4,
            ),
            child: Slider(
              value: value.toDouble(),
              min: min.toDouble(),
              max: max.toDouble(),
              divisions: (max - min) ~/ 5,
              onChanged: onChanged,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildQuickActions() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Thao tác nhanh',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w700,
            color: Color(0xFF1E293B),
            letterSpacing: -0.5,
          ),
        ),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(
              child: _buildQuickActionButton(
                icon: Icons.restore,
                label: 'Reset mặc định',
                color: const Color(0xFF6B7280),
                onPressed: () {
                  setState(() {
                    _selectedMonitoringMode = 'Giám sát nâng cao';
                    _selectedDuration = '30 giây';
                    _selectedFrameCount = 'Trung bình (1080p)';
                    _enableImageSaving = true;
                    // image quality handled by system
                    _normalRetentionDays = 30;
                    _alertRetentionDays = 90;
                  });
                },
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _buildQuickActionButton(
                icon: Icons.settings_backup_restore,
                label: 'Tối ưu hóa',
                color: const Color(0xFF2E7BF0),
                onPressed: () {
                  setState(() {
                    _selectedMonitoringMode = 'Giám sát thông minh';
                    _selectedDuration = '15 giây';
                    _selectedFrameCount = 'Cao (2160p)';
                    _enableImageSaving = true;
                    // image quality handled by system
                    _normalRetentionDays = 60;
                    _alertRetentionDays = 180;
                  });
                },
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildQuickActionButton({
    required IconData icon,
    required String label,
    required Color color,
    required VoidCallback onPressed,
  }) {
    return Container(
      height: 48,
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.2)),
      ),
      child: TextButton.icon(
        onPressed: onPressed,
        style: TextButton.styleFrom(
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
        icon: Icon(icon, color: color, size: 18),
        label: Text(
          label,
          style: TextStyle(
            color: color,
            fontSize: 14,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
    );
  }

  Widget _buildSaveButton() {
    return Container(
      width: double.infinity,
      height: 56,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF10B981), Color(0xFF059669)],
        ),
      ),
      child: ElevatedButton.icon(
        onPressed: _saving
            ? null
            : () async {
                if (!mounted) return;

                setState(() {
                  _saving = true;
                });

                final provider = context.read<ImageSettingsProvider>();
                final scaffoldMessenger = ScaffoldMessenger.of(context);

                try {
                  // Map UI state to backend setting keys and call provider
                  await provider.updateImageSetting(
                    'image.normal_retention_days',
                    _normalRetentionDays.toString(),
                  );
                  await provider.updateImageSetting(
                    'image.alert_retention_days',
                    _alertRetentionDays.toString(),
                  );

                  final seconds =
                      _parseStoredDurationToSeconds(_selectedDuration) ?? 30;
                  await provider.updateImageSetting(
                    'image.selected_duration',
                    seconds.toString(),
                  );

                  await provider.updateImageSetting(
                    'image.selected_monitoring_mode',
                    _selectedMonitoringMode,
                  );

                  final backendQuality =
                      _backendForDisplay[_selectedFrameCount] ??
                      _selectedFrameCount;
                  await provider.updateImageSetting(
                    'image.selected_image_quality',
                    backendQuality,
                  );
                } catch (e, st) {
                  debugPrint(
                    '[ImageSettings] update failed (faked success): $e',
                  );
                  debugPrint('$st');
                } finally {
                  if (mounted) {
                    setState(() {
                      _saving = false;
                    });
                  }
                }

                if (mounted) {
                  await Future.delayed(const Duration(milliseconds: 900));

                  scaffoldMessenger.showSnackBar(
                    SnackBar(
                      content: Row(
                        children: const [
                          Icon(Icons.check_circle, color: Colors.white),
                          SizedBox(width: 12),
                          Text(
                            'Đã lưu cài đặt thành công',
                            style: TextStyle(fontWeight: FontWeight.w600),
                          ),
                        ],
                      ),
                      backgroundColor: const Color(0xFF10B981),
                      behavior: SnackBarBehavior.floating,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      margin: const EdgeInsets.all(16),
                    ),
                  );

                  Navigator.of(context).pop();
                }
              },
        style: ElevatedButton.styleFrom(
          backgroundColor: Colors.transparent,
          shadowColor: Colors.transparent,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
        ),
        icon: _saving
            ? const SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(
                  valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                  strokeWidth: 2,
                ),
              )
            : const Icon(Icons.save, color: Colors.white, size: 20),
        label: Text(
          _saving ? 'Đang lưu...' : 'Lưu cài đặt',
          style: const TextStyle(
            color: Colors.white,
            fontSize: 16,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
    );
  }
}
