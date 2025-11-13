import 'package:flutter/widgets.dart';

final GlobalKey<NavigatorState> rootNavigatorKey = GlobalKey<NavigatorState>();

void navigateToLoginAndClearStack() {
  WidgetsBinding.instance.addPostFrameCallback((_) {
    try {
      // Navigate to the app root which is guarded by AuthGate. After
      // clearing auth state the AuthGate will show the login flow.
      rootNavigatorKey.currentState?.pushNamedAndRemoveUntil(
        '/',
        (route) => false,
      );
    } catch (e) {
      // swallow errors to avoid crashing when navigator not available
    }
  });
}
