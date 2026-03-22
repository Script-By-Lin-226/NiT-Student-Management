"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Search, Plus, CreditCard, History, X, Download, AlertCircle, Receipt } from "lucide-react";
import { exportToExcel } from "@/utils/excelExport";

import { AdminService, AdminEnrollment, AdminPayment } from "@/services/admin.service";
import { useAuth } from "@/hooks/useAuth";
import { generateReceiptPDF } from "@/utils/pdfReceipt";

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

  const [enrollments, setEnrollments] = useState<AdminEnrollment[]>([]);
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  
  const [courses, setCourses] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>("");
  const [q, setQ] = useState("");

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [selectedEnrollment, setSelectedEnrollment] = useState<AdminEnrollment | null>(null);

  // New Payment Form
  const [pAmount, setPAmount] = useState<number | "">("");
  const [pMonth, setPMonth] = useState("");
  const [pYear, setPYear] = useState("");
  const [pMethod, setPMethod] = useState("");
  const [pFine, setPFine] = useState<number | "">("")
  const [pFineReason, setPFineReason] = useState("")
  const [pExtraFee, setPExtraFee] = useState<number | "">("")
  const [pExtraItems, setPExtraItems] = useState("")
  const [pExamFeePaidGbp, setPExamFeePaidGbp] = useState<number | "">("")
  const [pExamFeePaidMmk, setPExamFeePaidMmk] = useState<number | "">("")
  const [pExchangeRate, setPExchangeRate] = useState<number | "">("")
  const [pExamFeeCurrency, setPExamFeeCurrency] = useState("MMK")

  const calculateLeftAmount = (enr: AdminEnrollment) => {
    const enrPayments = payments.filter((p) => p.enrollment_id === enr.enrollment_id);
    const totalPaid = enrPayments.reduce((sum, p) => sum + p.amount, 0);
    const cost = enr.course_cost || 0;
    return Math.max(0, cost - totalPaid);
  };

  const calculateLeftExamFeeGbp = (enr: AdminEnrollment) => {
    const course = courses.find(c => c.course_id === enr.course_id);
    const totalDue = course?.exam_fee_gbp || 0;
    const enrPayments = payments.filter((p) => p.enrollment_id === enr.enrollment_id);
    const totalPaidGbp = enrPayments.reduce((sum, p) => sum + (p.exam_fee_paid_gbp || 0), 0);
    return Math.max(0, totalDue - totalPaidGbp);
  };

  const filteredEnrollments = enrollments.filter((e) => {
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
    setBusy(true);
    setError("");
    try {
      const [enrData, payData, courseData] = await Promise.all([
        AdminService.listEnrollments(),
        AdminService.listPayments(),
        AdminService.listCourses()
      ]);
      setEnrollments(enrData);
      setPayments(payData);
      setCourses(courseData);
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.response?.data?.message || "Failed to load data");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (isAdminOrSales) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdminOrSales]);

  const openRecordPayment = (enr: AdminEnrollment) => {
    setSelectedEnrollment(enr);
    if (enr.payment_plan === 'installment') {
      setPAmount(enr.installment_amount || "");
    } else {
      setPAmount(calculateLeftAmount(enr) || enr.course_cost || "");
    }
    
    // auto select current month and year setup
    const d = new Date();
    if (enr.payment_plan === 'full') {
      setPMonth('Full Payment');
    } else {
      setPMonth(d.toLocaleString('default', { month: 'long' }));
    }
    setPYear(d.getFullYear().toString());
    setPMethod("");
    setPFine("");
    setPFineReason("");
    setPExtraFee("");
    setPExtraItems("");
    setPExamFeePaidGbp("");
    setPExamFeePaidMmk("");
    setPExchangeRate("");
    setPExamFeeCurrency("MMK");
    
    setPaymentModalOpen(true);
  };

  const submitPayment = async () => {
    if (!selectedEnrollment) return;
    if (pAmount === "" || !pMonth) return;

    setBusy(true);
    setError("");
    try {
      await AdminService.createPayment({
        enrollment_id: selectedEnrollment.enrollment_id,
        amount: Number(pAmount),
        month: pYear ? `${pMonth} ${pYear}` : pMonth,
        payment_method: pMethod || undefined,
        fine_amount: pFine !== "" ? Number(pFine) : undefined,
        fine_reason: pFineReason.trim() || undefined,
        extra_items_fee: pExtraFee !== "" ? Number(pExtraFee) : undefined,
        extra_items: pExtraItems.trim() || undefined,
        exam_fee_paid_gbp: pExamFeePaidGbp !== "" ? Number(pExamFeePaidGbp) : undefined,
        exam_fee_paid_mmk: pExamFeePaidMmk !== "" ? Number(pExamFeePaidMmk) : undefined,
        exam_fee_currency: pExamFeeCurrency || "MMK",
      });
      setPaymentModalOpen(false);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.response?.data?.message || "Failed to record payment");
    } finally {
      setBusy(false);
    }
  };

  const openHistory = (enr: AdminEnrollment) => {
    setSelectedEnrollment(enr);
    setHistoryModalOpen(true);
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
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            disabled={busy}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${busy ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={() => {
              const dataToExport = filteredEnrollments.map(enr => {
                  const enrPayments = payments.filter(p => p.enrollment_id === enr.enrollment_id);
                  const totalPaid = enrPayments.reduce((sum, p) => sum + p.amount, 0);
                  const totalFine = enrPayments.reduce((sum, p) => sum + (p.fine_amount || 0), 0);
                  const totalExtra = enrPayments.reduce((sum, p) => sum + (p.extra_items_fee || 0), 0);
                  const totalExamGbp = enrPayments.reduce((sum, p) => sum + (p.exam_fee_paid_gbp || 0), 0);
                  const totalExamMmk = enrPayments.reduce((sum, p) => sum + (p.exam_fee_paid_mmk || 0), 0);
                  
                  return {
                    "Student Name": enr.student_name,
                    "Student Code": enr.student_code,
                    "Course": enr.course_name,
                    "Batch": enr.batch_no || "-",
                    "Payment Plan": enr.payment_plan === 'full' ? 'Full Payment' : 'Installment',
                    "Course Cost (MMK)": enr.course_cost || 0,
                    "Total Paid (MMK)": totalPaid,
                    "Total Fine Paid (MMK)": totalFine,
                    "Fine Reasons": enrPayments.filter(p => p.fine_amount && p.fine_amount > 0 && p.fine_reason).map(p => p.fine_reason).join(", ") || "-",
                    "Total Extra Items Fee (MMK)": totalExtra,
                    "Exam Fee Paid (GBP)": totalExamGbp,
                    "Exam Fee Paid (MMK)": totalExamMmk,
                    "Balance Due (MMK)": calculateLeftAmount(enr),
                    "FOC Items": enr.foc_items || "-",
                    "Status": calculateLeftAmount(enr) <= 0 ? "Fully Paid" : "Balance Due"
                  };
                });
                exportToExcel(dataToExport, "Payments_Overview", "Payments");
            }}
            disabled={busy || filteredEnrollments.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 disabled:opacity-60 shadow-sm transition-colors"
          >
            <Download className="w-4 h-4" />
            Export to Excel
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100/50 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by student, course..."
              className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-slate-800 font-medium"
            />
          </div>
          {error && (
            <div className="text-sm font-semibold text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-xl">
              {error}
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
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
              {filteredEnrollments.map((enr) => {
                const enrPayments = payments.filter(p => p.enrollment_id === enr.enrollment_id);
                return (
                  <tr key={enr.enrollment_id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-800">{enr.student_name}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{enr.student_code}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-800">{enr.course_name}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{enr.course_code}</div>
                    </td>
                    <td className="px-6 py-4">
                      {enr.payment_plan ? (
                        <div className="flex flex-col gap-2 min-w-[max-content]">
                          <div className="flex items-center justify-between">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold border tracking-tight ${enr.payment_plan === 'full' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-purple-50 text-purple-700 border-purple-100'}`}>
                              {enr.payment_plan === 'full' ? 'Full Plan' : 'Installment'}
                            </span>
                          </div>
                          
                          <div className="space-y-1.5 px-0.5">
                            <div className="flex items-center gap-4">
                              <div className="flex flex-col">
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Course Cost</span>
                                <span className="text-xs font-semibold text-slate-700">{(enr.course_cost || 0).toLocaleString()} <span className="text-[10px] font-normal text-slate-400">MMK</span></span>
                              </div>
                              {enr.payment_plan === 'installment' && (
                                <div className="flex flex-col border-l border-slate-100 pl-4">
                                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Monthly</span>
                                  <span className="text-xs font-semibold text-slate-700">{(enr.installment_amount || 0).toLocaleString()} <span className="text-[10px] font-normal text-slate-400 text-purple-400">MMK</span></span>
                                </div>
                              )}
                            </div>

                            <div className="grid grid-cols-2 gap-3 pt-1.5 border-t border-slate-50">
                               <div className="flex flex-col">
                                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Remaining</span>
                                  <div className="flex items-baseline gap-1">
                                    <span className="text-sm font-black text-rose-600 tracking-tight">{calculateLeftAmount(enr).toLocaleString()}</span>
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
                        {enr.payment_plan && calculateLeftAmount(enr) <= 0 ? (
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
                                {enrPayments.length} <span className="font-medium text-slate-400 text-[10px] uppercase tracking-wider">Entries</span>
                            </span>
                        </div>
                      </div>
                    </td>
                  <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => generateReceiptPDF(enr, enrPayments, calculateLeftAmount(enr), user?.username || "Admin", true)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 font-semibold hover:bg-slate-100 transition-colors text-xs"
                          title="Download/Print Receipt"
                        >
                          Receipt
                        </button>
                        <button
                          onClick={() => openHistory(enr)}
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50"
                        >
                          <History className="w-4 h-4" />
                          History
                        </button>
                        {(enr.payment_plan === 'installment' || enr.payment_plan === 'full') && calculateLeftAmount(enr) > 0 && (
                          <button
                            onClick={() => openRecordPayment(enr)}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 text-white font-bold hover:bg-brand-700 shadow-sm whitespace-nowrap"
                          >
                            <CreditCard className="w-4 h-4" />
                            Pay Now
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredEnrollments.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-400 font-medium">
                    {busy ? "Loading…" : "No enrollments found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal title={selectedEnrollment?.payment_plan === 'full' ? "Record Full Payment" : "Record Installment Payment"} open={paymentModalOpen} onClose={() => setPaymentModalOpen(false)}>
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
                    {selectedEnrollment.payment_plan === 'full' ? 'Total Left' : 'Monthly Expected'}
                  </div>
                  <div className="font-semibold text-slate-800">
                    {selectedEnrollment.payment_plan === 'full' ? calculateLeftAmount(selectedEnrollment) : (selectedEnrollment.installment_amount || 0)} MMK
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Amount (MMK)</label>
              <input
                type="number"
                value={pAmount}
                onChange={(e) => setPAmount(e.target.value ? Number(e.target.value) : "")}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                placeholder="0"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Payment Method</label>
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
                  {selectedEnrollment?.payment_plan === 'full' && (
                    <option value="Full Payment">Full Payment</option>
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
                    className="w-full px-3 py-2.5 rounded-xl bg-red-50/50 border border-red-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
                    placeholder="e.g. late fee, rule violation"
                  />
                  {pFine !== "" && (
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
                    className="w-full px-3 py-2.5 rounded-xl bg-amber-50/50 border border-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400"
                    placeholder="e.g. uniform, book"
                  />
                </div>
                <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Exam GBP £ to Pay</label>
                    <input
                      type="number"
                      value={pExamFeePaidGbp}
                      onChange={(e) => {
                        const gbp = e.target.value ? Number(e.target.value) : "";
                        setPExamFeePaidGbp(gbp);
                        if (gbp !== "" && pExchangeRate !== "") {
                          setPExamFeePaidMmk(gbp * Number(pExchangeRate));
                        }
                      }}
                      className="w-full px-3 py-2.5 rounded-xl bg-blue-50/50 border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                      placeholder="e.g. 50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Exchange Rate (MMK/£)</label>
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
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                      placeholder="e.g. 5000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Total Exam MMK</label>
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
                className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={submitPayment}
                disabled={busy || pAmount === "" || !pMonth}
                className="px-4 py-2.5 rounded-xl bg-brand-600 text-white font-bold hover:bg-brand-700 disabled:opacity-60"
              >
                Mark as Paid
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

            {payments.filter(p => p.enrollment_id === selectedEnrollment.enrollment_id).length === 0 ? (
              <div className="py-8 text-center text-slate-500 font-medium">
                No payments recorded yet.
              </div>
            ) : (
              <div className="space-y-3">
                {payments
                  .filter(p => p.enrollment_id === selectedEnrollment.enrollment_id)
                  .sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())
                  .map(p => {
                    const sortedPayments = payments
                      .filter(pay => pay.enrollment_id === selectedEnrollment.enrollment_id)
                      .sort((a, b) => new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime());
                    const isFirstPayment = sortedPayments.length > 0 && sortedPayments[0].payment_id === p.payment_id;

                    return (
                    <div key={p.payment_id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white border border-slate-200 rounded-xl">
                      <div>
                        <div className="font-bold text-slate-800">{p.month}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{new Date(p.payment_date).toLocaleString()}</div>
                        {(p.fine_amount != null && p.fine_amount > 0) && <div className="text-xs text-red-600 mt-0.5 font-semibold">Fine: {p.fine_amount} MMK {p.fine_reason ? `(${p.fine_reason})` : ""}</div>}
                        {(p.extra_items_fee != null && p.extra_items_fee > 0) && <div className="text-xs text-amber-600 mt-0.5 font-semibold">Extra: {p.extra_items_fee} MMK — {p.extra_items || "Items"}</div>}
                        {((p.exam_fee_paid_gbp != null && p.exam_fee_paid_gbp > 0) || (p.exam_fee_paid_mmk != null && p.exam_fee_paid_mmk > 0)) && (
                          <div className="text-xs text-blue-600 mt-0.5 font-semibold">
                            Exam Fee: {p.exam_fee_paid_gbp || 0} GBP ({p.exam_fee_paid_mmk || 0} MMK)
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col sm:items-end mt-2 sm:mt-0">
                        <div className="font-extrabold text-emerald-600">{p.amount} MMK</div>
                        <div className="flex gap-1 mt-1 justify-end items-center">
                           <button 
                             onClick={() => generateReceiptPDF(selectedEnrollment, [p], calculateLeftAmount(selectedEnrollment), user?.username || "Admin", isFirstPayment)}
                             className="inline-flex px-2 py-0.5 rounded text-[10px] uppercase font-bold border bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 transition-colors"
                             title="Download Receipt for this payment"
                           >
                             Receipt
                           </button>
                           {p.payment_method && <span className="inline-flex px-2 py-0.5 rounded text-[10px] uppercase font-bold border bg-blue-50 text-blue-700 border-blue-100">{p.payment_method}</span>}
                           <span className="inline-flex px-2 py-0.5 rounded text-[10px] uppercase font-bold border bg-emerald-50 text-emerald-700 border-emerald-100">{p.status}</span>
                        </div>
                      </div>
                    </div>
                  )})}
              </div>
            )}
            
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setHistoryModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
