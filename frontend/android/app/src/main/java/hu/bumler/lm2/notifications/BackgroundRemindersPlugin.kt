package hu.bumler.lm2.notifications

import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

/**
 * documentation/Features/Értesítések.md "08:00 / 20:00 háttér-értesítés worker" — app-local Capacitor
 * plugin (not an npm package; registered by hand in MainActivity, like HealthConnectStepsPlugin).
 *
 * The only thing the JS side needs from the native worker layer: (re-)arm the two daily alarms at
 * cold start. All the actual work lives in [ReminderWorker] and is driven by the JS-written
 * `lm2_notifBgPlan`. TS contract: frontend/src/app/core/notifications/background-reminders.plugin.ts.
 */
@CapacitorPlugin(name = "BackgroundReminders")
class BackgroundRemindersPlugin : Plugin() {

    @PluginMethod
    fun ensureScheduled(call: PluginCall) {
        ReminderScheduler.ensureScheduled(context)
        call.resolve()
    }
}
