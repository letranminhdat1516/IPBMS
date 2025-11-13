import 'package:detect_care_app/features/assignments/screens/assignments_screen.dart';
import 'package:flutter/material.dart';

import '../screens/invitations_screen.dart';

class CaregiverManagerScreen extends StatelessWidget {
  final String customerId;

  const CaregiverManagerScreen({super.key, required this.customerId});

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Quản lý người chăm sóc'),
          bottom: const TabBar(
            tabs: [
              Tab(text: 'Thiết lập'),
              Tab(text: 'Lời mời'),
            ],
          ),
        ),
        body: TabBarView(
          children: [
            // Reuse setup widget (embed into parent scaffold/tab so prevent
            // AssignmentsScreen from rendering its own AppBar)
            Padding(
              padding: const EdgeInsets.all(16.0),
              child: AssignmentsScreen(embedInParent: true),
            ),
            // Invitations screen expects customerId
            InvitationsScreen(customerId: customerId),
          ],
        ),
      ),
    );
  }
}
