package com.velani.nevora.development;
import org.junit.Test;
import org.json.*;
import java.nio.file.*;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.security.*;
import java.security.spec.ECGenParameterSpec;
import static org.junit.Assert.*;
public class NativeCompletionTest {
    @Test public void completionBodyIsBoundToChallengeAndUsesRealDerSignature() throws Exception {
        JSONObject c=new JSONObject(new String(Files.readAllBytes(Path.of(System.getProperty("nevora.registrationVectors"))),StandardCharsets.UTF_8)).getJSONArray("vectors").getJSONObject(0).getJSONObject("challenge");
        NativeRegistration.Scope scope=new NativeRegistration.Scope("https://nevora.example","test","ios","com.velani.nevora.development","apns-sandbox","a".repeat(64));
        KeyPairGenerator g=KeyPairGenerator.getInstance("EC");g.initialize(new ECGenParameterSpec("secp256r1"));KeyPair pair=g.generateKeyPair();
        JSONObject body=NativeCompletion.body(c,"a1b2",scope,Instant.parse("2026-11-02T12:01:00Z"),bytes->{Signature s=Signature.getInstance("SHA256withECDSA");s.initSign(pair.getPrivate());s.update(bytes);return s.sign();});
        assertEquals(4,body.length());assertEquals("a1b2",body.getString("token"));assertEquals(c.getString("challengeId"),body.getString("challengeId"));
        assertThrows(IllegalArgumentException.class,()->NativeCompletion.body(c,"RAW\nTOKEN",scope,Instant.parse("2026-11-02T12:01:00Z"),bytes->{fail("Invalid tokens must not reach key signing");return new byte[0];}));
    }
    @Test public void onlyMatchingClosedBoundedRepliesBecomePublicState() throws Exception {
        String generation="11111111-1111-4111-8111-111111111111",valid="{\"state\":\"active\",\"generation\":\""+generation+"\"}";
        assertEquals("active",NativeCompletion.reply(valid,200).getString("state"));
        for(String body:new String[]{valid.replace("active","unknown"),valid.substring(0,valid.length()-1)+",\"token\":\"private\"}"," ".repeat(5000)})assertEquals("unavailable",NativeCompletion.reply(body,200).getString("state"));
        assertEquals("unavailable",NativeCompletion.reply(valid,503).getString("state"));
    }
}
