package com.velani.nevora.development;
import org.junit.Test;
import org.json.*;
import java.nio.file.*;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.security.spec.ECGenParameterSpec;
import java.time.Instant;
import static org.junit.Assert.*;

public class NativeRegistrationTest {
    private JSONArray vectors() throws Exception {return new JSONObject(new String(Files.readAllBytes(Path.of(System.getProperty("nevora.registrationVectors"))),StandardCharsets.UTF_8)).getJSONArray("vectors");}
    @Test public void publicGoldenVectorsMatchServerBytesAndDerSignatures() throws Exception {
        JSONArray vectors=vectors();
        for(int index=0;index<vectors.length();index++) {
            JSONObject vector=vectors.getJSONObject(index), c=vector.getJSONObject("challenge");
            NativeRegistration.Scope scope=new NativeRegistration.Scope("https://nevora.example","test",c.getString("platform"),"com.velani.nevora.development",c.getString("provider"),"a".repeat(64));
            String digest=c.getString("operation").equals("detach")?null:"85337816d263d362acb23a4255a636191075c2a90c47f2ee6db3362f7df11203";
            byte[] bytes=NativeRegistration.proofBytes(c,digest,scope,Instant.parse("2026-11-02T12:01:00Z"));
            assertEquals(vector.getString("utf8"),new String(bytes,StandardCharsets.UTF_8));
            assertEquals(vector.getString("sha256"),java.util.HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes)));
            KeyPairGenerator generator=KeyPairGenerator.getInstance("EC");generator.initialize(new ECGenParameterSpec("secp256r1"));KeyPair pair=generator.generateKeyPair();
            Signature signer=Signature.getInstance("SHA256withECDSA");signer.initSign(pair.getPrivate());signer.update(bytes);byte[] signature=signer.sign();
            signer.initVerify(pair.getPublic());signer.update(bytes);assertTrue(signer.verify(signature));
        }
    }
    @Test public void wrongScopeAndExpiredChallengesCannotBeSigned() throws Exception {
        JSONObject original=vectors().getJSONObject(0).getJSONObject("challenge");
        NativeRegistration.Scope scope=new NativeRegistration.Scope("https://nevora.example","test","ios","com.velani.nevora.development","apns-sandbox","a".repeat(64));
        for(String field:new String[]{"origin","environment","platform","appId","provider","keyFingerprint","nonce","challengeId","issuedAt","expiresAt"}) {
            JSONObject changed=new JSONObject(original.toString()).put(field,"foreign");
            assertThrows(field,IllegalArgumentException.class,()->NativeRegistration.proofBytes(changed,"a".repeat(64),scope,Instant.parse("2026-11-02T12:01:00Z")));
        }
        assertThrows(IllegalArgumentException.class,()->NativeRegistration.proofBytes(original,"a".repeat(64),scope,Instant.now()));
    }
}
