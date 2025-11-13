class ActionLocker {
  ActionLocker._();

  static final ActionLocker instance = ActionLocker._();

  final Set<String> _lockedIds = <String>{};

  bool isLocked(String id) => _lockedIds.contains(id);

  void lock(String id) {
    _lockedIds.add(id);
  }

  void unlock(String id) {
    _lockedIds.remove(id);
  }
}

/// Convenience top-level functions
bool isActionLocked(String id) => ActionLocker.instance.isLocked(id);
void lockAction(String id) => ActionLocker.instance.lock(id);
void unlockAction(String id) => ActionLocker.instance.unlock(id);
