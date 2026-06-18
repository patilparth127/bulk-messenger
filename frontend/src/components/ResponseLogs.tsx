import React, { useState, useEffect } from "react";
import { MessageSquare, RefreshCw, Clock, User, Phone, Activity } from "lucide-react";
import toast from "react-hot-toast";
import { InteractiveResponse } from "../types";
import { getInteractiveResponses } from "../utils/api";
import { formatDate } from "../utils/helpers";

export default function ResponseLogs() {
  const [responses, setResponses] = useState<InteractiveResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const loadResponses = async () => {
    try {
      setLoading(true);
      const data = await getInteractiveResponses();
      setResponses(data.sort((a, b) => new Date(b.responseAt).getTime() - new Date(a.responseAt).getTime()));
      setLastUpdate(new Date());
    } catch (error) {
      toast.error("Failed to load responses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadResponses();
    const interval = setInterval(loadResponses, 5000); // Refresh every 5s for real-time updates
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="card" style={{ width: "100%" }}>
      <div className="card-header">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <h3>Interactive Responses</h3>
          {lastUpdate && (
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
              <Activity size={12} className="animate-pulse" />
              Live • Updated {formatDate(lastUpdate.toISOString())}
            </span>
          )}
        </div>
        <button className="btn btn-secondary" onClick={loadResponses} disabled={loading} style={{ fontSize: "0.85rem", padding: "6px 12px" }}>
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} style={{ marginRight: 4 }} />
          Refresh
        </button>
      </div>

      <div className="card-body">
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
            <span className="spinner spinner-dark" style={{ width: 32, height: 32 }}></span>
          </div>
        ) : responses.length === 0 ? (
          <div className="empty-state" style={{ padding: "40px 0" }}>
            <div className="empty-icon">💬</div>
            <h4>No responses yet</h4>
            <p>Responses will appear here when contacts interact with your polls</p>
          </div>
        ) : (
          <div style={{ border: "1px solid var(--border-light)", borderRadius: 8, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ backgroundColor: "var(--bg-hover)", borderBottom: "1px solid var(--border-light)" }}>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "0.85rem", fontWeight: 600, color: "var(--text-muted)" }}>Contact</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "0.85rem", fontWeight: 600, color: "var(--text-muted)" }}>Phone</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "0.85rem", fontWeight: 600, color: "var(--text-muted)" }}>Selected Option</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "0.85rem", fontWeight: 600, color: "var(--text-muted)" }}>Time</th>
                </tr>
              </thead>
              <tbody>
                {responses.map((res) => (
                  <tr key={res.id} style={{ borderBottom: "1px solid var(--border-light)", backgroundColor: "rgba(25, 135, 84, 0.05)" }}>
                    <td style={{ padding: "12px 16px", fontSize: "0.85rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <User size={16} style={{ color: "var(--text-muted)" }} />
                        {res.contactName}
                      </div>
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: "0.85rem", color: "var(--text-muted)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Phone size={14} />
                        {res.contactPhone}
                      </div>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{
                        padding: "4px 12px",
                        backgroundColor: "var(--accent-wa-bg)",
                        color: "var(--accent-wa)",
                        borderRadius: 12,
                        fontSize: "0.8rem",
                        fontWeight: 500
                      }}>
                        {res.selectedOption}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: "0.85rem", color: "var(--text-muted)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Clock size={14} />
                        {formatDate(res.responseAt)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
