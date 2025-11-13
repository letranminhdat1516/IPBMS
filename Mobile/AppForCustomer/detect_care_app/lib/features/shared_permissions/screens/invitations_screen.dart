import 'package:detect_care_app/features/shared_permissions/data/shared_permissions_remote_data_source.dart';
import 'package:detect_care_app/features/shared_permissions/models/caregiver_invitation.dart';
import 'package:detect_care_app/features/shared_permissions/pages/invite_caregiver_page.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

/// Asset for the empty state (replace in assets + pubspec)
const String kInvitationsEmptyAsset = 'assets/invitations_empty.png';

class InvitationsScreen extends StatefulWidget {
  final String customerId;
  const InvitationsScreen({super.key, required this.customerId});

  @override
  State<InvitationsScreen> createState() => _InvitationsScreenState();
}

class _InvitationsScreenState extends State<InvitationsScreen> {
  late final SharedPermissionsRemoteDataSource _dataSource;
  List<CaregiverInvitation> _invitations = [];
  bool _isLoading = false;
  String? _error;

  // Local UI state (search + filter)
  final String _query = '';
  InvitationStatus? _statusFilter; // null = All

  @override
  void initState() {
    super.initState();
    _dataSource = context.read<SharedPermissionsRemoteDataSource>();
    _loadInvitations();
  }

