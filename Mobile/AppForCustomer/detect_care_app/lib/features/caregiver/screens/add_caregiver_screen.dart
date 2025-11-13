import 'package:detect_care_app/core/network/api_client.dart';
import 'package:detect_care_app/core/services/invitation_notification_service.dart';
import 'package:detect_care_app/core/utils/pin_utils.dart';
import 'package:detect_care_app/features/auth/data/auth_storage.dart';
import 'package:detect_care_app/features/auth/models/user.dart';
import 'package:detect_care_app/features/caregiver/data/assignment_api.dart';
import 'package:detect_care_app/features/caregivers/data/caregivers_remote_data_source.dart';
import 'package:flutter/material.dart';

class AddCaregiverScreen extends StatefulWidget {
  const AddCaregiverScreen({super.key});

  @override
  State<AddCaregiverScreen> createState() => _AddCaregiverScreenState();
}

class _AddCaregiverScreenState extends State<AddCaregiverScreen>
    with TickerProviderStateMixin {
  final _formKey = GlobalKey<FormState>();
  final _searchController = TextEditingController();
  String _selectedRole = 'Người chăm sóc chính';

  final List<String> _roles = [
    'Người chăm sóc chính',
    'Người hỗ trợ',
    'Người giám sát',
  ];

  bool _isSubmitting = false;
  bool _isSearching = false;
  String? _submitError;
  List<User> _searchResults = [];
  User? _selectedCaregiver;

  late AnimationController _submitController;
  late Animation<double> _submitAnimation;
  late final AssignmentApi _assignmentApi;
  late final CaregiversRemoteDataSource _caregiversDataSource;

  @override
  void initState() {
    super.initState();
    _assignmentApi = AssignmentApi(
      ApiClient(tokenProvider: AuthStorage.getAccessToken),
    );
    _caregiversDataSource = CaregiversRemoteDataSource();
    _submitController = AnimationController(
      duration: const Duration(milliseconds: 500),
      vsync: this,
    );
    _submitAnimation = Tween<double>(begin: 1.0, end: 0.95).animate(
      CurvedAnimation(parent: _submitController, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _searchController.dispose();
    _submitController.dispose();
    super.dispose();
  }

  Future<void> _searchCaregivers(String keyword) async {
    if (keyword.isEmpty || _isSearching) return;

    setState(() {
      _isSearching = true;
      _searchResults = [];
      _submitError = null;
    });

    try {
      final results = await _caregiversDataSource.search(keyword: keyword);
      setState(() {
        _searchResults = results;
        _isSearching = false;
      });
    } catch (e) {
      setState(() {
        _isSearching = false;
        _submitError = e.toString();
      });
    }
  }

  Future<void> _submitForm() async {
    if (_selectedCaregiver == null) {
      setState(() {
        _submitError = 'Vui lòng chọn người chăm sóc';
      });
      return;
    }

    setState(() {
      _isSubmitting = true;
      _submitError = null;
    });

    try {
      // Animate button press
      await _submitController.forward();
      await _submitController.reverse();

      // Get current user ID
      final customerId = await AuthStorage.getUserId();
      if (customerId == null) {
        throw Exception('Không thể lấy thông tin người dùng hiện tại');
      }

      // Create assignment with selected caregiver
      await _assignmentApi.createAssignment(
        customerId: customerId,
        caregiverId: _selectedCaregiver!.id,
        assignmentType: _selectedRole,
      );

      // Send invitation notification
      try {
        final notificationService = InvitationNotificationService();
        // Generate a PIN for the invitation; for existing caregivers the server
        // may already have a PIN but sending a generated PIN here is safe.
        final pin = PinUtils.generatePin(length: 6);
        await notificationService.sendInvitation(
          recipientEmail: _selectedCaregiver!.email,
          recipientPhone: _selectedCaregiver!.phone,
          recipientName: _selectedCaregiver!.fullName,
          inviterName: 'Người dùng hệ thống',
          invitationLink:
              'https://detectcare.app/invite/${_selectedCaregiver!.id}',
          pin: pin,
          sendEmail: true,
          sendSMS: false,
        );
        debugPrint('[AddCaregiver] Invitation sent successfully');
      } catch (e) {
        debugPrint('[AddCaregiver] Failed to send invitation: $e');
        // Don't fail the whole process if notification fails
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Đã gửi lời mời đến người chăm sóc thành công!'),
            backgroundColor: Colors.green,
          ),
        );
        Navigator.of(context).pop();
      }
    } catch (e) {
      setState(() {
        _isSubmitting = false;
        _submitError = e.toString();
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Lỗi gửi lời mời: ${e.toString()}'),
            action: SnackBarAction(label: 'Thử lại', onPressed: _submitForm),
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isSubmitting = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Column(
          children: [
            _buildHeader(context),
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(16),
                child: Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const SizedBox(height: 24),
                      Text(
                        'Thêm người chăm sóc',
                        style: Theme.of(context).textTheme.headlineSmall
                            ?.copyWith(fontWeight: FontWeight.w600),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Tìm kiếm và mời người chăm sóc đã đăng ký trong hệ thống.',
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: Colors.grey.shade600,
                        ),
                      ),
                      const SizedBox(height: 32),
                      _buildSearchField(),
                      const SizedBox(height: 16),
                      if (_isSearching)
                        const Center(child: CircularProgressIndicator())
                      else if (_searchResults.isNotEmpty)
                        _buildSearchResults(),
                      const SizedBox(height: 16),
                      if (_selectedCaregiver != null) ...[
                        _buildSelectedCaregiver(),
                        const SizedBox(height: 16),
                        _buildRoleDropdown(),
                        const SizedBox(height: 32),
                        SizedBox(
                          width: double.infinity,
                          child: AnimatedBuilder(
                            animation: _submitAnimation,
                            builder: (context, child) {
                              return Transform.scale(
                                scale: _submitAnimation.value,
                                child: ElevatedButton(
                                  onPressed: _isSubmitting ? null : _submitForm,
                                  style: ElevatedButton.styleFrom(
                                    padding: const EdgeInsets.symmetric(
                                      vertical: 16,
                                    ),
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                    backgroundColor: _isSubmitting
                                        ? Colors.grey
                                        : Theme.of(context).primaryColor,
                                  ),
                                  child: _isSubmitting
                                      ? Row(
                                          mainAxisAlignment:
                                              MainAxisAlignment.center,
                                          children: [
                                            SizedBox(
                                              width: 20,
                                              height: 20,
                                              child: CircularProgressIndicator(
                                                strokeWidth: 2,
                                                valueColor:
                                                    const AlwaysStoppedAnimation<
                                                      Color
                                                    >(Colors.white),
                                              ),
                                            ),
                                            const SizedBox(width: 12),
                                            const Text('Đang gửi lời mời...'),
                                          ],
                                        )
                                      : const Text('Gửi lời mời'),
                                ),
                              );
                            },
                          ),
                        ),
                      ],
                      if (_submitError != null)
                        Padding(
                          padding: const EdgeInsets.only(top: 16),
                          child: Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: Colors.red.shade50,
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: Colors.red.shade200),
                            ),
                            child: Row(
                              children: [
                                Icon(
                                  Icons.error_outline,
                                  color: Colors.red.shade600,
                                  size: 20,
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    _submitError!,
                                    style: TextStyle(
                                      color: Colors.red.shade700,
                                      fontSize: 14,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
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
            'Thêm người chăm sóc',
            style: Theme.of(
              context,
            ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w600),
          ),
          const Spacer(),
        ],
      ),
    );
  }

  Widget _buildSearchField() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Tìm kiếm người chăm sóc',
          style: Theme.of(
            context,
          ).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w500),
        ),
        const SizedBox(height: 8),
        TextFormField(
          controller: _searchController,
          decoration: InputDecoration(
            hintText: 'Nhập tên, email hoặc số điện thoại',
            prefixIcon: const Icon(Icons.search),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(color: Colors.grey.shade300),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(color: Colors.grey.shade300),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(color: Theme.of(context).primaryColor),
            ),
            contentPadding: const EdgeInsets.symmetric(
              horizontal: 16,
              vertical: 16,
            ),
          ),
          onChanged: (value) {
            if (value.length >= 2) {
              _searchCaregivers(value);
            } else {
              setState(() {
                _searchResults = [];
              });
            }
          },
        ),
      ],
    );
  }

  Widget _buildSearchResults() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Kết quả tìm kiếm',
          style: Theme.of(context).textTheme.titleSmall?.copyWith(
            fontWeight: FontWeight.w500,
            color: Colors.grey.shade700,
          ),
        ),
        const SizedBox(height: 8),
        Container(
          constraints: const BoxConstraints(maxHeight: 200),
          decoration: BoxDecoration(
            border: Border.all(color: Colors.grey.shade300),
            borderRadius: BorderRadius.circular(12),
          ),
          child: ListView.builder(
            shrinkWrap: true,
            itemCount: _searchResults.length,
            itemBuilder: (context, index) {
              final caregiver = _searchResults[index];
              final isSelected = _selectedCaregiver?.id == caregiver.id;
              return ListTile(
                leading: CircleAvatar(
                  backgroundColor: Theme.of(
                    context,
                  ).primaryColor.withValues(alpha: 0.1),
                  child: Icon(
                    Icons.person,
                    color: Theme.of(context).primaryColor,
                  ),
                ),
                title: Text(
                  caregiver.fullName,
                  style: TextStyle(
                    fontWeight: isSelected
                        ? FontWeight.w600
                        : FontWeight.normal,
                  ),
                ),
                subtitle: Text('${caregiver.email} • ${caregiver.phone}'),
                trailing: isSelected
                    ? Icon(
                        Icons.check_circle,
                        color: Theme.of(context).primaryColor,
                      )
                    : null,
                onTap: () {
                  setState(() {
                    _selectedCaregiver = caregiver;
                    _searchController.text = caregiver.fullName;
                    _searchResults = [];
                  });
                },
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _buildSelectedCaregiver() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.blue.shade50,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.blue.shade200),
      ),
      child: Row(
        children: [
          CircleAvatar(
            backgroundColor: Theme.of(
              context,
            ).primaryColor.withValues(alpha: 0.1),
            child: Icon(Icons.person, color: Theme.of(context).primaryColor),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _selectedCaregiver!.fullName,
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
                Text(
                  '${_selectedCaregiver!.email} • ${_selectedCaregiver!.phone}',
                  style: Theme.of(
                    context,
                  ).textTheme.bodySmall?.copyWith(color: Colors.grey.shade600),
                ),
              ],
            ),
          ),
          IconButton(
            onPressed: () {
              setState(() {
                _selectedCaregiver = null;
                _searchController.clear();
              });
            },
            icon: const Icon(Icons.close),
            style: IconButton.styleFrom(foregroundColor: Colors.grey.shade600),
          ),
        ],
      ),
    );
  }

  Widget _buildRoleDropdown() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Vai trò',
          style: Theme.of(
            context,
          ).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w500),
        ),
        const SizedBox(height: 8),
        DropdownButtonFormField<String>(
          value: _selectedRole,
          decoration: InputDecoration(
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(color: Colors.grey.shade300),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(color: Colors.grey.shade300),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(color: Theme.of(context).primaryColor),
            ),
            contentPadding: const EdgeInsets.symmetric(
              horizontal: 16,
              vertical: 16,
            ),
          ),
          items: _roles.map((role) {
            return DropdownMenuItem(value: role, child: Text(role));
          }).toList(),
          onChanged: (value) {
            if (value != null) {
              setState(() {
                _selectedRole = value;
              });
            }
          },
        ),
      ],
    );
  }
}
