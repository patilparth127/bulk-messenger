import React, { useState, useMemo } from "react";
import { Send, ChevronDown, ChevronUp, MessageCircle } from "lucide-react";
import toast from "react-hot-toast";
import { Contact, WhatsAppCampaign, SendStatus } from "../types";
import { sendWhatsAppCampaign } from "../utils/api";
import { formatDate, formatPhone } from "../utils/helpers";
import TableControls, { Column, SortConfig, FilterConfig, PaginationConfig } from "./TableControls";

interface Props {
  contacts: Contact[];
  campaigns: WhatsAppCampaign[];
  onRefresh: () => void;
}

export default function WhatsAppPortal({ contacts, campaigns, onRefresh }: Props) {
  const [activeTab, setActiveTab] = useState<"compose" | "history">("compose");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedCamp, setExpandedCamp] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [msgError, setMsgError] = useState("");
  const [contactError, setContactError] = useState("");
  
  // Table controls for campaign history
  const [historySearch, setHistorySearch] = useState("");
  const [historySortConfig, setHistorySortConfig] = useState<SortConfig<WhatsAppCampaign>>({ key: null, direction: null });
  const [historyFilterConfig, setHistoryFilterConfig] = useState<FilterConfig>({});
  const [historyPagination, setHistoryPagination] = useState<PaginationConfig>({ page: 1, pageSize: 10, total: 0 });

  const waContacts = contacts.filter((c) => c.phone);

  // Columns for campaign history
  const historyColumns: Column<WhatsAppCampaign>[] = [
    { key: "message", label: "Message", sortable: true, filterable: true, filterType: "text" },
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
          c.message.toLowerCase().includes(historySearch.toLowerCase())
      );
    }

    // Apply filters
    Object.entries(historyFilterConfig).forEach(([key, value]) => {
      if (value) {
        result = result.filter((c) => {
          const campaignValue = String(c[key as keyof WhatsAppCampaign]).toLowerCase();
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

  const toggleAll = () => {
    if (selectedIds.size === waContacts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(waContacts.map((c) => c.id)));
    }
  };

  const toggle = (id: string) => {
    const s = new Set(selectedIds);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelectedIds(s);
  };

  const handleSend = async () => {
    let valid = true;
    if (!message.trim()) { setMsgError("Message is required"); valid = false; }
    else setMsgError("");
    if (selectedIds.size === 0) { setContactError("Select at least one contact"); valid = false; }
    else setContactError("");
    if (!valid) return;

    setSending(true);
    const tid = toast.loading(`Sending WhatsApp to ${selectedIds.size} contacts…`);
    try {
      const result = await sendWhatsAppCampaign({
        message,
        contactIds: Array.from(selectedIds),
      });
      toast.dismiss(tid);
      toast.success(`✅ Sent: ${result.sentCount}  ❌ Failed: ${result.failedCount}`);
      setMessage("");
      setSelectedIds(new Set());
      onRefresh();
      setActiveTab("history");
    } catch (err: any) {
      toast.dismiss(tid);
      toast.error(err?.response?.data?.error || "Send failed");
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>💬 WhatsApp Portal</h2>
          <p>Send bulk WhatsApp messages to your contacts</p>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-row" style={{ marginBottom: 20 }}>
        <div className="stat-card">
          <span className="stat-label">Campaigns</span>
          <span className="stat-value" style={{ color: "var(--accent-wa)" }}>{campaigns.length}</span>
          <span className="stat-sub">Total sent</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Messages Sent</span>
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
          <span className="stat-value">{waContacts.length}</span>
          <span className="stat-sub">Have phone numbers</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab ${activeTab === "compose" ? "active-wa" : ""}`} onClick={() => setActiveTab("compose")}>
          Compose Message
        </button>
        <button className={`tab ${activeTab === "history" ? "active-wa" : ""}`} onClick={() => setActiveTab("history")}>
          Campaign History {campaigns.length > 0 && `(${campaigns.length})`}
        </button>
      </div>

      {activeTab === "compose" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20 }}>
          {/* Left: compose */}
          <div className="card">
            <div className="portal-band portal-band-wa" />
            <div className="card-header">
              <h3>Compose WhatsApp Message</h3>
            </div>
            <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{
                background: "var(--accent-wa-light)",
                border: "1px solid var(--accent-wa-border)",
                borderRadius: "var(--radius)",
                padding: "12px 16px",
                fontSize: "0.82rem",
                color: "#166534",
                display: "flex",
                gap: 8,
                alignItems: "flex-start",
              }}>
                <MessageCircle size={16} style={{ marginTop: 1, flexShrink: 0 }} />
                <div>
                  <strong>Personalization tip:</strong> Use <code style={{ background: "#bbf7d0", padding: "1px 4px", borderRadius: 3 }}>{"{name}"}</code> in your message to include the recipient's name automatically.
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Message <span className="req">*</span>
                  <span style={{ marginLeft: 8, fontWeight: 400, color: "var(--text-muted)" }}>
                    {message.length} / 1600 chars
                  </span>
                </label>
                <textarea
                  className="form-textarea wa-focus"
                  style={{ minHeight: 200 }}
                  placeholder="Hello {name},&#10;&#10;Your message here…"
                  maxLength={1600}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
                {msgError && <span className="form-error">{msgError}</span>}
              </div>

              {/* Preview */}
              {message && (
                <div>
                  <label className="form-label">Preview</label>
                  <div style={{
                    background: "#dcfce7",
                    border: "1px solid #bbf7d0",
                    borderRadius: "var(--radius)",
                    padding: "12px 16px",
                    fontSize: "0.875rem",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    lineHeight: 1.6,
                    fontFamily: "system-ui",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                  }}>
                    {message.replace(/\{name\}/gi, "John Doe")}
                  </div>
                  <span className="text-sm text-muted" style={{ marginTop: 4, display: "block" }}>
                    Preview with sample name "John Doe"
                  </span>
                </div>
              )}

              {contactError && <span className="form-error">⚠ {contactError}</span>}

              <button
                className="btn btn-primary-wa btn-lg w-full"
                onClick={handleSend}
                disabled={sending}
              >
                {sending ? <span className="spinner" /> : <Send size={16} />}
                {sending ? "Sending…" : `Send to ${selectedIds.size} Contact${selectedIds.size !== 1 ? "s" : ""}`}
              </button>
            </div>
          </div>

          {/* Right: contact picker */}
          <div className="card" style={{ height: "fit-content" }}>
            <div className="portal-band portal-band-wa" />
            <div className="card-header">
              <h3>Select Recipients</h3>
              <span style={{ fontSize: "0.75rem", color: "var(--accent-wa)", fontWeight: 600 }}>
                {selectedIds.size} selected
              </span>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              {waContacts.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">📵</div>
                  <h3>No contacts with phone</h3>
                  <p>Add phone numbers to your contacts</p>
                </div>
              ) : (
                <>
                  <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--border-light)", display: "flex", gap: 8, alignItems: "center" }}>
                    <input type="checkbox" className="wa" checked={selectedIds.size === waContacts.length} onChange={toggleAll} />
                    <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 600 }}>
                      Select All ({waContacts.length})
                    </span>
                  </div>
                  <div style={{ maxHeight: 420, overflowY: "auto", padding: "4px 16px" }}>
                    {waContacts.map((c) => (
                      <div key={c.id} className="checkbox-row">
                        <input type="checkbox" className="wa" checked={selectedIds.has(c.id)} onChange={() => toggle(c.id)} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>{c.name}</div>
                          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                            {formatPhone(c.phone)}
                          </div>
                        </div>
                        {c.whatsappSentCount > 0 && (
                          <span style={{ fontSize: "0.7rem", color: "var(--accent-wa)", fontWeight: 700 }}>
                            ×{c.whatsappSentCount}
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
              <div className="empty-icon">💬</div>
              <h3>No campaigns yet</h3>
              <p>Compose and send your first WhatsApp campaign</p>
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
                        <div style={{ fontWeight: 700, fontSize: "0.88rem", marginBottom: 4, whiteSpace: "pre-wrap", maxHeight: 40, overflow: "hidden" }}>
                          {camp.message.slice(0, 100)}{camp.message.length > 100 ? "…" : ""}
                        </div>
                        <div style={{ display: "flex", gap: 16, fontSize: "0.78rem", color: "var(--text-muted)", flexWrap: "wrap" }}>
                          <span>Sent: {formatDate(camp.createdAt)}</span>
                          {camp.completedAt && <span>Completed: {formatDate(camp.completedAt)}</span>}
                        </div>
                        <div style={{ marginTop: 8, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                          <span style={{ color: "var(--accent-wa)", fontWeight: 700, fontSize: "0.85rem" }}>✅ {camp.sentCount} sent</span>
                          <span style={{ color: "var(--accent-danger)", fontWeight: 700, fontSize: "0.85rem" }}>❌ {camp.failedCount} failed</span>
                          <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>/ {camp.totalTargets} total</span>
                          <div style={{ flex: 1, minWidth: 100 }}>
                            <div className="progress-bar-wrap">
                              <div className="progress-bar" style={{ width: `${pct}%`, background: "var(--accent-wa)" }} />
                            </div>
                          </div>
                          <span style={{ fontSize: "0.78rem", color: "var(--accent-wa)", fontWeight: 600 }}>{pct}%</span>
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
                              <th>Status</th>
                              <th>Sent At</th>
                              <th>Error</th>
                            </tr>
                          </thead>
                          <tbody>
                            {camp.logs.map((log) => (
                              <tr key={log.id}>
                                <td>{log.contactName}</td>
                                <td className="font-mono">{formatPhone(log.contactPhone)}</td>
                                <td>
                                  <span className={`badge badge-${log.status}`}>
                                    {log.status === SendStatus.SENT ? "✓" : log.status === SendStatus.FAILED ? "✗" : "…"} {log.status}
                                  </span>
                                </td>
                                <td className="text-sm text-muted">{formatDate(log.sentAt)}</td>
                                <td className="text-sm" style={{ color: "var(--accent-danger)", maxWidth: 200 }}>
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
