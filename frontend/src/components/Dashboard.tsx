import React from "react";
import { Contact, EmailCampaign, WhatsAppCampaign } from "../types";
import { formatDate } from "../utils/helpers";

interface Props {
  contacts: Contact[];
  emailCampaigns: EmailCampaign[];
  whatsappCampaigns: WhatsAppCampaign[];
  onNav: (page: string) => void;
}

export default function Dashboard({ contacts, emailCampaigns, whatsappCampaigns, onNav }: Props) {
  const totalEmailSent = emailCampaigns.reduce((a, c) => a + c.sentCount, 0);
  const totalWaSent = whatsappCampaigns.reduce((a, c) => a + c.sentCount, 0);
  const lastEmail = emailCampaigns.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
  const lastWa = whatsappCampaigns.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Dashboard</h2>
          <p>Overview of your messaging activity</p>
        </div>
      </div>

      {/* Main stats */}
      <div className="stats-row" style={{ marginBottom: 28 }}>
        {[
          { label: "Total Contacts", value: contacts.length, sub: "In your list", color: "var(--text-primary)", icon: "👥" },
          { label: "Emails Sent", value: totalEmailSent, sub: `${emailCampaigns.length} campaigns`, color: "var(--accent-email)", icon: "📧" },
          { label: "WhatsApp Sent", value: totalWaSent, sub: `${whatsappCampaigns.length} campaigns`, color: "var(--accent-wa)", icon: "💬" },
          { label: "Phone Numbers", value: contacts.filter((c) => c.phone).length, sub: "WA-ready contacts", color: "#7c3aed", icon: "📱" },
        ].map((s) => (
          <div key={s.label} className="stat-card">
            <div style={{ fontSize: "1.5rem" }}>{s.icon}</div>
            <span className="stat-value" style={{ color: s.color }}>{s.value}</span>
            <span className="stat-label">{s.label}</span>
            <span className="stat-sub">{s.sub}</span>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header"><h3>Quick Actions</h3></div>
        <div className="card-body" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 12 }}>
          {[
            { label: "Upload Excel Contacts", icon: "📊", page: "contacts", desc: "Import bulk contacts", accent: "var(--accent-email)" },
            { label: "Send Email Campaign", icon: "📧", page: "email", desc: "Compose & send emails", accent: "var(--accent-email)" },
            { label: "Send WhatsApp", icon: "💬", page: "whatsapp", desc: "Bulk WA messages", accent: "var(--accent-wa)" },
            { label: "View Contact List", icon: "👥", page: "contacts", desc: "Manage contacts", accent: "#6b7280" },
          ].map((a) => (
            <button
              key={a.label}
              onClick={() => onNav(a.page)}
              style={{
                background: "var(--bg)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                padding: "16px",
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.15s",
              }}
              onMouseOver={(e) => (e.currentTarget.style.borderColor = a.accent)}
              onMouseOut={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
            >
              <div style={{ fontSize: "1.4rem", marginBottom: 8 }}>{a.icon}</div>
              <div style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--text-primary)" }}>{a.label}</div>
              <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: 3 }}>{a.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div className="card">
          <div className="portal-band portal-band-email" />
          <div className="card-header"><h3>Recent Email Campaigns</h3></div>
          {emailCampaigns.length === 0 ? (
            <div className="empty-state" style={{ padding: "32px" }}>
              <div className="empty-icon">📬</div>
              <h3>No campaigns yet</h3>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Subject</th><th>Sent</th><th>Failed</th><th>Date</th></tr>
                </thead>
                <tbody>
                  {[...emailCampaigns]
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .slice(0, 5)
                    .map((c) => (
                      <tr key={c.id}>
                        <td style={{ maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.subject}</td>
                        <td style={{ color: "var(--accent-wa)", fontWeight: 700 }}>{c.sentCount}</td>
                        <td style={{ color: c.failedCount > 0 ? "var(--accent-danger)" : "var(--text-muted)", fontWeight: 700 }}>{c.failedCount}</td>
                        <td className="text-sm text-muted">{formatDate(c.createdAt)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card">
          <div className="portal-band portal-band-wa" />
          <div className="card-header"><h3>Recent WA Campaigns</h3></div>
          {whatsappCampaigns.length === 0 ? (
            <div className="empty-state" style={{ padding: "32px" }}>
              <div className="empty-icon">💬</div>
              <h3>No campaigns yet</h3>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Message</th><th>Sent</th><th>Failed</th><th>Date</th></tr>
                </thead>
                <tbody>
                  {[...whatsappCampaigns]
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .slice(0, 5)
                    .map((c) => (
                      <tr key={c.id}>
                        <td style={{ maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {c.message.slice(0, 40)}{c.message.length > 40 ? "…" : ""}
                        </td>
                        <td style={{ color: "var(--accent-wa)", fontWeight: 700 }}>{c.sentCount}</td>
                        <td style={{ color: c.failedCount > 0 ? "var(--accent-danger)" : "var(--text-muted)", fontWeight: 700 }}>{c.failedCount}</td>
                        <td className="text-sm text-muted">{formatDate(c.createdAt)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
