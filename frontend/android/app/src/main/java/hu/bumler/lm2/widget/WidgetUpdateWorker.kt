package hu.bumler.lm2.widget

import android.content.Context
import android.util.Log
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.request.AggregateRequest
import androidx.health.connect.client.time.TimeRangeFilter
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import org.json.JSONObject
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId

/**
 * documentation/Features/Android kezdőképernyő widget.md — the ~30-minute background job that keeps
 * the home-screen widgets fresh while the app is closed. It can only refresh the **step count**
 * (a plain Health Connect aggregate read, the same one `ReminderWorker` does) — the calorie / macro
 * figures need the app's SQLite + JS and stay as of the last app foreground (tudatos korlát).
 *
 * It reads / writes only the `lm2_widgetSnapshot` blob in the `CapacitorStorage` SharedPreferences
 * file, then asks every placed widget to redraw.
 */
class WidgetUpdateWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        patchStepCount()
        WidgetViews.updateAll(applicationContext)
        return Result.success()
    }

    private suspend fun patchStepCount() {
        val steps = readTodaySteps() ?: return
        val prefs = applicationContext.getSharedPreferences(WidgetSnapshot.PREFS_NAME, Context.MODE_PRIVATE)
        val raw = prefs.getString(WidgetSnapshot.SNAPSHOT_KEY, null) ?: return
        val root = try {
            JSONObject(raw)
        } catch (e: Exception) {
            Log.w(TAG, "widget snapshot is not valid JSON", e)
            return
        }
        val stepsObj = root.optJSONObject("steps") ?: JSONObject().also { root.put("steps", it) }
        // max-wins, consistent with the rest of the step pipeline (DailyStepLogRepository.maxWinsUpsert).
        if (steps <= stepsObj.optLong("count", 0L)) {
            return
        }
        stepsObj.put("count", steps)
        root.put("writtenAt", System.currentTimeMillis())
        prefs.edit().putString(WidgetSnapshot.SNAPSHOT_KEY, root.toString()).apply()
        Log.i(TAG, "widget snapshot step count patched to $steps")
    }

    /** Today's Health Connect step total, or null when it can't be read (SDK / grants / query failure). */
    private suspend fun readTodaySteps(): Long? {
        if (HealthConnectClient.getSdkStatus(applicationContext) != HealthConnectClient.SDK_AVAILABLE) {
            return null
        }
        return try {
            val client = HealthConnectClient.getOrCreate(applicationContext)
            val granted = client.permissionController.getGrantedPermissions()
            if (!granted.contains(HealthPermission.PERMISSION_READ_HEALTH_DATA_IN_BACKGROUND) ||
                !granted.contains(HealthPermission.getReadPermission(StepsRecord::class))
            ) {
                return null
            }
            val zone = ZoneId.systemDefault()
            val start = LocalDate.now(zone).atStartOfDay(zone).toInstant()
            val result = client.aggregate(
                AggregateRequest(
                    metrics = setOf(StepsRecord.COUNT_TOTAL),
                    timeRangeFilter = TimeRangeFilter.between(start, Instant.now()),
                ),
            )
            result[StepsRecord.COUNT_TOTAL] ?: 0L
        } catch (e: Exception) {
            Log.w(TAG, "Health Connect step read failed", e)
            null
        }
    }

    private companion object {
        const val TAG = "WidgetUpdateWorker"
    }
}
