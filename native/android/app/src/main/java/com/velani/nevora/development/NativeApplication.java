package com.velani.nevora.development;
import android.app.Application;
public final class NativeApplication extends Application {
    @Override public void onCreate(){super.onCreate();NativeFirebase.initialize(this);}
}
