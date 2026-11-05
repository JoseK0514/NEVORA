package com.velani.nevora.development;

import org.junit.Test;
import static org.junit.Assert.*;

public class WebViewRuntimePolicyTest {
    @Test public void admitsTheApprovedBaselineAndNewerNumericProviders() {
        for (String version : new String[] {"149.0.7827.5", "150.0.7871.46", "159.0.8144.0", "1000.0.0.0"}) {
            assertTrue(version, WebViewRuntimePolicy.supported(version));
        }
    }

    @Test public void rejectsOlderProvidersEvenWhenTheOsCanRunTheApp() {
        for (String version : new String[] {"120.0.6099.193", "133.0.6943.137", "135.0.7038.0", "148.0.7778.120"}) {
            assertFalse(version, WebViewRuntimePolicy.supported(version));
        }
    }

    @Test public void unknownAndMalformedVersionsFailClosedWithoutOverflow() {
        for (String version : new String[] {null, "", "149", "149.0.7827", "v149.0.7827.5",
            " 149.0.7827.5", "149.0.7827.5\n", "0149.0.7827.5", "149.0.7827.-1",
            "149.0.7827.5+debug", "999999999999999999999.0.0.0", "149.0.123456789.5",
            "149.0.7827." + "1".repeat(8192)}) {
            assertFalse(String.valueOf(version), WebViewRuntimePolicy.supported(version));
        }
    }
}
