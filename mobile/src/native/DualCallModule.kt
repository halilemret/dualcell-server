package __PACKAGE__

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.media.AudioManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.PowerManager
import android.provider.Settings
import android.telecom.TelecomManager
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule

/** JS tarafındaki NativeModules.DualCall köprüsü. */
@SuppressLint("MissingPermission")
class DualCallModule(private val ctx: ReactApplicationContext) : ReactContextBaseJavaModule(ctx) {

    companion object {
        @Volatile private var instance: ReactApplicationContext? = null

        /** Receiver'lar buradan JS'e olay gönderir. */
        fun emit(event: String, params: WritableMap) {
            val c = instance ?: return
            if (!c.hasActiveReactInstance()) return
            c.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java).emit(event, params)
        }
    }

    init {
        instance = ctx
    }

    override fun getName() = "DualCall"

    private fun has(permission: String) =
        ContextCompat.checkSelfPermission(ctx, permission) == PackageManager.PERMISSION_GRANTED

    private fun telecom() = ctx.getSystemService(Context.TELECOM_SERVICE) as TelecomManager

    @ReactMethod
    fun addListener(eventName: String) {}

    @ReactMethod
    fun removeListeners(count: Int) {}

    @ReactMethod
    fun startForegroundService(promise: Promise) {
        try {
            ContextCompat.startForegroundService(ctx, Intent(ctx, DualCallForegroundService::class.java))
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("E_START", e)
        }
    }

    @ReactMethod
    fun stopForegroundService(promise: Promise) {
        try {
            ctx.stopService(Intent(ctx, DualCallForegroundService::class.java))
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("E_STOP", e)
        }
    }

    @ReactMethod
    fun isServiceRunning(promise: Promise) {
        promise.resolve(DualCallForegroundService.running)
    }

    @ReactMethod
    fun answerCall(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O || !has(Manifest.permission.ANSWER_PHONE_CALLS)) {
                promise.reject("E_PERMISSION", "ANSWER_PHONE_CALLS izni gerekli (Android 8+)")
                return
            }
            telecom().acceptRingingCall()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("E_ANSWER", e)
        }
    }

    @ReactMethod
    fun endCall(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.P || !has(Manifest.permission.ANSWER_PHONE_CALLS)) {
                promise.reject("E_PERMISSION", "Aramayı kapatmak için Android 9+ ve ANSWER_PHONE_CALLS izni gerekli")
                return
            }
            promise.resolve(telecom().endCall())
        } catch (e: Exception) {
            promise.reject("E_END", e)
        }
    }

    @ReactMethod
    fun dial(number: String, promise: Promise) {
        try {
            val clean = number.filter { it.isDigit() || it == '+' || it == '*' || it == '#' }
            if (clean.isEmpty()) {
                promise.reject("E_NUMBER", "Geçersiz numara")
                return
            }
            if (!has(Manifest.permission.CALL_PHONE)) {
                promise.reject("E_PERMISSION", "CALL_PHONE izni gerekli")
                return
            }
            telecom().placeCall(Uri.fromParts("tel", clean, null), Bundle())
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("E_DIAL", e)
        }
    }

    @Suppress("DEPRECATION")
    @ReactMethod
    fun setSpeakerphone(on: Boolean, promise: Promise) {
        try {
            val am = ctx.getSystemService(Context.AUDIO_SERVICE) as AudioManager
            am.isSpeakerphoneOn = on
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("E_AUDIO", e)
        }
    }

    @ReactMethod
    fun requestIgnoreBatteryOptimizations(promise: Promise) {
        try {
            val pm = ctx.getSystemService(Context.POWER_SERVICE) as PowerManager
            if (!pm.isIgnoringBatteryOptimizations(ctx.packageName)) {
                val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                    data = Uri.parse("package:${ctx.packageName}")
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                ctx.startActivity(intent)
            }
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("E_BATTERY", e)
        }
    }
}
