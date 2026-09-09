package hu.bumler.lm2.widget

import android.content.Context
import android.widget.RemoteViews

/**
 * documentation/Features/Android kezdőképernyő widget.md — "Kombinált összegző" home-screen widget
 * (calories + steps + the two quick actions on one resizable card).
 */
class SummaryWidget : BaseLm2Widget() {
    override fun build(context: Context, snapshot: WidgetSnapshot?): RemoteViews =
        WidgetViews.buildSummary(context, snapshot)
}
