package com.velani.nevora.development;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Approved native runtime baseline; this is not an authentication decision. */
final class WebViewRuntimePolicy {
    private static final int[] MINIMUM_VERSION = {156, 0, 8078, 50};
    private static final Pattern VERSION = Pattern.compile(
        "([1-9][0-9]{0,3})\\.([0-9]{1,8})\\.([0-9]{1,8})\\.([0-9]{1,8})");

    private WebViewRuntimePolicy() {}

    static boolean supported(String version) {
        if (version == null || version.length() > 31) return false;
        Matcher match = VERSION.matcher(version);
        if (!match.matches()) return false;
        for (int part = 0; part < MINIMUM_VERSION.length; part++) {
            int observed = Integer.parseInt(match.group(part + 1));
            if (observed != MINIMUM_VERSION[part]) return observed > MINIMUM_VERSION[part];
        }
        return true;
    }
}
