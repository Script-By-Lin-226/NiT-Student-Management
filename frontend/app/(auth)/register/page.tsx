"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/services/api";
import { Loader2, User, ChevronRight, ChevronLeft, Check, Camera } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const STEPS = [
  { id: 1, title: "Personal Info", desc: "Your basic contact details." },
  { id: 2, title: "Academic Info", desc: "Department and identification." },
  { id: 3, title: "Guardian & Home", desc: "Contact for your guardian." },
  { id: 4, title: "Final Details", desc: "Profile photo and survey." },
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
    parent_name: "",
    parent_phone: "",
    address: "",
    profile_picture: "",
    department: "College",
    student_type: "New Student",
  });
  
  const [howDidYouHear, setHowDidYouHear] = useState<string[]>([]);
  const [otherHearAbout, setOtherHearAbout] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const totalSteps = STEPS.length;

  const handleSubmit = async () => {
    setError("");
    setLoading(true);

    try {
      const finalFormData = {
        ...formData,
        how_did_you_hear: [
          ...howDidYouHear.filter((item) => item !== "Other (Please Specify)"),
          ...(howDidYouHear.includes("Other (Please Specify)") && otherHearAbout ? [`Other: ${otherHearAbout}`] : [])
        ].join(", ")
      };
      
      const res = await api.post("/auth/register", finalFormData);
      if (res.status === 200 || res.status === 201) {
        alert("Registration successful! We will contact you shortly.");
        window.location.reload();
      }
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
          err.response?.data?.message ||
          "Registration failed. Please check your inputs."
      );
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

  const nextStep = () => {
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
    <div className="min-h-screen bg-[#f3f4f6] flex items-center justify-center md:py-12 md:px-4 selection:bg-[#0d4d4d]/20">
      <div className="w-full max-w-[1000px] h-full min-h-screen md:h-[720px] md:min-h-0 bg-white md:rounded-[40px] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] flex flex-col md:flex-row overflow-hidden ring-1 ring-black/5">
        
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
                <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm font-medium rounded-r-xl">
                    {error}
                </div>
             )}

             {/* Step Content */}
             <div className="pb-6">
                {currentStep === 1 && (
                    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="space-y-1.5">
                            <label className="text-sm font-bold text-slate-700">Full Name</label>
                            <input name="username" value={formData.username} onChange={handleChange} placeholder="e.g. John Doe" className="w-full px-4 py-3 bg-slate-50 rounded-2xl border border-slate-200 focus:border-[#0d4d4d] focus:bg-white focus:outline-none transition-all" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-bold text-slate-700">Email Address</label>
                            <input name="email" type="email" value={formData.email} onChange={handleChange} placeholder="john@example.com" className="w-full px-4 py-3 bg-slate-50 rounded-2xl border border-slate-200 focus:border-[#0d4d4d] focus:bg-white focus:outline-none transition-all" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="space-y-1.5">
                                <label className="text-sm font-bold text-slate-700">Phone Number</label>
                                <input name="phone" value={formData.phone} onChange={handleChange} placeholder="+95 9..." className="w-full px-4 py-3 bg-slate-50 rounded-2xl border border-slate-200 focus:border-[#0d4d4d] focus:bg-white focus:outline-none transition-all" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-bold text-slate-700">Date of Birth</label>
                                <input name="date_of_birth" type="date" value={formData.date_of_birth} onChange={handleChange} className="w-full px-4 py-3 bg-slate-50 rounded-2xl border border-slate-200 focus:border-[#0d4d4d] focus:bg-white focus:outline-none transition-all" />
                            </div>
                        </div>
                    </div>
                )}

                {currentStep === 2 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="space-y-4">
                            <label className="text-sm font-bold text-slate-700">Department</label>
                            <div className="grid grid-cols-2 gap-3 md:gap-4">
                                {["College", "Institute"].map((dept) => (
                                    <button key={dept} type="button" onClick={() => setFormData(p => ({...p, department: dept}))} className={cn("px-4 py-4 rounded-3xl border-2 transition-all flex flex-col items-center gap-1", formData.department === dept ? "border-[#0d4d4d] bg-[#0d4d4d]/5 text-[#0d4d4d]" : "border-slate-100 hover:border-slate-200 text-slate-500")}>
                                        <span className="font-bold">{dept === "College" ? "CO" : "IN"}</span>
                                        <span className="text-xs">{dept}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-4">
                            <label className="text-sm font-bold text-slate-700">Student Type</label>
                            <div className="grid grid-cols-2 gap-3 md:gap-4">
                                {["New Student", "Old Student"].map((type) => (
                                    <button key={type} type="button" onClick={() => setFormData(p => ({...p, student_type: type}))} className={cn("px-4 py-3 rounded-2xl border-2 transition-all text-sm font-medium", formData.student_type === type ? "border-[#0d4d4d] bg-[#0d4d4d]/5 text-[#0d4d4d]" : "border-slate-100 hover:border-slate-200 text-slate-500")}>{type}</button>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-bold text-slate-700">NRC (Optional)</label>
                            <input name="nrc" value={formData.nrc} onChange={handleChange} placeholder="Enter NRC number" className="w-full px-4 py-3 bg-slate-50 rounded-2xl border border-slate-200 focus:border-[#0d4d4d] focus:bg-white focus:outline-none transition-all" />
                        </div>
                    </div>
                )}

                {currentStep === 3 && (
                    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="space-y-1.5">
                            <label className="text-sm font-bold text-slate-700">Parent/Guardian Name</label>
                            <input name="parent_name" value={formData.parent_name} onChange={handleChange} placeholder="Enter guardian name" className="w-full px-4 py-3 bg-slate-50 rounded-2xl border border-slate-200 focus:border-[#0d4d4d] focus:bg-white focus:outline-none transition-all" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-bold text-slate-700">Guardian Phone Number</label>
                            <input name="parent_phone" value={formData.parent_phone} onChange={handleChange} placeholder="+95 9..." className="w-full px-4 py-3 bg-slate-50 rounded-2xl border border-slate-200 focus:border-[#0d4d4d] focus:bg-white focus:outline-none transition-all" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-bold text-slate-700">Full Address</label>
                            <textarea name="address" value={formData.address} onChange={handleChange} rows={3} placeholder="Enter your current address" className="w-full px-4 py-3 bg-slate-50 rounded-2xl border border-slate-200 focus:border-[#0d4d4d] focus:bg-white focus:outline-none transition-all resize-none" />
                        </div>
                    </div>
                )}

                {currentStep === 4 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="flex flex-col items-center justify-center p-6 md:p-8 bg-slate-50 rounded-[40px] border-2 border-dashed border-slate-200 group hover:border-[#0d4d4d]/30 transition-all relative">
                            {formData.profile_picture ? (
                                <div className="relative w-28 h-28 md:w-32 md:h-32">
                                    <img src={formData.profile_picture} className="w-full h-full object-cover rounded-3xl shadow-lg" alt="Profile" />
                                    <button onClick={() => setFormData(p => ({...p, profile_picture: ""}))} className="absolute -top-2 -right-2 bg-red-500 text-white p-1.5 rounded-full shadow-md transition-transform hover:scale-110"><ChevronLeft className="rotate-45" size={16} /></button>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-3">
                                    <div className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center text-slate-400 group-hover:text-[#0d4d4d] transition-colors"><Camera size={28} /></div>
                                    <div className="text-center">
                                        <p className="text-sm font-bold text-slate-700">Upload Profile Photo</p>
                                        <p className="text-xs text-slate-400 mt-0.5">PNG, JPG up to 5MB</p>
                                    </div>
                                    <label className="absolute inset-0 cursor-pointer"><input type="file" accept="image/*" onChange={handleImageChange} className="hidden" /></label>
                                </div>
                            )}
                        </div>
                        <div className="space-y-4">
                            <label className="text-sm font-bold text-slate-700">How Did You Hear About Us?</label>
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

          {/* Login Link (Mobile hidden/relocated if needed, but relative top works) */}
          <div className="absolute top-8 right-8 text-xs font-semibold text-slate-400 hidden sm:block">
             Already a member? <Link href="/login" className="text-[#0d4d4d] hover:underline">Log In</Link>
          </div>
        </div>

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
