import axios from "axios";

const getBaseUrl = () => {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  // If explicitly set to something other than localhost, use it (e.g., prod URL)
  if (envUrl && !envUrl.includes("localhost")) {
    return envUrl;
  }
  // Client-side: use the current hostname but with port 8000
  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.hostname}:8000`;
  }
  return envUrl || "http://localhost:8000";
};

export const api = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers = config.headers || {};
      (config.headers as any).Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    if (typeof window !== "undefined") {
      const newToken = response.headers["x-new-token"];
      if (newToken) {
        localStorage.setItem("token", newToken);
      }
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      if (typeof window !== "undefined") {
        if (!window.location.pathname.startsWith("/login")) {
          localStorage.removeItem("token");
          localStorage.removeItem("role");
          localStorage.removeItem("user_code");
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  }
);
