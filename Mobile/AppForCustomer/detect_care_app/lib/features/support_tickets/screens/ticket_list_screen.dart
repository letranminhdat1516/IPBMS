import 'package:detect_care_app/features/support_tickets/screens/edit_ticket_screen.dart';
import 'package:flutter/material.dart';
import '../service/support_tickets_service.dart';
import '../repository/support_tickets_repository.dart';
import '../data/support_tickets_remote_data_source.dart';
import '../utils/ticket_translator.dart';
import 'create_ticket_screen.dart';
import 'package:detect_care_app/core/network/api_client.dart';
import 'package:detect_care_app/features/auth/data/auth_storage.dart';

class TicketListScreen extends StatefulWidget {
  const TicketListScreen({super.key});

  @override
  State<TicketListScreen> createState() => _TicketListScreenState();
}

class _TicketListScreenState extends State<TicketListScreen> {
  late final SupportTicketsService _service;
  bool _loading = true;
  List<dynamic> _tickets = [];
  String? _selectedStatusKey;
  String? _selectedCategoryKey;

  static const primaryBlue = Color(0xFF2563EB);
  static const deepBlue = Color(0xFF1E40AF);
  static const lightBlue = Color(0xFFEFF6FF);
  static const backgroundColor = Color(0xFFF8FAFC);
  static const cardColor = Colors.white;
  static const textPrimary = Color(0xFF1E293B);
  static const textSecondary = Color(0xFF64748B);

  @override
  void initState() {
    super.initState();
    final apiClient = ApiClient(tokenProvider: AuthStorage.getAccessToken);
    final remote = SupportTicketsRemoteDataSource(apiClient);
    final repo = SupportTicketsRepository(remote);
    _service = SupportTicketsService(repo);
    _fetchTickets();
  }

