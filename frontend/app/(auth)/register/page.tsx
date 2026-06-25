"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { AuthService, PublicCourse } from "@/services/auth.service";
import { Loader2, User, ChevronRight, ChevronLeft, Check, Camera, AlertCircle, X } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function SignaturePad({ value, onChange }: { value: string; onChange: (val: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.strokeStyle = "#0d4d4d"; // Brand color
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Adjust canvas resolution for crisp rendering
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);

    if (!value) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, [value]);

  const getCoordinates = (e: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if (e.changedTouches && e.changedTouches.length > 0) {
      clientX = e.changedTouches[0].clientX;
      clientY = e.changedTouches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDrawing = (e: any) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: any) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = (e: any) => {
    if (!isDrawing) return;
    e.preventDefault();
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      onChange(canvas.toDataURL("image/png"));
    }
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    onChange("");
  };

  return (
    <div className="space-y-3">
      <div className="relative border-2 border-dashed border-slate-200 rounded-3xl overflow-hidden bg-slate-50 h-52 group hover:border-[#0d4d4d]/30 transition-all">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="w-full h-full cursor-crosshair touch-none"
        />
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute top-4 right-4 px-4 py-2 bg-white text-xs font-bold border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-100 hover:text-slate-950 transition-all shadow-sm active:scale-[0.98]"
          >
            Clear
          </button>
        )}
      </div>
      <p className="text-xs text-slate-400 text-center font-medium">Draw your signature inside the box above. Touchscreen and mouse drawing are supported.</p>
    </div>
  );
}

const STEPS = [
  { id: 1, title: "Personal Info", desc: "Profile photo and basic details." },
  { id: 2, title: "Academic Info", desc: "Select your desired course." },
  { id: 3, title: "Guardian & Home", desc: "Contact for your guardian." },
  { id: 4, title: "Survey", desc: "How did you hear about us?" },
  { id: 5, title: "E-Signature", desc: "Provide your signature to complete." },
];

