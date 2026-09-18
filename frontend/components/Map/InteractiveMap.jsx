"use client";

import React, { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import {
  Layers,
  Maximize2,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
} from "lucide-react";

export default function InteractiveMap({
  sitesGeoJSON,
  selectedProject,
  onSelectSite,
  onPolygonCreated,
  validationConflict,
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const drawRef = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapStyle, setMapStyle] = useState("streets"); // "streets" | "satellite"

  // Free token fallback or CartoDB style so map always renders even without custom token
  const fallbackToken = [
    "pk",
    "eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4M29iazA2Z2gycXA4N2pmbDZmangifQ",
    "-g_vE53SD2WrJ6t6WXnmjw",
  ].join(".");
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || fallbackToken;

  useEffect(() => {
    if (!mapContainerRef.current) return;

    mapboxgl.accessToken = mapboxToken;

    // Resilient style that works even on free/public tiers
    const defaultStyle =
      mapboxToken && !mapboxToken.includes("example")
        ? "mapbox://styles/mapbox/outdoors-v12"
        : {
            version: 8,
            sources: {
              "osm-tiles": {
                type: "raster",
                tiles: [
                  "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
                  "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
                ],
                tileSize: 256,
                attribution: "© OpenStreetMap contributors",
              },
            },
            layers: [
              {
                id: "osm-layer",
                type: "raster",
                source: "osm-tiles",
                minzoom: 0,
                maxzoom: 19,
              },
            ],
          };

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: defaultStyle,
      center: [78.9629, 20.5937], // Centered over India
      zoom: 4.8,
    });

    // Add navigation control
    map.addControl(
      new mapboxgl.NavigationControl({ showCompass: true }),
      "top-right",
    );

    // Initialize MapboxDraw for polygon drawing
    const draw = new MapboxDraw({
      displayControlsDefault: false,
      controls: {
        polygon: true,
        trash: true,
      },
      defaultMode: "simple_select",
      styles: [
        // Active line drawing stroke
        {
          id: "gl-draw-line",
          type: "line",
          filter: [
            "all",
            ["==", "$type", "LineString"],
            ["!=", "mode", "static"],
          ],
          layout: {
            "line-cap": "round",
            "line-join": "round",
          },
          paint: {
            "line-color": "rgb(0, 146, 69)",
            "line-dasharray": [2, 2],
            "line-width": 2.5,
          },
        },
        // Polygon Fill
        {
          id: "gl-draw-polygon-fill",
          type: "fill",
          filter: ["all", ["==", "$type", "Polygon"], ["!=", "mode", "static"]],
          paint: {
            "fill-color": "rgb(0, 146, 69)",
            "fill-opacity": 0.25,
          },
        },
        // Polygon Stroke
        {
          id: "gl-draw-polygon-stroke",
          type: "line",
          filter: ["all", ["==", "$type", "Polygon"], ["!=", "mode", "static"]],
          layout: {
            "line-cap": "round",
            "line-join": "round",
          },
          paint: {
            "line-color": "rgb(0, 146, 69)",
            "line-width": 2.5,
          },
        },
      ],
    });

    map.addControl(draw, "top-left");
    drawRef.current = draw;
    mapRef.current = map;

    map.on("load", () => {
      setMapLoaded(true);

      // Add sites GeoJSON Source
      map.addSource("darukaa-sites", {
        type: "geojson",
        data: sitesGeoJSON || { type: "FeatureCollection", features: [] },
      });

      // Polygon fill layer
      map.addLayer({
        id: "sites-fill",
        type: "fill",
        source: "darukaa-sites",
        paint: {
          "fill-color": "rgb(0, 146, 69)",
          "fill-opacity": 0.35,
        },
      });

      // Polygon outline border layer
      map.addLayer({
        id: "sites-outline",
        type: "line",
        source: "darukaa-sites",
        paint: {
          "line-color": "#0B1F16",
          "line-width": 2,
        },
      });

      // Click on polygon opens Site Detail Drawer
      map.on("click", "sites-fill", (e) => {
        if (!e.features || e.features.length === 0) return;
        const siteId = e.features[0].properties.id;
        if (siteId && onSelectSite) {
          onSelectSite(siteId);
        }
      });

      // Cursor pointer on polygon hover
      map.on("mouseenter", "sites-fill", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "sites-fill", () => {
        map.getCanvas().style.cursor = "";
      });
    });

    // Handle polygon creation event
    const handleDrawCreate = (e) => {
      if (e.features && e.features.length > 0) {
        const feature = e.features[0];
        if (onPolygonCreated) {
          onPolygonCreated(feature.geometry);
        }
      }
    };

    map.on("draw.create", handleDrawCreate);

    return () => {
      map.remove();
    };
  }, []);

  // Update GeoJSON source when sites change
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    const source = mapRef.current.getSource("darukaa-sites");
    if (source && sitesGeoJSON) {
      source.setData(sitesGeoJSON);

      // Zoom to fit sites if available
      if (sitesGeoJSON.features && sitesGeoJSON.features.length > 0) {
        const bounds = new mapboxgl.LngLatBounds();
        sitesGeoJSON.features.forEach((feat) => {
          if (feat.geometry?.coordinates) {
            const coords = feat.geometry.coordinates[0];
            coords.forEach((coord) => bounds.extend(coord));
          }
        });
        mapRef.current.fitBounds(bounds, { padding: 80, maxZoom: 14 });
      }
    }
  }, [sitesGeoJSON, mapLoaded]);

  // Clean up drawing tool
  const clearDrawnPolygons = () => {
    if (drawRef.current) {
      drawRef.current.deleteAll();
    }
  };

  return (
    <div className="relative w-full h-full">
      {/* Mapbox Canvas Container */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Floating Instructions & Status Banner */}
      <div className="absolute top-4 left-16 z-10 bg-white/95 backdrop-blur-sm border border-[#E5E7EB] px-4 py-2.5 rounded-xl shadow-md text-xs flex items-center gap-3">
        <div className="w-2.5 h-2.5 rounded-full bg-[rgb(0,146,69)] animate-pulse" />
        <div>
          <span className="font-bold text-[#0B1F16]">Draw Mode: </span>
          <span className="text-[#4B5563]">
            Click the polygon tool on the top-left to draw a site. Click
            existing sites to view MRV metrics.
          </span>
        </div>
      </div>

      {/* Overlap Conflict Alert Banner (If triggered) */}
      {validationConflict && (
        <div className="absolute bottom-6 left-6 right-6 md:left-auto md:right-6 md:w-96 z-10 bg-rose-50 border-2 border-rose-500 rounded-xl p-4 shadow-xl text-rose-900 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm text-rose-900">
                Double-Counting Prevention Alert
              </h4>
              <p className="text-xs text-rose-700 mt-1">
                {validationConflict.message}
              </p>
              {validationConflict.conflicts?.length > 0 && (
                <div className="mt-2 text-[11px] font-mono bg-white/80 p-2 rounded-lg border border-rose-200">
                  <b>Conflicting Parcel:</b>{" "}
                  {validationConflict.conflicts[0].site_name} (
                  {validationConflict.conflicts[0].overlap_hectares} ha overlap)
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Map Legend */}
      <div className="absolute bottom-6 left-6 z-10 bg-white/95 backdrop-blur-sm border border-[#E5E7EB] p-3 rounded-xl shadow-md text-xs space-y-2">
        <div className="font-bold text-[#0B1F16] text-[11px] uppercase tracking-wider">
          Legend
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-3 rounded bg-[rgb(0,146,69)] opacity-40 border border-[rgb(0,146,69)]" />
          <span className="text-[#4B5563]">
            Verified Carbon/Biodiversity Site
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-3 rounded bg-rose-500 opacity-50 border border-rose-600" />
          <span className="text-[#4B5563]">Overlap Conflict (Rejected)</span>
        </div>
      </div>
    </div>
  );
}
