package com.velani.nevora.development;

import android.content.Intent;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.WebView;
import androidx.lifecycle.Lifecycle;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import androidx.test.uiautomator.By;
import androidx.test.uiautomator.UiDevice;
import org.junit.*;
import org.junit.runner.RunWith;
import org.junit.runners.MethodSorters;
import java.io.File;
import java.net.HttpURLConnection;
import java.net.URI;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicBoolean;
import static org.junit.Assert.*;
import static androidx.test.espresso.web.sugar.Web.onWebView;
import static androidx.test.espresso.web.webdriver.DriverAtoms.*;
import androidx.test.espresso.web.webdriver.Locator;

/** Real Next/PostgreSQL only. No fixture login, cookies or direct business calls. */
@RunWith(AndroidJUnit4.class)
@FixMethodOrder(MethodSorters.NAME_ASCENDING)
public class BackendInstrumentedTest {
    private ActivityScenario<PortalActivity> scenario;
    private UiDevice device;
    private String origin, control, owner;
    @Before public void setup() throws Exception {
        device = UiDevice.getInstance(InstrumentationRegistry.getInstrumentation());
        android.os.Bundle args = InstrumentationRegistry.getArguments();
        origin = args.getString("backendOrigin"); control = args.getString("backendControlOrigin"); owner = args.getString("nativeEvidenceKey");
        for (String value : new String[]{origin,control}) {
            assertNotNull(value); URI uri = URI.create(value);
            assertEquals("http",uri.getScheme()); assertEquals("127.0.0.1",uri.getHost()); assertTrue(uri.getPort()>0);
            assertNull(uri.getRawUserInfo()); assertNull(uri.getRawQuery()); assertNull(uri.getRawFragment()); assertEquals("",uri.getPath());
        }
        assertNotNull(owner); assertTrue(owner.matches("[a-f0-9]{32}")); command("reset");
        Intent intent = new Intent(InstrumentationRegistry.getInstrumentation().getTargetContext(),PortalActivity.class);
        intent.putExtra("nevora.debug.origin",origin); scenario = ActivityScenario.launch(intent);
    }
    @After public void close() throws Exception { try {command("outage-off");} finally {if(scenario!=null)scenario.close();} }
    private void command(String action) throws Exception {
        HttpURLConnection request=(HttpURLConnection)new URL(control+"/native-test").openConnection();
        request.setRequestMethod("POST");request.setDoOutput(true);request.setInstanceFollowRedirects(false);
        request.setConnectTimeout(3000);request.setReadTimeout(5000);
        request.setRequestProperty("Content-Type","application/json");request.setRequestProperty("x-nevora-native-test-owner",owner);
        try {try(java.io.OutputStream output=request.getOutputStream()){output.write(("{\"action\":\""+action+"\"}").getBytes(StandardCharsets.UTF_8));}
            assertEquals("Owned test control: "+action,200,request.getResponseCode());
        } finally {request.disconnect();}
    }
    private static WebView browser(View view) {
        if(view instanceof WebView)return(WebView)view;
        if(view instanceof ViewGroup)for(int i=0;i<((ViewGroup)view).getChildCount();i++){WebView found=browser(((ViewGroup)view).getChildAt(i));if(found!=null)return found;}
        return null;
    }
    private void expectText(String text) {
        boolean found=device.wait(current->{if(android.os.Build.VERSION.SDK_INT>=34)InstrumentationRegistry.getInstrumentation().getUiAutomation().clearCache();return current.hasObject(By.textContains(text));},20000L);
        if(!found)retain("missing_"+text.replaceAll("[^A-Za-z0-9]","_"));
        assertTrue("Expected actual backend text: "+text,found);
    }
    private void expectPath(String path) {
        boolean found=device.wait(current->{AtomicBoolean result=new AtomicBoolean();scenario.onActivity(activity->{WebView view=browser(activity.getWindow().getDecorView());result.set(view!=null&&view.getUrl()!=null&&path.equals(URI.create(view.getUrl()).getPath()));});return result.get();},20000L);
        if(!found)retain("missing_path"+path.replace('/','_'));assertTrue("Actual protected path: "+path,found);
    }
    private void retain(String name) {
        File directory=new File(InstrumentationRegistry.getInstrumentation().getTargetContext().getCacheDir(),"nevora-native-tests-"+owner);
        assertTrue(directory.isDirectory()||directory.mkdirs());device.takeScreenshot(new File(directory,name+".png"));
        try{device.dumpWindowHierarchy(new File(directory,name+".xml"));}catch(java.io.IOException error){throw new AssertionError(error);}
    }
    private void click(String selector){onWebView().withElement(findElement(Locator.CSS_SELECTOR,selector)).perform(webClick());}
    private void fill(String id,String value){onWebView().withElement(findElement(Locator.ID,id)).perform(clearElement()).perform(webKeys(value));}
    private void login(String id) {
        expectText("Employee ID");fill("login-employee-id",id);fill("login-password","Fictional-Phase-A-only!");
        click("button[type=submit]");expectPath("/app");
    }
    private void logout(){click("a.c-top-avatar");expectPath("/app/more");expectText("Sign out");device.findObject(By.text("Sign out")).click();expectText("Employee ID");}
    @Test public void a_employeeActionRevocationOutageAndLogout() throws Exception {
        login("QA-NATIVE-A");expectText("Welcome back, QA NATIVE");
        click(".mobile-nav a[href='/app/schedule']");expectPath("/app/schedule");
        click("a.c-top-avatar");expectPath("/app/more");click("main a[href='/app/availability']");expectPath("/app/availability");expectText("Your usual week");
        click("button[aria-label^='Monday,']");expectText("Available on Monday");click("[role=switch][aria-label='Available on Monday']");click(".c-sheet__done");
        click(".em-requests-mobile button[type=submit]");expectText("Usual hours saved");command("verify-employee");retain("employee_saved");
        scenario.moveToState(Lifecycle.State.CREATED);command("revoke");scenario.moveToState(Lifecycle.State.RESUMED);expectText("Employee ID");
        login("QA-NATIVE-A");expectText("Welcome back, QA NATIVE");
        scenario.moveToState(Lifecycle.State.CREATED);command("outage-on");scenario.moveToState(Lifecycle.State.RESUMED);expectText("Try again");
        assertFalse(device.hasObject(By.textContains("Welcome back, QA NATIVE")));command("outage-off");device.findObject(By.text("Try again")).click();expectText("Welcome back, QA NATIVE");
        logout();scenario.recreate();expectText("Employee ID");retain("employee_signed_out");
    }
    @Test public void b_ownerActionAndPersistentSession() throws Exception {
        login("QAOWNER");expectText("Fictional");click(".mobile-nav a[href='/app/schedule']");expectPath("/app/schedule");
        click("a.c-top-avatar");expectPath("/app/more");click("main a[href='/app/settings']");expectPath("/app/settings");
        click("main a[href='/app/settings/workspace']");expectPath("/app/settings/workspace");expectText("Business name");
        fill("workspace-name","Fictional Android Company");click("button[form='company-profile-form']");expectText("Company profile saved");command("verify-owner-android");retain("owner_saved");
        scenario.recreate();expectPath("/app");expectText("Fictional");logout();login("QAOWNER");expectText("Fictional");retain("owner_persistent");
    }
}
