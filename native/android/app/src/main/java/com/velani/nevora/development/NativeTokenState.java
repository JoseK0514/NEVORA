package com.velani.nevora.development;
/** Native memory only. Version fences cached getToken callbacks that arrive
 * after a newer Firebase token callback. Never serialized/exported to JS. */
final class NativeTokenState {
    private String token;
    private long version;
    private boolean pending;
    synchronized void update(String value) {
        if(value==null||value.isEmpty()||value.length()>4096)return;
        if(!value.equals(token)){token=value;version++;pending=true;}
    }
    synchronized void updateIfCurrent(String value,long expected){if(version==expected)update(value);}
    synchronized void acknowledge(String sent){if(sent!=null&&sent.equals(token))pending=false;}
    synchronized String token(){return token;}
    synchronized long version(){return version;}
    synchronized boolean pending(){return pending;}
}
