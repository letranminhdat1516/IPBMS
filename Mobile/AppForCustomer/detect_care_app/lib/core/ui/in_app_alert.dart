import 'package:detect_care_app/core/services/direct_caller.dart';
import 'package:detect_care_app/features/home/widgets/alert_new_event_card.dart';
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:permission_handler/permission_handler.dart';
import '../../features/emergency_contacts/data/emergency_contacts_remote_data_source.dart';
import '../../features/auth/data/auth_storage.dart';
import '../../features/home/models/log_entry.dart';
import '../utils/app_lifecycle.dart';
import '../../main.dart';
import '../../features/events/data/events_remote_data_source.dart';
import '../../features/home/widgets/action_log_card.dart';
import '../events/app_events.dart';
import '../../services/audio_service.dart';

class InAppAlert {
  static bool _showing = false;

  static Future<void> show(LogEntry e) async {
    print('🧩 [InAppAlert] Request to show popup for event ${e.eventId}');
    print(' - _showing: $_showing');
    print(' - isForeground: ${AppLifecycle.isForeground}');
    if (_showing || !AppLifecycle.isForeground) {
      print(
        '❌ Popup suppressed: either already showing or app not in foreground',
      );
      return;
    }
    if (_showing || !AppLifecycle.isForeground) return;
    final ctx = NavigatorKey.navigatorKey.currentState?.overlay?.context;
    print('🧭 NavigatorKey context = $ctx');
    if (ctx == null) {
      print('⚠️ InAppAlert: context is null → cannot show popup');
      return;
    }

    _showing = true;

    try {
      // Ensure any playing audio (started by AlertCoordinator) is audible;
      // InAppAlert will stop the audio when the dialog is dismissed.
      // showGeneralDialog will block until dialog is dismissed.
      await showGeneralDialog(
        context: ctx,
        barrierDismissible: true,
        barrierLabel: 'alert',
        barrierColor: const Color.fromRGBO(0, 0, 0, 0.35),
        pageBuilder: (_, __, ___) {
          return SafeArea(
            child: Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 520, minWidth: 220),
                child: Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 24,
                  ),
                  child: Material(
                    color: Colors.transparent,
                    child: AlertEventCard(
                      eventId: e.eventId,
                      eventType: e.eventType,
                      // patientName: "Bệnh nhân XYZ",
                      timestamp: e.detectedAt ?? e.createdAt ?? DateTime.now(),
                      // location: "Phòng ngủ",
                      severity: _mapSeverityFrom(e),
                      description: (e.eventDescription?.isNotEmpty ?? false)
                          ? e.eventDescription!
                          : 'Chạm “Chi tiết” để xem thêm…',
                      isHandled: _isHandled(e),
                      detectionData: e.detectionData,
                      contextData: e.contextData,
                      cameraId: (() {
                        try {
                          final det = e.detectionData;
                          final ctx = e.contextData;
                          return (det['camera_id'] ??
                                  det['camera'] ??
                                  ctx['camera_id'] ??
                                  ctx['camera'])
                              ?.toString();
                        } catch (_) {
                          return null;
                        }
                      })(),
                      confidence: (() {
                        try {
                          if (e.confidenceScore != 0.0) {
                            return e.confidenceScore;
                          }
                          final det = e.detectionData;
                          final ctx = e.contextData;
                          final c =
                              det['confidence'] ??
                              det['confidence_score'] ??
                              ctx['confidence'];
                          if (c == null) return null;
                          if (c is num) return c.toDouble();
                          return double.tryParse(c.toString());
                        } catch (_) {
                          return null;
                        }
                      })(),
                      // onEmergencyCall: () async {
                      //   try {
                      //     String phone = '115';

                      //     final userId = await AuthStorage.getUserId();
                      //     if (userId != null && userId.isNotEmpty) {
                      //       try {
                      //         final ds = EmergencyContactsRemoteDataSource();
                      //         final list = await ds.list(userId);
                      //         if (list.isNotEmpty) {
                      //           list.sort(
                      //             (a, b) =>
                      //                 b.alertLevel.compareTo(a.alertLevel),
                      //           );
                      //           EmergencyContactDto? chosen;
                      //           for (final c in list) {
                      //             if (c.phone.trim().isNotEmpty) {
                      //               chosen = c;
                      //               break;
                      //             }
                      //           }
                      //           chosen ??= list.first;
                      //           if (chosen.phone.trim().isNotEmpty) {
                      //             phone = chosen.phone.trim();
                      //           }
                      //         }
                      //       } catch (_) {}
                      //     }

                      //     String normalized = phone.replaceAll(
                      //       RegExp(r'[\s\-\(\)]'),
                      //       '',
                      //     );
                      //     if (normalized.startsWith('+84')) {
                      //       normalized = '0${normalized.substring(3)}';
                      //     } else if (normalized.startsWith('84')) {
                      //       normalized = '0${normalized.substring(2)}';
                      //     }

                      //     final uri = Uri.parse('tel:$normalized');
                      //     await launchUrl(uri);
                      //   } catch (err) {
                      //     ScaffoldMessenger.of(ctx).showSnackBar(
                      //       SnackBar(
                      //         content: Text('Không thể gọi: $err'),
                      //         backgroundColor: Colors.red,
                      //       ),
                      //     );
                      //   }
                      // },
                      onEmergencyCall: () async {
                        try {
                          String phone = '115';

                          final userId = await AuthStorage.getUserId();
                          if (userId != null && userId.isNotEmpty) {
                            try {
                              final ds = EmergencyContactsRemoteDataSource();
                              final list = await ds.list(userId);
                              if (list.isNotEmpty) {
                                list.sort(
                                  (a, b) =>
                                      b.alertLevel.compareTo(a.alertLevel),
                                );
                                EmergencyContactDto? chosen;
                                for (final c in list) {
                                  if (c.phone.trim().isNotEmpty) {
                                    chosen = c;
                                    break;
                                  }
                                }
                                chosen ??= list.first;
                                if (chosen.phone.trim().isNotEmpty) {
                                  phone = chosen.phone.trim();
                                }
                              }
                            } catch (_) {}
                          }

                          String normalized = phone.replaceAll(
                            RegExp(r'[\s\-\(\)]'),
                            '',
                          );
                          if (normalized.startsWith('+84')) {
                            normalized = '0${normalized.substring(3)}';
                          } else if (normalized.startsWith('84')) {
                            normalized = '0${normalized.substring(2)}';
                          }

                          try {
                            final status = await Permission.phone.request();
                            if (status.isGranted) {
                              final success = await DirectCaller.call(
                                normalized,
                              );
                              if (!success) {
                                await launchUrl(Uri.parse('tel:$normalized'));
                              }
                            } else if (status.isPermanentlyDenied) {
                              ScaffoldMessenger.of(ctx).showSnackBar(
                                SnackBar(
                                  content: const Text(
                                    'Quyền gọi điện bị từ chối vĩnh viễn. Vui lòng bật quyền trong cài đặt.',
                                  ),
                                  action: SnackBarAction(
                                    label: 'Cài đặt',
                                    onPressed: () => openAppSettings(),
                                  ),
                                ),
                              );
                              // Open dialer as fallback
                              await launchUrl(Uri.parse('tel:$normalized'));
                            } else {
                              // denied (not permanent) — open dialer as fallback
                              await launchUrl(Uri.parse('tel:$normalized'));
                            }
                          } catch (e) {
                            // If anything goes wrong, fallback to opening the dialer
                            await launchUrl(Uri.parse('tel:$normalized'));
                          }
                        } catch (err) {
                          ScaffoldMessenger.of(ctx).showSnackBar(
                            SnackBar(
                              content: Text('Không thể gọi: $err'),
                              backgroundColor: Colors.red,
                            ),
                          );
                        }
                      },

                      onMarkHandled: () async {
                        try {
                          final ds = EventsRemoteDataSource();
                          debugPrint('\n🔄 [InAppAlert] Calling confirmEvent:');
                          debugPrint('  eventId: ${e.eventId}');
                          debugPrint('  confirm: true');

                          await ds.confirmEvent(
                            eventId: e.eventId,
                            confirmStatusBool: true,
                          );

                          Navigator.of(ctx, rootNavigator: true).maybePop();
                          try {
                            AppEvents.instance.notifyEventsChanged();
                          } catch (_) {}
                        } catch (err) {
                          ScaffoldMessenger.of(ctx).showSnackBar(
                            SnackBar(
                              content: Text('Lỗi: $err'),
                              backgroundColor: Colors.red,
                            ),
                          );
                        }
                      },
                      onViewDetails: () async {
                        Navigator.of(ctx, rootNavigator: true).maybePop();

                        try {
                          final overlayCtx = NavigatorKey
                              .navigatorKey
                              .currentState
                              ?.overlay
                              ?.context;
                          if (overlayCtx == null) return;

                          final sub = AppEvents.instance.eventsChanged.listen((
                            _,
                          ) {
                            try {
                              Navigator.of(
                                overlayCtx,
                                rootNavigator: true,
                              ).maybePop();
                            } catch (_) {}
                          });

                          await showModalBottomSheet(
                            context: overlayCtx,
                            isScrollControlled: true,
                            isDismissible: true,
                            backgroundColor: Colors.transparent,
                            builder: (_) {
                              return DraggableScrollableSheet(
                                initialChildSize: 0.75,
                                minChildSize: 0.5,
                                maxChildSize: 0.95,
                                expand: false,
                                builder: (context, scrollController) {
                                  return Container(
                                    decoration: const BoxDecoration(
                                      color: Colors.white,
                                      borderRadius: BorderRadius.only(
                                        topLeft: Radius.circular(24),
                                        topRight: Radius.circular(24),
                                      ),
                                    ),
                                    child: SingleChildScrollView(
                                      controller: scrollController,
                                      child: Padding(
                                        padding: const EdgeInsets.all(16),
                                        child: Builder(
                                          builder: (ctx) {
                                            try {
                                              print(
                                                '[InAppAlert.onViewDetails] creating ActionLogCard for event=${e.eventId} detectedAt=${e.detectedAt} createdAt=${e.createdAt}',
                                              );
                                            } catch (_) {}
                                            return ActionLogCard(
                                              data: e,
                                              onUpdated:
                                                  (newStatus, {confirmed}) {
                                                    try {
                                                      Navigator.of(
                                                        context,
                                                        rootNavigator: true,
                                                      ).maybePop();
                                                    } catch (_) {}
                                                  },
                                            );
                                          },
                                        ),
                                      ),
                                    ),
                                  );
                                },
                              );
                            },
                          );

                          try {
                            await sub.cancel();
                          } catch (_) {}
                        } catch (_) {
                          // fallback: do nothing if navigation fails
                        }
                      },
                      onDismiss: () {
                        // Pop using the same Navigator that created the dialog.
                        // Using rootNavigator: true can point to a different navigator
                        // and sometimes won't close the dialog pushed by
                        // `showGeneralDialog` which uses the provided context's
                        // navigator. Use the default (rootNavigator: false) so the
                        // X button reliably dismisses the popup.
                        Navigator.of(ctx).maybePop();
                      },
                    ),
                  ),
                ),
              ),
            ),
          );
        },
        transitionBuilder: (_, anim, __, child) {
          final curved = CurvedAnimation(
            parent: anim,
            curve: Curves.easeOutCubic,
          );
          return FadeTransition(
            opacity: curved,
            child: ScaleTransition(
              scale: Tween(begin: 0.95, end: 1.0).animate(curved),
              child: child,
            ),
          );
        },
      );
    } finally {
      // Always stop any in-app audio when the alert closes.
      try {
        AudioService.instance.stop();
      } catch (_) {}
      _showing = false;
    }
  }

  static String _mapSeverityFrom(LogEntry e) {
    final s = (e.status).toLowerCase();
    if (s.contains('critical')) return 'critical';
    if (s.contains('high')) return 'high';
    if (s.contains('medium')) return 'medium';
    if (s.contains('low')) return 'low';
    return 'high';
  }

  static bool _isHandled(LogEntry e) {
    try {
      final dynamic d = e;
      if (d is Map && d['isHandled'] is bool) return d['isHandled'] as bool;
      if (d is Object && (d as dynamic).isHandled is bool) {
        return (d as dynamic).isHandled as bool;
      }
    } catch (_) {}
    return false;
  }
}
