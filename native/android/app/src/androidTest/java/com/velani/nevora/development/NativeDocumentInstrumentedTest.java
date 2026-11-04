package com.velani.nevora.development;

import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.net.Uri;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import org.junit.Test;
import org.junit.runner.RunWith;
import static org.junit.Assert.*;

/** The owned Google APIs image has an installed default browser, independently
 * verified by the host. Query with the application's UID/visibility rules. */
@RunWith(AndroidJUnit4.class)
public class NativeDocumentInstrumentedTest {
    @Test public void installedBrowserIsVisibleForDeliberateDocumentHandoff() {
        assertFalse(BuildConfig.NATIVE_PUSH_ENABLED);
        Context app=InstrumentationRegistry.getInstrumentation().getTargetContext();
        ResolveInfo browser=app.getPackageManager().resolveActivity(
            new Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_APP_BROWSER),PackageManager.MATCH_DEFAULT_ONLY);
        assertNotNull("Installed browser must be visible to the native document chooser",browser);
        assertNotNull(browser.activityInfo);
        assertNotEquals(app.getPackageName(),browser.activityInfo.packageName);
        Intent document=new Intent(Intent.ACTION_VIEW,Uri.parse("https://nevora.example/app/payroll-export"))
            .addCategory(Intent.CATEGORY_BROWSABLE).setPackage(browser.activityInfo.packageName);
        assertNotNull("The browser must handle a scoped browser URL",app.getPackageManager().resolveActivity(document,PackageManager.MATCH_DEFAULT_ONLY));
    }
}
