package __PACKAGE__

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony
import com.facebook.react.bridge.Arguments

/** Gelen SMS'leri yakalar; çok parçalı mesajları birleştirip React Native'e iletir. */
class SmsReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) return
        val parts = Telephony.Sms.Intents.getMessagesFromIntent(intent) ?: return
        if (parts.isEmpty()) return
        val sender = parts[0].originatingAddress ?: "Bilinmeyen"
        val body = parts.joinToString("") { it.messageBody ?: "" }
        val map = Arguments.createMap().apply {
            putString("sender", sender)
            putString("body", body)
            putDouble("timestamp", System.currentTimeMillis().toDouble())
        }
        DualCallModule.emit("DualCallSms", map)
    }
}
