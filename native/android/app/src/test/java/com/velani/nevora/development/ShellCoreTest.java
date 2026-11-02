package com.velani.nevora.development;

import java.net.URI;
import org.junit.Test;
import static org.junit.Assert.*;

public class ShellCoreTest {
    private static final String AUTH = "{\"protocolVersion\":1,\"state\":\"authenticated\"}";
    @Test public void releaseRejectsUnconfiguredAmbiguousAndLocalOrigins() {
        for (String value : new String[]{"", "http://nevora.example", "https://localhost", "https://LOCALHOST.",
                "https://test.localhost", "https://127.0.0.1", "https://127.1", "https://2130706433", "https://0177.0.0.1",
                "https://0x7f000001", "https://[::1]", "https://[::ffff:127.0.0.1]", "https://[2001:db8::1]",
                "https://user:secret@nevora.example", "https://nevora.example/app", "https://nevora.example?x=1",
                "https://nevora.example#proof", "https://nevora..example", "https://nevora.example:0", "https://nevora.example:65536"}) {
            assertThrows(value, IllegalArgumentException.class, () -> new BackendPolicy(value, false));
        }
    }
    @Test public void debugCleartextIsOnlyExplicitOwnedLoopbackOrEmulator() {
        for (String value : new String[]{"http://localhost:3456", "http://127.0.0.1:3456", "http://10.0.2.2:3456", "http://[::1]:3456"})
            assertNotNull(new BackendPolicy(value, true));
        for (String value : new String[]{"http://nevora.example", "http://127.attacker.example", "http://127.0.0.1.attacker.example", "http://10.0.2.2.attacker.example"})
            assertThrows(value, IllegalArgumentException.class, () -> new BackendPolicy(value, true));
    }
    @Test public void exactOriginIncludesDefaultPortsButNotCredentialsOrAliases() {
        BackendPolicy policy = new BackendPolicy("https://NEVORA.example:443/", false);
        for (String value : new String[]{"https://nevora.example/app", "https://nevora.example:443/login", "https://nevora.example/app?week=2030-01-01"})
            assertTrue(value, policy.contains(URI.create(value)));
        for (String value : new String[]{"https://nevora.example.evil/app", "http://nevora.example", "https://nevora.example:444", "https://nevora.example./app",
                "https://user@nevora.example/app", "https://nevora.example@foreign.example", "file:///private", "javascript:alert(1)"})
            assertFalse(value, policy.contains(URI.create(value)));
        assertEquals("https://NEVORA.example:443/api/mobile/v1/session", policy.url("/api/mobile/v1/session").toString());
    }
    @Test public void foreignNavigationRequiresDeliberateMainframeHttpsGet() {
        BackendPolicy policy = new BackendPolicy("https://nevora.example", false);
        URI foreign = URI.create("https://foreign.example/help");
        assertEquals(BackendPolicy.Navigation.EXTERNAL, policy.navigation(foreign, "GET", true, true));
        assertEquals(BackendPolicy.Navigation.DENY, policy.navigation(foreign, "POST", true, true));
        assertEquals(BackendPolicy.Navigation.DENY, policy.navigation(foreign, "GET", false, true));
        assertEquals(BackendPolicy.Navigation.DENY, policy.navigation(foreign, "GET", true, false));
        for (String value : new String[]{"http://foreign.example", "file:///private", "data:text/html,private", "intent://app", "https://user@foreign.example"})
            assertEquals(value, BackendPolicy.Navigation.DENY, policy.navigation(URI.create(value), "GET", true, true));
        assertEquals(BackendPolicy.Navigation.INTERNAL, policy.navigation(URI.create("https://nevora.example/app"), "POST", true, true));
    }
    @Test public void onlyMatchingVersionAndStatusAreCompatible() {
        assertEquals(SessionStatus.AUTHENTICATED, SessionStatus.decode(200, AUTH));
        assertEquals(SessionStatus.UNAUTHENTICATED, SessionStatus.decode(401, "{\"state\":\"unauthenticated\",\"protocolVersion\":1}"));
        for (int status : new int[]{204, 302, 400, 401, 403, 500, 503})
            assertThrows(IllegalArgumentException.class, () -> SessionStatus.decode(status, AUTH));
        for (String body : new String[]{"<html>login</html>", "{}", "{\"protocolVersion\":2,\"state\":\"authenticated\"}",
                "{\"protocolVersion\":\"1\",\"state\":\"authenticated\"}", "{\"protocolVersion\":1,\"state\":true}",
                "{\"protocolVersion\":1,\"state\":\"unauthenticated\"}", AUTH + " ".repeat(4097)})
            assertThrows(body, IllegalArgumentException.class, () -> SessionStatus.decode(200, body));
    }
    @Test public void ticketsCannotSurviveBackgroundOrAnotherActivation() {
        ShellLifecycle lifecycle = new ShellLifecycle();
        long first = lifecycle.activate(); assertTrue(lifecycle.accepts(first));
        long second = lifecycle.activate(); assertFalse(lifecycle.accepts(first)); assertTrue(lifecycle.accepts(second));
        lifecycle.suspend(); lifecycle.suspend(); assertFalse(lifecycle.accepts(second));
        assertFalse(lifecycle.accepts(-1)); assertTrue(lifecycle.accepts(lifecycle.activate()));
    }
}
