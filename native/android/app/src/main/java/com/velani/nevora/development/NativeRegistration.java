package com.velani.nevora.development;
import org.json.JSONObject;
import org.json.JSONArray;
import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeFormatterBuilder;
import java.util.*;
import java.nio.charset.StandardCharsets;
public final class NativeRegistration {
    public static final class Scope {
        public final String origin, environment, platform, appId, provider, keyFingerprint;
        public Scope(String origin,String environment,String platform,String appId,String provider,String keyFingerprint) {
            this.origin=origin;this.environment=environment;this.platform=platform;this.appId=appId;this.provider=provider;this.keyFingerprint=keyFingerprint;
        }
    }
    private static IllegalArgumentException invalid() {return new IllegalArgumentException("Invalid native challenge");}
    private static String text(JSONObject c,String key,String pattern) throws Exception {
        Object value=c.get(key);if (!(value instanceof String) || !((String)value).matches(pattern)) throw invalid();return (String)value;
    }
    public static byte[] proofBytes(JSONObject c,String digest,Scope s,Instant now) {
        try {
            Set<String> fields=new HashSet<>(Arrays.asList("version","operation","challengeId","nonce","origin","environment","platform","appId","provider","keyFingerprint","expectedGeneration","issuedAt","expiresAt"));
            Set<String> actual=new HashSet<>();c.keys().forEachRemaining(actual::add);if(!fields.equals(actual))throw invalid();
            Object version=c.get("version");if (!(version instanceof Number) || ((Number)version).doubleValue()!=1)throw invalid();
            String operation=text(c,"operation","enroll|rotate|detach"), uuid="[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}";
            String id=text(c,"challengeId",uuid),nonce=text(c,"nonce","[A-Za-z0-9_-]{43}");
            byte[] nonceBytes=Base64.getUrlDecoder().decode(nonce);
            if(nonceBytes.length!=32 || !Base64.getUrlEncoder().withoutPadding().encodeToString(nonceBytes).equals(nonce))throw invalid();
            String[] names={"origin","environment","platform","appId","provider","keyFingerprint"};
            String[] expected={s.origin,s.environment,s.platform,s.appId,s.provider,s.keyFingerprint};
            for(int i=0;i<names.length;i++)if(!(c.get(names[i]) instanceof String)||!expected[i].equals(c.get(names[i])))throw invalid();
            if(!Arrays.asList("test","production").contains(s.environment)||!Arrays.asList("ios","android").contains(s.platform)||!s.keyFingerprint.matches("[a-f0-9]{64}")
                ||!(s.platform.equals("android")?s.provider.equals("fcm"):s.provider.equals(s.environment.equals("test")?"apns-sandbox":"apns-production")))throw invalid();
            String instant="[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\\.[0-9]{3}Z";
            String issued=text(c,"issuedAt",instant),expires=text(c,"expiresAt",instant);
            Instant from=Instant.parse(issued),to=Instant.parse(expires);DateTimeFormatter formatter=new DateTimeFormatterBuilder().appendInstant(3).toFormatter(Locale.ROOT);
            if(!formatter.format(from).equals(issued)||!formatter.format(to).equals(expires)||to.toEpochMilli()-from.toEpochMilli()!=120000||now.isBefore(from)||!now.isBefore(to))throw invalid();
            Object generation=c.get("expectedGeneration");
            if(generation==JSONObject.NULL){if(!operation.equals("enroll"))throw invalid();}
            else if(!(generation instanceof String)||!((String)generation).matches(uuid))throw invalid();
            if(operation.equals("detach")?digest!=null:digest==null||!digest.matches("[a-f0-9]{64}"))throw invalid();
            JSONArray tuple=new JSONArray().put(1).put(operation).put(id).put(nonce);
            for(String value:expected)tuple.put(value);
            tuple.put(generation).put(issued).put(expires).put(digest==null?JSONObject.NULL:digest);
            return ("NEVORA_NATIVE_REGISTRATION_V1\n"+tuple).getBytes(StandardCharsets.UTF_8);
        }catch(Exception ignored){throw invalid();}
    }
}
