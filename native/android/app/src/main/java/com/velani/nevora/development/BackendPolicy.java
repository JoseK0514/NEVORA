package com.velani.nevora.development;
import java.net.URI;
import java.util.Locale;

/** Build-selected origin policy. No web content selects a backend or authority. */
public final class BackendPolicy {
    public enum Navigation { INTERNAL, EXTERNAL, DENY }
    public final URI origin;

    public BackendPolicy(String value, boolean debug) {
        if (value == null) throw new IllegalArgumentException("Invalid backend origin");
        URI parsed = URI.create(value);
        String host = parsed.getHost();
        String path = parsed.getRawPath();
        if (host == null || host.isEmpty() || parsed.getRawUserInfo() != null || parsed.getRawQuery() != null
                || parsed.getRawFragment() != null || path != null && !path.isEmpty() && !path.equals("/") || !validPort(parsed))
            throw new IllegalArgumentException("Invalid backend origin");
        String canonical = host.toLowerCase(Locale.ROOT).replaceFirst("\\.$", "");
        boolean explicitLoopback = canonical.equals("localhost") || canonical.equals("127.0.0.1")
                || canonical.equals("10.0.2.2") || canonical.equals("[::1]") || canonical.equals("::1");
        boolean localAlias = explicitLoopback || canonical.endsWith(".localhost") || canonical.startsWith("127.");
        String[] labels = canonical.split("\\.", -1);
        boolean deploymentHost = canonical.length() <= 253 && labels.length >= 2;
        for (String label : labels) deploymentHost &= label.matches("[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?");
        deploymentHost &= !labels[labels.length - 1].isEmpty() && Character.isLetter(labels[labels.length - 1].charAt(0));
        boolean https = "https".equals(parsed.getScheme());
        if (!(https && (debug || deploymentHost && !localAlias)
                || debug && "http".equals(parsed.getScheme()) && explicitLoopback))
            throw new IllegalArgumentException("Invalid backend origin");
        origin = parsed;
    }

    public boolean contains(URI url) {
        return url != null && url.getRawUserInfo() == null && url.getHost() != null && validPort(url)
                && origin.getScheme().equals(url.getScheme()) && origin.getHost().equalsIgnoreCase(url.getHost())
                && effectivePort(origin) == effectivePort(url);
    }

    public URI url(String path) {
        URI target = origin.resolve(path);
        if (!contains(target)) throw new IllegalArgumentException("Foreign backend destination");
        return target;
    }

    public Navigation navigation(URI url, String method, boolean userInitiated, boolean mainFrame) {
        if (contains(url)) return Navigation.INTERNAL;
        if (url != null && userInitiated && mainFrame && "GET".equals(method) && "https".equals(url.getScheme())
                && url.getHost() != null && url.getRawUserInfo() == null && validPort(url)) return Navigation.EXTERNAL;
        return Navigation.DENY;
    }
    private static boolean validPort(URI uri) { return uri.getPort() == -1 || uri.getPort() >= 1 && uri.getPort() <= 65535; }
    private static int effectivePort(URI uri) { return uri.getPort() == -1 ? ("https".equals(uri.getScheme()) ? 443 : 80) : uri.getPort(); }
}
