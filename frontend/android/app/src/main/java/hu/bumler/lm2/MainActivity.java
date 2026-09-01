package hu.bumler.lm2;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

import hu.bumler.lm2.health.HealthConnectStepsPlugin;
import hu.bumler.lm2.notifications.BackgroundRemindersPlugin;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // App-local plugins (not npm Capacitor packages), so they are registered by hand.
        registerPlugin(HealthConnectStepsPlugin.class);
        registerPlugin(BackgroundRemindersPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
