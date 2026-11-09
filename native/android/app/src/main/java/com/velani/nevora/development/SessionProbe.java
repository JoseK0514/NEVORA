package com.velani.nevora.development;

import android.os.Handler;
import android.os.Looper;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.CookieHandler;
import java.net.HttpURLConnection;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.Future;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;

/** Credential-free compatibility only. The WebView validates its own session. */
final class SessionProbe {
    interface Completion { void finish(boolean compatible); }
    private static final ThreadPoolExecutor executor = new ThreadPoolExecutor(1, 1, 0, TimeUnit.SECONDS,
        new ArrayBlockingQueue<>(1), work -> { Thread thread = new Thread(work, "nevora-compatibility"); thread.setDaemon(true); return thread; });
    private final Handler main = new Handler(Looper.getMainLooper());
    private volatile boolean cancelled;
    private Future<?> pending;

    void start(BackendPolicy policy, Completion completion) {
        try {
            pending = executor.submit(() -> {
                boolean compatible = false;
                HttpURLConnection connection = null;
                try {
                    // Refuse any process-wide Java cookie handler rather than
                    // consulting/exporting WebView cookies or persisting Set-Cookie.
                    if (CookieHandler.getDefault() != null || cancelled) throw new IllegalStateException();
                    connection = (HttpURLConnection) policy.url("/api/mobile/v1/session").toURL().openConnection();
                    connection.setInstanceFollowRedirects(false);
                    connection.setUseCaches(false);
                    connection.setConnectTimeout(6000); connection.setReadTimeout(6000);
                    connection.setRequestProperty("Accept", "application/json");
                    int status = connection.getResponseCode();
                    String contentType = connection.getContentType();
                    if (contentType == null || !contentType.split(";", 2)[0].trim().equals("application/json")
                            || connection.getContentLengthLong() > 4096) throw new IllegalArgumentException();
                    try (InputStream input = status < 400 ? connection.getInputStream() : connection.getErrorStream();
                         ByteArrayOutputStream bytes = new ByteArrayOutputStream()) {
                        if (input == null) throw new IllegalArgumentException();
                        byte[] chunk = new byte[1024]; int count;
                        while ((count = input.read(chunk)) != -1) {
                            if (cancelled || bytes.size() + count > 4096) throw new IllegalArgumentException();
                            bytes.write(chunk, 0, count);
                        }
                        SessionStatus.decode(status, bytes.toString(StandardCharsets.UTF_8.name()));
                        compatible = true;
                    }
                } catch (Exception ignored) {
                    // Never disclose a server body, identity or diagnostic to web content.
                } finally { if (connection != null) connection.disconnect(); }
                boolean result = compatible;
                main.post(() -> { if (!cancelled) completion.finish(result); });
            });
        } catch (java.util.concurrent.RejectedExecutionException ignored) {
            main.post(() -> { if (!cancelled) completion.finish(false); });
        }
    }
    void cancel() { cancelled = true; if (pending != null) pending.cancel(true); executor.purge(); }
}
