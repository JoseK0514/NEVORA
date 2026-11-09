package com.velani.nevora.development;

/** Temporary minimal reference: loopback fictional content only. */
public final class StockWebViewActivity extends android.app.Activity {
    private android.webkit.WebView browser;
    @Override public void onCreate(android.os.Bundle saved){
        super.onCreate(saved);
        setRecentsScreenshotEnabled(false);
        String origin=getIntent().getStringExtra("nevora.debug.origin");
        java.net.URI parsed=java.net.URI.create(origin);
        if(!"http".equals(parsed.getScheme())||!"127.0.0.1".equals(parsed.getHost())||parsed.getPort()<1||parsed.getRawUserInfo()!=null||!"".equals(parsed.getRawPath())||parsed.getRawQuery()!=null||parsed.getRawFragment()!=null)throw new IllegalArgumentException();
        browser=new android.webkit.WebView(this);
        browser.getSettings().setJavaScriptEnabled(true);
        browser.getSettings().setAllowFileAccess(false);
        browser.getSettings().setAllowContentAccess(false);
        browser.setWebViewClient(new android.webkit.WebViewClient(){
            @Override public void onPageFinished(android.webkit.WebView view,String url){view.requestFocus();}
        });
        setContentView(browser);
        browser.loadUrl(origin+"/app");
    }
    @Override protected void onDestroy(){if(browser!=null){browser.stopLoading();browser.destroy();}super.onDestroy();}
}
