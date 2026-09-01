package hu.bumler.lm2.notifications

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import androidx.work.Data
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager

/**
 * documentation/Features/Értesítések.md "08:00 / 20:00 háttér-értesítés worker" — receives the inexact
 * daily alarm, enqueues [ReminderWorker] for that slot, and re-arms the next occurrence of both slots
 * (an inexact one-shot alarm does not repeat on its own; re-arming is idempotent — it updates the
 * existing PendingIntents).
 */
class ReminderAlarmReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val slot = intent.getStringExtra(ReminderScheduler.EXTRA_SLOT) ?: ReminderScheduler.SLOT_MORNING
        Log.i(TAG, "Alarm fired: slot=$slot")

        WorkManager.getInstance(context).enqueue(
            OneTimeWorkRequestBuilder<ReminderWorker>()
                .setInputData(Data.Builder().putString(ReminderScheduler.EXTRA_SLOT, slot).build())
                .build(),
        )

        ReminderScheduler.ensureScheduled(context)
    }

    private companion object {
        const val TAG = "ReminderAlarmReceiver"
    }
}
