import 'package:detect_care_app/features/auth/data/auth_storage.dart';
import 'package:flutter/material.dart';

import '../controllers/subscription_controller.dart';
import '../data/service_package_api.dart';
import '../models/plan.dart';
import '../models/subscription_model.dart';
import '../widgets/pricing_helpers.dart';
import 'payment_screen.dart';

class UpgradeSubscriptionScreen extends StatefulWidget {
  final SubscriptionModel currentSubscription;
  final Plan currentPlan;
  final List<Plan> availablePlans;

  const UpgradeSubscriptionScreen({
    super.key,
    required this.currentSubscription,
    required this.currentPlan,
    required this.availablePlans,
  });

  @override
  State<UpgradeSubscriptionScreen> createState() =>
      _UpgradeSubscriptionScreenState();
}

class _UpgradeSubscriptionScreenState extends State<UpgradeSubscriptionScreen> {
  Plan? selectedTargetPlan;
  bool isLoading = false;
  String? errorMessage;

  @override
  Widget build(BuildContext context) {
    final higherPlans = widget.availablePlans
        .where((p) => p.price > widget.currentPlan.price)
        .toList();
    final lowerPlans = widget.availablePlans
        .where((p) => p.price < widget.currentPlan.price)
        .toList();

    return Scaffold(
      appBar: AppBar(title: const Text('Quản lý gói dịch vụ')),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Gói hiện tại: ${widget.currentPlan.name}',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 20),
            if (higherPlans.isNotEmpty) ...[
              const Text(
                'Nâng cấp lên:',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 10),
              ...higherPlans.map(
                (plan) => _buildPlanOption(plan, isUpgrade: true),
              ),
            ],
            if (lowerPlans.isNotEmpty) ...[
              const SizedBox(height: 20),
              const Text(
                'Hạ cấp xuống (lên lịch):',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 10),
              ...lowerPlans.map(
                (plan) => _buildPlanOption(plan, isUpgrade: false),
              ),
            ],
            if (errorMessage != null) ...[
              const SizedBox(height: 20),
              Text(errorMessage!, style: const TextStyle(color: Colors.red)),
            ],
            const Spacer(),
            if (selectedTargetPlan != null) _buildConfirmationSection(),
          ],
        ),
      ),
    );
  }

  Widget _buildPlanOption(Plan plan, {required bool isUpgrade}) {
    final prorated = isUpgrade
        ? calculateProratedUpgrade(
            currentPlan: widget.currentPlan,
            targetPlan: plan,
            subscriptionEnd: widget.currentSubscription.currentPeriodEnd,
            periodDays: 30, // giả sử monthly
          )
        : null;

    return Card(
      child: ListTile(
        title: Text(plan.name),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Giá: ${formatVND(plan.price)}/tháng'),
            if (prorated != null) ...[
              Text('Thời gian còn lại: ${prorated['remainingDays']} ngày'),
              Text('Credit từ gói cũ: ${formatVND(prorated['credit'])}'),
              Text('Chi phí mới: ${formatVND(prorated['charge'])}'),
              Text(
                'Phải trả ngay: ${formatVND(prorated['totalToPay'])}',
                style: const TextStyle(fontWeight: FontWeight.bold),
              ),
            ],
          ],
        ),
        trailing: Radio<Plan>(
          value: plan,
          groupValue: selectedTargetPlan,
          onChanged: (value) => setState(() => selectedTargetPlan = value),
        ),
        onTap: () => setState(() => selectedTargetPlan = plan),
      ),
    );
  }

  Widget _buildConfirmationSection() {
    final isUpgrade = selectedTargetPlan!.price > widget.currentPlan.price;
    final prorated = isUpgrade
        ? calculateProratedUpgrade(
            currentPlan: widget.currentPlan,
            targetPlan: selectedTargetPlan!,
            subscriptionEnd: widget.currentSubscription.currentPeriodEnd,
            periodDays: 30,
          )
        : null;

    return Column(
      children: [
        const Divider(),
        Text(
          'Xác nhận ${isUpgrade ? 'nâng cấp' : 'hạ cấp'} lên ${selectedTargetPlan!.name}',
        ),
        if (prorated != null) ...[
          const SizedBox(height: 10),
          ...createUpgradeLineItems(
            currentPlan: widget.currentPlan,
            targetPlan: selectedTargetPlan!,
            credit: prorated['credit'],
            charge: prorated['charge'],
            totalToPay: prorated['totalToPay'],
          ).map(
            (item) => ListTile(
              title: Text(item['description']),
              trailing: Text(formatVND(item['amount'])),
            ),
          ),
        ],
        const SizedBox(height: 20),
        ElevatedButton(
          onPressed: isLoading ? null : _confirmAction,
          child: isLoading
              ? const CircularProgressIndicator()
              : Text(isUpgrade ? 'Thanh toán và nâng cấp' : 'Lên lịch hạ cấp'),
        ),
      ],
    );
  }

  Future<void> _confirmAction() async {
    if (selectedTargetPlan == null) return;

    setState(() => isLoading = true);
    final token = await AuthStorage.getAccessToken();
    if (token == null) {
      setState(() => errorMessage = 'Không tìm thấy token');
      return;
    }

    final controller = SubscriptionController(ServicePackageApi());
    final isUpgrade = selectedTargetPlan!.price > widget.currentPlan.price;

    try {
      final result = isUpgrade
          ? await controller.upgradeSubscription(
              widget.currentSubscription.id,
              selectedTargetPlan!.code,
            )
          : await controller.scheduleDowngrade(selectedTargetPlan!.code);

      if (!mounted) return;

      if (result['status'] == 'error') {
        setState(() => errorMessage = result['message']);
      } else {
        if (isUpgrade) {
          final amountDue = result['amountDue'] ?? 0;
          if (amountDue > 0) {
            // Chuyển đến payment screen với transactionId / amountDue
            final txId =
                result['transactionId'] ??
                result['transaction_id'] ??
                result['txId'] ??
                result['transactionId'];
            final int? overrideAmt = amountDue is String
                ? int.tryParse(amountDue)
                : (amountDue is int ? amountDue : null);
            if (!mounted) return;
            final paymentResult = await Navigator.push<bool>(
              context,
              MaterialPageRoute(
                builder: (context) => PaymentScreen(
                  plan: selectedTargetPlan!,
                  selectedTerm: 1,
                  overrideAmount: overrideAmt,
                  linkedTransactionId: txId?.toString(),
                ),
              ),
            );

            // If payment was successful, refresh the parent screen data
            if (paymentResult == true && mounted) {
              // Pop this screen and let parent handle refresh
              Navigator.pop(context, {'refresh': true});
            }
          } else {
            if (!mounted) return;
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(result['message'] ?? 'Nâng cấp thành công!'),
              ),
            );
            Navigator.pop(context);
          }
        } else {
          if (!mounted) return;
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(result['message'] ?? 'Lên lịch hạ cấp thành công!'),
            ),
          );
          Navigator.pop(context);
        }
      }
    } catch (e) {
      setState(() => errorMessage = 'Lỗi: $e');
    } finally {
      setState(() => isLoading = false);
    }
  }
}
