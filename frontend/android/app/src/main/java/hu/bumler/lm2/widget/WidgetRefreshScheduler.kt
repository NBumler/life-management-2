package hu.bumler.lm2.widget

import android.content.Context
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import java.util.concurrent.TimeUnit

/**
 * documentation/Features/Android kezdőképernyő widget.md — arms the periodic background refresh for
 * the home-screen widgets. Called from `Lm2WidgetPlugin.ensureBackgroundRefresh()` at app start /
 * post-login. `KEEP` so an already-scheduled job is left running; ~30 minutes is the practical floor
 * for `PeriodicWorkRequest`.
 */
object WidgetRefreshScheduler {

    private const val WORK_NAME = "lm2-widget-refresh"
    private const val INTERVAL_MINUTES = 30L

    fun ensure(context: Context) {
        val request = PeriodicWorkRequestBuilder<WidgetUpdateWorker>(INTERVAL_MINUTES, TimeUnit.MINUTES).build()
        WorkManager.getInstance(context).enqueueUniquePeriodicWork(
            WORK_NAME,
            ExistingPeriodicWorkPolicy.KEEP,
            request,
        )
    }
}
