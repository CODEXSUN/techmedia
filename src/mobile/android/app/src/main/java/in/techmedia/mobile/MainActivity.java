package in.techmedia.mobile;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(MobileReleaseUpdaterPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
