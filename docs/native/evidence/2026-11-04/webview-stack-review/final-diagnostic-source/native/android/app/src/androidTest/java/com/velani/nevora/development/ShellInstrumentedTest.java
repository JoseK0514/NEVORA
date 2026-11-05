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
    private int currentTaskId = -1;
    private File evidenceDirectory() {
        String key = InstrumentationRegistry.getArguments().getString("nativeEvidenceKey"); assertNotNull(key); assertTrue(key.matches("[a-f0-9]{32}"));
        File directory = new File(InstrumentationRegistry.getInstrumentation().getTargetContext().getCacheDir(), "nevora-native-tests-" + key);
        assertTrue(directory.isDirectory() || directory.mkdirs()); return directory;
    }
    private void systemKey(int code) throws Exception {
        assertTrue(code == 3 || code == 187);
        if (android.os.Build.VERSION.SDK_INT >= 31) {
            android.os.ParcelFileDescriptor[] pipes = InstrumentationRegistry.getInstrumentation().getUiAutomation(android.app.UiAutomation.FLAG_DONT_SUPPRESS_ACCESSIBILITY_SERVICES).executeShellCommandRw("/system/bin/sh");
            String script = "exec 2>&1\ninput keyevent " + code + "\nkey_status=$?\nprintf 'NEVORA_KEY_EXIT=%s\\n' \"$key_status\"\nexit \"$key_status\"\n";
            try (java.io.OutputStream input = new android.os.ParcelFileDescriptor.AutoCloseOutputStream(pipes[1])) { input.write(script.getBytes(java.nio.charset.StandardCharsets.UTF_8)); }
            java.io.ByteArrayOutputStream bytes = new java.io.ByteArrayOutputStream();
            try (java.io.InputStream output = new android.os.ParcelFileDescriptor.AutoCloseInputStream(pipes[0])) {
                byte[] buffer = new byte[1024]; int count;
                while ((count = output.read(buffer)) != -1) { assertTrue(bytes.size() + count <= 32768); bytes.write(buffer, 0, count); }
            }
            String result = new String(bytes.toByteArray(), java.nio.charset.StandardCharsets.UTF_8);
            assertTrue("System input command must finish successfully", result.contains("NEVORA_KEY_EXIT=0"));
        } else device.executeShellCommand("input keyevent " + code);
    }


    @Before public void setup() throws Exception {
        androidx.test.uiautomator.Configurator.getInstance().setUiAutomationFlags(android.app.UiAutomation.FLAG_DONT_SUPPRESS_ACCESSIBILITY_SERVICES);
        device = UiDevice.getInstance(InstrumentationRegistry.getInstrumentation());
        systemKey(3);
        String launcher = device.getLauncherPackageName();
        assertTrue("Visible Home precondition", device.wait(current -> current.hasObject(By.res(launcher, "hotseat")), 5000L));
        if (android.os.Build.VERSION.SDK_INT < 33) assertTrue("Public Home capture must work before private content",
            device.takeScreenshot(new File(evidenceDirectory(), "public_capture_control.png")));
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
        scenario.onActivity(activity -> { currentTaskId = activity.getTaskId();
            android.util.Log.i("NEVORA_QA_AX", "launch task=" + currentTaskId + " activity=" + System.identityHashCode(activity)); });
    }
    private UiObject2 text(String value, boolean exact) {
        if("classic".equals(InstrumentationRegistry.getArguments().getString("nativeAxReader"))){
            long deadline=android.os.SystemClock.uptimeMillis()+20000;
            do{
                UiObject2 match=device.findObject(exact?By.text(value):By.textContains(value));
                if(match==null&&exact)match=device.findObject(By.desc(value));
                if(match!=null)return match;
                android.os.SystemClock.sleep(100);
            }while(android.os.SystemClock.uptimeMillis()<deadline);
            return null;
        }
        return UiDeviceExt.onElementOrNull(device, 20000L, 100L, node -> {
            return matchesTarget(node, value, exact);
        });
    }
    private static boolean matchesTarget(android.view.accessibility.AccessibilityNodeInfo node, String value, boolean exact) {
        CharSequence content = node.getText();
        if (!node.isVisibleToUser()) return false;
        if (!exact) return content != null && content.toString().contains(value);
        CharSequence name = node.getContentDescription();
        return content != null && content.toString().equals(value)
            || name != null && name.toString().equals(value);
    }
    private static int privateMarkerPixels(android.graphics.Bitmap bitmap) {
        assertNotNull("Capture must decode", bitmap);
        int[] pixels = new int[bitmap.getWidth() * bitmap.getHeight()];
        bitmap.getPixels(pixels, 0, bitmap.getWidth(), 0, 0, bitmap.getWidth(), bitmap.getHeight());
        int count = 0;
        for (int pixel : pixels) if (android.graphics.Color.red(pixel) > 200 && android.graphics.Color.green(pixel) < 30 && android.graphics.Color.blue(pixel) > 140) count++;
        return count;
    }
    private void assertPrivateMarkerRendered() throws Exception {
        java.util.concurrent.CountDownLatch drawn = new java.util.concurrent.CountDownLatch(1);
        java.util.concurrent.atomic.AtomicInteger pixels = new java.util.concurrent.atomic.AtomicInteger(-1);
        scenario.onActivity(activity -> {
            assertTrue("Private snapshot positive control must be in the foreground", activity.hasWindowFocus());
            WebView view = browser(activity.getWindow().getDecorView()); assertNotNull(view);
            view.postVisualStateCallback(android.os.SystemClock.uptimeMillis(), new WebView.VisualStateCallback() {
                @Override public void onComplete(long request) {
                    android.graphics.Bitmap image = android.graphics.Bitmap.createBitmap(view.getWidth(), view.getHeight(), android.graphics.Bitmap.Config.ARGB_8888);
                    view.draw(new android.graphics.Canvas(image)); pixels.set(privateMarkerPixels(image)); image.recycle(); drawn.countDown();
                }
            });
        });
        assertTrue("Fictional private frame must finish drawing", drawn.await(5, java.util.concurrent.TimeUnit.SECONDS));
        assertTrue("Positive control: private visual marker must actually be rendered", pixels.get() > 100);
    }
    private UiObject2 ownTaskCard() {
        String launcher = device.getLauncherPackageName();
        android.app.ActivityManager manager = (android.app.ActivityManager) InstrumentationRegistry.getInstrumentation().getTargetContext().getSystemService(android.content.Context.ACTIVITY_SERVICE);
        java.util.List<android.app.ActivityManager.AppTask> tasks = manager.getAppTasks();
        assertEquals("A label can identify our exact task only when there is one own recent task", 1, tasks.size());
        android.app.ActivityManager.RecentTaskInfo taskInfo = tasks.get(0).getTaskInfo();
        assertEquals("The inspected task must be the launched PortalActivity task", currentTaskId, taskInfo.id);
        assertEquals(PortalActivity.class.getName(), taskInfo.baseIntent.getComponent().getClassName());
        java.util.List<UiObject2> cards = device.findObjects(By.desc("NEVORA"));
        assertEquals("Exactly one NEVORA task card must be present", 1, cards.size());
        UiObject2 snapshot = cards.get(0).findObject(By.res(launcher, "snapshot")); assertNotNull(snapshot);
        android.graphics.Rect bounds = snapshot.getVisibleBounds();
        assertTrue("NEVORA thumbnail must be fully visible, not an adjacent clipped card", bounds.width() >= device.getDisplayWidth() * 0.6
            && Math.abs(bounds.centerX() - device.getDisplayWidth() / 2) <= device.getDisplayWidth() * 0.1);
        android.util.Log.i("NEVORA_QA_AX", "snapshot task=" + currentTaskId + " bounds=" + bounds.flattenToString());
        return cards.get(0);
    }
    private void resumeOwnTask() { ownTaskCard().click(); }
    private void assertSnapshotProtected(String name) throws Exception {
        String key = InstrumentationRegistry.getArguments().getString("nativeEvidenceKey");
        assertNotNull(key); assertTrue(key.matches("[a-f0-9]{32}"));
        File directory = new File(InstrumentationRegistry.getInstrumentation().getTargetContext().getCacheDir(), "nevora-native-tests-" + key);
        assertTrue(directory.isDirectory() || directory.mkdirs());
        String launcher = device.getLauncherPackageName();
        assertNotNull("Owned emulator launcher must be known", launcher);
        android.util.Log.i("NEVORA_QA_AX", "recents launcher=" + launcher + " lastPackage=" + device.getCurrentPackageName());
        boolean ready = device.wait(current -> current.hasObject(By.res(launcher, "overview_panel")), 5000L);
        if (!ready) device.dumpWindowHierarchy(new File(directory, name + "_waiting.xml"));
        assertTrue("Recents overview must be visible before capture", ready);
        UiObject2 ownCard = ownTaskCard(); assertNotNull(ownCard);
        // A correctly identified task may be blanked or refuse readback.
        // Private marker and public Home controls distinguish those from failure.
        device.dumpWindowHierarchy(new File(directory, name + ".xml"));
        File capture = new File(directory, name + ".png");
        if (device.takeScreenshot(capture)) {
            android.graphics.Bitmap image = android.graphics.BitmapFactory.decodeFile(capture.getAbsolutePath());
            assertEquals("A captured recents thumbnail must omit the rendered private marker", 0, privateMarkerPixels(image));
            image.recycle();
        } // The OS can also reject protected-layer readback entirely.


    }
    private void retainFailure(String value) {
        File directory = evidenceDirectory(); String name = value.replaceAll("[^A-Za-z0-9]", "_");
        device.takeScreenshot(new File(directory, name + ".png"));
        try { device.dumpWindowHierarchy(new File(directory, name + ".xml")); }
        catch (java.io.IOException error) { throw new AssertionError("Could not retain failure hierarchy", error); }
    }
    private void expectText(String value) {
        boolean visible = text(value, false) != null;
        if (!visible) { retainFailure(value); if(scenario!=null&&registeredConsumer())diagnoseMissingSignOut(); }
        assertTrue("Expected visible text: " + value, visible);
    }
    private void tapText(String value) {
        UiObject2 target = text(value, true);
        if (target == null) {
            retainFailure(value);
            if (value.equals("Sign out")) diagnoseMissingSignOut();
        }
        assertNotNull("Exact visible pointer target: " + value, target);
        target.click();
    }
    private boolean registeredConsumer(){return "true".equals(InstrumentationRegistry.getArguments().getString("nativeAxConsumerRegistered"));}
    private String consumerProbe(){
        java.util.concurrent.CountDownLatch completed=new java.util.concurrent.CountDownLatch(1);
        java.util.concurrent.atomic.AtomicReference<String> result=new java.util.concurrent.atomic.AtomicReference<>("no-response");
        android.content.Context context=InstrumentationRegistry.getInstrumentation().getTargetContext();
        android.content.Intent request=new android.content.Intent("com.velani.nevora.development.test.QA_PROBE").setPackage("com.velani.nevora.development.test");
        context.sendOrderedBroadcast(request,"com.velani.nevora.development.test.QA_PROBE",new android.content.BroadcastReceiver(){
            @Override public void onReceive(android.content.Context ignored,android.content.Intent intent){result.set(getResultData());completed.countDown();}
        },new android.os.Handler(android.os.Looper.getMainLooper()),0,null,null);
        try{assertTrue("Independent consumer must reply",completed.await(5,java.util.concurrent.TimeUnit.SECONDS));}
        catch(InterruptedException error){Thread.currentThread().interrupt();throw new AssertionError(error);}
        return String.valueOf(result.get());
    }
    private void diagnoseMissingSignOut() {
        // Failure-only fictional-fixture discriminator. The original target
        // remains null and the assertion above still fails even if an event
        // changes the tree. A diagnostic reread is never counted as a pass.
        // Compare the two public AndroidX clients on the same failed document,
        // before the existing event experiment. Never replace the failed target.
        if(registeredConsumer())android.util.Log.i("NEVORA_QA_AX_STACK","registeredConsumer="+consumerProbe());
        UiObject2 byText=device.findObject(By.text("Sign out"));
        UiObject2 byDescription=device.findObject(By.desc("Sign out"));
        android.util.Log.i("NEVORA_QA_AX_STACK","standardText="+(byText!=null)
            +" standardDescription="+(byDescription!=null));
        if(android.os.Build.VERSION.SDK_INT>=34){
            boolean cleared=InstrumentationRegistry.getInstrumentation().getUiAutomation(android.app.UiAutomation.FLAG_DONT_SUPPRESS_ACCESSIBILITY_SERVICES).clearCache();
            UiObject2 clearedTarget=UiDeviceExt.onElementOrNull(device,3000L,100L,node->matchesTarget(node,"Sign out",true));
            android.util.Log.i("NEVORA_QA_AX_STACK","clientCacheCleared="+cleared+" clearedTarget="+(clearedTarget!=null));
        }
        java.util.concurrent.CountDownLatch observed=new java.util.concurrent.CountDownLatch(1);
        scenario.onActivity(activity->{
            WebView view=browser(activity.getWindow().getDecorView());
            if(view==null){observed.countDown();return;}
            view.evaluateJavascript("JSON.stringify((()=>{const b=[...document.querySelectorAll('button')].find(e=>e.textContent==='Sign out');const r=b?.getBoundingClientRect();return {exists:!!b,disabled:b?.disabled,focus:document.hasFocus(),visible:document.visibilityState==='visible',width:r?.width,height:r?.height,top:r?.top,left:r?.left}})())",result->{
                android.util.Log.i("NEVORA_QA_AX_EVENT","before="+result);
                view.sendAccessibilityEvent(android.view.accessibility.AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED);
                observed.countDown();
            });
        });
        try {
            boolean completed=observed.await(5,java.util.concurrent.TimeUnit.SECONDS);
            UiObject2 after=UiDeviceExt.onElementOrNull(device,3000L,100L,node->matchesTarget(node,"Sign out",true));
            android.util.Log.i("NEVORA_QA_AX_EVENT","eventCompleted="+completed+" targetAfterEvent="+(after!=null));
            device.dumpWindowHierarchy(new File(evidenceDirectory(),"Sign_out_after_content_event.xml"));
        }catch(Exception error){android.util.Log.i("NEVORA_QA_AX_EVENT","diagnostic="+error.getClass().getSimpleName());}
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
            java.io.ByteArrayOutputStream bytes = new java.io.ByteArrayOutputStream();
            byte[] buffer = new byte[1024]; int count;
            while ((count = input.read(buffer)) != -1) { assertTrue("Bound fixture response", bytes.size() + count <= 32768); bytes.write(buffer, 0, count); }
            return new org.json.JSONObject(new String(bytes.toByteArray(), java.nio.charset.StandardCharsets.UTF_8));
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
        android.view.accessibility.AccessibilityNodeInfo link = android.view.accessibility.AccessibilityNodeInfo.obtain();
        link.setVisibleToUser(true); link.setContentDescription("Renderer control");
        assertTrue("A visible exact accessible link name must be a pointer target even without a text child", matchesTarget(link, "Renderer control", true));
        assertFalse("Do not accept partial link names", matchesTarget(link, "Renderer", true));
        link.setVisibleToUser(false);
        assertFalse("Do not accept hidden link names", matchesTarget(link, "Renderer control", true));
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
    @Test public void d_ownerIsDistinctAndSurvivesRecreation() throws Exception {
        launch(origin); signIn("FICTIONAL-OWNER"); expectText("Fictional Owner Home");
        assertFalse(device.hasObject(By.text("Fictional Home")));
        if (android.os.Build.VERSION.SDK_INT < 33) {
            scenario.onActivity(activity -> assertTrue("Older supported Android must establish a secure window before private frames",
                (activity.getWindow().getAttributes().flags & android.view.WindowManager.LayoutParams.FLAG_SECURE) != 0));
            assertPrivateMarkerRendered();
            systemKey(187); assertSnapshotProtected("privacy_recents");
            control("/__test/revoke-all"); resumeOwnTask(); expectText("Fictional sign in");
            assertFalse("A real task resume must retire the revoked private page", device.hasObject(By.text("Fictional Owner Home")));
            signIn("FICTIONAL-OWNER"); expectText("Fictional Owner Home"); assertPrivateMarkerRendered();
            device.sleep(); device.wakeUp(); device.executeShellCommand("wm dismiss-keyguard"); expectText("Fictional Owner Home");
            systemKey(187); assertSnapshotProtected("privacy_screen_off_recents");
            resumeOwnTask(); expectText("Fictional Owner Home");
        }
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
    @Test public void h_repeatedEmployeeRecreationKeepsAccessibleSignOut() {
        launch(origin);signIn("FICTIONAL");expectText("Fictional Home");
        if(registeredConsumer()){
            String positive=consumerProbe();
            android.util.Log.i("NEVORA_QA_AX_STACK","registeredPositive="+positive);
            assertTrue("Independent consumer must retrieve the current fictional heading",positive.contains("home=true"));
        }
        for(int cycle=-1;cycle<10;cycle++) {
            if(cycle>=0){scenario.recreate();expectText("Fictional Home");}
            UiObject2 target=text("Sign out",true);
            if(target==null){retainFailure("Sign out");diagnoseMissingSignOut();}
            assertNotNull("Exact visible Sign out after recreation cycle "+cycle,target);
            android.util.Log.i("NEVORA_QA_AX_EVENT","recreationCycle="+cycle+" target=true");
        }
        signOut();
    }
    @Test public void h_stockWebViewRecreationReference() throws Exception {
        Intent intent=new Intent(InstrumentationRegistry.getInstrumentation().getTargetContext(),StockWebViewActivity.class).putExtra("fixtureOrigin",origin);
        try(ActivityScenario<StockWebViewActivity> stock=ActivityScenario.launch(intent)){
            signIn("FICTIONAL");
            for(int cycle=-1;cycle<10;cycle++){
                if(cycle>=0)stock.recreate();
                UiObject2 home=text("Fictional Home",false);
                UiObject2 signOut=text("Sign out",true);
                if(home==null||signOut==null){
                    retainFailure("Stock_missing_control");
                    if(registeredConsumer())android.util.Log.i("NEVORA_QA_AX_STACK","stockConsumer="+consumerProbe());
                    android.util.Log.i("NEVORA_QA_AX_STACK","stockCycle="+cycle+" home="+(home!=null)+" signOut="+(signOut!=null)+" standardSignOut="+(device.findObject(By.text("Sign out"))!=null));
                    java.util.concurrent.CountDownLatch observed=new java.util.concurrent.CountDownLatch(1);
                    stock.onActivity(activity->{WebView view=browser(activity.getWindow().getDecorView());
                        view.evaluateJavascript("JSON.stringify({title:document.title,heading:document.querySelector('h1')?.textContent,signOut:[...document.querySelectorAll('button')].some(e=>e.textContent==='Sign out'&&!e.disabled),focused:document.hasFocus(),visible:document.visibilityState==='visible'})",value->{android.util.Log.i("NEVORA_QA_AX_STACK","stockDom="+value);observed.countDown();});
                    });
                    assertTrue("Stock fixture observation must complete",observed.await(5,java.util.concurrent.TimeUnit.SECONDS));
                }
                assertNotNull("Stock reference Home cycle "+cycle,home);
                assertNotNull("Stock reference Sign out cycle "+cycle,signOut);
                android.util.Log.i("NEVORA_QA_AX_STACK","stockCycle="+cycle+" home=true signOut=true");
            }
        }
    }
    private void waitStockDocument(ActivityScenario<StockWebViewActivity> stock,String expected) throws Exception {
        long deadline=android.os.SystemClock.uptimeMillis()+20000;
        boolean ready=false;
        while(!ready&&android.os.SystemClock.uptimeMillis()<deadline){
            java.util.concurrent.CountDownLatch completed=new java.util.concurrent.CountDownLatch(1);
            java.util.concurrent.atomic.AtomicBoolean value=new java.util.concurrent.atomic.AtomicBoolean();
            stock.onActivity(activity->{WebView view=browser(activity.getWindow().getDecorView());
                view.evaluateJavascript("document.readyState==='complete'&&document.hasFocus()&&document.visibilityState==='visible'&&document.querySelector('h1')?.textContent==="+org.json.JSONObject.quote(expected),reply->{value.set("true".equals(reply));completed.countDown();});
            });
            assertTrue(completed.await(5,java.util.concurrent.TimeUnit.SECONDS));ready=value.get();
            if(!ready)android.os.SystemClock.sleep(100);
        }
        assertTrue("Focused complete fictional document precondition: "+expected,ready);
    }
    @Test public void h_serviceOnlyStockWebView() throws Exception {
        assertTrue("Select the independent accessibility service diagnostic",registeredConsumer());
        Intent intent=new Intent(InstrumentationRegistry.getInstrumentation().getTargetContext(),StockWebViewActivity.class).putExtra("fixtureOrigin",origin);
        try(ActivityScenario<StockWebViewActivity> stock=ActivityScenario.launch(intent)){
            waitStockDocument(stock,"Fictional sign in");
            onWebView().withElement(findElement(Locator.NAME,"employeeId")).perform(webKeys("FICTIONAL"));
            onWebView().withElement(findElement(Locator.NAME,"password")).perform(webKeys("fictional-test-password"));
            onWebView().withElement(findElement(Locator.CSS_SELECTOR,"button")).perform(webClick());
            for(int cycle=-1;cycle<10;cycle++){
                if(cycle>=0)stock.recreate();
                waitStockDocument(stock,"Fictional Home");
                // Match the existing AndroidX 20s readiness budget: Chromium
                // enables its virtual tree lazily after the first AT request.
                long deadline=android.os.SystemClock.uptimeMillis()+20000;
                String result="no-response";boolean complete=false;int attempts=0;
                while(!complete&&android.os.SystemClock.uptimeMillis()<deadline){
                    result=consumerProbe();attempts++;
                    complete=result.contains("home=true")&&result.contains("signOut=true");
                    if(!complete)android.os.SystemClock.sleep(100);
                }
                android.util.Log.i("NEVORA_QA_AX_STACK","serviceOnlyCycle="+cycle+" attempts="+attempts+" result="+result);
                // No AndroidX web-page traversal precedes this observation.
                if(!complete)retainFailure("Service_only_missing_control");
                assertTrue("Independent service must expose Home and Sign out cycle "+cycle,complete);
            }
        }
    }
    @Test public void z_ownerSessionForExternalProcessRestartCheck() {
        launch(origin); signIn("FICTIONAL-OWNER"); expectText("Fictional Owner Home");
    }
}
