"use client";

import React, { useState } from "react";
import { X, MapPin, CheckCircle2, Loader2, Sparkles } from "lucide-react";

export default function NewSiteModal({
  isOpen,
  onClose,
  polygonGeometry,
  areaHectares = 0,
  projectId,
  projects = [],
  onSiteCreated,
}) {
  const [selectedProjectId, setSelectedProjectId] = useState(
    projectId || projects[0]?.id || "",
  );
  const [name, setName] = useState("");
  const [landCover, setLandCover] = useState("Degraded Farmland");
  const [baselineDate, setBaselineDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter a site parcel name.");
      return;
    }
    if (!selectedProjectId) {
      setError("Please select a target project.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await onSiteCreated(selectedProjectId, {
        name: name.trim(),
        boundary: polygonGeometry,
        land_cover_type: landCover,
        baseline_date: baselineDate,
        notes: notes.trim(),
      });
      onClose();
    } catch (err) {
      setError(err.message || "Failed to create site parcel");
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
            <div className="w-8 h-8 rounded-xl bg-[rgb(0,146,69)]/10 text-[rgb(0,146,69)] flex items-center justify-center font-bold">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-[#0B1F16]">
                Save Drawn Site Parcel
              </h3>
              <p className="text-xs text-[#6B7280]">
                Register polygon to carbon/biodiversity ledger
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

        {/* Live Area Banner */}
        <div className="bg-emerald-50/70 border-b border-emerald-100 px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-emerald-800">
            <CheckCircle2 className="w-4 h-4 text-[rgb(0,146,69)]" />
            <span>Boundary Verified (Zero Overlap)</span>
          </div>
          <div className="text-xs font-mono font-bold text-[#0B1F16]">
            {areaHectares ? areaHectares.toFixed(2) : "0.00"} hectares
          </div>
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
              Target Project *
            </label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full bg-[#F3F4F6] text-[#0B1F16] text-xs font-medium border border-[#D1D5DB] rounded-xl px-3 py-2.5 focus:outline-none focus:border-[rgb(0,146,69)]"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#0B1F16] mb-1">
              Site Parcel Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Maharashtra Sector 19 Parcel"
              className="w-full bg-white text-[#0B1F16] text-xs border border-[#D1D5DB] rounded-xl px-3 py-2.5 focus:outline-none focus:border-[rgb(0,146,69)]"
            ></input>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#0B1F16] mb-1">
                Land Cover Type
              </label>
              <select
                value={landCover}
                onChange={(e) => setLandCover(e.target.value)}
                className="w-full bg-[#F3F4F6] text-[#0B1F16] text-xs font-medium border border-[#D1D5DB] rounded-xl px-3 py-2.5 focus:outline-none focus:border-[rgb(0,146,69)]"
              >
                <option value="Degraded Farmland">Degraded Farmland</option>
                <option value="Dry Scrubland">Dry Scrubland</option>
                <option value="Secondary Forest">Secondary Forest</option>
                <option value="Mangrove Mudflat">Mangrove Mudflat</option>
                <option value="Grassland">Grassland</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#0B1F16] mb-1">
                Baseline Date
              </label>
              <input
                type="date"
                value={baselineDate}
                onChange={(e) => setBaselineDate(e.target.value)}
                className="w-full bg-white text-[#0B1F16] text-xs border border-[#D1D5DB] rounded-xl px-3 py-2.5 focus:outline-none focus:border-[rgb(0,146,69)]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#0B1F16] mb-1">
              Notes & Ground Truth Observations
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Soil type, moisture conditions, baseline canopy notes..."
              className="w-full bg-white text-[#0B1F16] text-xs border border-[#D1D5DB] rounded-xl px-3 py-2 focus:outline-none focus:border-[rgb(0,146,69)]"
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
                <Sparkles className="w-3.5 h-3.5 text-[rgb(0,146,69)]" />
              )}
              {submitting ? "Saving..." : "Save Site Parcel"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
