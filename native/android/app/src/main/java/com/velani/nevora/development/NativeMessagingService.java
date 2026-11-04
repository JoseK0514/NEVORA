package com.velani.nevora.development;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;
import android.app.*;
import android.content.*;
import android.os.*;

/** FCM token/material stays native. Server payloads and local foreground alerts
 * contain generic text plus opaque IDs only; taps still require current server
 * authorization after the shell's fresh protected navigation. */
public final class NativeMessagingService extends FirebaseMessagingService {
    static final NativeTokenState material=new NativeTokenState();
    static java.lang.ref.WeakReference<NativeCapabilitiesHandler> current=new java.lang.ref.WeakReference<>(null);
    @Override public void onNewToken(String value) {
        if(!BuildConfig.NATIVE_PUSH_ENABLED)return;
        new Handler(Looper.getMainLooper()).post(()->{material.update(value);NativeCapabilitiesHandler handler=current.get();if(handler!=null)handler.rotateTokenIfEnrolled();});
    }
    @Override public void onMessageReceived(RemoteMessage message) {
        if(!BuildConfig.NATIVE_PUSH_ENABLED)return;
        String id=message.getData().get("notificationId"),generation=message.getData().get("generation");
        if(!"1".equals(message.getData().get("nevoraProtocol"))||id==null||!id.matches("[A-Za-z0-9_-]{1,128}")||generation==null||!generation.matches("[a-f0-9-]{36}"))return;
        NotificationManager manager=(NotificationManager)getSystemService(Context.NOTIFICATION_SERVICE);if(!manager.areNotificationsEnabled())return;
        manager.createNotificationChannel(new NotificationChannel("nevora_notifications","NEVORA alerts",NotificationManager.IMPORTANCE_DEFAULT));
        Intent target=new Intent(this,PortalActivity.class).putExtra("notificationId",id).putExtra("generation",generation).putExtra("nevoraProtocol","1");
        target.setAction("com.nevora.NOTIFICATION."+id+"."+generation);
        PendingIntent tap=PendingIntent.getActivity(this,0,target,PendingIntent.FLAG_IMMUTABLE|PendingIntent.FLAG_UPDATE_CURRENT);
        Notification notification=new Notification.Builder(this,"nevora_notifications").setSmallIcon(android.R.drawable.ic_dialog_info).setContentTitle("NEVORA").setContentText("Open NEVORA.")
            .setVisibility(Notification.VISIBILITY_PRIVATE).setContentIntent(tap).setAutoCancel(true).build();
        manager.notify(id.hashCode(),notification);
    }
}
