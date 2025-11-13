import 'package:detect_care_app/core/network/api_client.dart';
import 'package:detect_care_app/features/auth/data/auth_storage.dart';
import 'package:detect_care_app/features/caregiver/data/assignment_api.dart';
import 'package:flutter/material.dart';

class CaregiverListScreen extends StatefulWidget {
  const CaregiverListScreen({super.key});

  @override
  State<CaregiverListScreen> createState() => _CaregiverListScreenState();
}

class _CaregiverListScreenState extends State<CaregiverListScreen>
    with TickerProviderStateMixin {
  late final AssignmentApi _assignmentApi;

  // Real caregiver assignments data from API
  List<Map<String, dynamic>> _assignments = [];

  bool _isLoading = false;
  bool _isRefreshing = false;
  String? _errorMessage;
  late AnimationController _syncController;
  late Animation<double> _syncAnimation;

  @override
  void initState() {
    super.initState();
    _assignmentApi = AssignmentApi(
      ApiClient(tokenProvider: AuthStorage.getAccessToken),
    );
    _syncController = AnimationController(
      duration: const Duration(seconds: 2),
      vsync: this,
    )..repeat();
    _syncAnimation = Tween<double>(
      begin: 0.0,
      end: 1.0,
    ).animate(CurvedAnimation(parent: _syncController, curve: Curves.linear));
    _loadAssignments();
  }

  @override
  void dispose() {
    _syncController.dispose();
    super.dispose();
  }

  Future<void> _loadAssignments() async {
    if (_isLoading) return;

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      // Call real API to get assignments for current customer
      final assignments = await _assignmentApi.getMyAssignments();

      setState(() {
        _assignments = assignments;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _isLoading = false;
        _errorMessage = e.toString();
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Lỗi tải dữ liệu: ${e.toString()}'),
            action: SnackBarAction(
              label: 'Thử lại',
              onPressed: _loadAssignments,
            ),
          ),
        );
      }
    }
  }

  Future<void> _refreshAssignments() async {
    setState(() => _isRefreshing = true);
    await _loadAssignments();
    setState(() => _isRefreshing = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Column(
          children: [
            _buildHeader(context),
            Expanded(child: _buildBody()),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _isLoading
            ? null
            : () {
                Navigator.of(context).pushNamed('/add_caregiver');
              },
        backgroundColor: _isLoading
            ? Colors.grey
            : Theme.of(context).primaryColor,
        child: _isLoading
            ? const SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                ),
              )
            : const Icon(Icons.add),
      ),
    );
  }

  Widget _buildBody() {
    if (_isLoading && _assignments.isEmpty) {
      return _buildLoadingState();
    }

    if (_errorMessage != null && _assignments.isEmpty) {
      return _buildErrorState();
    }

    return RefreshIndicator(
      onRefresh: _refreshAssignments,
      child: _assignments.isEmpty ? _buildEmptyState() : _buildCaregiverList(),
    );
  }

  Widget _buildLoadingState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          AnimatedBuilder(
            animation: _syncAnimation,
            builder: (context, child) {
              return Transform.rotate(
                angle: _syncAnimation.value * 2 * 3.14159,
                child: Icon(
                  Icons.sync,
                  size: 48,
                  color: Theme.of(context).primaryColor,
                ),
              );
            },
          ),
          const SizedBox(height: 16),
          Text(
            'Đang đồng bộ dữ liệu...',
            style: Theme.of(
              context,
            ).textTheme.bodyLarge?.copyWith(color: Colors.grey.shade600),
          ),
          const SizedBox(height: 8),
          Text(
            'Vui lòng đợi trong giây lát',
            style: Theme.of(
              context,
            ).textTheme.bodySmall?.copyWith(color: Colors.grey.shade500),
          ),
        ],
      ),
    );
  }

  Widget _buildErrorState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.error_outline, size: 64, color: Colors.red.shade400),
          const SizedBox(height: 16),
          Text(
            'Không thể tải dữ liệu',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
              color: Colors.red.shade600,
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            _errorMessage ?? 'Đã xảy ra lỗi không xác định',
            style: Theme.of(
              context,
            ).textTheme.bodyMedium?.copyWith(color: Colors.grey.shade600),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 24),
          ElevatedButton.icon(
            onPressed: _loadAssignments,
            icon: const Icon(Icons.refresh),
            label: const Text('Thử lại'),
            style: ElevatedButton.styleFrom(
              backgroundColor: Theme.of(context).primaryColor,
              foregroundColor: Colors.white,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeader(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border(
          bottom: BorderSide(
            color: Theme.of(
              context,
            ).colorScheme.outlineVariant.withValues(alpha: 0.5),
            width: 0.5,
          ),
        ),
      ),
      child: Row(
        children: [
          IconButton(
            onPressed: () => Navigator.of(context).pop(),
            icon: const Icon(Icons.arrow_back),
            style: IconButton.styleFrom(
              foregroundColor: Theme.of(context).colorScheme.onSurface,
            ),
          ),
          const Spacer(),
          Text(
            'Danh sách người chăm sóc',
            style: Theme.of(
              context,
            ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w600),
          ),
          const Spacer(),
          if (_isRefreshing)
            SizedBox(
              width: 20,
              height: 20,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                valueColor: AlwaysStoppedAnimation<Color>(
                  Theme.of(context).primaryColor,
                ),
              ),
            )
          else
            IconButton(
              onPressed: _refreshAssignments,
              icon: const Icon(Icons.refresh),
              style: IconButton.styleFrom(
                foregroundColor: Theme.of(context).colorScheme.onSurface,
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
              color: Colors.grey.shade50,
              shape: BoxShape.circle,
            ),
            child: Icon(
              Icons.supervisor_account_outlined,
              size: 48,
              color: Colors.grey.shade400,
            ),
          ),
          const SizedBox(height: 24),
          Text(
            'Chưa có người chăm sóc nào',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
              color: Colors.grey.shade700,
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Thêm người chăm sóc để giúp quản lý và theo dõi sức khỏe',
            style: Theme.of(
              context,
            ).textTheme.bodyMedium?.copyWith(color: Colors.grey.shade600),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 32),
          ElevatedButton.icon(
            onPressed: _isLoading
                ? null
                : () {
                    Navigator.of(context).pushNamed('/add_caregiver');
                  },
            icon: const Icon(Icons.add),
            label: const Text('Thêm người chăm sóc'),
            style: ElevatedButton.styleFrom(
              backgroundColor: Theme.of(context).primaryColor,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCaregiverList() {
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _assignments.length,
      itemBuilder: (context, index) {
        final assignment = _assignments[index];
        // Extract caregiver info from assignment
        final caregiver = assignment['caregiver'] ?? assignment;

        return Card(
          elevation: 0,
          color: Colors.grey.shade50,
          margin: const EdgeInsets.only(bottom: 12),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          child: ListTile(
            leading: CircleAvatar(
              backgroundColor: Theme.of(
                context,
              ).primaryColor.withValues(alpha: 0.1),
              child: Icon(Icons.person, color: Theme.of(context).primaryColor),
            ),
            title: Text(
              caregiver['full_name'] ?? caregiver['name'] ?? 'Chưa có tên',
              style: Theme.of(
                context,
              ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w500),
            ),
            subtitle: Text(
              caregiver['email'] ??
                  caregiver['phone_number'] ??
                  'Chưa có thông tin',
            ),
            trailing: Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color:
                    (assignment['status'] == 'active' ||
                        assignment['status'] == 'approved')
                    ? Colors.green.shade100
                    : Colors.grey.shade100,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 8,
                    height: 8,
                    decoration: BoxDecoration(
                      color:
                          (assignment['status'] == 'active' ||
                              assignment['status'] == 'approved')
                          ? Colors.green.shade600
                          : Colors.grey.shade600,
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 6),
                  Text(
                    (assignment['status'] == 'active' ||
                            assignment['status'] == 'approved')
                        ? 'Hoạt động'
                        : 'Chờ duyệt',
                    style: TextStyle(
                      color:
                          (assignment['status'] == 'active' ||
                              assignment['status'] == 'approved')
                          ? Colors.green.shade800
                          : Colors.grey.shade800,
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),
            onTap: () {
              // TODO: Navigate to caregiver detail screen
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(
                    'Chi tiết ${caregiver['full_name'] ?? caregiver['name'] ?? 'người chăm sóc'} - tính năng đang phát triển',
                  ),
                ),
              );
            },
          ),
        );
      },
    );
  }
}
