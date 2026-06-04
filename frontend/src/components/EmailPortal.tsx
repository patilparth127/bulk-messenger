import React, { useState, useMemo } from "react";
import { Send, CheckCircle, XCircle, Clock, ChevronDown, ChevronUp, Settings } from "lucide-react";
import toast from "react-hot-toast";
import { Contact, EmailCampaign, SendStatus } from "../types";
import { sendEmailCampaign } from "../utils/api";
import { formatDate } from "../utils/helpers";
import TableControls, { Column, SortConfig, FilterConfig, PaginationConfig } from "./TableControls";

interface Props {
  contacts: Contact[];
  campaigns: EmailCampaign[];
  onRefresh: () => void;
}

export default function EmailPortal({ contacts, campaigns, onRefresh }: Props) {
  const [activeTab, setActiveTab] = useState<"compose" | "history">("compose");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedCamp, setExpandedCamp] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [showSmtp, setShowSmtp] = useState(false);
  
  // Table controls for campaign history
  const [historySearch, setHistorySearch] = useState("");
  const [historySortConfig, setHistorySortConfig] = useState<SortConfig<EmailCampaign>>({ key: null, direction: null });
  const [historyFilterConfig, setHistoryFilterConfig] = useState<FilterConfig>({});
  const [historyPagination, setHistoryPagination] = useState<PaginationConfig>({ page: 1, pageSize: 10, total: 0 });

  const [form, setForm] = useState({
    subject: "",
    body: "",
    fromEmail: "",
    fromPassword: "",
    smtpHost: "smtp.gmail.com",
    smtpPort: 587,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Columns for campaign history
  const historyColumns: Column<EmailCampaign>[] = [
    { key: "subject", label: "Subject", sortable: true, filterable: true, filterType: "text" },
    { key: "fromEmail", label: "From", sortable: true, filterable: true, filterType: "text" },
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
          c.subject.toLowerCase().includes(historySearch.toLowerCase()) ||
          c.fromEmail.toLowerCase().includes(historySearch.toLowerCase())
      );
    }

    // Apply filters
    Object.entries(historyFilterConfig).forEach(([key, value]) => {
      if (value) {
        result = result.filter((c) => {
          const campaignValue = String(c[key as keyof EmailCampaign]).toLowerCase();
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

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.subject.trim()) e.subject = "Subject is required";
    if (!form.body.trim()) e.body = "Message body is required";
    if (!form.fromEmail.trim()) e.fromEmail = "Sender email is required";
    if (!form.fromPassword.trim()) e.fromPassword = "Password / App password is required";
    if (selectedIds.size === 0) e.contacts = "Select at least one contact";
    return e;
  };

  const toggleAll = () => {
    if (selectedIds.size === contacts.filter((c) => c.email).length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(contacts.filter((c) => c.email).map((c) => c.id)));
    }
  };

  const toggle = (id: string) => {
    const s = new Set(selectedIds);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelectedIds(s);
  };

  const handleSend = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSending(true);
    const tid = toast.loading(`Sending to ${selectedIds.size} contacts…`);
    try {
      const result = await sendEmailCampaign({
        ...form,
        contactIds: Array.from(selectedIds),
      });
      toast.dismiss(tid);
      toast.success(`✅ Sent: ${result.sentCount}  ❌ Failed: ${result.failedCount}`);
      setForm({ subject: "", body: "", fromEmail: "", fromPassword: "", smtpHost: "smtp.gmail.com", smtpPort: 587 });
      setSelectedIds(new Set());
      setErrors({});
      onRefresh();
      setActiveTab("history");
    } catch (err: any) {
      toast.dismiss(tid);
      toast.error(err?.response?.data?.error || "Send failed");
    } finally {
      setSending(false);
    }
  };

  const emailContacts = contacts.filter((c) => c.email);

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>📧 Email Portal</h2>
          <p>Send bulk emails to your contacts</p>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-row" style={{ marginBottom: 20 }}>
        <div className="stat-card">
          <span className="stat-label">Campaigns</span>
          <span className="stat-value" style={{ color: "var(--accent-email)" }}>{campaigns.length}</span>
          <span className="stat-sub">Total sent</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Emails Sent</span>
          <span className="stat-value">{campaigns.reduce((a, c) => a + c.sentCount, 0)}</span>
          <span className="stat-sub">Successfully</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Failed</span>
          <span className="stat-value" style={{ color: "var(--accent-danger)" }}>
            {campaigns.reduce((a, c) => a + c.failedCount, 0)}
          </span>
          <span className="stat-sub">Delivery failed</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Recipients</span>
          <span className="stat-value">{emailContacts.length}</span>
          <span className="stat-sub">Available contacts</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab ${activeTab === "compose" ? "active-email" : ""}`} onClick={() => setActiveTab("compose")}>
          Compose Email
        </button>
        <button className={`tab ${activeTab === "history" ? "active-email" : ""}`} onClick={() => setActiveTab("history")}>
          Campaign History {campaigns.length > 0 && `(${campaigns.length})`}
        </button>
      </div>

      {activeTab === "compose" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20 }}>
          {/* Left: compose */}
          <div>
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="portal-band portal-band-email" />
              <div className="card-header">
                <h3>Compose Message</h3>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setShowSmtp(!showSmtp)}
                  style={{ gap: 4 }}
                >
                  <Settings size={13} /> SMTP Settings
                  {showSmtp ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </button>
              </div>
              <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {showSmtp && (
                  <>
                    <div className="form-grid">
                      <div className="form-group">
                        <label className="form-label">Sender Email <span className="req">*</span></label>
                        <input className="form-input" type="email" placeholder="you@gmail.com"
                          value={form.fromEmail} onChange={(e) => setForm({ ...form, fromEmail: e.target.value })} />
                        {errors.fromEmail && <span className="form-error">{errors.fromEmail}</span>}
                      </div>
                      <div className="form-group">
                        <label className="form-label">App Password <span className="req">*</span></label>
                        <input className="form-input" type="password" placeholder="App-specific password"
                          value={form.fromPassword} onChange={(e) => setForm({ ...form, fromPassword: e.target.value })} />
                        {errors.fromPassword && <span className="form-error">{errors.fromPassword}</span>}
                      </div>
                      <div className="form-group">
                        <label className="form-label">SMTP Host</label>
                        <input className="form-input" placeholder="smtp.gmail.com"
                          value={form.smtpHost} onChange={(e) => setForm({ ...form, smtpHost: e.target.value })} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">SMTP Port</label>
                        <input className="form-input" type="number" placeholder="587"
                          value={form.smtpPort} onChange={(e) => setForm({ ...form, smtpPort: Number(e.target.value) })} />
                      </div>
                    </div>
                    <div className="divider" />
                  </>
                )}
                {!showSmtp && (
                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label">Sender Email <span className="req">*</span></label>
                      <input className="form-input" type="email" placeholder="you@gmail.com"
                        value={form.fromEmail} onChange={(e) => setForm({ ...form, fromEmail: e.target.value })} />
                      {errors.fromEmail && <span className="form-error">{errors.fromEmail}</span>}
                    </div>
                    <div className="form-group">
                      <label className="form-label">App Password <span className="req">*</span></label>
                      <input className="form-input" type="password" placeholder="App-specific password"
                        value={form.fromPassword} onChange={(e) => setForm({ ...form, fromPassword: e.target.value })} />
                      {errors.fromPassword && <span className="form-error">{errors.fromPassword}</span>}
                    </div>
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label">Subject <span className="req">*</span></label>
                  <input className="form-input" placeholder="Email subject line"
                    value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
                  {errors.subject && <span className="form-error">{errors.subject}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">
                    Message Body <span className="req">*</span>
                    <span className="text-muted" style={{ fontWeight: 400, marginLeft: 8 }}>
                      Use <code style={{ background: "var(--bg)", padding: "1px 4px", borderRadius: 3 }}>{"{name}"}</code> for personalization
                    </span>
                  </label>
                  <textarea
                    className="form-textarea"
                    style={{ minHeight: 160 }}
                    placeholder="Dear {name},&#10;&#10;Your message here…"
                    value={form.body}
                    onChange={(e) => setForm({ ...form, body: e.target.value })}
                  />
                  {errors.body && <span className="form-error">{errors.body}</span>}
                </div>
                {errors.contacts && <span className="form-error">⚠ {errors.contacts}</span>}
                <button className="btn btn-primary-email btn-lg w-full" onClick={handleSend} disabled={sending}>
                  {sending ? <span className="spinner" /> : <Send size={16} />}
                  {sending ? "Sending…" : `Send to ${selectedIds.size} Contact${selectedIds.size !== 1 ? "s" : ""}`}
                </button>
              </div>
            </div>
          </div>

          {/* Right: contact picker */}
          <div className="card" style={{ height: "fit-content" }}>
            <div className="portal-band portal-band-email" />
            <div className="card-header">
              <h3>Select Recipients</h3>
              <span style={{ fontSize: "0.75rem", color: "var(--accent-email)", fontWeight: 600 }}>
                {selectedIds.size} selected
              </span>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              {emailContacts.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">📭</div>
                  <h3>No contacts</h3>
                  <p>Add contacts first</p>
                </div>
              ) : (
                <>
                  <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--border-light)", display: "flex", gap: 8, alignItems: "center" }}>
                    <input type="checkbox" checked={selectedIds.size === emailContacts.length} onChange={toggleAll} />
                    <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 600 }}>
                      Select All ({emailContacts.length})
                    </span>
                  </div>
                  <div style={{ maxHeight: 360, overflowY: "auto", padding: "4px 16px" }}>
                    {emailContacts.map((c) => (
                      <div key={c.id} className="checkbox-row">
                        <input type="checkbox" checked={selectedIds.has(c.id)} onChange={() => toggle(c.id)} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>{c.name}</div>
                          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{c.email}</div>
                        </div>
                        {c.emailSentCount > 0 && (
                          <span style={{ fontSize: "0.7rem", color: "var(--accent-email)", fontWeight: 700 }}>
                            ×{c.emailSentCount}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "history" && (
        <div>
          {paginatedCampaigns.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📬</div>
              <h3>No campaigns yet</h3>
              <p>Compose and send your first email campaign</p>
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
                    <div
                      className="card-header"
                      style={{ cursor: "pointer" }}
                      onClick={() => setExpandedCamp(isOpen ? null : camp.id)}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: "0.95rem", marginBottom: 4 }}>{camp.subject}</div>
                        <div style={{ display: "flex", gap: 16, fontSize: "0.78rem", color: "var(--text-muted)", flexWrap: "wrap" }}>
                          <span>From: {camp.fromEmail}</span>
                          <span>Sent: {formatDate(camp.createdAt)}</span>
                          {camp.completedAt && <span>Completed: {formatDate(camp.completedAt)}</span>}
                        </div>
                        <div style={{ marginTop: 8, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                          <span style={{ color: "var(--accent-wa)", fontWeight: 700, fontSize: "0.85rem" }}>
                            ✅ {camp.sentCount} sent
                          </span>
                          <span style={{ color: "var(--accent-danger)", fontWeight: 700, fontSize: "0.85rem" }}>
                            ❌ {camp.failedCount} failed
                          </span>
                          <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
                            / {camp.totalTargets} total
                          </span>
                          <div style={{ flex: 1, minWidth: 100 }}>
                            <div className="progress-bar-wrap">
                              <div className="progress-bar" style={{ width: `${pct}%`, background: "var(--accent-email)" }} />
                            </div>
                          </div>
                          <span style={{ fontSize: "0.78rem", color: "var(--accent-email)", fontWeight: 600 }}>{pct}%</span>
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
                              <th>Email</th>
                              <th>Status</th>
                              <th>Sent At</th>
                              <th>Error</th>
                            </tr>
                          </thead>
                          <tbody>
                            {camp.logs.map((log) => (
                              <tr key={log.id}>
                                <td>{log.contactName}</td>
                                <td className="font-mono">{log.contactEmail}</td>
                                <td>
                                  <span className={`badge badge-${log.status}`}>
                                    {log.status === SendStatus.SENT ? "✓" : log.status === SendStatus.FAILED ? "✗" : "…"} {log.status}
                                  </span>
                                </td>
                                <td className="text-sm text-muted">{formatDate(log.sentAt)}</td>
                                <td className="text-sm" style={{ color: "var(--accent-danger)", maxWidth: 200, wordBreak: "break-word" }}>
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
