package com.velani.nevora.development;

/** Temporary fixture-only independent accessibility connection; never shipped. */
public final class QaAccessibilityProbe extends android.accessibilityservice.AccessibilityService {
    private static final String PERMISSION="com.velani.nevora.development.test.QA_PROBE";
    private android.os.HandlerThread worker;
    private android.content.BroadcastReceiver receiver;
    @Override protected void onServiceConnected(){
        worker=new android.os.HandlerThread("fictional-ax-probe");worker.start();
        receiver=new android.content.BroadcastReceiver(){
            @Override public void onReceive(android.content.Context context,android.content.Intent intent){setResultData(probe());}
        };
        registerReceiver(receiver,new android.content.IntentFilter("com.velani.nevora.development.test.QA_PROBE"),PERMISSION,new android.os.Handler(worker.getLooper()));
        android.util.Log.i("NEVORA_QA_AX_STACK","independentServiceConnected=true");
    }
    @Override public void onAccessibilityEvent(android.view.accessibility.AccessibilityEvent event){}
    @Override public void onInterrupt(){}
    @Override public void onDestroy(){if(receiver!=null)unregisterReceiver(receiver);if(worker!=null)worker.quitSafely();super.onDestroy();}
    public String probe(){
        android.view.accessibility.AccessibilityNodeInfo root=getRootInActiveWindow();
        if(root==null)return "root=false nodes=0 signOut=false";
        int[] stats=new int[3];
        visit(root,stats,0);root.recycle();
        return "root=true nodes="+stats[0]+" signOut="+(stats[1]>0)+" home="+(stats[2]>0);
    }
    private void visit(android.view.accessibility.AccessibilityNodeInfo node,int[] stats,int depth){
        if(depth>64||stats[0]>=512)return;
        stats[0]++;
        if("com.velani.nevora.development".contentEquals(node.getPackageName()==null?"":node.getPackageName())&&node.isVisibleToUser()){
            if("Sign out".contentEquals(node.getText()==null?"":node.getText())||"Sign out".contentEquals(node.getContentDescription()==null?"":node.getContentDescription()))stats[1]++;
            if("Fictional Home".contentEquals(node.getText()==null?"":node.getText()))stats[2]++;
        }
        for(int i=0;i<node.getChildCount();i++){
            android.view.accessibility.AccessibilityNodeInfo child=node.getChild(i);
            if(child!=null){visit(child,stats,depth+1);child.recycle();}
        }
    }
}
