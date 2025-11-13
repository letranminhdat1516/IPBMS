import 'package:flutter/foundation.dart';

class PermissionRequestsNotifier {
  PermissionRequestsNotifier._();

  static final ValueNotifier<int> instance = ValueNotifier<int>(0);

  static void notifyChanged() => instance.value = instance.value + 1;
}
