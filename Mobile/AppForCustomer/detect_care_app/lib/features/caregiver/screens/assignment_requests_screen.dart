import 'package:detect_care_app/core/network/api_client.dart';
import 'package:detect_care_app/features/auth/data/auth_storage.dart';
import 'package:detect_care_app/features/caregiver/data/assignment_api.dart';
import 'package:flutter/material.dart';

class AssignmentRequestsScreen extends StatefulWidget {
  const AssignmentRequestsScreen({super.key});

  @override
  State<AssignmentRequestsScreen> createState() =>
      _AssignmentRequestsScreenState();
}

class _AssignmentRequestsScreenState extends State<AssignmentRequestsScreen> {
  late final AssignmentApi _assignmentApi;
  List<Map<String, dynamic>> _pendingAssignments = [];
  bool _isLoading = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _assignmentApi = AssignmentApi(
      ApiClient(tokenProvider: AuthStorage.getAccessToken),
    );
    _loadPendingAssignments();
  }

  Future<void> _loadPendingAssignments() async {
    if (_isLoading) return;

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final assignments = await _assignmentApi.getMyAssignmentsAsCaregiver();
      // Filter for pending assignments on client side
      final pendingAssignments = assignments.where((assignment) {
        final status = assignment['status']?.toString().toLowerCase();
        return status == 'pending';
      }).toList();

      setState(() {
        _pendingAssignments = pendingAssignments;
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
              onPressed: _loadPendingAssignments,
            ),
          ),
        );
      }
    }
  }

  Future<void> _respondToAssignment(String assignmentId, bool accept) async {
    try {
      if (accept) {
        await _assignmentApi.acceptAssignment(assignmentId);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Đã chấp nhận assignment')),
          );
        }
      } else {
        await _assignmentApi.rejectAssignment(assignmentId);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Đã từ chối assignment')),
          );
        }
      }

      // Reload the list
      await _loadPendingAssignments();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Lỗi: ${e.toString()}')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Yêu cầu Assignment'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadPendingAssignments,
          ),
        ],
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_errorMessage != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.error_outline, size: 48, color: Colors.red[400]),
            const SizedBox(height: 16),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Text(
                'Không thể tải danh sách yêu cầu',
                style: TextStyle(color: Colors.red[600], fontSize: 16),
                textAlign: TextAlign.center,
              ),
            ),
            const SizedBox(height: 8),
            ElevatedButton(
              onPressed: _loadPendingAssignments,
              child: const Text('Thử lại'),
            ),
          ],
        ),
      );
    }

    if (_pendingAssignments.isEmpty) {
      return const Center(child: Text('Không có yêu cầu assignment nào'));
    }

    return ListView.builder(
      itemCount: _pendingAssignments.length,
      itemBuilder: (context, index) {
        final assignment = _pendingAssignments[index];
        return _AssignmentRequestCard(
          assignment: assignment,
          onAccept: () => _respondToAssignment(assignment['id'], true),
          onReject: () => _respondToAssignment(assignment['id'], false),
        );
      },
    );
  }
}

class _AssignmentRequestCard extends StatelessWidget {
  final Map<String, dynamic> assignment;
  final VoidCallback onAccept;
  final VoidCallback onReject;

  const _AssignmentRequestCard({
    required this.assignment,
    required this.onAccept,
    required this.onReject,
  });

  @override
  Widget build(BuildContext context) {
    final customerName = assignment['customer_name'] ?? 'Unknown Customer';
    final assignmentType = assignment['assignment_type'] ?? 'General';

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        customerName,
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Text(
                        'Loại: $assignmentType',
                        style: TextStyle(color: Colors.grey[600]),
                      ),
                      if (assignment['notes'] != null) ...[
                        const SizedBox(height: 8),
                        Text(
                          assignment['notes'],
                          style: TextStyle(color: Colors.grey[700]),
                        ),
                      ],
                    ],
                  ),
                ),
                Column(
                  children: [
                    ElevatedButton(
                      onPressed: onAccept,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.green,
                        foregroundColor: Colors.white,
                      ),
                      child: const Text('Chấp nhận'),
                    ),
                    const SizedBox(height: 8),
                    OutlinedButton(
                      onPressed: onReject,
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: Colors.red),
                        foregroundColor: Colors.red,
                      ),
                      child: const Text('Từ chối'),
                    ),
                  ],
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
