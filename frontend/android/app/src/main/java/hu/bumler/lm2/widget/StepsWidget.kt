package hu.bumler.lm2.widget

import android.content.Context
import android.widget.RemoteViews

/** documentation/Features/Android kezdőképernyő widget.md — "Lépésszám" home-screen widget. */
class StepsWidget : BaseLm2Widget() {
    override fun build(context: Context, snapshot: WidgetSnapshot?): RemoteViews =
        WidgetViews.buildSteps(context, snapshot)
}
