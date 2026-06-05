import React, { useState, useEffect, useMemo } from "react";
import { Send, ChevronDown, ChevronUp, Smartphone, RefreshCw, AlertCircle, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";
import { Contact, SmsCampaign, SendStatus } from "../types";
import { sendSmsCampaign, getSmsGatewayStatus } from "../utils/api";
import { formatDate, formatPhone } from "../utils/helpers";
import TableControls, { Column, SortConfig, FilterConfig, PaginationConfig } from "./TableControls";
import RenewalPopup from "./RenewalPopup";

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
  const [showRenewalPopup, setShowRenewalPopup] = useState(false);
  const [renewalError, setRenewalError] = useState("");
  const [renewalCode, setRenewalCode] = useState("");
  const [contactSearch, setContactSearch] = useState("");
  const [gatewayStatus, setGatewayStatus] = useState<{ connected: boolean; device: string | null; message: string } | null>(null);
  const [checkingGateway, setCheckingGateway] = useState(false);
  const [previewContact, setPreviewContact] = useState<Contact | null>(null);
  
  // Table controls for campaign history
  const [historySearch, setHistorySearch] = useState("");
  const [historySortConfig, setHistorySortConfig] = useState<SortConfig<SmsCampaign>>({ key: null, direction: null });
  const [historyFilterConfig, setHistoryFilterConfig] = useState<FilterConfig>({});
  const [historyPagination, setHistoryPagination] = useState<PaginationConfig>({ page: 1, pageSize: 10, total: 0 });

  const phoneContacts = contacts.filter((c) => c.phone);

  // Columns for campaign history
  const historyColumns: Column<SmsCampaign>[] = [
    { key: "template", label: "Template", sortable: true, filterable: true, filterType: "text" },
    { key: "createdAt", label: "Created", sortable: true },
    { key: "status", label: "Status", sortable: true },
  ];

  // Apply filtering, search, and sorting to campaigns
  const filteredAndSortedCampaigns = useMemo(() => {
    let result = [...campaigns];

    // Apply search
    if (historySearch) {
      result = result.filter(
        (c) =>
          c.template.toLowerCase().includes(historySearch.toLowerCase())
      );
    }

    // Apply filters
    Object.entries(historyFilterConfig).forEach(([key, value]) => {
      if (value) {
        result = result.filter((c) => {
          const campaignValue = String(c[key as keyof SmsCampaign]).toLowerCase();
          return campaignValue.includes(String(value).toLowerCase());
        });
      }
    });

    // Apply sorting
    if (historySortConfig.key && historySortConfig.direction) {
      result.sort((a, b) => {
        const aVal = a[historySortConfig.key!];
        const bVal = b[historySortConfig.key!];
        
        if (typeof aVal === "number" && typeof bVal === "number") {
          return historySortConfig.direction === "asc" ? aVal - bVal : bVal - aVal;
        }
        
        const aStr = String(aVal || "").toLowerCase();
        const bStr = String(bVal || "").toLowerCase();
        
        if (historySortConfig.direction === "asc") {
          return aStr.localeCompare(bStr);
        } else {
          return bStr.localeCompare(aStr);
        }
      });
    }

    return result;
  }, [campaigns, historySearch, historyFilterConfig, historySortConfig]);

  // Apply pagination
  const paginatedCampaigns = useMemo(() => {
    const start = (historyPagination.page - 1) * historyPagination.pageSize;
    const end = start + historyPagination.pageSize;
    return filteredAndSortedCampaigns.slice(start, end);
  }, [filteredAndSortedCampaigns, historyPagination.page, historyPagination.pageSize]);

  // Update pagination total
  React.useEffect(() => {
    setHistoryPagination((prev) => ({ ...prev, total: filteredAndSortedCampaigns.length }));
  }, [filteredAndSortedCampaigns.length]);

  // Reset page when filters change
  React.useEffect(() => {
    setHistoryPagination((prev) => ({ ...prev, page: 1 }));
  }, [historySearch, historyFilterConfig, historySortConfig]);

  // Check SMS Gateway on mount
  useEffect(() => {
    checkGateway();
  }, []);

  // Set first contact as preview
  useEffect(() => {
    if (phoneContacts.length > 0 && !previewContact) {
      setPreviewContact(phoneContacts[0]);
    }
  }, [contacts]);

  const checkGateway = async () => {
    setCheckingGateway(true);
    try {
      const status = await getSmsGatewayStatus();
      setGatewayStatus(status);
    } catch {
      setGatewayStatus({ connected: false, device: null, message: "Could not reach backend. Is server running?" });
    } finally {
      setCheckingGateway(false);
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
    if (selectedIds.size === filteredSmsContacts.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filteredSmsContacts.map((c) => c.id)));
  };

  const toggle = (id: string) => {
    const s = new Set(selectedIds);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelectedIds(s);
  };

  const smsContacts = contacts.filter((c) => c.phone && c.phone.trim());
  
  // Filter contacts based on search query
  const filteredSmsContacts = smsContacts.filter((c) => {
    const searchLower = contactSearch.toLowerCase();
    return (
      c.name.toLowerCase().includes(searchLower) ||
      c.phone.toLowerCase().includes(searchLower)
    );
  });

  const validate = () => {
    const e: Record<string, string> = {};
    if (!template.trim()) e.template = "Message template is required";
    if (template.length > 160) e.template = `Message too long (${template.length}/160 chars for single SMS)`;
    if (selectedIds.size === 0) e.contacts = "Select at least one contact";
    if (!gatewayStatus?.connected) e.gateway = "SMS Gateway not connected";
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
      const errorData = err?.response?.data;
      if (errorData?.code && ["SUBSCRIPTION_EXPIRED", "SUBSCRIPTION_INACTIVE", "USAGE_LIMIT_EXCEEDED", "NO_SUBSCRIPTION", "PRODUCT_DISABLED"].includes(errorData.code)) {
        setRenewalError(errorData.error || "Subscription validation failed");
        setRenewalCode(errorData.code);
        setShowRenewalPopup(true);
      } else {
        toast.error(errorData?.error || "SMS send failed");
      }
    } finally {
      setSending(false);
    }
  };


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
        border: `1px solid ${gatewayStatus?.connected ? "var(--accent-wa-border)" : "#fecaca"}`,
        background: gatewayStatus?.connected ? "var(--accent-wa-light)" : "#fef2f2",
        marginBottom: 20,
        flexWrap: "wrap",
      }}>
        {gatewayStatus?.connected
          ? <CheckCircle size={18} color="var(--accent-wa)" />
          : <AlertCircle size={18} color="var(--accent-danger)" />
        }
        <div style={{ flex: 1 }}>
          <span style={{
            fontWeight: 700,
            fontSize: "0.875rem",
            color: gatewayStatus?.connected ? "var(--accent-wa)" : "var(--accent-danger)",
          }}>
            {gatewayStatus?.connected ? `Phone Connected: ${gatewayStatus.device}` : "Phone Not Connected"}
          </span>
          <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: 2 }}>
            {gatewayStatus?.message || "Checking…"}
          </div>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={checkGateway} disabled={checkingGateway}>
          <RefreshCw size={13} className={checkingGateway ? "spin" : ""} />
          {checkingGateway ? "Checking…" : "Re-check"}
        </button>
      </div>

      {/* Setup Guide (show when not connected) */}
      {!gatewayStatus?.connected && (
        <div className="card" style={{ marginBottom: 20, borderColor: "#fecaca" }}>
          <div className="card-header" style={{ background: "#fff5f5" }}>
            <h3>📋 Setup Guide — How to Connect SMS Gateway</h3>
          </div>
          <div className="card-body">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
              {[
                { step: "1", title: "Install SMS Gateway App", desc: "Install SMSForwarder or similar HTTP SMS gateway app on your Android phone" },
                { step: "2", title: "Configure Gateway", desc: "Open the app and enable HTTP API server. Note the port (default: 8080)" },
                { step: "3", title: "Set API URL", desc: "Configure SMS_GATEWAY_URL in backend .env file (default: http://localhost:8080)" },
                { step: "4", title: "Test Connection", desc: "Click 'Re-check' button to verify the gateway is accessible" },
                { step: "5", title: "Optional API Key", desc: "If your gateway requires authentication, set SMS_GATEWAY_API_KEY in .env" },
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
                {errors.gateway && <span className="form-error">⚠ {errors.gateway}</span>}

                <button
                  className="btn btn-lg w-full"
                  style={{
                    background: gatewayStatus?.connected ? "#7c3aed" : "var(--border)",
                    color: gatewayStatus?.connected ? "white" : "var(--text-muted)",
                    borderColor: gatewayStatus?.connected ? "#7c3aed" : "var(--border)",
                    cursor: gatewayStatus?.connected ? "pointer" : "not-allowed",
                  }}
                  onClick={handleSend}
                  disabled={sending || !gatewayStatus?.connected}
                >
                  {sending ? <span className="spinner" /> : <Send size={16} />}
                  {sending
                    ? `Sending… (this may take a while)`
                    : gatewayStatus?.connected
                    ? `Send to ${selectedIds.size} Contact${selectedIds.size !== 1 ? "s" : ""} via ${gatewayStatus.device}`
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
              {smsContacts.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">📵</div>
                  <h3>No phone contacts</h3>
                  <p>Add phone numbers to contacts first</p>
                </div>
              ) : (
                <>
                  <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--border-light)" }}>
                    <input
                      type="text"
                      placeholder="Search contacts..."
                      className="form-input"
                      style={{ fontSize: "0.85rem", padding: "8px 12px" }}
                      value={contactSearch}
                      onChange={(e) => setContactSearch(e.target.value)}
                    />
                  </div>
                  <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--border-light)", display: "flex", gap: 8, alignItems: "center" }}>
                    <input
                      type="checkbox"
                      style={{ accentColor: "#7c3aed" }}
                      checked={selectedIds.size === filteredSmsContacts.length}
                      onChange={toggleAll}
                    />
                    <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 600 }}>
                      Select All ({filteredSmsContacts.length})
                    </span>
                  </div>
                  <div style={{ maxHeight: 420, overflowY: "auto", padding: "4px 16px" }}>
                    {filteredSmsContacts.map((c) => (
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
                    {filteredSmsContacts.length === 0 && contactSearch && (
                      <div style={{ padding: "20px", textAlign: "center", color: "var(--text-muted)" }}>
                        No contacts found matching "{contactSearch}"
                      </div>
                    )}
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
          {paginatedCampaigns.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📱</div>
              <h3>No SMS campaigns yet</h3>
              <p>Compose and send your first SMS campaign</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <TableControls
                columns={historyColumns}
                sortConfig={historySortConfig}
                onSort={(key) => setHistorySortConfig({
                  key,
                  direction: historySortConfig.key === key && historySortConfig.direction === "asc" ? "desc" : "asc",
                })}
                filterConfig={historyFilterConfig}
                onFilterChange={(key, value) => setHistoryFilterConfig({ ...historyFilterConfig, [key]: value })}
                searchQuery={historySearch}
                onSearchChange={setHistorySearch}
                pagination={historyPagination}
                onPageChange={(page) => setHistoryPagination({ ...historyPagination, page })}
                onPageSizeChange={(pageSize) => setHistoryPagination({ ...historyPagination, pageSize, page: 1 })}
              />
              {paginatedCampaigns.map((camp) => {
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
      
      <RenewalPopup
        isOpen={showRenewalPopup}
        onClose={() => setShowRenewalPopup(false)}
        error={renewalError}
        code={renewalCode}
        onRenew={() => {
          setShowRenewalPopup(false);
          toast.success("Redirecting to subscription page...");
        }}
      />
    </div>
  );
}
