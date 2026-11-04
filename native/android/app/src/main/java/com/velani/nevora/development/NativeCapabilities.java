package com.velani.nevora.development;
import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.HashSet;

public final class NativeCapabilities {
    private NativeCapabilities() {}
    public static String permission(int sdk,boolean notificationsEnabled,boolean postGranted,boolean asked) {
        if(sdk>=33&&!postGranted)return asked?"denied":"default";
        return notificationsEnabled?"granted":"denied";
    }
    public static URI link(URI uri, BackendPolicy policy) {
        if (uri == null || !policy.contains(uri) || uri.toString().getBytes(StandardCharsets.UTF_8).length > 2048 || uri.getRawFragment() != null) return null;
        String path = uri.getRawPath();
        if (path == null || path.contains("%") || path.contains("\\") || path.matches(".*(?:^|/)\\.{1,2}(?:/|$).*")) return null;
        if (!(path.equals("/app") || path.startsWith("/app/") || java.util.Arrays.asList("/login", "/activate", "/reset-access", "/forgot-access").contains(path))) return null;
        try {
            HashSet<String> seen = new HashSet<>();
            if (uri.getRawQuery() != null) {
                String[] items = uri.getRawQuery().split("&", -1); if (items.length > 16) return null;
                for (String item : items) {
                    String[] pair = item.split("=", 2);
                    String name = URLDecoder.decode(pair[0], "UTF-8"), value = pair.length == 2 ? URLDecoder.decode(pair[1], "UTF-8") : "";
                    if (!name.matches("[A-Za-z][A-Za-z0-9_-]{0,63}") || !seen.add(name) || value.matches("(?s).*[\\x00-\\x1f\\x7f\\\\].*")) return null;
                }
            }
        } catch (Exception error) {return null;}
        return uri;
    }
    public static String documentBrowserPage(String path) {
        return documentBrowserPage(path,null);
    }
    public static String documentBrowserPage(String path,String source) {
        if(path.startsWith("/api/payroll/documents/")) {
            if("/app/my-pay".equals(source))return "/app/my-pay";
            if(source!=null&&(source.equals("/app/payroll")||source.startsWith("/app/payroll/")))return "/app/payroll";
            return "/app";
        }
        if(path.equals("/app/my-pay"))return "/app/my-pay";
        if(path.equals("/api/reports/export")||path.equals("/app/reports"))return "/app/reports";
        if(path.equals("/api/payroll-export")||path.equals("/api/period-close/artifact")||path.equals("/app/payroll-export"))return "/app/payroll-export";
        if(path.equals("/app/payroll")||path.startsWith("/app/payroll/"))return "/app/payroll";
        return null;
    }
}
