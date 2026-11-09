package com.velani.nevora.development;
import org.junit.Test;
import static org.junit.Assert.*;
public class NativeReceiptTest {
    @Test public void detachedRevisionIsNotActiveAndLateRotationCannotOverwriteANewerReceipt() {
        String a="11111111-1111-4111-8111-111111111111",b="22222222-2222-4222-8222-222222222222";
        NativeReceipt off=new NativeReceipt(a,false),active=new NativeReceipt(b,true);
        assertNull(off.generation());assertEquals(a,off.revision);assertFalse(off.acceptsRotation(a));assertFalse(active.acceptsRotation(a));assertTrue(active.acceptsRotation(b));
    }
    @Test public void unchangedAndOutOfOrderTokenRefreshesDoNotReplaceAcknowledgedOrNewerMaterial() {
        NativeTokenState state=new NativeTokenState();state.update("fictional-a");state.acknowledge("fictional-a");assertFalse(state.pending());
        long before=state.version();state.update("fictional-a");assertFalse(state.pending());
        state.update("fictional-b");state.updateIfCurrent("fictional-a",before);assertEquals("fictional-b",state.token());
        state.acknowledge("fictional-a");assertTrue(state.pending());state.acknowledge("fictional-b");assertFalse(state.pending());
    }
}
