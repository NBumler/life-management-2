package hu.bumler.lm2.widget

import android.content.Context
import android.widget.RemoteViews

/** documentation/Features/Android kezdőképernyő widget.md — "Gyorsgombok" home-screen widget. */
class QuickActionsWidget : BaseLm2Widget() {
    override fun build(context: Context, snapshot: WidgetSnapshot?): RemoteViews =
        WidgetViews.buildQuickActions(context, snapshot)
}
