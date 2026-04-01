import * as XLSX from "xlsx";

/**
 * Exports data to an Excel file.
 * @param data Array of objects to export.
 * @param fileName Name of the file to save (without extension).
 * @param sheetName Name of the sheet in the Excel file.
 */
export const exportToExcel = (data: any[], fileName: string, sheetName: string = "Data") => {
  if (!data || data.length === 0) {
    console.warn("No data to export");
    return;
  }

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  const timestamp = new Date().toLocaleString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).replace(/[\/\,]/g, '-').replace(/\s/g, '_').replace(/\:/g, '-');
  XLSX.writeFile(wb, `${fileName}_${timestamp}.xlsx`);
};
