import 'package:detect_care_app/features/auth/providers/auth_provider.dart';
import 'package:detect_care_app/features/auth/data/auth_storage.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../assignments/data/assignments_remote_data_source.dart';
import '../services/fcm_quick_send_controller.dart';

class FcmQuickSendSheet extends StatefulWidget {
  const FcmQuickSendSheet({super.key});

  @override
  State<FcmQuickSendSheet> createState() => _FcmQuickSendSheetState();
}

class _FcmQuickSendSheetState extends State<FcmQuickSendSheet> {
  final _msgCtl = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  final _bg = const Color(0xFFF8FAFC);

  bool _loadingList = true;
  bool _sending = false;
  String _selected = '_ALL_';
  List<_CustomerOption> _customers = const [];
  String? _errorMessage;
  String? _userRole;

  late final FcmQuickSendController _controller;
  final _assignDs = AssignmentsRemoteDataSource();

  Future<String?> _getUserRole() async {
    try {
      final userJson = await AuthStorage.getUserJson();
      return userJson?['role'] as String?;
    } catch (e) {
      debugPrint('❌ FcmQuickSendSheet: Lỗi lấy role: $e');
      return null;
    }
  }

  String _getRecipientLabel(String? role) {
    return (role == 'caregiver') ? 'khách hàng' : 'người chăm sóc';
  }

  @override
  void initState() {
    super.initState();
    _controller = FcmQuickSendController.create();
    _initializeUser();
  }

  Future<void> _initializeUser() async {
    final role = await _getUserRole();
    if (mounted) {
      setState(() => _userRole = role);
    }
    _loadCustomers();
  }

  Future<void> _loadCustomers() async {
    setState(() {
      _loadingList = true;
      _errorMessage = null;
    });

    try {
      final list = await _assignDs.listPending();
      final seen = <String>{};
      final opts = <_CustomerOption>[];

      // Lấy role để xác định logic hiển thị
      final role = await _getUserRole();
      debugPrint('🔍 FcmQuickSendSheet: User role = $role');

      for (final a in list) {
        final status = a.status?.toLowerCase();
        if ((status == 'accepted' ||
                status == 'active' ||
                status == 'approved') &&
            a.isActive) {
          String targetId;
          String displayName;

          if (role == 'caregiver') {
            // Caregiver gửi cho customers
            targetId = a.customerId;
            displayName = (a.customerName?.trim().isNotEmpty == true)
                ? a.customerName!.trim()
                : 'Khách hàng ${a.customerId.substring(0, 8)}';
          } else {
            // Customer gửi cho caregivers
            targetId = a.caregiverId;
            displayName = (a.caregiverName?.trim().isNotEmpty == true)
                ? a.caregiverName!.trim()
                : 'Người chăm sóc ${a.caregiverId.substring(0, 8)}';
          }

          if (seen.add(targetId)) {
            opts.add(_CustomerOption(id: targetId, name: displayName));
          }
        }
      }

      opts.sort((a, b) => a.name.toLowerCase().compareTo(b.name.toLowerCase()));

      if (mounted) {
        setState(() {
          _customers = opts;
          _loadingList = false;
        });
      }
    } catch (e) {
      if (mounted) {
        final role = await _getUserRole();
        setState(() {
          _loadingList = false;
          String friendlyMessage;

          if (e.toString().contains('403') ||
              e.toString().contains('Forbidden')) {
            friendlyMessage =
                'Bạn không có quyền xem danh sách ${_getRecipientLabel(role)}. Vui lòng kiểm tra lại quyền truy cập.';
          } else if (e.toString().contains('404') ||
              e.toString().contains('Not Found')) {
            friendlyMessage =
                'Không tìm thấy danh sách ${_getRecipientLabel(role)}. Có thể chưa có ai được phân công.';
          } else if (e.toString().contains('Network') ||
              e.toString().contains('Connection') ||
              e.toString().contains('timeout')) {
            friendlyMessage =
                'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng và thử lại.';
          } else if (e.toString().contains('500') ||
              e.toString().contains('Internal Server Error')) {
            friendlyMessage =
                'Máy chủ đang gặp sự cố. Vui lòng thử lại sau ít phút.';
          } else {
            friendlyMessage =
                'Không thể tải danh sách ${_getRecipientLabel(role)}. Vui lòng thử lại.';
          }

          _errorMessage = friendlyMessage;
        });
      }
    }
  }

