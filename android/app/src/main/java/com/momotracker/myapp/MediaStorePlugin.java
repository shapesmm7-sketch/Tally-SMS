package com.momotracker.myapp;

import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Context;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.OutputStream;

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
            byte[] pdfAsBytes = Base64.decode(base64Data, Base64.DEFAULT);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                ContentResolver resolver = context.getContentResolver();
                ContentValues contentValues = new ContentValues();
                contentValues.put(MediaStore.MediaColumns.DISPLAY_NAME, fileName);
                contentValues.put(MediaStore.MediaColumns.MIME_TYPE, "application/pdf");
                contentValues.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOCUMENTS + "/Reports");

                Uri uri = resolver.insert(MediaStore.Files.getContentUri("external"), contentValues);
                
                if (uri != null) {
                    OutputStream os = resolver.openOutputStream(uri);
                    if (os != null) {
                        os.write(pdfAsBytes);
                        os.flush();
                        os.close();
                    }
                    JSObject ret = new JSObject();
                    ret.put("success", true);
                    ret.put("uri", uri.toString());
                    call.resolve(ret);
                    return;
                } else {
                    call.reject("Could not create MediaStore entry");
                    return;
                }
            } else {
                // Fallback for older Android versions
                File docsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOCUMENTS);
                File reportsDir = new File(docsDir, "Reports");
                if (!reportsDir.exists()) {
                    reportsDir.mkdirs();
                }

                File file = new File(reportsDir, fileName);
                FileOutputStream os = new FileOutputStream(file, false);
                os.write(pdfAsBytes);
                os.flush();
                os.close();

                JSObject ret = new JSObject();
                ret.put("success", true);
                ret.put("uri", file.getAbsolutePath());
                call.resolve(ret);
            }

        } catch (IOException e) {
            e.printStackTrace();
            call.reject("File error: " + e.getMessage());
        } catch (IllegalArgumentException e) {
            e.printStackTrace();
            call.reject("Base64 error: " + e.getMessage());
        } catch (Exception e) {
            e.printStackTrace();
            call.reject("Error: " + e.getMessage());
        }
    }
}
