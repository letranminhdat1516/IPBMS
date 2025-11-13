import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:detect_care_app/core/providers/consent_provider.dart';
import 'package:detect_care_app/core/models/user_consent.dart';

class ConsentScreen extends StatefulWidget {
  final String userId;

  const ConsentScreen({super.key, required this.userId});

  @override
  State<ConsentScreen> createState() => _ConsentScreenState();
}

class _ConsentScreenState extends State<ConsentScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<ConsentProvider>().loadConsents();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Quản lý sự đồng ý')),
      body: Consumer<ConsentProvider>(
        builder: (context, provider, child) {
          if (provider.isLoading) {
            return const Center(child: CircularProgressIndicator());
          }

          if (provider.error != null) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text('Lỗi: ${provider.error}'),
                  ElevatedButton(
                    onPressed: provider.loadConsents,
                    child: const Text('Thử lại'),
                  ),
                ],
              ),
            );
          }

          return ListView(
            children: [
              _ConsentItem(
                type: ConsentType.privacyPolicy,
                title: 'Chính sách bảo mật',
                description:
                    'Cho phép chúng tôi thu thập và xử lý dữ liệu cá nhân của bạn',
                provider: provider,
              ),
              _ConsentItem(
                type: ConsentType.termsOfService,
                title: 'Điều khoản dịch vụ',
                description:
                    'Đồng ý với các điều khoản sử dụng dịch vụ của chúng tôi',
                provider: provider,
              ),
              _ConsentItem(
                type: ConsentType.dataProcessing,
                title: 'Xử lý dữ liệu',
                description:
                    'Cho phép xử lý dữ liệu sức khỏe và camera để cung cấp dịch vụ',
                provider: provider,
              ),
              _ConsentItem(
                type: ConsentType.healthDataSharing,
                title: 'Chia sẻ dữ liệu sức khỏe',
                description:
                    'Cho phép chia sẻ dữ liệu sức khỏe với người chăm sóc được ủy quyền',
                provider: provider,
              ),
              _ConsentItem(
                type: ConsentType.marketingCommunications,
                title: 'Giao tiếp marketing',
                description: 'Nhận thông tin về sản phẩm và dịch vụ mới',
                provider: provider,
              ),
            ],
          );
        },
      ),
    );
  }
}

class _ConsentItem extends StatelessWidget {
  final ConsentType type;
  final String title;
  final String description;
  final ConsentProvider provider;

  const _ConsentItem({
    required this.type,
    required this.title,
    required this.description,
    required this.provider,
  });

  @override
  Widget build(BuildContext context) {
    final hasConsented = provider.hasConsented(type);
    final consent = provider.consents.firstWhere(
      (c) => c.type == type,
      orElse: () => UserConsent(
        id: '',
        userId: '',
        type: type,
        version: '1.0',
        consented: false,
      ),
    );

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
                        title,
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        description,
                        style: TextStyle(color: Colors.grey[600]),
                      ),
                    ],
                  ),
                ),
                Switch(
                  value: hasConsented,
                  onChanged: (value) =>
                      _toggleConsent(context, value, consent.id),
                ),
              ],
            ),
            if (hasConsented && consent.consentedAt != null) ...[
              const SizedBox(height: 12),
              Text(
                'Đã đồng ý lúc: ${consent.consentedAt!.toLocal().toString().split('.')[0]}',
                style: TextStyle(color: Colors.grey[600], fontSize: 12),
              ),
              if (consent.version.isNotEmpty) ...[
                Text(
                  'Phiên bản: ${consent.version}',
                  style: TextStyle(color: Colors.grey[600], fontSize: 12),
                ),
              ],
            ],
            const SizedBox(height: 12),
            Row(
              children: [
                TextButton(
                  onPressed: () => _showPolicyDialog(context),
                  child: const Text('Xem chi tiết'),
                ),
                if (hasConsented) ...[
                  const SizedBox(width: 8),
                  TextButton(
                    onPressed: () => _showRevokeDialog(context, consent.id),
                    style: TextButton.styleFrom(foregroundColor: Colors.red),
                    child: const Text('Thu hồi'),
                  ),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }

  void _toggleConsent(
    BuildContext context,
    bool value,
    String existingId,
  ) async {
    try {
      if (value) {
        // Give consent
        await provider.giveConsent(
          type: type,
          version: '1.0',
          metadata: {
            'platform': 'mobile_app',
            'timestamp': DateTime.now().toIso8601String(),
          },
        );
        if (!context.mounted) return;
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('Đã đồng ý thành công')));
      } else if (existingId.isNotEmpty) {
        // Revoke consent
        await provider.revokeConsent(
          consentId: existingId,
          metadata: {
            'revoked_at': DateTime.now().toIso8601String(),
            'platform': 'mobile_app',
          },
        );
        if (!context.mounted) return;
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(const SnackBar(content: Text('Đã thu hồi sự đồng ý')));
      }
    } catch (e) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Lỗi: $e')));
    }
  }

  void _showPolicyDialog(BuildContext context) async {
    try {
      final policy = await provider.getConsentPolicy(type);
      if (!context.mounted) return;

      showDialog(
        context: context,
        builder: (context) => AlertDialog(
          title: Text(title),
          content: SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                if (policy['description'] != null) ...[
                  Text(
                    policy['description'],
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 12),
                ],
                Text(
                  policy['content'] ??
                      'Nội dung chính sách sẽ được cập nhật...',
                ),
                const SizedBox(height: 12),
                Text(
                  'Phiên bản: ${policy['version'] ?? '1.0'}',
                  style: TextStyle(color: Colors.grey[600], fontSize: 12),
                ),
                Text(
                  'Cập nhật: ${policy['updated_at'] ?? 'N/A'}',
                  style: TextStyle(color: Colors.grey[600], fontSize: 12),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Đóng'),
            ),
          ],
        ),
      );
    } catch (e) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Không thể tải chính sách: $e')));
    }
  }

  void _showRevokeDialog(BuildContext context, String consentId) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Thu hồi sự đồng ý'),
        content: Text('Bạn có chắc muốn thu hồi sự đồng ý cho "$title"?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Hủy'),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.of(context).pop();
              try {
                await provider.revokeConsent(
                  consentId: consentId,
                  metadata: {
                    'revoked_at': DateTime.now().toIso8601String(),
                    'platform': 'mobile_app',
                  },
                );
                if (!context.mounted) return;
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Đã thu hồi sự đồng ý')),
                );
              } catch (e) {
                if (!context.mounted) return;
                ScaffoldMessenger.of(
                  context,
                ).showSnackBar(SnackBar(content: Text('Lỗi: $e')));
              }
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red,
              foregroundColor: Colors.white,
            ),
            child: const Text('Thu hồi'),
          ),
        ],
      ),
    );
  }
}
