package com.velani.nevora.development;
import android.content.Context;
import android.app.NotificationManager;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.messaging.FirebaseMessaging;

/** Explicit public app configuration. No automatic token or analytics startup. */
final class NativeFirebase {
    static synchronized FirebaseApp initialize(Context context) {
        if(!BuildConfig.NATIVE_PUSH_ENABLED||!(BuildConfig.NATIVE_ENVIRONMENT.equals("test")||BuildConfig.NATIVE_ENVIRONMENT.equals("production")))return null;
        try{new BackendPolicy(BuildConfig.BACKEND_ORIGIN,false);}catch(Exception ignored){return null;}
        if(!BuildConfig.NATIVE_FIREBASE_PROJECT.matches("[a-z][a-z0-9-]{4,28}[a-z0-9]")||!BuildConfig.NATIVE_FIREBASE_APP.matches("1:[0-9]{1,32}:android:[a-f0-9]{8,64}")||BuildConfig.NATIVE_FIREBASE_API_KEY.isEmpty()||!BuildConfig.NATIVE_FIREBASE_SENDER.matches("[0-9]{1,32}"))return null;
        if(!((NotificationManager)context.getSystemService(Context.NOTIFICATION_SERVICE)).areNotificationsEnabled())return null;
        try {
            FirebaseApp app;
            try{app=FirebaseApp.getInstance();}catch(IllegalStateException absent){app=FirebaseApp.initializeApp(context,new FirebaseOptions.Builder().setProjectId(BuildConfig.NATIVE_FIREBASE_PROJECT).setApplicationId(BuildConfig.NATIVE_FIREBASE_APP).setApiKey(BuildConfig.NATIVE_FIREBASE_API_KEY).setGcmSenderId(BuildConfig.NATIVE_FIREBASE_SENDER).build());}
            app.setDataCollectionDefaultEnabled(false);FirebaseMessaging messaging=FirebaseMessaging.getInstance();messaging.setAutoInitEnabled(false);messaging.setDeliveryMetricsExportToBigQuery(false);return app;
        }catch(Exception ignored){return null;}
    }
}
