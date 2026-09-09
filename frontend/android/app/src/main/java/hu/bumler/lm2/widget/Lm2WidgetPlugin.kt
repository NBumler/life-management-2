package hu.bumler.lm2.widget

import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

/**
 * documentation/Features/Android kezdőképernyő widget.md — app-local Capacitor plugin (not an npm
 * package; registered by hand in MainActivity, like BackgroundRemindersPlugin / HealthConnectStepsPlugin).
 *
 * The JS side ([WidgetSnapshotService]) writes the `lm2_widgetSnapshot` blob into the
 * `CapacitorStorage` SharedPreferences file, then calls [refresh] so the four [BaseLm2Widget]
 * providers redraw from it. [ensureBackgroundRefresh] arms a ~30-minute [WidgetUpdateWorker] that
 * re-reads today's step count from Health Connect while the app is closed. TS contract:
 * frontend/src/app/core/widget/lm2-widget.plugin.ts.
 */
@CapacitorPlugin(name = "Lm2Widget")
class Lm2WidgetPlugin : Plugin() {

    @PluginMethod
    fun refresh(call: PluginCall) {
        WidgetViews.updateAll(context)
        call.resolve()
    }

    @PluginMethod
    fun ensureBackgroundRefresh(call: PluginCall) {
        WidgetRefreshScheduler.ensure(context)
        call.resolve()
    }
}
