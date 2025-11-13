import 'package:flutter/material.dart';
import 'profile_constants.dart';

/// Animation utilities for profile screen
class ProfileAnimationUtils {
  static AnimationController createFadeController(TickerProvider vsync) {
    return AnimationController(
      duration: ProfileConstants.fadeDuration,
      vsync: vsync,
    )..forward();
  }

  static AnimationController createScaleController(TickerProvider vsync) {
    return AnimationController(
      duration: ProfileConstants.scaleDuration,
      vsync: vsync,
    )..forward();
  }

  static Animation<double> createFadeAnimation(AnimationController controller) {
    return Tween<double>(
      begin: 0.0,
      end: 1.0,
    ).animate(CurvedAnimation(parent: controller, curve: Curves.easeIn));
  }

  static Animation<double> createScaleAnimation(
    AnimationController controller,
  ) {
    return Tween<double>(
      begin: 0.8,
      end: 1.0,
    ).animate(CurvedAnimation(parent: controller, curve: Curves.easeOut));
  }

  static Animation<Offset> createSlideAnimation(
    AnimationController controller,
  ) {
    return Tween<Offset>(
      begin: const Offset(0, 0.1),
      end: Offset.zero,
    ).animate(CurvedAnimation(parent: controller, curve: Curves.easeInOut));
  }
}
