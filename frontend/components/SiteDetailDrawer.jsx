"use client";

import React, { useEffect, useState } from "react";
import {
  X,
  MapPin,
  Calendar,
  Layers,
  TrendingUp,
  TrendingDown,
  Minus,
  Trash2,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import dynamic from "next/dynamic";
import { api } from "../lib/api";

const SiteTimeSeriesChart = dynamic(
  () => import("./Charts/SiteTimeSeriesChart"),
  {
    ssr: false,
    loading: () => (
      <div className="h-64 flex items-center justify-center bg-[#F9FAFB] rounded-xl text-xs text-[#6B7280]">
        Loading MRV Time-Series...
      </div>
    ),
  },
);

export default function SiteDetailDrawer({ siteId, onClose, onSiteDeleted }) {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!siteId) return;

    let isMounted = true;

    api
      .getSiteAnalytics(siteId)
      .then((data) => {
        if (isMounted) {
          setError(null);
          setAnalytics(data);
        }
      })
      .catch((err) => {
        if (isMounted) setError(err.message || "Failed to load site analytics");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [siteId]);

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${analytics?.site_name}?`))
      return;
    setDeleting(true);
    try {
      await api.deleteSite(siteId);
      if (onSiteDeleted) onSiteDeleted(siteId);
      onClose();
    } catch (err) {
      alert(err.message || "Failed to delete site");
    } finally {
      setDeleting(false);
    }
  };

  if (!siteId) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-xl bg-white border-l border-[#E5E7EB] shadow-2xl z-30 flex flex-col transition-transform duration-300">
      {/* Drawer Header */}
      <div className="p-6 border-b border-[#E5E7EB] flex items-center justify-between bg-[#F9FAFB]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold text-[rgb(0,146,69)] uppercase tracking-wider bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
              MRV Site Analytics
            </span>
            <span className="text-xs text-[#6B7280]">
              ID: {siteId.slice(0, 8)}...
            </span>
          </div>
          <h2 className="text-xl font-bold text-[#0B1F16]">
            {loading
              ? "Loading site..."
              : analytics?.site_name || "Site Details"}
          </h2>
          <p className="text-xs text-[#4B5563]">
            Part of{" "}
            <span className="font-semibold text-[#0B1F16]">
              {analytics?.project_name}
            </span>
          </p>
        </div>

        <button
          onClick={onClose}
          className="p-2 rounded-xl text-[#6B7280] hover:text-[#0B1F16] hover:bg-[#E5E7EB] transition-all"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Drawer Body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {loading ? (
          <div className="h-64 flex flex-col items-center justify-center gap-3 text-[#6B7280]">
            <Loader2 className="w-8 h-8 animate-spin text-[rgb(0,146,69)]" />
            <p className="text-sm">
              Calculating geospatial time-series & baselines...
            </p>
          </div>
        ) : error ? (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm">
            {error}
          </div>
        ) : (
          <>
            {/* Metadata Badges */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-[#F9FAFB] rounded-xl border border-[#E5E7EB]">
                <div className="flex items-center gap-1.5 text-xs text-[#6B7280] mb-1">
                  <MapPin className="w-3.5 h-3.5 text-[rgb(0,146,69)]" />
                  Area
                </div>
                <div className="text-base font-bold text-[#0B1F16] font-mono">
                  {analytics?.area_hectares.toFixed(2)} ha
                </div>
              </div>

              <div className="p-3 bg-[#F9FAFB] rounded-xl border border-[#E5E7EB]">
                <div className="flex items-center gap-1.5 text-xs text-[#6B7280] mb-1">
                  <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                  Baseline Date
                </div>
                <div className="text-sm font-semibold text-[#0B1F16]">
                  {analytics?.baseline_date || "Not specified"}
                </div>
              </div>

              <div className="p-3 bg-[#F9FAFB] rounded-xl border border-[#E5E7EB]">
                <div className="flex items-center gap-1.5 text-xs text-[#6B7280] mb-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-[rgb(0,146,69)]" />
                  Integrity
                </div>
                <div className="text-xs font-bold text-[rgb(0,146,69)]">
                  Zero Overlap
                </div>
              </div>
            </div>

            {/* Performance Metric Cards */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#6B7280] mb-3">
                Key Ecological Indicators vs Baseline
              </h3>
              {!analytics?.metrics?.length ? (
                <div className="p-4 text-center text-xs text-[#6B7280] bg-[#F9FAFB] rounded-xl border border-dashed border-[#D1D5DB]">
                  No baseline readings recorded for this site yet.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {analytics?.metrics?.slice(0, 4).map((metric) => {
                    const isPositive = (metric.delta_absolute || 0) > 0;
                    return (
                      <div
                        key={metric.metric_id}
                        className="p-3.5 bg-white border border-[#E5E7EB] rounded-xl shadow-xs"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-[#4B5563] truncate">
                            {metric.label}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 ${
                              metric.trend === "improving"
                                ? "bg-emerald-50 text-[rgb(0,146,69)] border border-emerald-200"
                                : metric.trend === "declining"
                                  ? "bg-rose-50 text-rose-600 border border-rose-200"
                                  : "bg-gray-100 text-gray-600 border border-gray-200"
                            }`}
                          >
                            {metric.trend === "improving" ? (
                              <TrendingUp className="w-2.5 h-2.5" />
                            ) : metric.trend === "declining" ? (
                              <TrendingDown className="w-2.5 h-2.5" />
                            ) : (
                              <Minus className="w-2.5 h-2.5" />
                            )}
                            {metric.trend}
                          </span>
                        </div>

                        <div className="flex items-baseline gap-2 mb-1">
                          <span className="text-xl font-bold text-[#0B1F16] font-mono">
                            {metric.latest_value}
                          </span>
                          <span className="text-[11px] text-[#6B7280]">
                            {metric.unit}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-[#F3F4F6]">
                          <span className="text-[#6B7280]">
                            Baseline: {metric.baseline_value}
                          </span>
                          <span
                            className={`font-semibold font-mono ${
                              isPositive
                                ? "text-[rgb(0,146,69)]"
                                : "text-rose-600"
                            }`}
                          >
                            {isPositive ? "+" : ""}
                            {metric.delta_absolute} ({metric.delta_percent}%)
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Highcharts Historical Time-Series */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#6B7280] mb-3">
                Historical Monitoring Time-Series
              </h3>
              <SiteTimeSeriesChart metrics={analytics?.metrics || []} />
            </div>
          </>
        )}
      </div>

      {/* Drawer Footer */}
      <div className="p-4 border-t border-[#E5E7EB] bg-[#F9FAFB] flex items-center justify-between">
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:text-rose-800 hover:bg-rose-50 px-3 py-2 rounded-xl transition-all"
        >
          <Trash2 className="w-4 h-4" />
          {deleting ? "Deleting..." : "Delete Site"}
        </button>

        <button
          onClick={onClose}
          className="text-xs font-semibold text-[#0B1F16] bg-white border border-[#D1D5DB] hover:bg-[#F3F4F6] px-4 py-2 rounded-xl transition-all"
        >
          Close Drawer
        </button>
      </div>
    </div>
  );
}
