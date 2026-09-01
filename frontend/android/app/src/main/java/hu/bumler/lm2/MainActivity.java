package hu.bumler.lm2;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

import hu.bumler.lm2.health.HealthConnectStepsPlugin;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // App-local plugin (not an npm Capacitor package), so it is registered by hand.
        registerPlugin(HealthConnectStepsPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
