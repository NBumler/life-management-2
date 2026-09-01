package hu.bumler.lm2.notifications

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

/**
 * documentation/Features/Értesítések.md "08:00 / 20:00 háttér-értesítés worker" — AlarmManager alarms
 * do not survive a reboot, so re-arm the two daily reminders once the device finishes booting.
 */
class BootReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        when (intent.action) {
            Intent.ACTION_BOOT_COMPLETED,
            "android.intent.action.QUICKBOOT_POWERON",
            -> {
                Log.i("BootReceiver", "Boot completed; re-arming reminders")
                ReminderScheduler.ensureScheduled(context)
            }
        }
    }
}