  Future<void> _loadInvitations() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      final invitations = await _dataSource.getInvitations(
        customerId: widget.customerId,
      );
      setState(() => _invitations = invitations);
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _openInviteCaregiverPage() async {
    final shouldRefresh = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (_) => InviteCaregiverPage(customerId: widget.customerId),
        fullscreenDialog: true,
      ),
    );
    if (shouldRefresh == true && mounted) _loadInvitations();
  }

  Future<void> _revokeInvitation(CaregiverInvitation invitation) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Thu hồi lời mời'),
        content: const Text('Bạn có chắc muốn thu hồi lời mời này?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Hủy'),
          ),
          FilledButton.tonal(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Thu hồi'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      try {
        await _dataSource.revokeInvitation(
          customerId: widget.customerId,
          invitationId: invitation.id,
        );
        if (!mounted) return;
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('Đã thu hồi lời mời')));
        _loadInvitations();
      } catch (e) {
        if (!mounted) return;
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Lỗi: $e')));
      }
    }
  }

  // Lightweight client-side filter. If you have backend search, wire it here.
  List<CaregiverInvitation> get _filteredInvitations {
    final q = _query.trim().toLowerCase();
    return _invitations.where((inv) {
      final okStatus = _statusFilter == null || inv.status == _statusFilter;
      final okQuery =
          q.isEmpty ||
          inv.caregiverName.toLowerCase().contains(q) ||
          inv.caregiverEmail.toLowerCase().contains(q);
      return okStatus && okQuery;
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final filtered = _filteredInvitations;

    return Scaffold(
      resizeToAvoidBottomInset: true,
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _loadInvitations,
          child: CustomScrollView(
            slivers: [
              // Modern header: SliverAppBar + embedded search & filters
              SliverAppBar(
                floating: true,
                snap: true,
                pinned: true,
                expandedHeight: 128,
                title: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Quản lý quyền chia sẻ'),
                    Text(
                      'Quản lý lời mời & quyền truy cập',
                      style: TextStyle(
                        color: Color.fromRGBO(
                          (cs.onSurface.r * 255.0).round(),
                          (cs.onSurface.g * 255.0).round(),
                          (cs.onSurface.b * 255.0).round(),
                          0.7,
                        ),
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
                actions: [
                  IconButton(
                    tooltip: 'Gửi lời mời',
                    icon: const Icon(Icons.person_add),
                    onPressed: _openInviteCaregiverPage,
                  ),
                  const SizedBox(width: 4),
                ],
              ),

              // Content area
              if (_isLoading)
                const SliverFillRemaining(
                  hasScrollBody: true,
                  child: Center(child: CircularProgressIndicator()),
                )
              else if (_error != null)
                SliverFillRemaining(
                  hasScrollBody: true,
                  child: _ErrorState(onRetry: _loadInvitations),
                )
              else if (_invitations.isEmpty)
                SliverFillRemaining(
                  hasScrollBody: true,
                  child: _EmptyState(
                    onInvite: _openInviteCaregiverPage,
                    onRefresh: _loadInvitations,
                  ),
                )
              else
                SliverPadding(
                  padding: const EdgeInsets.only(top: 8, bottom: 24),
                  sliver: SliverList.builder(
                    itemCount: filtered.length + 1,
                    itemBuilder: (context, index) {
                      if (index == 0) {
                        return Padding(
                          padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
                          child: Row(
                            children: [
                              Badge(
                                label: Text(filtered.length.toString()),
                                child: const Icon(Icons.inbox_outlined),
                              ),
                              const SizedBox(width: 8),
                              Text(
                                'Có ${_invitations.length} lời mời',
                                style: Theme.of(context).textTheme.bodyLarge,
                              ),
                              const Spacer(),
                              IconButton(
                                tooltip: 'Làm mới',
                                onPressed: _loadInvitations,
                                icon: const Icon(Icons.refresh),
                              ),
                              const SizedBox(width: 8),
                              FilledButton.icon(
                                onPressed: _openInviteCaregiverPage,
                                icon: const Icon(Icons.person_add),
                                label: const Text('Gửi lời mời'),
                              ),
                            ],
                          ),
                        );
                      }
                      final inv = filtered[index - 1];
                      return _InvitationCard(
                        invitation: inv,
                        onRevoke: inv.status == InvitationStatus.pending
                            ? () => _revokeInvitation(inv)
                            : null,
                      );
                    },
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

// ...existing code... (Status chips were removed because they're not
// referenced in this screen. If you need status-filter chips in the
// header, consider re-adding a dedicated widget and wiring it to the
// `_statusFilter` state.)

class _ErrorState extends StatelessWidget {
  final VoidCallback onRetry;
  const _ErrorState({required this.onRetry});

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 24.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.error_outline, size: 56, color: cs.error),
            const SizedBox(height: 16),
            Text(
              'Không thể tải danh sách lời mời',
              style: Theme.of(context).textTheme.titleMedium,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            FilledButton.tonal(
              onPressed: onRetry,
              child: const Text('Thử lại'),
            ),
          ],
        ),
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  final VoidCallback onInvite;
  final Future<void> Function() onRefresh;
  const _EmptyState({required this.onInvite, required this.onRefresh});

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 24.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            SizedBox(
              width: 160,
              height: 160,
              child: Image.asset(
                kInvitationsEmptyAsset,
                fit: BoxFit.contain,
                errorBuilder: (context, error, stackTrace) =>
                    Icon(Icons.people_outline, size: 96, color: cs.outline),
              ),
            ),
            const SizedBox(height: 24),
            Text(
              'Chưa có lời mời',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 8),
            Text(
              'Bạn chưa gửi lời mời nào cho người chăm sóc. Bắt đầu bằng cách gửi lời mời để chia sẻ quyền truy cập.',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            Wrap(
              spacing: 12,
              children: [
                FilledButton.icon(
                  onPressed: onInvite,
                  icon: const Icon(Icons.person_add),
                  label: const Text('Gửi lời mời'),
                ),
                OutlinedButton.icon(
                  onPressed: onRefresh,
                  icon: const Icon(Icons.refresh),
                  label: const Text('Làm mới'),
                ),
              ],
            ),
            const SizedBox(height: 12),
            TextButton(
              onPressed: () => showModalBottomSheet(
                context: context,
                showDragHandle: true,
                builder: (context) => const Padding(
                  padding: EdgeInsets.all(16),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Lời mời là gì?',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      SizedBox(height: 8),
                      Text(
                        'Lời mời cho phép bạn cấp quyền truy cập cho người chăm sóc để xem thông tin, báo cáo, và nhận thông báo theo mức quyền bạn chọn.',
                      ),
                      SizedBox(height: 8),
                    ],
                  ),
                ),
              ),
              child: const Text('Tìm hiểu thêm'),
            ),
          ],
        ),
      ),
    );
  }
}

class _InvitationCard extends StatelessWidget {
  final CaregiverInvitation invitation;
  final VoidCallback? onRevoke;
  const _InvitationCard({required this.invitation, this.onRevoke});

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final color = _statusColor(invitation.status, cs);
    final statusText = _statusText(invitation.status);

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () {},
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  CircleAvatar(
                    radius: 18,
                    child: Text(_initials(invitation.caregiverName)),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          invitation.caregiverName,
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          invitation.caregiverEmail,
                          style: TextStyle(color: cs.onSurfaceVariant),
                        ),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: Color.fromRGBO(
                        (color.r * 255.0).round(),
                        (color.g * 255.0).round(),
                        (color.b * 255.0).round(),
                        0.12,
                      ),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: Color.fromRGBO(
                          (color.r * 255.0).round(),
                          (color.g * 255.0).round(),
                          (color.b * 255.0).round(),
                          0.4,
                        ),
                      ),
                    ),
                    child: Text(
                      statusText,
                      style: TextStyle(
                        color: color,
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  if (onRevoke != null) ...[
                    const SizedBox(width: 8),
                    PopupMenuButton<String>(
                      tooltip: 'Thao tác',
                      onSelected: (v) {
                        if (v == 'revoke') onRevoke!.call();
                      },
                      itemBuilder: (context) => const [
                        PopupMenuItem(
                          value: 'revoke',
                          child: ListTile(
                            leading: Icon(Icons.undo, size: 20),
                            title: Text('Thu hồi lời mời'),
                          ),
                        ),
                      ],
                    ),
                  ],
                ],
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 12,
                runSpacing: 4,
                children: [
                  _Info(
                    icon: Icons.schedule,
                    text: 'Gửi: ${_fmt(invitation.createdAt)}',
                  ),
                  if (invitation.respondedAt != null)
                    _Info(
                      icon: Icons.event_available,
                      text: 'Phản hồi: ${_fmt(invitation.respondedAt!)}',
                    ),
                ],
              ),
              if ((invitation.responseMessage ?? '').trim().isNotEmpty) ...[
                const SizedBox(height: 8),
                Text(
                  'Lời nhắn: ${invitation.responseMessage}',
                  style: const TextStyle(fontStyle: FontStyle.italic),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  static String _fmt(DateTime dt) => dt.toLocal().toString().split('.').first;
  static String _initials(String name) {
    final parts = name.trim().split(RegExp(r'\s+'));
    if (parts.isEmpty) return '?';
    if (parts.length == 1) {
      return parts.first.characters.take(1).toString().toUpperCase();
    }
    return (parts.first.characters.take(1).toString() +
            parts.last.characters.take(1).toString())
        .toUpperCase();
  }

  Color _statusColor(InvitationStatus status, ColorScheme cs) {
    switch (status) {
      case InvitationStatus.pending:
        return cs.tertiary; // warm/amber tone in many M3 schemes
      case InvitationStatus.accepted:
        return cs.primary;
      case InvitationStatus.rejected:
        return cs.error;
      case InvitationStatus.revoked:
        return cs.outline;
    }
  }

  String _statusText(InvitationStatus status) {
    switch (status) {
      case InvitationStatus.pending:
        return 'Đang chờ';
      case InvitationStatus.accepted:
        return 'Đã chấp nhận';
      case InvitationStatus.rejected:
        return 'Đã từ chối';
      case InvitationStatus.revoked:
        return 'Đã thu hồi';
    }
  }
}

class _Info extends StatelessWidget {
  final IconData icon;
  final String text;
  const _Info({required this.icon, required this.text});

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 16, color: cs.onSurfaceVariant),
        const SizedBox(width: 6),
        Text(text, style: TextStyle(color: cs.onSurfaceVariant)),
      ],
    );
  }
}
