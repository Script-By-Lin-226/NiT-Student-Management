import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { AdminEnrollment, AdminPayment } from "@/services/admin.service";
import { PYIDAUNGSU_FONT_BASE64 } from "./fonts/mm-font";

const containsMyanmar = (text: string = "") => /[\u1000-\u109F]/.test(text);

const loadImage = (url: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = url;
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
  });
};

export const generateReceiptPDF = async (
  enrollment: AdminEnrollment,
  payments: AdminPayment[],
  leftAmount: number,
  leftExamGbp: number = 0,
  generatedBy: string = "Admin",
  isFirstPayment: boolean = false
) => {
  const doc = new jsPDF();

  // Register Myanmar Font if we have a real base64
  // A real font file is typically 500KB - 2MB in base64. 
  // We check for a reasonable threshold to prevent crashes from dummy text.
  const hasMyanmarFont = PYIDAUNGSU_FONT_BASE64 && PYIDAUNGSU_FONT_BASE64.length > 10000;
  
  if (hasMyanmarFont) {
    try {
      doc.addFileToVFS("Pyidaungsu.ttf", PYIDAUNGSU_FONT_BASE64);
      doc.addFont("Pyidaungsu.ttf", "Pyidaungsu", "normal");
    } catch (e) {
      console.error("Failed to register Myanmar font:", e);
    }
  }

  const setCorrectFont = (text: string | undefined, size: number = 10, style: string = "normal") => {
    const str = text || "";
    doc.setFontSize(size);
    if (hasMyanmarFont && containsMyanmar(str)) {
      doc.setFont("Pyidaungsu", style);
    } else {
      doc.setFont("helvetica", style);
    }
  };

  let startY = 20;

  try {
    const logo = await loadImage("/icons/reciept.png");
    doc.addImage(logo, "PNG", 100 - 22.5, 10, 55, 55);
    startY = 65;
  } catch (e) {
    console.warn("Could not load logo", e);
  }

  // Header
  setCorrectFont("Networking and Information Technology", 18, "bold");
  doc.text("Networking and Information Technology", 105, startY, { align: "center" });

  setCorrectFont("Payment Receipt", 14, "normal");
  doc.text("Payment Receipt", 105, startY + 8, { align: "center" });

  doc.setLineWidth(0.5);
  doc.line(14, startY + 14, 196, startY + 14);

  let contentY = startY + 24;

  // Student & Course Info
  setCorrectFont("Student Details", 10, "bold");
  doc.text("Student Details", 14, contentY);
  
  const nameLine = `Name: ${enrollment.student_name || "N/A"}`;
  setCorrectFont(nameLine, 10, "normal");
  doc.text(nameLine, 14, contentY + 7);
  
  const codeLine = `Student Code: ${enrollment.student_code || "N/A"}`;
  setCorrectFont(codeLine, 10, "normal");
  doc.text(codeLine, 14, contentY + 14);

  setCorrectFont("Course Details", 10, "bold");
  doc.text("Course Details", 120, contentY);
  
  const cNameLine = `Course Name: ${enrollment.course_name || "N/A"}`;
  setCorrectFont(cNameLine, 10, "normal");
  doc.text(cNameLine, 120, contentY + 7);
  
  const cCodeLine = `Course Code: ${enrollment.course_code || "N/A"}`;
  setCorrectFont(cCodeLine, 10, "normal");
  doc.text(cCodeLine, 120, contentY + 14);

  contentY += 26;

  // Payment Plan Info
  setCorrectFont("Payment Plan Info", 10, "bold");
  doc.text("Payment Plan Info", 14, contentY);
  
  const planName = (enrollment.payment_plan === 'full' || enrollment.payment_plan === 'cash_down') ? 'Cash Down' : (enrollment.payment_plan === 'installment' ? 'Installment' : 'N/A');
  setCorrectFont(`Plan: ${planName}`, 10, "normal");
  doc.text(`Plan: ${planName}`, 14, contentY + 7);
  doc.text(`Course Cost: ${enrollment.course_cost ? enrollment.course_cost.toLocaleString() + ' MMK' : 'N/A'}`, 14, contentY + 14);
  
  if (enrollment.payment_plan === 'installment') {
    doc.text(`Monthly Installment: ${enrollment.installment_amount ? enrollment.installment_amount.toLocaleString() + ' MMK' : '0 MMK'}`, 120, contentY + 7);
  }
  doc.text(`Remaining Balance: ${leftAmount.toLocaleString()} MMK`, 120, contentY + 14);
  if (leftExamGbp > 0) {
    doc.text(`Exam Fee Balance: ${leftExamGbp} GBP`, 120, contentY + 21);
  }

  contentY += 22;

  // Table Data
  const tableData = payments
    .sort((a, b) => new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime())
    .map((p, index) => [
      index + 1,
      new Date(p.payment_date).toLocaleString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      p.month || "N/A",
      (() => { const parts: string[] = []; if (p.payment_method) parts.push(p.payment_method); if (p.amount_2 && p.amount_2 > 0 && p.payment_method_2) parts.push(p.payment_method_2); if (p.exam_fee_payment_method && p.exam_fee_paid_gbp && p.exam_fee_paid_gbp > 0) parts.push(p.exam_fee_payment_method); return parts.length > 0 ? parts.join("\n") : "N/A"; })(),
      p.status || "Completed",
      p.amount_2 && p.amount_2 > 0 ? `${p.amount.toLocaleString()} MMK\n${p.amount_2.toLocaleString()} MMK` : `${(p.amount + (p.amount_2 || 0)).toLocaleString()} MMK`,
      (p.fine_amount && p.fine_amount > 0) ? `${p.fine_amount.toLocaleString()} MMK` : "-",
      (p.extra_items_fee && p.extra_items_fee > 0) ? `${p.extra_items_fee.toLocaleString()} MMK` : "-",
      (p.discount_amount && p.discount_amount > 0) ? `${p.discount_amount.toLocaleString()} MMK` : "-",
      (p.exam_fee_paid_gbp && p.exam_fee_paid_gbp > 0) ? `${p.exam_fee_paid_gbp} GBP (${p.exam_fee_paid_mmk ? p.exam_fee_paid_mmk.toLocaleString() : 0} MMK)` : "-",
    ]);

  // Check if table contains any Myanmar characters
  const tableStr = JSON.stringify(tableData);
  const tableFont = (containsMyanmar(tableStr) && hasMyanmarFont) ? "Pyidaungsu" : "helvetica";

  autoTable(doc, {
    startY: contentY,
    head: [["#", "Date", "Month / For", "Method", "Status", "Amount", "Fine", "Extra", "Discount", "Exam"]],
    body: tableData,
    theme: "striped",
    headStyles: { fillColor: [63, 81, 181] },
    styles: { font: tableFont, fontSize: 8 },
    columnStyles: {
      5: { halign: "right" },
      6: { halign: "right" },
      7: { halign: "right" },
      8: { halign: "right" },
      9: { halign: "right" },
    },
    didParseCell: function(data) {
      if (data.section === 'body' && data.column.index === 6) {
        const val = data.cell.text[0];
        if (val && val !== "-") {
            data.cell.styles.textColor = [220, 38, 38];
            data.cell.styles.fontStyle = 'bold';
        }
      }
    }
  });

  let finalY = (doc as any).lastAutoTable.finalY || contentY + 10;

  // Extra items
  const extraItemsDesc = payments.filter(p => p.extra_items && p.extra_items_fee && p.extra_items_fee > 0).map(p => p.extra_items).join(", ");
  if (extraItemsDesc) {
    setCorrectFont(`* Extra items: ${extraItemsDesc}`, 8, "italic");
    doc.text(`* Extra items: ${extraItemsDesc}`, 14, finalY + 8);
    finalY += 8;
  }

  const fineReasons = payments.filter(p => p.fine_amount && p.fine_amount > 0 && p.fine_reason).map(p => p.fine_reason).join(", ");
  if (fineReasons) {
    doc.setTextColor(220, 38, 38);
    setCorrectFont(`* Fine reason: ${fineReasons}`, 8, "bolditalic");
    doc.text(`* Fine reason: ${fineReasons}`, 14, finalY + 8);
    doc.setTextColor(0, 0, 0);
    finalY += 8;
  }

  if (isFirstPayment && enrollment.foc_items) {
    setCorrectFont(`* Includes complimentary items: ${enrollment.foc_items}`, 10, "italic");
    doc.text(`* Includes complimentary items: ${enrollment.foc_items}`, 14, finalY + 10);
    finalY += 10;
  }

  // Summary
  const totalPaid = payments.reduce((sum, p) => sum + p.amount + (p.amount_2 || 0), 0);
  const totalDiscount = payments.reduce((sum, p) => sum + (p.discount_amount || 0), 0);
  const totalFine = payments.reduce((sum, p) => sum + (p.fine_amount || 0), 0);
  const totalExtra = payments.reduce((sum, p) => sum + (p.extra_items_fee || 0), 0);
  const totalExamMmk = payments.reduce((sum, p) => sum + (p.exam_fee_paid_mmk || 0), 0);
  const grandTotal = totalPaid + totalFine + totalExtra + totalExamMmk;
  
  setCorrectFont(`Tuition Paid: ${totalPaid.toLocaleString()} MMK`, 10, "bold");
  doc.text(`Tuition Paid: ${totalPaid.toLocaleString()} MMK`, 196, finalY + 10, { align: "right" });
  if (totalDiscount > 0) doc.text(`Discount Applied: -${totalDiscount.toLocaleString()} MMK`, 196, finalY + 17, { align: "right" });
  
  let currentSummaryY = finalY + (totalDiscount > 0 ? 17 : 10);
  if (totalFine > 0) {
    currentSummaryY += 7;
    doc.setTextColor(220, 38, 38);
    doc.text(`Fine: ${totalFine.toLocaleString()} MMK`, 196, currentSummaryY, { align: "right" });
    doc.setTextColor(0, 0, 0);
  }
  if (totalExtra > 0) doc.text(`Extra Items: ${totalExtra.toLocaleString()} MMK`, 196, finalY + (totalDiscount > 0 ? 28 : 22), { align: "right" });
  
  let examY = finalY + (totalDiscount > 0 ? 34 : 28);
  if (totalExtra <= 0 && totalFine <= 0) examY = finalY + (totalDiscount > 0 ? 22 : 16);
  else if (totalExtra <= 0 || totalFine <= 0) examY = finalY + (totalDiscount > 0 ? 28 : 22);

  if (totalExamMmk > 0) {
    const totalExamGbp = payments.reduce((sum, p) => sum + (p.exam_fee_paid_gbp || 0), 0);
    doc.text(`Exam Fee Paid: ${totalExamGbp} GBP (${totalExamMmk.toLocaleString()} MMK)`, 196, examY, { align: "right" });
  }
  
  const finalSummaryY = examY + (totalExamMmk > 0 ? 8 : 0);
  doc.text(`Grand Total (Received): ${grandTotal.toLocaleString()} MMK`, 196, finalSummaryY, { align: "right" });

  // Footer
  setCorrectFont("", 8, "normal");
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 280);
  doc.text(`Generated by: ${generatedBy}`, 14, 285);
  doc.text("Signature: ____________________", 175, 280, { align: "center" });

  const filenameSuffix = payments.length === 1 && payments[0].month ? `_${payments[0].month.replace(/\s+/g, "_")}` : "";
  doc.save(`Receipt_${enrollment.student_code}_${(enrollment.course_name || "").replace(/\s+/g, "_")}${filenameSuffix}.pdf`);
};
