package __PACKAGE__

import android.Manifest
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Handler
import android.os.Looper
import android.provider.ContactsContract
import android.telephony.TelephonyManager
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.Arguments
import java.util.UUID

/** PHONE_STATE yayınını dinler: ringing / offhook / idle olaylarını React Native'e iletir. */
class CallReceiver : BroadcastReceiver() {

    companion object {
        private var lastState = TelephonyManager.EXTRA_STATE_IDLE
        private var callId: String? = null
        private var number: String? = null
        private var ringEmitted = false
        private val handler = Handler(Looper.getMainLooper())
        private var pending: Runnable? = null

        private fun cancelPending() {
            pending?.let { handler.removeCallbacks(it) }
            pending = null
        }

        private fun lookupName(ctx: Context, num: String?): String {
            if (num.isNullOrBlank()) return ""
            val granted = ContextCompat.checkSelfPermission(ctx, Manifest.permission.READ_CONTACTS) ==
                PackageManager.PERMISSION_GRANTED
            if (!granted) return ""
            return try {
                val uri = Uri.withAppendedPath(ContactsContract.PhoneLookup.CONTENT_FILTER_URI, Uri.encode(num))
                ctx.contentResolver.query(uri, arrayOf(ContactsContract.PhoneLookup.DISPLAY_NAME), null, null, null)
                    ?.use { if (it.moveToFirst()) it.getString(0) ?: "" else "" } ?: ""
            } catch (e: Exception) {
                ""
            }
        }

        private fun emit(ctx: Context, state: String) {
            if (callId == null) callId = UUID.randomUUID().toString()
            val map = Arguments.createMap().apply {
                putString("state", state)
                putString("number", number ?: "")
                putString("name", lookupName(ctx, number))
                putString("callId", callId)
            }
            DualCallModule.emit("DualCallCall", map)
        }

        private fun emitRing(ctx: Context) {
            if (ringEmitted) return
            ringEmitted = true
            emit(ctx, "ringing")
        }
    }

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != TelephonyManager.ACTION_PHONE_STATE_CHANGED) return
        val state = intent.getStringExtra(TelephonyManager.EXTRA_STATE) ?: return
        val incoming = intent.getStringExtra(TelephonyManager.EXTRA_INCOMING_NUMBER)
        val app = context.applicationContext

        when (state) {
            TelephonyManager.EXTRA_STATE_RINGING -> {
                if (lastState != TelephonyManager.EXTRA_STATE_RINGING) {
                    callId = UUID.randomUUID().toString()
                    number = null
                    ringEmitted = false
                }
                if (!incoming.isNullOrBlank()) number = incoming
                cancelPending()
                if (!ringEmitted) {
                    if (number != null) {
                        emitRing(app)
                    } else {
                        // Bazı cihazlar numarayı ikinci yayında gönderir: kısa süre bekle
                        val r = Runnable { emitRing(app) }
                        pending = r
                        handler.postDelayed(r, 1200)
                    }
                }
            }
            TelephonyManager.EXTRA_STATE_OFFHOOK -> {
                cancelPending()
                if (lastState != state) emit(app, "offhook")
            }
            TelephonyManager.EXTRA_STATE_IDLE -> {
                cancelPending()
                if (lastState != state) emit(app, "idle")
                callId = null
                number = null
                ringEmitted = false
            }
        }
        lastState = state
    }
}
