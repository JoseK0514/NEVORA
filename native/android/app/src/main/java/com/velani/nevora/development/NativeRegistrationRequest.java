package com.velani.nevora.development;

import android.os.Handler;
import android.os.Looper;
import org.json.JSONObject;
import java.net.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.function.BooleanSupplier;
import java.util.function.Consumer;

/** Fixed endpoints, bounded streamed JSON, no cookies, redirects or diagnostics. */
final class NativeRegistrationRequest {
    interface Completion { void finish(int status, String body); }
    interface ConnectionFactory { HttpURLConnection open(URL url) throws IOException; }
    private static final ThreadPoolExecutor executor = new ThreadPoolExecutor(1, 1, 0, TimeUnit.SECONDS,
        new ArrayBlockingQueue<>(2), r -> { Thread t = new Thread(r, "nevora-native-registration"); t.setDaemon(true); return t; });
    private static final ScheduledExecutorService deadlines = Executors.newSingleThreadScheduledExecutor(r -> {
        Thread t = new Thread(r, "nevora-native-registration-deadline"); t.setDaemon(true); return t;
    });
    private static final ThreadPoolExecutor closers = new ThreadPoolExecutor(1, 1, 0, TimeUnit.SECONDS,
        new ArrayBlockingQueue<>(2), r -> {Thread t=new Thread(r,"nevora-native-registration-close");t.setDaemon(true);return t;});
    private final Consumer<Runnable> dispatch;
    private final ConnectionFactory connections;
    private final long deadlineMs;
    private final AtomicBoolean terminal = new AtomicBoolean();
    private final AtomicBoolean closing = new AtomicBoolean();
    private volatile boolean cancelled, expired;
    private volatile HttpURLConnection connection;
    private volatile Future<?> pending;
    private volatile ScheduledFuture<?> deadline;

    NativeRegistrationRequest() {
        this(new Handler(Looper.getMainLooper())::post, url -> (HttpURLConnection) url.openConnection(), 8000);
    }
    // Native-only fake-IO seam. Web messages cannot supply this configuration.
    NativeRegistrationRequest(Consumer<Runnable> dispatch, ConnectionFactory connections, long deadlineMs) {
        if (deadlineMs < 1 || deadlineMs > 8000) throw new IllegalArgumentException();
        this.dispatch = dispatch; this.connections = connections; this.deadlineMs = deadlineMs;
    }
    private void finish(int status, String body, BooleanSupplier current, Completion completion) {
        if (!terminal.compareAndSet(false, true)) return;
        ScheduledFuture<?> timer = deadline;
        if (timer != null) timer.cancel(false);
        dispatch.accept(() -> { if (!cancelled && current.getAsBoolean()) completion.finish(status, body); });
    }
    private void disconnectLater() {
        HttpURLConnection active=connection;
        if(active==null||!closing.compareAndSet(false,true))return;
        try{closers.execute(()->{try{active.disconnect();}catch(Exception ignored){/* Never expose native diagnostics. */}});}
        catch(RejectedExecutionException ignored){/* IO timeouts/stream close still apply; no unbounded closer threads. */}
    }
    void start(BackendPolicy policy, boolean challenge, JSONObject body, BooleanSupplier current, Completion completion) {
        byte[] encoded = body.toString().getBytes(StandardCharsets.UTF_8);
        if (!"https".equals(policy.origin.getScheme()) || encoded.length > 16384) {
            finish(0, "", current, completion); return;
        }
        deadline = deadlines.schedule(() -> {
            expired = true;
            // Terminal UI state cannot wait for a potentially blocking close.
            finish(0, "", current, completion);
            Future<?> task = pending;
            if (task != null) task.cancel(true);
            executor.purge();
            disconnectLater();
        }, deadlineMs, TimeUnit.MILLISECONDS);
        try {
            pending = executor.submit(() -> {
                int status = 0;
                String response = "";
                try {
                    if (CookieHandler.getDefault() != null || cancelled || expired || !current.getAsBoolean()) throw new IOException();
                    connection = connections.open(policy.url("/api/mobile/v1/notifications/" + (challenge ? "challenge" : "complete")).toURL());
                    connection.setInstanceFollowRedirects(false);
                    connection.setUseCaches(false);
                    connection.setConnectTimeout(4000);
                    connection.setReadTimeout(4000);
                    connection.setRequestMethod("POST");
                    connection.setDoOutput(true);
                    connection.setFixedLengthStreamingMode(encoded.length);
                    connection.setRequestProperty("Content-Type", "application/json");
                    connection.setRequestProperty("Accept", "application/json");
                    if (CookieHandler.getDefault() != null || cancelled || expired || !current.getAsBoolean()) throw new IOException();
                    try (OutputStream output = connection.getOutputStream()) { output.write(encoded); }
                    status = connection.getResponseCode();
                    String type = connection.getContentType();
                    if (type == null || !type.split(";", 2)[0].trim().equals("application/json") || connection.getContentLengthLong() > 4096) throw new IOException();
                    try (InputStream input = status < 400 ? connection.getInputStream() : connection.getErrorStream();
                         ByteArrayOutputStream bytes = new ByteArrayOutputStream()) {
                        if (input == null) throw new IOException();
                        byte[] chunk = new byte[1024];
                        int count;
                        while ((count = input.read(chunk)) != -1) {
                            if (cancelled || expired || bytes.size() + count > 4096) throw new IOException();
                            bytes.write(chunk, 0, count);
                        }
                        response = bytes.toString(StandardCharsets.UTF_8.name());
                    }
                } catch (Exception ignored) { status = 0; response = ""; }
                finally { disconnectLater(); }
                finish(expired ? 0 : status, expired ? "" : response, current, completion);
            });
        } catch (RejectedExecutionException ignored) { finish(0, "", current, completion); }
    }
    void cancel() {
        cancelled = true; terminal.set(true);
        ScheduledFuture<?> timer = deadline;
        if (timer != null) timer.cancel(false);
        Future<?> task = pending;
        if (task != null) task.cancel(true);
        executor.purge();
        disconnectLater();
    }
}
