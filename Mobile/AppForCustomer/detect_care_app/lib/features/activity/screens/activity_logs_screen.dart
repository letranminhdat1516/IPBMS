import 'package:detect_care_app/features/activity/models/activity_models.dart';
import 'package:detect_care_app/features/activity/providers/activity_provider.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';

class ActivityLogsScreen extends StatefulWidget {
  final bool embedInParent;

  const ActivityLogsScreen({super.key, this.embedInParent = false});

  @override
  State<ActivityLogsScreen> createState() => _ActivityLogsScreenState();
}

class _ActivityLogsScreenState extends State<ActivityLogsScreen> {
  final DateFormat _dateFormat = DateFormat('dd/MM/yyyy HH:mm');
  final ScrollController _scrollController = ScrollController();

  // Filter state
  String _selectedAction = '';
  String _selectedResourceName = '';
  String _selectedActorId = '';
  ActivitySeverity? _selectedSeverity;
  DateTimeRange? _selectedDateRange;
  int _currentPage = 1;
  final int _pageSize = 20;

  // UI state
  bool _showFilters = false;
  bool _isLoadingMore = false;

  final List<String> _actionOptions = [
    '',
    'user_login',
    'user_logout',
    'user_settings_update',
    'caregiver_assignment_create',
    'caregiver_assignment_accept',
    'caregiver_assignment_reject',
    'shared_permissions_create',
    'shared_permissions_delete',
    'system_settings_update',
    'fall_detection_alert',
    'event_confirm',
  ];

  final List<String> _resourceNameOptions = [
    '',
    'auth',
    'user_settings',
    'assignments',
    'shared_permissions',
    'system_settings',
    'fall_detection',
    'events',
    'users',
    'caregivers',
    'cameras',
    'invoices',
  ];

