package hu.bumler.lm2.notifications

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.util.Log
import java.time.LocalTime
import java.time.ZoneId
import java.time.ZonedDateTime

/**
 * documentation/Features/Értesítések.md "08:00 / 20:00 háttér-értesítés worker" — arms two inexact
 * daily alarms, device-local: a **morning** one at 09:00 (the fixed notification time for
 * FOOD_* / CALORIE_STREAK / HOUSEHOLD_TASK_DUE, and also when yesterday's step total is stashed —
 * the spec's separate "08:00 step worker" is folded into this one 09:00 run) and an **evening** one
 * at 20:00 (STEPS_LOW). Deliberately NOT exact: the spec accepts drift (the local notifications are
 * already scheduled `isExactNotification: false`, and the app-open reconcile is the safety net), so
 * we use `setAndAllowWhileIdle` and skip the Android 12+ SCHEDULE_EXACT_ALARM permission and its
 * "Alarms & reminders" settings redirect.
 *
 * Each alarm broadcasts to [ReminderAlarmReceiver], which enqueues [ReminderWorker] and re-arms the
 * next occurrence of that slot (an inexact one-shot alarm does not repeat on its own). Also re-armed
 * on BOOT_COMPLETED ([BootReceiver]) and at cold start (BackgroundRemindersPlugin.ensureScheduled,
 * called from NotificationSchedulerService.init).
 */
object ReminderScheduler {

    const val ACTION_ALARM = "hu.bumler.lm2.REMINDER_ALARM"
    const val EXTRA_SLOT = "slot"
    const val SLOT_MORNING = "morning"
    const val SLOT_EVENING = "evening"

    /** Matches NotificationSchedulerService `CHANNEL_ID` — worker-posted banners share the app's channel. */
    const val CHANNEL_ID = "lm2-default"

    private const val TAG = "ReminderScheduler"
    private const val MORNING_HOUR = 9
    private const val EVENING_HOUR = 20
    private const val REQ_MORNING = 4101
    private const val REQ_EVENING = 4102

    fun ensureScheduled(context: Context) {
        arm(context, SLOT_MORNING, MORNING_HOUR, REQ_MORNING)
        arm(context, SLOT_EVENING, EVENING_HOUR, REQ_EVENING)
    }

    private fun arm(context: Context, slot: String, hour: Int, requestCode: Int) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager
        if (alarmManager == null) {
            Log.w(TAG, "AlarmManager unavailable; '$slot' reminder not scheduled")
            return
        }
        val triggerAtMillis = nextTriggerMillis(hour)
        val pending = PendingIntent.getBroadcast(
            context,
            requestCode,
            Intent(context, ReminderAlarmReceiver::class.java).apply {
                action = ACTION_ALARM
                putExtra(EXTRA_SLOT, slot)
            },
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        try {
            alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMillis, pending)
            Log.i(TAG, "Armed '$slot' reminder for $triggerAtMillis")
        } catch (e: SecurityException) {
            Log.w(TAG, "Could not arm '$slot' reminder", e)
        }
    }

    /** Epoch millis of the next `hour:00` in the device's own timezone (today if still ahead, else tomorrow). */
    private fun nextTriggerMillis(
        hour: Int,
        now: ZonedDateTime = ZonedDateTime.now(ZoneId.systemDefault()),
    ): Long {
        var next = now.toLocalDate().atTime(LocalTime.of(hour, 0)).atZone(now.zone)
        if (!next.isAfter(now)) {
            next = next.plusDays(1)
        }
        return next.toInstant().toEpochMilli()
    }
}
