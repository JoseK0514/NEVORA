package com.velani.nevora.development;

import android.content.Intent;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import androidx.test.uiautomator.By;
import androidx.test.uiautomator.UiDevice;
import org.junit.Test;
import org.junit.runner.RunWith;
import java.io.File;
import java.net.URI;
import static org.junit.Assert.*;

/** Separate process, launched only after the runner force-stops the preceding
 * Owner scenario. No sign-in/reset, cookie access, or backend test controller. */
@RunWith(AndroidJUnit4.class)
public class ColdStartInstrumentedTest {
    @Test public void ownerSessionSurvivesProcessRestart() throws Exception {
        android.os.Bundle args=InstrumentationRegistry.getArguments();
        boolean backend=args.containsKey("backendOrigin");
        String origin=args.getString(backend?"backendOrigin":"fixtureOrigin"),key=args.getString("nativeEvidenceKey");
        assertNotNull(origin);URI url=URI.create(origin);
        assertEquals("http",url.getScheme());assertEquals("127.0.0.1",url.getHost());assertTrue(url.getPort()>0);
        assertEquals("",url.getPath());assertNull(url.getRawUserInfo());assertNull(url.getRawQuery());assertNull(url.getRawFragment());
        assertNotNull(key);assertTrue(key.matches("[a-f0-9]{32}"));
        File directory=new File(InstrumentationRegistry.getInstrumentation().getTargetContext().getCacheDir(),"nevora-native-tests-"+key);
        assertTrue(directory.isDirectory()||directory.mkdirs());
        UiDevice device=UiDevice.getInstance(InstrumentationRegistry.getInstrumentation());
        Intent intent=new Intent(InstrumentationRegistry.getInstrumentation().getTargetContext(),PortalActivity.class).putExtra("nevora.debug.origin",origin);
        try(ActivityScenario<PortalActivity> scenario=ActivityScenario.launch(intent)) {
            boolean home=device.wait(current->backend
                ?current.hasObject(By.textContains("Welcome back, Fictional"))&&current.hasObject(By.text("Team"))&&current.hasObject(By.text("Schedule"))
                :current.hasObject(By.text("Fictional Owner Home")),25000L);
            device.dumpWindowHierarchy(new File(directory,"cold_start.xml"));
            device.takeScreenshot(new File(directory,"cold_start.png"));
            assertTrue("Owner must remain signed in after a real process restart",home);
            android.util.Log.i("NEVORA_QA_COLD","ownerSession=true pid="+android.os.Process.myPid());
        }
    }
}
