package hu.bumler.lm2.widget

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.widget.RemoteViews

/**
 * documentation/Features/Android kezdőképernyő widget.md — shared `onUpdate` for the four home-screen
 * widget providers. Each subclass only supplies its `RemoteViews`; the data comes from the
 * `lm2_widgetSnapshot` blob via [WidgetViews]. The `updatePeriodMillis` set in each
 * `res/xml/widget_..._info.xml` triggers a periodic redraw from the last snapshot even with the app
 * closed — [WidgetUpdateWorker] is what keeps the step count itself fresh in the background.
 */
abstract class BaseLm2Widget : AppWidgetProvider() {

    protected abstract fun build(context: Context, snapshot: WidgetSnapshot?): RemoteViews

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        val snapshot = WidgetSnapshot.read(context)
        val views = build(context, snapshot)
        for (id in appWidgetIds) {
            appWidgetManager.updateAppWidget(id, views)
        }
    }
}
