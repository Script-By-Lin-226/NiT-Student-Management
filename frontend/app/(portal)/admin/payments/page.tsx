"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Search, Plus, CreditCard, History, X, Download, AlertCircle, Receipt, Edit, Trash2 } from "lucide-react";
import { exportToExcel } from "@/utils/excelExport";
import { toast } from "sonner";

import { AdminService, AdminEnrollment, AdminPayment, AdminPaymentCreate } from "@/services/admin.service";
import { useAuth } from "@/hooks/useAuth";
import { generateReceiptPDF } from "@/utils/pdfReceipt";
import { formatAmount } from "@/utils/format";
import { useEnrollments, useCourses, useCreatePayment } from "@/hooks/useAdmin";
import { Pagination } from "@/components/ui/Pagination";

function Modal({ title, open, onClose, children }: { title: string; open: boolean; onClose: () => void; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        <div className="flex flex-col max-h-[90vh] overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h3 className="text-lg font-bold text-slate-800 tracking-tight">{title}</h3>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-slate-50 text-slate-500"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-5 overflow-y-auto custom-scrollbar">{children}</div>
        </div>
      </div>
    </div>
  );
}

export default function AdminPaymentsPage() {
  const router = useRouter();
  const { isAdminOrSales, loading, user } = useAuth();

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);

  const { data: enrollmentsResponse, isLoading: enrollmentsLoading, refetch: reload } = useEnrollments(undefined, page, limit);
  const rawEnrollments = enrollmentsResponse?.data || [];
  const pagination = enrollmentsResponse?.pagination;

  const { data: coursesResponse } = useCourses(1, 1000);
  const courses = coursesResponse?.data || [];

  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>("");
  const [q, setQ] = useState("");

  const createPaymentMutation = useCreatePayment();

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [selectedEnrollment, setSelectedEnrollment] = useState<AdminEnrollment | null>(null);
  const [editingPayment, setEditingPayment] = useState<AdminPayment | null>(null);

  // New Payment Form
  const [pAmount, setPAmount] = useState<number | "">(0);
  const [pFine, setPFine] = useState<number | "">(0);
  const [pFineReason, setPFineReason] = useState("");
  const [pExtraFee, setPExtraFee] = useState<number | "">(0);
  const [pExtraItems, setPExtraItems] = useState("");
  const [pDiscountAmount, setPDiscountAmount] = useState<number | "">(0);
  const [pExamFeePaidGbp, setPExamFeePaidGbp] = useState<number | "">(0);
  const [pExamFeePaidMmk, setPExamFeePaidMmk] = useState<number | "">(0);
  const [pExchangeRate, setPExchangeRate] = useState<number | "">(0);
  const [pExamFeeCurrency, setPExamFeeCurrency] = useState("MMK");
  const [pMonth, setPMonth] = useState("");
  const [pYear, setPYear] = useState("");
  const [pMethod, setPMethod] = useState("");
  const [pAmount2, setPAmount2] = useState<number | "">(0);
  const [pMethod2, setPMethod2] = useState("");
  const [pDate, setPDate] = useState("");

  const calculateLeftAmount = (enr: AdminEnrollment) => {
    return enr.balance_due || 0;
  };

  const calculateLeftExamFeeGbp = (enr: AdminEnrollment) => {
    return enr.exam_fee_pending_gbp || 0;
  };

  const displayedEnrollments = rawEnrollments.filter((e) => {
    if (!q) return true;
    const s = q.toLowerCase();
    return (
      e.student_name?.toLowerCase().includes(s) ||
      e.student_code?.toLowerCase().includes(s) ||
      e.course_code?.toLowerCase().includes(s) ||
      e.course_name?.toLowerCase().includes(s)
    );
  });

  const load = async () => {
    reload();
  };

  useEffect(() => {
    if (isAdminOrSales) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdminOrSales]);

  const openRecordPayment = (enr: AdminEnrollment) => {
    setSelectedEnrollment(enr);
    setPAmount(0);

    // auto select current month and year setup
    const d = new Date();
    if (enr.payment_plan === 'full' || enr.payment_plan === 'cash_down') {
      setPMonth('Cash Down');
    } else {
      setPMonth(d.toLocaleString('default', { month: 'long' }));
    }
    setPYear(d.getFullYear().toString());
    setPMethod("");
    setPFine(0);
    setPFineReason("");
    setPExtraFee(0);
    setPExtraItems("");
    setPDiscountAmount(0);
    setPExamFeePaidGbp(0);
    setPExamFeePaidMmk(0);
    setPExchangeRate(0);
    setPExamFeeCurrency("MMK");
    setPAmount2(0);
    setPMethod2("");

    const now = new Date();
    const localNow = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setPDate(localNow);

    setPaymentModalOpen(true);
  };

  const openEditPayment = (pay: AdminPayment) => {
    // Find matching enrollment
    const enr = rawEnrollments.find(e => e.enrollment_id === pay.enrollment_id);
    if (!enr) {
      toast.error("Related enrollment not found in current list.");
      return;
    }
    
    setEditingPayment(pay);
    setSelectedEnrollment(enr);
    
    setPAmount(pay.amount);
    setPAmount2(pay.amount_2 || 0);
    setPMethod(pay.payment_method || "");
    setPMethod2(pay.payment_method_2 || "");
    
    setPFine(pay.fine_amount || 0);
    setPFineReason(pay.fine_reason || "");
    setPExtraFee(pay.extra_items_fee || 0);
    setPExtraItems(pay.extra_items || "");
    setPDiscountAmount(pay.discount_amount || 0);
    
    setPExamFeePaidGbp(pay.exam_fee_paid_gbp || 0);
    setPExamFeePaidMmk(pay.exam_fee_paid_mmk || 0);
    setPExamFeeCurrency(pay.exam_fee_currency || "MMK");

    // Split month/year
    const parts = pay.month.split(' ');
    if (parts.length >= 2) {
       setPMonth(parts.slice(0, -1).join(' '));
       setPYear(parts[parts.length - 1]);
    } else {
       setPMonth(pay.month);
       setPYear(new Date().getFullYear().toString());
    }

    if (pay.payment_date) {
      const d = new Date(pay.payment_date);
      const localStr = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      setPDate(localStr);
    } else {
      setPDate("");
    }

    setPaymentModalOpen(true);
  };

  const submitPayment = async () => {
    if (!selectedEnrollment) return;

    const totalAmount = (Number(pAmount) || 0) + (Number(pAmount2) || 0);
    const totalFine = Number(pFine) || 0;
    const totalExtra = Number(pExtraFee) || 0;
    const totalExamMMK = Number(pExamFeePaidMmk) || 0;
    const totalDiscount = Number(pDiscountAmount) || 0;

    if (totalAmount <= 0 && totalFine <= 0 && totalExtra <= 0 && totalExamMMK <= 0) {
      toast.error("Total transaction value must be greater than 0.");
      return;
    }

    // Check for negative values
    if (Number(pAmount) < 0 || Number(pAmount2) < 0 || totalFine < 0 || totalExtra < 0 || totalDiscount < 0 || Number(pExamFeePaidGbp) < 0) {
      toast.error("Negative values are not allowed in any field.");
      return;
    }

    const left = calculateLeftAmount(selectedEnrollment);
    const balanceToCheck = editingPayment ? (left + (editingPayment.amount + (editingPayment.amount_2 || 0)) + (editingPayment.discount_amount || 0)) : left;

    if ((totalAmount + totalDiscount) > balanceToCheck + 0.1) {
      toast.error(`Total Payment + Discount (${(totalAmount + totalDiscount).toLocaleString()} MMK) cannot exceed remaining balance (${balanceToCheck.toLocaleString()} MMK)`);
      return;
    }

    const leftGbp = calculateLeftExamFeeGbp(selectedEnrollment);
    const gbpToCheck = editingPayment ? (leftGbp + (editingPayment.exam_fee_paid_gbp || 0)) : leftGbp;
    if ((Number(pExamFeePaidGbp) || 0) > gbpToCheck + 0.001) {
      toast.error(`Exam fee payment (${pExamFeePaidGbp} GBP) cannot exceed remaining balance (${gbpToCheck} GBP)`);
      return;
    }

    if (!pMonth || !pYear) {
      toast.error("Please select a month and year for the payment.");
      return;
    }
    if ((Number(pAmount) > 0) && !pMethod) {
      toast.error("Please select a primary payment method.");
      return;
    }
    if (pMethod && (Number(pAmount) <= 0)) {
      toast.error("Primary amount must be greater than 0 if a method is selected.");
      return;
    }

    if ((Number(pAmount2) > 0) && !pMethod2) {
      toast.error("Please select a secondary payment method.");
      return;
    }
    if (pMethod2 && (Number(pAmount2) <= 0)) {
      toast.error("Secondary payment amount must be greater than 0.");
      return;
    }

    setBusy(true);
    try {
      const payload: AdminPaymentCreate = {
        enrollment_id: selectedEnrollment.enrollment_id,
        amount: Number(pAmount) || 0,
        amount_2: Number(pAmount2) || 0,
        payment_method_2: pMethod2 || undefined,
        month: `${pMonth} ${pYear}`,
        payment_method: pMethod,
        fine_amount: pFine !== "" ? Number(pFine) : undefined,
        fine_reason: pFineReason.trim() || undefined,
        extra_items_fee: pExtraFee !== "" ? Number(pExtraFee) : undefined,
        extra_items: pExtraItems.trim() || undefined,
        discount_amount: pDiscountAmount !== "" ? Number(pDiscountAmount) : 0,
        exam_fee_paid_gbp: pExamFeePaidGbp !== "" ? Number(pExamFeePaidGbp) : undefined,
        exam_fee_paid_mmk: pExamFeePaidMmk !== "" ? Number(pExamFeePaidMmk) : undefined,
        exam_fee_currency: pExamFeeCurrency || "MMK",
        payment_date: pDate ? new Date(pDate).toISOString() : undefined,
      };

      if (editingPayment) {
        await AdminService.updatePayment(editingPayment.payment_id, payload);
        toast.success("Payment updated successfully!");
      } else {
        await createPaymentMutation.mutateAsync(payload);
        toast.success("Payment recorded successfully!");
      }
      
      setPaymentModalOpen(false);
      setEditingPayment(null);
      
      // Refresh current history if open
      if (historyModalOpen) {
          const res = await AdminService.listPayments(1, 100, selectedEnrollment.enrollment_id);
          setPayments(res.data);
      }
      await load();
    } catch (e: any) {
      const msg = e?.response?.data?.detail || e?.response?.data?.message || "Failed to record payment";
      toast.error(msg);
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  const handleDeletePayment = async (payId: number) => {
     if (!window.confirm("Are you sure you want to delete this payment record? This cannot be undone.")) return;
     
     setBusy(true);
     try {
       await AdminService.deletePayment(payId);
       toast.success("Payment deleted successfully");
       
       // Refresh list
       if (selectedEnrollment) {
           const res = await AdminService.listPayments(1, 100, selectedEnrollment.enrollment_id);
           setPayments(res.data);
       }
       await load();
     } catch (e: any) {
       toast.error(e?.response?.data?.message || "Failed to delete payment");
     } finally {
       setBusy(false);
     }
  };

  const openHistory = async (enr: AdminEnrollment) => {
    setSelectedEnrollment(enr);
    setBusy(true);
    try {
      const res = await AdminService.listPayments(1, 100, enr.enrollment_id);
      setPayments(res.data);
      setHistoryModalOpen(true);
    } catch {
      toast.error("Failed to load payment history");
    } finally {
      setBusy(false);
    }
  };

  const handleGenerateReceipt = async (enr: AdminEnrollment) => {
    setBusy(true);
    try {
      const res = await AdminService.listPayments(1, 100, enr.enrollment_id);
      const enrPayments = res.data;
      generateReceiptPDF(
        enr,
        enrPayments,
        calculateLeftAmount(enr),
        calculateLeftExamFeeGbp(enr),
        user?.username || "Admin",
        true
      );
    } catch (err: any) {
      toast.error("Failed to load payment data for receipt");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return null;
  if (!isAdminOrSales) return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Payments</h1>
          <p className="text-slate-500 font-medium text-sm mt-1">Track student enrollments and installment payments.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={load}
            disabled={busy}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 disabled:opacity-60 text-sm transition-all active:scale-95"
          >
            <RefreshCw className={`w-4 h-4 ${busy ? "animate-spin" : ""}`} />
            <span className="hidden xs:inline">Refresh</span>
          </button>
          <button
            onClick={() => {
              const dataToExport = displayedEnrollments.map(enr => {
                const enrPayments = payments.filter(p => p.enrollment_id === enr.enrollment_id);
                const totalPaid = enrPayments.reduce((sum, p) => sum + p.amount + (p.amount_2 || 0), 0);
                const totalDiscount = enrPayments.reduce((sum, p) => sum + (p.discount_amount || 0), 0);
                const totalFine = enrPayments.reduce((sum, p) => sum + (p.fine_amount || 0), 0);
                const totalExtra = enrPayments.reduce((sum, p) => sum + (p.extra_items_fee || 0), 0);
                const totalExamGbp = enrPayments.reduce((sum, p) => sum + (p.exam_fee_paid_gbp || 0), 0);
                const totalExamMmk = enrPayments.reduce((sum, p) => sum + (p.exam_fee_paid_mmk || 0), 0);

                return {
                  "Student Name": enr.student_name,
                  "Student Code": enr.student_code,
                  "Course": enr.course_name,
                  "Batch": enr.batch_no || "-",
                  "Payment Plan": (enr.payment_plan === 'full' || enr.payment_plan === 'cash_down') ? 'Cash Down' : (enr.payment_plan === 'installment' ? 'Installment' : 'N/A'),
                  "Course Fee (MMK)": enr.course_cost || 0,
                  "Total Paid (MMK)": totalPaid,
                  "Total Discount (MMK)": totalDiscount,
                  "Total Fine Paid (MMK)": totalFine,
                  "Fine Reasons": enrPayments.filter(p => p.fine_amount && p.fine_amount > 0 && p.fine_reason).map(p => p.fine_reason).join(", ") || "-",
                  "Total Extra Items Fee (MMK)": totalExtra,
                  "Exam Fee Paid (GBP)": totalExamGbp,
                  "Exam Fee Paid (MMK)": totalExamMmk,
                  "Balance Due (MMK)": calculateLeftAmount(enr),
                  "FOC Items": enr.foc_items || "-",
                  "Status": (calculateLeftAmount(enr) <= 0 && calculateLeftExamFeeGbp(enr) <= 0) ? "Fully Paid" : "Balance Due",
                  "Last Payment": (enrPayments.length > 0) ? new Date([...enrPayments].sort((a,b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())[0].payment_date).toLocaleString() : "-"
                };
              });
              exportToExcel(dataToExport, "Payments_Overview", "Payments");
            }}
            disabled={busy || displayedEnrollments.length === 0}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 disabled:opacity-60 shadow-sm transition-all active:scale-95 text-sm whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            <span className="hidden xs:inline">Export</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100/50 overflow-hidden">
        <div className="px-4 sm:px-6 py-5 border-b border-slate-100 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by student, course..."
              className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-slate-800 font-medium text-sm sm:text-base"
            />
          </div>
          {error && (
            <div className="text-sm font-semibold text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-xl animate-in shake duration-300">
              {error}
            </div>
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/80 text-xs uppercase font-semibold text-slate-500 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">Student</th>
                <th className="px-6 py-4">Course</th>
                <th className="px-6 py-4">Plan Info</th>
                <th className="px-6 py-4">Payment Tracking</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {displayedEnrollments.map((enr) => {
                const enrPayments = payments.filter(p => p.enrollment_id === enr.enrollment_id);
                return (
                  <tr key={enr.enrollment_id} className="hover:bg-blue-50 hover:shadow-md transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-800">{enr.student_name}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{enr.student_code}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-800 tracking-tight group-hover:text-brand-600 transition-colors text-wrap">{enr.course_name}</div>
                    </td>
                    <td className="px-6 py-4">
                      {enr.payment_plan ? (
                        <div className="flex flex-col gap-2 min-w-[max-content]">
                          <div className="flex items-center justify-between">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold border tracking-tight ${(enr.payment_plan === 'full' || enr.payment_plan === 'cash_down') ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-purple-50 text-purple-700 border-purple-100'}`}>
                              {(enr.payment_plan === 'full' || enr.payment_plan === 'cash_down') ? 'Cash Down' : 'Installment'}
                            </span>
                          </div>

                          <div className="space-y-1.5 px-0.5">
                            <div className="flex items-center gap-4">
                              <div className="flex flex-col">
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Course Cost</span>
                                <span className="text-xs font-semibold text-slate-700">{formatAmount(enr.course_cost)} <span className="text-[10px] font-normal text-slate-400">MMK</span></span>
                              </div>
                              {enr.payment_plan === 'installment' && (
                                <div className="flex flex-col border-l border-slate-100 pl-4">
                                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Monthly</span>
                                  <span className="text-xs font-semibold text-slate-700">{formatAmount(enr.installment_amount)} <span className="text-[10px] font-normal text-slate-400 text-purple-400">MMK</span></span>
                                </div>
                              )}
                            </div>

                            <div className="grid grid-cols-2 gap-3 pt-1.5 border-t border-slate-50">
                              <div className="flex flex-col">
                                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Remaining</span>
                                <div className="flex items-baseline gap-1">
                                  <span className="text-sm font-black text-rose-600 tracking-tight">{formatAmount(calculateLeftAmount(enr))}</span>
                                  <span className="text-[10px] font-bold text-rose-300">MMK</span>
                                </div>
                              </div>
                              <div className="flex flex-col border-l border-slate-100 pl-3">
                                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Exam Fee</span>
                                <div className="flex items-baseline gap-1">
                                  <span className="text-sm font-black text-indigo-700 tracking-tight">{calculateLeftExamFeeGbp(enr)}</span>
                                  <span className="text-[10px] font-bold text-indigo-300">GBP</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-slate-400 bg-slate-50 px-3 py-2 rounded-xl border border-dashed border-slate-200">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span className="text-xs italic font-medium">No active plan</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1.5 items-start">
                        {enr.payment_plan && (calculateLeftAmount(enr) <= 0 && calculateLeftExamFeeGbp(enr) <= 0) ? (
                          <div className="flex items-center gap-1.5 text-emerald-600 px-2 py-1 bg-emerald-50 rounded-lg border border-emerald-100">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Fully Paid</span>
                          </div>
                        ) : enr.payment_plan ? (
                          <div className="flex items-center gap-1.5 text-amber-600 px-2 py-1 bg-amber-50 rounded-lg border border-amber-100">
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.3)]" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-amber-700">Due Balance</span>
                          </div>
                        ) : null}

                        <div className="flex items-center gap-1.5 px-2 py-1.5 bg-slate-50/50 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
                          <Receipt className="w-3 h-3 text-slate-400" />
                          <span className="text-xs font-bold text-slate-600 tracking-tight">
                            {enr.payment_count} <span className="font-medium text-slate-400 text-[10px] uppercase tracking-wider">Entries</span>
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2 text-xs">
                        <button
                          onClick={() => handleGenerateReceipt(enr)}
                          disabled={busy}
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 font-bold hover:bg-slate-100 transition-all active:scale-95 disabled:opacity-50"
                          title="Download/Print Receipt"
                        >
                          Receipt
                        </button>
                        <button
                          onClick={() => openHistory(enr)}
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition-all active:scale-95"
                        >
                          <History className="w-3.5 h-3.5" />
                          History
                        </button>
                        {(enr.payment_plan === 'installment' || enr.payment_plan === 'full') && calculateLeftAmount(enr) > 0 && (
                          <button
                            onClick={() => openRecordPayment(enr)}
                            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 text-white font-bold hover:bg-brand-700 shadow-sm transition-all active:scale-95"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            Pay Now
                          </button>
                        )}
                        {((calculateLeftAmount(enr) <= 0 && calculateLeftExamFeeGbp(enr) > 0)) && (
                          <button
                            onClick={() => openRecordPayment(enr)}
                            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-sm transition-all active:scale-95"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            Exam Fee
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {displayedEnrollments.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-400 font-medium">
                    {busy ? "Loading…" : "No enrollments found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile/Tablet Card View */}
        <div className="block lg:hidden divide-y divide-slate-100">          {displayedEnrollments.map((enr) => {
            const isFullyPaid = (calculateLeftAmount(enr) <= 0 && calculateLeftExamFeeGbp(enr) <= 0);
            const initials = enr.student_name ? enr.student_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '?';
            
            return (
              <div key={enr.enrollment_id} className="p-5 bg-white border-b border-slate-200">
                {/* Header: Name & Course */}
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${isFullyPaid ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h4 className="text-sm font-bold text-slate-900 truncate">{enr.student_name}</h4>
                      {enr.payment_plan && (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border shrink-0 ${(enr.payment_plan === 'full' || enr.payment_plan === 'cash_down') ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                          {(enr.payment_plan === 'full' || enr.payment_plan === 'cash_down') ? 'Cash' : 'Inst.'}
                        </span>
                      )}
                    </div>
                     <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{enr.student_code}</p>
                        <span className="w-1 h-1 rounded-full bg-slate-300" />
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest truncate">{enr.course_name}</span>
                        {enr.batch_no && (
                          <>
                            <span className="w-1 h-1 rounded-full bg-slate-300" />
                            <span className="text-[10px] font-black text-brand-500 uppercase tracking-widest">{enr.batch_no}</span>
                          </>
                        )}
                     </div>
                  </div>
                </div>

                {/* Primary Metric: Remaining Balance */}
                <div className={`mt-4 p-4 rounded-lg border ${isFullyPaid ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-200'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${isFullyPaid ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {isFullyPaid ? 'Payment Status' : 'Remaining Balance'}
                    </span>
                    {isFullyPaid && (
                      <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Fully Settled</span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className={`text-xl font-bold tracking-tight ${isFullyPaid ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {formatAmount(calculateLeftAmount(enr))}
                    </span>
                    <span className={`text-xs font-bold ${isFullyPaid ? 'text-emerald-400' : 'text-rose-400'}`}>MMK</span>
                  </div>
                </div>

                {/* Grid stats - enhanced vertical/list style */}
                <div className="mt-4 space-y-2">
                  {enr.payment_plan === 'installment' && (
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                      <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-purple-600 shadow-sm">
                            <CreditCard className="w-4 h-4" />
                         </div>
                         <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Installment</span>
                      </div>
                      <p className="text-xs font-bold text-slate-700">{formatAmount(enr.installment_amount)} <span className="text-[9px] text-slate-400 font-normal">MMK</span></p>
                    </div>
                  )}
                  {calculateLeftExamFeeGbp(enr) > 0 && (
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                      <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-indigo-600 shadow-sm">
                            <Award className="w-4 h-4" />
                         </div>
                         <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Exam Fee</span>
                      </div>
                      <p className="text-xs font-bold text-indigo-700">{calculateLeftExamFeeGbp(enr)} <span className="text-[9px] text-indigo-400 font-normal">GBP</span></p>
                    </div>
                  )}
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-3">
                       <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-emerald-600 shadow-sm">
                          <History className="w-4 h-4" />
                       </div>
                       <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Payments</span>
                    </div>
                    <p className="text-xs font-bold text-slate-700">{enr.payment_count} Records</p>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="mt-5 flex items-center gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => handleGenerateReceipt(enr)}
                    disabled={busy}
                    className="flex-1 h-9 flex items-center justify-center gap-2 rounded-lg bg-slate-900 text-white text-[11px] font-bold hover:bg-slate-800 transition-colors disabled:opacity-50"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Receipt
                  </button>
                  <button
                    onClick={() => openHistory(enr)}
                    className="flex-1 h-9 flex items-center justify-center gap-2 rounded-lg bg-white text-slate-700 text-[11px] font-bold border border-slate-200 hover:bg-slate-50 transition-colors"
                  >
                    <History className="w-3.5 h-3.5" />
                    Logs
                  </button>
                  {!isFullyPaid && (
                    <button
                      onClick={() => openRecordPayment(enr)}
                      className="flex-1 h-9 flex items-center justify-center rounded-lg bg-indigo-600 text-white text-[11px] font-bold hover:bg-indigo-700 transition-colors"
                    >
                      PAY NOW
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {displayedEnrollments.length === 0 && (
            <div className="p-10 text-center text-slate-400 font-medium text-sm">
              {busy ? "Loading…" : "No enrollments found."}
            </div>
          )}
        </div>

        {pagination && (
          <Pagination
            currentPage={page}
            totalPages={pagination.total_pages}
            totalCount={pagination.total_count}
            limit={limit}
            onPageChange={setPage}
            onLimitChange={(l) => { setLimit(l); setPage(1); }}
          />
        )}
      </div>

      <Modal 
        title={editingPayment ? "Edit Payment Record" : (selectedEnrollment?.payment_plan === 'full' || selectedEnrollment?.payment_plan === 'cash_down') ? "Record Cash Down Payment" : "Record Installment Payment"} 
        open={paymentModalOpen} 
        onClose={() => {
            setPaymentModalOpen(false);
            setEditingPayment(null);
        }}
      >
        {selectedEnrollment && (
          <div className="space-y-4 pt-2">
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs font-semibold text-slate-500 uppercase">Student</div>
                  <div className="font-semibold text-slate-800">{selectedEnrollment.student_name}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-500 uppercase">Course</div>
                  <div className="font-semibold text-slate-800">{selectedEnrollment.course_name}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-500 uppercase">
                    {(selectedEnrollment.payment_plan === 'full' || selectedEnrollment.payment_plan === 'cash_down') ? 'Course Bal.' : 'Monthly Exp.'}
                  </div>
                  <div className="font-semibold text-slate-800">
                    {(selectedEnrollment.payment_plan === 'full' || selectedEnrollment.payment_plan === 'cash_down') ? formatAmount(calculateLeftAmount(selectedEnrollment)) : formatAmount(selectedEnrollment.installment_amount)} MMK
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-500 uppercase">Exam Bal.</div>
                  <div className="font-semibold text-blue-700">
                    {calculateLeftExamFeeGbp(selectedEnrollment)} GBP
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Primary Amount (MMK)</label>
                <input
                  type="number"
                  value={pAmount}
                  onChange={(e) => setPAmount(e.target.value ? Number(e.target.value) : "")}
                  onFocus={(e) => pAmount === 0 && setPAmount("")}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  placeholder="0"
                />
                {pAmount !== "" && Number(pAmount) > 0 && (
                  <div className="mt-1 ml-1 text-[10px] font-bold text-brand-600 animate-in fade-in slide-in-from-top-1 duration-200">
                    Display: <span className="text-slate-900">{formatAmount(pAmount)}</span> <span className="text-brand-400 font-normal">MMK</span>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Primary Method</label>
                <select
                  value={pMethod}
                  onChange={(e) => setPMethod(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-slate-800"
                >
                  <option value="">Select Option</option>
                  <option value="KBZPay">KBZPay</option>
                  <option value="AYA Pay">AYA Pay</option>
                  <option value="Cash">Cash</option>
                  <option value="MMQR">MMQR</option>
                  <option value="Banking">Banking</option>
                </select>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-4">
              <div className="flex items-center justify-between mb-1">
                <h4 className="text-sm font-bold text-slate-700">Secondary Payment (Optional)</h4>
                <div className="px-2 py-0.5 rounded-full bg-brand-50 text-[10px] font-bold text-brand-600 uppercase tracking-wider">Split Payment</div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 ml-1">Extra Amount (MMK)</label>
                  <input
                    type="number"
                    value={pAmount2}
                    onChange={(e) => setPAmount2(e.target.value ? Number(e.target.value) : "")}
                    onFocus={(e) => pAmount2 === 0 && setPAmount2("")}
                    className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-slate-800"
                    placeholder="0"
                  />
                  {pAmount2 !== "" && Number(pAmount2) > 0 && (
                    <div className="mt-1 ml-1 text-[10px] font-bold text-brand-600 animate-in fade-in slide-in-from-top-1 duration-200">
                      Display: <span className="text-slate-900">{formatAmount(pAmount2)}</span> <span className="text-brand-400 font-normal">MMK</span>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5 ml-1">Method</label>
                  <select
                    value={pMethod2}
                    onChange={(e) => setPMethod2(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-slate-800"
                  >
                    <option value="">Select Option</option>
                    <option value="KBZPay">KBZPay</option>
                    <option value="AYA Pay">AYA Pay</option>
                    <option value="Cash">Cash</option>
                    <option value="MMQR">MMQR</option>
                    <option value="Banking">Banking</option>
                  </select>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Payment Date & Time</label>
              <input
                type="datetime-local"
                value={pDate}
                onChange={(e) => setPDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-slate-800"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Payment For</label>
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={pMonth}
                  onChange={(e) => setPMonth(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-slate-800"
                >
                  <option value="">Select Option</option>
                  <option value="Deposit">Deposit</option>
                  {selectedEnrollment?.payment_plan === 'installment' && (
                    <option value="Down Payment">Down Payment</option>
                  )}
                  {(selectedEnrollment?.payment_plan === 'full' || selectedEnrollment?.payment_plan === 'cash_down') && (
                    <option value="Cash Down">Cash Down</option>
                  )}
                  {selectedEnrollment?.payment_plan === 'installment' &&
                    ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                </select>
                <select
                  value={pYear}
                  onChange={(e) => setPYear(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-slate-800"
                >
                  <option value="">Select Year</option>
                  {[...Array(5)].map((_, i) => {
                    const y = (new Date().getFullYear() - 1 + i).toString();
                    return <option key={y} value={y}>{y}</option>;
                  })}
                </select>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4 mt-2">
              <h4 className="text-sm font-bold text-slate-700 mb-3">Additional Charges (Optional)</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Fine (MMK)</label>
                  <input
                    type="number"
                    value={pFine}
                    onChange={(e) => setPFine(e.target.value ? Number(e.target.value) : "")}
                    onFocus={(e) => pFine === 0 && setPFine("")}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
                    placeholder="0"
                  />
                  {pFine !== "" && Number(pFine) > 0 && (
                    <div className="mt-1 ml-1 text-[10px] font-bold text-red-600 animate-in fade-in slide-in-from-top-1 duration-200">
                      Display: <span className="text-slate-900">{formatAmount(pFine)}</span> <span className="text-red-300 font-normal">MMK</span>
                    </div>
                  )}
                  {pFine !== "" && pFine !== 0 && (
                    <input
                      type="text"
                      value={pFineReason}
                      onChange={(e) => setPFineReason(e.target.value)}
                      className="w-full mt-2 px-3 py-2 rounded-xl bg-white border border-red-100 focus:outline-none focus:ring-2 focus:ring-red-500/10 focus:border-red-300 text-xs"
                      placeholder="Reason for fine..."
                    />
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Extra Items Fee (MMK)</label>
                  <input
                    type="number"
                    value={pExtraFee}
                    onChange={(e) => setPExtraFee(e.target.value ? Number(e.target.value) : "")}
                    onFocus={(e) => pExtraFee === 0 && setPExtraFee("")}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400"
                    placeholder="0"
                  />
                  {pExtraFee !== "" && Number(pExtraFee) > 0 && (
                    <div className="mt-1 ml-1 text-[10px] font-bold text-amber-600 animate-in fade-in slide-in-from-top-1 duration-200">
                      Display: <span className="text-slate-900">{formatAmount(pExtraFee)}</span> <span className="text-amber-300 font-normal">MMK</span>
                    </div>
                  )}
                  {pExtraFee !== "" && pExtraFee !== 0 && (
                    <input
                      type="text"
                      value={pExtraItems}
                      onChange={(e) => setPExtraItems(e.target.value)}
                      className="w-full mt-2 px-3 py-2 rounded-xl bg-white border border-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-500/10 focus:border-amber-300 text-xs"
                      placeholder="List extra items..."
                    />
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Discount Amount (MMK)</label>
                  <input
                    type="number"
                    value={pDiscountAmount}
                    onChange={(e) => setPDiscountAmount(e.target.value ? Number(e.target.value) : "")}
                    onFocus={(e) => pDiscountAmount === 0 && setPDiscountAmount("")}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400"
                    placeholder="0"
                  />
                  {pDiscountAmount !== "" && Number(pDiscountAmount) > 0 && (
                    <div className="mt-1 ml-1 text-[10px] font-bold text-emerald-600 animate-in fade-in slide-in-from-top-1 duration-200">
                      Display: <span className="text-slate-900">{formatAmount(pDiscountAmount)}</span> <span className="text-emerald-300 font-normal">MMK</span>
                    </div>
                  )}
                </div>
                <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Exam GBP £</label>
                    <input
                      type="number"
                      value={pExamFeePaidGbp}
                      onChange={(e) => {
                        const gbp = e.target.value ? Number(e.target.value) : "";
                        setPExamFeePaidGbp(gbp);
                        if (gbp !== "" && pExchangeRate !== "") {
                          setPExamFeePaidMmk(Number(gbp) * Number(pExchangeRate));
                        }
                      }}
                      onFocus={(e) => pExamFeePaidGbp === 0 && setPExamFeePaidGbp("")}
                      className="w-full px-3 py-2.5 rounded-xl bg-blue-50/50 border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Exchange Rate</label>
                    <input
                      type="number"
                      value={pExchangeRate}
                      onChange={(e) => {
                        const rate = e.target.value ? Number(e.target.value) : "";
                        setPExchangeRate(rate);
                        if (pExamFeePaidGbp !== "" && rate !== "") {
                          setPExamFeePaidMmk(Number(pExamFeePaidGbp) * Number(rate));
                        }
                      }}
                      onFocus={(e) => pExchangeRate === 0 && setPExchangeRate("")}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                      placeholder="e.g. 5000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Exam MMK</label>
                    <input
                      type="number"
                      value={pExamFeePaidMmk}
                      onChange={(e) => setPExamFeePaidMmk(e.target.value ? Number(e.target.value) : "")}
                      className="w-full px-3 py-2.5 rounded-xl bg-indigo-50/50 border border-indigo-200"
                      readOnly
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setPaymentModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition-all active:scale-95"
              >
                Cancel
              </button>
              <button
                onClick={submitPayment}
                disabled={busy}
                className="px-6 py-2.5 rounded-xl bg-brand-600 text-white font-bold hover:bg-brand-700 disabled:opacity-60 shadow-sm transition-all active:scale-95"
              >
                {busy ? "Processing..." : "Complete Payment"}
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal title="Payment History" open={historyModalOpen} onClose={() => setHistoryModalOpen(false)}>
        {selectedEnrollment && (
          <div className="space-y-4 pt-2">
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 mb-4">
              <div className="font-bold text-slate-800">{selectedEnrollment.student_name}</div>
              <div className="text-sm text-slate-500">{selectedEnrollment.course_name}</div>
            </div>

            <div className="max-h-[50vh] overflow-y-auto space-y-3 pr-2 custom-scrollbar">
              {payments
                .filter(p => p.enrollment_id === selectedEnrollment.enrollment_id)
                .sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())
                .map(p => {
                  const sortedPayments = payments
                    .filter(pay => pay.enrollment_id === selectedEnrollment.enrollment_id)
                    .sort((a, b) => new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime());
                  const isFirstPayment = sortedPayments.length > 0 && sortedPayments[0].payment_id === p.payment_id;

                  return (
                    <div key={p.payment_id} className="relative pl-8 group">
                      {/* Vertical line indicator */}
                      <div className="absolute left-3 top-0 bottom-0 w-px bg-slate-200 group-last:bottom-auto group-last:h-4" />
                      <div className="absolute left-[3px] top-4 w-5 h-5 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center z-10">
                         <div className={clsx("w-1.5 h-1.5 rounded-full", p.status === 'Paid' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-300')} />
                      </div>

                      <div className="p-4 rounded-3xl bg-slate-50 border border-slate-100 space-y-4 hover:bg-white hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-black text-slate-900 tracking-tight">{formatAmount(p.amount + (p.amount_2 || 0))} MMK</span>
                              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-[10px] font-black text-emerald-600 uppercase tracking-widest border border-emerald-100">{p.status}</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                              <span className="text-xs text-slate-500 font-bold flex items-center gap-1.5 bg-white px-2 py-1 rounded-lg shadow-sm border border-slate-100">
                                <CreditCard className="w-3 h-3 text-brand-400" />
                                {p.payment_method}
                                {p.amount_2 ? ` + ${p.payment_method_2}` : ""}
                              </span>
                              <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                                {p.payment_date ? new Date(p.payment_date).toLocaleString('en-US', { 
                                  month: 'short', 
                                  day: 'numeric',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                }) : p.month}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-1.5 sm:self-start">
                             <button
                               onClick={() => {
                                 const leftExamGbp = calculateLeftExamFeeGbp(selectedEnrollment);
                                 const leftAmountAtTime = calculateLeftAmount(selectedEnrollment); 
                                 generateReceiptPDF(selectedEnrollment, [p], leftAmountAtTime, leftExamGbp, user?.username || "Admin", isFirstPayment);
                               }}
                               className="h-10 px-4 rounded-xl bg-white border border-slate-200 text-brand-600 font-bold text-xs flex items-center gap-2 hover:bg-brand-50 transition-colors shadow-sm active:scale-95"
                               title="Download Receipt"
                             >
                               <Receipt className="w-3.5 h-3.5" />
                               Receipt
                             </button>
                             {(user?.role === 'admin' || user?.role === 'hr' || user?.role === 'manager') && (
                               <>
                                 <button
                                   onClick={() => {
                                     setHistoryModalOpen(false);
                                     openEditPayment(p);
                                   }}
                                   className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-blue-600 flex items-center justify-center hover:bg-blue-50 transition-colors shadow-sm active:scale-95"
                                   title="Edit Payment"
                                 >
                                   <Edit className="w-4 h-4" />
                                 </button>
                                 <button
                                   onClick={() => handleDeletePayment(p.payment_id)}
                                   className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-red-600 flex items-center justify-center hover:bg-red-50 transition-colors shadow-sm active:scale-95"
                                   title="Delete Payment"
                                 >
                                   <Trash2 className="w-4 h-4" />
                                 </button>
                               </>
                             )}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                          {(p.fine_amount != null && p.fine_amount > 0) && (
                            <div className="text-[10px] text-red-600 font-black bg-white border border-red-100 px-2.5 py-1 rounded-lg uppercase tracking-widest flex items-center gap-1.5 shadow-sm">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                              Fine: {formatAmount(p.fine_amount)} MMK {p.fine_reason ? `(${p.fine_reason})` : ""}
                            </div>
                          )}
                          {(p.extra_items_fee != null && p.extra_items_fee > 0) && (
                            <div className="text-[10px] text-amber-600 font-black bg-white border border-amber-100 px-2.5 py-1 rounded-lg uppercase tracking-widest flex items-center gap-1.5 shadow-sm">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                              Extra: {formatAmount(p.extra_items_fee)} MMK ({p.extra_items || "Items"})
                            </div>
                          )}
                          {((p.exam_fee_paid_gbp != null && p.exam_fee_paid_gbp > 0)) && (
                            <div className="text-[10px] text-indigo-600 font-black bg-white border border-indigo-100 px-2.5 py-1 rounded-lg uppercase tracking-widest flex items-center gap-1.5 shadow-sm">
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                              Exam Fee: {p.exam_fee_paid_gbp} GBP
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              {payments.filter(p => p.enrollment_id === selectedEnrollment.enrollment_id).length === 0 && (
                <div className="py-12 text-center text-slate-400 font-medium">
                  No payment history found.
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setHistoryModalOpen(false)}
                className="px-6 py-2.5 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition-all active:scale-95 text-sm"
              >
                Close History
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
