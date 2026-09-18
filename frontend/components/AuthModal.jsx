"use client";

import React, { useState } from "react";
import { X, Lock, Mail, User, KeyRound, Loader2, Sparkles } from "lucide-react";

export default function AuthModal({ isOpen, onClose, onAuthSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleFillDemo = () => {
    setEmail("admin@darukaa.earth");
    setPassword("demo1234");
    setIsRegister(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isRegister) {
        await onAuthSuccess({ type: "register", email, password, fullName });
      } else {
        await onAuthSuccess({ type: "login", email, password });
      }
      onClose();
    } catch (err) {
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="bg-white border border-[#E5E7EB] rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="p-5 border-b border-[#E5E7EB] flex items-center justify-between bg-[#F9FAFB]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#0B1F16] border border-[rgb(0,146,69)] text-white flex items-center justify-center">
              <KeyRound className="w-4 h-4 text-[rgb(0,146,69)]" />
            </div>
            <div>
              <h3 className="font-bold text-base text-[#0B1F16]">
                {isRegister ? "Register Account" : "Administrator Sign In"}
              </h3>
              <p className="text-xs text-[#6B7280]">
                Darukaa.Earth Nature Intelligence
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#6B7280] hover:text-[#0B1F16] hover:bg-[#E5E7EB] transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1-Click Demo Credentials Banner */}
        <div className="bg-emerald-50 border-b border-emerald-100 p-3 flex items-center justify-between">
          <div className="text-xs text-emerald-800">
            <span className="font-bold">Hackathon Reviewer?</span>
            <p className="text-[11px] text-emerald-700">
              Preloaded with real Indian projects & sites
            </p>
          </div>
          <button
            type="button"
            onClick={handleFillDemo}
            className="flex items-center gap-1 text-[11px] font-bold text-white bg-[rgb(0,146,69)] hover:bg-emerald-700 px-2.5 py-1 rounded-lg transition-all shadow-xs"
          >
            <Sparkles className="w-3 h-3" />
            Auto-fill Demo
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
              {error}
            </div>
          )}

          {isRegister && (
            <div>
              <label className="block text-xs font-semibold text-[#0B1F16] mb-1">
                Full Name *
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-2.5 text-[#9CA3AF]" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Akash Vishwakarma"
                  className="w-full bg-white text-[#0B1F16] text-xs border border-[#D1D5DB] rounded-xl pl-9 pr-3 py-2.5 focus:outline-none focus:border-[rgb(0,146,69)]"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#0B1F16] mb-1">
              Work Email Address *
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-2.5 text-[#9CA3AF]" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@darukaa.earth"
                className="w-full bg-white text-[#0B1F16] text-xs border border-[#D1D5DB] rounded-xl pl-9 pr-3 py-2.5 focus:outline-none focus:border-[rgb(0,146,69)]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#0B1F16] mb-1">
              Password *
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-2.5 text-[#9CA3AF]" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white text-[#0B1F16] text-xs border border-[#D1D5DB] rounded-xl pl-9 pr-3 py-2.5 focus:outline-none focus:border-[rgb(0,146,69)]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 text-xs font-semibold text-white bg-[#0B1F16] hover:bg-[#0E2A1D] border border-[rgb(0,146,69)] py-2.5 rounded-xl transition-all shadow-xs"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {isRegister ? "Create Account" : "Sign In with JWT"}
          </button>

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => {
                setIsRegister(!isRegister);
                setError(null);
              }}
              className="text-xs text-[#6B7280] hover:text-[rgb(0,146,69)] font-medium transition-colors"
            >
              {isRegister
                ? "Already have an account? Sign in"
                : "Need an account? Register here"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
