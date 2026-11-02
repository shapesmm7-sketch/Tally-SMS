# Add project specific ProGuard rules here.

# Keep Capacitor Core and Plugins
-keep class com.getcapacitor.** { *; }
-keep interface com.getcapacitor.** { *; }
-keep class com.momotracker.myapp.** { *; }
-keep class * extends com.getcapacitor.Plugin { *; }
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }
-keepclassmembers class * {
    @com.getcapacitor.PluginMethod public *;
}

# Keep Cordova plugins
-keep class org.apache.cordova.** { *; }
-keep class * extends org.apache.cordova.CordovaPlugin { *; }

# Keep In-App Purchase and Ads
-keep class com.google.android.gms.ads.** { *; }
-keep class com.google.android.play.core.** { *; }

# Preserve line numbers for stack traces
-keepattributes SourceFile,LineNumberTable
-keepattributes *Annotation*
-keepattributes JavascriptInterface
