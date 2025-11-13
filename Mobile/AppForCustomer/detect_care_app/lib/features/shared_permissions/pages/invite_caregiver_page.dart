import 'dart:async';

import 'package:detect_care_app/features/auth/models/user.dart';
import 'package:detect_care_app/features/caregivers/data/caregivers_remote_data_source.dart';
import 'package:detect_care_app/features/shared_permissions/data/shared_permissions_remote_data_source.dart';
import 'package:detect_care_app/features/shared_permissions/models/shared_permissions.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:detect_care_app/features/shared_permissions/models/role_constants.dart';

class InviteCaregiverPage extends StatefulWidget {
  final String customerId;

  const InviteCaregiverPage({super.key, required this.customerId});

  @override
  State<InviteCaregiverPage> createState() => _InviteCaregiverPageState();
}

class _InviteCaregiverPageState extends State<InviteCaregiverPage> {
  late final SharedPermissionsRemoteDataSource _permissionsDataSource;
  late final CaregiversRemoteDataSource _caregiversDataSource;

  final TextEditingController _searchController = TextEditingController();
  Timer? _searchDebounce;

  bool _isLoadingCaregivers = false;
  String? _caregiverError;
  List<User> _searchResults = [];
  final Map<String, User> _selectedCaregivers = {};

  // Build role filter options from shared role labels so labels stay consistent
  final List<String> _roleFilters = <String>[
    'Tất cả vai trò',
    ...roleLabels.values,
  ];
  String _roleFilterValue = 'Tất cả vai trò';

  // Use consistent status labels used throughout the UI
  final List<String> _statusFilters = <String>[
    'Tất cả trạng thái',
    'Đang hoạt động',
    'Ngưng',
  ];
  String _statusFilterValue = 'Tất cả trạng thái';

  // Invitation filter labels; use 'Đã chọn' / 'Chưa chọn' to match selection chips
  final List<String> _inviteFilters = <String>[
    'Tất cả lời mời',
    'Đã chọn',
    'Chưa chọn',
  ];
  String _inviteFilterValue = 'Tất cả lời mời';

  final List<int> _expiryOptions = <int>[3, 7, 14, 30];
  int _selectedExpiry = 7;

  final List<String> _channelOptions = <String>['email', 'sms', 'link'];
  final Set<String> _selectedChannels = <String>{'email'};

  final Map<String, SharedPermissions> _rolePresets =
      <String, SharedPermissions>{
        'caregiver': const SharedPermissions(
          streamView: true,
          alertRead: true,
          alertAck: false,
          logAccessDays: 7,
          reportAccessDays: 30,
          notificationChannel: <String>['email'],
          profileView: true,
        ),
        'viewer': const SharedPermissions(
          streamView: true,
          alertRead: false,
          alertAck: false,
          logAccessDays: 3,
          reportAccessDays: 7,
          notificationChannel: <String>['email'],
          profileView: false,
        ),
        'admin': const SharedPermissions(
          streamView: true,
          alertRead: true,
          alertAck: true,
          logAccessDays: 30,
          reportAccessDays: 90,
          notificationChannel: <String>['email', 'sms'],
          profileView: true,
        ),
      };
  String _selectedRoleKey = 'caregiver';

  bool _isSending = false;
  Map<String, String> _sendErrors = <String, String>{};

  @override
  void initState() {
    super.initState();
    _permissionsDataSource = context.read<SharedPermissionsRemoteDataSource>();
    _caregiversDataSource = CaregiversRemoteDataSource();
    _searchController.addListener(_onKeywordChanged);
  }

  @override
  void dispose() {
    _searchDebounce?.cancel();
    _searchController.dispose();
    super.dispose();
  }

  void _onKeywordChanged() {
    _searchDebounce?.cancel();
    _searchDebounce = Timer(const Duration(milliseconds: 350), () {
      _performSearch(_searchController.text.trim());
    });
  }

  Future<void> _performSearch(String keyword) async {
    if (keyword.isEmpty) {
      setState(() {
        _searchResults = <User>[];
        _caregiverError = null;
      });
      return;
    }

    setState(() {
      _isLoadingCaregivers = true;
      _caregiverError = null;
    });

    try {
      final results = await _caregiversDataSource.search(keyword: keyword);
      if (!mounted) return;
      setState(() {
        _searchResults = results;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _caregiverError = e.toString();
      });
    } finally {
      if (mounted) {
        setState(() {
          _isLoadingCaregivers = false;
        });
      }
    }
  }

