package com.example.detect_care_app

import android.content.Intent
import android.net.Uri
import android.content.Context
import android.content.pm.PackageManager
import android.Manifest
import androidx.core.app.ActivityCompat
import io.flutter.embedding.engine.plugins.FlutterPlugin

class PhoneCallHandler(private val context: Context) {
    fun makeDirectCall(phoneNumber: String): Boolean {
        val intent = Intent(Intent.ACTION_CALL, Uri.parse("tel:$phoneNumber"))
        if (ActivityCompat.checkSelfPermission(context, Manifest.permission.CALL_PHONE)
            != PackageManager.PERMISSION_GRANTED) {
            return false
        }
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(intent)
        return true
    }
}
