package com.velani.nevora.development;

import android.content.Intent;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import androidx.test.uiautomator.By;
import androidx.test.uiautomator.UiDevice;
import androidx.test.uiautomator.Until;
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
    private void expectText(String value) {
        boolean visible = device.wait(current -> {
            // Classic By/Until queries do not use the new 2.4 window APIs'
            // cache invalidation. Observe a fresh tree after WebView recreation.
            if (android.os.Build.VERSION.SDK_INT >= 34) InstrumentationRegistry.getInstrumentation().getUiAutomation().clearCache();
            return current.hasObject(By.textContains(value));
        }, 20000L);
        if (!visible) {
            String key = InstrumentationRegistry.getArguments().getString("nativeEvidenceKey");
            assertNotNull(key); assertTrue(key.matches("[a-f0-9]{32}"));
            File directory = new File(InstrumentationRegistry.getInstrumentation().getTargetContext().getCacheDir(), "nevora-native-tests-" + key);
            assertTrue(directory.isDirectory() || directory.mkdirs());
            String name = value.replaceAll("[^A-Za-z0-9]", "_");
            device.takeScreenshot(new File(directory, name + ".png"));
            try { device.dumpWindowHierarchy(new File(directory, name + ".xml")); }
            catch (java.io.IOException error) { throw new AssertionError("Could not retain failure hierarchy", error); }
        }
        assertTrue("Expected visible text: " + value, visible);
    }
    private void signIn(String id) {
        expectText("Fictional sign in");
        onWebView().withElement(findElement(Locator.NAME, "employeeId")).perform(webKeys(id));
        onWebView().withElement(findElement(Locator.NAME, "password")).perform(webKeys("fictional-test-password"));
        device.findObject(By.text("Sign in")).click();
    }
    private void signOut() {
        device.findObject(By.text("Sign out")).click();
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
        device.findObject(By.text("Renderer control")).click(); expectText("Containment complete");
        org.json.JSONObject unprotected = rendererResult();
        assertTrue("Positive control must reach the foreign server through a redirect", unprotected.getInt("foreign") > 0);
        device.findObject(By.text("Home")).click(); expectText("Fictional Home");
        device.findObject(By.text("Renderer protected")).click(); expectText("Containment complete");
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
        device.findObject(By.text("My Schedule")).click();
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
        device.findObject(By.text("Try again")).click(); expectText("Fictional Home"); signOut();
    }
    @Test public void g_unsupportedRoleExplainsWebAccess() {
        launch(origin); signIn("FICTIONAL-MANAGER"); expectText("Employee and Owner accounts");
        assertFalse(device.hasObject(By.text("Fictional Manager Home"))); signOut();
    }
    @Test public void z_ownerSessionForExternalProcessRestartCheck() {
        launch(origin); signIn("FICTIONAL-OWNER"); expectText("Fictional Owner Home");
    }
}