export default function RegisterPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    date_of_birth: "",
    phone: "",
    nrc: "",
    gender: "",
    parent_name: "",
    parent_phone: "",
    address: "",
    profile_picture: "",
    department: "College",
    course_code: "",
    student_type: "New Student",
    signature: "",
  });
  
  const [courses, setCourses] = useState<PublicCourse[]>([]);
  const [howDidYouHear, setHowDidYouHear] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [otherHearAbout, setOtherHearAbout] = useState("");
  
  // Dynamically derive categories from courses
  const categories = useMemo(() => {
    const cats = new Set<string>();
    courses.forEach(c => {
      if (c.category) {
        cats.add(c.category);
      }
    });
    return Array.from(cats).sort();
  }, [courses]);
   const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (error && errorRef.current) {
      errorRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [error]);

  const totalSteps = STEPS.length;

  useEffect(() => {
    const fetchCourses = async () => {
        try {
            const data = await AuthService.listCourses();
            setCourses(data);
        } catch (err) {
            console.error("Failed to fetch courses", err);
        }
    };
    fetchCourses();
  }, []);

  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async () => {
    setError("");
    setLoading(true);

    try {
      const finalFormData = {
        ...formData,
        email: formData.email.trim(),
        date_of_birth: formData.date_of_birth,
        nrc: formData.nrc.trim(),
        gender: formData.gender,
        parent_name: formData.parent_name.trim(),
        parent_phone: formData.parent_phone.trim(),
        address: formData.address.trim(),
        student_type: formData.student_type,
        signature: formData.signature,
        how_did_you_hear: [
          ...howDidYouHear.filter((item) => item !== "Other (Please Specify)"),
          ...(howDidYouHear.includes("Other (Please Specify)") && otherHearAbout ? [`Other: ${otherHearAbout}`] : [])
        ].join(", ").trim()
      };
      
      await AuthService.register(finalFormData);
      setIsSuccess(true);
    } catch (err: any) {
      const details = err.response?.data?.detail;
      if (Array.isArray(details)) {
        setError(details.map((d: any) => `${d.loc.join(".")}: ${d.msg}`).join(", "));
      } else {
        setError(
          err.response?.data?.message ||
          err.message ||
          "Registration failed. Please check your internet connection and try again."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleHearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target;
    if (checked) {
      setHowDidYouHear((prev) => [...prev, value]);
    } else {
      setHowDidYouHear((prev) => prev.filter((item) => item !== value));
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError("Image must be less than 5MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({ ...prev, profile_picture: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const validateStep = (step: number) => {
    setError("");
    if (step === 1) {
      if (!formData.profile_picture) return "Profile picture is required";
      if (!formData.username.trim()) return "Full name is required";
      if (!formData.email.trim()) return "Email address is required";
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) return "Please enter a valid email address";
      if (!formData.phone.trim()) return "Phone number is required";
      if (!formData.date_of_birth) return "Date of Birth is required";
      if (!formData.nrc.trim()) return "NRC Number is required";
      if (!formData.gender) return "Gender selection is required";
    }
    if (step === 2) {
      if (!formData.course_code.trim()) return "Please select a course of interest";
      if (!formData.student_type) return "Please select your student type";
    }
    if (step === 3) {
      if (!formData.parent_name.trim()) return "Parent/Guardian name is required";
      if (!formData.parent_phone.trim()) return "Guardian phone number is required";
      if (!formData.address.trim()) return "Full address is required";
    }
    if (step === 4) {
      if (howDidYouHear.length === 0) return "Please select how you heard about us";
      if (howDidYouHear.includes("Other (Please Specify)") && !otherHearAbout.trim()) return "Please specify how you heard about us";
    }
    if (step === 5) {
      if (!formData.signature) return "E-signature is required. Please sign inside the box.";
    }
    return "";
  };

  const nextStep = () => {
    const errorMsg = validateStep(currentStep);
    if (errorMsg) {
      setError(errorMsg);
      return;
    }
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit();
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="min-h-screen bg-white md:bg-[#f3f4f6] flex items-center justify-center md:py-12 md:px-4 selection:bg-[#0d4d4d]/20">
      <div className="w-full max-w-[1000px] h-full min-h-screen md:h-[720px] md:min-h-0 bg-white md:rounded-[40px] md:shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] flex flex-col md:flex-row overflow-hidden md:ring-1 md:ring-black/5">
        
        {isSuccess ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 md:p-24 text-center animate-in fade-in zoom-in duration-500">
                <div className="w-24 h-24 relative bg-white rounded-3xl p-4 shadow-xl shadow-[#0d4d4d]/10 mb-8 overflow-hidden border border-slate-100">
                    <Image 
                        src="/icons/logo_png.png" 
                        alt="NiT Logo" 
                        fill 
                        className="object-contain p-4"
                        priority
                    />
                </div>
                
                <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-10 shadow-inner">
                    <Check size={40} strokeWidth={3} />
                </div>
                
                <h1 className="text-3xl md:text-4xl font-black text-slate-900 mb-6 tracking-tight">Registration Received!</h1>
                <p className="text-slate-500 text-lg md:text-xl max-w-md mx-auto leading-relaxed mb-12">
                   Thank you for joining <span className="text-[#0d4d4d] font-bold">NiT</span>. Your application has been submitted successfully and is currently awaiting administrator review. 
                </p>
                
                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 max-w-sm w-full mb-12">
                   <p className="text-slate-600 text-sm font-medium">Please contact our administration team for faster approval and account activation.</p>
                </div>
                
            </div>
        ) : (
            <>
                {/* Sidebar (Desktop) */}
                <div className="hidden md:flex w-[320px] bg-[#0d4d4d] p-10 flex-col justify-between relative overflow-hidden">
                <div className="absolute top-[-10%] right-[-10%] w-[200px] h-[200px] bg-white/5 rounded-full blur-3xl pointer-events-none" />
                
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-12">
                    <div className="w-10 h-10 relative bg-white rounded-xl p-1.5 overflow-hidden">
                            <Image 
                                src="/icons/logo_png.png" 
                                alt="NiT Logo" 
                                fill 
                                className="object-contain p-2"
                                priority
                            />
                    </div>
                    <span className="text-xl font-bold tracking-tight text-white/90">NiT Student</span>
                    </div>
 
                    <div className="mb-10">
                        <span className="text-[#10b981] text-xs font-bold tracking-widest uppercase mb-2 block">Step {currentStep}</span>
                        <p className="text-white/70 text-sm leading-relaxed">
                        {STEPS[currentStep - 1].desc}
                        </p>
                    </div>

                    <div className="space-y-6">
                    {STEPS.map((step) => (
                        <div key={step.id} className="flex items-center gap-4 group cursor-default">
                        <div className={cn(
                            "w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all duration-300 font-bold text-sm",
                            currentStep === step.id 
                                ? "bg-white border-white text-[#0d4d4d] shadow-[0_0_20px_rgba(255,255,255,0.2)]" 
                                : currentStep > step.id 
                                    ? "bg-[#10b981] border-[#10b981] text-white" 
                                    : "border-white/20 text-white/40"
                        )}>
                            {currentStep > step.id ? <Check size={18} strokeWidth={3} /> : step.id}
                        </div>
                        <div className="flex flex-col">
                            <span className={cn(
                                "text-sm font-bold transition-colors duration-300",
                                currentStep >= step.id ? "text-white" : "text-white/30"
                            )}>
                                {step.title}
                            </span>
                        </div>
                        </div>
                    ))}
                    </div>
                </div>

                <div className="relative z-10 text-white/40 text-xs">
                    © 2026 NiT Student Management
                </div>
                </div>

                {/* Mobile Header */}
                <div className="md:hidden bg-[#0d4d4d] p-6 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 relative bg-white rounded-lg p-1.5 overflow-hidden">
                                <Image src="/icons/logo_png.png" alt="NiT Logo" fill className="object-contain p-1.5" priority />
                            </div>
                        </div>
                        <div className="text-white/60 text-xs font-bold uppercase tracking-widest">
                            Step {currentStep} of {totalSteps}
                        </div>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-white transition-all duration-500 ease-out" 
                            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
                        />
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 p-6 md:p-12 flex flex-col relative bg-white overflow-hidden">
                
                <div className="flex items-center gap-4 mb-8 md:mb-10">
                    <div className="w-12 h-12 bg-[#0d4d4d]/5 rounded-2xl flex items-center justify-center text-[#0d4d4d] flex-shrink-0">
                        <User size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold text-slate-900 leading-tight">{STEPS[currentStep-1].title}</h1>
                        <p className="text-slate-500 text-sm">Please provide accurate information.</p>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto pr-1 md:pr-2 custom-scrollbar">
                    {error && (
                        <div 
                            ref={errorRef}
                            className="mb-8 p-5 bg-red-50 border-2 border-red-100 text-red-700 text-sm font-bold rounded-3xl flex items-start gap-3 animate-in fade-in slide-in-from-top-4 duration-500 shadow-sm"
                        >
                            <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center shrink-0 mt-0.5">
                                <AlertCircle size={14} className="text-red-600" />
                            </div>
                            <div className="flex-1 leading-relaxed">
                                <p className="text-red-800 font-extrabold mb-1">Registration Error</p>
                                {error}
                            </div>
                            <button onClick={() => setError("")} className="text-red-400 hover:text-red-600 transition-colors p-1"><X size={16} /></button>
                        </div>
                    )}

                    {/* Step Content */}
                    <div className="pb-6">
                        {currentStep === 1 && (
                            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                {/* Profile Upload at Top */}
                                <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 group hover:border-[#0d4d4d]/30 transition-all relative">
                                    {formData.profile_picture ? (
                                        <div className="relative w-24 h-24">
                                            <img src={formData.profile_picture} className="w-full h-full object-cover rounded-2xl shadow-md" alt="Profile" />
                                            <button onClick={() => setFormData(p => ({...p, profile_picture: ""}))} className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-md transition-transform hover:scale-110"><ChevronLeft className="rotate-45" size={14} /></button>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-slate-400 group-hover:text-[#0d4d4d] transition-colors"><Camera size={20} /></div>
                                            <div className="text-center">
                                                <p className="text-xs font-bold text-slate-700">Upload Photo <span className="text-red-500">*</span></p>
                                            </div>
                                            <label className="absolute inset-0 cursor-pointer"><input type="file" accept="image/*" onChange={handleImageChange} className="hidden" /></label>
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-bold text-slate-700">Full Name <span className="text-red-500">*</span></label>
                                        <input name="username" value={formData.username} onChange={handleChange} placeholder="e.g. John Doe" className="w-full px-4 py-3 bg-slate-50 rounded-2xl border border-slate-200 focus:border-[#0d4d4d] focus:bg-white focus:outline-none transition-all" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-bold text-slate-700">Email Address <span className="text-red-500">*</span></label>
                                        <input name="email" type="email" value={formData.email} onChange={handleChange} placeholder="john@example.com" className="w-full px-4 py-3 bg-slate-50 rounded-2xl border border-slate-200 focus:border-[#0d4d4d] focus:bg-white focus:outline-none transition-all" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-bold text-slate-700">Phone Number <span className="text-red-500">*</span></label>
                                        <input name="phone" value={formData.phone} onChange={handleChange} placeholder="+95 9..." className="w-full px-4 py-3 bg-slate-50 rounded-2xl border border-slate-200 focus:border-[#0d4d4d] focus:bg-white focus:outline-none transition-all" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-bold text-slate-700">Date of Birth <span className="text-red-500">*</span></label>
                                        <input name="date_of_birth" type="date" value={formData.date_of_birth} onChange={handleChange} className="w-full px-4 py-3 bg-slate-50 rounded-2xl border border-slate-200 focus:border-[#0d4d4d] focus:bg-white focus:outline-none transition-all" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-bold text-slate-700">NRC Number <span className="text-red-500">*</span></label>
                                        <input name="nrc" value={formData.nrc} onChange={handleChange} placeholder="Enter NRC" className="w-full px-4 py-3 bg-slate-50 rounded-2xl border border-slate-200 focus:border-[#0d4d4d] focus:bg-white focus:outline-none transition-all" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-bold text-slate-700">Gender <span className="text-red-500">*</span></label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {["Male", "Female", "Other"].map((g) => (
                                                <button key={g} type="button" onClick={() => setFormData(p => ({...p, gender: g}))} className={cn("py-3 rounded-2xl border-2 text-sm font-medium transition-all", formData.gender === g ? "border-[#0d4d4d] bg-[#0d4d4d]/5 text-[#0d4d4d]" : "border-slate-100 text-slate-500 hover:border-slate-200")}>{g}</button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {currentStep === 2 && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-bold text-slate-700">Course Category</label>
                                        <select 
                                            value={selectedCategory} 
                                            onChange={(e) => {
                                                setSelectedCategory(e.target.value);
                                                setFormData(prev => ({ ...prev, course_code: "" }));
                                            }}
                                            className="w-full px-4 py-3.5 bg-slate-50 rounded-2xl border border-slate-200 focus:border-[#0d4d4d] focus:bg-white focus:outline-none transition-all text-slate-700 font-medium appearance-none cursor-pointer"
                                        >
                                            <option value="">All Categories</option>
                                            {categories.map((cat: string) => (
                                                <option key={cat} value={cat}>{cat}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-bold text-slate-700">Select Your Course <span className="text-red-500">*</span></label>
                                        <select 
                                            name="course_code"
                                            value={formData.course_code} 
                                            onChange={handleChange}
                                            className="w-full px-4 py-3.5 bg-slate-50 rounded-2xl border border-slate-200 focus:border-[#0d4d4d] focus:bg-white focus:outline-none transition-all text-slate-700 font-medium appearance-none cursor-pointer"
                                        >
                                            <option value="" disabled>Choose a course...</option>
                                            {courses
                                                .filter(c => !selectedCategory || c.category === selectedCategory)
                                                .map((course) => (
                                                    <option key={course.course_code} value={course.course_code}>
                                                        {course.course_name}
                                                    </option>
                                                ))
                                            }
                                        </select>
                                        {courses.length === 0 && (
                                            <p className="text-xs text-amber-600 font-medium animate-pulse">No courses available. Please contact support.</p>
                                        )}
                                    </div>
                                <div className="space-y-4">
                                    <label className="text-sm font-bold text-slate-700">Student Type <span className="text-red-500">*</span></label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {["New Student", "Old Student"].map((type) => (
                                            <button key={type} type="button" onClick={() => setFormData(p => ({...p, student_type: type}))} className={cn("px-4 py-3 rounded-2xl border-2 transition-all text-sm font-medium", formData.student_type === type ? "border-[#0d4d4d] bg-[#0d4d4d]/5 text-[#0d4d4d]" : "border-slate-100 hover:border-slate-200 text-slate-500")}>{type}</button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {currentStep === 3 && (
                            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-bold text-slate-700">Parent/Guardian Name <span className="text-red-500">*</span></label>
                                    <input name="parent_name" value={formData.parent_name} onChange={handleChange} placeholder="Enter guardian name" className="w-full px-4 py-3 bg-slate-50 rounded-2xl border border-slate-200 focus:border-[#0d4d4d] focus:bg-white focus:outline-none transition-all" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-bold text-slate-700">Guardian Phone Number <span className="text-red-500">*</span></label>
                                    <input name="parent_phone" value={formData.parent_phone} onChange={handleChange} placeholder="+95 9..." className="w-full px-4 py-3 bg-slate-50 rounded-2xl border border-slate-200 focus:border-[#0d4d4d] focus:bg-white focus:outline-none transition-all" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-bold text-slate-700">Full Address <span className="text-red-500">*</span></label>
                                    <textarea name="address" value={formData.address} onChange={handleChange} rows={3} placeholder="Enter your current address" className="w-full px-4 py-3 bg-slate-50 rounded-2xl border border-slate-200 focus:border-[#0d4d4d] focus:bg-white focus:outline-none transition-all resize-none" />
                                </div>
                            </div>
                        )}

                        {currentStep === 4 && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div className="space-y-4">
                                    <label className="text-sm font-bold text-slate-700">How Did You Hear About Us? <span className="text-red-500">*</span></label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {["Facebook", "TikTok", "Friend Referral", "NiT Event", "Other (Please Specify)"].map((option) => (
                                            <label key={option} className={cn("flex items-center gap-3 p-3 rounded-2xl border transition-all cursor-pointer", howDidYouHear.includes(option) ? "border-[#0d4d4d] bg-[#0d4d4d]/5" : "border-slate-100 bg-white hover:border-slate-200")}>
                                                <input type="checkbox" checked={howDidYouHear.includes(option)} onChange={handleHearChange} value={option} className="w-4 h-4 rounded border-slate-300 text-[#0d4d4d] focus:ring-[#0d4d4d]" />
                                                <span className="text-sm font-medium text-slate-700">{option}</span>
                                            </label>
                                        ))}
                                    </div>
                                    {howDidYouHear.includes("Other (Please Specify)") && (
                                        <input value={otherHearAbout} onChange={(e) => setOtherHearAbout(e.target.value)} placeholder="Please specify..." className="w-full px-4 py-3 bg-slate-50 rounded-2xl border border-slate-200 focus:border-[#0d4d4d] focus:bg-white focus:outline-none transition-all mt-1" />
                                    )}
                                </div>
                            </div>
                        )}

                        {currentStep === 5 && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div className="space-y-4">
                                    <label className="text-sm font-bold text-slate-700">E-Signature <span className="text-red-500">*</span></label>
                                    <SignaturePad 
                                        value={formData.signature} 
                                        onChange={(val) => setFormData(p => ({ ...p, signature: val }))} 
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Navigation Controls */}
                <div className="pt-6 md:pt-8 flex items-center justify-between border-t border-slate-100 mt-auto bg-white">
                    <button
                        onClick={prevStep}
                        className={cn(
                            "px-6 md:px-8 py-3.5 md:py-4 rounded-2xl font-bold flex items-center gap-2 transition-all",
                            currentStep === 1 ? "opacity-0 pointer-events-none" : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                        )}
                    >
                        <ChevronLeft size={20} />
                        <span className="hidden sm:inline">Back</span>
                    </button>

                    <button
                        onClick={nextStep}
                        disabled={loading}
                        className="px-8 md:px-10 py-3.5 md:py-4 bg-[#0d4d4d] text-white rounded-2xl font-bold flex items-center gap-2 hover:bg-[#0d4d4d]/90 active:scale-[0.98] transition-all shadow-[0_4px_20px_rgba(13,77,77,0.2)] disabled:opacity-70"
                    >
                        {loading ? <Loader2 className="animate-spin" size={20} /> : (
                            <>
                                {currentStep === totalSteps ? "Finish" : "Next"}
                                <ChevronRight size={20} />
                            </>
                        )}
                    </button>
                </div>

                {/* Login Link */}
               
                </div>
            </>
        )}

      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
            width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
            background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
            background: #e2e8f0;
            border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #cbd5e1;
        }
      `}</style>
    </div>
  );
}
