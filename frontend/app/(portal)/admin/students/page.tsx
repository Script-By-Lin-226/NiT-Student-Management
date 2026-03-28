"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { AdminService, AdminStudent, AdminStudentRelations, AdminCourse } from "@/services/admin.service";
import { useAuth } from "@/hooks/useAuth";

import { Plus, Search, Trash2, Pencil, RefreshCw, X, Download, Check, AlertCircle, ShieldCheck, Mail, Calendar, Key, UserPlus } from "lucide-react";
import * as XLSX from "xlsx";
import { useStudents, useCourses, useCreateStudent, useDeleteUser, useUpdateUser, useApproveStudent, useCreateEnrollment, useBatches } from "@/hooks/useAdmin";
import { formatAmount } from "@/utils/format";
import ConfirmModal from "@/components/ConfirmModal";
import { toast } from "sonner";

function Modal({
  title,
  open,
  onClose,
  children,
  
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-xl rounded-2xl bg-white shadow-xl border border-slate-200 flex flex-col max-h-[90vh] overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
            <h3 className="font-bold text-slate-900">{title}</h3>
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

export default function AdminStudentsPage() {
  const router = useRouter();
  const { isAdminOrSales, isAdmin, loading: authLoading } = useAuth();

  const [page, setPage] = useState(1);
  const limit = 50;

  // Form states moved up to avoid ReferenceError
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [selected, setSelected] = useState<AdminStudent | null>(null);
  const [relations, setRelations] = useState<AdminStudentRelations | null>(null);
  const [relationsLoading, setRelationsLoading] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  const [approveManualCode, setApproveManualCode] = useState("");
  const [approvePrefix, setApprovePrefix] = useState<"CO" | "IN" | "">("");

  // Create form
  const [cUserCode, setCUserCode] = useState("");
  const [cUsername, setCUsername] = useState("");
  const [cEmail, setCEmail] = useState("");
  const [cPassword, setCPassword] = useState("");
  const [cDob, setCDob] = useState<string>("");
  const [cActive, setCActive] = useState(true);
  const [cDepartment, setCDepartment] = useState("College");
  const [cStudentType, setCStudentType] = useState("New Student");
  const [cHowDidYouHear, setCHowDidYouHear] = useState<string[]>([]);
  const [cOtherHear, setCOtherHear] = useState("");

  // Additional Contact Info
  const [cNrc, setCNrc] = useState("");
  const [cPhone, setCPhone] = useState("");
  const [cParentName, setCParentName] = useState("");
  const [cParentPhone, setCParentPhone] = useState("");
  const [cAddress, setCAddress] = useState("");
  const [cProfilePicture, setCProfilePicture] = useState("");

  // Enrollment form integration
  const [cCourseCode, setCCourseCode] = useState("");
  const [cBatchNo, setCBatchNo] = useState("");
  const [cPaymentPlan, setCPaymentPlan] = useState(""); 
  const [cDownpayment, setCDownpayment] = useState<number | "">(0);
  const [cInstallment, setCInstallment] = useState<number | "">(0);
  const [cBatchId, setCBatchId] = useState<number | "" | "manual">("");

  // Formalize enrollment state
  const [formalizeOpen, setFormalizeOpen] = useState(false);
  const [fCourseCode, setFCourseCode] = useState("");
  const [fUserCode, setFUserCode] = useState("");
  const [fBatchNo, setFBatchNo] = useState("");
  const [fPlan, setFPlan] = useState("");
  const [fDown, setFDown] = useState<number | "">("");
  const [fInst, setFInst] = useState<number | "">("");
  const [fBatchId, setFBatchId] = useState<number | "" | "manual">("");

  // Edit form
  const [eUsername, setEUsername] = useState("");
  const [eEmail, setEEmail] = useState("");
  const [eDob, setEDob] = useState<string>("");
  const [eActive, setEActive] = useState(true);

  // Enrollment edit state
  const [enrollToEdit, setEnrollToEdit] = useState<any | null>(null);
  const [enrollEditOpen, setEnrollEditOpen] = useState(false);
  const [eBatch, setEBatch] = useState("");
  const [ePlan, setEPlan] = useState("");
  const [eDown, setEDown] = useState("");
  const [eInst, setEInst] = useState("");

  const [studentToDelete, setStudentToDelete] = useState<AdminStudent | null>(null);
  const [clearAllOpen, setClearAllOpen] = useState(false);

  // Queries and Mutations
  const { data: studentResponse, isLoading: studentsLoading, refetch: refetchStudents } = useStudents(page, limit);
  const { data: courses = [], isLoading: coursesLoading } = useCourses();

  // Selected course IDs for batch filtering
  const cSelectedCourseId = courses.find(c => c.course_code === cCourseCode)?.course_id;
  const { data: cBatchesResponse, isLoading: cBatchesLoading } = useBatches(cSelectedCourseId);
  const cBatches = cBatchesResponse?.data || [];

  const fSelectedCourseId = courses.find(c => c.course_code === fCourseCode)?.course_id;
  const { data: fBatchesResponse, isLoading: fBatchesLoading } = useBatches(fSelectedCourseId);
  const fBatches = fBatchesResponse?.data || [];

  const createMutation = useCreateStudent();
  const deleteMutation = useDeleteUser();
  const updateMutation = useUpdateUser();
  const approveMutation = useApproveStudent();
  const fastEnrollMutation = useCreateEnrollment();

  const rows = studentResponse?.data || [];
  const pagination = studentResponse?.pagination;

  useEffect(() => {
    if (error && errorRef.current) {
      errorRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [error]);

  const handleError = (e: any, fallback: string) => {
    const d = e?.response?.data?.detail;
    if (Array.isArray(d)) setError(d.map((x: any) => x.msg).join(", "));
    else if (typeof d === "string") setError(d);
    else setError(e?.response?.data?.message || e.message || fallback);
  };

  const handleProfilePicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setCProfilePicture(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (!authLoading && !isAdminOrSales) router.replace("/dashboard");
  }, [authLoading, isAdminOrSales, router]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((s: AdminStudent) => {
      return (
        (s.user_code || "").toLowerCase().includes(term) ||
        (s.username || "").toLowerCase().includes(term) ||
        (s.email || "").toLowerCase().includes(term)
      );
    });
  }, [q, rows]);

  const load = async () => {
    await refetchStudents();
  };

  const combinedLoading = authLoading || studentsLoading || coursesLoading || busy || createMutation.isPending || deleteMutation.isPending || updateMutation.isPending;

  const openCreate = () => {
    setCUserCode("");
    setCUsername("");
    setCEmail("");
    setCPassword("");
    setCDob("");
    setCActive(true);
    setCDepartment("College");
    setCStudentType("New Student");
    setCHowDidYouHear([]);
    setCOtherHear("");
    setCNrc("");
    setCPhone("");
    setCParentName("");
    setCParentPhone("");
    setCAddress("");
    setCProfilePicture("");
    setCCourseCode("");
    setCBatchNo("");
    setCBatchId("");
    setCPaymentPlan("");
    setCDownpayment(0);
    setCInstallment(0);
    setCreateOpen(true);
  };

  const submitCreate = async () => {
    setError("");
    try {
      await createMutation.mutateAsync({
        user_code: cUserCode.trim() || undefined,
        username: cUsername.trim(),
        email: cEmail.trim() || undefined,
        password: cPassword,
        date_of_birth: cDob || undefined,
        is_active: cActive,
        department: cDepartment,
        student_type: cStudentType,
        how_did_you_hear: [
          ...cHowDidYouHear.filter((item) => item !== "Other (Please Specify)"),
          ...(cHowDidYouHear.includes("Other (Please Specify)") && cOtherHear ? [`Other: ${cOtherHear}`] : [])
        ].join(", ") || null,
        nrc: cNrc.trim() || null,
        phone: cPhone.trim() || null,
        parent_name: cParentName.trim() || null,
        parent_phone: cParentPhone.trim() || null,
        address: cAddress.trim() || null,
        profile_picture: cProfilePicture || null,
        course_code: cCourseCode || null,
        batch_no: cBatchNo || null,
        batch_id: Number(cBatchId) || null,
        payment_plan: cPaymentPlan || null,
        downpayment: cDownpayment !== "" ? Number(cDownpayment) : null,
        installment_amount: cInstallment !== "" ? Number(cInstallment) : null,
      });
      setCreateOpen(false);
    } catch (e: any) {
      handleError(e, "Failed to create student");
    }
  };

  const openView = (s: AdminStudent) => {
    setSelected(s);
    setRelations(null);
    setRelationsLoading(true);
    setViewOpen(true);

    AdminService.getStudentRelations(s.user_code)
      .then(data => {
        setRelations(data);
        if (data.student) setSelected(data.student);
      })
      .catch(() => setRelations(null))
      .finally(() => setRelationsLoading(false));
  };

  const openEdit = (s: AdminStudent) => {
    setSelected(s);
    setEUsername(s.username);
    setEEmail(s.email);
    setEDob(s.data_of_birth ? s.data_of_birth.slice(0, 10) : "");
    setEActive(!!s.is_active);
    setRelations(null);
    setRelationsLoading(true);
    setEditOpen(true);

    AdminService.getStudentRelations(s.user_code)
      .then(data => {
        setRelations(data);
        if (data.student) {
          // Don't override eUsername etc if user already started editing, 
          // but we do need the full details for the student object.
        }
      })
      .catch(() => setRelations(null))
      .finally(() => setRelationsLoading(false));
  };

  const submitEdit = async () => {
    if (!selected) return;
    setError("");
    try {
      await updateMutation.mutateAsync({
        code: selected.user_code,
        payload: {
          username: eUsername.trim(),
          email: eEmail.trim(),
          date_of_birth: eDob ? eDob : null,
          is_active: eActive,
        }
      });
      setEditOpen(false);
      setSelected(null);
    } catch (e: any) {
      handleError(e, "Failed to update student");
    }
  };

  const doDelete = async (s: AdminStudent) => {
    setStudentToDelete(s);
  };

  const executeDelete = async () => {
    if (!studentToDelete) return;
    setError("");
    try {
      await deleteMutation.mutateAsync(studentToDelete.user_code);
    } catch (e: any) {
      handleError(e, "Failed to delete student");
    } finally {
      setStudentToDelete(null);
    }
  };

  const handleApprove = (s: AdminStudent) => {
    setSelected(s);
    setApproveManualCode(s.user_code);
    setApprovePrefix("");
    setApproveOpen(true);
  };

  const submitApprove = async () => {
    if (!selected) return;
    setBusy(true);
    setError("");
    try {
        await approveMutation.mutateAsync({
            id: selected.user_id,
            payload: {
                user_code: approvePrefix === "" ? approveManualCode : undefined,
                auto_prefix: approvePrefix !== "" ? approvePrefix : undefined,
            }
        });
        setApproveOpen(false);
        await load();
    } catch (e: any) {
        handleError(e, "Failed to approve student");
    } finally {
        setBusy(false);
    }
  };

  const openEnrollEdit = (enr: any) => {
    setEnrollToEdit(enr);
    setEBatch(enr.batch_no || "");
    setEPlan(enr.payment_plan || "");
    setEDown(enr.downpayment ? String(enr.downpayment) : "");
    setEInst(enr.installment_amount ? String(enr.installment_amount) : "");
    setEnrollEditOpen(true);
  };

  const submitEnrollEdit = async () => {
    if (!enrollToEdit || !selected) return;
    setBusy(true);
    setError("");
    try {
      await AdminService.updateEnrollment(enrollToEdit.enrollment_code, {
        batch_no: eBatch.trim() || null,
        payment_plan: ePlan || null,
        downpayment: eDown !== "" ? Number(eDown) : null,
        installment_amount: eInst !== "" ? Number(eInst) : null,
      });

      // Refresh relations
      const updated = await AdminService.getStudentRelations(selected.user_code);
      setRelations(updated);
      setEnrollEditOpen(false);
    } catch (e: any) {
      handleError(e, "Failed to update enrollment");
    } finally {
      setBusy(false);
    }
  };

  const handleFastEnroll = (uCode: string, cCode: string) => {
    setFUserCode(uCode);
    setFCourseCode(cCode);
    setFBatchNo("");
    setFBatchId("");
    setFPlan("");
    setFDown("");
    setFInst("");
    setError("");
    setBusy(false);
    setFormalizeOpen(true);
  };

  const submitFormalize = async () => {
    setBusy(true);
    setError("");
    try {
      await fastEnrollMutation.mutateAsync({
        student_code: fUserCode,
        course_code: fCourseCode,
        batch_no: fBatchNo || undefined,
        batch_id: Number(fBatchId) || undefined,
        payment_plan: fPlan || undefined,
        downpayment: fDown !== "" ? Number(fDown) : undefined,
        installment_amount: fInst !== "" ? Number(fInst) : undefined,
      });
      
      // Refresh relations
      if (selected && selected.user_code === fUserCode) {
        const updated = await AdminService.getStudentRelations(fUserCode);
        setRelations(updated);
      }
      
      setFormalizeOpen(false);
      toast.success("Enrollment formalized!");
    } catch (e: any) {
      handleError(e, "Failed to formalize enrollment");
    } finally {
      setBusy(false);
    }
  };

  if (authLoading) return null;
  if (!isAdminOrSales) return null;

  const exportSelectedStudent = () => {
    if (!selected || !relations) return;
    
    // Sheet 1: Student Information
    const infoData = [{
      "Code": selected.user_code,
      "Name": selected.username,
      "Email": selected.email,
      "DOB": selected.data_of_birth ? selected.data_of_birth.slice(0, 10) : "",
      "Status": selected.is_active ? "Active" : "Inactive",
      "NRC": selected.nrc || "",
      "Phone": selected.phone || "",
      "Address": selected.address || "",
      "Parent Name": selected.parent_name || "",
      "Parent Phone": selected.parent_phone || ""
    }];

    // Sheet 2: Enrollment Info with course cost and left amount
    const enrollmentData = relations.enrollments.map(e => {
      const courseCost = (e as any).course_cost || 0;
      // Sum all payments for this enrollment
      const totalPaid = (relations.payments || [])
        .filter(p => p.enrollment_id === e.enrollment_id)
        .reduce((sum, p) => sum + (p.amount || 0), 0);
      const totalDiscount = (relations.payments || [])
        .filter(p => p.enrollment_id === e.enrollment_id)
        .reduce((sum, p) => sum + (p.discount_amount || 0), 0);
      const leftAmount = Math.max(0, courseCost - (totalPaid + totalDiscount));
      return {
        "Course Code": e.course_code,
        "Course Name": e.course_name,
        "Status": e.status ? "Active" : "Inactive",
        "Batch": e.batch_no || "-",
        "Payment Plan": e.payment_plan === "full" ? "Cash Down" : e.payment_plan === "installment" ? "Installment" : "-",
        "Course Amount (MMK)": courseCost,
        "Deposit (MMK)": e.downpayment || 0,
        "Monthly Installment (MMK)": e.installment_amount || 0,
        "Total Paid (MMK)": totalPaid,
        "Total Discount (MMK)": totalDiscount,
        "Left Amount (MMK)": leftAmount,
        "FOC Items": (e as any).foc_items || "-",
        "Discount Plan": (e as any).discount_plan || "-",
        "Enrollment Date": e.enrollment_date ? e.enrollment_date.slice(0, 10) : "-"
      };
    });

    // Sheet 3: Payment Receipts Detail with course amount and running left
    let paymentData: any[] = [];
    if (relations.payments && relations.payments.length > 0) {
      // Group total paid per enrollment for computing left
      const paidPerEnrollment: Record<number, number> = {};
      for (const p of relations.payments) {
        paidPerEnrollment[p.enrollment_id] = (paidPerEnrollment[p.enrollment_id] || 0) + (p.amount || 0);
      }
      paymentData = relations.payments.map(p => {
        const courseCost = (p as any).course_cost || 0;
        const totalPaidForEnrollment = paidPerEnrollment[p.enrollment_id] || 0;
        return {
          "Receipt ID": p.payment_id,
          "Date": p.payment_date ? p.payment_date.slice(0, 10) : "-",
          "Course Name": p.course_name,
          "Month": p.month,
          "Method": p.payment_method || "N/A",
          "Course Amount (MMK)": courseCost,
          "Amount Paid (MMK)": p.amount,
          "Fine Amount (MMK)": p.fine_amount || 0,
          "Extra Items Fee (MMK)": p.extra_items_fee || 0,
          "Extra Items": p.extra_items || "-",
          "Exam Fee Paid (GBP)": p.exam_fee_paid_gbp || 0,
          "Exam Fee Paid (MMK)": p.exam_fee_paid_mmk || 0,
          "Total Paid for Enrollment (MMK)": totalPaidForEnrollment,
          "Left Amount (MMK)": Math.max(0, courseCost - totalPaidForEnrollment - ((p as any).totalDiscountForEnrollment || 0)),
          "Status": p.status
        };
      });
    }

    // Sheet 4: Monthly Payment Summary
    const monthlyMap: Record<string, { totalPaid: number; count: number }> = {};
    if (relations.payments && relations.payments.length > 0) {
      for (const p of relations.payments) {
        const key = p.month || "Unknown";
        if (!monthlyMap[key]) monthlyMap[key] = { totalPaid: 0, count: 0 };
        monthlyMap[key].totalPaid += p.amount || 0;
        monthlyMap[key].count += 1;
      }
    }
    const monthlySummary = Object.entries(monthlyMap).map(([month, v]) => ({
      "Month": month,
      "Total Paid (MMK)": v.totalPaid,
      "No. of Payments": v.count
    }));

    // Sheet 5: Attendance Detail
    const attendanceData = relations.attendance.map(a => ({
      "Date": a.attendance_date,
      "Status": a.check_today ? "Present" : "Absent"
    }));

    const wb = XLSX.utils.book_new();
    
    const wsInfo = XLSX.utils.json_to_sheet(infoData);
    XLSX.utils.book_append_sheet(wb, wsInfo, "Student Info");

    const wsEnroll = XLSX.utils.json_to_sheet(enrollmentData.length ? enrollmentData : [{"Info": "No enrollments found"}]);
    XLSX.utils.book_append_sheet(wb, wsEnroll, "Enrollments");

    const wsPayment = XLSX.utils.json_to_sheet(paymentData.length ? paymentData : [{"Info": "No payments recorded"}]);
    XLSX.utils.book_append_sheet(wb, wsPayment, "Payment Receipts");

    const wsMonthlySummary = XLSX.utils.json_to_sheet(monthlySummary.length ? monthlySummary : [{"Info": "No monthly data"}]);
    XLSX.utils.book_append_sheet(wb, wsMonthlySummary, "Monthly Summary");

    const wsAttendance = XLSX.utils.json_to_sheet(attendanceData.length ? attendanceData : [{"Info": "No attendance records"}]);
    XLSX.utils.book_append_sheet(wb, wsAttendance, "Attendance Details");

    XLSX.writeFile(wb, `Student_${selected.user_code}_Details.xlsx`);
  };

  const exportAllData = async () => {
    try {
      setBusy(true);
      const [studentsRes, enrollments, attendance, payments] = await Promise.all([
        AdminService.listStudents(1, -1),
        AdminService.listEnrollments(),
        AdminService.listAttendance(),
        AdminService.listPayments()
      ]);

      const students = studentsRes.data || [];

      const wb = XLSX.utils.book_new();

      const wsStudents = XLSX.utils.json_to_sheet(students.length ? students.map((s: AdminStudent) => ({
        "User Code": s.user_code,
        "Name": s.username,
        "Email": s.email,
        "DOB": s.data_of_birth ? s.data_of_birth.slice(0, 10) : "-",
        "Status": s.is_active ? "Active" : "Inactive",
        "NRC": s.nrc || "-",
        "Phone": s.phone || "-",
        "Address": s.address || "-",
        "Parent": s.parent_name || "-",
        "Parent Phone": s.parent_phone || "-"
      })) : [{"Info": "No students recorded"}]);
      XLSX.utils.book_append_sheet(wb, wsStudents, "All Students");

      // Compute total paid per enrollment for left amount
      const paidPerEnrollment: Record<number, number> = {};
      const discountPerEnrollment: Record<number, number> = {};
      for (const p of payments) {
        paidPerEnrollment[p.enrollment_id] = (paidPerEnrollment[p.enrollment_id] || 0) + (p.amount || 0);
        discountPerEnrollment[p.enrollment_id] = (discountPerEnrollment[p.enrollment_id] || 0) + (p.discount_amount || 0);
      }

      const wsPayments = XLSX.utils.json_to_sheet(payments.length ? payments.map((p: any) => {
        const courseCost = p.course_cost || 0;
        const totalPaidForEnroll = paidPerEnrollment[p.enrollment_id] || 0;
        return {
          "Receipt ID": p.payment_id,
          "Student Code": p.student_code,
          "Student Name": p.student_name,
          "Course Name": p.course_name,
          "Month": p.month,
          "Method": p.payment_method || "-",
          "Date": p.payment_date ? p.payment_date.slice(0, 10) : "-",
          "Course Amount (MMK)": courseCost,
          "Amount Paid (MMK)": p.amount,
          "Discount (MMK)": p.discount_amount || 0,
          "Fine Amount (MMK)": p.fine_amount || 0,
          "Extra Items Fee (MMK)": p.extra_items_fee || 0,
          "Extra Items": p.extra_items || "-",
          "Exam Fee Paid (GBP)": p.exam_fee_paid_gbp || 0,
          "Exam Fee Paid (MMK)": p.exam_fee_paid_mmk || 0,
          "Total Paid (MMK)": totalPaidForEnroll,
          "Left Amount (MMK)": Math.max(0, courseCost - totalPaidForEnroll - (discountPerEnrollment[p.enrollment_id] || 0)),
          "Status": p.status
        };
      }) : [{"Info": "No payments recorded"}]);
      XLSX.utils.book_append_sheet(wb, wsPayments, "All Payments");

      // Monthly Summary across the entire system
      const monthlyMap: Record<string, { totalPaid: number; count: number }> = {};
      for (const p of payments) {
        const key = p.month || "Unknown";
        if (!monthlyMap[key]) monthlyMap[key] = { totalPaid: 0, count: 0 };
        monthlyMap[key].totalPaid += p.amount || 0;
        monthlyMap[key].count += 1;
      }
      const monthlySummary = Object.entries(monthlyMap).map(([month, v]) => ({
        "Month": month,
        "Total Paid (MMK)": v.totalPaid,
        "No. of Payments": v.count
      }));
      const wsMonthlySummary = XLSX.utils.json_to_sheet(monthlySummary.length ? monthlySummary : [{"Info": "No monthly data"}]);
      XLSX.utils.book_append_sheet(wb, wsMonthlySummary, "Monthly Summary");

      const wsEnrollments = XLSX.utils.json_to_sheet(enrollments.length ? enrollments.map((e: any) => {
        const courseCost = e.course_cost || 0;
        const totalPaid = paidPerEnrollment[e.enrollment_id] || 0;
        const totalDiscount = discountPerEnrollment[e.enrollment_id] || 0;
        const leftAmount = Math.max(0, courseCost - (totalPaid + totalDiscount));
        return {
          "Enrollment ID": e.enrollment_id,
          "Student Name": e.student_name,
          "Course Name": e.course_name,
          "Batch": e.batch_no || "-",
          "Plan": e.payment_plan || "-",
          "Course Amount (MMK)": courseCost,
          "Deposit (MMK)": e.downpayment || 0,
          "Monthly Installment (MMK)": e.installment_amount || 0,
          "Total Paid (MMK)": totalPaid,
          "Total Discount (MMK)": totalDiscount,
          "Left Amount (MMK)": leftAmount,
          "FOC Items": e.foc_items || "-",
          "Status": e.status ? "Active" : "Inactive"
        };
      }) : [{"Info": "No enrollments found"}]);
      XLSX.utils.book_append_sheet(wb, wsEnrollments, "All Enrollments");

      const wsAttendance = XLSX.utils.json_to_sheet(attendance.length ? attendance.map((a: any) => ({
        "Date": a.attendance_date,
        "Student Name": a.username,
        "Slot": a.slot,
        "Status": a.check_today ? "Present" : "Absent"
      })) : [{"Info": "No attendance records"}]);
      XLSX.utils.book_append_sheet(wb, wsAttendance, "All Attendance");

      XLSX.writeFile(wb, `System_Backup_Data_${new Date().toISOString().slice(0,10)}.xlsx`);
    } catch (error) {
       toast.error("Failed to export backup. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Students</h1>
          <p className="text-slate-500 font-medium text-sm mt-1">Create, update, and delete student accounts.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              const link = `${window.location.origin}/register`;
              if (navigator.share) {
                navigator.share({
                  title: 'NiT Student Registration',
                  text: 'Please register using this link:',
                  url: link,
                }).catch(console.error);
              } else {
                navigator.clipboard.writeText(link).then(() => toast.success("Registration link copied to clipboard!"));
              }
            }}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold hover:bg-indigo-100 shadow-sm text-sm transition-all active:scale-95 whitespace-nowrap"
          >
            <span className="hidden xs:inline">Share Link</span>
            <span className="xs:hidden">Link</span>
          </button>
          <button
            onClick={load}
            disabled={busy}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 disabled:opacity-60 text-sm transition-all active:scale-95"
          >
            <RefreshCw className={`w-4 h-4 ${busy ? "animate-spin" : ""}`} />
            <span className="hidden xs:inline">Refresh</span>
          </button>
          <button
            onClick={exportAllData}
            disabled={busy}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 disabled:opacity-60 shadow-sm text-sm transition-all active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span className="hidden xs:inline">Export</span>
          </button>
          {isAdmin && (
            <button
              onClick={() => setClearAllOpen(true)}
              disabled={busy}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 shadow-sm disabled:opacity-60 text-sm transition-all active:scale-95"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Purge</span>
            </button>
          )}
          <button
            onClick={openCreate}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 text-white font-bold hover:bg-brand-700 shadow-sm text-sm transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span className="whitespace-nowrap">New Student</span>
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
              placeholder="Search by code, name, or email…"
              className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-slate-800 font-medium text-sm sm:text-base"
            />
          </div>
          {error && (
            <div 
              ref={errorRef}
              className="px-4 py-3 bg-red-50 border border-red-100 text-red-700 text-sm font-bold rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300 shadow-sm"
            >
              <AlertCircle size={16} className="shrink-0" />
              <div className="flex-1">{error}</div>
              <button onClick={() => setError(null)} className="p-1 hover:bg-red-100 rounded-lg transition-colors"><X size={14} /></button>
            </div>
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/80 text-xs uppercase font-semibold text-slate-500 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 whitespace-nowrap">Code</th>
                <th className="px-6 py-4">Pic</th>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">DOB</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filtered.map((s: AdminStudent) => (
                <tr key={s.user_code} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-bold text-slate-800">{s.user_code}</td>
                  <td className="px-6 py-4">
                    {s.profile_picture ? (
                      <div className="relative group w-8 h-8">
                        <img src={s.profile_picture} alt="Profile" className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200 shadow-sm" />
                        <a href={s.profile_picture} download={`pic_${s.user_code}`} className="absolute inset-0 bg-black/40 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" title="Download Image" onClick={e => e.stopPropagation()}>
                          <Download className="w-3 h-3" />
                        </a>
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-400 uppercase">
                        {s.username?.[0] || "?"}
                      </div>
                    )}
                  </td>
                  <td 
                    className="px-6 py-4 font-semibold text-brand-600 hover:text-brand-700 hover:underline cursor-pointer" 
                    onClick={() => openView(s)}
                  >
                    {s.username}
                  </td>
                  <td className="px-6 py-4">{s.email}</td>
                  <td className="px-6 py-4">{s.data_of_birth ? s.data_of_birth.slice(0, 10) : "-"}</td>
                  <td className="px-6 py-4">
                    <span
                      className={[
                        "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border",
                        s.is_active ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-slate-100 text-slate-600 border-slate-200",
                      ].join(" ")}
                    >
                      {s.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-2">
                      {!s.is_active && (
                        <button
                          onClick={() => handleApprove(s)}
                          disabled={busy}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 text-white font-bold hover:bg-brand-700 shadow-sm disabled:opacity-60 transition-all active:scale-95 text-xs"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Approve
                        </button>
                      )}
                      {isAdmin && (
                        <button
                          onClick={() => openEdit(s)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition-all active:scale-95 text-xs"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          Edit
                        </button>
                      )}
                      {isAdmin && (
                        <button
                          onClick={() => doDelete(s)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-red-200 text-red-600 font-bold hover:bg-red-50 transition-all active:scale-95 text-xs"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-slate-400 font-medium">
                    {busy ? "Loading…" : "No students found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile/Tablet Card View */}
        <div className="block lg:hidden divide-y divide-slate-100">
          {filtered.map((s: AdminStudent) => (
            <div key={s.user_code} className="p-4 bg-white hover:bg-slate-50/50 transition-colors space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {s.profile_picture ? (
                    <img src={s.profile_picture} alt="Profile" className="w-12 h-12 rounded-full object-cover ring-2 ring-slate-100 shadow-sm" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-sm font-bold text-slate-400 uppercase">
                      {s.username?.[0] || "?"}
                    </div>
                  )}
                  <div>
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">{s.user_code}</div>
                    <div className="text-base font-bold text-brand-600 cursor-pointer hover:underline" onClick={() => openView(s)}>{s.username}</div>
                    <div className="text-xs text-slate-500 truncate max-w-[150px]">{s.email}</div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                   <span
                      className={[
                        "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border",
                        s.is_active ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-slate-100 text-slate-600 border-slate-200",
                      ].join(" ")}
                    >
                      {s.is_active ? "Active" : "Inactive"}
                    </span>
                    <div className="flex gap-2">
                      {!s.is_active && (
                        <button
                          onClick={() => handleApprove(s)}
                          disabled={busy}
                          className="w-10 h-10 flex items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm transition-all active:scale-90"
                          title="Approve"
                        >
                          <Check className="w-5 h-5" />
                        </button>
                      )}
                      {isAdmin && (
                        <button
                          onClick={() => openEdit(s)}
                          className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 text-slate-600 border border-slate-200 transition-all active:scale-90"
                          title="Edit"
                        >
                          <Pencil className="w-5 h-5" />
                        </button>
                      )}
                      {isAdmin && (
                        <button
                          onClick={() => doDelete(s)}
                          className="w-10 h-10 flex items-center justify-center rounded-xl bg-red-50 text-red-600 border border-red-100 transition-all active:scale-90"
                          title="Delete"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3 text-sm pt-1">
                <div className="bg-slate-50 p-2 rounded-lg border border-slate-100/50">
                  <div className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">DOB</div>
                  <div className="font-semibold text-slate-700">
                    {s.data_of_birth ? s.data_of_birth.slice(0, 10) : "-"}
                  </div>
                </div>
                <div className="bg-slate-50 p-2 rounded-lg border border-slate-100/50">
                  <div className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">Phone</div>
                  <div className="font-semibold text-slate-700 truncate">
                    {s.phone || "-"}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="p-10 text-center text-slate-400 font-medium text-sm">
              {busy ? "Loading…" : "No students found."}
            </div>
          )}
        </div>

        {pagination && (pagination.total_pages || 0) > 1 && (
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="text-sm text-slate-500">
              Showing <span className="font-semibold text-slate-900">{((page - 1) * limit) + 1}</span> to <span className="font-semibold text-slate-900">{Math.min(page * limit, pagination.total_count || 0)}</span> of <span className="font-semibold text-slate-900">{pagination.total_count || 0}</span> students
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                Previous
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, pagination.total_pages) }, (_, i) => {
                  let pageNum: number;
                  if (pagination.total_pages <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= (pagination.total_pages || 0) - 2) {
                    pageNum = (pagination.total_pages || 0) - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }
                  if (pageNum <= 0) return null;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                        page === pageNum
                          ? "bg-brand-600 text-white shadow-sm"
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setPage(p => Math.min(pagination.total_pages || 1, p + 1))}
                disabled={page === pagination.total_pages}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      <Modal title="Create Student" open={createOpen} onClose={() => setCreateOpen(false)}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {error && (
            <div className="sm:col-span-2 p-4 bg-red-50 border border-red-100 text-red-700 text-xs font-bold rounded-2xl flex items-start gap-3 animate-in fade-in duration-300">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-extrabold mb-0.5 uppercase tracking-tighter">Registration Error</p>
                {error}
              </div>
            </div>
          )}
          <div className="sm:col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Profile Picture</label>
            <div className="flex items-center gap-4">
              {cProfilePicture ? (
                <div className="relative group w-12 h-12 shrink-0">
                  <img src={cProfilePicture} alt="Preview" className="w-12 h-12 rounded-full object-cover ring-2 ring-slate-100 shadow-sm" />
                  <button onClick={() => setCProfilePicture("")} className="absolute inset-0 bg-black/40 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" title="Remove image">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="w-12 h-12 shrink-0 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
                  <Plus className="w-5 h-5" />
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleProfilePicChange}
                className="w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100 cursor-pointer"
              />
            </div>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Student Code (Optional)</label>
            <input
              value={cUserCode}
              onChange={(e) => setCUserCode(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              placeholder="Leave empty to auto-calculate (e.g. CO0011226)"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Full name</label>
            <input
              value={cUsername}
              onChange={(e) => setCUsername(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              placeholder="Student name"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email</label>
            <input
              value={cEmail}
              onChange={(e) => setCEmail(e.target.value)}
              type="email"
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              placeholder="student@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Password</label>
            <input
              value={cPassword}
              onChange={(e) => setCPassword(e.target.value)}
              type="password"
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              placeholder="Min 6 characters"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Date of birth</label>
            <input
              value={cDob}
              onChange={(e) => setCDob(e.target.value)}
              type="date"
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">NRC</label>
            <input
              value={cNrc}
              onChange={(e) => setCNrc(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              placeholder="e.g. 12/DaGaMa(N)123456"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Phone Number</label>
            <input
              value={cPhone}
              onChange={(e) => setCPhone(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              placeholder="e.g. 0912345678"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Department</label>
            <select
              value={cDepartment}
              onChange={(e) => setCDepartment(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-slate-800 font-medium cursor-pointer"
            >
              <option value="College">College (CO)</option>
              <option value="Institute">Institute (IN)</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Student Type</label>
            <select
              value={cStudentType}
              onChange={(e) => setCStudentType(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-slate-800 font-medium cursor-pointer"
            >
              <option value="New Student">New Student</option>
              <option value="Old Student">Old Student</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">How Did You Hear About Us?</label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {["Facebook", "TikTok", "Friend Referral", "Family Referral", "Online Search", "NiT Event", "Other (Please Specify)"].map((option) => (
                <label key={option} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cHowDidYouHear.includes(option)}
                    onChange={(e) => {
                      if (e.target.checked) setCHowDidYouHear((prev) => [...prev, option]);
                      else setCHowDidYouHear((prev) => prev.filter((item) => item !== option));
                    }}
                    className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                  <span className="text-sm text-slate-700">{option}</span>
                </label>
              ))}
            </div>
            {cHowDidYouHear.includes("Other (Please Specify)") && (
              <input
                type="text"
                value={cOtherHear}
                onChange={(e) => setCOtherHear(e.target.value)}
                placeholder="Please specify"
                className="mt-2 w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-sm"
              />
            )}
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Address</label>
            <input
              value={cAddress}
              onChange={(e) => setCAddress(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              placeholder="Full address details"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Parent Name</label>
            <input
              value={cParentName}
              onChange={(e) => setCParentName(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              placeholder="e.g. U Kyaw"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Parent Phone</label>
            <input
              value={cParentPhone}
              onChange={(e) => setCParentPhone(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              placeholder="e.g. 0987654321"
            />
          </div>
          <div className="sm:col-span-2 flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
            <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={cActive}
                onChange={(e) => setCActive(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              Active
            </label>
          </div>

          {/* New Enrollment Block */}
          <div className="sm:col-span-2 mt-4 pt-4 border-t border-slate-100">
            <h4 className="font-bold text-slate-800 mb-3">Course Enrollment (Optional)</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Select Course</label>
                <select
                  value={cCourseCode}
                  onChange={(e) => setCCourseCode(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                >
                  <option value="">No course (skip enrollment)</option>
                  {courses.map(c => (
                    <option key={c.course_code} value={c.course_code}>{c.course_name}</option>
                  ))}
                </select>
              </div>

              {cCourseCode && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Batch</label>
                    {cBatches.length > 0 ? (
                      <select
                        value={cBatchId}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCBatchId(val ? (val === "manual" ? "manual" : Number(val)) : "");
                          if (val !== "manual" && val !== "") {
                            const b = cBatches.find(x => x.batch_id === Number(val));
                            if (b) setCBatchNo(b.batch_no);
                          } else if (val === "manual") {
                            setCBatchNo("");
                          }
                        }}
                        className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                      >
                        <option value="">Select Existing Batch...</option>
                        {cBatches.map(b => (
                          <option key={b.batch_id} value={b.batch_id}>{b.batch_no}</option>
                        ))}
                        <option value="manual">Enter New Batch Name...</option>
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={cBatchNo}
                        onChange={(e) => setCBatchNo(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                        placeholder="e.g. Batch 1"
                      />
                    )}
                    {cBatchId === "manual" && (
                      <input
                        type="text"
                        value={cBatchNo}
                        onChange={(e) => setCBatchNo(e.target.value)}
                        className="mt-2 w-full px-3 py-2.5 rounded-xl bg-yellow-50 border border-yellow-200 focus:outline-none focus:ring-2 focus:ring-yellow-500/20"
                        placeholder="Enter new batch name..."
                      />
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Payment Plan</label>
                    <select
                      value={cPaymentPlan}
                      onChange={(e) => setCPaymentPlan(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                    >
                      <option value="">Select Plan...</option>
                      <option value="full">Full Payment</option>
                      <option value="installment">Installment</option>
                    </select>
                  </div>
                  
                  {cPaymentPlan === "installment" && (
                    <>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Deposit (Optional, MMK)</label>
                        <input
                          type="number"
                          value={cDownpayment}
                          onChange={(e) => setCDownpayment(e.target.value ? Number(e.target.value) : "")}
                          className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                          placeholder="e.g. 2000000"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Monthly Installment (MMK)</label>
                        <input
                          type="number"
                          value={cInstallment}
                          onChange={(e) => setCInstallment(e.target.value ? Number(e.target.value) : "")}
                          className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                          placeholder="e.g. 300000"
                        />
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
          {/* End New Enrollment Block */}

          <div className="sm:col-span-2 flex justify-end">
            <button
              onClick={submitCreate}
              disabled={combinedLoading || !cUsername.trim() || !cEmail.trim() || cPassword.length < 6 || !cDob}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 text-white font-bold hover:bg-brand-700 disabled:opacity-60 transition-all active:scale-95 shadow-sm"
            >
              {createMutation.isPending && <RefreshCw className="w-4 h-4 animate-spin" />}
              {createMutation.isPending ? "Creating..." : "Create Student"}
            </button>
          </div>
        </div>
      </Modal>

      <Modal title={`Edit Student${selected ? ` — ${selected.user_code}` : ""}`} open={editOpen} onClose={() => setEditOpen(false)}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {error && (
            <div className="sm:col-span-2 p-4 bg-red-50 border border-red-100 text-red-700 text-xs font-bold rounded-2xl flex items-start gap-3 animate-in fade-in duration-300">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-extrabold mb-0.5 uppercase tracking-tighter">Update Error</p>
                {error}
              </div>
            </div>
          )}
          <div className="sm:col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Full name</label>
            <input
              value={eUsername}
              onChange={(e) => setEUsername(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email</label>
            <input
              value={eEmail}
              onChange={(e) => setEEmail(e.target.value)}
              type="email"
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Date of birth</label>
            <input
              value={eDob}
              onChange={(e) => setEDob(e.target.value)}
              type="date"
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
          </div>
          <div className="flex items-end">
            <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 pb-1">
              <input
                type="checkbox"
                checked={eActive}
                onChange={(e) => setEActive(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              Active
            </label>
          </div>

          <div className="sm:col-span-2">
            <div className="mt-2 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-bold text-slate-800">Relations</div>
                {relationsLoading && <div className="text-xs font-semibold text-slate-500">Loading…</div>}
              </div>
              {!relationsLoading && relations && (
                <div className="mt-3 grid grid-cols-3 gap-3">
                  <div className="rounded-xl bg-white border border-slate-200 p-3">
                    <div className="text-xs font-semibold text-slate-500">Enrollments</div>
                    <div className="text-xl font-extrabold text-slate-800 mt-1">{relations.enrollments.length}</div>
                  </div>
                  <div className="rounded-xl bg-white border border-slate-200 p-3">
                    <div className="text-xs font-semibold text-slate-500">Attendance</div>
                    <div className="text-xl font-extrabold text-slate-800 mt-1">{relations.attendance.length}</div>
                  </div>
                  <div className="rounded-xl bg-white border border-slate-200 p-3">
                    <div className="text-xs font-semibold text-slate-500">Parents</div>
                    <div className="text-xl font-extrabold text-slate-800 mt-1">{relations.parents.length}</div>
                  </div>
                </div>
              )}
              {!relationsLoading && !relations && (
                <div className="mt-2 text-sm text-slate-500 font-medium">No relation data available.</div>
              )}
            </div>
          </div>

          <div className="sm:col-span-2 flex items-center justify-end gap-2 pt-2">
            <button
              onClick={() => setEditOpen(false)}
              className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={submitEdit}
              disabled={combinedLoading || !selected}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 text-white font-bold hover:bg-brand-700 disabled:opacity-60 transition-all active:scale-95 shadow-sm"
            >
              {updateMutation.isPending && <RefreshCw className="w-4 h-4 animate-spin" />}
              {updateMutation.isPending ? "Saving..." : "Save changes"}
            </button>
          </div>
        </div>
      </Modal>

      <Modal title={`Configure Enrollment${enrollToEdit ? ` — ${enrollToEdit.course_name}` : ""}`} open={enrollEditOpen} onClose={() => setEnrollEditOpen(false)}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Batch Number</label>
            <input
              value={eBatch}
              onChange={(e) => setEBatch(e.target.value)}
              placeholder="e.g. Batch 1"
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Payment Plan</label>
            <select
              value={ePlan}
              onChange={(e) => setEPlan(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            >
              <option value="full">Cash Down</option>
              <option value="installment">Installment</option>
            </select>
          </div>
          <div className="sm:col-span-2 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Downpayment (MMK)</label>
              <input
                value={eDown}
                onChange={(e) => setEDown(e.target.value)}
                type="number"
                placeholder="0"
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Monthly Paid (MMK)</label>
              <input
                value={eInst}
                onChange={(e) => setEInst(e.target.value)}
                type="number"
                placeholder="0"
                className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </div>
          </div>

          <div className="sm:col-span-2 flex items-center justify-end gap-2 pt-2">
            <button
              onClick={() => setEnrollEditOpen(false)}
              className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={submitEnrollEdit}
              disabled={busy}
              className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-brand-600 text-white font-bold hover:bg-brand-700 disabled:opacity-60"
            >
              Update Info
            </button>
          </div>
        </div>
      </Modal>

      <Modal title="Student Details" open={viewOpen} onClose={() => setViewOpen(false)}>
        {selected && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-6 items-start bg-slate-50 p-6 rounded-xl border border-slate-100">
              <div className="flex flex-col items-center gap-3 shrink-0 w-full sm:w-auto">
                {selected.profile_picture ? (
                  <>
                    <img src={selected.profile_picture} alt="Profile" className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover ring-4 ring-white shadow-sm" />
                    <a href={selected.profile_picture} download={`pic_${selected.user_code}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-slate-50 shadow-sm">
                      <Download className="w-3.5 h-3.5" />
                      Download Pic
                    </a>
                  </>
                ) : (
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-slate-200 border-4 border-white shadow-sm flex items-center justify-center text-4xl font-bold text-slate-400 uppercase">
                    {selected.username?.[0] || "?"}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4 w-full">
                <div className="col-span-2 sm:col-span-1">
                  <div className="text-xs font-semibold text-slate-500 uppercase">Student Code</div>
                  <div className="font-semibold text-slate-800 mt-1">{selected.user_code}</div>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <div className="text-xs font-semibold text-slate-500 uppercase">Full Name</div>
                  <div className="font-semibold text-slate-800 mt-1">{selected.username}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-xs font-semibold text-slate-500 uppercase">Email</div>
                  <div className="font-semibold text-slate-800 mt-1">{selected.email}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-500 uppercase">Date of Birth</div>
                  <div className="font-semibold text-slate-800 mt-1">{selected.data_of_birth ? selected.data_of_birth.slice(0, 10) : "-"}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-500 uppercase">Status</div>
                  <div className="mt-1">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold border ${selected.is_active ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-slate-100 text-slate-600 border-slate-200"}`}>
                      {selected.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
                <div className="col-span-2">
                  <div className="text-xs font-semibold text-slate-500 uppercase">Student Type</div>
                  <div className="font-semibold text-slate-800 mt-1">{selected.student_type || "New Student"}</div>
                </div>
                {selected.intended_course_code && (
                  <div className="col-span-2 mt-2">
                    <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm transition-all hover:bg-amber-100/50">
                      <div>
                        <div className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Interest Showcase (From Register)</div>
                        <div className="font-bold text-slate-800 mt-1 flex items-center gap-2 text-lg">
                          <Check className="w-5 h-5 text-amber-500" />
                          {(courses.find(c => c.course_code === selected.intended_course_code))?.course_name || selected.intended_course_code}
                        </div>
                      </div>
                      {(!relations || relations.enrollments.length === 0) && (
                        <button 
                          onClick={() => handleFastEnroll(selected.user_code, selected.intended_course_code!)}
                          className="w-full sm:w-auto bg-amber-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-amber-700 shadow-lg shadow-amber-200/50 flex items-center justify-center gap-2 transition-all active:scale-95"
                        >
                          <Plus className="w-4 h-4" strokeWidth={3} />
                          Formalize Enrollment
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div className="col-span-2">
                <div className="text-xs font-semibold text-slate-500 uppercase">NRC</div>
                <div className="font-semibold text-slate-800 mt-1">{selected.nrc || "-"}</div>
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-500 uppercase">Phone Number</div>
                <div className="font-semibold text-slate-800 mt-1">{selected.phone || "-"}</div>
              </div>
              <div className="col-span-2">
                <div className="text-xs font-semibold text-slate-500 uppercase">Address</div>
                <div className="font-semibold text-slate-800 mt-1">{selected.address || "-"}</div>
              </div>
              <div className="col-span-2">
                <div className="text-xs font-semibold text-slate-500 uppercase">How Did You Hear About Us?</div>
                <div className="font-semibold text-slate-800 mt-1">{selected.how_did_you_hear || "-"}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div>
                <div className="text-xs font-semibold text-slate-500 uppercase">Parent Name</div>
                <div className="font-semibold text-slate-800 mt-1">{selected.parent_name || "-"}</div>
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-500 uppercase">Parent Phone</div>
                <div className="font-semibold text-slate-800 mt-1">{selected.parent_phone || "-"}</div>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-semibold text-slate-500 uppercase">Enrollments & Payment Info</div>
                {relationsLoading && <div className="text-xs font-semibold text-slate-400">Loading...</div>}
              </div>
              {!relationsLoading && relations && relations.enrollments.length > 0 ? (
                <div className="space-y-3">
                  {relations.enrollments.map((enr, i) => (
                    <div key={i} className="bg-white p-3 rounded-lg border border-slate-200">
                      <div className="font-semibold text-slate-800 flex items-center justify-between">
                        <span>{enr.course_name}</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEnrollEdit(enr)}
                            className="bg-brand-50 text-brand-700 px-2 py-1 rounded text-[10px] uppercase font-bold border border-brand-100 hover:bg-brand-100"
                          >
                            Settings
                          </button>
                          <button
                            onClick={() => router.push(`/admin/payments?q=${selected?.user_code}`)}
                            className="bg-brand-50 text-brand-700 px-2 py-1 rounded text-[10px] uppercase font-bold border border-brand-100 hover:bg-brand-100"
                          >
                            Add Payment
                          </button>
                          <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${enr.status ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                            {enr.status ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                      <div className="mt-2 text-sm grid grid-cols-2 gap-2 text-slate-600">
                        <div><span className="font-semibold text-slate-500">Batch:</span> {enr.batch_no || "-"}</div>
                        <div><span className="font-semibold text-slate-500">Plan:</span> {enr.payment_plan === "full" ? "Cash Down" : enr.payment_plan === "installment" ? "Installment" : "-"}</div>
                        {enr.payment_plan === "installment" && (
                          <>
                            <div><span className="font-semibold text-slate-500">Downpayment:</span> {enr.downpayment ? `${formatAmount(enr.downpayment)} MMK` : "-"}</div>
                            <div><span className="font-semibold text-slate-500">Monthly:</span> {enr.installment_amount ? `${formatAmount(enr.installment_amount)} MMK` : "-"}</div>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : !relationsLoading && relations && relations.enrollments.length === 0 ? (
                <div className="text-sm font-medium text-slate-500">No enrollments found for this student.</div>
              ) : null}
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-semibold text-slate-500 uppercase">Payment Receipts</div>
                {relationsLoading && <div className="text-xs font-semibold text-slate-400">Loading...</div>}
              </div>
              {!relationsLoading && relations && relations.payments && relations.payments.length > 0 ? (
                <div className="space-y-3">
                  {relations.payments.map((p, i) => (
                    <div key={`pay-${i}`} className="bg-white p-3 rounded-lg border border-slate-200">
                      <div className="font-semibold text-slate-800 flex items-center justify-between">
                        <span>{p.course_name} ({p.month})</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${p.status?.toLowerCase() === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-600 border-red-200'}`}>
                          {p.status || "Unknown"}
                        </span>
                      </div>
                      <div className="mt-2 text-sm grid grid-cols-2 gap-2 text-slate-600">
                        <div><span className="font-semibold text-slate-500">Method:</span> {p.payment_method || "-"}</div>
                        <div><span className="font-semibold text-slate-500">Amount:</span> {formatAmount(p.amount)} MMK</div>
                        {p.discount_amount != null && p.discount_amount > 0 && (
                          <div className="col-span-2 text-emerald-600 font-semibold italic"><span className="font-semibold text-slate-500">Discount:</span> -{formatAmount(p.discount_amount)} MMK</div>
                        )}
                        <div><span className="font-semibold text-slate-500">Date:</span> {p.payment_date ? p.payment_date.slice(0, 10) : "-"}</div>
                        <div><span className="font-semibold text-slate-500">Receipt ID:</span> #{p.payment_id}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : !relationsLoading && relations && (!relations.payments || relations.payments.length === 0) ? (
                <div className="text-sm font-medium text-slate-500">No payment receipts found for this student.</div>
              ) : null}
            </div>
            
            <div className="flex justify-end gap-2 pt-2">
              {!selected.is_active && (
                <button
                  onClick={() => handleApprove(selected)}
                  disabled={busy}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 text-white font-bold hover:bg-brand-700 shadow-sm disabled:opacity-60"
                >
                  <Check className="w-4 h-4" />
                  Approve Student
                </button>
              )}
              <button
                onClick={exportSelectedStudent}
                disabled={relationsLoading}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 disabled:opacity-60"
              >
                <Download className="w-4 h-4" />
                Export to Excel
              </button>
              <button
                onClick={() => setViewOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Approval Modal */}
      <Modal 
          title="Approve Student Account" 
          open={approveOpen} 
          onClose={() => setApproveOpen(false)}
      >
          <div className="space-y-6">
              {error && (
                <div className="p-4 bg-red-50 border border-red-100 text-red-700 text-xs font-bold rounded-2xl flex items-start gap-3 animate-in fade-in duration-300">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-extrabold mb-0.5 uppercase tracking-tighter">Approval Error</p>
                    {error}
                  </div>
                </div>
              )}
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 italic text-sm text-amber-800">
                  Review or change the student code before activating the account. 
                  You can either set a manual code or auto-generate one with a prefix.
              </div>

              <div className="space-y-4">
                  <label className="block text-sm font-bold text-slate-700">Code Assignment Method</label>
                  <div className="grid grid-cols-3 gap-2">
                      <button 
                          onClick={() => setApprovePrefix("")}
                          className={`py-3 rounded-2xl border-2 text-sm font-bold transition-all ${approvePrefix === "" ? 'border-[#0d4d4d] bg-[#0d4d4d]/5 text-[#0d4d4d]' : 'border-slate-100 text-slate-500 hover:border-slate-200'}`}
                      >
                          Manual
                      </button>
                      <button 
                          onClick={() => setApprovePrefix("CO")}
                          className={`py-3 rounded-2xl border-2 text-sm font-bold transition-all ${approvePrefix === "CO" ? 'border-[#0d4d4d] bg-[#0d4d4d]/5 text-[#0d4d4d]' : 'border-slate-100 text-slate-500 hover:border-slate-200'}`}
                      >
                          Auto CO
                      </button>
                      <button 
                          onClick={() => setApprovePrefix("IN")}
                          className={`py-3 rounded-2xl border-2 text-sm font-bold transition-all ${approvePrefix === "IN" ? 'border-[#0d4d4d] bg-[#0d4d4d]/5 text-[#0d4d4d]' : 'border-slate-100 text-slate-500 hover:border-slate-200'}`}
                      >
                          Auto IN
                      </button>
                  </div>
              </div>

              {approvePrefix === "" && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
                      <label className="block text-sm font-bold text-slate-700">Student Code (Manual)</label>
                      <input 
                          value={approveManualCode}
                          onChange={(e) => setApproveManualCode(e.target.value)}
                          className="w-full px-4 py-3.5 bg-slate-50 rounded-2xl border border-slate-200 focus:border-[#0d4d4d] focus:bg-white focus:outline-none transition-all font-mono tracking-wider text-slate-900"
                      />
                  </div>
              )}

              {approvePrefix !== "" && (
                  <div className="p-5 bg-[#0d4d4d]/5 rounded-3xl border border-[#0d4d4d]/10 flex items-center gap-4 animate-in fade-in slide-in-from-top-1">
                      <div className="w-12 h-12 bg-[#0d4d4d] text-white rounded-2xl flex items-center justify-center font-bold text-xl">
                          {approvePrefix}
                      </div>
                      <div className="text-sm text-[#0d4d4d]">
                          <p className="font-bold">System Managed</p>
                          <p className="opacity-70">A new sequence number will be generated for prefix <span className="font-mono">{approvePrefix}</span></p>
                      </div>
                  </div>
              )}

              <div className="pt-4 border-t border-slate-100 flex gap-3">
                  <button 
                        onClick={() => setApproveOpen(false)}
                        className="flex-1 py-4 text-slate-500 font-bold rounded-2xl hover:bg-slate-50 transition-all border-2 border-transparent"
                  >
                      Cancel
                  </button>
                  <button 
                        onClick={submitApprove}
                        disabled={busy}
                        className="flex-[2] py-4 bg-[#0d4d4d] text-white font-bold rounded-2xl hover:bg-[#0d4d4d]/90 active:scale-95 transition-all shadow-lg shadow-[#0d4d4d]/20 disabled:opacity-50"
                  >
                      Confirm Approval
                  </button>
              </div>
          </div>
      </Modal>

      {/* Formalize Enrollment Modal */}
      <Modal 
        title={`Formalize Enrollment — ${(courses.find(c => c.course_code === fCourseCode))?.course_name || fCourseCode}`} 
        open={formalizeOpen} 
        onClose={() => setFormalizeOpen(false)}
      >
          <div className="space-y-4">
              {error && (
                <div className="p-4 bg-red-50 border border-red-100 text-red-700 text-xs font-bold rounded-2xl animate-in fade-in duration-300">
                  {error}
                </div>
              )}
              <div className="p-4 bg-brand-50 rounded-2xl border border-brand-100 text-sm text-brand-800">
                  Completing this will convert the student's interest into a formal course enrollment.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                      <label className="block text-sm font-bold text-slate-700 mb-1.5">Course</label>
                      <input 
                        value={(courses.find(c => c.course_code === fCourseCode))?.course_name || fCourseCode}
                        disabled
                        className="w-full px-4 py-3 bg-slate-100 rounded-2xl border border-slate-200 text-slate-500 cursor-not-allowed"
                      />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Batch</label>
                    {fBatches.length > 0 ? (
                      <select
                        value={fBatchId}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFBatchId(val ? (val === "manual" ? "manual" : Number(val)) : "");
                          if (val !== "manual" && val !== "") {
                            const b = fBatches.find(x => x.batch_id === Number(val));
                            if (b) setFBatchNo(b.batch_no);
                          } else if (val === "manual") {
                            setFBatchNo("");
                          }
                        }}
                        className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                      >
                        <option value="">Select Existing Batch...</option>
                        {fBatches.map(b => (
                          <option key={b.batch_id} value={b.batch_id}>{b.batch_no}</option>
                        ))}
                        <option value="manual">Enter New Batch Name...</option>
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={fBatchNo}
                        onChange={(e) => setFBatchNo(e.target.value)}
                        placeholder="e.g. Batch 1"
                        className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                      />
                    )}
                    {fBatchId === "manual" && (
                      <input
                        type="text"
                        value={fBatchNo}
                        onChange={(e) => setFBatchNo(e.target.value)}
                        placeholder="Enter manual batch name..."
                        className="mt-2 w-full px-3 py-2.5 rounded-xl bg-yellow-50 border border-yellow-200 focus:outline-none focus:ring-2 focus:ring-yellow-500/20"
                      />
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Payment Plan</label>
                    <select
                      value={fPlan}
                      onChange={(e) => setFPlan(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                    >
                      <option value="">Select Plan...</option>
                      <option value="full">Cash Down</option>
                      <option value="installment">Installment</option>
                    </select>
                  </div>
                  
                  {fPlan === "installment" && (
                    <>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Deposit (MMK)</label>
                        <input
                          type="number"
                          value={fDown}
                          onChange={(e) => setFDown(e.target.value ? Number(e.target.value) : "")}
                          placeholder="0"
                          className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Monthly Paid (MMK)</label>
                        <input
                          type="number"
                          value={fInst}
                          onChange={(e) => setFInst(e.target.value ? Number(e.target.value) : "")}
                          placeholder="0"
                          className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                        />
                      </div>
                    </>
                  )}
              </div>

              <div className="pt-4 border-t border-slate-100 flex gap-3">
                  <button 
                        onClick={() => setFormalizeOpen(false)}
                        className="flex-1 py-3 text-slate-500 font-bold rounded-xl hover:bg-slate-50 transition-all"
                  >
                      Cancel
                  </button>
                  <button 
                        onClick={submitFormalize}
                        disabled={busy || !fPlan}
                        className="flex-[2] py-3 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-700 transition-all shadow-lg shadow-brand-200/50 disabled:opacity-50"
                  >
                      Formalize Enrollment
                  </button>
              </div>
          </div>
      </Modal>

      {/* Confirmation Modals */}
      <ConfirmModal 
        open={!!studentToDelete}
        onClose={() => setStudentToDelete(null)}
        onConfirm={executeDelete}
        title="Delete Student"
        message={`Are you sure you want to delete student ${studentToDelete?.user_code} (${studentToDelete?.username})? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />



      <ConfirmModal 
        open={clearAllOpen}
        onClose={() => setClearAllOpen(false)}
        onConfirm={async () => {
          try {
            setBusy(true);
            await AdminService.purgeData();
            await refetchStudents();
          } catch (err: any) {
            handleError(err, "Failed to purge data");
          } finally {
            setBusy(false);
            setClearAllOpen(false);
          }
        }}
        title="CRITICAL: Purge All Data"
        message="This will DELETE all system data including students, courses, enrollments, attendance, and more. Only administrator accounts will remain. Are you absolutely certain?"
        confirmText="YES, I AM SURE"
        variant="danger"
        isLoading={busy}
      />
    </div>
  );
}