  @override
  void initState() {
    super.initState();
    // Defer initial load to after first frame to avoid notifyListeners() during build
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _loadActivityLogs();
    });
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_scrollController.position.pixels ==
        _scrollController.position.maxScrollExtent) {
      _loadMoreActivityLogs();
    }
  }

  Future<void> _loadActivityLogs() async {
    setState(() {
      _currentPage = 1;
    });

    final provider = context.read<ActivityProvider>();
    await provider.loadActivityLogs(
      page: _currentPage,
      limit: _pageSize,
      actorId: _selectedActorId.isNotEmpty ? _selectedActorId : null,
      action: _selectedAction.isNotEmpty ? _selectedAction : null,
      resourceName: _selectedResourceName.isNotEmpty
          ? _selectedResourceName
          : null,
      severity: _selectedSeverity,
      startDate: _selectedDateRange?.start,
      endDate: _selectedDateRange?.end,
    );
  }

  Future<void> _loadMoreActivityLogs() async {
    if (_isLoadingMore) return;

    setState(() {
      _isLoadingMore = true;
    });

    final provider = context.read<ActivityProvider>();
    await provider.loadActivityLogs(
      page: _currentPage + 1,
      limit: _pageSize,
      actorId: _selectedActorId.isNotEmpty ? _selectedActorId : null,
      action: _selectedAction.isNotEmpty ? _selectedAction : null,
      resourceName: _selectedResourceName.isNotEmpty
          ? _selectedResourceName
          : null,
      severity: _selectedSeverity,
      startDate: _selectedDateRange?.start,
      endDate: _selectedDateRange?.end,
      append: true,
    );

    setState(() {
      _currentPage++;
      _isLoadingMore = false;
    });
  }

  Future<void> _refreshActivityLogs() async {
    await _loadActivityLogs();
  }

  Future<void> _exportActivityLogs() async {
    final provider = context.read<ActivityProvider>();
    final exportData = await provider.exportActivityLogs(
      actorId: _selectedActorId.isNotEmpty ? _selectedActorId : null,
      action: _selectedAction.isNotEmpty ? _selectedAction : null,
      resourceName: _selectedResourceName.isNotEmpty
          ? _selectedResourceName
          : null,
      severity: _selectedSeverity,
      startDate: _selectedDateRange?.start,
      endDate: _selectedDateRange?.end,
    );

    if (exportData != null && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Xuất nhật ký hoạt động thành công')),
      );
      // Here you could save the exportData to a file or share it
    } else if (mounted) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Xuất nhật ký thất bại')));
    }
  }

  @override
  Widget build(BuildContext context) {
    // If embedded inside a parent (e.g., HomeScreen), do not render a
    // Scaffold/AppBar — parent provides AppBar. Instead render only the body
    // content and place the action buttons at the top of the body.
    final bodyContent = Column(
      children: [
        // Actions row (export, filter, refresh) when embedded show under
        // parent's AppBar; when not embedded these appear in the AppBar.
        if (widget.embedInParent)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                IconButton(
                  onPressed: _exportActivityLogs,
                  icon: const Icon(Icons.download),
                  tooltip: 'Xuất',
                ),
                IconButton(
                  onPressed: () {
                    setState(() {
                      _showFilters = !_showFilters;
                    });
                  },
                  icon: Icon(
                    _showFilters ? Icons.filter_list_off : Icons.filter_list,
                    color: _showFilters ? Theme.of(context).primaryColor : null,
                  ),
                ),
                IconButton(
                  onPressed: _refreshActivityLogs,
                  icon: const Icon(Icons.refresh),
                ),
              ],
            ),
          ),
        if (_showFilters) _buildFilters(),
        Expanded(
          child: Consumer<ActivityProvider>(
            builder: (context, provider, child) {
              if (provider.isLoading && provider.activityLogs.isEmpty) {
                return const Center(child: CircularProgressIndicator());
              }

              if (provider.error != null && provider.activityLogs.isEmpty) {
                return Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(
                        Icons.error_outline,
                        size: 48,
                        color: Colors.red,
                      ),
                      const SizedBox(height: 16),
                      Text(
                        'Lỗi: ${provider.error}',
                        textAlign: TextAlign.center,
                        style: const TextStyle(color: Colors.red),
                      ),
                      const SizedBox(height: 16),
                      ElevatedButton(
                        onPressed: _refreshActivityLogs,
                        child: const Text('Thử lại'),
                      ),
                    ],
                  ),
                );
              }

              if (provider.activityLogs.isEmpty) {
                return const Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.history, size: 48, color: Colors.grey),
                      SizedBox(height: 16),
                      Text(
                        'Không tìm thấy bản ghi hoạt động',
                        style: TextStyle(color: Colors.grey),
                      ),
                    ],
                  ),
                );
              }

              return RefreshIndicator(
                onRefresh: _refreshActivityLogs,
                child: ListView.builder(
                  controller: _scrollController,
                  padding: const EdgeInsets.all(16),
                  itemCount:
                      provider.activityLogs.length + (_isLoadingMore ? 1 : 0),
                  itemBuilder: (context, index) {
                    if (index == provider.activityLogs.length) {
                      return const Center(
                        child: Padding(
                          padding: EdgeInsets.all(16),
                          child: CircularProgressIndicator(),
                        ),
                      );
                    }

                    final log = provider.activityLogs[index];
                    return _buildActivityLogCard(log);
                  },
                ),
              );
            },
          ),
        ),
      ],
    );

    if (widget.embedInParent) {
      return bodyContent;
    }

    // Default full-screen behavior with AppBar
    return Scaffold(
      appBar: AppBar(
        title: const Text('Hoạt động'),
        actions: [
          IconButton(
            onPressed: _exportActivityLogs,
            icon: const Icon(Icons.download),
            tooltip: 'Xuất',
          ),
          IconButton(
            onPressed: () {
              setState(() {
                _showFilters = !_showFilters;
              });
            },
            icon: Icon(
              _showFilters ? Icons.filter_list_off : Icons.filter_list,
              color: _showFilters ? Theme.of(context).primaryColor : null,
            ),
          ),
          IconButton(
            onPressed: _refreshActivityLogs,
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: bodyContent,
    );
  }

  Widget _buildFilters() {
    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 25),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Bộ lọc',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 16),

          // Action Filter
          const Text(
            'Hành động:',
            style: TextStyle(fontWeight: FontWeight.w500),
          ),
          const SizedBox(height: 8),
          DropdownButtonFormField<String>(
            value: _selectedAction,
            decoration: const InputDecoration(
              border: OutlineInputBorder(),
              contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            ),
            items: _actionOptions.map((action) {
              return DropdownMenuItem(
                value: action,
                child: Text(
                  action.isEmpty
                      ? 'Tất cả hành động'
                      : _getActionDisplayName(action),
                ),
              );
            }).toList(),
            onChanged: (value) {
              setState(() {
                _selectedAction = value ?? '';
              });
            },
          ),

          const SizedBox(height: 16),

          // Resource Name Filter
          const Text(
            'Tài nguyên:',
            style: TextStyle(fontWeight: FontWeight.w500),
          ),
          const SizedBox(height: 8),
          DropdownButtonFormField<String>(
            value: _selectedResourceName,
            decoration: const InputDecoration(
              border: OutlineInputBorder(),
              contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            ),
            items: _resourceNameOptions.map((resource) {
              return DropdownMenuItem(
                value: resource,
                child: Text(
                  resource.isEmpty
                      ? 'Tất cả tài nguyên'
                      : _getResourceNameDisplayName(resource),
                ),
              );
            }).toList(),
            onChanged: (value) {
              setState(() {
                _selectedResourceName = value ?? '';
              });
            },
          ),

          const SizedBox(height: 16),

          // Severity Filter
          const Text('Mức độ:', style: TextStyle(fontWeight: FontWeight.w500)),
          const SizedBox(height: 8),
          DropdownButtonFormField<ActivitySeverity?>(
            value: _selectedSeverity,
            decoration: const InputDecoration(
              border: OutlineInputBorder(),
              contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            ),
            items: [
              const DropdownMenuItem(value: null, child: Text('Tất cả mức độ')),
              ...ActivitySeverity.values.map((severity) {
                return DropdownMenuItem(
                  value: severity,
                  child: Text(_getSeverityDisplayName(severity)),
                );
              }),
            ],
            onChanged: (value) {
              setState(() {
                _selectedSeverity = value;
              });
            },
          ),

          const SizedBox(height: 16),

          // Actor ID Filter
          const Text(
            'ID tác nhân:',
            style: TextStyle(fontWeight: FontWeight.w500),
          ),
          const SizedBox(height: 8),
          TextFormField(
            initialValue: _selectedActorId,
            decoration: const InputDecoration(
              border: OutlineInputBorder(),
              hintText: 'Nhập ID tác nhân (tùy chọn)',
              contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            ),
            onChanged: (value) {
              _selectedActorId = value;
            },
          ),

          const SizedBox(height: 16),

          // Date Range
          const Text(
            'Khoảng ngày:',
            style: TextStyle(fontWeight: FontWeight.w500),
          ),
          const SizedBox(height: 8),
          InkWell(
            onTap: () async {
              final range = await showDateRangePicker(
                context: context,
                firstDate: DateTime.now().subtract(const Duration(days: 365)),
                lastDate: DateTime.now().add(const Duration(days: 30)),
                initialDateRange: _selectedDateRange,
                locale: const Locale('vi', 'VN'),
                builder: (context, child) {
                  return Theme(
                    data: Theme.of(
                      context,
                    ).copyWith(dialogBackgroundColor: const Color(0xFFF8FAFC)),
                    child: child!,
                  );
                },
              );
              if (range != null) {
                setState(() {
                  _selectedDateRange = range;
                });
              }
            },
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
              decoration: BoxDecoration(
                border: Border.all(color: Colors.grey),
                borderRadius: BorderRadius.circular(4),
              ),
              child: Row(
                children: [
                  const Icon(Icons.date_range),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      _selectedDateRange != null
                          ? '${_dateFormat.format(_selectedDateRange!.start)} - ${_dateFormat.format(_selectedDateRange!.end)}'
                          : 'Chọn khoảng ngày',
                      style: TextStyle(
                        color: _selectedDateRange != null
                            ? Colors.black
                            : Colors.grey,
                      ),
                    ),
                  ),
                  if (_selectedDateRange != null)
                    IconButton(
                      icon: const Icon(Icons.clear, size: 18),
                      onPressed: () {
                        setState(() {
                          _selectedDateRange = null;
                        });
                      },
                    ),
                ],
              ),
            ),
          ),

          const SizedBox(height: 16),

          // Apply Filters Button
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _loadActivityLogs,
              child: const Text('Áp dụng bộ lọc'),
            ),
          ),

          // Clear Filters Button
          const SizedBox(height: 8),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton(
              onPressed: () {
                setState(() {
                  _selectedAction = '';
                  _selectedResourceName = '';
                  _selectedActorId = '';
                  _selectedSeverity = null;
                  _selectedDateRange = null;
                });
                _loadActivityLogs();
              },
              child: const Text('Xóa bộ lọc'),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActivityLogCard(ActivityLog log) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: _getSeverityColor(
                      log.severity,
                    ).withValues(alpha: 0.1 * 255),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: _getSeverityColor(log.severity)),
                  ),
                  child: Text(
                    _getSeverityDisplayName(log.severity),
                    style: TextStyle(
                      color: _getSeverityColor(log.severity),
                      fontWeight: FontWeight.bold,
                      fontSize: 12,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    _getActionDisplayName(log.action),
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                    ),
                  ),
                ),
                Text(
                  _dateFormat.format(log.createdAt),
                  style: const TextStyle(color: Colors.grey, fontSize: 12),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              'Tác nhân: ${log.actorId}',
              style: const TextStyle(fontWeight: FontWeight.w500),
            ),
            const SizedBox(height: 4),
            Text(
              'Tài nguyên: ${_getResourceNameDisplayName(log.resourceName)}',
              style: const TextStyle(color: Colors.grey, fontSize: 14),
            ),
            if (log.meta != null && log.meta!.isNotEmpty) ...[
              const SizedBox(height: 8),
              _buildMetaData(log.meta!),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildMetaData(Map<String, dynamic> meta) {
    final entries = meta.entries.where((entry) {
      // Skip sensitive data that might be in meta
      return !['password', 'token', 'body'].contains(entry.key.toLowerCase());
    }).toList();

    if (entries.isEmpty) return const SizedBox.shrink();

    return Container(
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: Colors.grey.withValues(alpha: 25),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: entries.map((entry) {
          return Padding(
            padding: const EdgeInsets.only(bottom: 4),
            child: Text(
              '${entry.key}: ${entry.value.toString()}',
              style: const TextStyle(fontSize: 12, color: Colors.grey),
            ),
          );
        }).toList(),
      ),
    );
  }

  // Helper functions are implemented earlier in the file (kept there).
  String _getActionDisplayName(String action) {
    switch (action) {
      case 'user_login':
        return 'Đăng nhập';
      case 'user_logout':
        return 'Đăng xuất';
      case 'user_settings_update':
        return 'Cập nhật cài đặt';
      case 'caregiver_assignment_create':
        return 'Tạo phân công';
      case 'caregiver_assignment_accept':
        return 'Chấp nhận phân công';
      case 'caregiver_assignment_reject':
        return 'Từ chối phân công';
      case 'shared_permissions_create':
        return 'Chia sẻ quyền';
      case 'shared_permissions_delete':
        return 'Thu hồi quyền';
      case 'system_settings_update':
        return 'Cập nhật hệ thống';
      case 'fall_detection_alert':
        return 'Cảnh báo ngã';
      case 'event_confirm':
        return 'Xác nhận sự kiện';
      default:
        return action.replaceAll('_', ' ').toUpperCase();
    }
  }

  String _getResourceNameDisplayName(String resourceName) {
    switch (resourceName) {
      case 'user_settings':
        return 'Cài đặt người dùng';
      case 'shared_permissions':
        return 'Quyền chia sẻ';
      case 'system_settings':
        return 'Cài đặt hệ thống';
      case 'fall_detection':
        return 'Phát hiện ngã';
      default:
        return resourceName.replaceAll('_', ' ').toUpperCase();
    }
  }

  String _getSeverityDisplayName(ActivitySeverity severity) {
    switch (severity) {
      case ActivitySeverity.info:
        return 'Thông tin';
      case ActivitySeverity.warning:
        return 'Cảnh báo';
      case ActivitySeverity.critical:
        return 'Nghiêm trọng';
    }
  }

  Color _getSeverityColor(ActivitySeverity severity) {
    switch (severity) {
      case ActivitySeverity.info:
        return Colors.blue;
      case ActivitySeverity.warning:
        return Colors.orange;
      case ActivitySeverity.critical:
        return Colors.red;
    }
  }
}
