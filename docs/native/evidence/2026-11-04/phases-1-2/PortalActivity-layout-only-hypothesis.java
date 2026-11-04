package com.velani.nevora.development;
import androidx.activity.ComponentActivity;
import androidx.activity.OnBackPressedCallback;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.Insets;
import android.net.Uri;
import android.net.http.SslError;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.Message;
import android.view.Gravity;
import android.view.KeyEvent;
import android.view.View;
import android.view.WindowInsets;
import android.webkit.CookieManager;
import android.webkit.SslErrorHandler;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;
import java.io.ByteArrayInputStream;
import java.net.URI;
import java.util.Collections;

/** Shared hosted UI, browser-owned cookie sessions, constrained native lifecycle. */
public final class PortalActivity extends ComponentActivity {
    private final ShellLifecycle lifecycle = new ShellLifecycle();
    private final Handler main = new Handler(Looper.getMainLooper());
    private BackendPolicy policy;
    private NativeCapabilitiesHandler capabilities;
    private URI pendingLink;
    // Only a canonical portal path; never document identifiers or URL queries.
    private String documentPage;
    private FrameLayout root;
    private LinearLayout cover;
    private TextView status;
    private Button retry;
    private WebView web;
    private SessionProbe probe;
    private Runnable deadline, backAction;
    private long pageGeneration;
    private boolean handlingBack;
    private boolean resumed, needsFocusValidation;
    private final OnBackPressedCallback back = new OnBackPressedCallback(false) {
        @Override public void handleOnBackPressed() {
            if (backAction != null) backAction.run();
            else exitOrHistory(null);
        }
    };

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        if (Build.VERSION.SDK_INT >= 33) setRecentsScreenshotEnabled(false);
        else getWindow().addFlags(android.view.WindowManager.LayoutParams.FLAG_SECURE);
        if (Build.VERSION.SDK_INT >= 30) getWindow().setDecorFitsSystemWindows(false);
        else getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LAYOUT_STABLE | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);
        root = new FrameLayout(this);
        root.setBackgroundColor(getColor(R.color.nevora_surface));
        root.setOnApplyWindowInsetsListener((view, insets) -> {
            if (Build.VERSION.SDK_INT >= 30) {
                Insets safe = insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout() | WindowInsets.Type.ime());
                view.setPadding(safe.left, safe.top, safe.right, safe.bottom);
                return WindowInsets.CONSUMED;
            }
            view.setPadding(insets.getSystemWindowInsetLeft(), insets.getSystemWindowInsetTop(), insets.getSystemWindowInsetRight(), insets.getSystemWindowInsetBottom());
            return insets.consumeSystemWindowInsets();
        });
        cover = new LinearLayout(this);
        cover.setOrientation(LinearLayout.VERTICAL); cover.setGravity(Gravity.CENTER);
        cover.setPadding(dp(24), dp(24), dp(24), dp(24));
        status = new TextView(this);
        status.setTextAppearance(android.R.style.TextAppearance_Material_Headline);
        status.setTextColor(getColor(R.color.nevora_on_surface)); status.setGravity(Gravity.CENTER);
        status.setAccessibilityLiveRegion(View.ACCESSIBILITY_LIVE_REGION_POLITE);
        retry = new Button(this); retry.setText("Try again"); retry.setAllCaps(false); retry.setMinHeight(dp(48)); retry.setMinWidth(dp(48));
        retry.setOnClickListener(view -> activate());
        cover.addView(status); cover.addView(retry);
        root.addView(cover, new FrameLayout.LayoutParams(-1, -1)); setContentView(root);
        String origin = BuildConfig.BACKEND_ORIGIN;
        if (BuildConfig.DEBUG && getIntent().hasExtra("nevora.debug.origin")) origin = getIntent().getStringExtra("nevora.debug.origin");
        try { policy = new BackendPolicy(origin, BuildConfig.DEBUG); } catch (IllegalArgumentException ignored) { policy = null; }
        if(policy!=null) {capabilities=new NativeCapabilitiesHandler(this,policy);acceptIntent(getIntent());}
        showCover(policy == null ? "NEVORA is not configured" : "Connecting to NEVORA", false);
        getOnBackPressedDispatcher().addCallback(this, back);
    }
    @Override protected void onResume() {
        super.onResume(); resumed = true;
        if (policy == null) return;
        needsFocusValidation = true;
        if (hasWindowFocus()) { needsFocusValidation = false; activate(); }
        else suspend();
    }
    @Override public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (root == null || policy == null) return;
        if (!hasFocus) {
            needsFocusValidation = true;
            if (resumed) suspend();
        } else if (resumed && needsFocusValidation) {
            needsFocusValidation = false; activate();
        }
    }
    @Override protected void onPause() { resumed = false; needsFocusValidation = true; suspend(); super.onPause(); }
    @Override protected void onDestroy() { resumed = false; suspend(); super.onDestroy(); }
    @Override protected void onNewIntent(Intent intent) {super.onNewIntent(intent);acceptIntent(intent);if(resumed&&hasWindowFocus())activate();}
    @Override public void onRequestPermissionsResult(int code,String[] permissions,int[] results) {super.onRequestPermissionsResult(code,permissions,results);if(code==NativeCapabilitiesHandler.PERMISSION_REQUEST&&capabilities!=null)capabilities.permissionResult(results);}
    private void acceptIntent(Intent intent) {
        if(policy==null)return;
        URI link=uri(intent.getDataString());
        if(NativeCapabilities.link(link,policy)!=null)pendingLink=link;
        String id=intent.getStringExtra("notificationId"),generation=intent.getStringExtra("generation");
        if("1".equals(intent.getStringExtra("nevoraProtocol"))&&id!=null&&id.matches("[A-Za-z0-9_-]{1,128}")&&capabilities!=null&&capabilities.acceptsTap(generation))
            pendingLink=policy.url("/app/notifications/open?notificationId="+id);
    }

    private int dp(int value) { return Math.round(value * getResources().getDisplayMetrics().density); }
    private void showCover(String message, boolean canRetry) {
        back.setEnabled(false); backAction = null; handlingBack = false;
        if (web != null) web.setVisibility(View.GONE);
        status.setText(message); retry.setVisibility(canRetry ? View.VISIBLE : View.GONE);
        cover.setVisibility(View.VISIBLE); cover.bringToFront();
    }
    private void destroyWeb() {
        if (web != null) { WebView old = web; web = null; old.stopLoading(); root.removeView(old); old.destroy(); }
    }
    private void suspend() {
        documentPage=null;
        if(capabilities!=null)capabilities.suspend();
        lifecycle.suspend(); if (probe != null) probe.cancel(); probe = null;
        if (deadline != null) main.removeCallbacks(deadline);
        if (cover != null) showCover("NEVORA", false);
        destroyWeb(); CookieManager.getInstance().flush();
    }
    private void activate() {
        if (policy == null) return;
        suspend(); long ticket = lifecycle.activate();
        capabilities.refreshTokenIfAllowed();
        showCover("Connecting to NEVORA", false);
        deadline = () -> unavailable(ticket); main.postDelayed(deadline, 8000);
        probe = new SessionProbe();
        probe.start(policy, compatible -> {
            if (!lifecycle.accepts(ticket)) return;
            probe = null;
            if (!compatible) { unavailable(ticket); return; }
            main.removeCallbacks(deadline);
            load(ticket);
        });
    }
    private void unavailable(long ticket) {
        if (!lifecycle.accepts(ticket)) return;
        suspend(); showCover("Can't connect to NEVORA", true);
    }
    private boolean current(WebView view, long ticket) { return view == web && lifecycle.accepts(ticket); }

    private void exitOrHistory(WebView view) {
        if (view != null && view.canGoBack()) view.goBack();
        else { back.setEnabled(false); getOnBackPressedDispatcher().onBackPressed(); }
    }
    private void requestBack(WebView view, long ticket) {
        if (handlingBack || !current(view, ticket) || view.getVisibility() != View.VISIBLE) return;
        String document = view.getUrl(); long page = pageGeneration;
        if (!policy.contains(uri(document))) return;
        handlingBack = true;
        // Fixed read-only modal observation. No page-selected code, native
        // capability, credential, URL, or file operation is exposed to scripts.
        view.evaluateJavascript("Boolean(document.querySelector('dialog[open]'))", result -> {
            handlingBack = false;
            if (!current(view, ticket) || page != pageGeneration || !java.util.Objects.equals(document, view.getUrl())) return;
            if ("true".equals(result)) {
                // Use the browser's real dialog cancel path so React retains
                // its draft and existing animation/focus behavior.
                view.dispatchKeyEvent(new KeyEvent(KeyEvent.ACTION_DOWN, KeyEvent.KEYCODE_ESCAPE));
                view.dispatchKeyEvent(new KeyEvent(KeyEvent.ACTION_UP, KeyEvent.KEYCODE_ESCAPE));
            } else if ("false".equals(result)) exitOrHistory(view);
        });
    }

    private void load(long ticket) {
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);
        web = new WebView(this);
        WebView current = web;
        current.setVisibility(View.INVISIBLE);
        WebSettings settings = current.getSettings();
        settings.setJavaScriptEnabled(true); settings.setDomStorageEnabled(true);
        settings.setCacheMode(WebSettings.LOAD_NO_CACHE);
        settings.setAllowFileAccess(false); settings.setAllowContentAccess(false);
        settings.setAllowFileAccessFromFileURLs(false); settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW); settings.setSafeBrowsingEnabled(true);
        settings.setGeolocationEnabled(false); settings.setSupportZoom(true);
        settings.setBuiltInZoomControls(true); settings.setDisplayZoomControls(true);
        settings.setTextZoom(Math.round(getResources().getConfiguration().fontScale * 100));
        settings.setSupportMultipleWindows(true); settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setUserAgentString(settings.getUserAgentString() + " NEVORA-Native/Android/1");
        CookieManager cookies = CookieManager.getInstance(); cookies.setAcceptCookie(true); cookies.setAcceptThirdPartyCookies(current, false);
        capabilities.bind(current);
        current.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                if (!current(view, ticket)) return true;
                URI target = uri(request.getUrl().toString());
                rememberDocumentPage(uri(view.getUrl()));
                if(request.isForMainFrame()&&"GET".equals(request.getMethod())) {
                    String destination=target!=null&&policy.contains(target)&&target.getRawPath().startsWith("/api/")?NativeCapabilities.documentBrowserPage(target.getRawPath(),documentPage):null;
                    if(destination==null&&target!=null&&"blob".equals(target.getScheme()))destination=documentPage;
                    if(destination!=null){offerDocumentBrowser(destination);return true;}
                }
                BackendPolicy.Navigation navigation = policy.navigation(target, request.getMethod(), request.hasGesture() && !request.isRedirect(), request.isForMainFrame());
                if (navigation == BackendPolicy.Navigation.INTERNAL) return false;
                if (navigation == BackendPolicy.Navigation.EXTERNAL) openBrowser(target);
                return true;
            }
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                if (!policy.contains(uri(request.getUrl().toString()))) return blocked();
                return null;
            }
            @Override public void onPageStarted(WebView view, String url, Bitmap favicon) {
                if (current(view, ticket)) { capabilities.suspend();pageGeneration++; if (!policy.contains(uri(url))) unavailable(ticket); }
            }
            @Override public void onPageFinished(WebView view, String url) {
                if (!current(view, ticket) || !policy.contains(uri(url))) return;
                rememberDocumentPage(uri(url));
                main.removeCallbacks(deadline); cover.setVisibility(View.GONE); view.setVisibility(View.VISIBLE);
                // A recreated browser must regain real view focus. Shared
                // private readers correctly stay paused while its document
                // lacks focus, even when the Activity window is foreground.
                view.requestFocus();
                if(pendingLink!=null) {
                    URI target=pendingLink;pendingLink=null;
                    if(!target.equals(uri(url))&&NativeCapabilities.link(target,policy)!=null){view.loadUrl(target.toString());return;}
                }
                capabilities.ready(uri(url));
                view.evaluateJavascript("window.dispatchEvent(new Event('nevora:native-ready'))",null);
                backAction = () -> requestBack(view, ticket); back.setEnabled(true);
            }
            @Override public void doUpdateVisitedHistory(WebView view, String url, boolean reload) {
                if (current(view, ticket)) { rememberDocumentPage(uri(url));pageGeneration++; back.setEnabled(view.getVisibility() == View.VISIBLE); }
            }
            @Override public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame() && current(view, ticket)) unavailable(ticket);
            }
            @Override public void onReceivedHttpError(WebView view, WebResourceRequest request, WebResourceResponse response) {
                if (request.isForMainFrame() && response.getStatusCode() >= 500 && current(view, ticket)) unavailable(ticket);
            }
            @Override public void onReceivedSslError(WebView view, SslErrorHandler handler, SslError error) {
                handler.cancel(); if (current(view, ticket)) unavailable(ticket);
            }
            @Override public boolean onRenderProcessGone(WebView view, android.webkit.RenderProcessGoneDetail detail) {
                if (current(view, ticket)) unavailable(ticket); return true;
            }
        });
        current.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onCreateWindow(WebView view, boolean dialog, boolean gesture, Message result) {
                if (!current(view, ticket) || !gesture) return false;
                WebView.HitTestResult hit = view.getHitTestResult();
                if (hit == null || hit.getType() != WebView.HitTestResult.SRC_ANCHOR_TYPE && hit.getType() != WebView.HitTestResult.SRC_IMAGE_ANCHOR_TYPE) return false;
                URI target = uri(hit.getExtra());
                rememberDocumentPage(uri(view.getUrl()));
                String document=target!=null&&policy.contains(target)&&target.getRawPath().startsWith("/api/")?NativeCapabilities.documentBrowserPage(target.getRawPath(),documentPage):null;
                if(document!=null){offerDocumentBrowser(document);return false;}
                BackendPolicy.Navigation navigation = policy.navigation(target, "GET", true, true);
                if (navigation == BackendPolicy.Navigation.INTERNAL) view.loadUrl(target.toString());
                else if (navigation == BackendPolicy.Navigation.EXTERNAL) openBrowser(target);
                return false;
            }
        });
        current.setDownloadListener((url, userAgent, contentDisposition, mimeType, length) -> {
            if(!current(current,ticket))return;
            rememberDocumentPage(uri(current.getUrl()));
            URI target=uri(url);String page=target!=null&&policy.contains(target)?NativeCapabilities.documentBrowserPage(target.getRawPath(),documentPage):null;
            if(page==null&&url!=null&&url.startsWith("blob:"))page=documentPage;
            if(page!=null)offerDocumentBrowser(page);
        });
        root.addView(current, 0, new FrameLayout.LayoutParams(-1, -1));
        deadline = () -> unavailable(ticket); main.postDelayed(deadline, 20000);
        current.loadUrl(policy.url("/app").toString());
    }
    private static URI uri(String value) { try { return value == null ? null : URI.create(value); } catch (IllegalArgumentException ignored) { return null; } }
    private void rememberDocumentPage(URI url) {
        if(url!=null&&policy.contains(url)&&(url.getRawPath().equals("/app")||url.getRawPath().startsWith("/app/")))documentPage=NativeCapabilities.documentBrowserPage(url.getRawPath());
        else if(url!=null&&policy.contains(url)&&url.getRawPath().equals("/login"))documentPage=null;
    }
    private static WebResourceResponse blocked() {
        return new WebResourceResponse("text/plain", "UTF-8", 403, "Blocked", Collections.emptyMap(), new ByteArrayInputStream(new byte[0]));
    }
    private void openBrowser(URI target) {
        try {
            // Resolve the browser role separately so our own associated link
            // cannot intercept the deliberate reauthentication fallback.
            android.content.pm.ResolveInfo browser=getPackageManager().resolveActivity(new Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_APP_BROWSER),android.content.pm.PackageManager.MATCH_DEFAULT_ONLY);
            if(browser==null||browser.activityInfo==null||getPackageName().equals(browser.activityInfo.packageName))throw new ActivityNotFoundException();
            startActivity(new Intent(Intent.ACTION_VIEW,Uri.parse(target.toString())).addCategory(Intent.CATEGORY_BROWSABLE).setPackage(browser.activityInfo.packageName));
        }catch(ActivityNotFoundException ignored){android.widget.Toast.makeText(this,"No browser is available on this device.",android.widget.Toast.LENGTH_LONG).show();}
    }
    private void offerDocumentBrowser(String path) {
        new android.app.AlertDialog.Builder(this).setTitle("Download in your browser").setMessage("Sign in to NEVORA in your browser to download or share documents.")
            .setNegativeButton("Cancel",null).setPositiveButton("Continue in browser",(dialog,which)->openBrowser(policy.url(path))).show();
    }
}
