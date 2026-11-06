package com.velani.nevora.development;

import org.junit.Test;
import static org.junit.Assert.*;

public class WebViewRuntimePolicyTest {
    @Test public void refusesTheReproducedBrokenProviderUntilItIsUpdated() {
        assertFalse(WebViewRuntimePolicy.supported("149.0.7827.5"));
        assertFalse(WebViewRuntimePolicy.supported("155.0.8059.46"));
        assertTrue(WebViewRuntimePolicy.supported("156.0.8078.50"));
    }

    @Test public void requiresTheQualifiedPatchAndComparesEachVersionPartNumerically() {
        for (String version : new String[] {"156.0.0.0", "156.0.8077.999", "156.0.8078.9", "156.0.8078.49"})
            assertFalse(version, WebViewRuntimePolicy.supported(version));
        for (String version : new String[] {"156.0.8078.50", "156.0.8078.100", "156.0.8079.0", "156.1.0.0", "157.0.0.0"})
            assertTrue(version, WebViewRuntimePolicy.supported(version));
    }

    @Test public void admitsTheApprovedBaselineAndNewerNumericProviders() {
        for (String version : new String[] {"156.0.8078.50", "157.0.8103.38", "159.0.8144.0", "1000.0.0.0"}) {
            assertTrue(version, WebViewRuntimePolicy.supported(version));
        }
    }

    @Test public void rejectsOlderProvidersEvenWhenTheOsCanRunTheApp() {
        for (String version : new String[] {"120.0.6099.193", "133.0.6943.137", "135.0.7038.0", "148.0.7778.120"}) {
            assertFalse(version, WebViewRuntimePolicy.supported(version));
        }
    }

    @Test public void unknownAndMalformedVersionsFailClosedWithoutOverflow() {
        for (String version : new String[] {null, "", "156", "156.0.8078", "v156.0.8078.50",
            " 156.0.8078.50", "156.0.8078.50\n", "0156.0.8078.50", "156.0.8078.-1",
            "156.0.8078.50+debug", "999999999999999999999.0.0.0", "156.0.123456789.50",
            "156.0.8078." + "1".repeat(8192)}) {
            assertFalse(String.valueOf(version), WebViewRuntimePolicy.supported(version));
        }
    }
}
