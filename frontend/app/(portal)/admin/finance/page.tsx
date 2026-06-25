"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { 
  BarChart as BarChartIcon, Landmark, BookOpen, FileSpreadsheet, Wallet, 
  ArrowDownRight, ArrowUpRight, Search, Plus, Filter, 
  Check, X, Download, FileText, Loader2, ArrowLeftRight, 
  CreditCard, ChevronRight, User, Trash2, Calendar, AlertCircle, Receipt
} from "lucide-react";
import { 
  AdminService, Account, JournalEntry, BookLogEntry, 
  Expense, BudgetVsActual, TrialBalance, IncomeStatement, 
  BalanceSheet, AdminStudent, StudentLedgerEntry 
} from "@/services/admin.service";
import { useAuth } from "@/hooks/useAuth";
import { exportToExcel } from "@/utils/excelExport";
import { toast } from "sonner";
import { formatAmount } from "@/utils/format";
import { generateReceiptPDF } from "@/utils/pdfReceipt";
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, 
  Tooltip, BarChart, Bar, Legend, CartesianGrid 
} from "recharts";
import clsx from "clsx";

const formatPaymentDate = (dateStr: string) => {
  if (!dateStr) return "N/A";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
  } catch (e) {
    return dateStr;
  }
};

export default function FinancePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const isAllowed = user?.role === "accountant";
  const isReadOnly = false;

  // Navigation Guard
  useEffect(() => {
    if (!authLoading && !isAllowed) {
      router.replace("/dashboard");
    }
  }, [authLoading, isAllowed, router]);

  // Tab State
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isMounted, setIsMounted] = useState(false);
  const [loading, setLoading] = useState(false);

  // Filter States
  const [activeFilter, setActiveFilter] = useState<"day" | "week" | "month" | "all">("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const getDateRangeForFilter = (filter: "day" | "week" | "month" | "all") => {
    const today = new Date();
    let start = "";
    let end = "";
    
    const formatLocalYmd = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    };

    if (filter === "day") {
      start = formatLocalYmd(today);
      end = formatLocalYmd(today);
    } else if (filter === "week") {
      const currentDay = today.getDay(); // 0 is Sunday, 1 is Monday...
      const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
      const monday = new Date(today);
      monday.setDate(today.getDate() + distanceToMonday);
      start = formatLocalYmd(monday);
      end = formatLocalYmd(today);
    } else if (filter === "month") {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      start = formatLocalYmd(firstDay);
      end = formatLocalYmd(today);
    }
    return { start, end };
  };

  const handleFilterSelect = (filter: "day" | "week" | "month" | "all") => {
    setActiveFilter(filter);
    const { start, end } = getDateRangeForFilter(filter);
    setStartDate(start);
    setEndDate(end);
  };

  const [expCategory, setExpCategory] = useState("");
  const [expStatus, setExpStatus] = useState("");
  const [expDept, setExpDept] = useState("");
  const [trendType, setTrendType] = useState<"daily" | "weekly" | "monthly">("weekly");
  const [incomeCurrency, setIncomeCurrency] = useState<"MMK" | "GBP">("MMK");

  // Data States
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [incomeReport, setIncomeReport] = useState<any>(null);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [cashBook, setCashBook] = useState<BookLogEntry[]>([]);
  const [bankBook, setBankBook] = useState<BookLogEntry[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [budgetVsActual, setBudgetVsActual] = useState<BudgetVsActual[]>([]);
  const [trialBalance, setTrialBalance] = useState<TrialBalance | null>(null);
  const [incomeStatement, setIncomeStatement] = useState<IncomeStatement | null>(null);
  const [balanceSheet, setBalanceSheet] = useState<BalanceSheet | null>(null);
  const [students, setStudents] = useState<AdminStudent[]>([]);
  
  // Student Ledger States
  const [selectedStudent, setSelectedStudent] = useState<AdminStudent | null>(null);
  const [studentLedger, setStudentLedger] = useState<StudentLedgerEntry[]>([]);
  const [studentSearch, setStudentSearch] = useState("");
  const [studentLedgerLoading, setStudentLedgerLoading] = useState(false);
  const [studentPayments, setStudentPayments] = useState<any[]>([]);

  // Drilldown states
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [selectedAccountLines, setSelectedAccountLines] = useState<any[]>([]);
  const [accDrillLoading, setAccDrillLoading] = useState(false);

  // Modals
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [journalModalOpen, setJournalModalOpen] = useState(false);
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);

  // Form States - Create Account
  const [newAccName, setNewAccName] = useState("");
  const [newAccType, setNewAccType] = useState("Asset");
  const [newAccCurrency, setNewAccCurrency] = useState("MMK");

  // Form States - Create Journal Entry
  const [jeDescription, setJeDescription] = useState("");
  const [jeReference, setJeReference] = useState("");
  const [jeDate, setJeDate] = useState("");
  const [jeLines, setJeLines] = useState<any[]>([
    { account_id: "", debit_mmk: 0, credit_mmk: 0, debit_gbp: 0, credit_gbp: 0 },
    { account_id: "", debit_mmk: 0, credit_mmk: 0, debit_gbp: 0, credit_gbp: 0 }
  ]);

  // Form States - Create Expense
  const [expTitle, setExpTitle] = useState("");
  const [expDescription, setExpDescription] = useState("");
  const [expAmountMmk, setExpAmountMmk] = useState<number | "">("");
  const [expCategorySelect, setExpCategorySelect] = useState("utilities");
  const [expDate, setExpDate] = useState("");
  const [expDepartment, setExpDepartment] = useState("College");
  const [expBudgetAmount, setExpBudgetAmount] = useState<number | "">("");
  const [expPaymentMethod, setExpPaymentMethod] = useState("Cash");

  useEffect(() => {
    setIsMounted(true);
    fetchGlobalData();
  }, []);

  useEffect(() => {
    if (isMounted) {
      fetchTabData();
    }
  }, [activeTab, startDate, endDate, expCategory, expStatus, expDept]);

  const fetchGlobalData = async () => {
    try {
      const allStudents = await AdminService.listStudents(1, -1);
      setStudents(allStudents.data || []);
      const allAccounts = await AdminService.listAccounts();
      setAccounts(allAccounts || []);
    } catch (err: any) {
      console.error("Failed to load global data", err);
    }
  };

  const fetchTabData = async () => {
    setLoading(true);
    try {
      if (activeTab === "dashboard") {
        const rep = await AdminService.getIncomeReport(startDate || undefined, endDate || undefined);
        setIncomeReport(rep);
      } else if (activeTab === "ledger") {
        const accs = await AdminService.listAccounts();
        setAccounts(accs || []);
      } else if (activeTab === "books") {
        const [cash, bank] = await Promise.all([
          AdminService.getCashBook(),
          AdminService.getBankBook()
        ]);
        setCashBook(cash || []);
        setBankBook(bank || []);
      } else if (activeTab === "journals") {
        const jEntries = await AdminService.listJournalEntries(startDate || undefined, endDate || undefined);
        setJournalEntries(jEntries || []);
      } else if (activeTab === "expenses") {
        const filters = {
          start_date: startDate || undefined,
          end_date: endDate || undefined,
          category: expCategory || undefined,
          status: expStatus || undefined,
          department: expDept || undefined
        };
        const [exps, budgets] = await Promise.all([
          AdminService.listExpenses(filters),
          AdminService.getBudgetVsActual()
        ]);
        setExpenses(exps || []);
        setBudgetVsActual(budgets || []);
      } else if (activeTab === "statements") {
        const [tb, inc, bs] = await Promise.all([
          AdminService.getTrialBalance(),
          AdminService.getIncomeStatement(),
          AdminService.getBalanceSheet()
        ]);
        setTrialBalance(tb);
        setIncomeStatement(inc);
        setBalanceSheet(bs);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to load financial records");
    } finally {
      setLoading(false);
    }
  };

  // Student Ledger load
  const loadStudentLedger = async (studentId: number) => {
    setStudentLedgerLoading(true);
    try {
      const [ledgerData, paymentsData] = await Promise.all([
        AdminService.getStudentLedger(studentId),
        AdminService.listPayments(1, 100, undefined, studentId)
      ]);
      setStudentLedger(ledgerData || []);
      setStudentPayments(paymentsData.data || []);
    } catch (err: any) {
      toast.error("Failed to load student transaction ledger");
    } finally {
      setStudentLedgerLoading(false);
    }
  };

  const handleDownloadReceipt = async (receiptId: string | null | undefined) => {
    if (!receiptId) return;
    const payment = studentPayments.find(p => p.receipt_id === receiptId);
    if (!payment) {
      toast.error("Corresponding payment record not found for this transaction reference.");
      return;
    }

    const studentPaymentsForEnrollment = studentPayments.filter(p => p.enrollment_id === payment.enrollment_id);
    const sorted = [...studentPaymentsForEnrollment].sort((a, b) => new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime());
    const payIdx = sorted.findIndex(p => p.payment_id === payment.payment_id);
    const paymentsUpToNow = sorted.slice(0, payIdx + 1);
    
    const totalCost = payment.course_cost || 0;
    const totalPaidAndDiscount = paymentsUpToNow.reduce((sum, p) => sum + p.amount + (p.amount_2 || 0) + (p.discount_amount || 0), 0);
    const leftAmount = Math.max(0, totalCost - totalPaidAndDiscount);
    
    const isFirstPayment = payIdx === 0;

    const mockEnrollment: any = {
      enrollment_id: payment.enrollment_id,
      enrollment_code: payment.enrollment_code || "",
      student_id: selectedStudent?.user_id || 0,
      student_name: payment.student_name,
      student_code: payment.student_code,
      course_id: 0,
      course_code: payment.course_code,
      course_name: payment.course_name,
      course_cost: payment.course_cost || 0,
      payment_plan: payment.payment_plan || "full",
      downpayment: payment.downpayment || 0,
      installment_amount: payment.installment_amount || 0,
      foc_items: payment.foc_items || null,
      status: true,
      enrollment_date: payment.payment_date,
      signature: payment.signature || null,
    };

    try {
      toast.info("Generating PDF receipt...");
      await generateReceiptPDF(
        mockEnrollment,
        [payment],
        leftAmount,
        0,
        user?.username || "Admin",
        isFirstPayment,
        "a4"
      );
      toast.success("Receipt downloaded successfully!");
    } catch (err) {
      console.error("Failed to generate receipt PDF", err);
      toast.error("Failed to generate receipt PDF");
    }
  };

  // Account Drilldown lines load
  const loadAccountDrilldown = async (account: Account) => {
    setSelectedAccount(account);
    setAccDrillLoading(true);
    try {
      // Fetch all journal entries and extract lines for this account
      const allEntries = await AdminService.listJournalEntries();
      const lines: any[] = [];
      allEntries.forEach(entry => {
        entry.lines.forEach(line => {
          if (line.account_id === account.account_id) {
            lines.push({
              entry_id: entry.entry_id,
              entry_date: entry.entry_date,
              description: entry.description,
              reference: entry.reference,
              entry_type: entry.entry_type,
              debit_mmk: line.debit_mmk,
              credit_mmk: line.credit_mmk,
              debit_gbp: line.debit_gbp,
              credit_gbp: line.credit_gbp
            });
          }
        });
      });
      setSelectedAccountLines(lines.sort((a, b) => b.entry_id - a.entry_id));
    } catch (err) {
      toast.error("Failed to load account ledger details");
    } finally {
      setAccDrillLoading(false);
    }
  };

  // Form Submissions
  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    try {
      await AdminService.createAccount({
        account_name: newAccName,
        account_type: newAccType,
        currency: newAccCurrency
      });
      toast.success("Account created successfully");
      setAccountModalOpen(false);
      setNewAccName("");
      fetchTabData();
      fetchGlobalData();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to create account");
    }
  };

  const handleCreateJournalEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;

    // Filter out blank lines and validate
    const activeLines = jeLines.filter(l => l.account_id !== "");
    if (activeLines.length < 2) {
      toast.error("A journal entry requires at least two lines");
      return;
    }

    const totalDebMmk = activeLines.reduce((sum, l) => sum + Number(l.debit_mmk || 0), 0);
    const totalCredMmk = activeLines.reduce((sum, l) => sum + Number(l.credit_mmk || 0), 0);
    const totalDebGbp = activeLines.reduce((sum, l) => sum + Number(l.debit_gbp || 0), 0);
    const totalCredGbp = activeLines.reduce((sum, l) => sum + Number(l.credit_gbp || 0), 0);

    if (Math.abs(totalDebMmk - totalCredMmk) > 0.01) {
      toast.error(`MMK Debits (${totalDebMmk}) must equal Credits (${totalCredMmk})`);
      return;
    }
    if (Math.abs(totalDebGbp - totalCredGbp) > 0.01) {
      toast.error(`GBP Debits (${totalDebGbp}) must equal Credits (${totalCredGbp})`);
      return;
    }

    try {
      await AdminService.createJournalEntry({
        description: jeDescription,
        reference: jeReference || null,
        entry_date: jeDate || null,
        lines: activeLines.map(l => ({
          account_id: Number(l.account_id),
          debit_mmk: Number(l.debit_mmk || 0),
          credit_mmk: Number(l.credit_mmk || 0),
          debit_gbp: Number(l.debit_gbp || 0),
          credit_gbp: Number(l.credit_gbp || 0)
        }))
      });
      toast.success("Journal entry recorded successfully");
      setJournalModalOpen(false);
      setJeDescription("");
      setJeReference("");
      setJeDate("");
      setJeLines([
        { account_id: "", debit_mmk: 0, credit_mmk: 0, debit_gbp: 0, credit_gbp: 0 },
        { account_id: "", debit_mmk: 0, credit_mmk: 0, debit_gbp: 0, credit_gbp: 0 }
      ]);
      fetchTabData();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to submit journal entry");
    }
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    try {
      await AdminService.createExpense({
        title: expTitle,
        description: expDescription || null,
        amount_mmk: Number(expAmountMmk),
        category: expCategorySelect,
        expense_date: expDate || null,
        department: expDepartment,
        budget_amount: expBudgetAmount ? Number(expBudgetAmount) : null,
        payment_method: expPaymentMethod
      });
      toast.success("Expense logged successfully and pending approval");
      setExpenseModalOpen(false);
      setExpTitle("");
      setExpDescription("");
      setExpAmountMmk("");
      setExpDate("");
      setExpBudgetAmount("");
      fetchTabData();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to log expense");
    }
  };

  const handleApproveExpense = async (id: number) => {
    if (isReadOnly) return;
    try {
      await AdminService.approveExpense(id);
      toast.success("Expense approved and posted to General Ledger");
      fetchTabData();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to approve expense");
    }
  };

  const handleRejectExpense = async (id: number) => {
    if (isReadOnly) return;
    try {
      await AdminService.rejectExpense(id);
      toast.success("Expense rejected");
      fetchTabData();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to reject expense");
    }
  };

  // Recharts Helper values
  const incomeTrendData = useMemo(() => {
    if (!incomeReport) return [];
    if (trendType === "daily") return incomeReport.daily_stats;
    if (trendType === "monthly") return incomeReport.monthly_stats;
    return incomeReport.weekly_stats;
  }, [incomeReport, trendType]);

  // Export functions
  const handleExportIncomeReport = () => {
    if (!incomeReport) return;
    const formattedRecords = incomeReport.payment_records.map((r: any) => ({
      ID: r.payment_id,
      Date: formatPaymentDate(r.payment_date),
      Student_Name: r.student_name || "N/A",
      Course_Name: r.course_name || "N/A",
      Amount_MMK: r.amount,
      Extra_Fee_MMK: r.extra_items_fee || 0,
      Fine_MMK: r.fine_amount || 0,
      Discount_MMK: r.discount_amount || 0,
      ExamFee_GBP: r.exam_fee_paid_gbp || 0,
      ExamFee_MMK: r.exam_fee_paid_mmk || 0,
      Method: r.payment_method,
      Status: r.status
    }));
    exportToExcel(formattedRecords, "Income_Records", "Payments");
  };

  const handleExportLedger = () => {
    const formatted = accounts.map(a => ({
      AccountID: a.account_id,
      Name: a.account_name,
      Type: a.account_type,
      Currency: a.currency,
      Status: a.is_active ? "Active" : "Inactive",
      Debit_MMK: a.debit_mmk,
      Credit_MMK: a.credit_mmk,
      Net_MMK: a.balance_mmk,
      Debit_GBP: a.debit_gbp,
      Credit_GBP: a.credit_gbp,
      Net_GBP: a.balance_gbp
    }));
    exportToExcel(formatted, "General_Ledger_Accounts", "Ledger");
  };

  const handleExportCashBank = (bookName: "Cash" | "Bank", data: BookLogEntry[]) => {
    const formatted = data.map(d => ({
      LineID: d.line_id,
      EntryID: d.entry_id,
      Date: d.entry_date,
      Description: d.description,
      Reference: d.reference || "",
      Account: d.account_name,
      Debit_MMK: d.debit_mmk,
      Credit_MMK: d.credit_mmk,
      Balance_MMK: d.balance_mmk,
      Debit_GBP: d.debit_gbp,
      Credit_GBP: d.credit_gbp,
      Balance_GBP: d.balance_gbp
    }));
    exportToExcel(formatted, `${bookName}_Book`, bookName);
  };

  const handleExportJournals = () => {
    const data: any[] = [];
    journalEntries.forEach(je => {
      je.lines.forEach(l => {
        data.push({
          EntryID: je.entry_id,
          Date: je.entry_date,
          Description: je.description,
          Reference: je.reference || "",
          Type: je.entry_type,
          Student: je.student_name || "",
          Account: l.account_name || "",
          Debit_MMK: l.debit_mmk || 0,
          Credit_MMK: l.credit_mmk || 0,
          Debit_GBP: l.debit_gbp || 0,
          Credit_GBP: l.credit_gbp || 0
        });
      });
    });
    exportToExcel(data, "Journal_Entries", "Journals");
  };

  const handleExportExpenses = () => {
    const formatted = expenses.map(e => ({
      ID: e.expense_id,
      Title: e.title,
      Category: e.category,
      Amount_MMK: e.amount_mmk,
      Budget_MMK: e.budget_amount || 0,
      Date: e.expense_date,
      Status: e.status,
      Department: e.department || "",
      PaymentMethod: e.payment_method,
      LoggedDate: e.created_at
    }));
    exportToExcel(formatted, "Expenses_Report", "Expenses");
  };

  const handleExportStudentLedger = () => {
    if (!selectedStudent) return;
    const formatted = studentLedger.map(l => ({
      EntryID: l.entry_id,
      Date: l.entry_date,
      Description: l.description,
      Reference: l.reference || "",
      Type: l.entry_type,
      AccountName: l.account_name,
      Debit_MMK: l.debit_mmk,
      Credit_MMK: l.credit_mmk,
      Debit_GBP: l.debit_gbp,
      Credit_GBP: l.credit_gbp
    }));
    exportToExcel(formatted, `Ledger_Student_${selectedStudent.user_code}`, "Ledger");
  };

  const handleExportStatements = (type: "TB" | "IS" | "BS") => {
    if (type === "TB" && trialBalance) {
      const data = trialBalance.lines.map(l => ({
        AccountName: l.account_name,
        AccountType: l.account_type,
        Debit_MMK: l.debit_mmk,
        Credit_MMK: l.credit_mmk,
        Debit_GBP: l.debit_gbp,
        Credit_GBP: l.credit_gbp
      }));
      data.push({
        AccountName: "TOTALS",
        AccountType: "",
        Debit_MMK: trialBalance.totals.debit_mmk,
        Credit_MMK: trialBalance.totals.credit_mmk,
        Debit_GBP: trialBalance.totals.debit_gbp,
        Credit_GBP: trialBalance.totals.credit_gbp
      });
      exportToExcel(data, "Trial_Balance", "Trial Balance");
    } else if (type === "IS" && incomeStatement) {
      const data: any[] = [];
      data.push({ Category: "REVENUES", AccountName: "", MMK: "", GBP: "" });
      incomeStatement.revenues.forEach(r => {
        data.push({ Category: "", AccountName: r.account_name, MMK: r.amount_mmk, GBP: r.amount_gbp });
      });
      data.push({ Category: "Total Revenues", AccountName: "", MMK: incomeStatement.summary.total_revenue_mmk, GBP: incomeStatement.summary.total_revenue_gbp });
      data.push({ Category: "", AccountName: "", MMK: "", GBP: "" });
      data.push({ Category: "EXPENSES", AccountName: "", MMK: "", GBP: "" });
      incomeStatement.expenses.forEach(e => {
        data.push({ Category: "", AccountName: e.account_name, MMK: e.amount_mmk, GBP: e.amount_gbp });
      });
      data.push({ Category: "Total Expenses", AccountName: "", MMK: incomeStatement.summary.total_expense_mmk, GBP: incomeStatement.summary.total_expense_gbp });
      data.push({ Category: "", AccountName: "", MMK: "", GBP: "" });
      data.push({ Category: "NET PROFIT / (LOSS)", AccountName: "", MMK: incomeStatement.summary.net_income_mmk, GBP: incomeStatement.summary.net_income_gbp });
      exportToExcel(data, "Income_Statement", "P&L");
    } else if (type === "BS" && balanceSheet) {
      const data: any[] = [];
      data.push({ Section: "ASSETS", AccountName: "", MMK: "", GBP: "" });
      balanceSheet.assets.forEach(a => {
        data.push({ Section: "", AccountName: a.account_name, MMK: a.amount_mmk, GBP: a.amount_gbp });
      });
      data.push({ Section: "Total Assets", AccountName: "", MMK: balanceSheet.summary.total_assets_mmk, GBP: balanceSheet.summary.total_assets_gbp });
      data.push({ Section: "", AccountName: "", MMK: "", GBP: "" });
      
      data.push({ Section: "LIABILITIES", AccountName: "", MMK: "", GBP: "" });
      balanceSheet.liabilities.forEach(l => {
        data.push({ Section: "", AccountName: l.account_name, MMK: l.amount_mmk, GBP: l.amount_gbp });
      });
      data.push({ Section: "Total Liabilities", AccountName: "", MMK: balanceSheet.summary.total_liabilities_mmk, GBP: balanceSheet.summary.total_liabilities_gbp });
      data.push({ Section: "", AccountName: "", MMK: "", GBP: "" });

      data.push({ Section: "EQUITY", AccountName: "", MMK: "", GBP: "" });
      balanceSheet.equity.forEach(eq => {
        data.push({ Section: "", AccountName: eq.account_name, MMK: eq.amount_mmk, GBP: eq.amount_gbp });
      });
      data.push({ Section: "Total Equity", AccountName: "", MMK: balanceSheet.summary.total_equity_mmk, GBP: balanceSheet.summary.total_equity_gbp });
      data.push({ Section: "", AccountName: "", MMK: "", GBP: "" });
      data.push({ Section: "Total Liabilities & Equity", AccountName: "", MMK: balanceSheet.summary.total_liabilities_equity_mmk, GBP: balanceSheet.summary.total_liabilities_equity_gbp });
      exportToExcel(data, "Balance_Sheet", "Balance Sheet");
    }
  };

  // Filter students by search term
  const filteredStudents = useMemo(() => {
    if (!studentSearch) return students;
    const term = studentSearch.toLowerCase();
    return students.filter(s => 
      s.username.toLowerCase().includes(term) || 
      s.user_code.toLowerCase().includes(term)
    );
  }, [students, studentSearch]);

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 animate-spin text-brand-600" />
      </div>
    );
  }

  if (!isAllowed) return null;

  return (
    <div className="min-h-screen bg-slate-50/50 pb-12">
      {/* Premium Header */}
      <div className="bg-white border-b border-slate-100 py-6 px-6 sm:px-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
              <Landmark className="w-7 h-7 text-brand-600" />
              Finance & Ledger Management
            </h1>
            <p className="text-xs font-medium text-slate-500 mt-1 uppercase tracking-wider">
              Double-entry Bookkeeping, Budgeting, & Financial Accounting
            </p>
          </div>
          
          {/* Quick Date Range Filters for the page */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Preset Date Filters */}
            <div className="flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200">
              {(["day", "week", "month", "all"] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => handleFilterSelect(filter)}
                  className={clsx(
                    "px-3 py-1 rounded-lg text-xs font-bold transition-all capitalize cursor-pointer",
                    activeFilter === filter
                      ? "bg-white text-slate-800 shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  {filter}
                </button>
              ))}
            </div>

            <div className="flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200">
              <input 
                type="date" 
                value={startDate} 
                onChange={(e) => { setStartDate(e.target.value); setActiveFilter("all"); }}
                className="bg-transparent text-xs font-semibold px-2 py-1 focus:outline-none text-slate-700" 
              />
              <span className="text-xs text-slate-400 font-bold px-1">to</span>
              <input 
                type="date" 
                value={endDate} 
                onChange={(e) => { setEndDate(e.target.value); setActiveFilter("all"); }}
                className="bg-transparent text-xs font-semibold px-2 py-1 focus:outline-none text-slate-700" 
              />
              {(startDate || endDate) && (
                <button 
                  onClick={() => { setStartDate(""); setEndDate(""); setActiveFilter("all"); }}
                  className="p-1 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <button 
              onClick={fetchTabData}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all active:scale-95 border border-slate-200"
              title="Refresh Data"
            >
              <Loader2 className={clsx("w-4 h-4", loading && "animate-spin")} />
            </button>
          </div>
        </div>

        {/* Global tab options */}
        <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar mt-6 pt-2 border-t border-slate-100 shrink-0">
          {[
            { id: "dashboard", name: "Income Dashboard", icon: BarChartIcon },
            { id: "ledger", name: "General Ledger", icon: BookOpen },
            { id: "books", name: "Cash & Bank", icon: Wallet },
            { id: "journals", name: "Journal Entries", icon: ArrowLeftRight },
            { id: "expenses", name: "Expenses Log", icon: CreditCard },
            { id: "statements", name: "Financial Reports", icon: FileSpreadsheet },
            { id: "students", name: "Student Ledger", icon: User },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer",
                activeTab === tab.id
                  ? "bg-brand-600 text-white shadow-md shadow-brand-600/10 active:scale-95"
                  : "bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-800 border border-slate-200/50"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main Panel Content */}
      <div className="px-6 sm:px-8 mt-6">
        
        {/* 1. INCOME DASHBOARD VIEW */}
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            {/* KPI Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">Total Income (MMK)</span>
                <div className="text-xl font-black text-slate-800 mt-1">
                  {formatAmount(incomeReport?.payment_records?.reduce((sum: number, r: any) => sum + (r.amount || 0) + (r.extra_items_fee || 0) + (r.fine_amount || 0), 0) || 0)}
                </div>
                <span className="text-[10px] font-semibold text-emerald-500 flex items-center gap-0.5 mt-2">
                  <ArrowUpRight className="w-3.5 h-3.5" /> Tuition + Extras
                </span>
              </div>
              <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">Total Exam Fees (GBP)</span>
                <div className="text-xl font-black text-slate-800 mt-1">
                  £{(incomeReport?.payment_records?.reduce((sum: number, r: any) => sum + (r.exam_fee_paid_gbp || 0), 0) || 0).toFixed(2)}
                </div>
                <span className="text-[10px] font-semibold text-indigo-500 flex items-center gap-0.5 mt-2">
                  <ArrowUpRight className="w-3.5 h-3.5" /> Exam registration
                </span>
              </div>
              <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">Fines Collected (MMK)</span>
                <div className="text-xl font-black text-amber-600 mt-1">
                  {formatAmount(incomeReport?.payment_records?.reduce((sum: number, r: any) => sum + (r.fine_amount || 0), 0) || 0)}
                </div>
                <span className="text-[10px] font-semibold text-slate-400 mt-2 block">Late payment penalties</span>
              </div>
              <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
                <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">Extra Fee Received</span>
                <div className="text-xl font-black text-slate-800 mt-1">
                  {formatAmount(incomeReport?.payment_records?.reduce((sum: number, r: any) => sum + (r.extra_items_fee || 0), 0) || 0)} <span className="text-xs font-normal">MMK</span>
                </div>
                <span className="text-[10px] font-semibold text-slate-400 mt-2 block">Uniforms, books, badges</span>
              </div>
            </div>

            {/* Income charts & trends */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm lg:col-span-2">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Income Trend</h3>
                  <div className="flex items-center gap-2">
                    <select
                      value={trendType}
                      onChange={(e: any) => setTrendType(e.target.value)}
                      className="bg-slate-50 border border-slate-200 text-xs font-bold rounded-xl px-2 py-1.5 focus:outline-none"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                    <select
                      value={incomeCurrency}
                      onChange={(e: any) => setIncomeCurrency(e.target.value)}
                      className="bg-slate-50 border border-slate-200 text-xs font-bold rounded-xl px-2 py-1.5 focus:outline-none"
                    >
                      <option value="MMK">MMK</option>
                      <option value="GBP">GBP</option>
                    </select>
                  </div>
                </div>

                {isMounted && (
                  <div className="w-full">
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={incomeTrendData}>
                        <defs>
                          <linearGradient id="colorInc" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={incomeCurrency === "MMK" ? "#4f46e5" : "#0d9488"} stopOpacity={0.8}/>
                            <stop offset="95%" stopColor={incomeCurrency === "MMK" ? "#4f46e5" : "#0d9488"} stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="label" stroke="#94a3b8" fontSize={10} />
                        <YAxis stroke="#94a3b8" fontSize={10} />
                        <Tooltip />
                        <Area 
                          type="monotone" 
                          dataKey={incomeCurrency === "MMK" ? "total_mmk" : "total_gbp"} 
                          name={incomeCurrency === "MMK" ? "MMK Income" : "GBP Income"} 
                          stroke={incomeCurrency === "MMK" ? "#4f46e5" : "#0d9488"} 
                          fillOpacity={1} 
                          fill="url(#colorInc)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Fee breakdown breakdown card */}
              <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-6">Fee category breakdown (MMK)</h3>
                
                {incomeReport && (
                  <div className="space-y-4">
                    {[
                      { 
                        name: "Tuition Fees", 
                        val: incomeReport.payment_records?.reduce((sum: number, r: any) => sum + (r.amount || 0), 0) || 0,
                        color: "bg-indigo-600"
                      },
                      { 
                        name: "Exam Fees (MMK equivalent)", 
                        val: incomeReport.payment_records?.reduce((sum: number, r: any) => sum + (r.exam_fee_paid_mmk || 0), 0) || 0,
                        color: "bg-teal-600"
                      },
                      { 
                        name: "Fines & Penalties", 
                        val: incomeReport.payment_records?.reduce((sum: number, r: any) => sum + (r.fine_amount || 0), 0) || 0,
                        color: "bg-amber-600"
                      },
                      { 
                        name: "Extra Items & Materials", 
                        val: incomeReport.payment_records?.reduce((sum: number, r: any) => sum + (r.extra_items_fee || 0), 0) || 0,
                        color: "bg-pink-600"
                      }
                    ].map((item, idx) => {
                      const totalMmk = incomeReport.payment_records?.reduce((sum: number, r: any) => sum + (r.amount || 0) + (r.extra_items_fee || 0) + (r.fine_amount || 0) + (r.exam_fee_paid_mmk || 0), 0) || 1;
                      const percentage = Math.round((item.val / totalMmk) * 100) || 0;
                      return (
                        <div key={idx} className="space-y-1.5">
                          <div className="flex justify-between items-center text-xs font-semibold">
                            <span className="text-slate-600">{item.name}</span>
                            <span className="text-slate-800">{formatAmount(item.val)} MMK ({percentage}%)</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2">
                            <div className={clsx("h-2 rounded-full", item.color)} style={{ width: `${percentage}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Income Transactions Table */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-indigo-500" />
                  Payments Transaction Audit Log
                </h3>
                {incomeReport?.payment_records?.length > 0 && (
                  <button
                    onClick={handleExportIncomeReport}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl text-xs font-bold transition-all border border-slate-200"
                  >
                    <Download className="w-4 h-4" /> Export Excel
                  </button>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-[10px] uppercase font-black tracking-widest text-slate-400 border-b border-slate-100">
                      <th className="px-6 py-3">ID</th>
                      <th className="px-6 py-3">Date</th>
                      <th className="px-6 py-3">Student / Course</th>
                      <th className="px-6 py-3 text-right">Tuition (MMK)</th>
                      <th className="px-6 py-3 text-right">Extra Items (MMK)</th>
                      <th className="px-6 py-3 text-right">Fines (MMK)</th>
                      <th className="px-6 py-3 text-right">Exam Paid (GBP)</th>
                      <th className="px-6 py-3 text-right">Exam Paid (MMK)</th>
                      <th className="px-6 py-3">Method</th>
                      <th className="px-6 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 text-xs">
                    {incomeReport?.payment_records?.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="px-6 py-8 text-center text-slate-400 font-medium">
                          No payments recorded in the selected period.
                        </td>
                      </tr>
                    ) : (
                      incomeReport?.payment_records?.map((payment: any) => (
                        <tr key={payment.payment_id} className="hover:bg-slate-50/50">
                          <td className="px-6 py-3 font-bold text-slate-800">#P{payment.payment_id}</td>
                          <td className="px-6 py-3">{formatPaymentDate(payment.payment_date)}</td>
                          <td className="px-6 py-3 font-semibold text-slate-600">
                            <div className="font-bold text-slate-800">{payment.student_name || "N/A"}</div>
                            <div className="text-[10px] text-slate-400 font-medium mt-0.5">{payment.course_name || "N/A"}</div>
                          </td>
                          <td className="px-6 py-3 text-right font-semibold text-slate-900">{formatAmount(payment.amount)}</td>
                          <td className="px-6 py-3 text-right font-semibold text-slate-900">{formatAmount(payment.extra_items_fee || 0)}</td>
                          <td className="px-6 py-3 text-right font-semibold text-amber-700">{formatAmount(payment.fine_amount || 0)}</td>
                          <td className="px-6 py-3 text-right font-semibold text-indigo-700">£{(payment.exam_fee_paid_gbp || 0).toFixed(2)}</td>
                          <td className="px-6 py-3 text-right font-semibold text-slate-900">{formatAmount(payment.exam_fee_paid_mmk || 0)}</td>
                          <td className="px-6 py-3 font-bold text-slate-500">{payment.payment_method}</td>
                          <td className="px-6 py-3">
                            <span className={clsx(
                              "px-2 py-0.5 rounded-md font-bold text-[10px] tracking-wide",
                              payment.status === "Approved" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-slate-100 text-slate-700"
                            )}>
                              {payment.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 2. GENERAL LEDGER VIEW */}
        {activeTab === "ledger" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-100 rounded-3xl p-5 shadow-sm">
              <div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Chart of Accounts</h3>
                <p className="text-xs text-slate-400 mt-0.5">Summary of assets, liabilities, equities, revenues, and expenses.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportLedger}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl text-xs font-bold transition-all border border-slate-200"
                >
                  <Download className="w-4 h-4" /> Export Ledger
                </button>
                {!isReadOnly && (
                  <button
                    onClick={() => setAccountModalOpen(true)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-brand-600/10 active:scale-95 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Add GL Account
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Account list table */}
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden lg:col-span-2">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-[10px] uppercase font-black tracking-widest text-slate-400 border-b border-slate-100">
                        <th className="px-6 py-3.5">ID</th>
                        <th className="px-6 py-3.5">Account Name</th>
                        <th className="px-6 py-3.5">Type</th>
                        <th className="px-6 py-3.5 text-right">Debit Balance</th>
                        <th className="px-6 py-3.5 text-right">Credit Balance</th>
                        <th className="px-6 py-3.5 text-right">Net Balance</th>
                        <th className="px-6 py-3.5">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 text-xs">
                      {accounts.map(acc => {
                        const hasMmk = Math.abs(acc.balance_mmk) > 0.01 || Math.abs(acc.debit_mmk) > 0.01 || Math.abs(acc.credit_mmk) > 0.01;
                        const hasGbp = Math.abs(acc.balance_gbp) > 0.01 || Math.abs(acc.debit_gbp) > 0.01 || Math.abs(acc.credit_gbp) > 0.01;
                        return (
                          <tr 
                            key={acc.account_id} 
                            className={clsx(
                              "hover:bg-slate-50/50 transition-colors",
                              selectedAccount?.account_id === acc.account_id && "bg-brand-50/30"
                            )}
                          >
                            <td className="px-6 py-4 font-bold text-slate-400">#{acc.account_id}</td>
                            <td className="px-6 py-4 font-black text-slate-800">{acc.account_name}</td>
                            <td className="px-6 py-4">
                              <span className={clsx(
                                "px-2 py-0.5 rounded-md font-bold text-[9px] uppercase tracking-wide",
                                acc.account_type === "Asset" && "bg-emerald-50 text-emerald-700 border border-emerald-100",
                                acc.account_type === "Liability" && "bg-rose-50 text-rose-700 border border-rose-100",
                                acc.account_type === "Equity" && "bg-blue-50 text-blue-700 border border-blue-100",
                                acc.account_type === "Revenue" && "bg-violet-50 text-violet-700 border border-violet-100",
                                acc.account_type === "Expense" && "bg-amber-50 text-amber-700 border border-amber-100"
                              )}>
                                {acc.account_type}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              {hasMmk && <div className="font-semibold text-slate-700">{formatAmount(acc.debit_mmk)} MMK</div>}
                              {hasGbp && <div className="font-semibold text-indigo-700">£{acc.debit_gbp.toFixed(2)}</div>}
                              {!hasMmk && !hasGbp && <span className="text-slate-400">-</span>}
                            </td>
                            <td className="px-6 py-4 text-right">
                              {hasMmk && <div className="font-semibold text-slate-700">{formatAmount(acc.credit_mmk)} MMK</div>}
                              {hasGbp && <div className="font-semibold text-indigo-700">£{acc.credit_gbp.toFixed(2)}</div>}
                              {!hasMmk && !hasGbp && <span className="text-slate-400">-</span>}
                            </td>
                            <td className="px-6 py-4 text-right font-black text-slate-900">
                              {hasMmk && <div>{formatAmount(acc.balance_mmk)} MMK</div>}
                              {hasGbp && <div className="text-indigo-700">£{acc.balance_gbp.toFixed(2)}</div>}
                              {!hasMmk && !hasGbp && <span className="text-slate-400">-</span>}
                            </td>
                            <td className="px-6 py-4">
                              <button
                                onClick={() => loadAccountDrilldown(acc)}
                                className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-900 rounded-lg transition-colors cursor-pointer"
                                title="View transaction lines"
                              >
                                <ChevronRight className="w-4.5 h-4.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Account Drilldown transaction panel */}
              <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm h-fit">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4">
                  Account Ledger Audit Details
                </h3>
                {selectedAccount ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                      <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Account name</div>
                      <div className="font-black text-slate-800 text-sm mt-0.5">{selectedAccount.account_name}</div>
                      <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-200">
                        <div>
                          <div className="text-[9px] uppercase font-bold text-slate-400">MMK Net Balance</div>
                          <div className="font-black text-xs text-slate-800 mt-0.5">{formatAmount(selectedAccount.balance_mmk)} MMK</div>
                        </div>
                        <div>
                          <div className="text-[9px] uppercase font-bold text-slate-400">GBP Net Balance</div>
                          <div className="font-black text-xs text-indigo-700 mt-0.5">£{selectedAccount.balance_gbp.toFixed(2)}</div>
                        </div>
                      </div>
                    </div>

                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Ledger Lines</div>
                    
                    {accDrillLoading ? (
                      <div className="flex justify-center py-6">
                        <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
                      </div>
                    ) : selectedAccountLines.length === 0 ? (
                      <div className="text-xs text-slate-400 text-center py-6 font-medium">No ledger postings for this account.</div>
                    ) : (
                      <div className="space-y-3 max-h-[350px] overflow-y-auto custom-scrollbar pr-1">
                        {selectedAccountLines.map((line, idx) => (
                          <div key={idx} className="p-3 bg-slate-50/50 hover:bg-slate-50 rounded-xl border border-slate-100 flex flex-col text-[11px] transition-all">
                            <div className="flex items-center justify-between font-bold">
                              <span className="text-slate-800">{line.description}</span>
                              <span className="text-slate-400">{line.entry_date}</span>
                            </div>
                            <div className="text-[9px] text-slate-400 font-semibold mt-0.5 flex items-center gap-1.5">
                              <span>Ref: {line.reference || `J${line.entry_id}`}</span>
                              <span>•</span>
                              <span className="uppercase text-brand-600 font-black">{line.entry_type}</span>
                            </div>
                            <div className="flex justify-between items-center mt-2.5 pt-2 border-t border-dashed border-slate-200">
                              <span className="text-[9px] font-bold text-slate-500 uppercase">Debit / Credit</span>
                              <span className="font-bold text-slate-900">
                                {line.debit_mmk > 0 && <span className="text-emerald-700">+{formatAmount(line.debit_mmk)} MMK </span>}
                                {line.credit_mmk > 0 && <span className="text-rose-700">-{formatAmount(line.credit_mmk)} MMK </span>}
                                {line.debit_gbp > 0 && <span className="text-indigo-700">+£{line.debit_gbp.toFixed(2)} </span>}
                                {line.credit_gbp > 0 && <span className="text-rose-700">-£{line.credit_gbp.toFixed(2)} </span>}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-center">
                    <BookOpen className="w-10 h-10 stroke-1 text-slate-300 mb-2" />
                    <p className="text-xs font-semibold">Select a General Ledger account from the left to view audit logs.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 3. CASH & BANK BOOKS VIEW */}
        {activeTab === "books" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Cash Book */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                    <Wallet className="w-5 h-5 text-emerald-600" />
                    Cash Book
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Running ledger of cash transactions.</p>
                </div>
                {cashBook.length > 0 && (
                  <button
                    onClick={() => handleExportCashBank("Cash", cashBook)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl text-xs font-bold transition-all border border-slate-200"
                  >
                    <Download className="w-4 h-4" /> Export Cash Book
                  </button>
                )}
              </div>

              <div className="overflow-x-auto max-h-[500px] overflow-y-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-[10px] uppercase font-black tracking-widest text-slate-400 border-b border-slate-100 sticky top-0">
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Description</th>
                      <th className="px-4 py-3 text-right">Debit (+)</th>
                      <th className="px-4 py-3 text-right">Credit (-)</th>
                      <th className="px-4 py-3 text-right">Running Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 text-[11px]">
                    {cashBook.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-slate-400 font-medium">
                          No cash book entries found.
                        </td>
                      </tr>
                    ) : (
                      cashBook.map(entry => (
                        <tr key={entry.line_id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3">{entry.entry_date}</td>
                          <td className="px-4 py-3">
                            <div className="font-bold text-slate-800">{entry.description}</div>
                            <div className="text-[9px] text-slate-400">Ref: {entry.reference || `J${entry.entry_id}`} • Account: {entry.account_name}</div>
                          </td>
                          <td className="px-4 py-3 text-right text-emerald-700 font-semibold">
                            {entry.debit_mmk > 0 && `+${formatAmount(entry.debit_mmk)} MMK`}
                          </td>
                          <td className="px-4 py-3 text-right text-rose-700 font-semibold">
                            {entry.credit_mmk > 0 && `-${formatAmount(entry.credit_mmk)} MMK`}
                          </td>
                          <td className="px-4 py-3 text-right font-black text-slate-900">
                            {formatAmount(entry.balance_mmk)} MMK
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bank Book */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                    <Landmark className="w-5 h-5 text-indigo-600" />
                    Bank Book (CB Bank)
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Running ledger of bank transactions.</p>
                </div>
                {bankBook.length > 0 && (
                  <button
                    onClick={() => handleExportCashBank("Bank", bankBook)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl text-xs font-bold transition-all border border-slate-200"
                  >
                    <Download className="w-4 h-4" /> Export Bank Book
                  </button>
                )}
              </div>

              <div className="overflow-x-auto max-h-[500px] overflow-y-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-[10px] uppercase font-black tracking-widest text-slate-400 border-b border-slate-100 sticky top-0">
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Description</th>
                      <th className="px-4 py-3 text-right">Debit (+)</th>
                      <th className="px-4 py-3 text-right">Credit (-)</th>
                      <th className="px-4 py-3 text-right">Running Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 text-[11px]">
                    {bankBook.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-slate-400 font-medium">
                          No bank book entries found.
                        </td>
                      </tr>
                    ) : (
                      bankBook.map(entry => {
                        const hasMmk = entry.debit_mmk > 0 || entry.credit_mmk > 0;
                        const hasGbp = entry.debit_gbp > 0 || entry.credit_gbp > 0;
                        return (
                          <tr key={entry.line_id} className="hover:bg-slate-50/50">
                            <td className="px-4 py-3">{entry.entry_date}</td>
                            <td className="px-4 py-3">
                              <div className="font-bold text-slate-800">{entry.description}</div>
                              <div className="text-[9px] text-slate-400">Ref: {entry.reference || `J${entry.entry_id}`} • Account: {entry.account_name}</div>
                            </td>
                            <td className="px-4 py-3 text-right text-emerald-700 font-semibold">
                              {entry.debit_mmk > 0 && `+${formatAmount(entry.debit_mmk)} MMK`}
                              {entry.debit_gbp > 0 && `+£${entry.debit_gbp.toFixed(2)}`}
                            </td>
                            <td className="px-4 py-3 text-right text-rose-700 font-semibold">
                              {entry.credit_mmk > 0 && `-${formatAmount(entry.credit_mmk)} MMK`}
                              {entry.credit_gbp > 0 && `-£${entry.credit_gbp.toFixed(2)}`}
                            </td>
                            <td className="px-4 py-3 text-right font-black text-slate-900">
                              {hasMmk && <div>{formatAmount(entry.balance_mmk)} MMK</div>}
                              {hasGbp && <div className="text-indigo-700">£{entry.balance_gbp.toFixed(2)}</div>}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 4. JOURNAL ENTRIES VIEW */}
        {activeTab === "journals" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-100 rounded-3xl p-5 shadow-sm">
              <div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Journal Entries Ledger</h3>
                <p className="text-xs text-slate-400 mt-0.5">Chronological record of double-entry ledger postings.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportJournals}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl text-xs font-bold transition-all border border-slate-200"
                >
                  <Download className="w-4 h-4" /> Export Journal
                </button>
                {!isReadOnly && (
                  <button
                    onClick={() => setJournalModalOpen(true)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-brand-600/10 active:scale-95 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Record manual entry
                  </button>
                )}
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-[10px] uppercase font-black tracking-widest text-slate-400 border-b border-slate-100">
                      <th className="px-6 py-3.5">Entry ID</th>
                      <th className="px-6 py-3.5">Date</th>
                      <th className="px-6 py-3.5">Description / Accounts Postings</th>
                      <th className="px-6 py-3.5 text-right">Debit</th>
                      <th className="px-6 py-3.5 text-right">Credit</th>
                      <th className="px-6 py-3.5">Type</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 text-xs">
                    {journalEntries.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-slate-400 font-medium">
                          No journal entries found in selected range.
                        </td>
                      </tr>
                    ) : (
                      journalEntries.map(entry => (
                        <tr key={entry.entry_id} className="align-top hover:bg-slate-50/30">
                          <td className="px-6 py-4 font-bold text-slate-400">#JE{entry.entry_id}</td>
                          <td className="px-6 py-4">{entry.entry_date}</td>
                          <td className="px-6 py-4">
                            <div className="font-bold text-slate-800 mb-2">{entry.description}</div>
                            {entry.reference && <div className="text-[10px] font-semibold text-slate-400 mb-3">Ref: {entry.reference}</div>}
                            {entry.student_name && <div className="text-[10px] font-bold text-indigo-600 mb-3">Student: {entry.student_name}</div>}
                            
                            <div className="space-y-1.5 border-l-2 border-slate-100 pl-3">
                              {entry.lines.map((line, idx) => (
                                <div key={idx} className={clsx("flex items-center text-[11px]", (line.credit_mmk || 0) > 0 || (line.credit_gbp || 0) > 0 ? "pl-6 text-slate-500" : "font-semibold text-slate-800")}>
                                  {line.account_name}
                                </div>
                              ))}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="mb-2 h-4" /> {/* Spacer aligning with description */}
                            <div className="space-y-1.5">
                              {entry.lines.map((line, idx) => (
                                <div key={idx} className="text-[11px] font-bold text-emerald-700 h-4 flex items-center justify-end">
                                  {(line.debit_mmk || 0) > 0 && `${formatAmount(line.debit_mmk || 0)}`}
                                  {(line.debit_gbp || 0) > 0 && `£${(line.debit_gbp || 0).toFixed(2)}`}
                                </div>
                              ))}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="mb-2 h-4" /> {/* Spacer */}
                            <div className="space-y-1.5">
                              {entry.lines.map((line, idx) => (
                                <div key={idx} className="text-[11px] font-bold text-rose-700 h-4 flex items-center justify-end">
                                  {(line.credit_mmk || 0) > 0 && `${formatAmount(line.credit_mmk || 0)}`}
                                  {(line.credit_gbp || 0) > 0 && `£${(line.credit_gbp || 0).toFixed(2)}`}
                                </div>
                              ))}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-2 py-0.5 rounded-md font-bold text-[9px] uppercase tracking-wide bg-slate-100 text-slate-600">
                              {entry.entry_type}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 5. EXPENSES VIEW */}
        {activeTab === "expenses" && (
          <div className="space-y-6">
            {/* Filters panel & Action buttons */}
            <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={expCategory}
                  onChange={(e) => setExpCategory(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-xs font-bold rounded-xl px-3 py-2 focus:outline-none"
                >
                  <option value="">All Categories</option>
                  <option value="utilities">Utilities</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="salaries">Salaries</option>
                  <option value="petty_cash">Petty Cash</option>
                  <option value="others">Others</option>
                </select>

                <select
                  value={expStatus}
                  onChange={(e) => setExpStatus(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-xs font-bold rounded-xl px-3 py-2 focus:outline-none"
                >
                  <option value="">All Statuses</option>
                  <option value="Pending">Pending</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                </select>

                <select
                  value={expDept}
                  onChange={(e) => setExpDept(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-xs font-bold rounded-xl px-3 py-2 focus:outline-none"
                >
                  <option value="">All Departments</option>
                  <option value="College">College</option>
                  <option value="InfoTech">InfoTech</option>
                  <option value="General">General</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportExpenses}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl text-xs font-bold transition-all border border-slate-200"
                >
                  <Download className="w-4 h-4" /> Export Expenses
                </button>
                {!isReadOnly && (
                  <button
                    onClick={() => setExpenseModalOpen(true)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-brand-600/10 active:scale-95 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Log Expense
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Expense Logs table */}
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden lg:col-span-2">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-[10px] uppercase font-black tracking-widest text-slate-400 border-b border-slate-100">
                        <th className="px-6 py-3.5">ID</th>
                        <th className="px-6 py-3.5">Title / Desc</th>
                        <th className="px-6 py-3.5">Category</th>
                        <th className="px-6 py-3.5 text-right">Amount (MMK)</th>
                        <th className="px-6 py-3.5">Status</th>
                        <th className="px-6 py-3.5">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 text-xs">
                      {expenses.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-8 text-center text-slate-400 font-medium">
                            No expenses found.
                          </td>
                        </tr>
                      ) : (
                        expenses.map(exp => (
                          <tr key={exp.expense_id} className="hover:bg-slate-50/50 align-middle">
                            <td className="px-6 py-4 font-bold text-slate-400">#E{exp.expense_id}</td>
                            <td className="px-6 py-4">
                              <div className="font-black text-slate-800">{exp.title}</div>
                              {exp.description && <div className="text-[10px] text-slate-400 mt-0.5">{exp.description}</div>}
                              <div className="text-[9px] font-semibold text-slate-400 mt-1 flex items-center gap-1.5">
                                <span>Dept: {exp.department || "General"}</span>
                                <span>•</span>
                                <span>Date: {exp.expense_date}</span>
                                <span>•</span>
                                <span>Method: {exp.payment_method}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 font-semibold capitalize text-slate-600">{exp.category}</td>
                            <td className="px-6 py-4 text-right font-black text-slate-900">{formatAmount(exp.amount_mmk)}</td>
                            <td className="px-6 py-4">
                              <span className={clsx(
                                "px-2.5 py-0.5 rounded-md font-bold text-[9px] uppercase tracking-wider",
                                exp.status === "Approved" && "bg-emerald-50 text-emerald-700 border border-emerald-100",
                                exp.status === "Pending" && "bg-amber-50 text-amber-700 border border-amber-100",
                                exp.status === "Rejected" && "bg-rose-50 text-rose-700 border border-rose-100"
                              )}>
                                {exp.status}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              {exp.status === "Pending" && !isReadOnly ? (
                                <div className="flex items-center gap-1.5">
                                  <button
                                    onClick={() => handleApproveExpense(exp.expense_id)}
                                    className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                                    title="Approve expense"
                                  >
                                    <Check className="w-4.5 h-4.5" />
                                  </button>
                                  <button
                                    onClick={() => handleRejectExpense(exp.expense_id)}
                                    className="p-1 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                    title="Reject expense"
                                  >
                                    <X className="w-4.5 h-4.5" />
                                  </button>
                                </div>
                              ) : exp.approver_name ? (
                                <div className="text-[10px] text-slate-400 font-semibold">
                                  by {exp.approver_name}
                                </div>
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Budget vs Actual Comparison Chart Card */}
              <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4">
                  Budget vs Actual variance
                </h3>
                
                {isMounted && (
                  <div className="w-full">
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={budgetVsActual}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="category" stroke="#94a3b8" fontSize={9} tickFormatter={(v) => v.toUpperCase()} />
                        <YAxis stroke="#94a3b8" fontSize={9} />
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                        <Bar dataKey="budget_mmk" name="Budget" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="actual_mmk" name="Actual Approved" fill="#e11d48" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Category Wise Budgets</div>
                  {budgetVsActual.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs p-1.5 hover:bg-slate-50 rounded-lg">
                      <span className="font-bold text-slate-600 capitalize">{item.category}</span>
                      <span className={clsx(
                        "font-semibold",
                        item.variance_mmk < 0 ? "text-rose-600" : "text-emerald-600"
                      )}>
                        Variance: {formatAmount(item.variance_mmk)} MMK
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 6. FINANCIAL STATEMENTS VIEW */}
        {activeTab === "statements" && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            
            {/* Trial Balance Card */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <FileSpreadsheet className="w-5 h-5 text-indigo-500" />
                    Trial Balance
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Check double-entry debit & credit balance.</p>
                </div>
                {trialBalance && (
                  <button
                    onClick={() => handleExportStatements("TB")}
                    className="p-1.5 bg-slate-55 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all cursor-pointer"
                    title="Export Trial Balance"
                  >
                    <Download className="w-4 h-4 text-slate-600" />
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-5">
                {trialBalance ? (
                  <div className="space-y-4">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="text-[9px] uppercase font-bold text-slate-400 border-b border-slate-100">
                          <th className="py-2">Account</th>
                          <th className="py-2 text-right">Debit</th>
                          <th className="py-2 text-right">Credit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {trialBalance.lines.map((line, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="py-2.5 font-bold text-slate-800">{line.account_name}</td>
                            <td className="py-2.5 text-right font-semibold text-emerald-700">
                              {line.debit_mmk > 0 && formatAmount(line.debit_mmk)}
                              {line.debit_gbp > 0 && ` (£${line.debit_gbp.toFixed(2)})`}
                            </td>
                            <td className="py-2.5 text-right font-semibold text-rose-700">
                              {line.credit_mmk > 0 && formatAmount(line.credit_mmk)}
                              {line.credit_gbp > 0 && ` (£${line.credit_gbp.toFixed(2)})`}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    <div className="pt-4 border-t border-slate-200">
                      <div className="flex justify-between items-center text-xs font-black text-slate-800">
                        <span>Total MMK Debits / Credits:</span>
                        <span>{formatAmount(trialBalance.totals.debit_mmk)} / {formatAmount(trialBalance.totals.credit_mmk)}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs font-black text-indigo-700 mt-1">
                        <span>Total GBP Debits / Credits:</span>
                        <span>£{trialBalance.totals.debit_gbp.toFixed(2)} / £{trialBalance.totals.credit_gbp.toFixed(2)}</span>
                      </div>
                      <div className="mt-4 flex items-center justify-center gap-1.5 p-3 rounded-2xl border text-center font-bold text-[11px] uppercase tracking-wider">
                        {trialBalance.totals.is_balanced ? (
                          <span className="text-emerald-700 bg-emerald-50 border-emerald-100 flex items-center gap-1 w-full justify-center py-1 rounded-xl">
                            <Check className="w-4 h-4" /> Balanced & Audit Ready
                          </span>
                        ) : (
                          <span className="text-rose-700 bg-rose-50 border-rose-100 flex items-center gap-1 w-full justify-center py-1 rounded-xl">
                            <AlertCircle className="w-4 h-4" /> Out of Balance Detected
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-400 font-semibold text-xs">No records available.</div>
                )}
              </div>
            </div>

            {/* Income Statement (P&L) Card */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <BarChartIcon className="w-5 h-5 text-teal-600" />
                    Income Statement (P&L)
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Revenues, expenses, and net profit report.</p>
                </div>
                {incomeStatement && (
                  <button
                    onClick={() => handleExportStatements("IS")}
                    className="p-1.5 bg-slate-55 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all cursor-pointer"
                    title="Export Income Statement"
                  >
                    <Download className="w-4 h-4 text-slate-600" />
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-6 text-xs text-slate-700">
                {incomeStatement ? (
                  <>
                    {/* Revenues Section */}
                    <div>
                      <div className="font-black text-slate-500 uppercase tracking-widest text-[9px] mb-2 border-b border-slate-100 pb-1">REVENUES</div>
                      <div className="space-y-2">
                        {incomeStatement.revenues.map((r, idx) => (
                          <div key={idx} className="flex justify-between items-center">
                            <span className="font-bold text-slate-800">{r.account_name}</span>
                            <span className="font-semibold text-slate-700">
                              {formatAmount(r.amount_mmk)} MMK {r.amount_gbp > 0 && `(£${r.amount_gbp.toFixed(2)})`}
                            </span>
                          </div>
                        ))}
                        <div className="flex justify-between items-center font-black text-slate-800 pt-2 border-t border-slate-100">
                          <span>Total Revenues:</span>
                          <span>
                            {formatAmount(incomeStatement.summary.total_revenue_mmk)} MMK {incomeStatement.summary.total_revenue_gbp > 0 && `(£${incomeStatement.summary.total_revenue_gbp.toFixed(2)})`}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Expenses Section */}
                    <div>
                      <div className="font-black text-slate-500 uppercase tracking-widest text-[9px] mb-2 border-b border-slate-100 pb-1">EXPENSES</div>
                      <div className="space-y-2">
                        {incomeStatement.expenses.map((e, idx) => (
                          <div key={idx} className="flex justify-between items-center">
                            <span className="font-bold text-slate-800">{e.account_name}</span>
                            <span className="font-semibold text-slate-700">
                              {formatAmount(e.amount_mmk)} MMK {e.amount_gbp > 0 && `(£${e.amount_gbp.toFixed(2)})`}
                            </span>
                          </div>
                        ))}
                        <div className="flex justify-between items-center font-black text-slate-800 pt-2 border-t border-slate-100">
                          <span>Total Expenses:</span>
                          <span>
                            {formatAmount(incomeStatement.summary.total_expense_mmk)} MMK {incomeStatement.summary.total_expense_gbp > 0 && `(£${incomeStatement.summary.total_expense_gbp.toFixed(2)})`}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Net Income */}
                    <div className="pt-4 border-t border-slate-200">
                      <div className="flex justify-between items-center text-sm font-black p-3 bg-slate-50 rounded-2xl border border-slate-200">
                        <span className="text-slate-800">NET PROFIT / (LOSS):</span>
                        <span className={clsx(
                          incomeStatement.summary.net_income_mmk >= 0 ? "text-emerald-700" : "text-rose-700"
                        )}>
                          {formatAmount(incomeStatement.summary.net_income_mmk)} MMK
                          {incomeStatement.summary.net_income_gbp !== 0 && ` (£${incomeStatement.summary.net_income_gbp.toFixed(2)})`}
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12 text-slate-400 font-semibold text-xs">No records available.</div>
                )}
              </div>
            </div>

            {/* Balance Sheet Card */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Landmark className="w-5 h-5 text-amber-600" />
                    Balance Sheet
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Asset, liabilities, and retained equity ledger sheet.</p>
                </div>
                {balanceSheet && (
                  <button
                    onClick={() => handleExportStatements("BS")}
                    className="p-1.5 bg-slate-55 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all cursor-pointer"
                    title="Export Balance Sheet"
                  >
                    <Download className="w-4 h-4 text-slate-600" />
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-6 text-xs text-slate-700">
                {balanceSheet ? (
                  <>
                    {/* Assets */}
                    <div>
                      <div className="font-black text-slate-500 uppercase tracking-widest text-[9px] mb-2 border-b border-slate-100 pb-1">ASSETS</div>
                      <div className="space-y-2">
                        {balanceSheet.assets.map((a, idx) => (
                          <div key={idx} className="flex justify-between items-center">
                            <span className="font-bold text-slate-800">{a.account_name}</span>
                            <span className="font-semibold text-slate-700">
                              {formatAmount(a.amount_mmk)} MMK {a.amount_gbp > 0 && `(£${a.amount_gbp.toFixed(2)})`}
                            </span>
                          </div>
                        ))}
                        <div className="flex justify-between items-center font-black text-slate-800 pt-2 border-t border-slate-100">
                          <span>Total Assets:</span>
                          <span>
                            {formatAmount(balanceSheet.summary.total_assets_mmk)} MMK {balanceSheet.summary.total_assets_gbp > 0 && `(£${balanceSheet.summary.total_assets_gbp.toFixed(2)})`}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Liabilities */}
                    <div>
                      <div className="font-black text-slate-500 uppercase tracking-widest text-[9px] mb-2 border-b border-slate-100 pb-1">LIABILITIES</div>
                      <div className="space-y-2">
                        {balanceSheet.liabilities.map((l, idx) => (
                          <div key={idx} className="flex justify-between items-center">
                            <span className="font-bold text-slate-800">{l.account_name}</span>
                            <span className="font-semibold text-slate-700">
                              {formatAmount(l.amount_mmk)} MMK {l.amount_gbp > 0 && `(£${l.amount_gbp.toFixed(2)})`}
                            </span>
                          </div>
                        ))}
                        <div className="flex justify-between items-center font-black text-slate-800 pt-2 border-t border-slate-100">
                          <span>Total Liabilities:</span>
                          <span>
                            {formatAmount(balanceSheet.summary.total_liabilities_mmk)} MMK {balanceSheet.summary.total_liabilities_gbp > 0 && `(£${balanceSheet.summary.total_liabilities_gbp.toFixed(2)})`}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Equity */}
                    <div>
                      <div className="font-black text-slate-500 uppercase tracking-widest text-[9px] mb-2 border-b border-slate-100 pb-1">EQUITY</div>
                      <div className="space-y-2">
                        {balanceSheet.equity.map((eq, idx) => (
                          <div key={idx} className="flex justify-between items-center">
                            <span className="font-bold text-slate-800">{eq.account_name}</span>
                            <span className="font-semibold text-slate-700">
                              {formatAmount(eq.amount_mmk)} MMK {eq.amount_gbp > 0 && `(£${eq.amount_gbp.toFixed(2)})`}
                            </span>
                          </div>
                        ))}
                        <div className="flex justify-between items-center font-black text-slate-800 pt-2 border-t border-slate-100">
                          <span>Total Equity:</span>
                          <span>
                            {formatAmount(balanceSheet.summary.total_equity_mmk)} MMK {balanceSheet.summary.total_equity_gbp > 0 && `(£${balanceSheet.summary.total_equity_gbp.toFixed(2)})`}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Summary Check */}
                    <div className="pt-4 border-t border-slate-200">
                      <div className="flex justify-between items-center font-black text-[11px] text-slate-800">
                        <span>Total Liabilities & Equity:</span>
                        <span>
                          {formatAmount(balanceSheet.summary.total_liabilities_equity_mmk)} MMK {balanceSheet.summary.total_liabilities_equity_gbp > 0 && `(£${balanceSheet.summary.total_liabilities_equity_gbp.toFixed(2)})`}
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12 text-slate-400 font-semibold text-xs">No records available.</div>
                )}
              </div>
            </div>

          </div>
        )}

        {/* 7. STUDENT LEDGER VIEW */}
        {activeTab === "students" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Student Search & Select Column */}
              <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm h-fit">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-4">
                  Select Student
                </h3>
                <div className="relative mb-4">
                  <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by name or student code..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-xs font-semibold"
                  />
                </div>

                <div className="space-y-1.5 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
                  {filteredStudents.length === 0 ? (
                    <div className="text-center text-xs text-slate-400 py-6 font-semibold">No students match search.</div>
                  ) : (
                    filteredStudents.map(student => (
                      <button
                        key={student.user_id}
                        onClick={() => {
                          setSelectedStudent(student);
                          loadStudentLedger(student.user_id);
                        }}
                        className={clsx(
                          "w-full text-left p-3 rounded-xl border transition-all text-xs font-semibold flex items-center justify-between cursor-pointer",
                          selectedStudent?.user_id === student.user_id
                            ? "bg-brand-50 border-brand-200 text-brand-700"
                            : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700"
                        )}
                      >
                        <div>
                          <div className="font-bold">{student.username}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">{student.user_code}</div>
                        </div>
                        <ChevronRight className="w-4 h-4 shrink-0 text-slate-400" />
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Student transaction statements */}
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden lg:col-span-2 flex flex-col">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
                  <div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                      <User className="w-5 h-5 text-brand-600" />
                      Student Ledger Account Statement
                    </h3>
                    {selectedStudent && (
                      <p className="text-xs text-indigo-600 font-bold mt-0.5">
                        {selectedStudent.username} ({selectedStudent.user_code})
                      </p>
                    )}
                  </div>
                  {selectedStudent && studentLedger.length > 0 && (
                    <button
                      onClick={handleExportStudentLedger}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl text-xs font-bold transition-all border border-slate-200"
                    >
                      <Download className="w-4 h-4" /> Export Statement
                    </button>
                  )}
                </div>

                <div className="flex-1 min-h-[300px]">
                  {studentLedgerLoading ? (
                    <div className="flex items-center justify-center py-24">
                      <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
                    </div>
                  ) : !selectedStudent ? (
                    <div className="flex flex-col items-center justify-center py-24 text-slate-400 text-center">
                      <User className="w-12 h-12 stroke-1 text-slate-300 mb-2" />
                      <p className="text-xs font-semibold">Select a student from the left panel to drill down into transaction statements.</p>
                    </div>
                  ) : studentLedger.length === 0 ? (
                    <div className="text-center text-xs text-slate-400 py-24 font-semibold">No general ledger postings linked to this student ID.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 text-[10px] uppercase font-black tracking-widest text-slate-400 border-b border-slate-100">
                            <th className="px-6 py-3">Entry ID</th>
                            <th className="px-6 py-3">Date</th>
                            <th className="px-6 py-3">Description</th>
                            <th className="px-6 py-3">Posting GL Account</th>
                            <th className="px-6 py-3 text-right">Debit (+)</th>
                            <th className="px-6 py-3 text-right">Credit (-)</th>
                            <th className="px-6 py-3">Type</th>
                            <th className="px-6 py-3 text-center">Receipt</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700 text-xs">
                          {studentLedger.map((post, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50">
                              <td className="px-6 py-3 font-bold text-slate-400">#JE{post.entry_id}</td>
                              <td className="px-6 py-3">{post.entry_date}</td>
                              <td className="px-6 py-3">
                                <div className="font-bold text-slate-800">{post.description}</div>
                                {post.reference && <div className="text-[9px] text-slate-400">Ref: {post.reference}</div>}
                              </td>
                              <td className="px-6 py-3 font-bold text-slate-500">{post.account_name}</td>
                              <td className="px-6 py-3 text-right text-emerald-700 font-semibold">
                                {post.debit_mmk > 0 && `${formatAmount(post.debit_mmk)} MMK`}
                                {post.debit_gbp > 0 && `£${post.debit_gbp.toFixed(2)}`}
                              </td>
                              <td className="px-6 py-3 text-right text-rose-700 font-semibold">
                                {post.credit_mmk > 0 && `${formatAmount(post.credit_mmk)} MMK`}
                                {post.credit_gbp > 0 && `£${post.credit_gbp.toFixed(2)}`}
                              </td>
                              <td className="px-6 py-3">
                                <span className="px-2 py-0.5 rounded bg-slate-100 font-semibold text-[9px] uppercase text-slate-500">
                                  {post.entry_type}
                                </span>
                              </td>
                              <td className="px-6 py-3 text-center">
                                {post.reference && studentPayments.some(p => p.receipt_id === post.reference) ? (
                                  <button
                                    onClick={() => handleDownloadReceipt(post.reference)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-brand-50 border border-brand-100 hover:bg-brand-100 text-brand-700 text-[10px] font-bold cursor-pointer transition-all active:scale-95"
                                    title="Download Receipt"
                                  >
                                    <Receipt className="w-3 h-3" />
                                    View
                                  </button>
                                ) : (
                                  <span className="text-slate-300">—</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

      </div>

      {/* --- MODALS --- */}

      {/* 1. Add General Ledger Account Modal */}
      {accountModalOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden flex flex-col p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <h3 className="font-black text-slate-800 text-base uppercase tracking-wider">Create GL Account</h3>
              <button onClick={() => setAccountModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAccount} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Account Name *</label>
                <input
                  type="text"
                  required
                  value={newAccName}
                  onChange={(e) => setNewAccName(e.target.value)}
                  placeholder="e.g. Petty Cash (MMK)"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Account Type *</label>
                <select
                  value={newAccType}
                  onChange={(e) => setNewAccType(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-xs font-semibold text-slate-700"
                >
                  <option value="Asset">Asset</option>
                  <option value="Liability">Liability</option>
                  <option value="Equity">Equity</option>
                  <option value="Revenue">Revenue</option>
                  <option value="Expense">Expense</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Currency *</label>
                <select
                  value={newAccCurrency}
                  onChange={(e) => setNewAccCurrency(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-xs font-semibold text-slate-700"
                >
                  <option value="MMK">MMK (Kyat)</option>
                  <option value="GBP">GBP (Pound Sterling)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 mt-4">
                <button
                  type="button"
                  onClick={() => setAccountModalOpen(false)}
                  className="px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-brand-600/10 active:scale-95 cursor-pointer"
                >
                  Save Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Record Manual Journal Entry Modal */}
      {journalModalOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto py-10 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col my-auto max-h-[90vh] p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4 shrink-0">
              <h3 className="font-black text-slate-800 text-base uppercase tracking-wider flex items-center gap-1.5">
                <ArrowLeftRight className="w-5 h-5 text-brand-600" />
                Record Manual Journal Entry
              </h3>
              <button onClick={() => setJournalModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateJournalEntry} className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Description *</label>
                  <input
                    type="text"
                    required
                    value={jeDescription}
                    onChange={(e) => setJeDescription(e.target.value)}
                    placeholder="e.g. Adjusting depreciation"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Reference (Ref #)</label>
                  <input
                    type="text"
                    value={jeReference}
                    onChange={(e) => setJeReference(e.target.value)}
                    placeholder="e.g. REF-2026"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Entry Date</label>
                  <input
                    type="date"
                    value={jeDate}
                    onChange={(e) => setJeDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-xs font-semibold text-slate-700"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <div className="flex justify-between items-center mb-2.5">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Journal Posting Lines</span>
                  <button
                    type="button"
                    onClick={() => setJeLines([...jeLines, { account_id: "", debit_mmk: 0, credit_mmk: 0, debit_gbp: 0, credit_gbp: 0 }])}
                    className="flex items-center gap-1 text-[11px] font-bold text-brand-600 hover:text-brand-700 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Line
                  </button>
                </div>

                <div className="space-y-3">
                  {jeLines.map((line, idx) => (
                    <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center p-3 bg-slate-50 rounded-2xl border border-slate-200">
                      <div className="md:col-span-4">
                        <label className="block text-[9px] font-bold text-slate-500 mb-0.5 uppercase">GL Account</label>
                        <select
                          required
                          value={line.account_id}
                          onChange={(e) => {
                            const copy = [...jeLines];
                            copy[idx].account_id = e.target.value;
                            setJeLines(copy);
                          }}
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none bg-white text-slate-700"
                        >
                          <option value="">Select Account</option>
                          {accounts.map(acc => (
                            <option key={acc.account_id} value={acc.account_id}>{acc.account_name} ({acc.account_type})</option>
                          ))}
                        </select>
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-[9px] font-bold text-slate-500 mb-0.5 uppercase">Debit (MMK)</label>
                        <input
                          type="number"
                          step="any"
                          value={line.debit_mmk || ""}
                          onChange={(e) => {
                            const copy = [...jeLines];
                            copy[idx].debit_mmk = e.target.value ? Number(e.target.value) : 0;
                            if (copy[idx].debit_mmk > 0) copy[idx].credit_mmk = 0; // debit/credit mutual exclusivity
                            setJeLines(copy);
                          }}
                          placeholder="0"
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none bg-white text-slate-800"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-[9px] font-bold text-slate-500 mb-0.5 uppercase">Credit (MMK)</label>
                        <input
                          type="number"
                          step="any"
                          value={line.credit_mmk || ""}
                          onChange={(e) => {
                            const copy = [...jeLines];
                            copy[idx].credit_mmk = e.target.value ? Number(e.target.value) : 0;
                            if (copy[idx].credit_mmk > 0) copy[idx].debit_mmk = 0;
                            setJeLines(copy);
                          }}
                          placeholder="0"
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none bg-white text-slate-800"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-[9px] font-bold text-slate-500 mb-0.5 uppercase">Debit (£)</label>
                        <input
                          type="number"
                          step="any"
                          value={line.debit_gbp || ""}
                          onChange={(e) => {
                            const copy = [...jeLines];
                            copy[idx].debit_gbp = e.target.value ? Number(e.target.value) : 0;
                            if (copy[idx].debit_gbp > 0) copy[idx].credit_gbp = 0;
                            setJeLines(copy);
                          }}
                          placeholder="0"
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none bg-white text-slate-800"
                        />
                      </div>

                      <div className="md:col-span-1.5">
                        <label className="block text-[9px] font-bold text-slate-500 mb-0.5 uppercase">Credit (£)</label>
                        <input
                          type="number"
                          step="any"
                          value={line.credit_gbp || ""}
                          onChange={(e) => {
                            const copy = [...jeLines];
                            copy[idx].credit_gbp = e.target.value ? Number(e.target.value) : 0;
                            if (copy[idx].credit_gbp > 0) copy[idx].debit_gbp = 0;
                            setJeLines(copy);
                          }}
                          placeholder="0"
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none bg-white text-slate-800"
                        />
                      </div>

                      <div className="md:col-span-0.5 flex justify-center pt-3 md:pt-0">
                        {jeLines.length > 2 && (
                          <button
                            type="button"
                            onClick={() => setJeLines(jeLines.filter((_, i) => i !== idx))}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dynamic balances preview */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl shrink-0 mt-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between text-xs font-bold gap-3">
                  <div className="flex items-center gap-4">
                    <div>
                      <span className="text-slate-400 mr-2 uppercase text-[10px]">MMK Balance:</span>
                      <span className={clsx(
                        jeLines.reduce((sum, l) => sum + Number(l.debit_mmk || 0), 0) === jeLines.reduce((sum, l) => sum + Number(l.credit_mmk || 0), 0)
                          ? "text-emerald-700" : "text-rose-600"
                      )}>
                        Debits {formatAmount(jeLines.reduce((sum, l) => sum + Number(l.debit_mmk || 0), 0))} / Credits {formatAmount(jeLines.reduce((sum, l) => sum + Number(l.credit_mmk || 0), 0))}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 mr-2 uppercase text-[10px]">GBP Balance:</span>
                      <span className={clsx(
                        jeLines.reduce((sum, l) => sum + Number(l.debit_gbp || 0), 0) === jeLines.reduce((sum, l) => sum + Number(l.credit_gbp || 0), 0)
                          ? "text-emerald-700" : "text-rose-600"
                      )}>
                        Debits £{jeLines.reduce((sum, l) => sum + Number(l.debit_gbp || 0), 0).toFixed(2)} / Credits £{jeLines.reduce((sum, l) => sum + Number(l.credit_gbp || 0), 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setJournalModalOpen(false)}
                      className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-brand-600/10 active:scale-95 cursor-pointer"
                    >
                      Post Journal Entry
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Create Expense Modal */}
      {expenseModalOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <h3 className="font-black text-slate-800 text-base uppercase tracking-wider flex items-center gap-1.5">
                <CreditCard className="w-5 h-5 text-brand-600" />
                Log Departmental Expense
              </h3>
              <button onClick={() => setExpenseModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateExpense} className="space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar pr-1">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Title *</label>
                <input
                  type="text"
                  required
                  value={expTitle}
                  onChange={(e) => setExpTitle(e.target.value)}
                  placeholder="e.g. Electric bill - May 2026"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-xs font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Amount (MMK) *</label>
                  <input
                    type="number"
                    required
                    value={expAmountMmk}
                    onChange={(e) => setExpAmountMmk(e.target.value ? Number(e.target.value) : "")}
                    placeholder="e.g. 50000"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Budget Allocation (MMK)</label>
                  <input
                    type="number"
                    value={expBudgetAmount}
                    onChange={(e) => setExpBudgetAmount(e.target.value ? Number(e.target.value) : "")}
                    placeholder="e.g. 60000"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-xs font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Category *</label>
                  <select
                    value={expCategorySelect}
                    onChange={(e) => setExpCategorySelect(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-xs font-semibold text-slate-700"
                  >
                    <option value="utilities">Utilities</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="salaries">Salaries</option>
                    <option value="petty_cash">Petty Cash Drawer</option>
                    <option value="others">Others</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Department *</label>
                  <select
                    value={expDepartment}
                    onChange={(e) => setExpDepartment(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-xs font-semibold text-slate-700"
                  >
                    <option value="College">College</option>
                    <option value="InfoTech">InfoTech</option>
                    <option value="General">General / HQ</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Payment Source *</label>
                  <select
                    value={expPaymentMethod}
                    onChange={(e) => setExpPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-xs font-semibold text-slate-700"
                  >
                    <option value="Cash">Cash in Hand</option>
                    <option value="Bank">CB Bank Transfer</option>
                    <option value="Petty Cash">Petty Cash Drawer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Expense Date</label>
                  <input
                    type="date"
                    value={expDate}
                    onChange={(e) => setExpDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-xs font-semibold text-slate-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Description / Notes</label>
                <textarea
                  value={expDescription}
                  onChange={(e) => setExpDescription(e.target.value)}
                  placeholder="Provide brief details on what this expense is for..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-xs font-semibold min-h-[60px]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 mt-4">
                <button
                  type="button"
                  onClick={() => setExpenseModalOpen(false)}
                  className="px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-brand-600/10 active:scale-95 cursor-pointer"
                >
                  Submit for Approval
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
