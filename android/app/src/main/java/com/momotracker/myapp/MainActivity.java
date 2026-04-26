package com.momotracker.myapp;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(SMSDetectionPlugin.class);
        registerPlugin(PDFExportPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
