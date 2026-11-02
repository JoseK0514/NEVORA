package com.velani.nevora.development;
import java.nio.charset.StandardCharsets;
import org.json.JSONObject;
import org.json.JSONTokener;

public enum SessionStatus {
    AUTHENTICATED, UNAUTHENTICATED;
    public static SessionStatus decode(int status, String body) {
        try {
            if (body == null || body.getBytes(StandardCharsets.UTF_8).length > 4096) throw new IllegalArgumentException();
            JSONTokener reader = new JSONTokener(body);
            Object parsed = reader.nextValue();
            if (!(parsed instanceof JSONObject) || reader.nextClean() != 0) throw new IllegalArgumentException();
            JSONObject envelope = (JSONObject) parsed;
            Object version = envelope.get("protocolVersion");
            Object state = envelope.get("state");
            if (!(version instanceof Integer) || ((Integer) version) != 1 || !(state instanceof String)) throw new IllegalArgumentException();
            if (status == 200 && state.equals("authenticated")) return AUTHENTICATED;
            if (status == 401 && state.equals("unauthenticated")) return UNAUTHENTICATED;
        } catch (Exception ignored) {
            // No server diagnostics, body, identity or credentials leave this boundary.
        }
        throw new IllegalArgumentException("NEVORA unavailable");
    }
}
