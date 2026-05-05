import { Capacitor, registerPlugin } from '@capacitor/core';

export interface ReportTransaction {
  date: string;
  type: string;
  category: string;
  amount: string;
}

export interface MediaStorePlugin {
  saveFile(options: { base64Data: string; fileName: string; mimeType?: string }): Promise<{ success: boolean; uri: string }>;
}

const MediaStore = registerPlugin<MediaStorePlugin>('MediaStore');

export interface PDFExportPlugin {
  saveBase64PDF(options: { data: string; filename?: string }): Promise<{ success: boolean; uri: string }>;
  openPDF(options: { uri: string }): Promise<void>;
}

const PDFExport: PDFExportPlugin = {
  saveBase64PDF: async (options: { data: string; filename?: string }) => {
    const fileName = options.filename || `TallySMS_Report_${Date.now()}.pdf`;
    
    if (Capacitor.isNativePlatform()) {
      try {
        console.log('Saving PDF via MediaStore:', fileName);
        
        const result = await MediaStore.saveFile({
          base64Data: options.data,
          fileName: fileName,
          mimeType: 'application/pdf'
        });
        
        return { success: true, uri: result.uri };
      } catch (error) {
        console.error('Error in saveBase64PDF:', error);
        throw error;
      }
    } else {
      return { success: false, uri: '' };
    }
  },

  openPDF: async (options: { uri: string }) => {
    // Opening PDF natively without a specific plugin is tricky.
    // We could use Capacitor Share as a fallback to 'open' but user said no sharing.
    // However, 'open' usually means viewing.
    // Without FileOpener plugin, we can't do much more than saving.
    console.log('Open PDF requested for:', options.uri);
    // If we wanted to really open it, we'd need @capacitor-community/file-opener
  }
};

export default PDFExport;