  @override
  void dispose() {
    _msgCtl.dispose();
    _controller.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    debugPrint('🚀 [FcmQuickSendSheet] _send started');

    if (_sending) {
      debugPrint('⏳ [FcmQuickSendSheet] Already sending, ignoring request');
      return;
    }

    if (!_formKey.currentState!.validate()) {
      debugPrint('❌ [FcmQuickSendSheet] Form validation failed');
      return;
    }

    final msg = _msgCtl.text.trim();
    debugPrint(
      '💬 [FcmQuickSendSheet] Message: "$msg" (length: ${msg.length})',
    );

    if (msg.isEmpty) {
      debugPrint('❌ [FcmQuickSendSheet] Message is empty');
      _showSnackBar(
        'Vui lòng nhập nội dung thông báo trước khi gửi',
        isError: true,
      );
      return;
    }

    if (msg.length < 3) {
      debugPrint(
        '❌ [FcmQuickSendSheet] Message too short: ${msg.length} chars',
      );
      _showSnackBar(
        'Nội dung thông báo quá ngắn. Vui lòng nhập ít nhất 3 ký tự.',
        isError: true,
      );
      return;
    }

    if (msg.length > 512) {
      debugPrint(
        '❌ [FcmQuickSendSheet] Message too long: ${msg.length}/512 chars',
      );
      _showSnackBar(
        'Nội dung quá dài (${msg.length}/512 ký tự). Vui lòng rút gọn lại.',
        isError: true,
      );
      return;
    }

    final authProvider = context.read<AuthProvider>();
    if (authProvider.user?.id == null) {
      debugPrint('❌ [FcmQuickSendSheet] User ID is null');
      _showSnackBar(
        'Không thể xác định thông tin người gửi. Vui lòng đăng nhập lại.',
        isError: true,
      );
      return;
    }

    final userId = authProvider.user!.id;
    final role = await _getUserRole();

    debugPrint('👤 [FcmQuickSendSheet] User ID: $userId, Role: $role');
    debugPrint('🎯 [FcmQuickSendSheet] Selected receiver: $_selected');

    setState(() => _sending = true);
    debugPrint('⏳ [FcmQuickSendSheet] Setting sending state to true');

    try {
      Map<String, dynamic> resp;

      if (role == 'caregiver') {
        debugPrint(
          '👨‍⚕️ [FcmQuickSendSheet] User is CAREGIVER - calling sendMessage',
        );
        debugPrint(
          '📤 [FcmQuickSendSheet] Caregiver $userId -> Customer $_selected',
        );
        // Caregiver gửi cho customers
        resp = await _controller.sendMessage(
          caregiverId: userId,
          message: msg,
          toCustomerId: _selected == '_ALL_' ? null : _selected,
        );
      } else {
        debugPrint(
          '👤 [FcmQuickSendSheet] User is CUSTOMER - calling sendMessageAsCustomer',
        );
        debugPrint(
          '📤 [FcmQuickSendSheet] Customer $userId -> Caregiver $_selected',
        );
        // Customer gửi cho caregivers - cần implement method mới
        resp = await _controller.sendMessageAsCustomer(
          customerId: userId,
          message: msg,
          toCaregiverId: _selected == '_ALL_' ? null : _selected,
        );
      }

      debugPrint('📨 [FcmQuickSendSheet] FCM controller response: $resp');
      final ok = (resp['successCount'] ?? 0) as int;
      final fail = (resp['failureCount'] ?? 0) as int;
      final info = resp['info'] as String?;

      debugPrint(
        '✅ [FcmQuickSendSheet] Success: $ok, Failed: $fail, Info: $info',
      );

      if (!mounted) return;

      if (ok == 0 && fail == 0 && info == 'no_recipients') {
        final role = await _getUserRole();
        final recipientLabel = _getRecipientLabel(role);
        _showSnackBar(
          'Hiện tại không có $recipientLabel nào được phân công hoặc đang hoạt động. Vui lòng kiểm tra lại danh sách phân công.',
          isError: true,
        );
      } else if (ok > 0) {
        _showSnackBar(
          'Đã gửi thành công cho $ok người${fail > 0 ? ', lỗi $fail người' : ''}',
        );
        _clearForm();
        Navigator.of(context).maybePop();
      } else {
        _showSnackBar(
          'Gửi thất bại cho tất cả $fail người nhận. Vui lòng kiểm tra kết nối mạng và thử lại.',
          isError: true,
        );
      }
    } catch (e) {
      if (!mounted) return;

      String friendlyMessage;
      String errorStr = e.toString();

      if (errorStr.contains('403') || errorStr.contains('Forbidden')) {
        friendlyMessage =
            'Bạn không có quyền gửi thông báo. Vui lòng liên hệ quản trị viên.';
      } else if (errorStr.contains('400') ||
          errorStr.contains('validation') ||
          errorStr.contains('VALIDATION_ERROR')) {
        if (errorStr.contains('toUserIds is empty')) {
          final role = await _getUserRole();
          final recipientLabel = _getRecipientLabel(role);
          friendlyMessage =
              'Không có $recipientLabel nào để gửi. Vui lòng kiểm tra lại danh sách phân công.';
        } else {
          friendlyMessage =
              'Thông tin gửi không hợp lệ. Vui lòng kiểm tra lại nội dung tin nhắn.';
        }
      } else if (errorStr.contains('Network') ||
          errorStr.contains('Connection') ||
          errorStr.contains('timeout')) {
        friendlyMessage =
            'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng và thử lại.';
      } else if (errorStr.contains('500') ||
          errorStr.contains('Internal Server Error')) {
        friendlyMessage =
            'Máy chủ đang gặp sự cố. Vui lòng thử lại sau ít phút.';
      } else if (errorStr.contains('ArgumentError')) {
        // Xử lý các lỗi validation từ client
        if (errorStr.contains('Message không được để trống')) {
          friendlyMessage = 'Vui lòng nhập nội dung thông báo.';
        } else if (errorStr.contains('không được dài quá')) {
          friendlyMessage = 'Nội dung thông báo quá dài. Vui lòng rút gọn lại.';
        } else {
          friendlyMessage =
              'Thông tin nhập vào không hợp lệ. Vui lòng kiểm tra lại.';
        }
      } else {
        friendlyMessage =
            'Có lỗi xảy ra khi gửi thông báo. Vui lòng thử lại sau.';
      }

      _showSnackBar(friendlyMessage, isError: true);
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  void _showSnackBar(String message, {bool isError = false}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            Icon(
              isError ? Icons.error_outline : Icons.check_circle_outline,
              color: Colors.white,
              size: 20,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(message, style: const TextStyle(fontSize: 14)),
            ),
          ],
        ),
        backgroundColor: isError ? Colors.red.shade600 : Colors.green.shade600,
        behavior: SnackBarBehavior.floating,
        duration: Duration(seconds: isError ? 5 : 3),
        margin: const EdgeInsets.all(16),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        action: isError
            ? SnackBarAction(
                label: 'Đóng',
                textColor: Colors.white70,
                onPressed: () {
                  ScaffoldMessenger.of(context).hideCurrentSnackBar();
                },
              )
            : null,
      ),
    );
  }

  void _clearForm() {
    _msgCtl.clear();
    setState(() {
      _selected = '_ALL_';
      _errorMessage = null;
    });
  }

  void _retryLoadCustomers() {
    setState(() {
      _loadingList = true;
      _errorMessage = null;
    });
    _loadCustomers();
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => FocusScope.of(context).unfocus(),
      child: Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 20, 16, 24),
            child: Form(
              key: _formKey,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Header
                  Row(
                    children: [
                      Icon(
                        Icons.notifications_active_rounded,
                        color: Theme.of(context).primaryColor,
                        size: 24,
                      ),
                      const SizedBox(width: 8),
                      const Expanded(
                        child: Text(
                          'Gửi thông báo',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                      IconButton(
                        onPressed: () => Navigator.of(context).pop(),
                        icon: const Icon(Icons.close),
                        visualDensity: VisualDensity.compact,
                      ),
                    ],
                  ),

                  const SizedBox(height: 20),

                  // Error message
                  if (_errorMessage != null) ...[
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.red.shade50,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: Colors.red.shade200),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Icon(
                                Icons.error_outline,
                                color: Colors.red.shade700,
                                size: 20,
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  _errorMessage!,
                                  style: TextStyle(
                                    color: Colors.red.shade700,
                                    fontSize: 14,
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Align(
                            alignment: Alignment.centerRight,
                            child: TextButton.icon(
                              onPressed: _retryLoadCustomers,
                              icon: Icon(
                                Icons.refresh,
                                size: 16,
                                color: Colors.red.shade700,
                              ),
                              label: Text(
                                'Thử lại',
                                style: TextStyle(
                                  color: Colors.red.shade700,
                                  fontSize: 12,
                                ),
                              ),
                              style: TextButton.styleFrom(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 8,
                                  vertical: 4,
                                ),
                                minimumSize: Size.zero,
                                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],

                  // Recipient dropdown
                  const Text(
                    'Người nhận',
                    style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 8),
                  DropdownButtonFormField<String>(
                    value: _selected,
                    items: [
                      const DropdownMenuItem(
                        value: '_ALL_',
                        child: Row(
                          children: [
                            Icon(Icons.group, size: 20),
                            SizedBox(width: 8),
                            Text('Tất cả người nhận'),
                          ],
                        ),
                      ),
                      ..._customers.map(
                        (c) => DropdownMenuItem(
                          value: c.id,
                          child: Row(
                            children: [
                              const Icon(Icons.person, size: 20),
                              const SizedBox(width: 8),
                              Expanded(child: Text(c.name)),
                            ],
                          ),
                        ),
                      ),
                    ],
                    onChanged: _loadingList
                        ? null
                        : (v) => setState(() => _selected = v ?? '_ALL_'),
                    decoration: InputDecoration(
                      filled: true,
                      fillColor: _bg,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide.none,
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide(color: Colors.grey.shade300),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide(
                          color: Theme.of(context).primaryColor,
                          width: 2,
                        ),
                      ),
                    ),
                  ),

                  if (_loadingList) ...[
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Theme.of(context).primaryColor,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          'Đang tải danh sách ${_getRecipientLabel(_userRole)}...',
                          style: const TextStyle(
                            fontSize: 12,
                            color: Colors.grey,
                          ),
                        ),
                      ],
                    ),
                  ],

                  const SizedBox(height: 16),

                  // Message input
                  const Text(
                    'Nội dung thông báo',
                    style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 8),
                  TextFormField(
                    controller: _msgCtl,
                    minLines: 3,
                    maxLines: 5,
                    maxLength: 512,
                    textInputAction: TextInputAction.newline,
                    validator: (value) {
                      if (value == null || value.trim().isEmpty) {
                        return 'Vui lòng nhập nội dung thông báo trước khi gửi';
                      }
                      if (value.trim().length < 3) {
                        return 'Nội dung thông báo quá ngắn (tối thiểu 3 ký tự)';
                      }
                      if (value.length > 512) {
                        return 'Nội dung quá dài (${value.length}/512 ký tự)';
                      }
                      return null;
                    },
                    decoration: InputDecoration(
                      hintText: 'Nhập nội dung thông báo...',
                      filled: true,
                      fillColor: _bg,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide.none,
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide(color: Colors.grey.shade300),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide(
                          color: Theme.of(context).primaryColor,
                          width: 2,
                        ),
                      ),
                      errorBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide(color: Colors.red.shade400),
                      ),
                      focusedErrorBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide(
                          color: Colors.red.shade400,
                          width: 2,
                        ),
                      ),
                    ),
                  ),

                  const SizedBox(height: 24),

                  // Send button
                  SizedBox(
                    width: double.infinity,
                    height: 50,
                    child: ElevatedButton.icon(
                      onPressed:
                          (_sending || _loadingList || _errorMessage != null)
                          ? null
                          : _send,
                      icon: _sending
                          ? SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: Colors.white,
                              ),
                            )
                          : const Icon(Icons.send_rounded),
                      label: Text(
                        _sending
                            ? 'Đang gửi...'
                            : _loadingList
                            ? 'Đang tải danh sách...'
                            : _errorMessage != null
                            ? 'Vui lòng thử lại tải danh sách'
                            : 'Gửi thông báo',
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      style: ElevatedButton.styleFrom(
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        elevation: 0,
                      ),
                    ),
                  ),

                  // Add bottom padding for keyboard
                  SizedBox(height: MediaQuery.of(context).viewInsets.bottom),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _CustomerOption {
  final String id;
  final String name;
  const _CustomerOption({required this.id, required this.name});
}
