import 'package:detect_care_app/features/shared_permissions/data/shared_permissions_remote_data_source.dart';
import 'package:detect_care_app/features/shared_permissions/providers/caregiver_invitations_provider.dart';
import 'package:detect_care_app/features/shared_permissions/models/caregiver_invitation.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

class CaregiverInvitationsScreen extends StatefulWidget {
  final String caregiverId;

  const CaregiverInvitationsScreen({super.key, required this.caregiverId});

  @override
  State<CaregiverInvitationsScreen> createState() =>
      _CaregiverInvitationsScreenState();
}

class _CaregiverInvitationsScreenState
    extends State<CaregiverInvitationsScreen> {
  CaregiverInvitationsProvider? _provider;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final dataSource = context.read<SharedPermissionsRemoteDataSource>();
      _provider = CaregiverInvitationsProvider(dataSource);
      _provider!.loadPendingInvitations();
    });
  }

  void _handleInvitationResponse(
    BuildContext context,
    CaregiverInvitation invitation,
    bool accept,
  ) async {
    final messageController = TextEditingController();

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(accept ? 'Chấp nhận lời mời' : 'Từ chối lời mời'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              accept
                  ? 'Bạn có chắc muốn chấp nhận lời mời từ ${invitation.customerName}?'
                  : 'Bạn có chắc muốn từ chối lời mời từ ${invitation.customerName}?',
            ),
            const SizedBox(height: 12),
            TextField(
              controller: messageController,
              decoration: const InputDecoration(
                labelText: 'Lời nhắn (tùy chọn)',
                hintText: 'Nhập lời nhắn...',
              ),
              maxLines: 3,
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Hủy'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.of(context).pop(true),
            style: ElevatedButton.styleFrom(
              backgroundColor: accept ? Colors.green : Colors.red,
              foregroundColor: Colors.white,
            ),
            child: Text(accept ? 'Chấp nhận' : 'Từ chối'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      try {
        if (accept) {
          await _provider!.acceptInvitation(invitation.id);
        } else {
          await _provider!.rejectInvitation(invitation.id);
        }
        if (context.mounted) {
          ScaffoldMessenger.of(
            context,
          ).showSnackBar(const SnackBar(content: Text('Đã gửi phản hồi')));
        }
      } catch (e) {
        if (context.mounted) {
          ScaffoldMessenger.of(
            context,
          ).showSnackBar(SnackBar(content: Text('Lỗi: $e')));
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Lời mời đang chờ')),
      body: Consumer<CaregiverInvitationsProvider>(
        builder: (context, provider, child) {
          if (_provider == null) {
            return const Center(child: CircularProgressIndicator());
          }

          if (_provider!.isLoadingPending) {
            return const Center(child: CircularProgressIndicator());
          }

          if (_provider!.pendingError != null) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.error_outline, size: 48, color: Colors.red[400]),
                  const SizedBox(height: 16),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 24),
                    child: Text(
                      'Không thể tải danh sách lời mời',
                      style: TextStyle(color: Colors.red[600], fontSize: 16),
                      textAlign: TextAlign.center,
                    ),
                  ),
                  const SizedBox(height: 8),
                  ElevatedButton(
                    onPressed: _provider!.loadPendingInvitations,
                    child: const Text('Thử lại'),
                  ),
                ],
              ),
            );
          }

          final invitations = _provider!.pendingInvitations;
          if (invitations.isEmpty) {
            return const Center(child: Text('Không có lời mời nào đang chờ'));
          }

          return ListView.builder(
            itemCount: invitations.length,
            itemBuilder: (context, index) {
              final invitation = invitations[index];
              return _InvitationCard(
                invitation: invitation,
                onRespond: _handleInvitationResponse,
              );
            },
          );
        },
      ),
    );
  }
}

class _InvitationCard extends StatelessWidget {
  final CaregiverInvitation invitation;
  final Function(BuildContext, CaregiverInvitation, bool) onRespond;

  const _InvitationCard({required this.invitation, required this.onRespond});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.person, size: 40, color: Colors.blue),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        invitation.customerName,
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Text(
                        'Mời bạn làm người chăm sóc',
                        style: TextStyle(color: Colors.grey[600]),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            const Text(
              'Quyền được cấp:',
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            if (invitation.permissions != null) ...[
              _PermissionItem(
                icon: Icons.videocam,
                text: 'Xem camera trực tiếp',
                enabled: invitation.permissions!.streamView,
              ),
              _PermissionItem(
                icon: Icons.notifications,
                text: 'Đọc cảnh báo',
                enabled: invitation.permissions!.alertRead,
              ),
              _PermissionItem(
                icon: Icons.check_circle,
                text: 'Xác nhận cảnh báo',
                enabled: invitation.permissions!.alertAck,
              ),
              _PermissionItem(
                icon: Icons.history,
                text:
                    'Truy cập nhật ký (${invitation.permissions!.logAccessDays} ngày)',
                enabled: invitation.permissions!.logAccessDays > 0,
              ),
              _PermissionItem(
                icon: Icons.report,
                text:
                    'Truy cập báo cáo (${invitation.permissions!.reportAccessDays} ngày)',
                enabled: invitation.permissions!.reportAccessDays > 0,
              ),
              _PermissionItem(
                icon: Icons.person,
                text: 'Xem hồ sơ',
                enabled: invitation.permissions!.profileView,
              ),
            ],
            const SizedBox(height: 16),
            Text(
              'Gửi lúc: ${invitation.createdAt.toLocal().toString().split('.')[0]}',
              style: TextStyle(color: Colors.grey[600], fontSize: 12),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: ElevatedButton(
                    onPressed: () => onRespond(context, invitation, false),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.red,
                      foregroundColor: Colors.white,
                    ),
                    child: const Text('Từ chối'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton(
                    onPressed: () => onRespond(context, invitation, true),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.green,
                      foregroundColor: Colors.white,
                    ),
                    child: const Text('Chấp nhận'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _PermissionItem extends StatelessWidget {
  final IconData icon;
  final String text;
  final bool enabled;

  const _PermissionItem({
    required this.icon,
    required this.text,
    required this.enabled,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        children: [
          Icon(icon, size: 16, color: enabled ? Colors.green : Colors.grey),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              text,
              style: TextStyle(
                color: enabled ? Colors.black : Colors.grey,
                decoration: enabled ? null : TextDecoration.lineThrough,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
