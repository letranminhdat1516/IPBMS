package com.example.detect_care_app

import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity: FlutterActivity() {
    private val CHANNEL = "detect_care_app/direct_call"

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)

        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CHANNEL)
            .setMethodCallHandler { call, result ->
                if (call.method == "makeDirectCall") {
                    val number = call.argument<String>("number") ?: ""
                    val ok = PhoneCallHandler(this).makeDirectCall(number)
                    result.success(ok)
                } else {
                    result.notImplemented()
                }
            }
    }
}