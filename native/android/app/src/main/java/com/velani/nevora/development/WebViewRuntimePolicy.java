package com.velani.nevora.development;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Approved native runtime baseline; this is not an authentication decision. */
final class WebViewRuntimePolicy {
    private static final int MINIMUM_MAJOR = 149;
    private static final Pattern VERSION = Pattern.compile(
        "([1-9][0-9]{0,3})\\.[0-9]{1,8}\\.[0-9]{1,8}\\.[0-9]{1,8}");

    private WebViewRuntimePolicy() {}

    static boolean supported(String version) {
        if (version == null || version.length() > 31) return false;
        Matcher match = VERSION.matcher(version);
        return match.matches() && Integer.parseInt(match.group(1)) >= MINIMUM_MAJOR;
    }
}
