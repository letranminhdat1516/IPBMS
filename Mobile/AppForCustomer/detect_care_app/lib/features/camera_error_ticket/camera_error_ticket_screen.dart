// camera_error_ticket_screen.dart
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import 'package:detect_care_app/features/camera_error_ticket/providers/camera_error_tickets_provider.dart';

class CameraErrorTicketScreen extends StatefulWidget {
  const CameraErrorTicketScreen({super.key});

  @override
  State<CameraErrorTicketScreen> createState() =>
      _CameraErrorTicketScreenState();
}

class _CameraErrorTicketScreenState extends State<CameraErrorTicketScreen> {
  // ---- Controllers & State ---------------------------------------------------
  final _formKey = GlobalKey<FormState>();
  final _descriptionCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final List<File> _images = [];
  String? _errorType;
  bool _allowContact = true;
  bool _submitting = false;

  final _picker = ImagePicker();
  static const _maxImages = 5;
  static const _maxImageBytes = 5 * 1024 * 1024;

  final List<String> _errorTypes = const [
    'Kết nối camera',
    'Hình ảnh mờ',
    'Không thể kết nối',
    'Lỗi âm thanh',
    'Khác',
  ];

  @override
  void dispose() {
    _descriptionCtrl.dispose();
    _phoneCtrl.dispose();
    super.dispose();
  }

