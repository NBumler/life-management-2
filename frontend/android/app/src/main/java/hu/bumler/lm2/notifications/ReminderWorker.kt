package hu.bumler.lm2.notifications

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.aggregate.AggregationResult
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.request.AggregateRequest
import androidx.health.connect.client.time.TimeRangeFilter
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import hu.bumler.lm2.MainActivity
import org.json.JSONArray
import org.json.JSONObject
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId

/**
 * documentation/Features/Értesítések.md "08:00 / 20:00 háttér-értesítés worker" — the background job
 * body, run off the alarm broadcast by WorkManager.
 *
 * - **Both slots:** fire the JS-precomputed fixed-time notifications from `lm2_notifBgPlan` that fell
 *   due while the app was closed (a missed 09:00 run is still caught at 20:00, within the staleness
 *   guard).
 * - **Evening slot only:** read today's step total straight from Health Connect and fire STEPS_LOW
 *   if it is below the plan's threshold — the one rule that needs live background data.
 * - Everything fired is appended to `lm2_notifBgDedupe`; the app's next reconcile folds that into the
 *   shared dedupe store instead of re-delivering.
 *
 * It never touches the app's SQLite / outbox — the only bridge is the `CapacitorStorage`
 * SharedPreferences file (`@capacitor/preferences`). B3 adds the morning step stash.
 */
class ReminderWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        val slot = inputData.getString(ReminderScheduler.EXTRA_SLOT) ?: ReminderScheduler.SLOT_MORNING
        Log.i(TAG, "ReminderWorker running: slot=$slot")

        val prefs = applicationContext.getSharedPreferences(CAPACITOR_PREFS, Context.MODE_PRIVATE)
        val planRaw = prefs.getString(PLAN_KEY, null)
        if (planRaw.isNullOrBlank()) {
            Log.i(TAG, "No background plan present; nothing to do")
            return Result.success()
        }
        val plan = try {
            JSONObject(planRaw)
        } catch (e: Exception) {
            Log.w(TAG, "Background plan is not valid JSON", e)
            return Result.success()
        }

        ensureChannel(plan.optString("channelName", DEFAULT_CHANNEL_NAME))

        val now = System.currentTimeMillis()
        val today = LocalDate.now(ZoneId.systemDefault()).toString()
        val ledger = Ledger(prefs)
        val osScheduledIds = registryIds(prefs.getString(REGISTRY_KEY, null))

        fireDueEntries(plan.optJSONArray("entries") ?: JSONArray(), now, today, ledger, osScheduledIds)

        if (slot == ReminderScheduler.SLOT_EVENING) {
            evaluateStepsLow(plan.optJSONObject("stepsLow"), now, today, ledger, osScheduledIds)
        } else {
            stashYesterdaySteps(prefs)
        }

        ledger.flush()
        return Result.success()
    }

    /**
     * documentation/Subfeatures/Lépésszám átszinkronizálása a Samsung Health-ből.md — the 09:00 worker
     * reads yesterday's Health Connect step total and stashes it under
     * `steps.pendingHealthConnect.<date>` for {@link ActivityStepSyncService} to max-wins upsert on
     * the next app open. It does not write the app's SQLite / outbox itself.
     */
    private suspend fun stashYesterdaySteps(prefs: SharedPreferences) {
        val zone = ZoneId.systemDefault()
        val yesterday = LocalDate.now(zone).minusDays(1)
        val prefKey = PENDING_STEP_PREFIX + yesterday
        if (prefs.contains(prefKey)) {
            return
        }
        val start = yesterday.atStartOfDay(zone).toInstant()
        val end = yesterday.plusDays(1).atStartOfDay(zone).toInstant()
        val steps = aggregateSteps(start, end) ?: return
        if (steps > 0) {
            prefs.edit().putString(prefKey, steps.toString()).apply()
            Log.i(TAG, "Stashed $steps steps for $yesterday")
        }
    }

    /** Post every plan entry that fell due (but not too long ago) and isn't already fired / OS-scheduled. */
    private fun fireDueEntries(
        entries: JSONArray,
        now: Long,
        today: String,
        ledger: Ledger,
        osScheduledIds: Set<Int>,
    ) {
        for (i in 0 until entries.length()) {
            val entry = entries.optJSONObject(i) ?: continue
            val type = entry.optString("type")
            val key = entry.optString("key")
            val id = entry.optInt("id")
            val fireAt = entry.optLong("fireAtEpochMs")
            if (type.isEmpty() || key.isEmpty() || id == 0) {
                continue
            }
            if (fireAt > now || now - fireAt > STALE_LIMIT_MS) {
                continue // not due yet, or days-old → let the OS copy / app-open reconcile handle it
            }
            if (ledger.contains(type, key) || osScheduledIds.contains(id)) {
                continue
            }
            val title = entry.optString("title")
            val body = entry.optString("body")
            val route = entry.optString("route")
            post(id, title, body, route)
            ledger.record(type, key, today, title, body, route, fireAt)
        }
    }

    /**
     * documentation/Features/Értesítések.md §3 — the 20:00 STEPS_LOW rule, evaluated here from a live
     * Health Connect read (the only notification that can't be precomputed). Needs the
     * READ_HEALTH_DATA_IN_BACKGROUND grant; without it, silently leaves STEPS_LOW to the app-open path.
     */
    private suspend fun evaluateStepsLow(
        stepsLow: JSONObject?,
        now: Long,
        today: String,
        ledger: Ledger,
        osScheduledIds: Set<Int>,
    ) {
        if (stepsLow == null) {
            return
        }
        val id = stepsLow.optInt("id")
        val key = stepsLow.optString("key")
        val fireAt = stepsLow.optLong("fireAtEpochMs")
        val threshold = stepsLow.optInt("threshold", 2000)
        if (id == 0 || key.isEmpty()) {
            return
        }
        if (fireAt > now || now - fireAt > STALE_LIMIT_MS) {
            return
        }
        if (ledger.contains(STEPS_LOW_TYPE, key) || osScheduledIds.contains(id)) {
            return
        }

        val zone = ZoneId.systemDefault()
        val startOfToday = LocalDate.now(zone).atStartOfDay(zone).toInstant()
        val steps = aggregateSteps(startOfToday, Instant.ofEpochMilli(now)) ?: return
        Log.i(TAG, "STEPS_LOW check: today=$steps threshold=$threshold")
        if (steps >= threshold) {
            return
        }
        val title = stepsLow.optString("title")
        val route = stepsLow.optString("route")
        val body = stepsLow.optString("bodyTemplate")
            .replace(stepsLow.optString("stepsPlaceholder", "__STEPS__"), steps.toString())
        post(id, title, body, route)
        // Record the substituted body + the 20:00 fire time so the app-open history merge shows the
        // real text and hour, not the "__STEPS__" template at 09:00.
        ledger.record(STEPS_LOW_TYPE, key, today, title, body, route, fireAt)
    }

    /**
     * Step total from Health Connect over `[start, end)`, or null when it can't be read (SDK
     * unavailable, the READ_STEPS / background grant missing, or the query fails). Needs both grants:
     * the worker runs with no activity, so a foreground-only grant isn't enough.
     */
    private suspend fun aggregateSteps(start: Instant, end: Instant): Long? {
        if (HealthConnectClient.getSdkStatus(applicationContext) != HealthConnectClient.SDK_AVAILABLE) {
            return null
        }
        return try {
            val client = HealthConnectClient.getOrCreate(applicationContext)
            val granted = client.permissionController.getGrantedPermissions()
            if (!granted.contains(HealthPermission.PERMISSION_READ_HEALTH_DATA_IN_BACKGROUND) ||
                !granted.contains(HealthPermission.getReadPermission(StepsRecord::class))
            ) {
                Log.i(TAG, "Health Connect background read not granted; skipping")
                return null
            }
            val result: AggregationResult = client.aggregate(
                AggregateRequest(
                    metrics = setOf(StepsRecord.COUNT_TOTAL),
                    timeRangeFilter = TimeRangeFilter.between(start, end),
                ),
            )
            result[StepsRecord.COUNT_TOTAL] ?: 0L
        } catch (e: Exception) {
            Log.w(TAG, "Health Connect step read failed", e)
            null
        }
    }

    private fun post(id: Int, title: String, body: String, route: String) {
        val manager = NotificationManagerCompat.from(applicationContext)
        if (!manager.areNotificationsEnabled()) {
            Log.i(TAG, "Notifications disabled; skipping id=$id")
            return
        }
        val tapIntent = Intent(applicationContext, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
            if (route.isNotEmpty()) {
                putExtra(EXTRA_ROUTE, route)
            }
        }
        val contentIntent = PendingIntent.getActivity(
            applicationContext,
            id,
            tapIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        val notification = NotificationCompat.Builder(applicationContext, ReminderScheduler.CHANNEL_ID)
            .setSmallIcon(applicationContext.applicationInfo.icon)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setContentIntent(contentIntent)
            .build()
        try {
            manager.notify(id, notification)
            Log.i(TAG, "Posted background notification id=$id")
        } catch (e: SecurityException) {
            Log.w(TAG, "POST_NOTIFICATIONS not granted; id=$id not shown", e)
        }
    }

    private fun ensureChannel(name: String) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return
        }
        val manager = applicationContext.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager ?: return
        if (manager.getNotificationChannel(ReminderScheduler.CHANNEL_ID) != null) {
            return // the app (NotificationSchedulerService.ensureChannel) already created it
        }
        manager.createNotificationChannel(
            NotificationChannel(ReminderScheduler.CHANNEL_ID, name, NotificationManager.IMPORTANCE_HIGH),
        )
    }

    private fun registryIds(raw: String?): Set<Int> {
        if (raw.isNullOrBlank()) {
            return emptySet()
        }
        return try {
            JSONObject(raw).keys().asSequence().mapNotNull { it.toIntOrNull() }.toSet()
        } catch (e: Exception) {
            emptySet()
        }
    }

    /** The `lm2_notifBgDedupe` "already fired" ledger — loaded once, appended to, flushed once. */
    private class Ledger(private val prefs: SharedPreferences) {
        private val array = JSONArray(prefs.getString(DEDUPE_KEY, "[]") ?: "[]")
        private val keys = mutableSetOf<String>()
        private var dirty = false

        init {
            for (i in 0 until array.length()) {
                val row = array.optJSONObject(i) ?: continue
                val type = row.optString("type")
                val key = row.optString("key")
                if (type.isNotEmpty() && key.isNotEmpty()) {
                    keys.add("$type|$key")
                }
            }
        }

        fun contains(type: String, key: String): Boolean = keys.contains("$type|$key")

        /**
         * `day` drives the app's dedupe-retention prune; `title`/`body`/`route`/`firedAt` let the
         * app-open merge write a faithful notification-history row without re-deriving text (the
         * plan template can't — e.g. the STEPS_LOW body only has `__STEPS__` there).
         */
        fun record(type: String, key: String, day: String, title: String, body: String, route: String, firedAtEpochMs: Long) {
            if (keys.add("$type|$key")) {
                array.put(
                    JSONObject()
                        .put("type", type)
                        .put("key", key)
                        .put("day", day)
                        .put("title", title)
                        .put("body", body)
                        .put("route", route)
                        .put("firedAt", firedAtEpochMs),
                )
                dirty = true
            }
        }

        fun flush() {
            if (dirty) {
                prefs.edit().putString(DEDUPE_KEY, array.toString()).apply()
            }
        }
    }

    private companion object {
        const val TAG = "ReminderWorker"
        const val CAPACITOR_PREFS = "CapacitorStorage"
        const val PLAN_KEY = "lm2_notifBgPlan"
        const val DEDUPE_KEY = "lm2_notifBgDedupe"
        const val REGISTRY_KEY = "lm2_notifScheduled"
        const val DEFAULT_CHANNEL_NAME = "Reminders"
        const val STEPS_LOW_TYPE = "STEPS_LOW"

        /** Keep in sync with step-sync-plan.ts PENDING_NATIVE_STEP_PREFIX. */
        const val PENDING_STEP_PREFIX = "steps.pendingHealthConnect."

        /** Keep MainActivity's literal in sync — a notification tap stashes this extra for the JS side. */
        const val EXTRA_ROUTE = "hu.bumler.lm2.notificationRoute"

        /** Don't first-fire a notification whose scheduled time is more than this in the past. */
        const val STALE_LIMIT_MS = 20L * 60L * 60L * 1000L
    }
}
