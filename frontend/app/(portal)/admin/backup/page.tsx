"use client";

import { useState } from "react";
import { AdminService } from "@/services/admin.service";
import { Database, Download, Upload, AlertTriangle, CheckCircle, RefreshCcw } from "lucide-react";
import clsx from "clsx";

export default function BackupPage() {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<{ success: boolean; message: string; data?: any } | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const blob = await AdminService.exportBackup();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `backup_${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Export failed:", error);
      alert("Failed to export backup. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) return;
    
    if (!confirm("Warning: Importing data may overwrite current records. Are you sure you want to proceed?")) {
      return;
    }

    setIsImporting(true);
    setImportStatus(null);
    try {
      const result = await AdminService.importBackup(selectedFile);
      setImportStatus({
        success: true,
        message: "Data imported successfully!",
        data: result.data
      });
      setSelectedFile(null);
    } catch (error: any) {
      console.error("Import failed:", error);
      setImportStatus({
        success: false,
        message: error.response?.data?.message || "Import failed. Please check the file format."
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-brand-100 rounded-lg">
          <Database className="w-6 h-6 text-brand-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Database Backup & Recovery</h1>
          <p className="text-slate-500 text-sm">Export your database to Excel or restore from a backup file.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Export Section */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
              <Download className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-semibold">Export Backup</h2>
          </div>
          <p className="text-slate-600 text-sm mb-6">
            Download all system data (Users, Courses, Enrollments, Payments, etc.) as a multi-sheet Excel file. 
            Keep this file safe for future recovery.
          </p>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className={clsx(
              "w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-all focus:ring-4 focus:ring-blue-100",
              isExporting ? "bg-slate-100 text-slate-400 cursor-not-allowed" : "bg-blue-600 text-white hover:bg-blue-700 active:scale-95"
            )}
          >
            {isExporting ? <RefreshCcw className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
            {isExporting ? "Exporting..." : "Download Excel Backup"}
          </button>
        </div>

        {/* Import Section */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
              <Upload className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-semibold">Import Recovery</h2>
          </div>
          <p className="text-slate-600 text-sm mb-6">
            Upload a previously exported Excel file to restore your database. 
            <span className="text-amber-600 font-medium font-semibold block mt-1">
              <AlertTriangle className="w-4 h-4 inline mr-1 -mt-1" />
              Caution: This process can create duplicate records if data already exists.
            </span>
          </p>
          
          <div className="space-y-4">
            <div className="relative border-2 border-dashed border-slate-200 rounded-xl p-4 text-center hover:border-brand-400 transition-colors">
              <input
                type="file"
                accept=".xlsx"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="flex flex-col items-center">
                <Upload className="w-8 h-8 text-slate-400 mb-2" />
                <span className="text-sm font-medium text-slate-600">
                  {selectedFile ? selectedFile.name : "Click to select .xlsx file"}
                </span>
              </div>
            </div>

            <button
              onClick={handleImport}
              disabled={isImporting || !selectedFile}
              className={clsx(
                "w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-all focus:ring-4",
                (isImporting || !selectedFile) 
                  ? "bg-slate-100 text-slate-400 cursor-not-allowed" 
                  : "bg-amber-600 text-white hover:bg-amber-700 active:scale-95 focus:ring-amber-100"
              )}
            >
              {isImporting ? <RefreshCcw className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
              {isImporting ? "Importing Data..." : "Restore from Excel"}
            </button>
          </div>
        </div>
      </div>

      {/* Status Reports */}
      {importStatus && (
        <div className={clsx(
          "p-6 rounded-2xl border flex gap-4 transition-all animate-in fade-in slide-in-from-bottom-4 duration-300",
          importStatus.success ? "bg-emerald-50 border-emerald-200" : "bg-rose-50 border-rose-200"
        )}>
          <div className="mt-1">
            {importStatus.success ? <CheckCircle className="w-6 h-6 text-emerald-600" /> : <AlertTriangle className="w-6 h-6 text-rose-600" />}
          </div>
          <div className="flex-1">
            <h3 className={clsx("font-bold mb-1", importStatus.success ? "text-emerald-900" : "text-rose-900")}>
              {importStatus.message}
            </h3>
            {importStatus.data && importStatus.success && (
              <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(importStatus.data).map(([key, value]) => (
                  <div key={key} className="bg-white/50 p-3 rounded-lg border border-emerald-100">
                    <p className="text-xs text-emerald-700 uppercase font-semibold tracking-wider mb-1">{key}</p>
                    <p className="text-xl font-bold text-emerald-900">{String(value)}</p>
                  </div>
                ))}
              </div>
            )}
            {!importStatus.success && (
              <p className="text-rose-700 text-sm mt-1">{importStatus.message}</p>
            )}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
        <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-slate-400" />
          Technical Instructions
        </h3>
        <ul className="text-sm text-slate-600 space-y-2 list-disc ml-4">
          <li>The export file contains multiple sheets, each representing a database table.</li>
          <li>When importing, the system tries to match records by ID or unique codes to avoid simple duplicates.</li>
          <li>For fresh recovery (empty DB), ensure you import the exact file exported earlier.</li>
          <li>Large datasets might take a few seconds to process. Do not close the browser during import.</li>
        </ul>
      </div>
    </div>
  );
}
