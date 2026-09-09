package hu.bumler.lm2.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.view.View
import android.widget.RemoteViews
import hu.bumler.lm2.MainActivity
import hu.bumler.lm2.R
import java.util.Locale

/**
 * documentation/Features/Android kezdőképernyő widget.md — builds the `RemoteViews` for the four
 * home-screen widgets from a [WidgetSnapshot], and re-broadcasts an update to every placed widget
 * when the JS side asks (`Lm2WidgetPlugin.refresh` / [WidgetUpdateWorker]).
 *
 * Deep links reuse the notification route-stash: a tap launches [MainActivity] with the
 * `EXTRA_ROUTE` extra, which `MainActivity.stashNotificationRoute` writes to `lm2_notifPendingRoute`
 * for `NotificationSchedulerService.drainPendingRoute()` to navigate to.
 */
object WidgetViews {

    /** Keep in sync with MainActivity.EXTRA_ROUTE / ReminderWorker.EXTRA_ROUTE. */
    private const val EXTRA_ROUTE = "hu.bumler.lm2.notificationRoute"

    private const val UNIT_KCAL = "kcal"
    private const val UNIT_G = "g"

    private const val REQ_NUTRITION = 5101
    private const val REQ_STEPS = 5102
    private const val REQ_QUICK = 5103
    private const val REQ_QUICK_MEAL = 5104
    private const val REQ_QUICK_CLIMB = 5105
    private const val REQ_SUMMARY = 5106
    private const val REQ_SUMMARY_MEAL = 5107
    private const val REQ_SUMMARY_CLIMB = 5108

    private val PROVIDERS = listOf(
        NutritionWidget::class.java,
        StepsWidget::class.java,
        QuickActionsWidget::class.java,
        SummaryWidget::class.java,
    )

