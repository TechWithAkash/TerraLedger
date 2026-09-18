"use client";

import React from "react";
import {
  TreePine,
  Plus,
  ShieldCheck,
  MapPin,
  Layers,
  LogIn,
  LogOut,
  ChevronDown,
} from "lucide-react";

export default function Navbar({
  projects = [],
  selectedProject,
  onSelectProject,
  onOpenNewProject,
  user,
  onOpenAuth,
  onLogout,
  siteCount = 0,
  totalArea = 0,
}) {
  const userInitial = user?.full_name
    ? user.full_name.charAt(0).toUpperCase()
    : "A";

  return (
    <header className="h-[70px] bg-white/95 backdrop-blur-md border-b border-[#E5E7EB] px-5 lg:px-7 flex items-center justify-between z-30 sticky top-0 shadow-xs transition-all">
      {/* Left: Brand & Project Selector */}
      <div className="flex items-center gap-5 lg:gap-6">
        {/* Brand Logo & Tagline */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0B1F16] border border-[rgb(0,146,69)]/40 flex items-center justify-center text-white shadow-xs ring-1 ring-black/5 shrink-0">
            <TreePine className="w-5 h-5 text-[rgb(0,146,69)]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-[17px] text-[#0B1F16] tracking-tight leading-none">
                Darukaa<span className="text-[rgb(0,146,69)]">.Earth</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/70">
                <span className="w-1.5 h-1.5 rounded-full bg-[rgb(0,146,69)] animate-pulse" />
                MRV PLATFORM
              </span>
            </div>
            <p className="text-[11px] text-[#6B7280] font-medium tracking-tight mt-0.5 hidden sm:block">
              Nature Intelligence & Geospatial Analytics
            </p>
          </div>
        </div>

        <div className="h-7 w-[1px] bg-[#E5E7EB] hidden md:block" />

        {/* Project Selector & New Project Action */}
        <div className="flex items-center gap-2">
          <div className="relative flex items-center">
            <select
              value={selectedProject ? selectedProject.id : "all"}
              onChange={(e) => {
                if (e.target.value === "all") {
                  onSelectProject(null);
                } else {
                  const found = projects.find((p) => p.id === e.target.value);
                  onSelectProject(found || null);
                }
              }}
              aria-label="Select Carbon & Biodiversity Project"
              className="appearance-none bg-[#F9FAFB] hover:bg-white text-[#0B1F16] text-xs font-semibold border border-[#D1D5DB] hover:border-[rgb(0,146,69)]/60 rounded-xl pl-3.5 pr-8 py-2.5 transition-all shadow-2xs focus:outline-none focus:ring-2 focus:ring-[rgb(0,146,69)]/20 focus:border-[rgb(0,146,69)] cursor-pointer max-w-[210px] sm:max-w-[280px] truncate"
            >
              <option value="all">
                🌍 All Projects ({projects.length} portfolios)
              </option>
              {projects.map((proj) => (
                <option key={proj.id} value={proj.id}>
                  {proj.name} ({proj.site_count || 0} sites)
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[#9CA3AF] absolute right-2.5 pointer-events-none" />
          </div>

          <button
            onClick={onOpenNewProject}
            title="Create New Carbon/Biodiversity Project"
            className="flex items-center gap-1.5 text-xs font-semibold text-white bg-[#0B1F16] hover:bg-[#133527] border border-[rgb(0,146,69)]/40 px-3.5 py-2.5 rounded-xl transition-all shadow-xs active:scale-[0.98] shrink-0"
          >
            <Plus className="w-3.5 h-3.5 text-[rgb(0,146,69)]" />
            <span className="hidden sm:inline">New Project</span>
          </button>
        </div>
      </div>

      {/* Center: Portfolio Overview Metrics Pill */}
      <div className="hidden xl:flex items-center bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl p-1 shadow-2xs divide-x divide-[#E5E7EB] text-xs">
        <div className="flex items-center gap-2 px-3.5 py-1">
          <Layers className="w-3.5 h-3.5 text-[rgb(0,146,69)]" />
          <span className="text-[#6B7280]">Portfolios:</span>
          <span className="font-bold text-[#0B1F16]">{projects.length}</span>
        </div>
        <div className="flex items-center gap-2 px-3.5 py-1">
          <MapPin className="w-3.5 h-3.5 text-[rgb(0,146,69)]" />
          <span className="text-[#6B7280]">Parcels:</span>
          <span className="font-bold text-[#0B1F16]">{siteCount}</span>
        </div>
        <div className="flex items-center gap-2 px-3.5 py-1">
          <ShieldCheck className="w-3.5 h-3.5 text-[rgb(0,146,69)]" />
          <span className="text-[#6B7280]">Monitored:</span>
          <span className="font-bold font-mono text-emerald-800">
            {totalArea.toLocaleString(undefined, {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            })}{" "}
            ha
          </span>
        </div>
      </div>

      {/* Right: User Profile & Authentication */}
      <div className="flex items-center gap-3">
        {user ? (
          <div className="flex items-center gap-3 bg-[#F9FAFB] border border-[#E5E7EB] pl-2 pr-3 py-1.5 rounded-xl shadow-2xs">
            {/* Avatar Circle */}
            <div className="w-7 h-7 rounded-lg bg-[#0B1F16] border border-[rgb(0,146,69)]/40 text-[rgb(0,146,69)] font-bold text-xs flex items-center justify-center shadow-2xs shrink-0">
              {userInitial}
            </div>
            {/* Name and Role */}
            <div className="text-left hidden sm:block">
              <p className="text-xs font-bold text-[#0B1F16] leading-none">
                {user.full_name}
              </p>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wider">
                  {user.role || "Admin"}
                </span>
                <span className="text-[#9CA3AF] text-[10px]">•</span>
                <span className="text-[10px] text-[#6B7280] font-mono">
                  Verified
                </span>
              </div>
            </div>
            {/* Logout button */}
            <button
              onClick={onLogout}
              title="Sign Out"
              className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-rose-600 hover:bg-rose-50 transition-all ml-1"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenAuth}
            className="flex items-center gap-1.5 text-xs font-semibold text-[#0B1F16] bg-white border border-[rgb(0,146,69)] hover:bg-emerald-50 px-3.5 py-2 rounded-xl transition-all shadow-2xs"
          >
            <LogIn className="w-3.5 h-3.5 text-[rgb(0,146,69)]" />
            Sign In / Demo
          </button>
        )}
      </div>
    </header>
  );
}
