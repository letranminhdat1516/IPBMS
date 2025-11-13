import 'package:detect_care_app/features/audit/models/audit_models.dart';
import 'package:detect_care_app/features/audit/providers/audit_provider.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';

class AuditLogsScreen extends StatefulWidget {
  const AuditLogsScreen({super.key});

  @override
  State<AuditLogsScreen> createState() => _AuditLogsScreenState();
}

class _AuditLogsScreenState extends State<AuditLogsScreen> {
  final DateFormat _dateFormat = DateFormat('dd/MM/yyyy HH:mm');
  final ScrollController _scrollController = ScrollController();

  // Filter state
  String _selectedAction = '';
  String _selectedResourceType = '';
  String _selectedUserId = '';
  DateTimeRange? _selectedDateRange;
  int _currentPage = 1;
  final int _pageSize = 20;

  // UI state
  bool _showFilters = false;
  bool _isLoadingMore = false;

  final List<String> _actionOptions = [
    '',
    'CREATE',
    'UPDATE',
    'DELETE',
    'LOGIN',
    'LOGOUT',
    'VIEW',
    'EXPORT',
    'IMPORT',
  ];

  final List<String> _resourceTypeOptions = [
    '',
    'USER',
    'EVENT',
    'CAREGIVER',
    'INVOICE',
    'CAMERA',
    'SETTINGS',
    'REPORT',
  ];

