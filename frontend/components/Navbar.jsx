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
  return (
    <header className="h-[72px] bg-white border-b border-[#E5E7EB] px-6 flex items-center justify-between z-20 shadow-xs">
      {/* Brand & Project Selector */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-[#0B1F16] border border-[rgb(0,146,69)] flex items-center justify-center text-white shadow-xs">
            <TreePine className="w-5 h-5 text-[rgb(0,146,69)]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg text-[#0B1F16] tracking-tight">
                Darukaa<span className="text-[rgb(0,146,69)]">.Earth</span>
              </span>
              <span className="text-[10px] uppercase tracking-wider bg-[#F3F4F6] text-[#0B1F16] font-semibold px-2 py-0.5 rounded-full border border-[#E5E7EB]">
                MRV Platform
              </span>
            </div>
            <p className="text-[11px] text-[#6B7280]">
              Nature Intelligence & Geospatial Analytics
            </p>
          </div>
        </div>

        <div className="h-6 w-[1px] bg-[#E5E7EB] hidden md:block" />

        {/* Project Selector Dropdown */}
        <div className="flex items-center gap-2">
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
            className="bg-[#F3F4F6] text-[#0B1F16] text-sm font-medium border border-[#D1D5DB] rounded-xl px-3.5 py-2 focus:outline-none focus:border-[rgb(0,146,69)] cursor-pointer"
          >
            <option value="all">
              🌍 All Portfolio Projects ({projects.length})
            </option>
            {projects.map((proj) => (
              <option key={proj.id} value={proj.id}>
                {proj.name} ({proj.site_count || 0} sites)
              </option>
            ))}
          </select>

          <button
            onClick={onOpenNewProject}
            className="flex items-center gap-1.5 text-xs font-semibold text-white bg-[#0B1F16] hover:bg-[#0E2A1D] border border-[rgb(0,146,69)] px-3 py-2 rounded-xl transition-all shadow-xs"
          >
            <Plus className="w-3.5 h-3.5 text-[rgb(0,146,69)]" />
            New Project
          </button>
        </div>
      </div>

      {/* Center Portfolio Stats */}
      <div className="hidden lg:flex items-center gap-5 text-xs bg-[#F9FAFB] border border-[#E5E7EB] px-4 py-2 rounded-xl">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-[rgb(0,146,69)]" />
          <span className="text-[#6B7280]">Projects:</span>
          <span className="font-bold text-[#0B1F16]">{projects.length}</span>
        </div>
        <div className="w-[1px] h-3.5 bg-[#E5E7EB]" />
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-[rgb(0,146,69)]" />
          <span className="text-[#6B7280]">Sites:</span>
          <span className="font-bold text-[#0B1F16]">{siteCount}</span>
        </div>
        <div className="w-[1px] h-3.5 bg-[#E5E7EB]" />
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[rgb(0,146,69)]" />
          <span className="text-[#6B7280]">Monitored Area:</span>
          <span className="font-bold text-[#0B1F16] font-mono">
            {totalArea.toFixed(1)} ha
          </span>
        </div>
      </div>

      {/* User Actions */}
      <div className="flex items-center gap-3">
        {user ? (
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-[#0B1F16]">
                {user.full_name}
              </p>
              <p className="text-[11px] text-[rgb(0,146,69)] font-mono font-medium capitalize">
                {user.role}
              </p>
            </div>
            <button
              onClick={onLogout}
              title="Logout"
              className="p-2 rounded-xl bg-[#F3F4F6] text-[#6B7280] hover:text-[#0B1F16] hover:bg-[#E5E7EB] border border-[#D1D5DB] transition-all"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenAuth}
            className="flex items-center gap-1.5 text-xs font-semibold text-[#0B1F16] bg-white border-2 border-[rgb(0,146,69)] hover:bg-[#F3F4F6] px-4 py-2 rounded-xl transition-all"
          >
            <LogIn className="w-3.5 h-3.5 text-[rgb(0,146,69)]" />
            Sign In / Demo
          </button>
        )}
      </div>
    </header>
  );
}
