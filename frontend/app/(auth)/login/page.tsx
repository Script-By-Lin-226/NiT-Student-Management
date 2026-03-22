"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/services/api";
import { Loader2, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await api.post("/auth/login", { email: email.trim(), password });
      const { access_token, role, user_code, username, profile_picture } = res.data;
      
      localStorage.setItem("token", access_token);
      localStorage.setItem("role", String(role || "").toLowerCase());
      localStorage.setItem("user_code", user_code);
      if (username) localStorage.setItem("username", username);
      if (profile_picture) localStorage.setItem("profile_picture", profile_picture);

      router.push("/dashboard"); 
    } catch (err: any) {
      const status = err.response?.status;
      const detail = err.response?.data?.detail;
      if (detail) {
        setError(detail);
      } else if (status === 429) {
        setError("Too many login attempts. Please wait a moment and try again.");
      } else {
        setError("Invalid credentials. Please check your email and password.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f3f4f6] px-4 py-8 font-sans selection:bg-slate-200">
      <div className="w-full max-w-[440px] bg-white rounded-[32px] md:rounded-[48px] p-8 md:p-12 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-slate-100/50">
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
          <h1 className="text-xl md:text-[25px] font-bold text-slate-900 tracking-tight mb-2 text-center">NiT Student Management</h1>
          <p className="text-slate-500 text-sm md:text-base">Please enter your details</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 md:space-y-8">
          <div className="space-y-1.5 group">
            <label className="text-sm font-semibold text-slate-800 transition-colors group-focus-within:text-slate-900" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="anna@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-0 py-3 border-b border-slate-200 focus:border-slate-900 focus:outline-none bg-transparent transition-all duration-300 placeholder:text-slate-300 text-slate-900"
              required
            />
          </div>

          <div className="space-y-1.5 group">
            <label className="text-sm font-semibold text-slate-800 transition-colors group-focus-within:text-slate-900" htmlFor="password">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-0 py-3 border-b border-slate-200 focus:border-slate-900 focus:outline-none bg-transparent transition-all duration-300 placeholder:text-slate-300 text-slate-900 pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900 transition-colors duration-200"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-1">
            <label className="flex items-center gap-2.5 cursor-pointer group">
              <div className="relative flex items-center">
                <input 
                  type="checkbox" 
                  className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-slate-200 bg-white checked:bg-slate-900 checked:border-slate-900 transition-all duration-200 focus:ring-2 focus:ring-slate-900/10 focus:ring-offset-0" 
                />
                <svg className="absolute h-3.5 w-3.5 pointer-events-none stroke-white stroke-[4] opacity-0 peer-checked:opacity-100 transition-opacity duration-200 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" viewBox="0 0 24 24" fill="none">
                  <path d="M20 6L9 17L4 12" />
                </svg>
              </div>
              <span className="text-sm text-slate-500 font-medium group-hover:text-slate-700 transition-colors">Remember me</span>
            </label>
            <Link 
              href="/forgot-password" 
              className="text-sm text-slate-400 font-medium hover:text-slate-900 transition-colors decoration-slate-200 hover:decoration-slate-900 underline-offset-4"
            >
              Forgot password?
            </Link>
          </div>

          {error && (
            <div className="bg-red-50/50 border border-red-100 text-red-600 text-sm font-medium py-3 px-4 rounded-2xl animate-in fade-in slide-in-from-top-2 duration-300">
              {error}
            </div>
          )}

          <div className="space-y-4 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 text-white rounded-[20px] py-4 font-bold hover:bg-slate-800 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-3 shadow-[0_4px_12px_rgba(0,0,0,0.1)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.15)] disabled:opacity-70 disabled:pointer-events-none"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : "Log In"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
