package com.momotracker.myapp;

import android.content.Context;
import android.os.Environment;
import android.util.Base64;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;

@CapacitorPlugin(name = "MediaStore")
public class MediaStorePlugin extends Plugin {

    @PluginMethod
    public void saveFile(PluginCall call) {
        String base64Data = call.getString("base64Data");
        String fileName = call.getString("fileName");

        if (base64Data == null || fileName == null) {
            call.reject("Missing arguments");
            return;
        }

        try {
            Context context = getContext();
            File docsDir = context.getExternalFilesDir(Environment.DIRECTORY_DOCUMENTS);
            if (docsDir == null) {
                call.reject("Could not access external files dir");
                return;
            }

            File reportsDir = new File(docsDir, "Reports");
            if (!reportsDir.exists()) {
                if (!reportsDir.mkdirs()) {
                    call.reject("Could not create Reports directory");
                    return;
                }
            }

            File file = new File(reportsDir, fileName);
            byte[] pdfAsBytes = Base64.decode(base64Data, Base64.DEFAULT);

            FileOutputStream os = new FileOutputStream(file, false);
            os.write(pdfAsBytes);
            os.flush();
            os.close();

            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("uri", file.getAbsolutePath());
            call.resolve(ret);

        } catch (IOException e) {
            e.printStackTrace();
            call.reject("File error: " + e.getMessage());
        } catch (IllegalArgumentException e) {
            e.printStackTrace();
            call.reject("Base64 error: " + e.getMessage());
        }
    }
}
