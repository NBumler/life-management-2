package hu.bumler.lm2;

import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

import hu.bumler.lm2.health.HealthConnectStepsPlugin;
import hu.bumler.lm2.notifications.BackgroundRemindersPlugin;

public class MainActivity extends BridgeActivity {

    // documentation/Features/Értesítések.md "08:00 / 20:00 háttér-értesítés worker": a notification
    // posted by ReminderWorker (not via @capacitor/local-notifications) carries its deep-link route
    // as this extra. We stash it in the CapacitorStorage SharedPreferences file so the JS side
    // (NotificationSchedulerService.drainPendingRoute) can navigate to it. Keep the literal in sync
    // with ReminderWorker.EXTRA_ROUTE.
    private static final String EXTRA_ROUTE = "hu.bumler.lm2.notificationRoute";
    private static final String CAPACITOR_PREFS = "CapacitorStorage";
    private static final String PENDING_ROUTE_KEY = "lm2_notifPendingRoute";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // App-local plugins (not npm Capacitor packages), so they are registered by hand.
        registerPlugin(HealthConnectStepsPlugin.class);
        registerPlugin(BackgroundRemindersPlugin.class);
        super.onCreate(savedInstanceState);
        stashNotificationRoute(getIntent());
    }

    @Override
    public void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        stashNotificationRoute(intent);
    }

    private void stashNotificationRoute(Intent intent) {
        if (intent == null) {
            return;
        }
        String route = intent.getStringExtra(EXTRA_ROUTE);
        if (route == null || route.isEmpty()) {
            return;
        }
        SharedPreferences prefs = getSharedPreferences(CAPACITOR_PREFS, MODE_PRIVATE);
        prefs.edit().putString(PENDING_ROUTE_KEY, route).apply();
        intent.removeExtra(EXTRA_ROUTE);
    }
}
