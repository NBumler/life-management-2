package hu.bumler.lm2.widget

import android.content.Context
import org.json.JSONObject

/**
 * documentation/Features/Android kezdőképernyő widget.md — the parsed form of the `lm2_widgetSnapshot`
 * JSON that `WidgetSnapshotService` writes into the `CapacitorStorage` SharedPreferences file
 * (`@capacitor/preferences`). Same bridge the notification background worker uses for `lm2_notifBgPlan`.
 * All user-facing strings are already localized on the JS side; the widget only formats numbers.
 * TS contract: frontend/src/app/core/widget/widget-snapshot.ts.
 */
data class WidgetSnapshot(
    val loggedIn: Boolean,
    /** `null` => the profile lacks TDEE inputs; the nutrition / summary widgets show `noProfile`. */
    val nutrition: Nutrition?,
    val stepCount: Int,
    val stepGoal: Int,
    private val labels: Map<String, String>,
    private val routes: Map<String, String>,
) {
    data class Nutrient(val intake: Int, val goal: Int)

    data class Nutrition(
        val incomplete: Boolean,
        val kcal: Nutrient,
        val protein: Nutrient,
        val carbs: Nutrient,
        val fat: Nutrient,
    )

    fun label(key: String): String = labels[key].orEmpty()

    fun route(key: String): String = routes[key] ?: DEFAULT_ROUTE

    companion object {
        const val PREFS_NAME = "CapacitorStorage"
        const val SNAPSHOT_KEY = "lm2_widgetSnapshot"
        private const val DEFAULT_ROUTE = "/tabs/home"

        // Label keys — must match WIDGET_LABEL_KEYS in widget-snapshot.ts.
        const val L_APP_TITLE = "appTitle"
        const val L_NUTRITION_TITLE = "nutritionTitle"
        const val L_STEPS_TITLE = "stepsTitle"
        const val L_QUICK_TITLE = "quickTitle"
        const val L_KCAL = "kcal"
        const val L_PROTEIN = "protein"
        const val L_CARBS = "carbs"
        const val L_FAT = "fat"
        const val L_STEPS_UNIT = "stepsUnit"
        const val L_REMAINING = "remaining"
        const val L_LOGGED_OUT = "loggedOut"
        const val L_NO_PROFILE = "noProfile"
        const val L_NEW_MEAL = "newMeal"
        const val L_NEW_CLIMB = "newClimb"

        // Route keys — must match WIDGET_ROUTES in widget-snapshot.ts.
        const val R_OPEN = "open"
        const val R_NUTRITION = "nutrition"
        const val R_STEPS = "steps"
        const val R_PROFILE = "profile"
        const val R_NEW_MEAL = "newMeal"
        const val R_NEW_CLIMB = "newClimb"

        fun read(context: Context): WidgetSnapshot? {
            val raw = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                .getString(SNAPSHOT_KEY, null) ?: return null
            return try {
                parse(JSONObject(raw))
            } catch (e: Exception) {
                null
            }
        }

        private fun parse(root: JSONObject): WidgetSnapshot {
            val nutritionJson = root.optJSONObject("nutrition")
            val steps = root.optJSONObject("steps")
            return WidgetSnapshot(
                loggedIn = root.optBoolean("loggedIn", false),
                nutrition = nutritionJson?.let {
                    Nutrition(
                        incomplete = it.optBoolean("incomplete", false),
                        kcal = nutrient(it.optJSONObject("kcal")),
                        protein = nutrient(it.optJSONObject("proteinG")),
                        carbs = nutrient(it.optJSONObject("carbsG")),
                        fat = nutrient(it.optJSONObject("fatG")),
                    )
                },
                stepCount = steps?.optInt("count", 0) ?: 0,
                stepGoal = steps?.optInt("goal", 0) ?: 0,
                labels = stringMap(root.optJSONObject("labels")),
                routes = stringMap(root.optJSONObject("routes")),
            )
        }

        private fun nutrient(obj: JSONObject?): Nutrient =
            Nutrient(obj?.optInt("intake", 0) ?: 0, obj?.optInt("goal", 0) ?: 0)

        private fun stringMap(obj: JSONObject?): Map<String, String> {
            if (obj == null) return emptyMap()
            val out = HashMap<String, String>()
            for (key in obj.keys()) {
                out[key] = obj.optString(key, "")
            }
            return out
        }
    }
}
