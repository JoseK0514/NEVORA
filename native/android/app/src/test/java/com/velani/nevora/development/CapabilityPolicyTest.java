package com.velani.nevora.development;
import java.net.URI;
import org.junit.Test;
import static org.junit.Assert.*;

public class CapabilityPolicyTest {
    @Test public void maximumEnvelopeCannotExhaustTheParserStack() throws Exception {
        BackendPolicy p=new BackendPolicy("https://nevora.example",false);CapabilityGate gate=new CapabilityGate(p);java.net.URI page=p.url("/app");String nonce=gate.begin(page);
        org.json.JSONObject body=new org.json.JSONObject().put("version",1).put("id",java.util.UUID.randomUUID().toString()).put("nonce",nonce).put("method","notifications.complete").put("payload",new String(new char[8192]).replace('\0','A'));
        assertNotNull(gate.accept(body.toString(),page,true));
        body.put("id",java.util.UUID.randomUUID().toString()).put("payload",new String(new char[8193]).replace('\0','A'));assertNull(gate.accept(body.toString(),page,true));
    }
    @Test public void freshAndroidPermissionCanBeRequestedBeforeNotificationsAreEnabled() {
        assertEquals("default",NativeCapabilities.permission(33,false,false,false));
        assertEquals("denied",NativeCapabilities.permission(33,false,false,true));
        assertEquals("denied",NativeCapabilities.permission(32,false,true,false));
        assertEquals("granted",NativeCapabilities.permission(33,true,true,false));
    }
    @Test public void linksKeepOnlyApprovedExactOriginRoutes() {
        BackendPolicy p = new BackendPolicy("https://nevora.example", false);
        for (String path : new String[]{"/app", "/app/schedule?week=2030-01-07", "/activate?token=fictional", "/reset-access?token=fictional", "/login"})
            assertNotNull(path, NativeCapabilities.link(URI.create("https://nevora.example" + path), p));
        for (String url : new String[]{"https://foreign.example/app", "https://user@nevora.example/app", "https://nevora.example/api/payroll", "https://nevora.example/app/%2e%2e/api", "https://nevora.example/app?x=1&x=2", "https://nevora.example/app#private", "https://nevora.example/app/../api", "https://nevora.example/application"})
            assertNull(url, NativeCapabilities.link(URI.create(url), p));
    }
    @Test public void documentFallbackUsesOnlyKnownPortalDestinations() {
        assertEquals("/app",NativeCapabilities.documentBrowserPage("/api/payroll/documents/fictional"));
        assertEquals("/app/my-pay",NativeCapabilities.documentBrowserPage("/api/payroll/documents/fictional","/app/my-pay"));
        assertEquals("/app/payroll",NativeCapabilities.documentBrowserPage("/api/payroll/documents/fictional/view","/app/payroll/history"));
        assertEquals("/app",NativeCapabilities.documentBrowserPage("/api/payroll/documents/fictional","/app/payroll-export"));
        assertEquals("/app/payroll-export",NativeCapabilities.documentBrowserPage("/app/payroll-export"));
        assertEquals("/app/payroll-export",NativeCapabilities.documentBrowserPage("/api/payroll-export"));
        assertEquals("/app/reports",NativeCapabilities.documentBrowserPage("/api/reports/export"));
        assertEquals("/app/payroll-export",NativeCapabilities.documentBrowserPage("/api/period-close/artifact"));
        assertEquals("/app/payroll",NativeCapabilities.documentBrowserPage("/app/payroll/history"));
        assertNull(NativeCapabilities.documentBrowserPage("https://foreign.example/app/my-pay"));
        assertNull(NativeCapabilities.documentBrowserPage("/app/payroll-foreign"));
        assertNull(NativeCapabilities.documentBrowserPage("/api/other"));
    }
    @Test public void capabilityAdmissionRejectsFrameOriginReplayAndRetiredDocuments() throws Exception {
        BackendPolicy p = new BackendPolicy("https://nevora.example", false);
        CapabilityGate gate = new CapabilityGate(p); URI page = URI.create("https://nevora.example/app");
        String nonce = gate.begin(page), id = java.util.UUID.randomUUID().toString();
        String body = new org.json.JSONObject().put("version", 1).put("id", id).put("nonce", nonce).put("method", "hello").put("payload", "").toString();
        assertNull(gate.accept(body, page, false)); assertNull(gate.accept(body, URI.create("https://foreign.example/app"), true));
        assertNotNull(gate.accept(body, page, true)); assertNull(gate.accept(body, page, true));
        gate.suspend(); assertNull(gate.accept(body, page, true)); assertNotEquals(nonce, gate.begin(page)); assertNull(gate.accept(body, page, true));
    }
    @Test public void messagesRejectAmbiguousJsonAndFenceTurnOffGeneration() throws Exception {
        BackendPolicy p=new BackendPolicy("https://nevora.example",false);CapabilityGate gate=new CapabilityGate(p);URI page=p.url("/app");String nonce=gate.begin(page);
        String body=new org.json.JSONObject().put("version",1).put("id",java.util.UUID.randomUUID().toString()).put("nonce",nonce).put("method","notifications.detach").put("payload",java.util.UUID.randomUUID().toString()).toString();
        assertNotNull("Detach carries the reviewed generation",gate.accept(body,page,true));
        body=new org.json.JSONObject(body).put("id",java.util.UUID.randomUUID().toString()).put("method","hello").put("payload","").toString();
        assertNull(gate.accept(body.replaceFirst("\\{","{\"version\":1,"),page,true));
        assertNull(gate.accept(body+"{}",page,true));
        assertNull(gate.accept(body.replace('"','\''),page,true));
        assertNull(gate.accept(new org.json.JSONObject(body).put("method","notifications.detach").put("id",java.util.UUID.randomUUID().toString()).toString(),page,true));
    }
}
