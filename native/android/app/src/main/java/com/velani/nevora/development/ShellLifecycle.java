package com.velani.nevora.development;
public final class ShellLifecycle {
    private long generation;
    private boolean active;
    public long activate() { active = true; return ++generation; }
    public void suspend() { active = false; ++generation; }
    public boolean accepts(long ticket) { return active && generation == ticket; }
}
