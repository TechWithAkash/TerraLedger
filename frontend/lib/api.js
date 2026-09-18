const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

class ApiClient {
  constructor() {
    this.token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;
  }

  setToken(token) {
    this.token = token;
    if (typeof window !== "undefined") {
      if (token) {
        localStorage.setItem("token", token);
      } else {
        localStorage.removeItem("token");
      }
    }
  }

  async request(endpoint, options = {}) {
    const headers = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    const url = `${API_BASE_URL}${endpoint}`;
    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (response.status === 204) {
        return null;
      }

      const data = await response.json();

      if (!response.ok) {
        const error = new Error(
          data.detail?.message || data.detail || "API Request Failed",
        );
        error.status = response.status;
        error.data = data;
        throw error;
      }

      return data;
    } catch (err) {
      if (!err.status) {
        console.warn(`API Connection error to ${url}:`, err);
      }
      throw err;
    }
  }

  // Auth endpoints
  async login(email, password) {
    const formData = new URLSearchParams();
    formData.append("username", email);
    formData.append("password", password);

    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || "Login failed");
    }

    this.setToken(data.access_token);
    return data;
  }

  async register(email, password, full_name) {
    const data = await this.request("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, full_name, role: "admin" }),
    });
    return data;
  }

  async getMe() {
    return this.request("/auth/me");
  }

  // Projects endpoints
  async getProjects() {
    return this.request("/projects");
  }

  async createProject(projectData) {
    return this.request("/projects", {
      method: "POST",
      body: JSON.stringify(projectData),
    });
  }

  async getProject(projectId) {
    return this.request(`/projects/${projectId}`);
  }

  async deleteProject(projectId) {
    return this.request(`/projects/${projectId}`, {
      method: "DELETE",
    });
  }

  // Sites endpoints
  async getAllSitesGeoJSON() {
    return this.request("/sites/geojson");
  }

  async getProjectSitesGeoJSON(projectId) {
    return this.request(`/projects/${projectId}/sites`);
  }

  async validateSiteGeometry(projectId, boundary) {
    return this.request(`/projects/${projectId}/sites/validate`, {
      method: "POST",
      body: JSON.stringify({
        name: "Validation Probe",
        boundary,
      }),
    });
  }

  async createSite(projectId, siteData) {
    return this.request(`/projects/${projectId}/sites`, {
      method: "POST",
      body: JSON.stringify(siteData),
    });
  }

  async getSite(siteId) {
    return this.request(`/sites/${siteId}`);
  }

  async deleteSite(siteId) {
    return this.request(`/sites/${siteId}`, {
      method: "DELETE",
    });
  }

  // Analytics endpoints
  async getSiteAnalytics(siteId) {
    return this.request(`/sites/${siteId}/analytics`);
  }

  async getMetrics() {
    return this.request("/metrics");
  }
}

export const api = new ApiClient();
