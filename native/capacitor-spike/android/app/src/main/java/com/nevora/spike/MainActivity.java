package com.nevora.spike;

import android.os.Bundle;
import android.content.pm.ApplicationInfo;
import android.net.Uri;
import android.webkit.WebView;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.BridgeActivity;
import java.io.InputStream;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import org.json.JSONObject;

public class MainActivity extends BridgeActivity {
    private boolean backInFlight = false;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (bridge == null) return;
        String serverUrl = bridge.getConfig().getServerUrl();
        if (serverUrl == null || serverUrl.isEmpty()) return;

        // Defense in depth: the TypeScript config already rejects remote hosts.
        Uri target = Uri.parse(serverUrl);
        String host = target.getHost();
        boolean local = "http".equals(target.getScheme()) &&
            ("localhost".equals(host) || "127.0.0.1".equals(host) || "10.0.2.2".equals(host));
        if (!local || (getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) == 0) {
            finish();
            return;
        }
        final String dismissScript;
        try (InputStream input = getAssets().open("native-back.js");
             ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[4096];
            int count;
            while ((count = input.read(buffer)) != -1) output.write(buffer, 0, count);
            dismissScript = output.toString(StandardCharsets.UTF_8.name());
        } catch (Exception failure) {
            throw new IllegalStateException("Native Back policy asset is missing", failure);
        }

        // Registered after Capacitor's App plugin: only this local-runtime
        // callback runs, even when the web app has no Capacitor JS dependency.
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (backInFlight) return;
                WebView webView = bridge.getWebView();
                backInFlight = true;
                webView.evaluateJavascript(dismissScript, result -> {
                    backInFlight = false;
                    try {
                        JSONObject state = new JSONObject(result);
                        if (state.optBoolean("dismissed")) return;
                        if (state.optBoolean("root")) {
                            moveTaskToBack(true);
                            return;
                        }
                    } catch (Exception ignored) {
                        // An error page may have no document. Native history still works.
                    }
                    if (webView.canGoBack()) webView.goBack();
                    else moveTaskToBack(true);
                });
            }
        });
    }
}
