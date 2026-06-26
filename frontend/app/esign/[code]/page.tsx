"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/services/api";
import { Loader2, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import Image from "next/image";

function SignaturePad({ value, onChange }: { value: string; onChange: (val: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Initialize canvas only once on mount
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.strokeStyle = "#0f172a"; // slate-900
    ctx.lineWidth = 3.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Adjust canvas resolution for crisp rendering
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);
  }, []);

  // Clear canvas when value is reset externally
  useEffect(() => {
    if (!value) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
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
      <div className="relative border border-slate-200 rounded-2xl overflow-hidden bg-slate-50 h-52 group transition-all">
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

export default function EsignPage() {
  const params = useParams();
  const studentCode = params.code as string;

  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [signature, setSignature] = useState("");

  useEffect(() => {
    if (!studentCode) return;
    
    setLoading(true);
    api.get(`/auth/esign/${studentCode}`)
      .then(res => {
        setUsername(res.data.username);
        if (res.data.signature) {
          setSignature(res.data.signature);
        }
      })
      .catch((err: any) => {
        setError(err.response?.data?.detail || "Student record not found or could not be retrieved.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [studentCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signature) {
      setError("Please sign before submitting.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await api.post(`/auth/esign/${studentCode}`, { signature });
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.response?.data?.message || "Failed to submit signature. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-slate-800" />
          <p className="text-sm font-semibold text-slate-500">Loading student details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-8 font-sans">
      <div className="w-full max-w-[480px] bg-white rounded-[32px] p-8 md:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.03)] border border-slate-100 flex flex-col justify-center animate-in fade-in duration-300">
        
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 relative mb-6">
            <Image 
              src="/icons/logo_png.png" 
              alt="NiT Logo" 
              fill 
              className="object-contain"
              priority
            />
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight text-center">E-Signature Submission</h1>
          <p className="text-slate-400 text-xs mt-1 uppercase font-bold tracking-widest">{studentCode}</p>
        </div>

        {success ? (
          <div className="flex flex-col items-center text-center space-y-4 py-6 animate-in zoom-in-95 duration-300">
            <CheckCircle2 className="w-16 h-16 text-emerald-500" />
            <h3 className="text-lg font-bold text-slate-900">Submitted Successfully!</h3>
            <p className="text-slate-500 text-sm max-w-[280px]">
              Thank you, <span className="font-semibold text-slate-800">{username}</span>. Your signature has been securely updated. You can close this window now.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-rose-50 border border-rose-100 text-rose-600 text-xs font-semibold py-3 px-4 rounded-xl flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-slate-800">
                Hello, <span className="text-slate-950 font-bold">{username}</span>
              </h3>
              <p className="text-xs text-slate-500 font-medium">Please sign in the box below to authorize and complete your academic enrollment.</p>
            </div>

            {signature ? (
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Current Signature</label>
                <div className="relative border border-slate-200 bg-slate-50 rounded-2xl p-4 flex flex-col items-center justify-center min-h-[140px] group shadow-inner">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={signature} alt="Current Signature" className="max-h-[100px] object-contain" />
                  <button
                    type="button"
                    onClick={() => setSignature("")}
                    className="absolute top-2 right-2 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 text-[10px] font-black uppercase tracking-wider rounded-lg border border-rose-200 transition-all active:scale-95 flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Reset & Sign
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <SignaturePad value={signature} onChange={setSignature} />
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !signature}
              className="w-full bg-slate-900 text-white rounded-2xl py-3.5 font-bold hover:bg-slate-800 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none shadow-md"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Signature"
              )}
            </button>
          </form>
        )}

      </div>
    </div>
  );
}
