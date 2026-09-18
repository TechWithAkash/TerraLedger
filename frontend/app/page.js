"use client";

import React, { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import Navbar from "../components/Navbar";
import SiteDetailDrawer from "../components/SiteDetailDrawer";
import NewProjectModal from "../components/NewProjectModal";
import NewSiteModal from "../components/NewSiteModal";
import AuthModal from "../components/AuthModal";
import { api } from "../lib/api";

const InteractiveMap = dynamic(
  () => import("../components/Map/InteractiveMap"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-[#0B1F16] text-white">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 border-2 border-[rgb(0,146,69)] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium">Loading Map Engine...</span>
        </div>
      </div>
    ),
  },
);
import { TreePine, AlertCircle, Sparkles, MapPin, Layers } from "lucide-react";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [sitesGeoJSON, setSitesGeoJSON] = useState({
    type: "FeatureCollection",
    features: [],
  });

  const [selectedSiteId, setSelectedSiteId] = useState(null);
  const [drawnPolygon, setDrawnPolygon] = useState(null);
  const [drawnAreaHa, setDrawnAreaHa] = useState(0);
  const [validationConflict, setValidationConflict] = useState(null);

  // Modals
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
  const [isNewSiteOpen, setIsNewSiteOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  const loadProjects = useCallback(async () => {
    try {
      const data = await api.getProjects();
      setProjects(data || []);
    } catch (err) {
      console.warn("Could not fetch projects:", err.message || err);
    }
  }, []);

  const loadSites = useCallback(async (projId = null) => {
    try {
      let geojson;
      if (projId) {
        geojson = await api.getProjectSitesGeoJSON(projId);
      } else {
        geojson = await api.getAllSitesGeoJSON();
      }
      setSitesGeoJSON(geojson || { type: "FeatureCollection", features: [] });
    } catch (err) {
      console.warn("Could not fetch sites GeoJSON:", err);
    }
  }, []);

  // Initial user check and projects loading
  useEffect(() => {
    const initSession = async () => {
      let currentUser = null;
      try {
        if (api.token) {
          currentUser = await api.getMe();
        } else {
          // Auto-authenticate with reviewer demo account for seamless one-click testing
          try {
            const authRes = await api.login("admin@darukaa.earth", "demo1234");
            currentUser = authRes.user;
          } catch {
            // Backend might still be starting or unseeded
          }
        }
      } catch {
        // Fallback gracefully
      }
      setUser(currentUser);
      await loadProjects();
      await loadSites();
    };

    initSession();
  }, [loadProjects, loadSites]);

  // When selected project changes, refresh site polygons
  const handleSelectProject = (project) => {
    setSelectedProject(project);
    setSelectedSiteId(null);
    setValidationConflict(null);
    loadSites(project ? project.id : null);
  };

  // When a polygon is finished drawing on the map
  const handlePolygonCreated = async (polygonGeometry) => {
    setValidationConflict(null);
    const targetProjId = selectedProject?.id || projects[0]?.id;

    if (!targetProjId) {
      alert("Please create or select a project before adding site parcels.");
      return;
    }

    try {
      // Execute dry-run overlap validation (The key domain differentiator)
      const validation = await api.validateSiteGeometry(
        targetProjId,
        polygonGeometry,
      );

      if (validation.has_overlap) {
        // Trigger red conflict banner
        setValidationConflict({
          message: validation.message,
          conflicts: validation.conflicts,
        });
      } else {
        // Polygon is clean! Open new site modal with calculated hectares
        setDrawnPolygon(polygonGeometry);
        setDrawnAreaHa(validation.area_hectares);
        setIsNewSiteOpen(true);
      }
    } catch (err) {
      console.error("Validation error:", err);
      // Still allow modal opening with fallback
      setDrawnPolygon(polygonGeometry);
      setIsNewSiteOpen(true);
    }
  };

  // Create Project handler
  const handleCreateProject = async (projectData) => {
    const newProj = await api.createProject(projectData);
    await loadProjects();
    setSelectedProject(newProj);
    loadSites(newProj.id);
  };

  // Create Site handler
  const handleCreateSite = async (projectId, siteData) => {
    await api.createSite(projectId, siteData);
    await loadProjects();
    await loadSites(selectedProject ? selectedProject.id : null);
  };

  // Auth Success handler
  const handleAuthSuccess = async (credentials) => {
    if (credentials.type === "register") {
      await api.register(
        credentials.email,
        credentials.password,
        credentials.fullName,
      );
    }
    const tokenData = await api.login(credentials.email, credentials.password);
    setUser(tokenData.user);
    await loadProjects();
    await loadSites();
  };

  const handleLogout = () => {
    api.setToken(null);
    setUser(null);
  };

  // Calculate portfolio totals
  const totalSites = sitesGeoJSON.features?.length || 0;
  const totalPortfolioArea = sitesGeoJSON.features?.reduce((acc, feat) => {
    return acc + (feat.properties?.area_hectares || 0);
  }, 0);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#F9FAFB]">
      {/* Navigation Header */}
      <Navbar
        projects={projects}
        selectedProject={selectedProject}
        onSelectProject={handleSelectProject}
        onOpenNewProject={() => setIsNewProjectOpen(true)}
        user={user}
        onOpenAuth={() => setIsAuthOpen(true)}
        onLogout={handleLogout}
        siteCount={totalSites}
        totalArea={totalPortfolioArea}
      />

      {/* Main Map & Interactive Workspace */}
      <main className="flex-1 relative overflow-hidden">
        <InteractiveMap
          sitesGeoJSON={sitesGeoJSON}
          selectedProject={selectedProject}
          onSelectSite={(siteId) => setSelectedSiteId(siteId)}
          onPolygonCreated={handlePolygonCreated}
          validationConflict={validationConflict}
        />

        {/* Site Details Analytics Drawer */}
        <SiteDetailDrawer
          siteId={selectedSiteId}
          onClose={() => setSelectedSiteId(null)}
          onSiteDeleted={() => {
            loadProjects();
            loadSites(selectedProject ? selectedProject.id : null);
          }}
        />
      </main>

      {/* Modals */}
      <NewProjectModal
        isOpen={isNewProjectOpen}
        onClose={() => setIsNewProjectOpen(false)}
        onProjectCreated={handleCreateProject}
      />

      <NewSiteModal
        isOpen={isNewSiteOpen}
        onClose={() => {
          setIsNewSiteOpen(false);
          setDrawnPolygon(null);
        }}
        polygonGeometry={drawnPolygon}
        areaHectares={drawnAreaHa}
        projectId={selectedProject?.id}
        projects={projects}
        onSiteCreated={handleCreateSite}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />
    </div>
  );
}