    /** Ask every placed widget of every kind to redraw from the current snapshot. */
    fun updateAll(context: Context) {
        val manager = AppWidgetManager.getInstance(context) ?: return
        for (provider in PROVIDERS) {
            val ids = manager.getAppWidgetIds(ComponentName(context, provider))
            if (ids.isEmpty()) {
                continue
            }
            context.sendBroadcast(
                Intent(context, provider).apply {
                    action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
                    putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids)
                },
            )
        }
    }

    fun buildNutrition(context: Context, snap: WidgetSnapshot?): RemoteViews {
        val views = RemoteViews(context.packageName, R.layout.widget_nutrition)
        views.setTextViewText(
            R.id.widget_title,
            snap?.label(WidgetSnapshot.L_NUTRITION_TITLE).nonBlankOr(context.getString(R.string.widget_nutrition_label)),
        )

        val hint = hintFor(context, snap, needsProfile = true)
        if (hint != null) {
            views.setViewVisibility(R.id.nutrition_rows, View.GONE)
            views.setViewVisibility(R.id.widget_hint, View.VISIBLE)
            views.setTextViewText(R.id.widget_hint, hint)
            views.setOnClickPendingIntent(R.id.widget_root, tap(context, hintRoute(snap), REQ_NUTRITION))
            return views
        }

        val nutrition = snap!!.nutrition!!
        views.setViewVisibility(R.id.widget_hint, View.GONE)
        views.setViewVisibility(R.id.nutrition_rows, View.VISIBLE)
        nutrientRow(views, snap, R.id.row_kcal_text, R.id.row_kcal_bar, snap.label(WidgetSnapshot.L_KCAL), nutrition.kcal, UNIT_KCAL)
        nutrientRow(views, snap, R.id.row_protein_text, R.id.row_protein_bar, snap.label(WidgetSnapshot.L_PROTEIN), nutrition.protein, UNIT_G)
        nutrientRow(views, snap, R.id.row_carbs_text, R.id.row_carbs_bar, snap.label(WidgetSnapshot.L_CARBS), nutrition.carbs, UNIT_G)
        nutrientRow(views, snap, R.id.row_fat_text, R.id.row_fat_bar, snap.label(WidgetSnapshot.L_FAT), nutrition.fat, UNIT_G)
        views.setOnClickPendingIntent(R.id.widget_root, tap(context, snap.route(WidgetSnapshot.R_NUTRITION), REQ_NUTRITION))
        return views
    }

    fun buildSteps(context: Context, snap: WidgetSnapshot?): RemoteViews {
        val views = RemoteViews(context.packageName, R.layout.widget_steps)
        views.setTextViewText(
            R.id.widget_title,
            snap?.label(WidgetSnapshot.L_STEPS_TITLE).nonBlankOr(context.getString(R.string.widget_steps_label)),
        )

        val hint = hintFor(context, snap, needsProfile = false)
        if (hint != null) {
            views.setTextViewText(R.id.steps_value, "–")
            views.setTextViewText(R.id.steps_caption, hint)
            views.setProgressBar(R.id.steps_bar, 100, 0, false)
            views.setOnClickPendingIntent(R.id.widget_root, tap(context, hintRoute(snap), REQ_STEPS))
            return views
        }

        views.setTextViewText(R.id.steps_value, formatInt(snap!!.stepCount))
        views.setTextViewText(R.id.steps_caption, stepsCaption(snap))
        views.setProgressBar(R.id.steps_bar, 100, pct(snap.stepCount, snap.stepGoal), false)
        views.setOnClickPendingIntent(R.id.widget_root, tap(context, snap.route(WidgetSnapshot.R_STEPS), REQ_STEPS))
        return views
    }

    fun buildQuickActions(context: Context, snap: WidgetSnapshot?): RemoteViews {
        val views = RemoteViews(context.packageName, R.layout.widget_quick_actions)
        views.setTextViewText(
            R.id.widget_title,
            snap?.label(WidgetSnapshot.L_QUICK_TITLE).nonBlankOr(context.getString(R.string.widget_quick_label)),
        )

        if (snap == null) {
            views.setViewVisibility(R.id.widget_hint, View.VISIBLE)
            views.setTextViewText(R.id.widget_hint, context.getString(R.string.widget_placeholder))
            views.setViewVisibility(R.id.btn_new_meal, View.GONE)
            views.setViewVisibility(R.id.btn_new_climb, View.GONE)
            views.setOnClickPendingIntent(R.id.widget_root, tap(context, "/tabs/home", REQ_QUICK))
            return views
        }

        views.setViewVisibility(R.id.widget_hint, View.GONE)
        views.setViewVisibility(R.id.btn_new_meal, View.VISIBLE)
        views.setViewVisibility(R.id.btn_new_climb, View.VISIBLE)
        views.setTextViewText(R.id.btn_new_meal, snap.label(WidgetSnapshot.L_NEW_MEAL))
        views.setTextViewText(R.id.btn_new_climb, snap.label(WidgetSnapshot.L_NEW_CLIMB))
        views.setOnClickPendingIntent(R.id.btn_new_meal, tap(context, snap.route(WidgetSnapshot.R_NEW_MEAL), REQ_QUICK_MEAL))
        views.setOnClickPendingIntent(R.id.btn_new_climb, tap(context, snap.route(WidgetSnapshot.R_NEW_CLIMB), REQ_QUICK_CLIMB))
        views.setOnClickPendingIntent(R.id.widget_root, tap(context, snap.route(WidgetSnapshot.R_OPEN), REQ_QUICK))
        return views
    }

    fun buildSummary(context: Context, snap: WidgetSnapshot?): RemoteViews {
        val views = RemoteViews(context.packageName, R.layout.widget_summary)
        views.setTextViewText(
            R.id.widget_title,
            snap?.label(WidgetSnapshot.L_APP_TITLE).nonBlankOr(context.getString(R.string.widget_summary_label)),
        )

        val hint = hintFor(context, snap, needsProfile = false)
        if (hint != null) {
            views.setViewVisibility(R.id.summary_body, View.GONE)
            views.setViewVisibility(R.id.summary_actions, View.GONE)
            views.setViewVisibility(R.id.widget_hint, View.VISIBLE)
            views.setTextViewText(R.id.widget_hint, hint)
            views.setOnClickPendingIntent(R.id.widget_root, tap(context, hintRoute(snap), REQ_SUMMARY))
            return views
        }

        views.setViewVisibility(R.id.widget_hint, View.GONE)
        views.setViewVisibility(R.id.summary_body, View.VISIBLE)
        views.setViewVisibility(R.id.summary_actions, View.VISIBLE)

        val nutrition = snap!!.nutrition
        if (nutrition != null) {
            nutrientRow(views, snap, R.id.row_kcal_text, R.id.row_kcal_bar, snap.label(WidgetSnapshot.L_KCAL), nutrition.kcal, UNIT_KCAL)
        } else {
            views.setTextViewText(R.id.row_kcal_text, snap.label(WidgetSnapshot.L_NO_PROFILE))
            views.setProgressBar(R.id.row_kcal_bar, 100, 0, false)
        }
        views.setTextViewText(R.id.row_steps_text, "${snap.label(WidgetSnapshot.L_STEPS_TITLE)}  ${formatInt(snap.stepCount)} ${snap.label(WidgetSnapshot.L_STEPS_UNIT)}")
        views.setProgressBar(R.id.row_steps_bar, 100, pct(snap.stepCount, snap.stepGoal), false)

        views.setTextViewText(R.id.btn_new_meal, snap.label(WidgetSnapshot.L_NEW_MEAL))
        views.setTextViewText(R.id.btn_new_climb, snap.label(WidgetSnapshot.L_NEW_CLIMB))
        views.setOnClickPendingIntent(R.id.btn_new_meal, tap(context, snap.route(WidgetSnapshot.R_NEW_MEAL), REQ_SUMMARY_MEAL))
        views.setOnClickPendingIntent(R.id.btn_new_climb, tap(context, snap.route(WidgetSnapshot.R_NEW_CLIMB), REQ_SUMMARY_CLIMB))
        views.setOnClickPendingIntent(R.id.widget_root, tap(context, snap.route(WidgetSnapshot.R_OPEN), REQ_SUMMARY))
        return views
    }

    // --- helpers -------------------------------------------------------------

    /** The hint text to show instead of data, or null when the widget can render its data. */
    private fun hintFor(context: Context, snap: WidgetSnapshot?, needsProfile: Boolean): String? = when {
        snap == null -> context.getString(R.string.widget_placeholder)
        !snap.loggedIn -> snap.label(WidgetSnapshot.L_LOGGED_OUT)
        needsProfile && snap.nutrition == null -> snap.label(WidgetSnapshot.L_NO_PROFILE)
        else -> null
    }

    private fun hintRoute(snap: WidgetSnapshot?): String = when {
        snap == null || !snap.loggedIn -> "/tabs/home"
        snap.nutrition == null -> snap.route(WidgetSnapshot.R_PROFILE)
        else -> snap.route(WidgetSnapshot.R_OPEN)
    }

    private fun nutrientRow(
        views: RemoteViews,
        snap: WidgetSnapshot,
        textId: Int,
        barId: Int,
        label: String,
        nutrient: WidgetSnapshot.Nutrient,
        unit: String,
    ) {
        val base = "$label  ${formatInt(nutrient.intake)} / ${formatInt(nutrient.goal)} $unit"
        val text = if (nutrient.goal > 0 && nutrient.intake < nutrient.goal) {
            val remaining = snap.label(WidgetSnapshot.L_REMAINING)
                .replace("{n}", "${formatInt(nutrient.goal - nutrient.intake)} $unit")
            "$base · $remaining"
        } else {
            base
        }
        views.setTextViewText(textId, text)
        views.setProgressBar(barId, 100, pct(nutrient.intake, nutrient.goal), false)
    }

    private fun stepsCaption(snap: WidgetSnapshot): String {
        val unit = snap.label(WidgetSnapshot.L_STEPS_UNIT)
        return if (snap.stepGoal > 0) "$unit · ${formatInt(snap.stepGoal)}" else unit
    }

    private fun tap(context: Context, route: String, requestCode: Int): PendingIntent {
        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra(EXTRA_ROUTE, route)
        }
        return PendingIntent.getActivity(
            context,
            requestCode,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
    }

    private fun formatInt(value: Int): String = String.format(Locale.getDefault(), "%,d", value.coerceAtLeast(0))

    private fun pct(intake: Int, goal: Int): Int =
        if (goal <= 0) 0 else (intake.toLong() * 100 / goal).toInt().coerceIn(0, 100)

    private fun String?.nonBlankOr(fallback: String): String = if (this.isNullOrBlank()) fallback else this
}
