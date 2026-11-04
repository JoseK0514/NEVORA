package com.velani.nevora.development;
import org.junit.Test;
import org.json.JSONObject;
import java.io.*;
import java.net.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.*;
import static org.junit.Assert.*;

public class NativeTransportTest {
    @Test public void cancellingNeverWaitsForAConnectionCloseOnTheCallerThread() throws Exception {
        CountDownLatch release=new CountDownLatch(1),reading=new CountDownLatch(1),closing=new CountDownLatch(1);AtomicInteger callbacks=new AtomicInteger();
        NativeRegistrationRequest transport=new NativeRegistrationRequest(Runnable::run,url->{
            Fake f=new Fake(url){@Override public void disconnect(){closing.countDown();try{release.await(2,TimeUnit.SECONDS);}catch(InterruptedException ignored){}super.disconnect();}};
            f.body=new InputStream(){public int read()throws IOException{reading.countDown();try{f.closed.await(2,TimeUnit.SECONDS);}catch(InterruptedException ignored){}throw new IOException("fictional cancelled IO");}};return f;
        },8000);
        try {
            transport.start(policy,false,new JSONObject(),()->true,(status,body)->callbacks.incrementAndGet());assertTrue(reading.await(1,TimeUnit.SECONDS));
            long start=System.nanoTime();transport.cancel();long elapsed=TimeUnit.NANOSECONDS.toMillis(System.nanoTime()-start);
            assertTrue("UI cancellation cannot wait for a blocking socket close; milliseconds="+elapsed,elapsed<250);assertTrue(closing.await(1,TimeUnit.SECONDS));assertEquals(0,callbacks.get());
        }finally{release.countDown();}
    }
    private static final BackendPolicy policy=new BackendPolicy("https://nevora.example",false);
    private static class Fake extends HttpURLConnection {
        final ByteArrayOutputStream sent=new ByteArrayOutputStream();InputStream body=new ByteArrayInputStream("{\"state\":\"unavailable\"}".getBytes(java.nio.charset.StandardCharsets.UTF_8));final CountDownLatch read=new CountDownLatch(1),closed=new CountDownLatch(1);
        Fake(URL url){super(url);}
        public void connect(){} public boolean usingProxy(){return false;}
        public void disconnect(){closed.countDown();}
        public OutputStream getOutputStream(){return sent;}
        public int getResponseCode(){return 200;}
        public String getContentType(){return "application/json";}
        public long getContentLengthLong(){return -1;}
        public InputStream getInputStream(){read.countDown();return body;}
    }
    @Test public void fixedEndpointNoCookiesOrRedirectsAndBoundedReply() throws Exception {
        AtomicReference<Fake> connection=new AtomicReference<>();CountDownLatch done=new CountDownLatch(1);AtomicInteger calls=new AtomicInteger();
        NativeRegistrationRequest transport=new NativeRegistrationRequest(Runnable::run,url->{Fake f=new Fake(url);connection.set(f);return f;},8000);
        transport.start(policy,false,new JSONObject(),()->true,(status,body)->{assertEquals(200,status);assertTrue(body.contains("unavailable"));calls.incrementAndGet();done.countDown();});
        assertTrue(done.await(2,TimeUnit.SECONDS));Fake f=connection.get();assertEquals("https://nevora.example/api/mobile/v1/notifications/complete",f.getURL().toString());assertNull(f.getRequestProperty("Cookie"));assertNull(f.getRequestProperty("Authorization"));assertFalse(f.getInstanceFollowRedirects());assertEquals(1,calls.get());
    }
    @Test public void streamingOversizeFailsWithoutUnboundedBuffer() throws Exception {
        CountDownLatch done=new CountDownLatch(1);
        NativeRegistrationRequest transport=new NativeRegistrationRequest(Runnable::run,url->{Fake f=new Fake(url);f.body=new ByteArrayInputStream(new byte[4097]);return f;},8000);
        transport.start(policy,true,new JSONObject(),()->true,(status,body)->{assertEquals(0,status);assertEquals("",body);done.countDown();});assertTrue(done.await(2,TimeUnit.SECONDS));
    }
    private Fake stalled(URL url) {
        Fake f=new Fake(url);f.body=new InputStream(){public int read() throws IOException {try{f.closed.await(2,TimeUnit.SECONDS);}catch(InterruptedException ignored){}throw new IOException("fictional stalled IO stopped");}};return f;
    }
    @Test public void totalDeadlineReturnsUnavailableAndReleasesOwnedRequest() throws Exception {
        CountDownLatch done=new CountDownLatch(1);AtomicInteger calls=new AtomicInteger();
        NativeRegistrationRequest transport=new NativeRegistrationRequest(Runnable::run,this::stalled,50);
        transport.start(policy,false,new JSONObject(),()->true,(status,body)->{assertEquals(0,status);assertEquals("",body);calls.incrementAndGet();done.countDown();});assertTrue(done.await(2,TimeUnit.SECONDS));assertEquals(1,calls.get());
    }
    @Test public void explicitCancellationCannotReturnLateSuccess() throws Exception {
        AtomicReference<Fake> active=new AtomicReference<>();AtomicInteger calls=new AtomicInteger();
        NativeRegistrationRequest transport=new NativeRegistrationRequest(Runnable::run,url->{Fake f=stalled(url);active.set(f);return f;},8000);
        CountDownLatch opened=new CountDownLatch(1);
        transport.start(policy,false,new JSONObject(),()->{opened.countDown();return true;},(status,body)->calls.incrementAndGet());assertTrue(opened.await(1,TimeUnit.SECONDS));
        // Wait for actual native IO, then cancel its owned connection.
        long until=System.nanoTime()+TimeUnit.SECONDS.toNanos(1);while(active.get()==null&&System.nanoTime()<until)Thread.yield();assertNotNull(active.get());assertTrue(active.get().read.await(1,TimeUnit.SECONDS));transport.cancel();assertTrue(active.get().closed.await(1,TimeUnit.SECONDS));assertEquals(0,calls.get());
    }
}
