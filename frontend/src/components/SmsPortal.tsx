import React, { useState, useEffect } from "react";
import { Send, ChevronDown, ChevronUp, Smartphone, RefreshCw, AlertCircle, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";
import { Contact, SmsCampaign, SendStatus } from "../types";
import { sendSmsCampaign, getAdbStatus } from "../utils/api";
import { formatDate, formatPhone } from "../utils/helpers";

interface Props {
  contacts: Contact[];
  campaigns: SmsCampaign[];
  onRefresh: () => void;
}

// ── Template variables available ──────────────────────────────
const TEMPLATE_VARS = [
  { label: "{name}", desc: "Contact's name" },
  { label: "{phone}", desc: "Contact's phone" },
  { label: "{email}", desc: "Contact's email" },
];

// ── Sample templates ──────────────────────────────────────────
const SAMPLE_TEMPLATES = [
  {
    label: "Greeting",
    text: "Hello {name}! Hope you are doing well. Feel free to reach us anytime.",
  },
  {
    label: "Promotion",
    text: "Hi {name}, Special offer just for you! Visit us today and get exclusive deals. Reply STOP to opt out.",
  },
  {
    label: "Reminder",
    text: "Dear {name}, This is a reminder for your upcoming appointment. Contact us at reply for details.",
  },
  {
    label: "Welcome",
    text: "Welcome {name}! Thank you for joining us. We are excited to have you on board.",
  },
];

export default function SmsPortal({ contacts, campaigns, onRefresh }: Props) {
  const [activeTab, setActiveTab] = useState<"compose" | "history">("compose");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedCamp, setExpandedCamp] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [template, setTemplate] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [adbStatus, setAdbStatus] = useState<{ connected: boolean; device: string | null; message: string } | null>(null);
  const [checkingAdb, setCheckingAdb] = useState(false);
  const [previewContact, setPreviewContact] = useState<Contact | null>(null);

  const phoneContacts = contacts.filter((c) => c.phone);

  // Check ADB on mount
  useEffect(() => {
    checkAdb();
  }, []);

  // Set first contact as preview
  useEffect(() => {
    if (phoneContacts.length > 0 && !previewContact) {
      setPreviewContact(phoneContacts[0]);
    }
  }, [contacts]);

  const checkAdb = async () => {
    setCheckingAdb(true);
    try {
      const status = await getAdbStatus();
      setAdbStatus(status);
    } catch {
      setAdbStatus({ connected: false, device: null, message: "Could not reach backend. Is server running?" });
    } finally {
      setCheckingAdb(false);
    }
  };

  const insertVar = (v: string) => {
    setTemplate((t) => t + v);
  };

  const getPreview = (contact: Contact | null) => {
    if (!contact) return template;
    return template
      .replace(/\{name\}/gi, contact.name)
      .replace(/\{phone\}/gi, contact.phone)
      .replace(/\{email\}/gi, contact.email || "");
  };

  const toggleAll = () => {
    if (selectedIds.size === phoneContacts.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(phoneContacts.map((c) => c.id)));
  };

  const toggle = (id: string) => {
    const s = new Set(selectedIds);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelectedIds(s);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!template.trim()) e.template = "Message template is required";
    if (template.length > 160) e.template = `Message too long (${template.length}/160 chars for single SMS)`;
    if (selectedIds.size === 0) e.contacts = "Select at least one contact";
    if (!adbStatus?.connected) e.adb = "Android device not connected";
    return e;
  };

  const handleSend = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({});

    setSending(true);
    const tid = toast.loading(`Sending SMS to ${selectedIds.size} contacts via your phone…`);
    try {
      const result = await sendSmsCampaign({
        template,
        contactIds: Array.from(selectedIds),
      });
      toast.dismiss(tid);
      toast.success(`✅ Sent: ${result.sentCount}   ❌ Failed: ${result.failedCount}`);
      setTemplate("");
      setSelectedIds(new Set());
      onRefresh();
      setActiveTab("history");
    } catch (err: any) {
      toast.dismiss(tid);
      toast.error(err?.response?.data?.error || "SMS send failed");
    } finally {
      setSending(false);
    }
  };

  const sortedCampaigns = [...campaigns].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const charCount = template.length;
  const smsCount = Math.ceil(charCount / 160) || 1;

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h2>📱 SMS Portal</h2>
          <p>Send bulk SMS from your Android phone via USB — 100% Free</p>
        </div>
      </div>

      {/* ADB Status Banner */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 16px",
        borderRadius: "var(--radius)",
        border: `1px solid ${adbStatus?.connected ? "var(--accent-wa-border)" : "#fecaca"}`,
        background: adbStatus?.connected ? "var(--accent-wa-light)" : "#fef2f2",
        marginBottom: 20,
        flexWrap: "wrap",
      }}>
        {adbStatus?.connected
          ? <CheckCircle size={18} color="var(--accent-wa)" />
          : <AlertCircle size={18} color="var(--accent-danger)" />
        }
        <div style={{ flex: 1 }}>
          <span style={{
            fontWeight: 700,
            fontSize: "0.875rem",
            color: adbStatus?.connected ? "var(--accent-wa)" : "var(--accent-danger)",
          }}>
            {adbStatus?.connected ? `Phone Connected: ${adbStatus.device}` : "Phone Not Connected"}
          </span>
          <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: 2 }}>
            {adbStatus?.message || "Checking…"}
          </div>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={checkAdb} disabled={checkingAdb}>
          <RefreshCw size={13} className={checkingAdb ? "spin" : ""} />
          {checkingAdb ? "Checking…" : "Re-check"}
        </button>
      </div>

      {/* Setup Guide (show when not connected) */}
      {!adbStatus?.connected && (
        <div className="card" style={{ marginBottom: 20, borderColor: "#fecaca" }}>
          <div className="card-header" style={{ background: "#fff5f5" }}>
            <h3>📋 Setup Guide — How to Connect Your Android Phone</h3>
          </div>
          <div className="card-body">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
              {[
                { step: "1", title: "Enable Developer Options", desc: "Go to Settings → About Phone → tap Build Number 7 times" },
                { step: "2", title: "Enable USB Debugging", desc: "Settings → Developer Options → Turn ON USB Debugging" },
                { step: "3", title: "Connect via USB", desc: "Connect your Android phone to PC with USB cable. Select 'File Transfer' mode" },
                { step: "4", title: "Install ADB on PC", desc: "Download Android Platform Tools from developer.android.com/tools and add to PATH" },
                { step: "5", title: "Authorize PC", desc: "A popup will appear on your phone — tap 'Allow USB Debugging'" },
                { step: "6", title: "Verify", desc: 'Run "adb devices" in terminal — your device should show as "device"' },
              ].map((s) => (
                <div key={s.step} style={{
                  background: "var(--bg)",
                  borderRadius: "var(--radius)",
                  padding: "14px 16px",
                  border: "1px solid var(--border)",
                }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: "50%",
                    background: "var(--accent-email)", color: "white",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 700, fontSize: "0.8rem", marginBottom: 8,
                  }}>{s.step}</div>
                  <div style={{ fontWeight: 700, fontSize: "0.85rem", marginBottom: 4 }}>{s.title}</div>
                  <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>{s.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="stats-row" style={{ marginBottom: 20 }}>
        <div className="stat-card">
          <span className="stat-label">Campaigns</span>
          <span className="stat-value" style={{ color: "#7c3aed" }}>{campaigns.length}</span>
          <span className="stat-sub">Total sent</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">SMS Sent</span>
          <span className="stat-value">{campaigns.reduce((a, c) => a + c.sentCount, 0)}</span>
          <span className="stat-sub">Successfully</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Failed</span>
          <span className="stat-value" style={{ color: "var(--accent-danger)" }}>
            {campaigns.reduce((a, c) => a + c.failedCount, 0)}
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Phone Contacts</span>
          <span className="stat-value">{phoneContacts.length}</span>
          <span className="stat-sub">Have numbers</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button
          className={`tab`}
          style={activeTab === "compose" ? { color: "#7c3aed", borderBottomColor: "#7c3aed" } : {}}
          onClick={() => setActiveTab("compose")}
        >
          Compose SMS
        </button>
        <button
          className={`tab`}
          style={activeTab === "history" ? { color: "#7c3aed", borderBottomColor: "#7c3aed" } : {}}
          onClick={() => setActiveTab("history")}
        >
          Campaign History {campaigns.length > 0 && `(${campaigns.length})`}
        </button>
      </div>

      {activeTab === "compose" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20 }}>

          {/* Left: Template composer */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Sample Templates */}
            <div className="card">
              <div className="card-header">
                <h3>Quick Templates</h3>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Click to use</span>
              </div>
              <div className="card-body" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {SAMPLE_TEMPLATES.map((t) => (
                  <button
                    key={t.label}
                    className="btn btn-secondary btn-sm"
                    onClick={() => setTemplate(t.text)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Composer */}
            <div className="card">
              <div style={{ height: 4, borderRadius: "14px 14px 0 0", background: "linear-gradient(90deg, #7c3aed, #a78bfa)" }} />
              <div className="card-header">
                <h3>Message Template</h3>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <span style={{
                    fontSize: "0.75rem", fontWeight: 600,
                    color: charCount > 160 ? "var(--accent-danger)" : "var(--text-muted)"
                  }}>
                    {charCount}/160 · {smsCount} SMS
                  </span>
                </div>
              </div>
              <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>

                {/* Variable buttons */}
                <div>
                  <label className="form-label" style={{ marginBottom: 8, display: "block" }}>
                    Insert Variable
                  </label>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {TEMPLATE_VARS.map((v) => (
                      <button
                        key={v.label}
                        onClick={() => insertVar(v.label)}
                        style={{
                          background: "#f3f0ff",
                          border: "1px solid #ddd6fe",
                          borderRadius: "var(--radius)",
                          padding: "4px 10px",
                          fontSize: "0.8rem",
                          fontWeight: 600,
                          color: "#7c3aed",
                          cursor: "pointer",
                          fontFamily: "var(--font-mono)",
                        }}
                        title={v.desc}
                      >
                        {v.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Template <span className="req">*</span>
                  </label>
                  <textarea
                    className="form-textarea"
                    style={{
                      minHeight: 130,
                      fontFamily: "var(--font-mono)",
                      fontSize: "0.875rem",
                      borderColor: errors.template ? "var(--accent-danger)" : undefined,
                    }}
                    placeholder="Hello {name}, your message here..."
                    value={template}
                    onChange={(e) => setTemplate(e.target.value)}
                  />
                  {errors.template && <span className="form-error">{errors.template}</span>}
                </div>

                {/* Character count bar */}
                <div>
                  <div className="progress-bar-wrap">
                    <div className="progress-bar" style={{
                      width: `${Math.min((charCount / 160) * 100, 100)}%`,
                      background: charCount > 160 ? "var(--accent-danger)" : "#7c3aed",
                    }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: "0.72rem", color: "var(--text-muted)" }}>
                    <span>0</span>
                    <span style={{ color: "#7c3aed", fontWeight: 600 }}>160 chars = 1 SMS</span>
                    <span>320</span>
                  </div>
                </div>

                {errors.contacts && <span className="form-error">⚠ {errors.contacts}</span>}
                {errors.adb && <span className="form-error">⚠ {errors.adb}</span>}

                <button
                  className="btn btn-lg w-full"
                  style={{
                    background: adbStatus?.connected ? "#7c3aed" : "var(--border)",
                    color: adbStatus?.connected ? "white" : "var(--text-muted)",
                    borderColor: adbStatus?.connected ? "#7c3aed" : "var(--border)",
                    cursor: adbStatus?.connected ? "pointer" : "not-allowed",
                  }}
                  onClick={handleSend}
                  disabled={sending || !adbStatus?.connected}
                >
                  {sending ? <span className="spinner" /> : <Send size={16} />}
                  {sending
                    ? `Sending… (this may take a while)`
                    : adbStatus?.connected
                    ? `Send to ${selectedIds.size} Contact${selectedIds.size !== 1 ? "s" : ""} via ${adbStatus.device}`
                    : "Connect Android Phone First"
                  }
                </button>

                {sending && (
                  <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", textAlign: "center", background: "var(--bg)", borderRadius: "var(--radius)", padding: "10px" }}>
                    📱 Do not disconnect your phone. SMS are being sent one by one with a small delay to avoid spam detection.
                  </div>
                )}
              </div>
            </div>

            {/* Live Preview */}
            {template && (
              <div className="card">
                <div className="card-header">
                  <h3>Live Preview</h3>
                  {phoneContacts.length > 0 && (
                    <select
                      className="form-select"
                      style={{ width: "auto", fontSize: "0.8rem", padding: "4px 8px" }}
                      value={previewContact?.id || ""}
                      onChange={(e) => setPreviewContact(phoneContacts.find((c) => c.id === e.target.value) || null)}
                    >
                      {phoneContacts.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  )}
                </div>
                <div className="card-body">
                  {/* SMS bubble */}
                  <div style={{
                    background: "#f3f0ff",
                    border: "1px solid #ddd6fe",
                    borderRadius: "0 12px 12px 12px",
                    padding: "12px 16px",
                    maxWidth: "80%",
                    fontSize: "0.9rem",
                    lineHeight: 1.6,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    color: "#3b0764",
                    fontFamily: "system-ui",
                    boxShadow: "0 2px 6px rgba(124,58,237,0.1)",
                  }}>
                    {getPreview(previewContact)}
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 6 }}>
                    To: {previewContact ? formatPhone(previewContact.phone) : "—"} · {charCount} chars · {smsCount} SMS unit{smsCount > 1 ? "s" : ""}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right: Contact picker */}
          <div className="card" style={{ height: "fit-content" }}>
            <div style={{ height: 4, borderRadius: "14px 14px 0 0", background: "linear-gradient(90deg, #7c3aed, #a78bfa)" }} />
            <div className="card-header">
              <h3>Select Recipients</h3>
              <span style={{ fontSize: "0.75rem", color: "#7c3aed", fontWeight: 600 }}>
                {selectedIds.size} selected
              </span>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              {phoneContacts.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">📵</div>
                  <h3>No phone contacts</h3>
                  <p>Add phone numbers to contacts first</p>
                </div>
              ) : (
                <>
                  <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--border-light)", display: "flex", gap: 8, alignItems: "center" }}>
                    <input
                      type="checkbox"
                      style={{ accentColor: "#7c3aed" }}
                      checked={selectedIds.size === phoneContacts.length}
                      onChange={toggleAll}
                    />
                    <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 600 }}>
                      Select All ({phoneContacts.length})
                    </span>
                  </div>
                  <div style={{ maxHeight: 420, overflowY: "auto", padding: "4px 16px" }}>
                    {phoneContacts.map((c) => (
                      <div key={c.id} className="checkbox-row">
                        <input
                          type="checkbox"
                          style={{ accentColor: "#7c3aed" }}
                          checked={selectedIds.has(c.id)}
                          onChange={() => toggle(c.id)}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>{c.name}</div>
                          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                            {formatPhone(c.phone)}
                          </div>
                        </div>
                        {/* {(c.smsSentCount || 0) > 0 && (
                          <span style={{ fontSize: "0.7rem", color: "#7c3aed", fontWeight: 700 }}>
                            ×{c.smsSentCount}
                          </span>
                        )} */}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* History Tab */}
      {activeTab === "history" && (
        <div>
          {sortedCampaigns.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📱</div>
              <h3>No SMS campaigns yet</h3>
              <p>Compose and send your first SMS campaign</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {sortedCampaigns.map((camp) => {
                const pct = camp.totalTargets > 0 ? Math.round((camp.sentCount / camp.totalTargets) * 100) : 0;
                const isOpen = expandedCamp === camp.id;
                return (
                  <div key={camp.id} className="card">
                    <div className="card-header" style={{ cursor: "pointer" }} onClick={() => setExpandedCamp(isOpen ? null : camp.id)}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: "0.88rem", marginBottom: 4, fontFamily: "var(--font-mono)", color: "#3b0764" }}>
                          {camp.template.slice(0, 80)}{camp.template.length > 80 ? "…" : ""}
                        </div>
                        <div style={{ display: "flex", gap: 16, fontSize: "0.78rem", color: "var(--text-muted)", flexWrap: "wrap" }}>
                          {/* <span>📱 {camp.device || "Android"}</span> */}
                          <span>Sent: {formatDate(camp.createdAt)}</span>
                        </div>
                        <div style={{ marginTop: 8, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                          <span style={{ color: "var(--accent-wa)", fontWeight: 700, fontSize: "0.85rem" }}>✅ {camp.sentCount} sent</span>
                          <span style={{ color: "var(--accent-danger)", fontWeight: 700, fontSize: "0.85rem" }}>❌ {camp.failedCount} failed</span>
                          <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>/ {camp.totalTargets} total</span>
                          <div style={{ flex: 1, minWidth: 100 }}>
                            <div className="progress-bar-wrap">
                              <div className="progress-bar" style={{ width: `${pct}%`, background: "#7c3aed" }} />
                            </div>
                          </div>
                          <span style={{ fontSize: "0.78rem", color: "#7c3aed", fontWeight: 600 }}>{pct}%</span>
                        </div>
                      </div>
                      {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                    {isOpen && camp.logs && camp.logs.length > 0 && (
                      <div className="table-wrap" style={{ borderTop: "1px solid var(--border-light)" }}>
                        <table>
                          <thead>
                            <tr>
                              <th>Name</th>
                              <th>Phone</th>
                              <th>Message Sent</th>
                              <th>Status</th>
                              <th>Sent At</th>
                              <th>Error</th>
                            </tr>
                          </thead>
                          <tbody>
                            {camp.logs.map((log: any) => (
                              <tr key={log.id}>
                                <td>{log.contactName}</td>
                                <td className="font-mono">{formatPhone(log.contactPhone)}</td>
                                <td style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "0.78rem" }}>
                                  {log.message}
                                </td>
                                <td>
                                  <span className={`badge badge-${log.status}`}>
                                    {log.status === SendStatus.SENT ? "✓" : log.status === SendStatus.FAILED ? "✗" : "…"} {log.status}
                                  </span>
                                </td>
                                <td className="text-sm text-muted">{formatDate(log.sentAt)}</td>
                                <td className="text-sm" style={{ color: "var(--accent-danger)", maxWidth: 160, wordBreak: "break-word" }}>
                                  {log.error || "—"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
