package com.velani.nevora.development;
import java.net.URI;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;
import java.nio.charset.StandardCharsets;
import org.json.JSONObject;
public final class CapabilityGate {
    public static final class Command {public final String id, method, payload; public Command(String id, String method, String payload) {this.id=id;this.method=method;this.payload=payload;}}
    private final BackendPolicy policy;
    private volatile String nonce;
    private final Set<String> ids = new HashSet<>();
    public CapabilityGate(BackendPolicy policy) {this.policy=policy;}
    public String nonce() {return nonce;}
    public String begin(URI page) {
        suspend();
        if (page == null || !"https".equals(page.getScheme()) || NativeCapabilities.link(page, policy) == null) return null;
        nonce=UUID.randomUUID().toString();return nonce;
    }
    public void suspend() {nonce=null;ids.clear();}
    public Command accept(String body, URI source, boolean mainFrame) {
        if (!mainFrame || nonce == null || !policy.contains(source) || !"https".equals(source.getScheme()) || body == null || body.getBytes(StandardCharsets.UTF_8).length > 16384 || ids.size() >= 64) return null;
        try {
            if(!strictEnvelope(body))return null;
            JSONObject value = new JSONObject(body);
            HashSet<String> keys = new HashSet<>();value.keys().forEachRemaining(keys::add);
            if (!keys.equals(new HashSet<>(java.util.Arrays.asList("version", "id", "nonce", "method", "payload")))) return null;
            Object version=value.get("version");if (!(version instanceof Number) || ((Number)version).doubleValue()!=1) return null;
            for(String name:new String[]{"id","nonce","method","payload"}) if (!(value.get(name) instanceof String)) return null;
            String id=value.getString("id"), method=value.getString("method"), supplied=value.getString("nonce"), payload=value.getString("payload");
            if (!UUID.fromString(id).toString().equals(id) || !java.util.Arrays.asList("hello","notifications.permission","notifications.complete","notifications.detach").contains(method)
                || !(supplied.equals(nonce) || method.equals("hello") && supplied.isEmpty()) || payload.getBytes(StandardCharsets.UTF_8).length>8192
                || !(method.equals("notifications.complete") || method.equals("notifications.detach") ? validPayload(method,payload) : payload.isEmpty()) || !ids.add(id)) return null;
            return new Command(id,method,payload);
        } catch (Exception ignored) {return null;}
    }
    private static boolean validPayload(String method,String value) {
        if(method.equals("notifications.complete"))return !value.isEmpty();
        try{return UUID.fromString(value).toString().equals(value);}catch(Exception ignored){return false;}
    }
    private static boolean strictEnvelope(String body) {
        // Iterative flat JSON grammar: no recursive regular expression whose
        // stack could grow with a hostile (but size-bounded) string. JSONObject
        // validates decoded fields/types after this grammar/duplicate guard.
        int at=space(body,0);
        if(at>=body.length()||body.charAt(at++)!='{')return false;
        for(int field=0;field<5;field++) {
            at=stringEnd(body,space(body,at));if(at<0)return false;
            at=space(body,at);if(at>=body.length()||body.charAt(at++)!=':')return false;
            at=space(body,at);if(at>=body.length())return false;
            at=body.charAt(at)=='"'?stringEnd(body,at):numberEnd(body,at);if(at<0)return false;
            at=space(body,at);
            char separator=field==4?'}':',';
            if(at>=body.length()||body.charAt(at++)!=separator)return false;
        }
        return space(body,at)==body.length();
    }
    private static int space(String value,int at) {
        while(at<value.length()&&(value.charAt(at)==' '||value.charAt(at)=='\t'||value.charAt(at)=='\n'||value.charAt(at)=='\r'))at++;
        return at;
    }
    private static int stringEnd(String value,int at) {
        if(at>=value.length()||value.charAt(at++)!='"')return -1;
        while(at<value.length()) {
            char c=value.charAt(at++);
            if(c=='"')return at;
            if(c<32)return -1;
            if(c=='\\') {
                if(at>=value.length())return -1;char escape=value.charAt(at++);
                if(escape=='u') {
                    for(int i=0;i<4;i++) {
                        if(at>=value.length())return -1;char hex=value.charAt(at++);
                        if(!((hex>='0'&&hex<='9')||(hex>='a'&&hex<='f')||(hex>='A'&&hex<='F')))return -1;
                    }
                }else if("\"\\/bfnrt".indexOf(escape)<0)return -1;
            }
        }
        return -1;
    }
    private static int numberEnd(String value,int at) {
        if(at<value.length()&&value.charAt(at)=='-')at++;
        if(at>=value.length())return -1;
        if(value.charAt(at)=='0')at++;
        else {
            if(value.charAt(at)<'1'||value.charAt(at)>'9')return -1;
            do{at++;}while(at<value.length()&&value.charAt(at)>='0'&&value.charAt(at)<='9');
        }
        if(at<value.length()&&value.charAt(at)=='.') {
            int begin=++at;while(at<value.length()&&value.charAt(at)>='0'&&value.charAt(at)<='9')at++;if(begin==at)return -1;
        }
        if(at<value.length()&&(value.charAt(at)=='e'||value.charAt(at)=='E')) {
            at++;if(at<value.length()&&(value.charAt(at)=='+'||value.charAt(at)=='-'))at++;
            int begin=at;while(at<value.length()&&value.charAt(at)>='0'&&value.charAt(at)<='9')at++;if(begin==at)return -1;
        }
        return at;
    }
}
