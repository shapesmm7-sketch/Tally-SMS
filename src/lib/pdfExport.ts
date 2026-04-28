import { registerPlugin } from '@capacitor/core';

export interface ReportTransaction {
  date: string;
  type: string;
  category: string;
  amount: string;
}

export interface PDFExportPlugin {
  generateAndSavePDF(options: { title: string; filename?: string; transactions: ReportTransaction[] }): Promise<{ success: boolean; uri: string }>;
  saveBase64PDF(options: { data: string; filename?: string }): Promise<{ success: boolean; uri: string }>;
  openPDF(options: { uri: string }): Promise<void>;
}

const PDFExport = registerPlugin<PDFExportPlugin>('PDFExport');

export default PDFExport;
