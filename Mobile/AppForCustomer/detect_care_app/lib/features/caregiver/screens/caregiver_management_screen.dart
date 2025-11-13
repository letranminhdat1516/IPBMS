import 'package:detect_care_app/features/caregiver/screens/assignment_requests_screen.dart';
import 'package:detect_care_app/features/shared_permissions/screens/caregiver_settings_screen.dart';
import 'package:detect_care_app/features/auth/providers/auth_provider.dart';
import 'package:detect_care_app/features/caregiver/data/assignment_api.dart';
import 'package:detect_care_app/core/network/api_client.dart';
import 'package:detect_care_app/features/auth/data/auth_storage.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

class CaregiverManagementScreen extends StatefulWidget {
  const CaregiverManagementScreen({super.key});

  @override
  State<CaregiverManagementScreen> createState() =>
      _CaregiverManagementScreenState();
}

class _CaregiverManagementScreenState extends State<CaregiverManagementScreen>
    with TickerProviderStateMixin {
  bool _isLoading = false;
  bool _isRefreshing = false;
  String? _errorMessage;
  List<Map<String, dynamic>> _assignments = [];
  late AnimationController _syncController;
  late Animation<double> _syncAnimation;

  @override
  void initState() {
    super.initState();
    _syncController = AnimationController(
      duration: const Duration(seconds: 2),
      vsync: this,
    )..repeat();
    _syncAnimation = Tween<double>(
      begin: 0.0,
      end: 1.0,
    ).animate(CurvedAnimation(parent: _syncController, curve: Curves.linear));
    _loadData();
  }

  @override
  void dispose() {
    _syncController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    if (_isLoading) return;

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      // Get user ID
      final userId = await AuthStorage.getUserId();
      if (userId == null || userId.trim().isEmpty) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text(
                'Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.',
              ),
              backgroundColor: Colors.red,
            ),
          );
        }
        setState(() {
          _isLoading = false;
        });
        return;
      }

      // Load caregiver assignments using real API
      final assignmentApi = AssignmentApi(
        ApiClient(tokenProvider: AuthStorage.getAccessToken),
      );
      final assignments = await assignmentApi.getMyAssignments();

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
            action: SnackBarAction(label: 'Thử lại', onPressed: _loadData),
          ),
        );
      }
    }
  }

  Future<void> _refreshData() async {
    setState(() => _isRefreshing = true);
    await _loadData();
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
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return _buildLoadingState();
    }

    if (_errorMessage != null) {
      return _buildErrorState();
    }

    return RefreshIndicator(
      onRefresh: _refreshData,
      child: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 24),
            _buildSectionTitle('DANH SÁCH VÀ QUẢN LÝ'),
            const SizedBox(height: 12),
            _caregiverSection(),
            const SizedBox(height: 24),
            _buildSectionTitle('YÊU CẦU VÀ CÀI ĐẶT'),
            const SizedBox(height: 12),
            _sharedPermissionsSection(),
          ],
        ),
      ),
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
            'Đang tải dữ liệu người chăm sóc...',
            style: Theme.of(
              context,
            ).textTheme.bodyLarge?.copyWith(color: Colors.grey.shade600),
          ),
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
            'Không thể tải dữ liệu người chăm sóc',
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
            onPressed: _loadData,
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
            'Quản lý Người chăm sóc',
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
              onPressed: _refreshData,
              icon: const Icon(Icons.refresh),
              style: IconButton.styleFrom(
                foregroundColor: Theme.of(context).colorScheme.onSurface,
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.only(left: 4),
      child: Text(
        title,
        style: Theme.of(context).textTheme.labelMedium?.copyWith(
          color: Theme.of(context).colorScheme.onSurfaceVariant,
          fontWeight: FontWeight.w500,
          letterSpacing: 0.5,
        ),
      ),
    );
  }

  Widget _caregiverSection() {
    return Card(
      elevation: 0,
      color: Colors.grey.shade50,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: Colors.grey.shade200),
      ),
      child: Column(
        children: [
          // Show assignment summary if data is loaded
          if (_assignments.isNotEmpty) ...[
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Icon(
                    Icons.supervisor_account_outlined,
                    color: Theme.of(context).primaryColor,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Người chăm sóc hiện tại',
                          style: Theme.of(context).textTheme.titleMedium
                              ?.copyWith(fontWeight: FontWeight.w600),
                        ),
                        Text(
                          '${_assignments.length} người chăm sóc',
                          style: Theme.of(context).textTheme.bodyMedium
                              ?.copyWith(color: Colors.grey.shade600),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    onPressed: () {
                      Navigator.of(context).pushNamed('/caregiver_list');
                    },
                    icon: const Icon(Icons.arrow_forward_ios, size: 16),
                  ),
                ],
              ),
            ),
            // Show first few assignments
            ..._assignments
                .take(2)
                .map(
                  (assignment) => Column(
                    children: [
                      ListTile(
                        leading: CircleAvatar(
                          backgroundColor: Theme.of(
                            context,
                          ).primaryColor.withAlpha((0.1 * 255).round()),
                          child: Text(
                            assignment['caregiver_name']
                                    ?.toString()
                                    .substring(0, 1)
                                    .toUpperCase() ??
                                '?',
                            style: TextStyle(
                              color: Theme.of(context).primaryColor,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                        title: Text(
                          assignment['caregiver_name']?.toString() ?? 'Unknown',
                        ),
                        subtitle: Text(
                          'Trạng thái: ${assignment['status']?.toString() ?? 'Unknown'}',
                        ),
                        trailing: Icon(
                          assignment['status'] == 'active'
                              ? Icons.check_circle
                              : Icons.pending,
                          color: assignment['status'] == 'active'
                              ? Colors.green
                              : Colors.orange,
                        ),
                      ),
                      if (_assignments.indexOf(assignment) <
                          _assignments.take(2).length - 1)
                        const Divider(height: 1),
                    ],
                  ),
                ),
            if (_assignments.length > 2) ...[
              const Divider(height: 1),
              ListTile(
                title: Text(
                  'Xem tất cả ${_assignments.length} người chăm sóc',
                  style: TextStyle(
                    color: Theme.of(context).primaryColor,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                trailing: const Icon(Icons.arrow_forward_ios, size: 16),
                onTap: () {
                  Navigator.of(context).pushNamed('/caregiver_list');
                },
              ),
            ],
            const Divider(height: 1),
          ],
          ListTile(
            leading: const Icon(Icons.person_add_outlined),
            title: const Text('Thêm người chăm sóc mới'),
            subtitle: const Text('Mời người chăm sóc tham gia'),
            trailing: const Icon(Icons.arrow_forward_ios, size: 16),
            onTap: () {
              Navigator.of(context).pushNamed('/add_caregiver');
            },
          ),
        ],
      ),
    );
  }

  Widget _sharedPermissionsSection() {
    return Card(
      elevation: 0,
      color: Colors.grey.shade50,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: Colors.grey.shade200),
      ),
      child: Column(
        children: [
          ListTile(
            leading: const Icon(Icons.assignment_outlined),
            title: const Text('Quản lý assignments'),
            subtitle: const Text('Xem và quản lý các assignment hiện tại'),
            trailing: const Icon(Icons.arrow_forward_ios, size: 16),
            onTap: () {
              Navigator.of(context).pushNamed('/caregiver_list');
            },
          ),
          const Divider(height: 1),
          ListTile(
            leading: const Icon(Icons.pending_actions_outlined),
            title: const Text('Yêu cầu assignments'),
            subtitle: const Text('Xem và phản hồi yêu cầu mới'),
            trailing: const Icon(Icons.arrow_forward_ios, size: 16),
            onTap: () {
              Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (_) => const AssignmentRequestsScreen(),
                ),
              );
            },
          ),
          const Divider(height: 1),
          ListTile(
            leading: const Icon(Icons.settings_outlined),
            title: const Text('Cài đặt chia sẻ'),
            subtitle: const Text('Quản lý quyền truy cập và cài đặt'),
            trailing: const Icon(Icons.arrow_forward_ios, size: 16),
            onTap: () {
              final authProvider = context.read<AuthProvider>();
              final user = authProvider.user;
              Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (_) => CaregiverSettingsScreen(
                    caregiverId: user?.id ?? '',
                    caregiverDisplay: user?.fullName ?? 'Người chăm sóc',
                    customerId: user?.id ?? '',
                  ),
                ),
              );
            },
          ),
        ],
      ),
    );
  }
}
