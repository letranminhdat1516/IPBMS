import 'package:detect_care_app/core/network/api_client.dart';
import 'package:detect_care_app/core/theme/app_theme.dart';
import 'package:detect_care_app/features/auth/data/auth_storage.dart';
import 'package:detect_care_app/features/home/models/log_entry.dart';
import 'package:detect_care_app/features/home/repository/event_repository.dart';
import 'package:detect_care_app/features/home/screens/event_detail_screen.dart';
import 'package:detect_care_app/features/home/service/event_service.dart';
import 'package:detect_care_app/features/notification/screens/send_notification_screen.dart';
import 'package:detect_care_app/features/shared_permissions/screens/caregiver_settings_screen.dart';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

class SearchScreen extends StatefulWidget {
  const SearchScreen({super.key});

  @override
  State<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen> {
  final TextEditingController _searchController = TextEditingController();
  final EventRepository _eventRepository = EventRepository(
    EventService(ApiClient(tokenProvider: AuthStorage.getAccessToken)),
  );

  List<LogEntry> _searchResults = [];
  List<String> _searchHistory = [];
  bool _isSearching = false;
  bool _showFilters = false;
  String _selectedFilter = 'Tất cả';
  String _selectedSearchType = 'Sự kiện';

  // Advanced filters
  DateTimeRange? _selectedDateRange;
  String _selectedStatus = 'Tất cả';
  double _minConfidence = 0.0;

  final List<String> _filterOptions = [
    'Tất cả',
    'Cảnh báo',
    'Hoạt động',
    'Báo cáo',
  ];

  final List<String> _searchTypeOptions = [
    'Sự kiện',
    'Người chăm sóc',
    'Hóa đơn',
  ];

  @override
  void initState() {
    super.initState();
    _loadSearchHistory();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadSearchHistory() async {
    final prefs = await SharedPreferences.getInstance();
    setState(() {
      _searchHistory = prefs.getStringList('search_history') ?? [];
    });
  }

  Future<void> _saveSearchHistory(String query) async {
    if (query.trim().isEmpty) return;

    final prefs = await SharedPreferences.getInstance();
    final updatedHistory = [
      query,
      ..._searchHistory.where((item) => item != query),
    ].take(10).toList();
    await prefs.setStringList('search_history', updatedHistory);
    setState(() {
      _searchHistory = updatedHistory;
    });
  }

  Future<void> _clearSearchHistory() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('search_history');
    setState(() {
      _searchHistory = [];
    });
  }

  Future<void> _performSearch(String query) async {
    if (query.trim().isEmpty) {
      setState(() {
        _searchResults = [];
        _isSearching = false;
      });
      return;
    }

    setState(() {
      _isSearching = true;
    });

    try {
      await _saveSearchHistory(query);

      switch (_selectedSearchType) {
        case 'Sự kiện':
          await _searchEvents(query);
          break;
        case 'Người chăm sóc':
          await _searchCaregivers(query);
          break;
        case 'Hóa đơn':
          await _searchInvoices(query);
          break;
        default:
          await _searchEvents(query);
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _searchResults = [];
          _isSearching = false;
        });
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Lỗi tìm kiếm: $e')));
      }
    }
  }

  Future<void> _searchEvents(String query) async {
    final results = await _eventRepository.getEvents(
      page: 1,
      limit: 50,
      search: query,
      status: _selectedStatus != 'Tất cả' ? _selectedStatus : null,
      dayRange: _selectedDateRange,
    );

    var filteredResults = results;
    if (_minConfidence > 0) {
      filteredResults = results
          .where((event) => event.confidenceScore >= _minConfidence)
          .toList();
    }

    if (mounted) {
      setState(() {
        _searchResults = filteredResults;
        _isSearching = false;
      });
    }
  }

  Future<void> _searchCaregivers(String query) async {
    await Future.delayed(const Duration(milliseconds: 500));

    final mockResults =
        [
              LogEntry(
                eventId: 'caregiver_001',
                status: 'active',
                eventType: 'caregiver',
                eventDescription: 'Nguyễn Văn A - Người chăm sóc chính',
                confidenceScore: 1.0,
                createdAt: DateTime.now().subtract(const Duration(days: 1)),
                confirmStatus: true,
              ),
              LogEntry(
                eventId: 'caregiver_002',
                status: 'active',
                eventType: 'caregiver',
                eventDescription: 'Trần Thị B - Người chăm sóc phụ',
                confidenceScore: 1.0,
                createdAt: DateTime.now().subtract(const Duration(days: 2)),
                confirmStatus: true,
              ),
            ]
            .where(
              (item) =>
                  item.eventDescription?.toLowerCase().contains(
                    query.toLowerCase(),
                  ) ??
                  false,
            )
            .toList();

    if (mounted) {
      setState(() {
        _searchResults = mockResults;
        _isSearching = false;
      });
    }
  }

  Future<void> _searchInvoices(String query) async {
    await Future.delayed(const Duration(milliseconds: 500));

    final mockResults =
        [
              LogEntry(
                eventId: 'invoice_001',
                status: 'paid',
                eventType: 'invoice',
                eventDescription: 'Hóa đơn tháng 9 - 500,000 VND',
                confidenceScore: 1.0,
                createdAt: DateTime.now().subtract(const Duration(days: 5)),
                confirmStatus: true,
              ),
              LogEntry(
                eventId: 'invoice_002',
                status: 'pending',
                eventType: 'invoice',
                eventDescription: 'Hóa đơn tháng 8 - 450,000 VND',
                confidenceScore: 1.0,
                createdAt: DateTime.now().subtract(const Duration(days: 15)),
                confirmStatus: false,
              ),
            ]
            .where(
              (item) =>
                  item.eventDescription?.toLowerCase().contains(
                    query.toLowerCase(),
                  ) ??
                  false,
            )
            .toList();

    if (mounted) {
      setState(() {
        _searchResults = mockResults;
        _isSearching = false;
      });
    }
  }

  List<LogEntry> _getFilteredResults() {
    if (_selectedFilter == 'Tất cả') {
      return _searchResults;
    }

    final filterMap = {
      'Cảnh báo': 'warning',
      'Hoạt động': 'activity',
      'Báo cáo': 'report',
    };

    final eventType = filterMap[_selectedFilter];
    return _searchResults
        .where((result) => result.eventType == eventType)
        .toList();
  }

  Future<void> _selectDateRange() async {
    final picked = await showDateRangePicker(
      context: context,
      firstDate: DateTime.now().subtract(const Duration(days: 365)),
      lastDate: DateTime.now(),
      initialDateRange: _selectedDateRange,
      locale: const Locale('vi', 'VN'),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: ColorScheme.light(
              primary: AppTheme.primaryBlue,
              onPrimary: Colors.white,
              surface: Colors.white,
              onSurface: AppTheme.text,
            ),
            dialogBackgroundColor: const Color(0xFFF8FAFC),
          ),
          child: child!,
        );
      },
    );

    if (picked != null) {
      setState(() {
        _selectedDateRange = picked;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final filteredResults = _getFilteredResults();

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        shadowColor: Colors.black.withValues(alpha: 0.05),
        surfaceTintColor: Colors.transparent,
        title: Container(
          height: 48,
          decoration: BoxDecoration(
            color: const Color(0xFFF1F5F9),
            borderRadius: BorderRadius.circular(24),
            border: Border.all(
              color: AppTheme.primaryBlue.withValues(alpha: 0.15),
              width: 1.5,
            ),
          ),
          child: TextField(
            controller: _searchController,
            autofocus: true,
            decoration: InputDecoration(
              hintText: _getSmartHintText(),
              hintStyle: TextStyle(
                color: const Color(0xFF94A3B8),
                fontSize: 15,
                fontWeight: FontWeight.w400,
              ),
              border: InputBorder.none,
              contentPadding: const EdgeInsets.symmetric(
                horizontal: 20,
                vertical: 14,
              ),
              prefixIcon: Container(
                margin: const EdgeInsets.only(left: 12, right: 8),
                child: Icon(
                  _getSearchTypeIcon(),
                  color: AppTheme.primaryBlue,
                  size: 22,
                ),
              ),
              suffixIcon: _searchController.text.isNotEmpty
                  ? IconButton(
                      icon: Icon(
                        Icons.clear_rounded,
                        color: const Color(0xFF64748B),
                        size: 20,
                      ),
                      onPressed: () {
                        _searchController.clear();
                        setState(() {
                          _searchResults = [];
                          _isSearching = false;
                        });
                      },
                    )
                  : null,
            ),
            style: TextStyle(
              color: const Color(0xFF0F172A),
              fontSize: 15,
              fontWeight: FontWeight.w500,
            ),
            onChanged: (value) {
              setState(() {});
              if (value.length >= 2) {
                _performSearch(value);
              } else {
                setState(() {
                  _searchResults = [];
                  _isSearching = false;
                });
              }
            },
          ),
        ),
        leading: IconButton(
          icon: Icon(
            Icons.arrow_back_ios_new_rounded,
            color: const Color(0xFF0F172A),
            size: 22,
          ),
          onPressed: () => Navigator.of(context).pop(),
        ),
        actions: [
          Container(
            margin: const EdgeInsets.only(right: 8),
            decoration: BoxDecoration(
              color: _showFilters
                  ? AppTheme.primaryBlue.withValues(alpha: 0.1)
                  : Colors.transparent,
              borderRadius: BorderRadius.circular(12),
            ),
            child: IconButton(
              icon: Icon(
                _showFilters
                    ? Icons.filter_list_off_rounded
                    : Icons.tune_rounded,
                color: _showFilters
                    ? AppTheme.primaryBlue
                    : const Color(0xFF64748B),
                size: 24,
              ),
              onPressed: () {
                setState(() {
                  _showFilters = !_showFilters;
                });
              },
            ),
          ),
        ],
      ),
      body: Column(
        children: [
          Container(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 12),
            decoration: BoxDecoration(
              color: Colors.white,
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.03),
                  blurRadius: 4,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Loại tìm kiếm',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: const Color(0xFF475569),
                    letterSpacing: 0.3,
                  ),
                ),
                const SizedBox(height: 12),
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: _searchTypeOptions.map((type) {
                      final isSelected = _selectedSearchType == type;
                      return Padding(
                        padding: const EdgeInsets.only(right: 10),
                        child: Material(
                          color: Colors.transparent,
                          child: InkWell(
                            onTap: () {
                              setState(() {
                                _selectedSearchType = type;
                                _searchResults = [];
                                _searchController.clear();
                              });
                            },
                            borderRadius: BorderRadius.circular(20),
                            child: AnimatedContainer(
                              duration: const Duration(milliseconds: 250),
                              curve: Curves.easeInOut,
                              padding: const EdgeInsets.symmetric(
                                horizontal: 18,
                                vertical: 10,
                              ),
                              decoration: BoxDecoration(
                                gradient: isSelected
                                    ? LinearGradient(
                                        colors: [
                                          AppTheme.primaryBlue,
                                          AppTheme.primaryBlue.withValues(
                                            alpha: 0.85,
                                          ),
                                        ],
                                        begin: Alignment.topLeft,
                                        end: Alignment.bottomRight,
                                      )
                                    : null,
                                color: isSelected
                                    ? null
                                    : const Color(0xFFF1F5F9),
                                borderRadius: BorderRadius.circular(20),
                                boxShadow: isSelected
                                    ? [
                                        BoxShadow(
                                          color: AppTheme.primaryBlue
                                              .withValues(alpha: 0.3),
                                          blurRadius: 8,
                                          offset: const Offset(0, 3),
                                        ),
                                      ]
                                    : null,
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(
                                    _getTypeIcon(type),
                                    size: 18,
                                    color: isSelected
                                        ? Colors.white
                                        : _getTypeColor(type),
                                  ),
                                  const SizedBox(width: 7),
                                  Text(
                                    type,
                                    style: TextStyle(
                                      fontSize: 14,
                                      fontWeight: isSelected
                                          ? FontWeight.w600
                                          : FontWeight.w500,
                                      color: isSelected
                                          ? Colors.white
                                          : const Color(0xFF475569),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                ),
              ],
            ),
          ),

          // Advanced filters
          if (_showFilters && _selectedSearchType == 'Sự kiện')
            _buildAdvancedFilters(),

          // Event Filter tabs
          if (_selectedSearchType == 'Sự kiện')
            Container(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
              decoration: BoxDecoration(
                color: Colors.white,
                border: Border(
                  top: BorderSide(color: const Color(0xFFE2E8F0), width: 1),
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Bộ lọc sự kiện',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: const Color(0xFF475569),
                      letterSpacing: 0.3,
                    ),
                  ),
                  const SizedBox(height: 12),
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: _filterOptions.map((filter) {
                        final isSelected = _selectedFilter == filter;
                        return Padding(
                          padding: const EdgeInsets.only(right: 8),
                          child: Material(
                            color: Colors.transparent,
                            child: InkWell(
                              onTap: () {
                                setState(() => _selectedFilter = filter);
                              },
                              borderRadius: BorderRadius.circular(16),
                              child: AnimatedContainer(
                                duration: const Duration(milliseconds: 250),
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 16,
                                  vertical: 9,
                                ),
                                decoration: BoxDecoration(
                                  color: isSelected
                                      ? AppTheme.primaryBlue.withValues(
                                          alpha: 0.1,
                                        )
                                      : const Color(0xFFF8FAFC),
                                  borderRadius: BorderRadius.circular(16),
                                  border: Border.all(
                                    color: isSelected
                                        ? AppTheme.primaryBlue.withValues(
                                            alpha: 0.4,
                                          )
                                        : const Color(0xFFE2E8F0),
                                    width: 1.5,
                                  ),
                                ),
                                child: Text(
                                  filter,
                                  style: TextStyle(
                                    fontSize: 14,
                                    fontWeight: isSelected
                                        ? FontWeight.w600
                                        : FontWeight.w500,
                                    color: isSelected
                                        ? AppTheme.primaryBlue
                                        : const Color(0xFF64748B),
                                  ),
                                ),
                              ),
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                  ),
                ],
              ),
            ),

          // Results
          Expanded(
            child: _isSearching
                ? _buildLoadingState()
                : _searchController.text.isEmpty
                ? _buildSearchHistory()
                : filteredResults.isEmpty
                ? _buildNoResultsState()
                : _buildResultsList(filteredResults),
          ),
        ],
      ),
    );
  }

  Widget _buildAdvancedFilters() {
    return Container(
      padding: const EdgeInsets.all(20),
      margin: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: AppTheme.primaryBlue.withValues(alpha: 0.15),
          width: 1.5,
        ),
        boxShadow: [
          BoxShadow(
            color: AppTheme.primaryBlue.withValues(alpha: 0.05),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AppTheme.primaryBlue.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(
                  Icons.filter_alt_rounded,
                  color: AppTheme.primaryBlue,
                  size: 20,
                ),
              ),
              const SizedBox(width: 12),
              Text(
                'Bộ lọc nâng cao',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: const Color(0xFF0F172A),
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),

          // Date range
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: const Color(0xFFF8FAFC),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFE2E8F0), width: 1),
            ),
            child: Row(
              children: [
                Icon(
                  Icons.date_range_rounded,
                  color: AppTheme.primaryBlue,
                  size: 22,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    _selectedDateRange != null
                        ? '${_selectedDateRange!.start.day}/${_selectedDateRange!.start.month} - ${_selectedDateRange!.end.day}/${_selectedDateRange!.end.month}'
                        : 'Chọn khoảng thời gian',
                    style: TextStyle(
                      color: _selectedDateRange != null
                          ? const Color(0xFF0F172A)
                          : const Color(0xFF94A3B8),
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
                if (_selectedDateRange != null)
                  IconButton(
                    icon: Icon(
                      Icons.close_rounded,
                      color: const Color(0xFF64748B),
                      size: 18,
                    ),
                    onPressed: () {
                      setState(() {
                        _selectedDateRange = null;
                      });
                    },
                  )
                else
                  IconButton(
                    icon: Icon(
                      Icons.chevron_right_rounded,
                      color: const Color(0xFF94A3B8),
                      size: 22,
                    ),
                    onPressed: _selectDateRange,
                  ),
              ],
            ),
          ),

          const SizedBox(height: 16),

          // Status filter
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
            decoration: BoxDecoration(
              color: const Color(0xFFF8FAFC),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFE2E8F0), width: 1),
            ),
            child: DropdownButtonFormField<String>(
              value: _selectedStatus,
              decoration: InputDecoration(
                labelText: 'Trạng thái',
                labelStyle: TextStyle(
                  color: const Color(0xFF64748B),
                  fontSize: 13,
                  fontWeight: FontWeight.w500,
                ),
                border: InputBorder.none,
                contentPadding: const EdgeInsets.symmetric(vertical: 8),
                prefixIcon: Icon(
                  Icons.playlist_add_check_rounded,
                  color: AppTheme.primaryBlue,
                  size: 22,
                ),
              ),
              dropdownColor: Colors.white,
              icon: Icon(
                Icons.keyboard_arrow_down_rounded,
                color: const Color(0xFF94A3B8),
              ),
              items: ['Tất cả', 'confirmed', 'pending', 'rejected']
                  .map(
                    (status) => DropdownMenuItem(
                      value: status,
                      child: Text(
                        status == 'Tất cả' ? status : status.toUpperCase(),
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                          color: const Color(0xFF0F172A),
                        ),
                      ),
                    ),
                  )
                  .toList(),
              onChanged: (value) {
                setState(() {
                  _selectedStatus = value ?? 'Tất cả';
                });
              },
            ),
          ),

          const SizedBox(height: 16),

          // Confidence slider
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: const Color(0xFFF8FAFC),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFE2E8F0), width: 1),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(
                      Icons.show_chart_rounded,
                      color: AppTheme.primaryBlue,
                      size: 20,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      'Độ tin cậy tối thiểu',
                      style: TextStyle(
                        color: const Color(0xFF64748B),
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const Spacer(),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: [
                            AppTheme.primaryBlue,
                            AppTheme.primaryBlue.withValues(alpha: 0.8),
                          ],
                        ),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        '${(_minConfidence * 100).round()}%',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ],
                ),
                SliderTheme(
                  data: SliderThemeData(
                    activeTrackColor: AppTheme.primaryBlue,
                    inactiveTrackColor: const Color(0xFFE2E8F0),
                    thumbColor: Colors.white,
                    overlayColor: AppTheme.primaryBlue.withValues(alpha: 0.2),
                    thumbShape: const RoundSliderThumbShape(
                      enabledThumbRadius: 10,
                      elevation: 3,
                    ),
                    trackHeight: 4,
                  ),
                  child: Slider(
                    value: _minConfidence,
                    min: 0.0,
                    max: 1.0,
                    divisions: 10,
                    onChanged: (value) {
                      setState(() {
                        _minConfidence = value;
                      });
                    },
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSearchHistory() {
    if (_searchHistory.isEmpty) {
      return _buildEmptyState();
    }

    return Container(
      color: const Color(0xFFF8FAFC),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 20, 20, 12),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: AppTheme.primaryBlue.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Icon(
                        Icons.history_rounded,
                        color: AppTheme.primaryBlue,
                        size: 20,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Text(
                      'Lịch sử tìm kiếm',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                        color: const Color(0xFF0F172A),
                      ),
                    ),
                  ],
                ),
                TextButton.icon(
                  onPressed: _clearSearchHistory,
                  icon: Icon(
                    Icons.delete_outline_rounded,
                    size: 18,
                    color: AppTheme.dangerColor,
                  ),
                  label: Text(
                    'Xóa',
                    style: TextStyle(
                      color: AppTheme.dangerColor,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: _searchHistory.length,
              itemBuilder: (context, index) {
                final query = _searchHistory[index];
                return Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(12),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.03),
                        blurRadius: 4,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: ListTile(
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 4,
                    ),
                    leading: Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF1F5F9),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Icon(
                        Icons.access_time_rounded,
                        color: const Color(0xFF64748B),
                        size: 20,
                      ),
                    ),
                    title: Text(
                      query,
                      style: TextStyle(
                        color: const Color(0xFF0F172A),
                        fontSize: 15,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    trailing: Icon(
                      Icons.north_west_rounded,
                      size: 18,
                      color: const Color(0xFF94A3B8),
                    ),
                    onTap: () {
                      _searchController.text = query;
                      _performSearch(query);
                    },
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  AppTheme.primaryBlue.withValues(alpha: 0.1),
                  AppTheme.primaryBlue.withValues(alpha: 0.05),
                ],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              shape: BoxShape.circle,
            ),
            child: Icon(
              Icons.search_rounded,
              size: 64,
              color: AppTheme.primaryBlue.withValues(alpha: 0.6),
            ),
          ),
          const SizedBox(height: 24),
          Text(
            'Tìm kiếm ${_selectedSearchType.toLowerCase()}',
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w700,
              color: const Color(0xFF0F172A),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Nhập từ khóa để bắt đầu tìm kiếm',
            style: TextStyle(
              fontSize: 15,
              color: const Color(0xFF64748B),
              fontWeight: FontWeight.w400,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Widget _buildNoResultsState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  const Color(0xFF94A3B8).withValues(alpha: 0.1),
                  const Color(0xFF94A3B8).withValues(alpha: 0.05),
                ],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              shape: BoxShape.circle,
            ),
            child: Icon(
              Icons.search_off_rounded,
              size: 64,
              color: const Color(0xFF94A3B8),
            ),
          ),
          const SizedBox(height: 24),
          Text(
            'Không tìm thấy kết quả',
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w700,
              color: const Color(0xFF0F172A),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Thử tìm kiếm với từ khóa khác',
            style: TextStyle(fontSize: 15, color: const Color(0xFF64748B)),
          ),
        ],
      ),
    );
  }

  Widget _buildResultsList(List<LogEntry> results) {
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: results.length,
      itemBuilder: (context, index) {
        final result = results[index];
        return Container(
          margin: const EdgeInsets.only(bottom: 12),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.04),
                blurRadius: 8,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Material(
            color: Colors.transparent,
            child: InkWell(
              borderRadius: BorderRadius.circular(16),
              onTap: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text(
                      'Đã chọn: ${result.eventDescription ?? result.eventId}',
                    ),
                    behavior: SnackBarBehavior.floating,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                );
              },
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    Container(
                      width: 52,
                      height: 52,
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: [
                            _getEventColor(
                              result.eventType,
                            ).withValues(alpha: 0.15),
                            _getEventColor(
                              result.eventType,
                            ).withValues(alpha: 0.08),
                          ],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: Icon(
                        _getEventIcon(result.eventType),
                        color: _getEventColor(result.eventType),
                        size: 26,
                      ),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            result.eventDescription ??
                                'Sự kiện ${result.eventType}',
                            style: TextStyle(
                              fontWeight: FontWeight.w600,
                              color: const Color(0xFF0F172A),
                              fontSize: 15,
                            ),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 6),
                          Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 8,
                                  vertical: 3,
                                ),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFF1F5F9),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Text(
                                  result.eventId,
                                  style: TextStyle(
                                    color: const Color(0xFF64748B),
                                    fontSize: 12,
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 8),
                              Icon(
                                Icons.access_time_rounded,
                                size: 14,
                                color: const Color(0xFF94A3B8),
                              ),
                              const SizedBox(width: 4),
                              Text(
                                _formatTime(
                                  result.createdAt ??
                                      result.detectedAt ??
                                      DateTime.now(),
                                ),
                                style: TextStyle(
                                  fontSize: 12,
                                  color: const Color(0xFF64748B),
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ],
                          ),
                          if (result.confidenceScore > 0) ...[
                            const SizedBox(height: 6),
                            Row(
                              children: [
                                Container(
                                  width: 80,
                                  height: 6,
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFF1F5F9),
                                    borderRadius: BorderRadius.circular(3),
                                  ),
                                  child: FractionallySizedBox(
                                    alignment: Alignment.centerLeft,
                                    widthFactor: result.confidenceScore,
                                    child: Container(
                                      decoration: BoxDecoration(
                                        gradient: LinearGradient(
                                          colors: [
                                            AppTheme.primaryBlue,
                                            AppTheme.primaryBlue.withValues(
                                              alpha: 0.7,
                                            ),
                                          ],
                                        ),
                                        borderRadius: BorderRadius.circular(3),
                                      ),
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Text(
                                  '${(result.confidenceScore * 100).round()}%',
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: AppTheme.primaryBlue,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    _buildQuickActions(result),
                  ],
                ),
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildQuickActions(LogEntry result) {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(10),
      ),
      child: PopupMenuButton<String>(
        color: const Color(0xFFF8FAFC),
        onSelected: (action) => _handleQuickAction(action, result),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        elevation: 6,
        itemBuilder: (context) {
          // CAREGIVER
          if (result.eventType == 'caregiver') {
            return [
              PopupMenuItem(
                value: 'view_profile',
                child: Row(
                  children: [
                    Icon(
                      Icons.person_outline,
                      color: AppTheme.primaryBlue,
                      size: 20,
                    ),
                    const SizedBox(width: 12),
                    const Text(
                      'Xem hồ sơ',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),
              PopupMenuItem(
                value: 'view_settings',
                child: Row(
                  children: [
                    Icon(
                      Icons.settings_outlined,
                      color: AppTheme.primaryBlue,
                      size: 20,
                    ),
                    const SizedBox(width: 12),
                    const Text(
                      'Xem thiết lập',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),
              PopupMenuItem(
                value: 'share',
                child: Row(
                  children: [
                    Icon(Icons.share_rounded, color: Colors.green, size: 20),
                    const SizedBox(width: 12),
                    const Text(
                      'Chia sẻ',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),
            ];
          }

          // EVENT
          if (result.eventType == 'event' ||
              result.eventType == 'warning' ||
              result.eventType == 'activity') {
            return [
              PopupMenuItem(
                value: 'view_event_detail',
                child: Row(
                  children: [
                    Icon(
                      Icons.visibility_outlined,
                      color: AppTheme.primaryBlue,
                      size: 20,
                    ),
                    const SizedBox(width: 12),
                    const Text(
                      'Xem chi tiết',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),
              PopupMenuItem(
                value: 'send_notification',
                child: Row(
                  children: [
                    Icon(Icons.send_rounded, color: Colors.green, size: 20),
                    const SizedBox(width: 12),
                    const Text(
                      'Chia sẻ',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),
            ];
          }

          // INVOICE
          if (result.eventType == 'invoice') {
            return [
              PopupMenuItem(
                value: 'view_invoice_detail',
                child: Row(
                  children: [
                    Icon(
                      Icons.receipt_long_outlined,
                      color: AppTheme.primaryBlue,
                      size: 20,
                    ),
                    const SizedBox(width: 12),
                    const Text(
                      'Xem chi tiết',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),
              PopupMenuItem(
                value: 'share_invoice',
                child: Row(
                  children: [
                    Icon(Icons.share_rounded, color: Colors.green, size: 20),
                    const SizedBox(width: 12),
                    const Text(
                      'Chia sẻ',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),
            ];
          }

          return [
            PopupMenuItem(
              value: 'view_details',
              child: Row(
                children: [
                  Icon(
                    Icons.info_outline,
                    color: AppTheme.primaryBlue,
                    size: 20,
                  ),
                  const SizedBox(width: 12),
                  const Text(
                    'Xem chi tiết',
                    style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500),
                  ),
                ],
              ),
            ),
          ];
        },
        child: Padding(
          padding: const EdgeInsets.all(8),
          child: Icon(
            Icons.more_vert_rounded,
            color: const Color(0xFF64748B),
            size: 20,
          ),
        ),
      ),
    );
  }

  void _handleQuickAction(String action, LogEntry result) {
    switch (action) {
      case 'view_profile':
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'Xem hồ sơ: ${result.eventDescription ?? result.eventId}',
            ),
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
          ),
        );
        break;
      case 'view_settings':
        WidgetsBinding.instance.addPostFrameCallback((_) {
          try {
            Navigator.of(context).push(
              MaterialPageRoute(
                builder: (_) => CaregiverSettingsScreen(
                  caregiverId: result.eventId,
                  caregiverDisplay: result.eventDescription ?? 'Người chăm sóc',
                  customerId: '', // để rỗng -> tự resolve
                ),
              ),
            );
          } catch (e) {
            debugPrint('Navigation error (caregiver settings): $e');
          }
        });
        break;
      case 'share':
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'Chia sẻ: ${result.eventDescription ?? result.eventId}',
            ),
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
          ),
        );
        break;

      case 'view_event_detail':
        WidgetsBinding.instance.addPostFrameCallback((_) {
          try {
            Navigator.of(context).push(
              MaterialPageRoute(
                builder: (_) => EventDetailScreen(eventId: result.eventId),
              ),
            );
          } catch (e) {
            debugPrint('Navigation error (event detail): $e');
          }
        });
        break;
      case 'send_notification':
        WidgetsBinding.instance.addPostFrameCallback((_) {
          try {
            Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => const SendNotificationScreen()),
            );
          } catch (e) {
            debugPrint('Navigation error (send notification): $e');
          }
        });
        break;

      case 'view_invoice_detail':
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'Xem chi tiết hóa đơn: ${result.eventDescription ?? result.eventId}',
            ),
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
          ),
        );
        break;
      case 'share_invoice':
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'Chia sẻ hóa đơn: ${result.eventDescription ?? result.eventId}',
            ),
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
          ),
        );
        break;

      default:
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Hành động không xác định')),
        );
    }
  }

  IconData _getEventIcon(String eventType) {
    switch (eventType) {
      case 'warning':
        return Icons.warning_rounded;
      case 'activity':
        return Icons.directions_run_rounded;
      case 'report':
        return Icons.description_rounded;
      case 'caregiver':
        return Icons.person_rounded;
      case 'invoice':
        return Icons.receipt_long_rounded;
      default:
        return Icons.info_rounded;
    }
  }

  Color _getEventColor(String eventType) {
    switch (eventType) {
      case 'warning':
        return AppTheme.dangerColor;
      case 'activity':
        return AppTheme.accentGreen;
      case 'report':
        return AppTheme.primaryBlue;
      case 'caregiver':
        return const Color(0xFF8B5CF6);
      case 'invoice':
        return const Color(0xFFF59E0B);
      default:
        return AppTheme.primaryBlue;
    }
  }

  Widget _buildLoadingState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 80,
            height: 80,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  AppTheme.primaryBlue.withValues(alpha: 0.15),
                  AppTheme.primaryBlue.withValues(alpha: 0.05),
                ],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              shape: BoxShape.circle,
            ),
            child: Center(
              child: SizedBox(
                width: 40,
                height: 40,
                child: CircularProgressIndicator(
                  strokeWidth: 3.5,
                  valueColor: AlwaysStoppedAnimation<Color>(
                    AppTheme.primaryBlue,
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(height: 24),
          Text(
            'Đang tìm kiếm...',
            style: TextStyle(
              fontSize: 16,
              color: const Color(0xFF64748B),
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Vui lòng đợi một chút',
            style: TextStyle(
              fontSize: 14,
              color: const Color(0xFF94A3B8),
              fontWeight: FontWeight.w400,
            ),
          ),
        ],
      ),
    );
  }

  String _formatTime(DateTime time) {
    final now = DateTime.now();
    final difference = now.difference(time);

    if (difference.inMinutes < 1) {
      return 'Vừa xong';
    } else if (difference.inMinutes < 60) {
      return '${difference.inMinutes} phút trước';
    } else if (difference.inHours < 24) {
      return '${difference.inHours} giờ trước';
    } else {
      return '${difference.inDays} ngày trước';
    }
  }

  String _getSmartHintText() {
    switch (_selectedSearchType) {
      case 'Sự kiện':
        return 'Tìm kiếm sự kiện, cảnh báo, hoạt động...';
      case 'Người chăm sóc':
        return 'Tìm kiếm theo tên, mã nhân viên...';
      case 'Hóa đơn':
        return 'Tìm kiếm theo mã hóa đơn, tên bệnh nhân...';
      default:
        return 'Nhập từ khóa tìm kiếm...';
    }
  }

  IconData _getSearchTypeIcon() {
    switch (_selectedSearchType) {
      case 'Sự kiện':
        return Icons.search_rounded;
      case 'Người chăm sóc':
        return Icons.person_search_rounded;
      case 'Hóa đơn':
        return Icons.receipt_long_rounded;
      default:
        return Icons.search_rounded;
    }
  }

  IconData _getTypeIcon(String type) {
    switch (type) {
      case 'Sự kiện':
        return Icons.event_note_rounded;
      case 'Người chăm sóc':
        return Icons.people_rounded;
      case 'Hóa đơn':
        return Icons.receipt_rounded;
      default:
        return Icons.circle;
    }
  }

  Color _getTypeColor(String type) {
    switch (type) {
      case 'Sự kiện':
        return AppTheme.primaryBlue;
      case 'Người chăm sóc':
        return const Color(0xFF8B5CF6);
      case 'Hóa đơn':
        return const Color(0xFFF59E0B);
      default:
        return AppTheme.primaryBlue;
    }
  }
}