  // ---- Helpers ---------------------------------------------------------------
  InputDecoration _deco(String label, {String? hint}) => InputDecoration(
    labelText: label,
    hintText: hint,
    labelStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500),
    border: OutlineInputBorder(
      borderRadius: BorderRadius.circular(12),
      borderSide: const BorderSide(color: Color(0xFFE5E7EB)),
    ),
    focusedBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(12),
      borderSide: const BorderSide(color: Color(0xFF2F80ED), width: 1.5),
    ),
    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
  );

  static TextInputFormatter get _phoneFormatter =>
      FilteringTextInputFormatter.allow(RegExp(r'\d|\+'));

  String? _validatePhone(String? v) {
    final digits = (v ?? '').replaceAll(RegExp(r'\D'), '');
    if (digits.isEmpty) return 'Vui lòng nhập số điện thoại';
    if (digits.length < 9 || digits.length > 11) {
      return 'Số điện thoại chưa đúng định dạng.';
    }
    return null;
  }

  Future<void> _pickImage(ImageSource source) async {
    try {
      final picked = await _picker.pickImage(source: source, imageQuality: 85);
      if (picked == null) return;
      final file = File(picked.path);
      if (await file.length() > _maxImageBytes) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Ảnh quá lớn (tối đa 5MB)')),
          );
        }
        return;
      }
      if (_images.length >= _maxImages) {
        if (mounted) {
          ScaffoldMessenger.of(
            context,
          ).showSnackBar(SnackBar(content: Text('Tối đa $_maxImages ảnh')));
        }
        return;
      }
      setState(() => _images.add(file));
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('Không thể thêm ảnh')));
      }
    }
  }

  void _showErrorTypeSheet() {
    showModalBottomSheet<void>(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: 12),
            Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.grey.shade300,
                borderRadius: BorderRadius.circular(4),
              ),
            ),
            const SizedBox(height: 12),
            for (final t in _errorTypes)
              ListTile(
                title: Text(t),
                onTap: () {
                  setState(() => _errorType = t);
                  Navigator.of(ctx).pop();
                },
              ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }

  Future<String?> _saveTicket() async {
    final provider = context.read<CameraErrorTicketsProvider>();

    // For now, we'll skip image upload and just create ticket with local paths
    // TODO: Implement image upload to get URLs
    final imageUrls = _images.map((file) => file.path).toList();

    final ticket = await provider.createTicket(
      errorType: _errorType!,
      description: _descriptionCtrl.text.trim(),
      phone: _phoneCtrl.text.trim().isNotEmpty ? _phoneCtrl.text.trim() : null,
      allowContact: _allowContact,
      imageUrls: imageUrls.isNotEmpty ? imageUrls : null,
    );

    return ticket?.id;
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_errorType == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Hãy chọn loại lỗi để chúng tôi xử lý đúng nhóm.'),
        ),
      );
      return;
    }
    setState(() => _submitting = true);

    try {
      final ticketId = await _saveTicket();
      if (!mounted) return;

      if (ticketId == null) {
        // Show error if ticket creation failed
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Không thể tạo ticket. Vui lòng thử lại.'),
          ),
        );
        return;
      }

      await showDialog<void>(
        context: context,
        barrierDismissible: false,
        builder: (ctx) => AlertDialog(
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: const BoxDecoration(
                  color: Color.fromRGBO(47, 128, 237, 0.12),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.check,
                  color: Color(0xFF2F80ED),
                  size: 40,
                ),
              ),
              const SizedBox(height: 12),
              Text(
                'Đã tạo ticket #$ticketId',
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Chúng tôi sẽ liên hệ qua ${_phoneCtrl.text.trim()} trong 15–30 phút làm việc.',
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(),
              child: const Text('Đóng'),
            ),
            ElevatedButton(
              onPressed: () => Navigator.of(ctx).pop(),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF2F80ED),
              ),
              child: const Text('Xem ticket'),
            ),
          ],
        ),
      );

      _formKey.currentState!.reset();
      setState(() {
        _descriptionCtrl.clear();
        _phoneCtrl.clear();
        _images.clear();
        _errorType = null;
        _allowContact = true;
      });
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Không thể gửi. Kiểm tra kết nối và thử lại.'),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  // ---- UI --------------------------------------------------------------------
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F7FA),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          onPressed: () => Navigator.of(context).pop(),
          icon: const Icon(Icons.arrow_back, color: Color(0xFF2F80ED)),
        ),
        title: const Text(
          'Gửi ticket hỗ trợ',
          style: TextStyle(color: Color(0xFF0F172A)),
        ),
        actions: const [
          // Lịch sử ticket (tùy tích hợp)
          IconButton(
            onPressed: null,
            icon: Icon(Icons.history, color: Color(0xFF6B7280)),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Card(
          elevation: 6,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Mô tả vấn đề',
                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 8),
                  TextFormField(
                    controller: _descriptionCtrl,
                    minLines: 4,
                    maxLines: 6,
                    maxLength: 500,
                    decoration: _deco(
                      'Mô tả lỗi',
                      hint: 'Mô tả ngắn gọn lỗi bạn gặp',
                    ),
                    validator: (v) => (v == null || v.trim().length < 10)
                        ? 'Vui lòng nhập ít nhất 10 ký tự.'
                        : null,
                  ),
                  const SizedBox(height: 16),

                  const Text(
                    'Loại lỗi',
                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 8),
                  InkWell(
                    onTap: _showErrorTypeSheet,
                    borderRadius: BorderRadius.circular(12),
                    child: InputDecorator(
                      decoration: _deco('Loại lỗi'),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            _errorType ?? 'Chọn loại lỗi',
                            style: TextStyle(
                              color: _errorType == null
                                  ? Colors.grey.shade600
                                  : Colors.black,
                            ),
                          ),
                          const Icon(
                            Icons.keyboard_arrow_down,
                            color: Color(0xFF6B7280),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),

                  const Text(
                    'Số điện thoại liên hệ',
                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 8),
                  TextFormField(
                    controller: _phoneCtrl,
                    keyboardType: TextInputType.phone,
                    inputFormatters: [_phoneFormatter],
                    decoration: _deco('Số điện thoại', hint: '090 123 4567')
                        .copyWith(
                          suffixIcon: TextButton(
                            onPressed: () {
                              // TODO: gán số từ profile (nếu có)
                            },
                            child: const Text('Dùng số này'),
                          ),
                        ),
                    validator: _validatePhone,
                  ),
                  const SizedBox(height: 16),

                  const Text(
                    'Đính kèm ảnh (tùy chọn)',
                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      FilledButton.icon(
                        onPressed: () => _pickImage(ImageSource.camera),
                        icon: const Icon(Icons.photo_camera_outlined, size: 18),
                        label: const Text('Chụp ảnh'),
                        style: FilledButton.styleFrom(
                          backgroundColor: const Color(0xFF2F80ED),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 8,
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      OutlinedButton.icon(
                        onPressed: () => _pickImage(ImageSource.gallery),
                        icon: const Icon(Icons.photo_outlined, size: 18),
                        label: const Text('Thư viện'),
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 8,
                          ),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                      ),
                      const Spacer(),
                      Text(
                        '${_images.length}/$_maxImages',
                        style: const TextStyle(color: Colors.grey),
                      ),
                    ],
                  ),
                  if (_images.isNotEmpty) ...[
                    const SizedBox(height: 12),
                    SizedBox(
                      height: 72,
                      child: ListView.separated(
                        scrollDirection: Axis.horizontal,
                        itemCount: _images.length,
                        separatorBuilder: (_, __) => const SizedBox(width: 8),
                        itemBuilder: (ctx, i) {
                          final f = _images[i];
                          return Stack(
                            clipBehavior: Clip.none,
                            children: [
                              ClipRRect(
                                borderRadius: BorderRadius.circular(8),
                                child: Image.file(
                                  f,
                                  width: 72,
                                  height: 72,
                                  fit: BoxFit.cover,
                                ),
                              ),
                              Positioned(
                                right: -8,
                                top: -8,
                                child: IconButton(
                                  onPressed: () =>
                                      setState(() => _images.removeAt(i)),
                                  icon: const Icon(
                                    Icons.close,
                                    size: 18,
                                    color: Colors.white,
                                  ),
                                  padding: EdgeInsets.zero,
                                  constraints: const BoxConstraints(),
                                ),
                              ),
                            ],
                          );
                        },
                      ),
                    ),
                  ],

                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Checkbox(
                        value: _allowContact,
                        onChanged: (v) =>
                            setState(() => _allowContact = v ?? true),
                        activeColor: const Color(0xFF2F80ED),
                      ),
                      const SizedBox(width: 8),
                      const Expanded(
                        child: Text(
                          'Tôi đồng ý được liên hệ để xử lý ticket này',
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: _submitting ? null : _submit,
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        backgroundColor: const Color(0xFF2F80ED),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      child: _submitting
                          ? const SizedBox(
                              height: 20,
                              width: 20,
                              child: CircularProgressIndicator(
                                color: Colors.white,
                                strokeWidth: 2,
                              ),
                            )
                          : const Text(
                              'Gửi Ticket',
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
