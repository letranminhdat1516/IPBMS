import 'package:detect_care_app/features/home/screens/high_confidence_events_screen.dart';
import 'package:flutter/material.dart';

import '../../../features/health_overview/screens/health_overview_screen.dart';
import '../constants/filter_constants.dart';
import '../widgets/tab_selector.dart';

class ActivityScreen extends StatelessWidget {
  const ActivityScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Hoạt động')),
      body: const Center(child: Text('Nội dung màn Hoạt động…')),
      bottomNavigationBar: TabSelector(
        selectedTab: 'activity',
        onTabChanged: (key) {
          switch (key) {
            case 'warning':
              Navigator.pushReplacement(
                context,
                MaterialPageRoute(
                  builder: (_) => WarningLogScreen(
                    logs: const [],
                    selectedDayRange: HomeFilters.defaultDayRange,
                    selectedStatus: HomeFilters.defaultStatus,
                    selectedPeriod: HomeFilters.defaultPeriod,
                    onDayRangeChanged: (_) {},
                    onStatusChanged: (_) {},
                    onPeriodChanged: (_) {},
                  ),
                ),
              );
              break;
            case 'report':
              Navigator.pushReplacement(
                context,
                MaterialPageRoute(builder: (_) => const HealthOverviewScreen()),
              );
              break;
          }
        },
      ),
    );
  }
}