  Future<void> _fetchTickets() async {
    setState(() => _loading = true);
    try {
      final result = await _service.fetchAllTickets();

      result.sort((a, b) {
        final aDate = DateTime.tryParse(a['created_at'] ?? '');
        final bDate = DateTime.tryParse(b['created_at'] ?? '');
        if (aDate == null || bDate == null) return 0;
        return bDate.compareTo(aDate);
      });

      setState(() => _tickets = result);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(Icons.error_outline, color: Colors.white),
                const SizedBox(width: 12),
                Expanded(child: Text('Lỗi tải ticket: $e')),
              ],
            ),
            backgroundColor: Colors.red.shade600,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
            margin: const EdgeInsets.all(16),
          ),
        );
      }
    } finally {
      setState(() => _loading = false);
    }
  }

  Color _getStatusColor(String? status) {
    switch (status?.toLowerCase()) {
      case 'open':
      case 'mở':
        return const Color(0xFFF59E0B);
      case 'in_progress':
      case 'đang xử lý':
        return primaryBlue;
      case 'resolved':
      case 'đã giải quyết':
        return const Color(0xFF10B981);
      case 'closed':
      case 'đã đóng':
        return const Color(0xFF6B7280);
      default:
        return const Color(0xFF6B7280);
    }
  }

  IconData _getCategoryIcon(String? category) {
    switch (category?.toLowerCase()) {
      case 'technical':
      case 'kỹ thuật':
        return Icons.construction_rounded;
      case 'billing':
      case 'thanh toán':
        return Icons.payments_rounded;
      case 'general':
      case 'chung':
        return Icons.help_center_rounded;
      default:
        return Icons.folder_rounded;
    }
  }

  @override
  Widget build(BuildContext context) {
    final filteredTickets = _tickets.where((t) {
      if (_selectedStatusKey != null && _selectedStatusKey!.isNotEmpty) {
        if (t['status'] != _selectedStatusKey) return false;
      }
      if (_selectedCategoryKey != null && _selectedCategoryKey!.isNotEmpty) {
        if (t['category'] != _selectedCategoryKey) return false;
      }
      return true;
    }).toList();

    return Scaffold(
      backgroundColor: backgroundColor,
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
          'Danh sách Ticket',
          style: TextStyle(
            color: Color(0xFF1E293B),
            fontSize: 20,
            fontWeight: FontWeight.w700,
            letterSpacing: -0.5,
          ),
        ),
        actions: [
          Container(
            margin: const EdgeInsets.only(right: 8),
            decoration: BoxDecoration(
              color: lightBlue,
              borderRadius: BorderRadius.circular(12),
            ),
            child: IconButton(
              icon: const Icon(Icons.refresh_rounded, color: primaryBlue),
              onPressed: _fetchTickets,
              tooltip: 'Làm mới',
            ),
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: CustomScrollView(
        slivers: [
          // Enhanced App Bar
          // SliverAppBar(
          //   expandedHeight: 120,
          //   floating: false,
          //   pinned: true,
          //   elevation: 0,
          //   backgroundColor: cardColor,
          //   flexibleSpace: FlexibleSpaceBar(
          //     title: const Text(
          //       'Danh sách Ticket',
          //       style: TextStyle(
          //         color: textPrimary,
          //         fontSize: 20,
          //         fontWeight: FontWeight.w700,
          //         letterSpacing: -0.5,
          //       ),
          //     ),
          //     background: Container(
          //       decoration: BoxDecoration(
          //         gradient: LinearGradient(
          //           begin: Alignment.topLeft,
          //           end: Alignment.bottomRight,
          //           colors: [cardColor, lightBlue.withAlpha((0.3 * 255).round())],
          //         ),
          //       ),
          //     ),
          //   ),
          //   actions: [
          //     Container(
          //       margin: const EdgeInsets.only(right: 8),
          //       decoration: BoxDecoration(
          //         color: lightBlue,
          //         borderRadius: BorderRadius.circular(12),
          //       ),
          //       child: IconButton(
          //         icon: const Icon(Icons.refresh_rounded, color: primaryBlue),
          //         onPressed: _fetchTickets,
          //         tooltip: 'Làm mới',
          //       ),
          //     ),
          //     const SizedBox(width: 8),
          //   ],
          // ),

          // Statistics Card
          SliverToBoxAdapter(
            child: Container(
              margin: const EdgeInsets.fromLTRB(16, 16, 16, 0),
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [primaryBlue, deepBlue],
                ),
                borderRadius: BorderRadius.circular(20),
                boxShadow: [
                  BoxShadow(
                    color: primaryBlue.withAlpha((0.3 * 255).round()),
                    blurRadius: 20,
                    offset: const Offset(0, 8),
                  ),
                ],
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  _buildStatItem(
                    icon: Icons.confirmation_number_rounded,
                    label: 'Tổng số',
                    value: '${_tickets.length}',
                  ),
                  Container(
                    height: 40,
                    width: 1,
                    color: Colors.white.withAlpha((0.3 * 255).round()),
                  ),
                  _buildStatItem(
                    icon: Icons.filter_list_rounded,
                    label: 'Hiển thị',
                    value: '${filteredTickets.length}',
                  ),
                ],
              ),
            ),
          ),

          // Filters Section
          SliverToBoxAdapter(
            child: Container(
              margin: const EdgeInsets.fromLTRB(16, 16, 16, 12),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: cardColor,
                borderRadius: BorderRadius.circular(16),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withAlpha((0.04 * 255).round()),
                    blurRadius: 10,
                    offset: const Offset(0, 2),
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
                          color: lightBlue,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Icon(
                          Icons.filter_alt_rounded,
                          color: primaryBlue,
                          size: 20,
                        ),
                      ),
                      const SizedBox(width: 12),
                      const Text(
                        'Bộ lọc',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          color: textPrimary,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Column(
                    children: [
                      SizedBox(
                        width: double.infinity,
                        child: _buildFilterDropdown(
                          label: 'Trạng thái',
                          icon: Icons.info_outline_rounded,
                          value: _selectedStatusKey,
                          items: [
                            const DropdownMenuItem(
                              value: '',
                              child: Text('Tất cả'),
                            ),
                            ...TicketTranslator.statusMap.entries.map(
                              (e) => DropdownMenuItem(
                                value: e.key,
                                child: Text(e.value),
                              ),
                            ),
                          ],
                          onChanged: (v) => setState(
                            () => _selectedStatusKey = (v == null || v.isEmpty)
                                ? null
                                : v,
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),
                      SizedBox(
                        width: double.infinity,
                        child: _buildFilterDropdown(
                          label: 'Danh mục',
                          icon: Icons.category_rounded,
                          value: _selectedCategoryKey,
                          items: [
                            const DropdownMenuItem(
                              value: '',
                              child: Text('Tất cả'),
                            ),
                            ...TicketTranslator.categoryMap.entries.map(
                              (e) => DropdownMenuItem(
                                value: e.key,
                                child: Text(e.value),
                              ),
                            ),
                          ],
                          onChanged: (v) => setState(
                            () => _selectedCategoryKey =
                                (v == null || v.isEmpty) ? null : v,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),

          // Tickets List
          _loading
              ? SliverFillRemaining(
                  child: Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Container(
                          padding: const EdgeInsets.all(20),
                          decoration: BoxDecoration(
                            color: lightBlue,
                            shape: BoxShape.circle,
                          ),
                          child: const CircularProgressIndicator(
                            valueColor: AlwaysStoppedAnimation<Color>(
                              primaryBlue,
                            ),
                            strokeWidth: 3,
                          ),
                        ),
                        const SizedBox(height: 24),
                        const Text(
                          'Đang tải...',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                            color: textSecondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                )
              : filteredTickets.isEmpty
              ? SliverFillRemaining(
                  child: Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Container(
                          padding: const EdgeInsets.all(32),
                          decoration: BoxDecoration(
                            color: lightBlue,
                            shape: BoxShape.circle,
                          ),
                          child: Icon(
                            Icons.inbox_rounded,
                            size: 80,
                            color: primaryBlue.withAlpha((0.5 * 255).round()),
                          ),
                        ),
                        const SizedBox(height: 24),
                        const Text(
                          'Không có ticket phù hợp',
                          style: TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.w700,
                            color: textPrimary,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Thử bỏ bộ lọc hoặc tạo ticket mới',
                          style: TextStyle(fontSize: 15, color: textSecondary),
                        ),
                      ],
                    ),
                  ),
                )
              : SliverPadding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 100),
                  sliver: SliverList(
                    delegate: SliverChildBuilderDelegate((context, i) {
                      final t = filteredTickets[i];
                      final status = TicketTranslator.translateStatus(
                        t['status'],
                      );
                      final category = TicketTranslator.translateCategory(
                        t['category'],
                      );
                      final createdAt = t['created_at'] != null
                          ? DateTime.tryParse(t['created_at'])
                          : null;
                      final statusColor = _getStatusColor(t['status']);

                      return _buildTicketCard(
                        context,
                        t,
                        status,
                        category,
                        createdAt,
                        statusColor,
                      );
                    }, childCount: filteredTickets.length),
                  ),
                ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () async {
          await Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => const CreateTicketScreen()),
          );
          _fetchTickets();
        },
        backgroundColor: primaryBlue,
        icon: const Icon(Icons.add_rounded, size: 24),
        label: const Text(
          'Tạo Ticket',
          style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
        ),
        elevation: 8,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      ),
    );
  }

  Widget _buildStatItem({
    required IconData icon,
    required String label,
    required String value,
  }) {
    return Column(
      children: [
        Icon(icon, color: Colors.white, size: 28),
        const SizedBox(height: 8),
        Text(
          value,
          style: const TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.w800,
            color: Colors.white,
          ),
        ),
        Text(
          label,
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w500,
            color: Colors.white.withAlpha((0.9 * 255).round()),
          ),
        ),
      ],
    );
  }

  Widget _buildFilterDropdown({
    required String label,
    required IconData icon,
    required String? value,
    required List<DropdownMenuItem<String>> items,
    required void Function(String?) onChanged,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: lightBlue, width: 1.5),
      ),
      child: DropdownButtonFormField<String>(
        value: value,
        decoration: InputDecoration(
          labelText: label,
          labelStyle: const TextStyle(
            color: primaryBlue,
            fontWeight: FontWeight.w600,
          ),
          prefixIcon: Icon(icon, color: primaryBlue, size: 20),
          isDense: true,
          contentPadding: const EdgeInsets.symmetric(
            horizontal: 12,
            vertical: 12,
          ),
          border: InputBorder.none,
        ),
        dropdownColor: cardColor,
        items: items,
        onChanged: onChanged,
      ),
    );
  }

  Widget _buildTicketCard(
    BuildContext context,
    dynamic t,
    String status,
    String category,
    DateTime? createdAt,
    Color statusColor,
  ) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: cardColor,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: lightBlue.withAlpha((0.5 * 255).round()),
          width: 1,
        ),
        boxShadow: [
          BoxShadow(
            color: primaryBlue.withAlpha((0.08 * 255).round()),
            blurRadius: 16,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(20),
          onTap: () async {
            await Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => EditTicketScreen(ticket: t)),
            );
            _fetchTickets();
          },
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: [
                            primaryBlue.withAlpha((0.2 * 255).round()),
                            lightBlue,
                          ],
                        ),
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: Icon(
                        _getCategoryIcon(t['category']),
                        color: primaryBlue,
                        size: 24,
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            t['title'] ?? 'Không có tiêu đề',
                            style: const TextStyle(
                              fontSize: 17,
                              fontWeight: FontWeight.w700,
                              color: textPrimary,
                              height: 1.3,
                            ),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 4),
                          Text(
                            category,
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              color: primaryBlue.withAlpha((0.7 * 255).round()),
                            ),
                          ),
                        ],
                      ),
                    ),
                    PopupMenuButton<String>(
                      icon: Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: backgroundColor,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Icon(
                          Icons.more_horiz_rounded,
                          color: textSecondary,
                          size: 20,
                        ),
                      ),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                      ),
                      elevation: 8,
                      onSelected: (value) async {
                        if (value == 'edit') {
                          await Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => EditTicketScreen(ticket: t),
                            ),
                          );
                          _fetchTickets();
                        }
                      },
                      itemBuilder: (ctx) => [
                        const PopupMenuItem(
                          value: 'edit',
                          child: Row(
                            children: [
                              Icon(Icons.edit_rounded, size: 20),
                              SizedBox(width: 12),
                              Text(
                                'Chỉnh sửa',
                                style: TextStyle(fontWeight: FontWeight.w600),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 8,
                        ),
                        decoration: BoxDecoration(
                          color: statusColor.withAlpha((0.1 * 255).round()),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(
                            color: statusColor.withAlpha((0.3 * 255).round()),
                            width: 1.5,
                          ),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Container(
                              width: 8,
                              height: 8,
                              decoration: BoxDecoration(
                                color: statusColor,
                                shape: BoxShape.circle,
                              ),
                            ),
                            const SizedBox(width: 8),
                            Text(
                              status,
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w700,
                                color: statusColor,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    if (createdAt != null) ...[
                      const SizedBox(width: 12),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 8,
                        ),
                        decoration: BoxDecoration(
                          color: backgroundColor,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(
                              Icons.schedule_rounded,
                              size: 16,
                              color: textSecondary,
                            ),
                            const SizedBox(width: 6),
                            Text(
                              '${createdAt.day}/${createdAt.month}/${createdAt.year}',
                              style: const TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                                color: textSecondary,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
