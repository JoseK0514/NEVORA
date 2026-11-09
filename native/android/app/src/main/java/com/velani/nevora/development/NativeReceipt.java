package com.velani.nevora.development;
final class NativeReceipt {
    final String revision;
    final boolean active;
    NativeReceipt(String revision,boolean active) {
        if(revision==null||!revision.matches("[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}"))throw new IllegalArgumentException();
        this.revision=revision;this.active=active;
    }
    String generation(){return active?revision:null;}
    boolean acceptsRotation(String expected){return active&&revision.equals(expected);}
}
