// System monitoring for the IT portal (base /api/system).
// Real endpoints are optional — in mock mode we report a healthy stack so the
// IT screens are fully demo-able without a live backend.
import { api } from "./apiClient.js";

const USE_MOCK = () => import.meta.env.VITE_USE_MOCK !== "false";

// GET /system/health -> [{ name, status, uptime, latency }]
export async function getSystemHealth() {
  if (USE_MOCK()) {
    return [
      { name: "API server",      status: "operational", uptime: "99.98%", latency: "82 ms" },
      { name: "Database",        status: "operational", uptime: "99.95%", latency: "14 ms" },
      { name: "Authentication",  status: "operational", uptime: "99.99%", latency: "60 ms" },
      { name: "Email / reminders", status: "degraded",  uptime: "98.20%", latency: "310 ms" },
      { name: "File storage",    status: "operational", uptime: "99.90%", latency: "45 ms" },
    ];
  }
  const data = await api.get("/system/health");
  return Array.isArray(data) ? data : [];
}

// GET /system/metrics -> { requestsPerMin, errorRate, dbConnections, storageUsed }
export async function getSystemMetrics() {
  if (USE_MOCK()) {
    return {
      requestsPerMin: 1240,
      errorRate: 0.4,
      dbConnections: 18,
      dbConnectionsMax: 50,
      storageUsedGb: 4.7,
      storageTotalGb: 20,
      lastBackup: "Today, 03:00 GMT",
      incidents: [
        { when: "Aug 10, 2026", service: "Email / reminders", note: "Elevated latency from provider; auto-retry enabled." },
        { when: "Aug 02, 2026", service: "Database", note: "Scheduled maintenance, 4 min downtime." },
      ],
    };
  }
  return api.get("/system/metrics");
}
