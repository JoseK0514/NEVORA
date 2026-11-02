package com.velani.nevora.development;

import android.content.Intent;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import androidx.test.uiautomator.By;
import androidx.test.uiautomator.UiDevice;
import androidx.test.uiautomator.UiDeviceExt;
import androidx.test.uiautomator.UiObject2;
import org.junit.Before;
import org.junit.After;
import org.junit.Test;
import org.junit.FixMethodOrder;
import org.junit.runner.RunWith;
import org.junit.runners.MethodSorters;
import java.net.URI;
import java.net.HttpURLConnection;
import java.net.URL;
import java.io.File;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.WebView;
import static org.junit.Assert.*;
import static androidx.test.espresso.web.sugar.Web.onWebView;
import static androidx.test.espresso.web.webdriver.DriverAtoms.*;
import androidx.test.espresso.web.webdriver.Locator;

@RunWith(AndroidJUnit4.class)
@FixMethodOrder(MethodSorters.NAME_ASCENDING)
public class ShellInstrumentedTest {
    private ActivityScenario<PortalActivity> scenario;
    private UiDevice device;
    private String origin;

    @Before public void setup() throws Exception {
        device = UiDevice.getInstance(InstrumentationRegistry.getInstrumentation());
        origin = InstrumentationRegistry.getArguments().getString("fixtureOrigin");
        assertLocal(origin);
        control("/__test/outage-off");
        control("/__test/revoke-all");
    }
    @After public void cleanup() { if (scenario != null) scenario.close(); }
    private static void assertLocal(String value) {
        assertNotNull("Invocation-owned fixture is required", value);
        URI uri = URI.create(value);
        assertEquals("http", uri.getScheme()); assertEquals("127.0.0.1", uri.getHost());
        assertTrue(uri.getPort() > 0); assertNull(uri.getRawUserInfo()); assertNull(uri.getRawQuery()); assertNull(uri.getRawFragment());
        assertTrue(uri.getPath() == null || uri.getPath().isEmpty());
    }
    private void launch(String backend) {
        Intent intent = new Intent(InstrumentationRegistry.getInstrumentation().getTargetContext(), PortalActivity.class);
        if (backend != null) intent.putExtra("nevora.debug.origin", backend);
        scenario = ActivityScenario.launch(intent);
    }
    private UiObject2 text(String value, boolean exact) {
        return UiDeviceExt.onElementOrNull(device, 20000L, 100L, node -> {
            CharSequence content = node.getText();
            return node.isVisibleToUser() && content != null
                && (exact ? content.toString().equals(value) : content.toString().contains(value));
        });
    }
    private void retainFailure(String value) {
            java.util.concurrent.CountDownLatch observed = new java.util.concurrent.CountDownLatch(1);
            scenario.onActivity(activity -> {
                WebView view = browser(activity.getWindow().getDecorView());
                if (view == null) { observed.countDown(); return; }
                android.view.accessibility.AccessibilityManager manager = (android.view.accessibility.AccessibilityManager) activity.getSystemService(android.content.Context.ACCESSIBILITY_SERVICE);
                android.util.Log.i("NEVORA_QA_AX", "window=" + activity.hasWindowFocus() + " viewFocus=" + view.hasFocus()
                    + " shown=" + view.isShown() + " important=" + view.getImportantForAccessibility()
                    + " accessibility=" + manager.isEnabled() + " touchExploration=" + manager.isTouchExplorationEnabled()
                    + " contentHeight=" + view.getContentHeight() + " width=" + view.getWidth() + " height=" + view.getHeight()
                    + " importantComputed=" + view.isImportantForAccessibility());
                view.evaluateJavascript("JSON.stringify({focus:document.hasFocus(),visible:document.visibilityState==='visible',ready:document.readyState,mime:document.contentType,titleLength:document.title.length})", result -> {
                    android.util.Log.i("NEVORA_QA_AX", "document=" + result); observed.countDown();
                });
            });
            try { observed.await(2, java.util.concurrent.TimeUnit.SECONDS); }
            catch (InterruptedException error) { Thread.currentThread().interrupt(); }
            String key = InstrumentationRegistry.getArguments().getString("nativeEvidenceKey");
            assertNotNull(key); assertTrue(key.matches("[a-f0-9]{32}"));
            File directory = new File(InstrumentationRegistry.getInstrumentation().getTargetContext().getCacheDir(), "nevora-native-tests-" + key);
            assertTrue(directory.isDirectory() || directory.mkdirs());
            String name = value.replaceAll("[^A-Za-z0-9]", "_");
            device.takeScreenshot(new File(directory, name + ".png"));
            try { device.dumpWindowHierarchy(new File(directory, name + ".xml")); }
            catch (java.io.IOException error) { throw new AssertionError("Could not retain failure hierarchy", error); }
            // Diagnostic only, after retaining the failure. Do not turn an
            // initially failed assertion into acceptance after this cache read.
            java.util.ArrayDeque<android.view.accessibility.AccessibilityNodeInfo> nodes = new java.util.ArrayDeque<>();
            android.view.accessibility.AccessibilityNodeInfo root = InstrumentationRegistry.getInstrumentation().getUiAutomation().getRootInActiveWindow();
            if (root != null) nodes.add(root);
            long end = android.os.SystemClock.uptimeMillis() + 2000;
            int visited = 0, changedChildren = 0; boolean found = false;
            while (!nodes.isEmpty() && visited < 256 && android.os.SystemClock.uptimeMillis() < end) {
                android.view.accessibility.AccessibilityNodeInfo node = nodes.remove(); visited++;
                int before = node.getChildCount(); node.refresh(); changedChildren += node.getChildCount() - before;
                if (node.isVisibleToUser() && node.getText() != null && node.getText().toString().contains(value)) found = true;
                for (int i = 0; i < node.getChildCount(); i++) {
                    android.view.accessibility.AccessibilityNodeInfo child = node.getChild(i);
                    if (child != null) nodes.add(child);
                }
            }
            android.util.Log.i("NEVORA_QA_AX", "freshRead found=" + found + " visited=" + visited + " changedChildren=" + changedChildren);
    }
    private void expectText(String value) {
        boolean visible = text(value, false) != null;
        if (!visible) retainFailure(value);
        assertTrue("Expected visible text: " + value, visible);
    }
    private void tapText(String value) {
        UiObject2 target = text(value, true);
        if (target == null) retainFailure(value);
        assertNotNull("Exact visible pointer target: " + value, target);
        target.click();
    }
    private void signIn(String id) {
        expectText("Fictional sign in");
        onWebView().withElement(findElement(Locator.NAME, "employeeId")).perform(webKeys(id));
        onWebView().withElement(findElement(Locator.NAME, "password")).perform(webKeys("fictional-test-password"));
        tapText("Sign in");
    }
    private void signOut() {
        tapText("Sign out");
        expectText("Fictional sign in");
    }
    private static WebView browser(View view) {
        if (view instanceof WebView) return (WebView) view;
        if (view instanceof ViewGroup) {
            ViewGroup group = (ViewGroup) view;
            for (int index = 0; index < group.getChildCount(); index++) {
                WebView found = browser(group.getChildAt(index)); if (found != null) return found;
            }
        }
        return null;
    }
    private void control(String path) throws Exception {
        HttpURLConnection request = (HttpURLConnection) new URL(origin + path).openConnection();
        try {
            request.setRequestMethod("POST"); request.setInstanceFollowRedirects(false);
            request.setConnectTimeout(3000); request.setReadTimeout(3000);
            assertEquals(204, request.getResponseCode());
        } finally { request.disconnect(); }
    }
    private org.json.JSONObject rendererResult() throws Exception {
        HttpURLConnection request = (HttpURLConnection) new URL(origin + "/__test/renderer-result").openConnection();
        request.setConnectTimeout(3000); request.setReadTimeout(3000);
        try (java.io.InputStream input = request.getInputStream()) {
            assertEquals(200, request.getResponseCode());
            return new org.json.JSONObject(new String(input.readAllBytes(), java.nio.charset.StandardCharsets.UTF_8));
        } finally { request.disconnect(); }
    }
    @Test public void g_redirectedSubresourcesAreContainedByRendererPolicy() throws Exception {
        launch(origin); signIn("FICTIONAL"); expectText("Fictional Home");
        tapText("Renderer control"); expectText("Containment complete");
        org.json.JSONObject unprotected = rendererResult();
        assertTrue("Positive control must reach the foreign server through a redirect", unprotected.getInt("foreign") > 0);
        tapText("Home"); expectText("Fictional Home");
        tapText("Renderer protected"); expectText("Containment complete");
        org.json.JSONObject protectedPage = rendererResult();
        assertTrue(protectedPage.getInt("redirects") >= 2); assertTrue(protectedPage.getInt("sameOrigin") > 0);
        assertEquals("Native renderer must block redirected foreign subresources", 0, protectedPage.getInt("foreign"));
    }

