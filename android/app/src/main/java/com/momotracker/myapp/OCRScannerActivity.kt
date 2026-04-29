package com.momotracker.myapp

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import android.os.Bundle
import android.util.Log
import android.view.View
import android.widget.Button
import android.widget.TextView
import androidx.annotation.OptIn
import androidx.appcompat.app.AppCompatActivity
import androidx.camera.core.*
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import com.momotracker.myapp.R
import org.json.JSONObject
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

class OCRScannerActivity : AppCompatActivity() {

    private lateinit var viewFinder: PreviewView
    private lateinit var resultTextView: TextView
    private lateinit var cameraExecutor: ExecutorService
    
    private val recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
    private var lastExtractedText = ""
    private val detectedTIDs = HashSet<String>()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_ocr_scanner)

        viewFinder = findViewById(R.id.viewFinder)
        resultTextView = findViewById(R.id.result_text)
        val btnClose = findViewById<Button>(R.id.btn_close)

        btnClose.setOnClickListener {
            finish()
        }

        cameraExecutor = Executors.newSingleThreadExecutor()

        if (allPermissionsGranted()) {
            startCamera()
        } else {
            ActivityCompat.requestPermissions(
                this, REQUIRED_PERMISSIONS, REQUEST_CODE_PERMISSIONS
            )
        }
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == REQUEST_CODE_PERMISSIONS) {
            if (allPermissionsGranted()) {
                startCamera()
            } else {
                finish()
            }
        }
    }

    private fun startCamera() {
        val cameraProviderFuture = ProcessCameraProvider.getInstance(this)

        cameraProviderFuture.addListener({
            val cameraProvider: ProcessCameraProvider = cameraProviderFuture.get()

            val preview = Preview.Builder()
                .build()
                .also {
                    it.setSurfaceProvider(viewFinder.surfaceProvider)
                }

            val imageAnalyzer = ImageAnalysis.Builder()
                .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                .build()
                .also {
                    it.setAnalyzer(cameraExecutor) { imageProxy ->
                        processImageProxy(imageProxy)
                    }
                }

            val cameraSelector = CameraSelector.DEFAULT_BACK_CAMERA

            try {
                cameraProvider.unbindAll()
                cameraProvider.bindToLifecycle(
                    this, cameraSelector, preview, imageAnalyzer
                )
            } catch (exc: Exception) {
                Log.e(TAG, "Use case binding failed", exc)
            }

        }, ContextCompat.getMainExecutor(this))
    }

    @OptIn(ExperimentalGetImage::class)
    private fun processImageProxy(imageProxy: ImageProxy) {
        val mediaImage = imageProxy.image
        if (mediaImage != null) {
            val image = InputImage.fromMediaImage(mediaImage, imageProxy.imageInfo.rotationDegrees)
            recognizer.process(image)
                .addOnSuccessListener { visionText ->
                    val fullText = visionText.text
                    if (fullText.isNotEmpty() && fullText != lastExtractedText) {
                        analyzeDetectedText(fullText)
                        lastExtractedText = fullText
                    }
                }
                .addOnFailureListener { e ->
                    Log.e(TAG, "Text recognition failed", e)
                }
                .addOnCompleteListener {
                    imageProxy.close()
                }
        } else {
            imageProxy.close()
        }
    }

    private fun analyzeDetectedText(text: String) {
        // Mobile Money keyword check
        val lowerText = text.lowercase()
        val keywords = listOf("received", "sent", "withdrawal", "deposit", "payment", "paid", "transferred", "reçu", "pokea", "tuma", "recebido")
        
        if (keywords.any { lowerText.contains(it) }) {
            // Check for potential TID to avoid duplicate processing in the same session
            val tidPattern = Regex("(TID|TxID|Txn|Ref|ID)[:\\-]?\\s*([A-Za-z0-9]+)", RegexOption.IGNORE_CASE)
            val tidMatch = tidPattern.find(text)
            val tid = tidMatch?.groupValues?.get(2)
            
            if (tid != null && detectedTIDs.contains(tid)) return
            
            if (tid != null) detectedTIDs.add(tid)
            
            // Send back to webview via a shared storage or broadcast
            // For real-time feedback, we can use a SharedPreference that the webview polls, 
            // but a better way is to save to a small SQLite DB as per requirements.
            saveDetection(text, tid)
            
            runOnUiThread {
                resultTextView.text = "Detected: ${if (tid != null) "TID $tid" else "Transaction"}"
                resultTextView.visibility = View.VISIBLE
                
                // Requirement 11: Automatically exit camera screen after detection 
                // Once data is saved (we called saveDetection above)
                resultTextView.postDelayed({
                    finish()
                }, 1500)
            }
        }
    }

    private fun saveDetection(text: String, tid: String?) {
        // Requirement 7: Save to local database (SQLite/Room)
        // For brevity and robustness without setting up full Room boilerplate, we'll use a direct SQLite helper
        val dbHelper = OCRDbHelper(this)
        dbHelper.addDetection(text, tid)
        
        // Also add to SharedPreferences so the webview can see it (compatible with SMS plugin style)
        val prefs = getSharedPreferences("MoMoDetector", Context.MODE_PRIVATE)
        val pendingStr = prefs.getString("pending_ocr", "[]") ?: "[]"
        try {
            val pendingArray = org.json.JSONArray(pendingStr)
            val newObj = JSONObject().apply {
                put("body", text)
                put("tid", tid)
                put("timestamp", System.currentTimeMillis())
            }
            pendingArray.put(newObj)
            prefs.edit().putString("pending_ocr", pendingArray.toString()).apply()
        } catch (e: Exception) {
            Log.e(TAG, "Error saving to prefs", e)
        }
    }

    private fun allPermissionsGranted() = REQUIRED_PERMISSIONS.all {
        ContextCompat.checkSelfPermission(baseContext, it) == PackageManager.PERMISSION_GRANTED
    }

    override fun onDestroy() {
        super.onDestroy()
        cameraExecutor.shutdown()
        recognizer.close()
    }

    companion object {
        private const val TAG = "OCRScannerActivity"
        private const val REQUEST_CODE_PERMISSIONS = 10
        private val REQUIRED_PERMISSIONS = arrayOf(Manifest.permission.CAMERA)
    }
}
