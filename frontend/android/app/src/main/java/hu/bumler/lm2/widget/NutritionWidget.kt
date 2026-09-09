package hu.bumler.lm2.widget

import android.content.Context
import android.widget.RemoteViews

/** documentation/Features/Android kezdőképernyő widget.md — "Mai étkezés állása" home-screen widget. */
class NutritionWidget : BaseLm2Widget() {
    override fun build(context: Context, snapshot: WidgetSnapshot?): RemoteViews =
        WidgetViews.buildNutrition(context, snapshot)
}
