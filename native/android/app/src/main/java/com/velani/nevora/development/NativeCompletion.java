package com.velani.nevora.development;
import org.json.*;
import java.time.Instant;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;
public final class NativeCompletion {
    public interface Signer {byte[] sign(byte[] bytes) throws Exception;}
    public static JSONObject body(JSONObject c,String token,NativeRegistration.Scope scope,Instant now,Signer sign) {
        try {
            new BackendPolicy(scope.origin,false);String digest=null;
            if(c.getString("operation").equals("detach")){if(token!=null)throw new IllegalArgumentException();}
            else {
                if(token==null||token.isEmpty()||token.getBytes(StandardCharsets.UTF_8).length>(scope.platform.equals("ios")?2048:4096)
                    ||!token.matches(scope.platform.equals("ios")?"[a-f0-9]+":"[\\x21-\\x7e]+")||scope.platform.equals("ios")&&token.length()%2!=0)throw new IllegalArgumentException();
                StringBuilder hex=new StringBuilder();for(byte b:MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8)))hex.append(String.format(Locale.ROOT,"%02x",b));digest=hex.toString();
            }
            byte[] signature=sign.sign(NativeRegistration.proofBytes(c,digest,scope,now));if(signature.length<8||signature.length>72)throw new IllegalArgumentException();
            return new JSONObject().put("challengeId",c.getString("challengeId")).put("nonce",c.getString("nonce")).put("token",token==null?JSONObject.NULL:token)
                .put("signature",Base64.getUrlEncoder().withoutPadding().encodeToString(signature));
        }catch(Exception ignored){throw new IllegalArgumentException("Invalid native completion");}
    }
    public static JSONObject reply(String body,int status) {
        try {
            if(body==null||body.getBytes(StandardCharsets.UTF_8).length>4096)throw new IllegalArgumentException();
            JSONObject value=new JSONObject(body);String state=value.getString("state");
            if(state.equals("active")||state.equals("complete")) {
                if(status!=200||value.length()!=2||!(value.get("generation") instanceof String)||!value.getString("generation").matches("[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}"))throw new IllegalArgumentException();
                return new JSONObject().put("state",state).put("generation",value.getString("generation"));
            }
            int expected=state.equals("denied")?403:state.equals("conflict")?409:state.equals("throttled")?429:state.equals("unavailable")?503:0;
            if(value.length()!=1||expected==0||status!=expected)throw new IllegalArgumentException();return new JSONObject().put("state",state);
        }catch(Exception ignored){try{return new JSONObject().put("state","unavailable");}catch(Exception e){throw new IllegalStateException();}}
    }
}
