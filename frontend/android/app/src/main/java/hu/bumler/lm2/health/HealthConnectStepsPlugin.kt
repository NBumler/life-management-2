package hu.bumler.lm2.health

import androidx.activity.result.ActivityResult
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import androidx.health.connect.client.aggregate.AggregationResult
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.request.AggregateRequest
import androidx.health.connect.client.time.TimeRangeFilter
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.ActivityCallback
import com.getcapacitor.annotation.CapacitorPlugin
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.ZoneId

/**
 * documentation/Subfeatures/Lépésszám átszinkronizálása a Samsung Health-ből.md — Capacitor bridge
 * to Android Health Connect (Samsung Health is a data source behind it). Read-only: exposes SDK
 * availability, the `READ_STEPS` grant, and a per-day step total.
 *
 * TS contract: frontend/src/app/core/health/health-connect.plugin.ts. All policy (max-wins upsert,
 * 7-day backfill, TDEE recompute) lives client-side in ActivityStepSyncService — this class only
 * answers questions about the device.
 *
 * iOS is a later scope (documentation/Features/Lépésszám követés.md "Megjegyzések").
 */
@CapacitorPlugin(name = "HealthConnectSteps")
class HealthConnectStepsPlugin : Plugin() {

    private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())
    private val readStepsPermission = HealthPermission.getReadPermission(StepsRecord::class)

    /**
     * documentation/Features/Értesítések.md "08:00 / 20:00 háttér-értesítés worker" — Health Connect
     * needs this extra grant for the 20:00 background step read (notifications/ReminderWorker.kt). It
     * is only offered once [readStepsPermission] is already granted.
     */
    private val backgroundReadPermission = HealthPermission.PERMISSION_READ_HEALTH_DATA_IN_BACKGROUND

    private fun sdkAvailable(): Boolean =
        HealthConnectClient.getSdkStatus(context) == HealthConnectClient.SDK_AVAILABLE

    private fun clientOrNull(): HealthConnectClient? =
        if (sdkAvailable()) HealthConnectClient.getOrCreate(context) else null

    /** Whether Health Connect is installed and usable on this device. */
    @PluginMethod
    fun isAvailable(call: PluginCall) {
        call.resolve(JSObject().put("available", sdkAvailable()))
    }

    /** Current READ_STEPS grant, without prompting. `false` when Health Connect is unavailable. */
    @PluginMethod
    fun checkPermission(call: PluginCall) {
        val client = clientOrNull()
        if (client == null) {
            call.resolve(JSObject().put("granted", false))
            return
        }
        scope.launch {
            try {
                val granted = client.permissionController.getGrantedPermissions()
                    .contains(readStepsPermission)
                call.resolve(JSObject().put("granted", granted))
            } catch (e: Exception) {
                call.reject("Health Connect permission check failed", e)
            }
        }
    }

    /** Prompt for READ_STEPS; resolves with the grant the user chose. */
    @PluginMethod
    fun requestPermission(call: PluginCall) {
        if (!sdkAvailable()) {
            call.resolve(JSObject().put("granted", false))
            return
        }
        val intent = PermissionController.createRequestPermissionResultContract()
            .createIntent(context, setOf(readStepsPermission))
        startActivityForResult(call, intent, "onPermissionResult")
    }

    @ActivityCallback
    fun onPermissionResult(call: PluginCall?, result: ActivityResult) {
        if (call == null) {
            return
        }
        val client = clientOrNull()
        if (client == null) {
            call.resolve(JSObject().put("granted", false))
            return
        }
        scope.launch {
            try {
                val granted = client.permissionController.getGrantedPermissions()
                    .contains(readStepsPermission)
                call.resolve(JSObject().put("granted", granted))
            } catch (e: Exception) {
                call.reject("Health Connect permission result read failed", e)
            }
        }
    }

    /** Current READ_HEALTH_DATA_IN_BACKGROUND grant, without prompting. */
    @PluginMethod
    fun checkBackgroundPermission(call: PluginCall) {
        val client = clientOrNull()
        if (client == null) {
            call.resolve(JSObject().put("granted", false))
            return
        }
        scope.launch {
            try {
                val granted = client.permissionController.getGrantedPermissions()
                    .contains(backgroundReadPermission)
                call.resolve(JSObject().put("granted", granted))
            } catch (e: Exception) {
                call.reject("Health Connect background permission check failed", e)
            }
        }
    }

    /** Prompt for the background-read permission; resolves with the resulting grant. */
    @PluginMethod
    fun requestBackgroundPermission(call: PluginCall) {
        if (!sdkAvailable()) {
            call.resolve(JSObject().put("granted", false))
            return
        }
        val intent = PermissionController.createRequestPermissionResultContract()
            .createIntent(context, setOf(backgroundReadPermission))
        startActivityForResult(call, intent, "onBackgroundPermissionResult")
    }

    @ActivityCallback
    fun onBackgroundPermissionResult(call: PluginCall?, result: ActivityResult) {
        if (call == null) {
            return
        }
        val client = clientOrNull()
        if (client == null) {
            call.resolve(JSObject().put("granted", false))
            return
        }
        scope.launch {
            try {
                val granted = client.permissionController.getGrantedPermissions()
                    .contains(backgroundReadPermission)
                call.resolve(JSObject().put("granted", granted))
            } catch (e: Exception) {
                call.reject("Health Connect background permission result read failed", e)
            }
        }
    }

    /**
     * Total steps for a single client-local calendar day (`YYYY-MM-DD`), summed over the Health
     * Connect buckets that fall within that day in the device's own timezone.
     */
    @PluginMethod
    fun readDailySteps(call: PluginCall) {
        val dateStr = call.getString("date")
        if (dateStr.isNullOrBlank()) {
            call.reject("`date` (YYYY-MM-DD) is required")
            return
        }
        val client = clientOrNull()
        if (client == null) {
            call.reject("Health Connect is not available on this device")
            return
        }
        val day = try {
            LocalDate.parse(dateStr)
        } catch (e: Exception) {
            call.reject("`date` must be an ISO calendar day (YYYY-MM-DD)", e)
            return
        }
        val zone = ZoneId.systemDefault()
        val startTime = day.atStartOfDay(zone).toInstant()
        val endTime = day.plusDays(1).atStartOfDay(zone).toInstant()
        scope.launch {
            try {
                val response: AggregationResult = client.aggregate(
                    AggregateRequest(
                        metrics = setOf(StepsRecord.COUNT_TOTAL),
                        timeRangeFilter = TimeRangeFilter.between(startTime, endTime),
                    ),
                )
                val steps = response[StepsRecord.COUNT_TOTAL] ?: 0L
                call.resolve(
                    JSObject()
                        .put("date", dateStr)
                        .put("steps", steps),
                )
            } catch (e: Exception) {
                call.reject("Health Connect step read failed", e)
            }
        }
    }

    override fun handleOnDestroy() {
        super.handleOnDestroy()
        scope.cancel()
    }
}