  List<User> get _filteredCaregivers {
    return _searchResults.where((user) {
      final matchesRole = () {
        if (_roleFilterValue == 'Tất cả vai trò') return true;
        // Convert the displayed filter label back to canonical key and
        // compare against the caregiver's stored role key (if available).
        final selectedKey = roleKeyForLabel(_roleFilterValue);
        if (selectedKey.isNotEmpty) {
          return user.role.toLowerCase() == selectedKey.toLowerCase();
        }
        // Fallback: compare by label string
        return user.role.toLowerCase() == _roleFilterValue.toLowerCase();
      }();
      final matchesStatus =
          _statusFilterValue == 'Tất cả trạng thái' ||
          (_statusFilterValue == 'Đang hoạt động' && user.isActive) ||
          (_statusFilterValue == 'Ngưng' && !user.isActive);
      final matchesInvite =
          _inviteFilterValue == 'Tất cả lời mời' ||
          (_inviteFilterValue == 'Đã chọn' &&
              _selectedCaregivers.containsKey(user.id)) ||
          (_inviteFilterValue == 'Chưa chọn' &&
              !_selectedCaregivers.containsKey(user.id));
      return matchesRole && matchesStatus && matchesInvite;
    }).toList();
  }

  void _toggleCaregiver(User caregiver, bool? selected) {
    setState(() {
      if (selected ?? false) {
        _selectedCaregivers[caregiver.id] = caregiver;
      } else {
        _selectedCaregivers.remove(caregiver.id);
      }
    });
  }

  void _selectAllVisible() {
    final visible = _filteredCaregivers;
    if (visible.isEmpty) return;
    setState(() {
      for (final caregiver in visible) {
        _selectedCaregivers[caregiver.id] = caregiver;
      }
    });
  }

  void _deselectAll() {
    setState(() {
      _selectedCaregivers.clear();
    });
  }

  SharedPermissions _buildPermissionsPreset() {
    final preset = _rolePresets[_selectedRoleKey] ?? _rolePresets['caregiver']!;
    return preset.copyWith(notificationChannel: _selectedChannels.toList());
  }

  /// Convert SharedPermissions / role preset into backend permission keys
  /// as expected by the API: ['stream_view','alert_read','alert_ack','profile_view']
  List<String> _permissionsFromPreset(SharedPermissions p) {
    final List<String> out = [];
    if (p.streamView) out.add('stream_view');
    if (p.alertRead) out.add('alert_read');
    if (p.alertAck) out.add('alert_ack');
    if (p.profileView) out.add('profile_view');
    return out;
  }

