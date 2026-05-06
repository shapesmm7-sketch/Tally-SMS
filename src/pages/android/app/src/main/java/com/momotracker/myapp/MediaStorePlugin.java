package com.momotracker.myapp;

import android.content.ContentResolver;
import android.content.ContentValues;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import android.widget.Toast;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.OutputStream;

@CapacitorPlugin(name = "MediaStore")
public class MediaStorePlugin extends Plugin {

    @PluginMethod
    public void saveFile(PluginCall call) {
        String base64Data = call.getString("base64Data");
        String fileName = call.getString("fileName");
        String mimeType = call.getString("mimeType", "application/pdf");

        if (base64Data == null || fileName == null) {
            call.reject("Missing data or filename");
            return;
        }

        try {
            // Remove data prefix if present (e.g. "data:application/pdf;base64,")
            if (base64Data.contains(",")) {
                base64Data = base64Data.split(",")[1];
            }

            byte[] fileBytes = Base64.decode(base64Data, Base64.DEFAULT);
            ContentResolver resolver = getContext().getContentResolver();
            ContentValues contentValues = new ContentValues();

            contentValues.put(MediaStore.MediaColumns.DISPLAY_NAME, fileName);
            contentValues.put(MediaStore.MediaColumns.MIME_TYPE, mimeType);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                // Use Documents/TallySMS as requested
                contentValues.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOCUMENTS + "/TallySMS");
                contentValues.put(MediaStore.MediaColumns.IS_PENDING, 1);
            }

            Uri collection;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                collection = MediaStore.Files.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY);
            } else {
                collection = MediaStore.Files.getContentUri("external");
            }

            Uri uri = resolver.insert(collection, contentValues);

            if (uri != null) {
                try (OutputStream out = resolver.openOutputStream(uri)) {
                    if (out != null) {
                        out.write(fileBytes);
                        out.flush();
                    } else {
                        throw new Exception("Could not open output stream");
                    }
                }

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    contentValues.clear();
                    contentValues.put(MediaStore.MediaColumns.IS_PENDING, 0);
                    resolver.update(uri, contentValues, null, null);
                }

                getActivity().runOnUiThread(() -> {
                    Toast.makeText(getContext(), "File saved to Documents/TallySMS", Toast.LENGTH_LONG).show();
                });

                JSObject ret = new JSObject();
                ret.put("uri", uri.toString());
                ret.put("success", true);
                call.resolve(ret);
            } else {
                throw new Exception("Failed to create MediaStore entry");
            }
        } catch (Exception e) {
            e.printStackTrace();
            getActivity().runOnUiThread(() -> {
                Toast.makeText(getContext(), "Failed to save file", Toast.LENGTH_SHORT).show();
            });
            call.reject("Failed to save file: " + e.getMessage());
        }
    }
}
