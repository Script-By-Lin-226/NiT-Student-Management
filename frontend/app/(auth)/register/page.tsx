"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/services/api";
import { Loader2, User } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
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
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await api.post("/auth/register", formData);
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
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
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

  return (
    <div className="min-h-screen bg-[#F0EBF8] py-8 px-4 font-sans text-slate-800 flex justify-center">
      <div className="w-full max-w-2xl space-y-4">
        
        {/* Header Card */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden relative">
          {/* Top thick bar */}
          <div className="h-2.5 w-full bg-brand-600 absolute top-0 left-0" />
          <div className="px-6 py-8 md:p-8 mt-1">
            <h1 className="text-3xl font-normal text-slate-900 leading-tight">
              NiT Online Registration
            </h1>
            <p className="mt-3 text-sm text-slate-600 h-px mb-2">
              Please fill out the form entirely to register as a student.
            </p>
            <p className="mt-4 text-xs font-semibold text-red-600">
              * Indicates required question
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-white rounded-lg shadow-sm border border-red-200 p-6 flex flex-col gap-2">
            <p className="text-red-600 text-sm font-medium">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 pb-20">
          
          {/* Profile Picture (Optional) */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 flex flex-col gap-4 transition-shadow hover:shadow-md focus-within:shadow-md focus-within:border-l-4 focus-within:border-l-brand-600 relative">
            <label className="text-base text-slate-800" htmlFor="profile_picture">
              Profile Picture
            </label>
            <div className="flex items-center gap-4 mt-2">
              <div className="h-16 w-16 rounded-full overflow-hidden bg-slate-100 border border-slate-200 flex-shrink-0 flex items-center justify-center">
                {formData.profile_picture ? (
                  <img src={formData.profile_picture} alt="Preview" className="h-full w-full object-cover" />
                ) : (
                  <User className="h-8 w-8 text-slate-400" />
                )}
              </div>
              <input
                id="profile_picture"
                name="profile_picture"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="block w-full text-sm text-slate-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-full file:border-0
                  file:text-sm file:font-semibold
                  file:bg-brand-50 file:text-brand-700
                  hover:file:bg-brand-100 transition-colors"
              />
            </div>
          </div>

          {/* Full Name */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 flex flex-col gap-4 transition-shadow hover:shadow-md focus-within:shadow-md focus-within:border-l-4 focus-within:border-l-brand-600 relative">
            <label className="text-base text-slate-800" htmlFor="username">
              Full Name <span className="text-red-600">*</span>
            </label>
            <input
              id="username"
              name="username"
              type="text"
              required
              className="w-full md:w-1/2 border-b border-slate-300 pb-1 focus:border-b-2 focus:border-b-brand-600 focus:outline-none bg-transparent transition-colors text-slate-900"
              placeholder="Your answer"
              value={formData.username}
              onChange={handleChange}
            />
          </div>

          {/* Email Address */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 flex flex-col gap-4 transition-shadow hover:shadow-md focus-within:shadow-md focus-within:border-l-4 focus-within:border-l-brand-600 relative">
            <label className="text-base text-slate-800" htmlFor="email">
              Email Address <span className="text-red-600">*</span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full md:w-1/2 border-b border-slate-300 pb-1 focus:border-b-2 focus:border-b-brand-600 focus:outline-none bg-transparent transition-colors text-slate-900"
              placeholder="Your answer"
              value={formData.email}
              onChange={handleChange}
            />
          </div>

          {/* Date of Birth */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 flex flex-col gap-4 transition-shadow hover:shadow-md focus-within:shadow-md focus-within:border-l-4 focus-within:border-l-brand-600 relative">
            <label className="text-base text-slate-800" htmlFor="date_of_birth">
              Date of Birth <span className="text-red-600">*</span>
            </label>
            <input
              id="date_of_birth"
              name="date_of_birth"
              type="date"
              required
              className="w-[200px] border-b border-slate-300 pb-1 focus:border-b-2 focus:border-b-brand-600 focus:outline-none bg-transparent transition-colors text-slate-900"
              value={formData.date_of_birth}
              onChange={handleChange}
            />
          </div>

          {/* Phone Number */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 flex flex-col gap-4 transition-shadow hover:shadow-md focus-within:shadow-md focus-within:border-l-4 focus-within:border-l-brand-600 relative">
            <label className="text-base text-slate-800" htmlFor="phone">
              Phone Number <span className="text-red-600">*</span>
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              required
              className="w-full md:w-1/2 border-b border-slate-300 pb-1 focus:border-b-2 focus:border-b-brand-600 focus:outline-none bg-transparent transition-colors text-slate-900"
              placeholder="Your answer"
              value={formData.phone}
              onChange={handleChange}
            />
          </div>

          {/* NRC */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 flex flex-col gap-4 transition-shadow hover:shadow-md focus-within:shadow-md focus-within:border-l-4 focus-within:border-l-brand-600 relative">
            <label className="text-base text-slate-800" htmlFor="nrc">
              NRC (Optional)
            </label>
            <input
              id="nrc"
              name="nrc"
              type="text"
              className="w-full md:w-1/2 border-b border-slate-300 pb-1 focus:border-b-2 focus:border-b-brand-600 focus:outline-none bg-transparent transition-colors text-slate-900"
              placeholder="Your answer"
              value={formData.nrc}
              onChange={handleChange}
            />
          </div>

          {/* Parent Name */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 flex flex-col gap-4 transition-shadow hover:shadow-md focus-within:shadow-md focus-within:border-l-4 focus-within:border-l-brand-600 relative">
            <label className="text-base text-slate-800" htmlFor="parent_name">
              Parent/Guardian Name
            </label>
            <input
              id="parent_name"
              name="parent_name"
              type="text"
              className="w-full md:w-1/2 border-b border-slate-300 pb-1 focus:border-b-2 focus:border-b-brand-600 focus:outline-none bg-transparent transition-colors text-slate-900"
              placeholder="Your answer"
              value={formData.parent_name}
              onChange={handleChange}
            />
          </div>

          {/* Parent Phone */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 flex flex-col gap-4 transition-shadow hover:shadow-md focus-within:shadow-md focus-within:border-l-4 focus-within:border-l-brand-600 relative">
            <label className="text-base text-slate-800" htmlFor="parent_phone">
              Parent/Guardian Phone Number
            </label>
            <input
              id="parent_phone"
              name="parent_phone"
              type="tel"
              className="w-full md:w-1/2 border-b border-slate-300 pb-1 focus:border-b-2 focus:border-b-brand-600 focus:outline-none bg-transparent transition-colors text-slate-900"
              placeholder="Your answer"
              value={formData.parent_phone}
              onChange={handleChange}
            />
          </div>

          {/* Address */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 flex flex-col gap-4 transition-shadow hover:shadow-md focus-within:shadow-md focus-within:border-l-4 focus-within:border-l-brand-600 relative">
            <label className="text-base text-slate-800" htmlFor="address">
              Full Address
            </label>
            <textarea
              id="address"
              name="address"
              rows={1}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = "auto";
                target.style.height = `${target.scrollHeight}px`;
              }}
              className="w-full border-b border-slate-300 pb-1 focus:border-b-2 focus:border-b-brand-600 focus:outline-none bg-transparent transition-colors text-slate-900 resize-none overflow-hidden"
              placeholder="Your answer"
              value={formData.address}
              onChange={handleChange}
            />
          </div>

          <div className="pt-2 flex justify-between items-center">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center py-2 px-6 font-medium rounded text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500/50 disabled:opacity-50 transition-colors mr-auto shadow-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Submitting...
                </>
              ) : (
                "Submit"
              )}
            </button>
           
          </div>
          
        </form>
      </div>
    </div>
  );
}
