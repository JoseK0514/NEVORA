package com.velani.nevora.development;
import android.os.Build;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.security.spec.ECGenParameterSpec;
import java.util.*;

/** Installation identity only. Android Keystore never exports private bytes. */
final class NativeKeyStore {
    final String alias,spki,fingerprint;
    private final PrivateKey privateKey;
    NativeKeyStore(String scope) throws Exception {
        alias="nevora.native.v1."+hex(MessageDigest.getInstance("SHA-256").digest(scope.getBytes(StandardCharsets.UTF_8)));
        KeyStore store=KeyStore.getInstance("AndroidKeyStore");store.load(null);
        if(!store.containsAlias(alias)) {
            KeyPairGenerator generator=KeyPairGenerator.getInstance(KeyProperties.KEY_ALGORITHM_EC,"AndroidKeyStore");
            KeyGenParameterSpec.Builder parameters=new KeyGenParameterSpec.Builder(alias,KeyProperties.PURPOSE_SIGN|KeyProperties.PURPOSE_VERIFY)
                .setAlgorithmParameterSpec(new ECGenParameterSpec("secp256r1")).setDigests(KeyProperties.DIGEST_SHA256).setUserAuthenticationRequired(false);
            if(Build.VERSION.SDK_INT>=28)parameters.setUnlockedDeviceRequired(true);
            generator.initialize(parameters.build());generator.generateKeyPair();
        }
        privateKey=(PrivateKey)store.getKey(alias,null);
        byte[] encoded=store.getCertificate(alias).getPublicKey().getEncoded();
        if(encoded.length!=91)throw new IllegalStateException();
        spki=Base64.getUrlEncoder().withoutPadding().encodeToString(encoded);fingerprint=hex(MessageDigest.getInstance("SHA-256").digest(encoded));
    }
    byte[] sign(byte[] bytes) throws Exception {
        Signature signature=Signature.getInstance("SHA256withECDSA");signature.initSign(privateKey);signature.update(bytes);return signature.sign();
    }
    private static String hex(byte[] bytes) {StringBuilder out=new StringBuilder();for(byte b:bytes)out.append(String.format(Locale.ROOT,"%02x",b));return out.toString();}
}
