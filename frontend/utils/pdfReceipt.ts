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

  let hasLogo = false;
  const logoWidth = 70;
  const logoHeight = 70;
  const pageCenter = 105; // 210mm A4 width / 2
  const logoX = pageCenter - (logoWidth / 2); // 80

  try {
    const logo = await loadImage("/icons/reciept.png");
    doc.addImage(logo, "PNG", logoX, 10, logoWidth, logoHeight);
    hasLogo = true;
  } catch (e) {
    console.warn("Could not load logo", e);
  }

  // Get receipt ID from the latest payment
  const sortedPayments = [...payments].sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime());
  const receiptId = sortedPayments[0]?.receipt_id || "N/A";

  // Header text "Payment Receipt" centered under the logo (or top-left if no logo loaded)
  const textY = hasLogo ? (10 + logoHeight + 2) : 24;
  setCorrectFont("Payment Receipt", 10, "bold");
  
  if (hasLogo) {
    doc.text("Payment Receipt", pageCenter, textY, { align: "center" });
  } else {
    doc.text("Payment Receipt", 14, textY);
  }

  // Receipt ID centered under "Payment Receipt"
  const receiptIdY = textY + 5;
  setCorrectFont(`Receipt ID: ${receiptId}`, 8.5, "normal");
  doc.setTextColor(100, 100, 100);
  if (hasLogo) {
    doc.text(`Receipt ID: ${receiptId}`, pageCenter, receiptIdY, { align: "center" });
  } else {
    doc.text(`Receipt ID: ${receiptId}`, 14, receiptIdY);
  }
  doc.setTextColor(0, 0, 0); // Reset color

  const dividerY = hasLogo ? (receiptIdY + 6) : 39;

  doc.setLineWidth(0.4);
  doc.setDrawColor(180, 180, 180);
  doc.line(14, dividerY, 196, dividerY);

  let contentY = dividerY + 6;

  // Student & Course Info (3-column layout)
  const planName = (enrollment.payment_plan === 'full' || enrollment.payment_plan === 'cash_down') ? 'Cash Down' : (enrollment.payment_plan === 'installment' ? 'Installment' : 'N/A');
  
  setCorrectFont(`Name: ${enrollment.student_name || "N/A"}`, 9.5, "normal");
  doc.text(`Name: ${enrollment.student_name || "N/A"}`, 14, contentY);
  
  setCorrectFont(`Course: ${enrollment.course_name || "N/A"}`, 9.5, "normal");
  doc.text(`Course: ${enrollment.course_name || "N/A"}`, 80, contentY);
  
  setCorrectFont(`Course Cost: ${enrollment.course_cost ? enrollment.course_cost.toLocaleString() + ' MMK' : 'N/A'}`, 9.5, "normal");
  doc.text(`Course Cost: ${enrollment.course_cost ? enrollment.course_cost.toLocaleString() + ' MMK' : 'N/A'}`, 145, contentY);

  doc.text(`Student Code: ${enrollment.student_code || "N/A"}`, 14, contentY + 5.5);
  doc.text(`Plan: ${planName}`, 80, contentY + 5.5);
  doc.text(`Remaining Balance: ${leftAmount.toLocaleString()} MMK`, 145, contentY + 5.5);

  let extraHeight = 0;
  if (enrollment.payment_plan === 'installment' || leftExamGbp > 0) {
    extraHeight = 5.5;
    if (enrollment.payment_plan === 'installment') {
      doc.text(`Monthly Inst: ${enrollment.installment_amount ? enrollment.installment_amount.toLocaleString() + ' MMK' : '0 MMK'}`, 80, contentY + 11);
    }
    if (leftExamGbp > 0) {
      doc.text(`Exam Fee Bal: ${leftExamGbp} GBP`, 145, contentY + 11);
    }
  }

  contentY += 8 + extraHeight;

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

  // Dynamically calculate table styling based on number of payments to guarantee 1 page fitting
  const paymentCount = payments.length;
  let tableFontSize = 7.5;
  let tablePadding = 1.8;
  if (paymentCount > 8) {
    tableFontSize = 7.0;
    tablePadding = 1.3;
  }
  if (paymentCount > 15) {
    tableFontSize = 6.5;
    tablePadding = 0.8;
  }

  autoTable(doc, {
    startY: contentY + 3,
    head: [["#", "Date", "Month / For", "Method", "Status", "Amount", "Fine", "Extra", "Discount", "Exam"]],
    body: tableData,
    theme: "striped",
    headStyles: { fillColor: [63, 81, 181] },
    styles: { font: tableFont, fontSize: tableFontSize, cellPadding: tablePadding },
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
    doc.text(`* Extra items: ${extraItemsDesc}`, 14, finalY + 5);
    finalY += 5;
  }

  const fineReasons = payments.filter(p => p.fine_amount && p.fine_amount > 0 && p.fine_reason).map(p => p.fine_reason).join(", ");
  if (fineReasons) {
    doc.setTextColor(220, 38, 38);
    setCorrectFont(`* Fine reason: ${fineReasons}`, 8, "bolditalic");
    doc.text(`* Fine reason: ${fineReasons}`, 14, finalY + 5);
    doc.setTextColor(0, 0, 0);
    finalY += 5;
  }

  if (isFirstPayment && enrollment.foc_items) {
    setCorrectFont(`* Includes complimentary items: ${enrollment.foc_items}`, 10, "italic");
    doc.text(`* Includes complimentary items: ${enrollment.foc_items}`, 14, finalY + 8);
    finalY += 8;
  }

  // Summary
  const totalPaid = payments.reduce((sum, p) => sum + p.amount + (p.amount_2 || 0), 0);
  const totalDiscount = payments.reduce((sum, p) => sum + (p.discount_amount || 0), 0);
  const totalFine = payments.reduce((sum, p) => sum + (p.fine_amount || 0), 0);
  const totalExtra = payments.reduce((sum, p) => sum + (p.extra_items_fee || 0), 0);
  const totalExamMmk = payments.reduce((sum, p) => sum + (p.exam_fee_paid_mmk || 0), 0);
  const grandTotal = totalPaid + totalFine + totalExtra + totalExamMmk;
  
  // Place summary immediately under the payment transaction table
  const summaryBaseY = finalY + 5;

  // Styled Summary Block
  const summaryRows: { label: string; value: string; isBold?: boolean; isRed?: boolean; isGreen?: boolean }[] = [];
  
  summaryRows.push({ label: "Tuition Paid:", value: `${totalPaid.toLocaleString()} MMK`, isBold: true });
  if (totalDiscount > 0) {
    summaryRows.push({ label: "Discount Applied:", value: `-${totalDiscount.toLocaleString()} MMK`, isGreen: true });
  }
  if (totalFine > 0) {
    summaryRows.push({ label: "Fine:", value: `${totalFine.toLocaleString()} MMK`, isRed: true });
  }
  if (totalExtra > 0) {
    summaryRows.push({ label: "Extra Items:", value: `${totalExtra.toLocaleString()} MMK` });
  }
  if (totalExamMmk > 0) {
    const totalExamGbp = payments.reduce((sum, p) => sum + (p.exam_fee_paid_gbp || 0), 0);
    summaryRows.push({ label: "Exam Fee Paid:", value: `${totalExamGbp} GBP (${totalExamMmk.toLocaleString()} MMK)` });
  }

  let currentY = summaryBaseY + 5;

  // Draw top border line for the summary block
  doc.setLineWidth(0.2);
  doc.setDrawColor(220, 220, 220);
  doc.line(125, currentY, 196, currentY);
  currentY += 6;

  for (const row of summaryRows) {
    // Label
    setCorrectFont(row.label, 9, row.isBold ? "bold" : "normal");
    if (row.isRed) doc.setTextColor(220, 38, 38);
    else if (row.isGreen) doc.setTextColor(16, 124, 65); // Green for discount
    else doc.setTextColor(80, 80, 80);
    doc.text(row.label, 125, currentY);

    // Value
    setCorrectFont(row.value, 9, row.isBold ? "bold" : "normal");
    doc.text(row.value, 196, currentY, { align: "right" });

    // Reset colors
    doc.setTextColor(0, 0, 0);
    currentY += 5.5;
  }

  // Draw divider before Grand Total
  doc.setLineWidth(0.4);
  doc.setDrawColor(180, 180, 180);
  doc.line(125, currentY - 1, 196, currentY - 1);
  currentY += 6;

  // Grand Total Row
  setCorrectFont("Grand Total (Received):", 10, "bold");
  doc.setTextColor(63, 81, 181); // Indigo theme color
  doc.text("Grand Total (Received):", 125, currentY);

  setCorrectFont(`${grandTotal.toLocaleString()} MMK`, 10, "bold");
  doc.text(`${grandTotal.toLocaleString()} MMK`, 196, currentY, { align: "right" });
  doc.setTextColor(0, 0, 0);

  const summaryEndY = currentY;

  // Position signature block and contact info dynamically at the bottom of the page
  const footerBaseY = Math.max(summaryEndY + 12, 235);

  // Left Side: Signature & Generation details
  setCorrectFont("Signature: ____________________", 9, "bold");
  doc.text("Signature: ____________________", 14, footerBaseY);

  setCorrectFont("", 8, "normal");
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, footerBaseY + 6);
  doc.text(`Generated by: ${generatedBy}`, 14, footerBaseY + 11);

  // Divider line above contact info
  doc.setLineWidth(0.3);
  doc.setDrawColor(200, 200, 200);
  doc.line(14, footerBaseY + 18, 196, footerBaseY + 18);

  // Address and Contact Info (Single Line)
  const contactText = "No.31, Thiri Mingalar 5 Str, Kamaryut   |   info@nit.com.mm   |   www.nit.com.mm   |   09780778797, 09779620605";
  setCorrectFont(contactText, 8, "normal");
  doc.text(contactText, 105, footerBaseY + 24, { align: "center" });

  const filenameSuffix = payments.length === 1 && payments[0].month ? `_${payments[0].month.replace(/\s+/g, "_")}` : "";
  doc.save(`Receipt_${enrollment.student_code}_${(enrollment.course_name || "").replace(/\s+/g, "_")}${filenameSuffix}.pdf`);
};
