package com.velani.nevora.development;
import android.webkit.*;
import android.os.Handler;
import android.os.Looper;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.json.*;
import java.net.URI;
import java.util.Base64;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicReference;
import static org.junit.Assert.*;

/** Actual WebView/AndroidX listener boundary with owned inline HTML. Push is
 * disabled and every network request is blocked; no key/provider/account IO. */
@RunWith(AndroidJUnit4.class)
public class NativeBridgeInstrumentedTest {
    private static final String HELLO="11111111-1111-4111-8111-111111111111",LARGE="22222222-2222-4222-8222-222222222222";
    private static JSONObject state(WebView view) throws Exception {
        CountDownLatch done=new CountDownLatch(1);AtomicReference<String> value=new AtomicReference<>();
        new Handler(Looper.getMainLooper()).post(()->view.evaluateJavascript("JSON.stringify(window.nativeQa)",result->{value.set(result);done.countDown();}));
        assertTrue(done.await(3,TimeUnit.SECONDS));return new JSONObject(new JSONTokener(value.get()).nextValue().toString());
    }
    private static JSONObject waitState(WebView view,String field) throws Exception {
        long until=android.os.SystemClock.uptimeMillis()+10000;JSONObject value=null;
        do{value=state(view);if(value.optBoolean(field))return value;Thread.sleep(100);}while(android.os.SystemClock.uptimeMillis()<until);
        fail("Expected real bridge state: "+field+"; "+value);return null;
    }
    @Test public void trustedMainFrameOnlyReplayLargeEnvelopeAndRetirement() throws Exception {
        assertFalse(BuildConfig.NATIVE_PUSH_ENABLED);
        AtomicReference<WebView> browser=new AtomicReference<>();AtomicReference<NativeCapabilitiesHandler> channel=new AtomicReference<>();CountDownLatch loaded=new CountDownLatch(1);
        try(ActivityScenario<PortalActivity> scenario=ActivityScenario.launch(PortalActivity.class)) {
            scenario.onActivity(activity->{
                BackendPolicy policy=new BackendPolicy("https://nevora.example",false);WebView view=new WebView(activity);browser.set(view);view.getSettings().setJavaScriptEnabled(true);view.getSettings().setBlockNetworkLoads(true);
                NativeCapabilitiesHandler handler=new NativeCapabilitiesHandler(activity,policy);channel.set(handler);handler.bind(view);activity.setContentView(view);
                view.setWebViewClient(new WebViewClient(){@Override public void onPageFinished(WebView ready,String url){handler.ready(URI.create(url));loaded.countDown();}});
                String foreign="<script>parent.postMessage({qa:'foreign',available:typeof nevoraCapabilities!=='undefined'},'*')</script>";
                String same="<script>parent.postMessage({qa:'same',available:typeof nevoraCapabilities!=='undefined'},'*');nevoraCapabilities.onmessage=e=>parent.postMessage({qa:'sameReply',value:JSON.parse(e.data)},'*');window.addEventListener('message',e=>{if(e.data==='run-same')nevoraCapabilities.postMessage(JSON.stringify({version:1,id:'33333333-3333-4333-8333-333333333333',nonce:'',method:'hello',payload:''}));});</script>";
                String html="<meta name='viewport' content='width=device-width'><h1>Fictional native channel</h1><script>window.nativeQa={same:false,foreign:false,sameReply:false,hello:false,large:false,replay:false,retired:false};window.addEventListener('message',e=>{if(e.data.qa==='same')nativeQa.same=e.data.available;if(e.data.qa==='foreign')nativeQa.foreign=!e.data.available;if(e.data.qa==='sameReply')nativeQa.sameReply=!e.data.value.id});</script>"
                    +"<iframe srcdoc=\""+same.replace("&","&amp;").replace("\"","&quot;")+"\"></iframe><iframe src='data:text/html;base64,"+Base64.getEncoder().encodeToString(foreign.getBytes(java.nio.charset.StandardCharsets.UTF_8))+"'></iframe>";
                view.loadDataWithBaseURL("https://nevora.example/app",html,"text/html","UTF-8",null);
            });
            assertTrue(loaded.await(5,TimeUnit.SECONDS));WebView view=browser.get();
            scenario.onActivity(activity->view.evaluateJavascript("document.querySelector('iframe').contentWindow.postMessage('run-same','*');nevoraCapabilities.onmessage=e=>{let v=JSON.parse(e.data);if(v.id==='"+HELLO+"'){nativeQa.hello=v.state==='unavailable'&&v.permission==='unsupported';nativeQa.nonce=v.nonce;nevoraCapabilities.postMessage(JSON.stringify({version:1,id:'"+LARGE+"',nonce:v.nonce,method:'notifications.complete',payload:'A'.repeat(8192)}));}else if(v.id==='"+LARGE+"'){nativeQa.large=true;nevoraCapabilities.postMessage(JSON.stringify({version:1,id:'"+LARGE+"',nonce:nativeQa.nonce,method:'notifications.complete',payload:'A'}));}else if(!nativeQa.replay){nativeQa.replay=true}else{nativeQa.retired=true}};nevoraCapabilities.postMessage(JSON.stringify({version:1,id:'"+HELLO+"',nonce:'',method:'hello',payload:''}));",null));
            JSONObject value=waitState(view,"replay");assertTrue(value.getBoolean("hello"));assertTrue(value.getBoolean("large"));
            assertTrue(waitState(view,"sameReply").getBoolean("same"));assertTrue(waitState(view,"foreign").getBoolean("foreign"));
            scenario.onActivity(activity->{channel.get().suspend();view.evaluateJavascript("nevoraCapabilities.postMessage(JSON.stringify({version:1,id:'44444444-4444-4444-8444-444444444444',nonce:nativeQa.nonce,method:'hello',payload:''}));",null);});
            assertTrue(waitState(view,"retired").getBoolean("retired"));
            scenario.onActivity(activity->{channel.get().suspend();view.destroy();});
        }
    }
}
