package hu.bumler.lm2.notifications

import android.content.Context
import android.util.Log
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters

/**
 * documentation/Features/Értesítések.md "08:00 / 20:00 háttér-értesítés worker" — the background job
 * body, run off the alarm broadcast by WorkManager so an async Health Connect read and the
 * notification post survive process death.
 *
 * B0: logs the slot only. Later phases build on this:
 *  - B1: fire due entries from the JS-written `lm2_notifBgPlan`, write back `lm2_notifBgDedupe`.
 *  - B2 (evening slot): evaluate STEPS_LOW from a live Health Connect read of today's steps.
 *  - B3 (morning slot): stash yesterday's step count under `steps.pendingHealthConnect.<date>` for
 *    ActivityStepSyncService to pick up.
 *
 * It never touches the app's SQLite / outbox — the only bridge is `@capacitor/preferences`
 * (the `CapacitorStorage` SharedPreferences file), read and written from here.
 */
class ReminderWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        val slot = inputData.getString(ReminderScheduler.EXTRA_SLOT) ?: ReminderScheduler.SLOT_MORNING
        Log.i(TAG, "ReminderWorker running: slot=$slot")
        return Result.success()
    }

    private companion object {
        const val TAG = "ReminderWorker"
    }
}
