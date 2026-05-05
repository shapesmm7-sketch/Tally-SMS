import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

export interface ReportTransaction {
  date: string;
  type: string;
  category: string;
  amount: string;
}

export interface PDFExportPlugin {
  saveBase64PDF(options: { data: string; filename?: string }): Promise<{ success: boolean; uri: string }>;
  openPDF(options: { uri: string }): Promise<void>;
}

const PDFExport: PDFExportPlugin = {
  saveBase64PDF: async (options: { data: string; filename?: string }) => {
    const fileName = options.filename || `report_${Date.now()}.pdf`;
    
    if (Capacitor.isNativePlatform()) {
      try {
        // Log for debugging
        console.log('Saving PDF to Documents:', fileName);
        
        try {
          const result = await Filesystem.writeFile({
            path: fileName,
            data: options.data,
            directory: Directory.Documents,
          });
          
          console.log('PDF saved successfully:', result.uri);
          return { success: true, uri: result.uri };
        } catch (initialError) {
          console.warn('Initial save failed, requesting permissions...', initialError);
          // Try requesting permissions and saving again
          await Filesystem.requestPermissions();
          const result = await Filesystem.writeFile({
            path: fileName,
            data: options.data,
            directory: Directory.Documents,
          });
          return { success: true, uri: result.uri };
        }
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
