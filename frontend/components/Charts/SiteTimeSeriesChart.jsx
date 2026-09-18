"use client";

import React, { useState } from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import { Info, Satellite, Database, Activity, Sparkles } from "lucide-react";

export default function SiteTimeSeriesChart({ metrics = [] }) {
  const [selectedMetricId, setSelectedMetricId] = useState(
    metrics[0]?.metric_id || "canopy_cover",
  );

  const activeMetric =
    metrics.find((m) => m.metric_id === selectedMetricId) || metrics[0];

  if (metrics.length === 0) {
    return (
      <div className="p-8 text-center bg-[#F9FAFB] rounded-xl border border-dashed border-[#D1D5DB]">
        <p className="text-sm font-semibold text-[#0B1F16] mb-1">
          No monitoring history yet
        </p>
        <p className="text-xs text-[#6B7280] max-w-sm mx-auto">
          This site was just created, so there&apos;s nothing to chart yet.
          Seeded demo sites carry 3 years of satellite and field-survey
          observations - monitoring data for new sites is added through the
          ingestion pipeline over time.
        </p>
      </div>
    );
  }

  if (
    !activeMetric ||
    !activeMetric.history ||
    activeMetric.history.length === 0
  ) {
    return (
      <div className="p-8 text-center text-sm text-[#6B7280] bg-[#F9FAFB] rounded-xl border border-dashed border-[#D1D5DB]">
        No monitoring records logged for this metric yet.
      </div>
    );
  }

  // Prepare Highcharts series data
  const chartData = activeMetric.history.map((record) => [
    new Date(record.observed_on).getTime(),
    record.value,
  ]);

  const baselineVal = activeMetric.baseline_value;

  const chartOptions = {
    chart: {
      type: "spline",
      height: 280,
      backgroundColor: "transparent",
      style: {
        fontFamily: "var(--font-manrope), sans-serif",
      },
    },
    title: {
      text: undefined,
    },
    credits: {
      enabled: false,
    },
    xAxis: {
      type: "datetime",
      dateTimeLabelFormats: {
        month: "%b '%y",
        year: "%Y",
      },
      lineColor: "#E5E7EB",
      tickColor: "#E5E7EB",
      labels: {
        style: {
          color: "#6B7280",
          fontSize: "11px",
        },
      },
    },
    yAxis: {
      title: {
        text: `${activeMetric.label} (${activeMetric.unit})`,
        style: {
          color: "#0B1F16",
          fontWeight: "600",
          fontSize: "12px",
        },
      },
      gridLineColor: "#F3F4F6",
      plotLines:
        baselineVal !== undefined && baselineVal !== null
          ? [
              {
                value: baselineVal,
                color: "#9CA3AF",
                dashStyle: "Dash",
                width: 2,
                zIndex: 4,
                label: {
                  text: `Baseline: ${baselineVal} ${activeMetric.unit}`,
                  align: "right",
                  style: {
                    color: "#4B5563",
                    fontSize: "10px",
                    fontWeight: "600",
                  },
                },
              },
            ]
          : [],
    },
    tooltip: {
      useHTML: true,
      backgroundColor: "#FFFFFF",
      borderColor: "rgb(0,146,69)",
      borderRadius: 10,
      shadow: true,
      formatter: function () {
        const dateStr = Highcharts.dateFormat("%d %b %Y", this.x);
        const pointRecord = activeMetric.history.find(
          (r) => new Date(r.observed_on).getTime() === this.x,
        );
        const prov = pointRecord?.provenance || activeMetric.provenance;
        const src =
          pointRecord?.source_name ||
          activeMetric.source_name ||
          "Sensor Observation";
        const conf = pointRecord?.confidence
          ? `${Math.round(pointRecord.confidence * 100)}%`
          : "N/A";

        return `
          <div style="padding: 4px 6px; font-family: sans-serif;">
            <div style="font-size: 11px; color: #6B7280; margin-bottom: 2px;">${dateStr}</div>
            <div style="font-size: 14px; font-weight: 700; color: #0B1F16;">
              ${this.y} <span style="font-size: 11px; font-weight: normal; color: #4B5563;">${activeMetric.unit}</span>
            </div>
            <div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid #E5E7EB; font-size: 10px; color: #374151;">
              <div><b>Source:</b> ${src}</div>
              <div><b>Provenance:</b> ${prov.replace("_", " ")}</div>
              <div><b>Confidence:</b> <span style="color: rgb(0,146,69); font-weight: bold;">${conf}</span></div>
            </div>
          </div>
        `;
      },
    },
    plotOptions: {
      spline: {
        marker: {
          radius: 4,
          fillColor: "#FFFFFF",
          lineWidth: 2,
          lineColor: "rgb(0,146,69)",
        },
      },
    },
    series: [
      {
        name: activeMetric.label,
        data: chartData,
        color: "rgb(0,146,69)",
        lineWidth: 3,
      },
    ],
  };

  return (
    <div className="space-y-4">
      {/* Metric Selector Pills */}
      <div className="flex flex-wrap gap-1.5 p-1 bg-[#F3F4F6] rounded-xl border border-[#E5E7EB]">
        {metrics.map((m) => {
          const isSelected = m.metric_id === activeMetric.metric_id;
          return (
            <button
              key={m.metric_id}
              onClick={() => setSelectedMetricId(m.metric_id)}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
                isSelected
                  ? "bg-white text-[#0B1F16] font-bold shadow-xs border border-[#D1D5DB]"
                  : "text-[#6B7280] hover:text-[#0B1F16]"
              }`}
            >
              {m.label}
            </button>
          );
        })}
      </div>

      {/* Highcharts Render */}
      <div className="bg-white rounded-xl p-3 border border-[#E5E7EB] shadow-xs">
        <HighchartsReact highcharts={Highcharts} options={chartOptions} />
      </div>

      {/* Metric Provenance and Delta Footnote */}
      <div className="flex items-center justify-between text-xs bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl p-3">
        <div className="flex items-center gap-2">
          {activeMetric.provenance === "satellite_derived" ? (
            <Satellite className="w-4 h-4 text-[rgb(0,146,69)]" />
          ) : activeMetric.provenance === "field_survey" ? (
            <Activity className="w-4 h-4 text-emerald-600" />
          ) : (
            <Database className="w-4 h-4 text-indigo-600" />
          )}
          <div>
            <span className="font-semibold text-[#0B1F16]">
              Data Provenance:{" "}
            </span>
            <span className="text-[#4B5563] capitalize">
              {activeMetric.provenance.replace("_", " ")} (
              {activeMetric.source_name})
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono">
          <span className="text-[#6B7280]">Observed Gain:</span>
          <span
            className={`font-bold ${
              (activeMetric.delta_absolute || 0) >= 0
                ? "text-[rgb(0,146,69)]"
                : "text-rose-600"
            }`}
          >
            {(activeMetric.delta_absolute || 0) >= 0 ? "+" : ""}
            {activeMetric.delta_absolute} {activeMetric.unit} (
            {activeMetric.delta_percent !== null
              ? `${activeMetric.delta_percent}%`
              : "0%"}
            )
          </span>
        </div>
      </div>
    </div>
  );
}
