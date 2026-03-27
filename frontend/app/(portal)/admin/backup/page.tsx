"use client";

import { useState } from "react";
import { AdminService } from "@/services/admin.service";
import { Database, Download, Upload, AlertTriangle, CheckCircle, RefreshCcw, FileText } from "lucide-react";
import clsx from "clsx";
import { toast } from "sonner";
import ConfirmModal from "@/components/ConfirmModal";

export default function BackupPage() {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isPurging, setIsPurging] = useState(false);
  const [importStatus, setImportStatus] = useState<{ success: boolean; message: string; data?: any } | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const [purgeOpen, setPurgeOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

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
      toast.error("Failed to export backup. Please try again.");
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
    setImportOpen(true);
  };

  const executeImport = async () => {
    if (!selectedFile) return;
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

  const handlePurge = async () => {
    setPurgeOpen(true);
  };

  const executePurge = async () => {
    setIsPurging(true);
    setImportStatus(null);
    try {
      await AdminService.purgeData();
      setImportStatus({
        success: true,
        message: "Database purged successfully. You can now perform a clean import."
      });
    } catch (error: any) {
      console.error("Purge failed:", error);
      setImportStatus({
        success: false,
        message: error.response?.data?.message || "Failed to purge database."
      });
    } finally {
      setIsPurging(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8 pb-20">
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-brand-100 rounded-lg">
            <Database className="w-6 h-6 text-brand-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Database Backup & Recovery</h1>
            <p className="text-slate-500 text-sm font-medium">Manage your system data and disaster recovery</p>
          </div>
        </div>
        
        {importStatus && (
          <button 
            onClick={() => setImportStatus(null)}
            className="text-xs font-bold text-slate-400 hover:text-slate-600 uppercase tracking-widest bg-slate-100 px-3 py-1.5 rounded-lg transition-colors"
          >
            Clear Status
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Export Section */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
              <Download className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-semibold">Step 1: Export</h2>
          </div>
          <p className="text-slate-600 text-sm mb-6 leading-relaxed">
            Download all system data (Users, Courses, Enrollments, Payments, etc.) as an Excel file. 
            <strong> Always export before making major changes.</strong>
          </p>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className={clsx(
              "w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-all focus:ring-4 focus:ring-blue-100",
              isExporting ? "bg-slate-100 text-slate-400 cursor-not-allowed" : "bg-blue-600 text-white hover:bg-blue-700 active:scale-95 shadow-lg shadow-blue-200"
            )}
          >
            {isExporting ? <RefreshCcw className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
            {isExporting ? "Exporting..." : "Download Excel Backup"}
          </button>
        </div>

        {/* Purge Section */}
        <div className="bg-white p-6 rounded-2xl border border-rose-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="absolute top-0 right-0 p-1 bg-rose-50 text-rose-500 rounded-bl-xl">
             <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-rose-50 rounded-lg text-rose-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-semibold">Step 2: Clear (Optional)</h2>
          </div>
          <p className="text-slate-600 text-sm mb-6 leading-relaxed">
            Wipe all current data from the system EXCEPT admin accounts. 
            Use this for a <strong>clean restore</strong> to avoid duplicates.
          </p>
          <button
            onClick={handlePurge}
            disabled={isPurging}
            className={clsx(
              "w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-all focus:ring-4 focus:ring-rose-100",
              isPurging ? "bg-slate-100 text-slate-400 cursor-not-allowed" : "bg-white text-rose-600 border border-rose-200 hover:bg-rose-50 active:scale-95"
            )}
          >
            {isPurging ? <RefreshCcw className="w-5 h-5 animate-spin" /> : <AlertTriangle className="w-5 h-5" />}
            {isPurging ? "Purging..." : "Wipe Database"}
          </button>
        </div>

        {/* Import Section */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
              <Upload className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-semibold">Step 3: Restore</h2>
          </div>
          <p className="text-slate-600 text-sm mb-6 leading-relaxed">
            Upload an exported file to restore data. 
            Matches by ID/Code to update existing records or create new ones.
          </p>
          
          <div className="space-y-4">
            <div className="relative border-2 border-dashed border-slate-200 rounded-xl p-4 text-center hover:border-amber-400 hover:bg-amber-50/10 transition-colors group">
              <input
                type="file"
                accept=".xlsx"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="flex flex-col items-center">
                <Upload className="w-8 h-8 text-slate-400 mb-2 group-hover:text-amber-500 transition-colors" />
                <span className="text-sm font-bold text-slate-600 truncate max-w-full px-2">
                  {selectedFile ? selectedFile.name : "Select .xlsx file"}
                </span>
              </div>
            </div>

            <button
              onClick={handleImport}
              disabled={isImporting || !selectedFile}
              className={clsx(
                "w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-black transition-all focus:ring-4 shadow-lg shadow-amber-100",
                (isImporting || !selectedFile) 
                  ? "bg-slate-100 text-slate-400 cursor-not-allowed shadow-none" 
                  : "bg-amber-600 text-white hover:bg-amber-700 active:scale-95 focus:ring-amber-100"
              )}
            >
              {isImporting ? <RefreshCcw className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
              {isImporting ? "Restoring..." : "Restore from Excel"}
            </button>
          </div>
        </div>
      </div>

      {/* Status Reports */}
      {importStatus && (
        <div className={clsx(
          "p-8 rounded-[2rem] border flex flex-col md:flex-row gap-6 transition-all animate-in fade-in slide-in-from-bottom-6 duration-500 shadow-xl",
          importStatus.success ? "bg-emerald-50 border-emerald-100 shadow-emerald-900/5" : "bg-rose-50 border-rose-100 shadow-rose-900/5"
        )}>
          <div className="flex-shrink-0">
            <div className={clsx(
              "w-12 h-12 rounded-2xl flex items-center justify-center",
              importStatus.success ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"
            )}>
              {importStatus.success ? <CheckCircle className="w-7 h-7" /> : <AlertTriangle className="w-7 h-7" />}
            </div>
          </div>
          <div className="flex-1">
            <h3 className={clsx("text-xl font-black mb-2", importStatus.success ? "text-emerald-900" : "text-rose-900")}>
              {importStatus.message}
            </h3>
            
            {importStatus.data && importStatus.success && (
              <div className="mt-6">
                <p className="text-xs font-black text-emerald-700 uppercase tracking-widest mb-4">Processing Details</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  {Object.entries(importStatus.data).map(([key, value]) => (
                    <div key={key} className="bg-white p-4 rounded-2xl border border-emerald-100/50 shadow-sm hover:scale-105 transition-transform">
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1 truncate">{key}</p>
                      <p className="text-2xl font-black text-slate-800">{String(value)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {!importStatus.success && (
              <div className="mt-4 p-4 bg-white/50 rounded-2xl border border-rose-100">
                <p className="text-rose-700 text-sm font-medium leading-relaxed">{importStatus.message}</p>
              </div>
            )}
          </div>
        </div>
      )}

      
      
      <ConfirmModal 
        open={purgeOpen}
        onClose={() => setPurgeOpen(false)}
        onConfirm={executePurge}
        title="Critical Purge Data"
        message="This action will permanently delete all students, courses, enrollments, and payments from the system. This cannot be undone. Are you absolutely sure?"
        confirmText="Yes, Purge Everything"
        variant="danger"
        isLoading={isPurging}
      />

      <ConfirmModal 
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onConfirm={executeImport}
        title="Restore Data"
        message="Restore data from the selected Excel file? This will merge and update existing records. It is recommended to have a backup first."
        confirmText="Start Restore"
        variant="warning"
        isLoading={isImporting}
      />
    </div>
  );
}
