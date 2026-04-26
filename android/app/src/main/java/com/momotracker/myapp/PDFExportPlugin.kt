package com.momotracker.myapp

import android.content.ContentValues
import android.content.Intent
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.pdf.PdfDocument
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import android.widget.Toast
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import org.json.JSONArray
import java.io.OutputStream

@CapacitorPlugin(name = "PDFExport")
class PDFExportPlugin : Plugin() {

    @PluginMethod
    fun generateAndSavePDF(call: PluginCall) {
        val title = call.getString("title", "Momo Transaction Report") ?: "Momo Transaction Report"
        val filename = call.getString("filename", "momo_report_${System.currentTimeMillis()}.pdf") ?: "momo_report_${System.currentTimeMillis()}.pdf"
        val transactionsArray = call.getArray("transactions") ?: JSONArray()
        
        try {
            val pdfDoc = generatePdfDocument(title, transactionsArray)
            val savedUri = savePdfToDownloads(pdfDoc, filename)
            pdfDoc.close()
            
            if (savedUri != null) {
                // Show toast message
                activity.runOnUiThread {
                    Toast.makeText(context, "Report saved to Downloads", Toast.LENGTH_LONG).show()
                }
                
                val ret = JSObject()
                ret.put("success", true)
                ret.put("uri", savedUri.toString())
                call.resolve(ret)
            } else {
                activity.runOnUiThread {
                    Toast.makeText(context, "Failed to save report", Toast.LENGTH_LONG).show()
                }
                call.reject("Failed to save PDF to MediaStore")
            }
        } catch (e: Exception) {
            e.printStackTrace()
            activity.runOnUiThread {
                Toast.makeText(context, "Failed to generate report", Toast.LENGTH_LONG).show()
            }
            call.reject("Error generating PDF: ${e.message}")
        }
    }

    @PluginMethod
    fun openPDF(call: PluginCall) {
        val uriString = call.getString("uri")
        if (uriString == null) {
            call.reject("No URI provided")
            return
        }
        try {
            val uri = Uri.parse(uriString)
            val intent = Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(uri, "application/pdf")
                flags = Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK
            }
            context.startActivity(intent)
            call.resolve()
        } catch (e: Exception) {
            call.reject("Failed to open PDF", e)
        }
    }

    private fun generatePdfDocument(title: String, transactionsArray: JSONArray): PdfDocument {
        val pdfDocument = PdfDocument()
        val pageInfo = PdfDocument.PageInfo.Builder(595, 842, 1).create() // A4 size
        val page = pdfDocument.startPage(pageInfo)
        val canvas: Canvas = page.canvas
        val paint = Paint()

        // Title
        paint.color = Color.BLACK
        paint.textSize = 24f
        paint.isFakeBoldText = true
        canvas.drawText(title, 50f, 80f, paint)

        // Column Headers
        paint.textSize = 14f
        paint.isFakeBoldText = true
        canvas.drawText("Date", 50f, 130f, paint)
        canvas.drawText("Type", 200f, 130f, paint)
        canvas.drawText("Category", 300f, 130f, paint)
        canvas.drawText("Amount", 450f, 130f, paint)

        // Draw Line
        paint.strokeWidth = 1f
        canvas.drawLine(50f, 140f, 545f, 140f, paint)

        // Content
        paint.isFakeBoldText = false
        var yPos = 170f
        
        for (i in 0 until transactionsArray.length()) {
            val tx = transactionsArray.optJSONObject(i)
            if (tx != null) {
                val date = tx.optString("date", "")
                val type = tx.optString("type", "")
                val category = tx.optString("category", "")
                val amount = tx.optString("amount", "")
                
                // Truncate to avoid overlapping if string is too long (rough estimate)
                val safeDate = if (date.length > 20) date.substring(0, 20) else date
                
                canvas.drawText(safeDate, 50f, yPos, paint)
                canvas.drawText(type, 200f, yPos, paint)
                canvas.drawText(category, 300f, yPos, paint)
                canvas.drawText(amount, 450f, yPos, paint)
                
                yPos += 30f
                
                // Stop to avoid page overflow (simple implementation)
                if (yPos > 800f) break
            }
        }

        pdfDocument.finishPage(page)
        return pdfDocument
    }

    private fun savePdfToDownloads(pdfDocument: PdfDocument, filename: String): Uri? {
        val contentValues = ContentValues().apply {
            put(MediaStore.MediaColumns.DISPLAY_NAME, filename)
            put(MediaStore.MediaColumns.MIME_TYPE, "application/pdf")
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS)
            }
        }

        val resolver = context.contentResolver
        var uri: Uri? = null
        val collection = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            MediaStore.Downloads.EXTERNAL_CONTENT_URI
        } else {
            MediaStore.Files.getContentUri("external")
        }

        try {
            uri = resolver.insert(collection, contentValues)
            if (uri != null) {
                val outputStream: OutputStream? = resolver.openOutputStream(uri)
                if (outputStream != null) {
                    pdfDocument.writeTo(outputStream)
                    outputStream.close()
                } else {
                    resolver.delete(uri, null, null)
                    uri = null
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
            if (uri != null) {
                resolver.delete(uri, null, null)
            }
            return null
        }
        return uri
    }
}