  Future<void> _sendInvitations() async {
    if (_selectedCaregivers.isEmpty) return;

    setState(() {
      _isSending = true;
      _sendErrors = <String, String>{};
    });

    final SharedPermissions permissions = _buildPermissionsPreset();
    final entries = _selectedCaregivers.values.toList();
    final Map<String, String> errors = <String, String>{};
    int successCount = 0;

    for (final caregiver in entries) {
      final displayName = caregiver.fullName.isNotEmpty
          ? caregiver.fullName
          : caregiver.username.isNotEmpty
          ? caregiver.username
          : caregiver.email;
      final email = caregiver.email.trim();

      if (_selectedChannels.contains('email') && email.isEmpty) {
        errors[caregiver.id] = 'Thiếu email để gửi invitation email.';
        continue;
      }

      try {
        // Convert SharedPermissions into API permission keys
        final permissionKeys = _permissionsFromPreset(permissions);
        await _permissionsDataSource.sendInvitation(
          customerId: widget.customerId,
          caregiverEmail: email,
          caregiverName: displayName,
          permissions: permissionKeys,
          durationHours:
              permissions.logAccessDays * 24 ~/ 1, // best-effort mapping
        );
        successCount += 1;
      } catch (e) {
        errors[caregiver.id] = e.toString();
      }
    }

    if (!mounted) return;

    setState(() {
      _isSending = false;
      _sendErrors = errors;
    });

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          errors.isEmpty
              ? 'Đã gửi ${entries.length} lời mời thành công.'
              : 'Đã gửi $successCount/${entries.length} lời mời. ${errors.length} thất bại.',
        ),
        behavior: SnackBarBehavior.floating,
      ),
    );

    if (errors.isEmpty) {
      Navigator.of(context).pop(true);
    }
  }

  Widget _buildSearchAndFilters() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        TextField(
          controller: _searchController,
          decoration: InputDecoration(
            labelText: 'Tìm người chăm sóc (tên, SĐT, email)',
            prefixIcon: const Icon(Icons.search),
            suffixIcon: _searchController.text.isEmpty
                ? null
                : IconButton(
                    onPressed: () {
                      _searchController.clear();
                      _performSearch('');
                    },
                    icon: const Icon(Icons.clear),
                  ),
          ),
          textInputAction: TextInputAction.search,
          onSubmitted: (value) => _performSearch(value.trim()),
        ),
        const SizedBox(height: 12),
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: <Widget>[
              _buildFilterDropdown(
                label: 'Vai trò',
                value: _roleFilterValue,
                options: _roleFilters,
                onChanged: (value) => setState(() => _roleFilterValue = value),
              ),
              const SizedBox(width: 12),
              _buildFilterDropdown(
                label: 'Trạng thái',
                value: _statusFilterValue,
                options: _statusFilters,
                onChanged: (value) =>
                    setState(() => _statusFilterValue = value),
              ),
              const SizedBox(width: 12),
              _buildFilterDropdown(
                label: 'Trạng thái lời mời',
                value: _inviteFilterValue,
                options: _inviteFilters,
                onChanged: (value) =>
                    setState(() => _inviteFilterValue = value),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildFilterDropdown({
    required String label,
    required String value,
    required List<String> options,
    required ValueChanged<String> onChanged,
  }) {
    return ConstrainedBox(
      constraints: const BoxConstraints(maxWidth: 220),
      child: DropdownButtonFormField<String>(
        value: value,
        decoration: InputDecoration(labelText: label),
        items: options
            .map(
              (option) =>
                  DropdownMenuItem<String>(value: option, child: Text(option)),
            )
            .toList(),
        onChanged: (selected) {
          if (selected != null) onChanged(selected);
        },
      ),
    );
  }

  Widget _buildCaregiverList() {
    if (_isLoadingCaregivers) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_caregiverError != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: <Widget>[
            const Icon(Icons.error_outline, size: 48, color: Colors.redAccent),
            const SizedBox(height: 12),
            Text(
              'Không thể tải danh sách người chăm sóc',
              style: Theme.of(context).textTheme.titleMedium,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              _caregiverError!,
              style: Theme.of(
                context,
              ).textTheme.bodyMedium?.copyWith(color: Colors.grey.shade600),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            ElevatedButton.icon(
              onPressed: () => _performSearch(_searchController.text.trim()),
              icon: const Icon(Icons.refresh),
              label: const Text('Thử lại'),
            ),
          ],
        ),
      );
    }

    final caregivers = _filteredCaregivers;
    if (caregivers.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 32.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: <Widget>[
              const Icon(Icons.people_outline, size: 72, color: Colors.grey),
              const SizedBox(height: 16),
              Text(
                _searchController.text.isEmpty
                    ? 'Nhập từ khóa để tìm người chăm sóc trong hệ thống.'
                    : 'Không tìm thấy người chăm sóc phù hợp. Thử điều chỉnh bộ lọc.',
                style: Theme.of(
                  context,
                ).textTheme.bodyLarge?.copyWith(color: Colors.grey.shade600),
                textAlign: TextAlign.center,
              ),
              if (_searchController.text.isNotEmpty) ...<Widget>[
                const SizedBox(height: 12),
                TextButton(
                  onPressed: () => setState(() {
                    _roleFilterValue = _roleFilters.first;
                    _statusFilterValue = _statusFilters.first;
                    _inviteFilterValue = _inviteFilters.first;
                  }),
                  child: const Text('Đặt lại bộ lọc'),
                ),
              ],
            ],
          ),
        ),
      );
    }

    return Column(
      children: <Widget>[
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 8.0, horizontal: 4.0),
          child: Row(
            children: <Widget>[
              Expanded(
                child: Text(
                  'Hiển thị ${caregivers.length} người chăm sóc',
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
              ),
              TextButton(
                onPressed: _selectAllVisible,
                child: const Text('Chọn tất cả kết quả'),
              ),
            ],
          ),
        ),
        Expanded(
          child: ListView.separated(
            itemCount: caregivers.length,
            separatorBuilder: (_, __) => const Divider(height: 1),
            itemBuilder: (context, index) {
              final caregiver = caregivers[index];
              final selected = _selectedCaregivers.containsKey(caregiver.id);
              final initials =
                  (caregiver.fullName.isNotEmpty
                          ? caregiver.fullName
                          : caregiver.username)
                      .characters
                      .take(2)
                      .toString()
                      .toUpperCase();

              return InkWell(
                onTap: () => _toggleCaregiver(caregiver, !selected),
                child: Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 4.0,
                    vertical: 12.0,
                  ),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: <Widget>[
                      Checkbox(
                        value: selected,
                        onChanged: (value) =>
                            _toggleCaregiver(caregiver, value),
                      ),
                      const SizedBox(width: 8),
                      CircleAvatar(
                        radius: 20,
                        backgroundColor: Colors.blue.shade100,
                        child: Text(
                          initials,
                          style: const TextStyle(fontWeight: FontWeight.bold),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: <Widget>[
                            Text(
                              caregiver.fullName.isNotEmpty
                                  ? caregiver.fullName
                                  : caregiver.username,
                              style: Theme.of(context).textTheme.titleMedium
                                  ?.copyWith(fontWeight: FontWeight.w600),
                            ),
                            const SizedBox(height: 4),
                            Wrap(
                              spacing: 8,
                              runSpacing: 4,
                              children: <Widget>[
                                if (caregiver.email.isNotEmpty)
                                  Text(
                                    caregiver.email,
                                    style: Theme.of(context).textTheme.bodySmall
                                        ?.copyWith(color: Colors.grey.shade700),
                                  ),
                                if (caregiver.phone.isNotEmpty)
                                  Text(
                                    caregiver.phone,
                                    style: Theme.of(context).textTheme.bodySmall
                                        ?.copyWith(color: Colors.grey.shade700),
                                  ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            Wrap(
                              spacing: 8,
                              runSpacing: 4,
                              children: <Widget>[
                                Chip(
                                  label: Text(
                                    caregiver.role.isNotEmpty
                                        ? caregiver.role
                                        : 'Chưa phân loại',
                                  ),
                                  backgroundColor: Colors.blue.shade50,
                                ),
                                Chip(
                                  label: Text(
                                    caregiver.isActive
                                        ? 'Đang hoạt động'
                                        : 'Ngưng',
                                  ),
                                  backgroundColor: caregiver.isActive
                                      ? Colors.green.shade50
                                      : Colors.orange.shade50,
                                ),
                                if (selected)
                                  Chip(
                                    label: const Text('Đã chọn'),
                                    backgroundColor: Colors.purple.shade50,
                                  ),
                              ],
                            ),
                          ],
                        ),
                      ),
                      if (selected)
                        Icon(
                          Icons.check_circle,
                          color: Colors.purple.shade300,
                          size: 20,
                        ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _buildSelectionPanel({required bool isWide}) {
    final selectedList = _selectedCaregivers.values.toList();
    return Card(
      margin: EdgeInsets.only(
        left: isWide ? 16.0 : 0,
        right: isWide ? 0 : 0,
        top: 16.0,
        bottom: 16.0,
      ),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Row(
              children: <Widget>[
                Expanded(
                  child: Text(
                    'Đã chọn ${selectedList.length} caregiver',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                if (selectedList.isNotEmpty)
                  TextButton(
                    onPressed: _deselectAll,
                    child: const Text('Bỏ chọn tất cả'),
                  ),
              ],
            ),
            const SizedBox(height: 12),
            if (selectedList.isEmpty)
              Text(
                'Chọn người chăm sóc để gửi lời mời. Danh sách sẽ xuất hiện tại đây.',
                style: Theme.of(
                  context,
                ).textTheme.bodyMedium?.copyWith(color: Colors.grey.shade600),
              )
            else
              SizedBox(
                height: isWide ? 280 : 160,
                child: ListView.builder(
                  itemCount: selectedList.length,
                  itemBuilder: (context, index) {
                    final caregiver = selectedList[index];
                    return ListTile(
                      dense: true,
                      contentPadding: EdgeInsets.zero,
                      leading: CircleAvatar(
                        backgroundColor: Colors.purple.shade100,
                        child: Text(
                          caregiver.fullName.isNotEmpty
                              ? caregiver.fullName.characters
                                    .take(1)
                                    .toString()
                                    .toUpperCase()
                              : caregiver.username.characters
                                    .take(1)
                                    .toString()
                                    .toUpperCase(),
                        ),
                      ),
                      title: Text(
                        caregiver.fullName.isNotEmpty
                            ? caregiver.fullName
                            : caregiver.username,
                      ),
                      subtitle: Text(
                        caregiver.email.isNotEmpty
                            ? caregiver.email
                            : caregiver.phone,
                      ),
                      trailing: IconButton(
                        icon: const Icon(Icons.close),
                        onPressed: () => _toggleCaregiver(caregiver, false),
                      ),
                    );
                  },
                ),
              ),
            const Divider(height: 32),
            Text(
              'Xem trước lời mời',
              style: Theme.of(
                context,
              ).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 8),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.grey.shade100,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Text(
                    'Kênh gửi: ${_selectedChannels.map((c) => c.toUpperCase()).join(', ')}',
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Hết hạn sau $_selectedExpiry ngày',
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Vai trò: $_selectedRoleLabel',
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                ],
              ),
            ),
            if (_sendErrors.isNotEmpty) ...<Widget>[
              const SizedBox(height: 16),
              Text(
                'Lỗi gần nhất',
                style: Theme.of(context).textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w600,
                  color: Colors.red,
                ),
              ),
              const SizedBox(height: 8),
              SizedBox(
                height: 80,
                child: ListView(
                  children: _sendErrors.entries
                      .take(3)
                      .map(
                        (entry) => Padding(
                          padding: const EdgeInsets.symmetric(vertical: 4.0),
                          child: Text(
                            '${_selectedCaregivers[entry.key]?.fullName ?? entry.key}:\n${entry.value}',
                            style: Theme.of(context).textTheme.bodySmall
                                ?.copyWith(color: Colors.red.shade700),
                          ),
                        ),
                      )
                      .toList(),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  String get _selectedRoleLabel {
    return roleLabelForKey(_selectedRoleKey);
  }

  Widget _buildInvitationSettings() {
    return Card(
      margin: const EdgeInsets.symmetric(vertical: 16.0),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Text(
              'Thiết lập lời mời',
              style: Theme.of(
                context,
              ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 12),
            Text(
              'Kênh gửi',
              style: Theme.of(
                context,
              ).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w500),
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              children: _channelOptions.map((channel) {
                final isSelected = _selectedChannels.contains(channel);
                return FilterChip(
                  label: Text(channel.toUpperCase()),
                  selected: isSelected,
                  onSelected: (value) {
                    setState(() {
                      if (value) {
                        _selectedChannels.add(channel);
                      } else {
                        _selectedChannels.remove(channel);
                        if (_selectedChannels.isEmpty) {
                          _selectedChannels.add('email');
                        }
                      }
                    });
                  },
                );
              }).toList(),
            ),
            const SizedBox(height: 16),
            Row(
              children: <Widget>[
                Expanded(
                  child: DropdownButtonFormField<int>(
                    value: _selectedExpiry,
                    decoration: const InputDecoration(
                      labelText: 'Thời hạn lời mời',
                    ),
                    items: _expiryOptions
                        .map(
                          (day) => DropdownMenuItem<int>(
                            value: day,
                            child: Text('$day ngày'),
                          ),
                        )
                        .toList(),
                    onChanged: (value) {
                      if (value != null) {
                        setState(() => _selectedExpiry = value);
                      }
                    },
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: DropdownButtonFormField<String>(
                    value: _selectedRoleKey,
                    decoration: const InputDecoration(
                      labelText: 'Quyền khi tham gia',
                    ),
                    items: const <DropdownMenuItem<String>>[
                      DropdownMenuItem(
                        value: 'caregiver',
                        child: Text('Người chăm sóc'),
                      ),
                    ],
                    onChanged: (value) {
                      if (value != null) {
                        setState(() => _selectedRoleKey = value);
                      }
                    },
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.grey.shade300),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  const Text('Quyền chi tiết:'),
                  const SizedBox(height: 6),
                  _buildPermissionRow(
                    'Xem livestream',
                    _rolePresets[_selectedRoleKey]?.streamView ?? true,
                  ),
                  _buildPermissionRow(
                    'Đọc cảnh báo',
                    _rolePresets[_selectedRoleKey]?.alertRead ?? true,
                  ),
                  _buildPermissionRow(
                    'Xác nhận cảnh báo',
                    _rolePresets[_selectedRoleKey]?.alertAck ?? false,
                  ),
                  _buildPermissionRow(
                    'Xem hồ sơ',
                    _rolePresets[_selectedRoleKey]?.profileView ?? true,
                  ),
                  Text(
                    'Log ${_rolePresets[_selectedRoleKey]?.logAccessDays ?? 0} ngày | Report ${_rolePresets[_selectedRoleKey]?.reportAccessDays ?? 0} ngày',
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPermissionRow(String label, bool enabled) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 4.0),
      child: Row(
        children: <Widget>[
          Icon(
            enabled ? Icons.check_circle : Icons.cancel,
            size: 18,
            color: enabled ? Colors.green : Colors.grey,
          ),
          const SizedBox(width: 8),
          Text(label),
        ],
      ),
    );
  }

  Widget _buildFooter() {
    final selectedCount = _selectedCaregivers.length;
    return SafeArea(
      top: false,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: Colors.white,
          boxShadow: <BoxShadow>[
            BoxShadow(
              // Avoid deprecated withOpacity; use explicit RGBA
              color: const Color.fromRGBO(0, 0, 0, 0.05),
              blurRadius: 8,
              offset: const Offset(0, -2),
            ),
          ],
        ),
        child: Row(
          children: <Widget>[
            OutlinedButton(
              onPressed: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Tính năng lưu nháp đang được phát triển.'),
                  ),
                );
              },
              child: const Text('Lưu nháp'),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: FilledButton(
                onPressed: selectedCount == 0 || _isSending
                    ? null
                    : _sendInvitations,
                child: _isSending
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : Text('Gửi $selectedCount lời mời'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Gửi lời mời'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) {
            final isWide = constraints.maxWidth > 900;
            return Column(
              children: <Widget>[
                Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16.0,
                    vertical: 12.0,
                  ),
                  child: _buildSearchAndFilters(),
                ),
                // Make the main content scrollable on small screens so the
                // invitation settings won't cause a bottom overflow when the
                // soft keyboard is opened or vertical space is constrained.
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16.0),
                    child: isWide
                        ? Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: <Widget>[
                              Expanded(child: _buildCaregiverList()),
                              SizedBox(width: isWide ? 16 : 0),
                              SizedBox(
                                width: 320,
                                child: _buildSelectionPanel(isWide: true),
                              ),
                            ],
                          )
                        : Column(
                            children: <Widget>[
                              // On narrow screens, combine the caregiver list and
                              // selection panel inside a scrollable area so the
                              // footer can stay fixed.
                              Expanded(
                                child: SingleChildScrollView(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.stretch,
                                    children: <Widget>[
                                      // Keep the list constrained by a fixed height
                                      // to avoid infinite height errors when nested
                                      // in SingleChildScrollView.
                                      SizedBox(
                                        height:
                                            MediaQuery.of(context).size.height *
                                            0.45,
                                        child: _buildCaregiverList(),
                                      ),
                                      const SizedBox(height: 12),
                                      _buildSelectionPanel(isWide: false),
                                      const SizedBox(height: 12),
                                      // Invitation settings moved into scroll area
                                      _buildInvitationSettings(),
                                      const SizedBox(height: 12),
                                    ],
                                  ),
                                ),
                              ),
                            ],
                          ),
                  ),
                ),
                // On wide layouts the invitation settings are placed in the
                // right column; on narrow layouts we already included it in
                // the scrollable area above. For wide layouts show nothing
                // here to avoid duplication.
                if (isWide)
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16.0),
                    child: _buildInvitationSettings(),
                  ),
              ],
            );
          },
        ),
      ),
      bottomNavigationBar: _buildFooter(),
    );
  }
}
