package com.velani.nevora.development;
import android.Manifest;
import android.app.*;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.*;
import android.webkit.WebView;
import androidx.webkit.WebViewCompat;
import androidx.webkit.WebViewFeature;
import com.google.firebase.FirebaseApp;
import com.google.firebase.messaging.FirebaseMessaging;
import org.json.JSONObject;
import java.net.URI;
import java.time.Instant;
import java.util.Collections;
import java.util.function.Consumer;

/** Narrow origin/main-frame/page channel; no cookie or provider-token export. */
final class NativeCapabilitiesHandler {
    static final int PERMISSION_REQUEST=9814;
    private final PortalActivity activity;
    private final BackendPolicy policy;
    private final CapabilityGate gate;
    private final String origin,environment;
    private final boolean enabled;
    private final SharedPreferences metadata;
    private NativeKeyStore key;
    private WebView view;
    private volatile NativeRegistrationRequest request,rotation;
    private Consumer<JSONObject> permissionReply;
    NativeCapabilitiesHandler(PortalActivity activity,BackendPolicy policy) {
        this.activity=activity;this.policy=policy;gate=new CapabilityGate(policy);
        origin=policy.origin.getScheme()+"://"+policy.origin.getHost()+(policy.origin.getPort()>0&&policy.origin.getPort()!=443?":"+policy.origin.getPort():"");
        environment=BuildConfig.NATIVE_ENVIRONMENT;
        enabled=BuildConfig.NATIVE_PUSH_ENABLED&&"https".equals(policy.origin.getScheme())&&("test".equals(environment)||"production".equals(environment));
        metadata=activity.getSharedPreferences("nevora-native-metadata",Context.MODE_PRIVATE);
        NativeMessagingService.current=new java.lang.ref.WeakReference<>(this);
    }
    private NativeKeyStore key() throws Exception {if(key==null)key=new NativeKeyStore(origin+"|"+environment+"|"+BuildConfig.APPLICATION_ID);return key;}
    private NativeReceipt receipt() {
        try{return new NativeReceipt(metadata.getString(key().alias,null),metadata.getBoolean(key().alias+".active",false));}catch(Exception ignored){return null;}
    }
    private void remember(JSONObject result) {
        try {
            String state=result.getString("state");
            if((state.equals("active")||state.equals("complete"))&&!metadata.edit().putString(key().alias,result.getString("generation")).putBoolean(key().alias+".active",state.equals("active")).commit()) {
                result.remove("generation");result.put("state","unavailable");
            }
        }catch(Exception ignored){result.remove("generation");try{result.put("state","unavailable");}catch(Exception unused){}}
    }
    private NativeRegistration.Scope scope() throws Exception {return new NativeRegistration.Scope(origin,environment,"android",BuildConfig.APPLICATION_ID,"fcm",key().fingerprint);}
    void bind(WebView view) {
        suspend();this.view=view;
        if(!"https".equals(policy.origin.getScheme())||!WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER))return;
        WebViewCompat.addWebMessageListener(view,"nevoraCapabilities",Collections.singleton(origin),(sender,message,source,isMainFrame,reply)->{
            CapabilityGate.Command command=sender==this.view?gate.accept(message.getData(),URI.create(source.toString()),isMainFrame):null;
            if(command==null){reply.postMessage("{\"state\":\"unavailable\"}");return;}
            final String ticket=gate.nonce();
            Consumer<JSONObject> answer=value->{
                if(!ticket.equals(gate.nonce())||sender!=this.view)return;
                try{value.put("version",1).put("id",command.id);reply.postMessage(value.toString());}catch(Exception ignored){reply.postMessage("{\"state\":\"unavailable\"}");}
            };
            try {
                if(!enabled){answer.accept(new JSONObject().put("state","unavailable").put("nonce",ticket).put("platform","android").put("permission","unsupported"));return;}
                NativeKeyStore key=key();
                if(command.method.equals("hello")) {
                    NativeReceipt receipt=receipt();
                    answer.accept(new JSONObject().put("state","ready").put("nonce",ticket).put("platform","android").put("spki",key.spki).put("keyFingerprint",key.fingerprint)
                        .put("permission",permission()).put("generation",receipt==null||receipt.generation()==null?JSONObject.NULL:receipt.generation()).put("revision",receipt==null?JSONObject.NULL:receipt.revision).put("maintenance",rotation!=null));
                }else if(command.method.equals("notifications.permission")) {
                    if(Build.VERSION.SDK_INT>=33&&activity.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)!=PackageManager.PERMISSION_GRANTED) {
                        if(permissionReply!=null)throw new IllegalStateException();permissionReply=answer;activity.requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS},PERMISSION_REQUEST);
                    }else{refreshTokenIfAllowed();answer.accept(new JSONObject().put("state","permission").put("permission",permission()));}
                }else if(command.method.equals("notifications.complete")) {
                    JSONObject challenge=new JSONObject(command.payload);
                    if(request!=null||rotation!=null||!"enroll".equals(challenge.getString("operation"))||NativeMessagingService.material.token()==null||!permission().equals("granted"))throw new IllegalStateException();
                    complete(challenge,NativeMessagingService.material.token(),false,null,()->ticket.equals(gate.nonce()),answer);
                }else if(command.method.equals("notifications.detach")){maintenance("detach",command.payload,false,answer);}
            }catch(Exception ignored){answer.accept(NativeCompletion.reply("",0));}
        });
    }
    void ready(URI page) {gate.begin(page);}
    void suspend() {gate.suspend();if(request!=null)request.cancel();request=null;permissionReply=null;}
    String permission() {
        NotificationManager manager=(NotificationManager)activity.getSystemService(Context.NOTIFICATION_SERVICE);
        NotificationChannel channel=manager.getNotificationChannel("nevora_notifications");
        if(channel!=null&&channel.getImportance()==NotificationManager.IMPORTANCE_NONE)return "denied";
        return NativeCapabilities.permission(Build.VERSION.SDK_INT,manager.areNotificationsEnabled(),Build.VERSION.SDK_INT<33||activity.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)==PackageManager.PERMISSION_GRANTED,metadata.getBoolean("notifications.permission.asked",false));
    }
    void permissionResult(int[] results) {
        if(results.length>0)metadata.edit().putBoolean("notifications.permission.asked",true).commit();
        Consumer<JSONObject> answer=permissionReply;permissionReply=null;refreshTokenIfAllowed();
        if(answer!=null)try{answer.accept(new JSONObject().put("state","permission").put("permission",permission()));}catch(Exception ignored){}
    }
    void refreshTokenIfAllowed() {
        if(!enabled||!permission().equals("granted"))return;
        try {
            FirebaseApp app=NativeFirebase.initialize(activity.getApplicationContext());if(app==null)return;
            NotificationManager manager=(NotificationManager)activity.getSystemService(Context.NOTIFICATION_SERVICE);
            NotificationChannel channel=new NotificationChannel("nevora_notifications","NEVORA alerts",NotificationManager.IMPORTANCE_DEFAULT);channel.setLockscreenVisibility(android.app.Notification.VISIBILITY_PRIVATE);manager.createNotificationChannel(channel);
            FirebaseMessaging messaging=FirebaseMessaging.getInstance();messaging.setAutoInitEnabled(false);messaging.setDeliveryMetricsExportToBigQuery(false);
            long version=NativeMessagingService.material.version();
            messaging.getToken().addOnCompleteListener(result->{if(result.isSuccessful()){NativeMessagingService.material.updateIfCurrent(result.getResult(),version);rotateTokenIfEnrolled();}});
        }catch(Exception ignored){/* Configuration/device readiness remains unavailable. */}
    }
    private void complete(JSONObject challenge,String token,boolean rotating,String expected,java.util.function.BooleanSupplier current,Consumer<JSONObject> answer) throws Exception {
        JSONObject body=NativeCompletion.body(challenge,token,scope(),Instant.now(),key()::sign);
        NativeRegistrationRequest owned=new NativeRegistrationRequest();if(rotating)rotation=owned;else request=owned;
        owned.start(policy,false,body,current,(status,raw)->{
            if((rotating?rotation:request)!=owned)return;
            if(rotating)rotation=null;else request=null;
            JSONObject result=NativeCompletion.reply(raw,status);
            NativeReceipt previous=receipt();
            if(rotating&&(previous==null||!previous.acceptsRotation(expected)))return;
            remember(result);
            if("active".equals(result.optString("state")))NativeMessagingService.material.acknowledge(token);
            answer.accept(result);
            if("active".equals(result.optString("state")))rotateTokenIfEnrolled();
        });
    }
    private void maintenance(String operation,String reviewed,boolean rotating,Consumer<JSONObject> answer) {
        try {
            if((rotating?rotation:request)!=null||rotating&&request!=null)throw new IllegalStateException();
            NativeReceipt prior=receipt();String expected=reviewed==null?(prior==null?null:prior.revision):reviewed;
            if(expected==null)throw new IllegalStateException();
            final String ticket=gate.nonce(),token=operation.equals("detach")?null:NativeMessagingService.material.token();
            JSONObject body=new JSONObject().put("operation",operation).put("keyFingerprint",key().fingerprint).put("expectedGeneration",expected).put("operationId",java.util.UUID.randomUUID().toString());
            NativeRegistrationRequest owned=new NativeRegistrationRequest();if(rotating)rotation=owned;else request=owned;
            owned.start(policy,true,body,()->(rotating?rotation:request)==owned,(status,raw)->{
                if((rotating?rotation:request)!=owned)return;
                if(rotating)rotation=null;else request=null;
                try {
                    JSONObject reply=new JSONObject(raw),c=reply.getJSONObject("challenge");
                    if(status!=200||reply.length()!=2||!reply.getString("state").equals("challenge")||!c.getString("operation").equals(operation)||!c.getString("expectedGeneration").equals(expected))throw new IllegalStateException();
                    if(rotating) {
                        NativeReceipt live=receipt();
                        if(live==null||!live.acceptsRotation(expected))return;
                        if(!java.util.Objects.equals(token,NativeMessagingService.material.token())){rotateTokenIfEnrolled();return;}
                    }
                    complete(c,token,rotating,expected,()->rotating||java.util.Objects.equals(ticket,gate.nonce()),answer);
                }catch(Exception ignored){answer.accept(NativeCompletion.reply("",0));}
            });
        }catch(Exception ignored){answer.accept(NativeCompletion.reply("",0));}
    }
    void rotateTokenIfEnrolled() {
        NativeReceipt prior=enabled?receipt():null;
        if(prior!=null&&prior.active&&rotation==null&&request==null&&NativeMessagingService.material.pending()&&NativeMessagingService.material.token()!=null)maintenance("rotate",null,true,ignored->{});
    }
    boolean acceptsTap(String value) {NativeReceipt prior=enabled?receipt():null;return prior!=null&&prior.active&&value!=null&&value.equals(prior.generation());}
}
