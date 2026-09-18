"use client";

import React, { useState } from "react";
import { X, FolderPlus, Loader2, TreePine } from "lucide-react";

export default function NewProjectModal({ isOpen, onClose, onProjectCreated }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [projectType, setProjectType] = useState("agroforestry");
  const [registryStandard, setRegistryStandard] = useState("Verra VM0042");
  const [country, setCountry] = useState("India");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please provide a project name.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await onProjectCreated({
        name: name.trim(),
        description: description.trim(),
        project_type: projectType,
        registry_standard: registryStandard,
        country: country.trim(),
        status: "active",
      });
      onClose();
    } catch (err) {
      setError(err.message || "Failed to create project");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="bg-white border border-[#E5E7EB] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="p-5 border-b border-[#E5E7EB] flex items-center justify-between bg-[#F9FAFB]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[rgb(0,146,69)]/10 text-[rgb(0,146,69)] flex items-center justify-center">
              <TreePine className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-[#0B1F16]">
                Create New Portfolio Project
              </h3>
              <p className="text-xs text-[#6B7280]">
                Add a carbon/biodiversity restoration program
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#0B1F16] mb-1">
              Project Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Maharashtra Deccan Agroforestry Phase II"
              className="w-full bg-white text-[#0B1F16] text-xs border border-[#D1D5DB] rounded-xl px-3 py-2.5 focus:outline-none focus:border-[rgb(0,146,69)]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#0B1F16] mb-1">
              Description
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Program goals, target communities, ecological outcomes..."
              className="w-full bg-white text-[#0B1F16] text-xs border border-[#D1D5DB] rounded-xl px-3 py-2 focus:outline-none focus:border-[rgb(0,146,69)]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#0B1F16] mb-1">
                Intervention Type
              </label>
              <select
                value={projectType}
                onChange={(e) => setProjectType(e.target.value)}
                className="w-full bg-[#F3F4F6] text-[#0B1F16] text-xs font-medium border border-[#D1D5DB] rounded-xl px-3 py-2.5 focus:outline-none focus:border-[rgb(0,146,69)]"
              >
                <option value="agroforestry">Agroforestry</option>
                <option value="reforestation">Native Reforestation</option>
                <option value="wetland_restoration">Mangrove / Wetland</option>
                <option value="soil_carbon">Soil Carbon</option>
                <option value="biodiversity_conservation">
                  Biodiversity Conservation
                </option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0B1F16] mb-1">
                Registry Standard
              </label>
              <select
                value={registryStandard}
                onChange={(e) => setRegistryStandard(e.target.value)}
                className="w-full bg-[#F3F4F6] text-[#0B1F16] text-xs font-medium border border-[#D1D5DB] rounded-xl px-3 py-2.5 focus:outline-none focus:border-[rgb(0,146,69)]"
              >
                <option value="Verra VM0042">Verra VM0042</option>
                <option value="Plan Vivo">Plan Vivo</option>
                <option value="Gold Standard">Gold Standard</option>
                <option value="Internal MRV">Internal MRV</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#0B1F16] mb-1">
              Geographical Country
            </label>
            <input
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full bg-white text-[#0B1F16] text-xs border border-[#D1D5DB] rounded-xl px-3 py-2.5 focus:outline-none focus:border-[rgb(0,146,69)]"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E5E7EB]">
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-semibold text-[#4B5563] hover:text-[#0B1F16] px-4 py-2 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-1.5 text-xs font-semibold text-white bg-[#0B1F16] hover:bg-[#0E2A1D] border border-[rgb(0,146,69)] px-5 py-2.5 rounded-xl transition-all shadow-xs"
            >
              {submitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FolderPlus className="w-3.5 h-3.5 text-[rgb(0,146,69)]" />
              )}
              {submitting ? "Creating..." : "Create Project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