    @Test public void a_unconfiguredAndInvalidOriginsFailClosed() {
        launch(null); expectText("NEVORA is not configured");
        scenario.close(); scenario = null;
        launch("http://127.attacker.example"); expectText("NEVORA is not configured");
    }
    @Test public void b_nativeMarkerIsPresentationOnly() {
        launch(origin); expectText("Native Android v1");
    }
    @Test public void c_employeeHistoryRecreationAndPostLogout() {
        launch(origin); signIn("FICTIONAL"); expectText("Fictional Home");
        tapText("My Schedule");
        expectText("Fictional Schedule");
        scenario.onActivity(activity -> {
            WebView view = browser(activity.getWindow().getDecorView());
            assertNotNull("Current native browser must remain attached", view);
            assertTrue("Schedule must have browser history, entries=" + view.copyBackForwardList().getSize() + ", index=" + view.copyBackForwardList().getCurrentIndex(), view.canGoBack());
            assertTrue("Native Back callback must be enabled when history exists", activity.getOnBackPressedDispatcher().hasEnabledCallbacks());
        });
        device.pressBack(); expectText("Fictional Home");
        scenario.recreate(); expectText("Fictional Home"); signOut();
        scenario.recreate(); expectText("Fictional sign in");
    }
    @Test public void d_ownerIsDistinctAndSurvivesRecreation() {
        launch(origin); signIn("FICTIONAL-OWNER"); expectText("Fictional Owner Home");
        assertFalse(device.hasObject(By.text("Fictional Home")));
        scenario.recreate(); expectText("Fictional Owner Home"); signOut();
    }
    @Test public void e_backgroundRevocationRetiresPrivateDocument() throws Exception {
        launch(origin); signIn("FICTIONAL"); expectText("Fictional Home");
        scenario.moveToState(androidx.lifecycle.Lifecycle.State.CREATED);
        control("/__test/revoke-all");
        scenario.moveToState(androidx.lifecycle.Lifecycle.State.RESUMED);
        expectText("Fictional sign in"); assertFalse(device.hasObject(By.text("Fictional Home")));
    }
    @Test public void f_outageAndRetryNeverRevealStalePrivateContent() throws Exception {
        launch(origin); signIn("FICTIONAL"); expectText("Fictional Home");
        scenario.moveToState(androidx.lifecycle.Lifecycle.State.CREATED);
        control("/__test/outage-on");
        try {
            scenario.moveToState(androidx.lifecycle.Lifecycle.State.RESUMED);
            expectText("Try again"); assertFalse(device.hasObject(By.text("Fictional Home")));
        } finally { control("/__test/outage-off"); }
        tapText("Try again"); expectText("Fictional Home"); signOut();
    }
    @Test public void g_unsupportedRoleExplainsWebAccess() {
        launch(origin); signIn("FICTIONAL-MANAGER"); expectText("Employee and Owner accounts");
        assertFalse(device.hasObject(By.text("Fictional Manager Home"))); signOut();
    }
    @Test public void z_ownerSessionForExternalProcessRestartCheck() {
        launch(origin); signIn("FICTIONAL-OWNER"); expectText("Fictional Owner Home");
    }
}
