"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, MessageCircle } from "lucide-react";

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white md:bg-[#f3f4f6] md:px-4 md:py-8 font-sans selection:bg-slate-200">
      <div className="w-full min-h-screen md:min-h-0 md:max-w-[440px] bg-white md:rounded-[48px] p-8 md:p-12 md:shadow-[0_8px_30px_rgb(0,0,0,0.04)] md:ring-1 md:ring-slate-100/50 flex flex-col justify-center text-center">
        <div className="flex flex-col items-center mb-10">
          <div className="w-32 h-32 relative mb-8 group transition-transform duration-500 hover:scale-110">
            <Image 
              src="/icons/logo_png.png" 
              alt="NiT Logo" 
              fill 
              className="object-contain"
              priority
            />
          </div>
          <h1 className="text-xl md:text-[25px] font-bold text-slate-900 tracking-tight mb-4">Forgot Password?</h1>
          <p className="text-slate-500 text-sm md:text-base mb-8">
            For security reasons, password resets must be handled by an administrator.
          </p>
          
          <div className="w-full bg-slate-50 rounded-3xl p-6 mb-10 border border-slate-100 flex flex-col items-center gap-4">
            <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-lg">
              <MessageCircle size={24} />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-900">Contact Support</p>
              <p className="text-xs text-slate-500 line-clamp-2">Please visit the administration office or contact your supervisor to reset your account credentials.</p>
            </div>
          </div>

          <Link
            href="/login"
            className="w-full bg-slate-900 text-white rounded-[20px] py-4 font-bold hover:bg-slate-800 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-3 shadow-[0_4px_12px_rgba(0,0,0,0.1)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.15)]"
          >
            <ArrowLeft size={18} />
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
