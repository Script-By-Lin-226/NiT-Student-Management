import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { AdminEnrollment, AdminPayment } from "@/services/admin.service";
import { PYIDAUNGSU_FONT_BASE64 } from "./fonts/mm-font";
import { parseExtraItems } from "./format";

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
  isFirstPayment: boolean = false,
  pageSize: "a4" | "a5" = "a4"
) => {
  const doc = new jsPDF({ format: pageSize, orientation: "p" });

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

  const isA5 = pageSize === "a5";
  const margin = isA5 ? 10 : 14;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageCenter = pageWidth / 2;

  let hasLogo = false;
  const logoWidth = isA5 ? 45 : 70;
  const logoHeight = isA5 ? 45 : 70;
  const logoX = pageCenter - (logoWidth / 2); // 80
  const logoY = isA5 ? 5 : 10;

  let logoImg: any = null;
  try {
    logoImg = await loadImage("/icons/reciept.png");
    hasLogo = true;
  } catch (e) {
    console.warn("Could not load logo", e);
  }

  // Draw background watermark logo
  if (logoImg) {
    try {
      doc.saveGraphicsState();
      const gState = new (doc as any).GState({ opacity: 0.06 });
      doc.setGState(gState);
      const watermarkSize = isA5 ? 90 : 140;
      doc.addImage(logoImg, "PNG", pageCenter - (watermarkSize / 2), (pageHeight / 2) - (watermarkSize / 2), watermarkSize, watermarkSize);
      doc.restoreGraphicsState();
    } catch (err) {
      console.warn("Could not add watermark:", err);
    }
  }

  if (hasLogo && logoImg) {
    doc.addImage(logoImg, "PNG", logoX, logoY, logoWidth, logoHeight);
  }

  // Get receipt ID from the latest payment
  const sortedPayments = [...payments].sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime());
  const receiptId = sortedPayments[0]?.receipt_id || "N/A";

  // Header text "Payment Receipt" centered under the logo (or top-left if no logo loaded)
  const textY = hasLogo ? (logoY + logoHeight + (isA5 ? 1 : 2)) : (isA5 ? 15 : 24);
  setCorrectFont("Payment Receipt", isA5 ? 9.5 : 10, "bold");
  
  if (hasLogo) {
    doc.text("Payment Receipt", pageCenter, textY, { align: "center" });
  } else {
    doc.text("Payment Receipt", margin, textY);
  }

  // Receipt ID centered under "Payment Receipt"
  const receiptIdY = textY + (isA5 ? 4.5 : 5);
  setCorrectFont(`Receipt ID: ${receiptId}`, isA5 ? 7.5 : 8.5, "normal");
  doc.setTextColor(100, 100, 100);
  if (hasLogo) {
    doc.text(`Receipt ID: ${receiptId}`, pageCenter, receiptIdY, { align: "center" });
  } else {
    doc.text(`Receipt ID: ${receiptId}`, margin, receiptIdY);
  }
  doc.setTextColor(0, 0, 0); // Reset color

  const dividerY = hasLogo ? (receiptIdY + (isA5 ? 4 : 6)) : (isA5 ? 28 : 39);

  doc.setLineWidth(0.4);
  doc.setDrawColor(180, 180, 180);
  doc.line(margin, dividerY, pageWidth - margin, dividerY);

  let contentY = dividerY + (isA5 ? 4 : 6);

  // Student & Course Info (Dynamic Layout based on Page Size)
  const planName = (enrollment.payment_plan === 'full' || enrollment.payment_plan === 'cash_down') ? 'Cash Down' : (enrollment.payment_plan === 'installment' ? 'Installment' : 'N/A');
  
  if (isA5) {
    const col1X = margin;
    const col2X = pageCenter + 5;
    const infoFontSize = 8.5;
    const lineSpacing = 4.5;
    
    setCorrectFont(`Name: ${enrollment.student_name || "N/A"}`, infoFontSize, "normal");
    doc.text(`Name: ${enrollment.student_name || "N/A"}`, col1X, contentY);
    
    setCorrectFont(`Course: ${enrollment.course_name || "N/A"}`, infoFontSize, "normal");
    doc.text(`Course: ${enrollment.course_name || "N/A"}`, col2X, contentY);
    
    setCorrectFont(`Student Code: ${enrollment.student_code || "N/A"}`, infoFontSize, "normal");
    doc.text(`Student Code: ${enrollment.student_code || "N/A"}`, col1X, contentY + lineSpacing);
    
    setCorrectFont(`Course Cost: ${enrollment.course_cost ? enrollment.course_cost.toLocaleString() + ' MMK' : 'N/A'}`, infoFontSize, "normal");
    doc.text(`Course Cost: ${enrollment.course_cost ? enrollment.course_cost.toLocaleString() + ' MMK' : 'N/A'}`, col2X, contentY + lineSpacing);
    
    setCorrectFont(`Plan: ${planName}`, infoFontSize, "normal");
    doc.text(`Plan: ${planName}`, col1X, contentY + lineSpacing * 2);
    
    setCorrectFont(`Remaining Balance: ${leftAmount.toLocaleString()} MMK`, infoFontSize, "normal");
    doc.text(`Remaining Balance: ${leftAmount.toLocaleString()} MMK`, col2X, contentY + lineSpacing * 2);
    
    let extraHeight = 0;
    if (enrollment.payment_plan === 'installment' || leftExamGbp > 0) {
      extraHeight = lineSpacing;
      if (enrollment.payment_plan === 'installment') {
        setCorrectFont(`Monthly Inst: ${enrollment.installment_amount ? enrollment.installment_amount.toLocaleString() + ' MMK' : '0 MMK'}`, infoFontSize, "normal");
        doc.text(`Monthly Inst: ${enrollment.installment_amount ? enrollment.installment_amount.toLocaleString() + ' MMK' : '0 MMK'}`, col1X, contentY + lineSpacing * 3);
      }
      if (leftExamGbp > 0) {
        setCorrectFont(`Exam Fee Bal: ${leftExamGbp} GBP`, infoFontSize, "normal");
        doc.text(`Exam Fee Bal: ${leftExamGbp} GBP`, col2X, contentY + lineSpacing * 3);
      }
    }
    contentY += lineSpacing * 3 + extraHeight;
  } else {
    const col1X = 14;
    const col2X = 80;
    const col3X = 145;
    const infoFontSize = 9.5;
    
    setCorrectFont(`Name: ${enrollment.student_name || "N/A"}`, infoFontSize, "normal");
    doc.text(`Name: ${enrollment.student_name || "N/A"}`, col1X, contentY);
    
    setCorrectFont(`Course: ${enrollment.course_name || "N/A"}`, infoFontSize, "normal");
    doc.text(`Course: ${enrollment.course_name || "N/A"}`, col2X, contentY);
    
    setCorrectFont(`Course Cost: ${enrollment.course_cost ? enrollment.course_cost.toLocaleString() + ' MMK' : 'N/A'}`, infoFontSize, "normal");
    doc.text(`Course Cost: ${enrollment.course_cost ? enrollment.course_cost.toLocaleString() + ' MMK' : 'N/A'}`, col3X, contentY);

    setCorrectFont(`Student Code: ${enrollment.student_code || "N/A"}`, infoFontSize, "normal");
    doc.text(`Student Code: ${enrollment.student_code || "N/A"}`, col1X, contentY + 5.5);
    
    setCorrectFont(`Plan: ${planName}`, infoFontSize, "normal");
    doc.text(`Plan: ${planName}`, col2X, contentY + 5.5);
    
    setCorrectFont(`Remaining Balance: ${leftAmount.toLocaleString()} MMK`, infoFontSize, "normal");
    doc.text(`Remaining Balance: ${leftAmount.toLocaleString()} MMK`, col3X, contentY + 5.5);

    let extraHeight = 0;
    if (enrollment.payment_plan === 'installment' || leftExamGbp > 0) {
      extraHeight = 5.5;
      if (enrollment.payment_plan === 'installment') {
        doc.text(`Monthly Inst: ${enrollment.installment_amount ? enrollment.installment_amount.toLocaleString() + ' MMK' : '0 MMK'}`, col2X, contentY + 11);
      }
      if (leftExamGbp > 0) {
        doc.text(`Exam Fee Bal: ${leftExamGbp} GBP`, col3X, contentY + 11);
      }
    }
    contentY += 8 + extraHeight;
  }

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
      (() => { 
        const parts: string[] = []; 
        if (p.payment_method) parts.push(p.payment_method); 
        if (p.amount_2 && p.amount_2 > 0 && p.payment_method_2) parts.push(p.payment_method_2); 
        if (p.exam_fee_payment_method && p.exam_fee_paid_gbp && p.exam_fee_paid_gbp > 0) parts.push(p.exam_fee_payment_method); 
        // We do NOT add extra_items_payment_method here since it is now shown in the Extra column!
        return parts.length > 0 ? parts.join("\n") : "N/A"; 
      })(),
      p.status || "Completed",
      p.amount_2 && p.amount_2 > 0 ? `${p.amount.toLocaleString()} MMK\n${p.amount_2.toLocaleString()} MMK` : `${(p.amount + (p.amount_2 || 0)).toLocaleString()} MMK`,
      (p.fine_amount && p.fine_amount > 0) ? `${p.fine_amount.toLocaleString()} MMK` : "-",
      (() => {
        if (p.extra_items_fee && p.extra_items_fee > 0) {
          const amtStr = `${p.extra_items_fee.toLocaleString()} MMK`;
          return p.extra_items_payment_method ? `${amtStr}\n(${p.extra_items_payment_method})` : amtStr;
        }
        return "-";
      })(),
      (p.discount_amount && p.discount_amount > 0) ? `${p.discount_amount.toLocaleString()} MMK` : "-",
      (p.exam_fee_paid_gbp && p.exam_fee_paid_gbp > 0) ? `${p.exam_fee_paid_gbp} GBP (${p.exam_fee_paid_mmk ? p.exam_fee_paid_mmk.toLocaleString() : 0} MMK)` : "-",
    ]);

  // Check if table contains any Myanmar characters
  const tableStr = JSON.stringify(tableData);
  const tableFont = (containsMyanmar(tableStr) && hasMyanmarFont) ? "Pyidaungsu" : "helvetica";

  // Dynamically calculate table styling based on number of payments to guarantee 1 page fitting
  const paymentCount = payments.length;
  let tableFontSize = isA5 ? 6.5 : 7.5;
  let tablePadding = isA5 ? 1.2 : 1.8;
  if (paymentCount > 8) {
    tableFontSize = isA5 ? 5.8 : 7.0;
    tablePadding = isA5 ? 0.9 : 1.3;
  }
  if (paymentCount > 15) {
    tableFontSize = isA5 ? 5.2 : 6.5;
    tablePadding = isA5 ? 0.6 : 0.8;
  }

  autoTable(doc, {
    startY: contentY + 3,
    margin: { left: margin, right: margin },
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
  const extraItemsDesc = payments
    .filter(p => p.extra_items && p.extra_items_fee && p.extra_items_fee > 0)
    .map(p => {
      const desc = parseExtraItems(p.extra_items);
      return p.extra_items_payment_method ? `${desc} (${p.extra_items_payment_method})` : desc;
    })
    .join(", ");

  if (extraItemsDesc) {
    setCorrectFont(`* Extra items: ${extraItemsDesc}`, isA5 ? 7 : 8, "italic");
    doc.text(`* Extra items: ${extraItemsDesc}`, margin, finalY + (isA5 ? 4 : 5));
    finalY += isA5 ? 4 : 5;
  }

  const fineReasons = payments.filter(p => p.fine_amount && p.fine_amount > 0 && p.fine_reason).map(p => p.fine_reason).join(", ");
  if (fineReasons) {
    doc.setTextColor(220, 38, 38);
    setCorrectFont(`* Fine reason: ${fineReasons}`, isA5 ? 7 : 8, "bolditalic");
    doc.text(`* Fine reason: ${fineReasons}`, margin, finalY + (isA5 ? 4 : 5));
    doc.setTextColor(0, 0, 0);
    finalY += isA5 ? 4 : 5;
  }

  if (isFirstPayment && enrollment.foc_items) {
    setCorrectFont(`* Includes complimentary items: ${enrollment.foc_items}`, isA5 ? 8.5 : 10, "italic");
    doc.text(`* Includes complimentary items: ${enrollment.foc_items}`, margin, finalY + (isA5 ? 6 : 8));
    finalY += isA5 ? 6 : 8;
  }

  // Summary
  const totalPaid = payments.reduce((sum, p) => sum + p.amount + (p.amount_2 || 0), 0);
  const totalDiscount = payments.reduce((sum, p) => sum + (p.discount_amount || 0), 0);
  const totalFine = payments.reduce((sum, p) => sum + (p.fine_amount || 0), 0);
  const totalExtra = payments.reduce((sum, p) => sum + (p.extra_items_fee || 0), 0);
  const totalExamMmk = payments.reduce((sum, p) => sum + (p.exam_fee_paid_mmk || 0), 0);
  const grandTotal = totalPaid + totalFine + totalExtra + totalExamMmk;
  
  const summaryBaseY = finalY + (isA5 ? 3 : 5);

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

  const summaryStartX = pageWidth - (isA5 ? 60 : 75);
  const summaryEndX = pageWidth - margin;
  let currentY = summaryBaseY + (isA5 ? 3 : 5);

  // Draw top border line for the summary block
  doc.setLineWidth(0.2);
  doc.setDrawColor(220, 220, 220);
  doc.line(summaryStartX, currentY, summaryEndX, currentY);
  currentY += isA5 ? 4 : 6;

  for (const row of summaryRows) {
    // Label
    setCorrectFont(row.label, isA5 ? 8 : 9, row.isBold ? "bold" : "normal");
    if (row.isRed) doc.setTextColor(220, 38, 38);
    else if (row.isGreen) doc.setTextColor(16, 124, 65); // Green for discount
    else doc.setTextColor(80, 80, 80);
    doc.text(row.label, summaryStartX, currentY);

    // Value
    setCorrectFont(row.value, isA5 ? 8 : 9, row.isBold ? "bold" : "normal");
    doc.text(row.value, summaryEndX, currentY, { align: "right" });

    // Reset colors
    doc.setTextColor(0, 0, 0);
    currentY += isA5 ? 4.5 : 5.5;
  }

  // Draw divider before Grand Total
  doc.setLineWidth(0.4);
  doc.setDrawColor(180, 180, 180);
  doc.line(summaryStartX, currentY - 1, summaryEndX, currentY - 1);
  currentY += isA5 ? 4.5 : 6;

  // Grand Total Row
  setCorrectFont("Grand Total (Received):", isA5 ? 7.5 : 10, "bold");
  doc.setTextColor(63, 81, 181); // Indigo theme color
  doc.text("Grand Total (Received):", summaryStartX, currentY);

  setCorrectFont(`${grandTotal.toLocaleString()} MMK`, isA5 ? 8.5 : 10, "bold");
  doc.text(`${grandTotal.toLocaleString()} MMK`, summaryEndX, currentY, { align: "right" });
  doc.setTextColor(0, 0, 0);

  const summaryEndY = currentY;

  // Position signature block and contact info dynamically at the bottom of the page
  const footerBaseY = Math.max(summaryEndY + (isA5 ? 8 : 12), pageHeight - (isA5 ? 40 : 62));

  // Left Side: Signature & Generation details
  if (enrollment.signature) {
    try {
      const sigWidth = isA5 ? 30 : 40;
      const sigHeight = isA5 ? 10 : 14;
      doc.addImage(enrollment.signature, "PNG", margin + (isA5 ? 14 : 20), footerBaseY - (isA5 ? 8 : 12), sigWidth, sigHeight);
    } catch (err) {
      console.warn("Could not draw student signature on PDF:", err);
    }
  }

  setCorrectFont("Signature: ____________________", isA5 ? 8 : 9, "bold");
  doc.text("Signature: ____________________", margin, footerBaseY);

  setCorrectFont("", isA5 ? 7 : 8, "normal");
  doc.text(`Generated on: ${new Date().toLocaleString()}`, margin, footerBaseY + (isA5 ? 4 : 6));
  doc.text(`Generated by: ${generatedBy}`, margin, footerBaseY + (isA5 ? 8 : 11));

  // Divider line above contact info
  doc.setLineWidth(0.3);
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, footerBaseY + (isA5 ? 11 : 15), pageWidth - margin, footerBaseY + (isA5 ? 11 : 15));

  // Address and Contact Info (Single Line)
  const contactText = isA5
    ? "No.31, Thiri Mingalar 5 Str, Kamaryut  |  info@nit.com.mm  |  09780778797"
    : "No.31, Thiri Mingalar 5 Str, Kamaryut   |   info@nit.com.mm   |   www.nit.com.mm   |   09780778797, 09779620605";
  setCorrectFont(contactText, isA5 ? 6.5 : 8, "normal");
  doc.text(contactText, pageCenter, footerBaseY + (isA5 ? 15 : 20), { align: "center" });

  // Refund policy warning highlighted in red under the contact information
  doc.setTextColor(220, 38, 38);
  setCorrectFont("No Refund!", isA5 ? 8 : 9, "bold");
  doc.text("No Refund!", pageCenter, footerBaseY + (isA5 ? 20 : 26), { align: "center" });
  doc.setTextColor(0, 0, 0);

  const filenameSuffix = payments.length === 1 && payments[0].month ? `_${payments[0].month.replace(/\s+/g, "_")}` : "";
  doc.save(`Receipt_${enrollment.student_code}_${(enrollment.course_name || "").replace(/\s+/g, "_")}${filenameSuffix}.pdf`);
};
