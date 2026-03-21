import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { AdminEnrollment, AdminPayment } from "@/services/admin.service";

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
  generatedBy: string = "Admin",
  isFirstPayment: boolean = false
) => {
  const doc = new jsPDF();

  let startY = 20;

  try {
    const logo = await loadImage("/icons/logo_png.png");
    // Draw the logo centered. Make it a bit bigger: 45x45
    doc.addImage(logo, "PNG", 105 - 22.5, 10, 45, 45);
    startY = 65; // move text down if logo is present
  } catch (e) {
    console.warn("Could not load logo", e);
  }

  // Header
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Networking and Information Technology", 105, startY, { align: "center" });

  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  doc.text("Payment Receipt", 105, startY + 8, { align: "center" });

  doc.setLineWidth(0.5);
  doc.line(14, startY + 14, 196, startY + 14);

  let contentY = startY + 24;

  // Student & Course Info
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Student Details", 14, contentY);
  doc.setFont("helvetica", "normal");
  doc.text(`Name: ${enrollment.student_name || "N/A"}`, 14, contentY + 7);
  doc.text(`Student Code: ${enrollment.student_code || "N/A"}`, 14, contentY + 14);

  doc.setFont("helvetica", "bold");
  doc.text("Course Details", 120, contentY);
  doc.setFont("helvetica", "normal");
  doc.text(`Course Name: ${enrollment.course_name || "N/A"}`, 120, contentY + 7);
  doc.text(`Course Code: ${enrollment.course_code || "N/A"}`, 120, contentY + 14);

  contentY += 26;

  // Payment Plan Info
  doc.setFont("helvetica", "bold");
  doc.text("Payment Plan Info", 14, contentY);
  doc.setFont("helvetica", "normal");
  const planName = enrollment.payment_plan === 'full' ? 'Full Payment' : (enrollment.payment_plan === 'installment' ? 'Installment' : 'N/A');
  doc.text(`Plan: ${planName}`, 14, contentY + 7);
  doc.text(`Course Cost: ${enrollment.course_cost ? enrollment.course_cost.toLocaleString() + ' MMK' : 'N/A'}`, 14, contentY + 14);
  if (enrollment.payment_plan === 'installment') {
    doc.text(`Monthly Installment: ${enrollment.installment_amount ? enrollment.installment_amount.toLocaleString() + ' MMK' : '0 MMK'}`, 120, contentY + 7);
  }
  doc.text(`Remaining Balance: ${leftAmount.toLocaleString()} MMK`, 120, contentY + 14);

  contentY += 22;

  // Table Data
  const tableData = payments
    .sort((a, b) => new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime())
    .map((p, index) => [
      index + 1,
      new Date(p.payment_date).toLocaleDateString(),
      p.month || "N/A",
      p.payment_method || "N/A",
      p.status || "Completed",
      `${p.amount.toLocaleString()} MMK`,
      (p.fine_amount && p.fine_amount > 0) ? `${p.fine_amount.toLocaleString()} MMK` : "-",
      (p.extra_items_fee && p.extra_items_fee > 0) ? `${p.extra_items_fee.toLocaleString()} MMK` : "-",
      (p.exam_fee_paid_gbp && p.exam_fee_paid_gbp > 0) ? `${p.exam_fee_paid_gbp} GBP (${p.exam_fee_paid_mmk ? p.exam_fee_paid_mmk.toLocaleString() : 0} MMK)` : "-",
    ]);

  autoTable(doc, {
    startY: contentY,
    head: [["#", "Date", "Month / For", "Method", "Status", "Amount", "Fine", "Extra", "Exam"]],
    body: tableData,
    theme: "striped",
    headStyles: { fillColor: [63, 81, 181] },
    styles: { font: "helvetica", fontSize: 8 },
    columnStyles: {
      5: { halign: "right" },
      6: { halign: "right" },
      7: { halign: "right" },
      8: { halign: "right" },
    }
  });

  let finalY = (doc as any).lastAutoTable.finalY || contentY + 10;

  // Show extra items description if present
  const extraItemsDesc = payments.filter(p => p.extra_items && p.extra_items_fee && p.extra_items_fee > 0).map(p => p.extra_items).join(", ");
  if (extraItemsDesc) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.text(`* Extra items: ${extraItemsDesc}`, 14, finalY + 8);
    finalY += 8;
  }

  if (isFirstPayment && enrollment.foc_items) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(10);
    doc.text(`* Includes complimentary items: ${enrollment.foc_items}`, 14, finalY + 10);
    finalY += 10;
  }

  // Summary
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const totalFine = payments.reduce((sum, p) => sum + (p.fine_amount || 0), 0);
  const totalExtra = payments.reduce((sum, p) => sum + (p.extra_items_fee || 0), 0);
  const totalExamMmk = payments.reduce((sum, p) => sum + (p.exam_fee_paid_mmk || 0), 0);
  const grandTotal = totalPaid + totalFine + totalExtra + totalExamMmk;
  
  doc.setFont("helvetica", "bold");
  doc.text(`Tuition Paid: ${totalPaid.toLocaleString()} MMK`, 196, finalY + 10, { align: "right" });
  if (totalFine > 0) doc.text(`Fine: ${totalFine.toLocaleString()} MMK`, 196, finalY + 16, { align: "right" });
  if (totalExtra > 0) doc.text(`Extra Items: ${totalExtra.toLocaleString()} MMK`, 196, finalY + 22, { align: "right" });
  if (totalExamMmk > 0) {
    const totalExamGbp = payments.reduce((sum, p) => sum + (p.exam_fee_paid_gbp || 0), 0);
    doc.text(`Exam Fee Paid: ${totalExamGbp} GBP (${totalExamMmk.toLocaleString()} MMK)`, 196, finalY + 28, { align: "right" });
  }
  doc.text(`Grand Total (Received): ${grandTotal.toLocaleString()} MMK`, 196, finalY + (totalFine > 0 || totalExtra > 0 || totalExamMmk > 0 ? 36 : 16), { align: "right" });

  // Footer
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 280);
  doc.text(`Generated by: ${generatedBy}`, 14, 285);
  doc.text("This is a computer-generated receipt, no signature is required.", 105, 280, { align: "center" });

  // Download PDF
  const filenameSuffix = payments.length === 1 && payments[0].month ? `_${payments[0].month.replace(/\s+/g, "_")}` : "";
  doc.save(`Receipt_${enrollment.student_code}_${(enrollment.course_name || "").replace(/\s+/g, "_")}${filenameSuffix}.pdf`);
};
