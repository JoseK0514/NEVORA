package com.velani.nevora.development;
import android.Manifest;
import android.content.Intent;
import android.os.Build;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import androidx.test.uiautomator.*;
import org.junit.Test;
import org.junit.runner.RunWith;
import static org.junit.Assert.*;

/** Selected separately on the invocation-owned API33+ emulator, with the app's
 * notification permission reset externally before each isolated process. Native
 * push remains disabled, so this cannot initialize Firebase or send/register. */
@RunWith(AndroidJUnit4.class)
public class NativePermissionInstrumentedTest {
    private void permissionPrompt(boolean grant) throws Exception {
        assertTrue(Build.VERSION.SDK_INT>=33);assertFalse(BuildConfig.NATIVE_PUSH_ENABLED);
        android.content.Context context=InstrumentationRegistry.getInstrumentation().getTargetContext();
        android.content.SharedPreferences preferences=context.getSharedPreferences("nevora-native-metadata",0);
        boolean present=preferences.contains("notifications.permission.asked"),old=preferences.getBoolean("notifications.permission.asked",false);
        preferences.edit().remove("notifications.permission.asked").commit();
        Intent intent=new Intent(context,PortalActivity.class).putExtra("nevora.debug.origin","http://127.0.0.1:9");
        try(ActivityScenario<PortalActivity> scenario=ActivityScenario.launch(intent)) {
            scenario.onActivity(activity->{
                NativeCapabilitiesHandler reader=new NativeCapabilitiesHandler(activity,new BackendPolicy("https://nevora.example",false));
                assertEquals("default",reader.permission());
                activity.requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS},NativeCapabilitiesHandler.PERMISSION_REQUEST);
            });
            UiDevice device=UiDevice.getInstance(InstrumentationRegistry.getInstrumentation());
            String resource=grant?"permission_allow_button":"permission_deny_button";
            UiObject2 action=device.wait(Until.findObject(By.res("com.android.permissioncontroller",resource)),5000);
            assertNotNull("Actual OS notification permission control",action);action.click();
            assertTrue("Permission result must reach the actual coordinator",device.wait(current->preferences.getBoolean("notifications.permission.asked",false),5000L));
            scenario.onActivity(activity->{
                NativeCapabilitiesHandler reader=new NativeCapabilitiesHandler(activity,new BackendPolicy("https://nevora.example",false));
                assertEquals(grant?"granted":"denied",reader.permission());
            });
        }finally{
            android.content.SharedPreferences.Editor edit=preferences.edit();if(present)edit.putBoolean("notifications.permission.asked",old);else edit.remove("notifications.permission.asked");assertTrue(edit.commit());
        }
    }
    @Test public void grantFromFreshPermissionState() throws Exception {permissionPrompt(true);}
    @Test public void denyFromFreshPermissionState() throws Exception {permissionPrompt(false);}
}