  @override
  void initState() {
    super.initState();
    _loadAuditEvents();
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
      _loadMoreAuditEvents();
    }
  }

  Future<void> _loadAuditEvents() async {
    setState(() {
      _currentPage = 1;
    });

    final provider = context.read<AuditProvider>();
    await provider.loadAllAuditEvents(
      page: _currentPage,
      limit: _pageSize,
      action: _selectedAction.isNotEmpty ? _selectedAction : null,
      resourceType: _selectedResourceType.isNotEmpty
          ? _selectedResourceType
          : null,
      userId: _selectedUserId.isNotEmpty ? _selectedUserId : null,
      startDate: _selectedDateRange?.start,
      endDate: _selectedDateRange?.end,
    );
  }

  Future<void> _loadMoreAuditEvents() async {
    if (_isLoadingMore) return;

    setState(() {
      _isLoadingMore = true;
    });

    final provider = context.read<AuditProvider>();
    await provider.loadAllAuditEvents(
      page: _currentPage + 1,
      limit: _pageSize,
      action: _selectedAction.isNotEmpty ? _selectedAction : null,
      resourceType: _selectedResourceType.isNotEmpty
          ? _selectedResourceType
          : null,
      userId: _selectedUserId.isNotEmpty ? _selectedUserId : null,
      startDate: _selectedDateRange?.start,
      endDate: _selectedDateRange?.end,
      append: true,
    );

    setState(() {
      _currentPage++;
      _isLoadingMore = false;
    });
  }

  Future<void> _refreshAuditEvents() async {
    await _loadAuditEvents();
  }

  String _getActionDisplayName(String action) {
    switch (action) {
      case 'CREATE':
        return 'Create';
      case 'UPDATE':
        return 'Update';
      case 'DELETE':
        return 'Delete';
      case 'LOGIN':
        return 'Login';
      case 'LOGOUT':
        return 'Logout';
      case 'VIEW':
        return 'View';
      case 'EXPORT':
        return 'Export';
      case 'IMPORT':
        return 'Import';
      default:
        return action;
    }
  }

  String _getResourceTypeDisplayName(String resourceType) {
    switch (resourceType) {
      case 'USER':
        return 'User';
      case 'EVENT':
        return 'Event';
      case 'CAREGIVER':
        return 'Caregiver';
      case 'INVOICE':
        return 'Invoice';
      case 'CAMERA':
        return 'Camera';
      case 'SETTINGS':
        return 'Settings';
      case 'REPORT':
        return 'Report';
      default:
        return resourceType;
    }
  }

  Color _getActionColor(String action) {
    switch (action) {
      case 'CREATE':
        return Colors.green;
      case 'UPDATE':
        return Colors.blue;
      case 'DELETE':
        return Colors.red;
      case 'LOGIN':
        return Colors.purple;
      case 'LOGOUT':
        return Colors.orange;
      case 'VIEW':
        return Colors.grey;
      case 'EXPORT':
        return Colors.teal;
      case 'IMPORT':
        return Colors.indigo;
      default:
        return Colors.black;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Nhật ký hoạt động'),
        actions: [
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
            onPressed: _refreshAuditEvents,
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: Column(
        children: [
          if (_showFilters) _buildFilters(),
          Expanded(
            child: Consumer<AuditProvider>(
              builder: (context, provider, child) {
                if (provider.isLoading && provider.auditEvents.isEmpty) {
                  return const Center(child: CircularProgressIndicator());
                }

                if (provider.error != null && provider.auditEvents.isEmpty) {
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
                          onPressed: _refreshAuditEvents,
                          child: const Text('Thử lại'),
                        ),
                      ],
                    ),
                  );
                }

                if (provider.auditEvents.isEmpty) {
                  return const Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.history, size: 48, color: Colors.grey),
                        SizedBox(height: 16),
                        Text(
                          'No audit events found',
                          style: TextStyle(color: Colors.grey),
                        ),
                      ],
                    ),
                  );
                }

                return RefreshIndicator(
                  onRefresh: _refreshAuditEvents,
                  child: ListView.builder(
                    controller: _scrollController,
                    padding: const EdgeInsets.all(16),
                    itemCount:
                        provider.auditEvents.length + (_isLoadingMore ? 1 : 0),
                    itemBuilder: (context, index) {
                      if (index == provider.auditEvents.length) {
                        return const Center(
                          child: Padding(
                            padding: EdgeInsets.all(16),
                            child: CircularProgressIndicator(),
                          ),
                        );
                      }

                      final event = provider.auditEvents[index];
                      return _buildAuditEventCard(event);
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

  Widget _buildFilters() {
    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.1),
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
          const Text('Action:', style: TextStyle(fontWeight: FontWeight.w500)),
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

          // Resource Type Filter
          const Text(
            'Resource Type:',
            style: TextStyle(fontWeight: FontWeight.w500),
          ),
          const SizedBox(height: 8),
          DropdownButtonFormField<String>(
            value: _selectedResourceType,
            decoration: const InputDecoration(
              border: OutlineInputBorder(),
              contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            ),
            items: _resourceTypeOptions.map((type) {
              return DropdownMenuItem(
                value: type,
                child: Text(
                  type.isEmpty
                      ? 'Tất cả đối tượng'
                      : _getResourceTypeDisplayName(type),
                ),
              );
            }).toList(),
            onChanged: (value) {
              setState(() {
                _selectedResourceType = value ?? '';
              });
            },
          ),

          const SizedBox(height: 16),

          // User ID Filter
          const Text('User ID:', style: TextStyle(fontWeight: FontWeight.w500)),
          const SizedBox(height: 8),
          TextFormField(
            initialValue: _selectedUserId,
            decoration: const InputDecoration(
              border: OutlineInputBorder(),
              hintText: 'Nhập ID người dùng (tùy chọn)',
              contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            ),
            onChanged: (value) {
              _selectedUserId = value;
            },
          ),

          const SizedBox(height: 16),

          // Date Range
          const Text(
            'Date Range:',
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
              onPressed: _loadAuditEvents,
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
                  _selectedResourceType = '';
                  _selectedUserId = '';
                  _selectedDateRange = null;
                });
                _loadAuditEvents();
              },
              child: const Text('Xóa bộ lọc'),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAuditEventCard(AuditEvent event) {
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
                    color: _getActionColor(event.action).withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: _getActionColor(event.action)),
                  ),
                  child: Text(
                    _getActionDisplayName(event.action),
                    style: TextStyle(
                      color: _getActionColor(event.action),
                      fontWeight: FontWeight.bold,
                      fontSize: 12,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.blue.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.blue),
                  ),
                  child: Text(
                    _getResourceTypeDisplayName(event.resourceType),
                    style: const TextStyle(
                      color: Colors.blue,
                      fontWeight: FontWeight.bold,
                      fontSize: 12,
                    ),
                  ),
                ),
                const Spacer(),
                Text(
                  _dateFormat.format(event.timestamp),
                  style: const TextStyle(color: Colors.grey, fontSize: 12),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              'User: ${event.userId}',
              style: const TextStyle(fontWeight: FontWeight.w500),
            ),
            if (event.resourceId != null) ...[
              const SizedBox(height: 4),
              Text(
                'Resource ID: ${event.resourceId}',
                style: const TextStyle(color: Colors.grey, fontSize: 14),
              ),
            ],
            if (event.details != null && event.details!.isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(
                'Details: ${event.details}',
                style: const TextStyle(fontSize: 14),
              ),
            ],
            if (event.ipAddress.isNotEmpty) ...[
              const SizedBox(height: 4),
              Text(
                'IP: ${event.ipAddress}',
                style: const TextStyle(color: Colors.grey, fontSize: 12),
              ),
            ],
            if (event.userAgent.isNotEmpty) ...[
              const SizedBox(height: 4),
              Text(
                'User Agent: ${event.userAgent}',
                style: const TextStyle(color: Colors.grey, fontSize: 12),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
