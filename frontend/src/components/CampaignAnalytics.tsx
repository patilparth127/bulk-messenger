import React, { useState, useEffect } from "react";
import { BarChart3, TrendingUp, Send, CheckCircle2, AlertCircle, MousePointer2 } from "lucide-react";
import toast from "react-hot-toast";
import { CampaignAnalytics as AnalyticsType } from "../types";
import { getCampaignAnalytics, getInteractiveLogs } from "../utils/api";

export default function CampaignAnalytics() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [analytics, setAnalytics] = useState<AnalyticsType | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCampaigns();
  }, []);

  useEffect(() => {
    if (selectedId) {
      loadAnalytics(selectedId);
    }
  }, [selectedId]);

  const loadCampaigns = async () => {
    try {
      const logs = await getInteractiveLogs();
      const uniqueCampaigns = Array.from(
        new Map(logs.map((log: any) => [log.campaignId, log.campaignId])).entries()
      ).map(([id]) => ({ id, createdAt: logs.find((l: any) => l.campaignId === id)?.sentAt }));
      setCampaigns(uniqueCampaigns);
    } catch (error) {
      console.error("Failed to load campaigns");
    }
  };

  const loadAnalytics = async (id: string) => {
    try {
      setLoading(true);
      const data = await getCampaignAnalytics(id);
      setAnalytics(data);
    } catch (error) {
      toast.error("Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ width: "100%" }}>
      <div className="card-header">
        <h3>Campaign Analytics</h3>
        <select
          className="form-input"
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          style={{ width: 300 }}
        >
          <option value="" disabled>Select a campaign</option>
          {campaigns.map(c => (
            <option key={c.id} value={c.id}>Campaign {c.id.substring(0, 8)}... ({new Date(c.createdAt).toLocaleDateString()})</option>
          ))}
        </select>
      </div>

      <div className="card-body">
        {!selectedId && (
          <div className="empty-state" style={{ padding: "40px 0" }}>
            <div className="empty-icon">📊</div>
            <h4>Select a campaign</h4>
            <p>Choose a campaign to view detailed engagement analytics</p>
          </div>
        )}

        {loading && (
          <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
            <span className="spinner spinner-dark" style={{ width: 32, height: 32 }}></span>
          </div>
        )}

        {analytics && !loading && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
              <div style={{ padding: 16, border: "1px solid var(--border-light)", borderRadius: 8, backgroundColor: "var(--bg-card)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                  <div style={{ padding: 8, backgroundColor: "var(--accent-wa-bg)", borderRadius: 8 }}>
                    <Send size={20} style={{ color: "var(--accent-wa)" }} />
                  </div>
                  <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Total Sent</span>
                </div>
                <div style={{ fontSize: "1.5rem", fontWeight: 600 }}>{analytics.totalSent}</div>
              </div>

              <div style={{ padding: 16, border: "1px solid var(--border-light)", borderRadius: 8, backgroundColor: "var(--bg-card)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                  <div style={{ padding: 8, backgroundColor: "#dcfce7", borderRadius: 8 }}>
                    <CheckCircle2 size={20} style={{ color: "#16a34a" }} />
                  </div>
                  <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Delivered</span>
                </div>
                <div style={{ fontSize: "1.5rem", fontWeight: 600 }}>{analytics.delivered}</div>
              </div>

              <div style={{ padding: 16, border: "1px solid var(--border-light)", borderRadius: 8, backgroundColor: "var(--bg-card)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                  <div style={{ padding: 8, backgroundColor: "#fee2e2", borderRadius: 8 }}>
                    <AlertCircle size={20} style={{ color: "#dc2626" }} />
                  </div>
                  <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Failed</span>
                </div>
                <div style={{ fontSize: "1.5rem", fontWeight: 600 }}>{analytics.failed}</div>
              </div>

              <div style={{ padding: 16, border: "1px solid var(--border-light)", borderRadius: 8, backgroundColor: "var(--bg-card)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                  <div style={{ padding: 8, backgroundColor: "#dbeafe", borderRadius: 8 }}>
                    <MousePointer2 size={20} style={{ color: "#2563eb" }} />
                  </div>
                  <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Responses</span>
                </div>
                <div style={{ fontSize: "1.5rem", fontWeight: 600 }}>{analytics.responseCount}</div>
              </div>
            </div>

            <div style={{ padding: 24, border: "1px solid var(--border-light)", borderRadius: 8, backgroundColor: "var(--bg-hover)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <h4 style={{ marginBottom: 8 }}>Engagement Rate</h4>
                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Percentage of users who interacted with your message</p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ fontSize: "2.5rem", fontWeight: 700, color: "var(--accent-wa)" }}>
                  {analytics.engagementRate.toFixed(1)}%
                </div>
                <div style={{ padding: 16, backgroundColor: "var(--accent-wa-bg)", borderRadius: "50%" }}>
                  <TrendingUp size={32} style={{ color: "var(--accent-wa)" }} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
