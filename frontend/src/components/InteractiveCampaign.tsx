import React, { useState, useEffect, useMemo } from "react";
import { Send, Users, Building2, Search, CheckCircle, Info, LayoutDashboard } from "lucide-react";
import toast from "react-hot-toast";
import { Contact, Site, WhatsAppTemplate } from "../types";
import { getWhatsAppTemplates, getSites, sendInteractiveCampaign } from "../utils/api";

interface Props {
  contacts: Contact[];
  onRefresh: () => void;
}

export default function InteractiveCampaign({ contacts, onRefresh }: Props) {
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [selectedSiteId, setSelectedSiteId] = useState<string>("all");
  const [contactSearch, setContactSearch] = useState("");
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [t, s] = await Promise.all([getWhatsAppTemplates(), getSites()]);
        setTemplates(t);
        setSites(s);
        if (t.length > 0) setSelectedTemplateId(t[0].id);
      } catch (error) {
        toast.error("Failed to load data");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const selectedTemplate = useMemo(() => 
    templates.find(t => t.id === selectedTemplateId), 
  [templates, selectedTemplateId]);

  const waContacts = contacts.filter((c) => c.phone);

  const filteredContacts = useMemo(() => {
    let result = waContacts;
    if (selectedSiteId !== "all") {
      result = result.filter(c => c.siteId === selectedSiteId);
    }
    if (contactSearch) {
      const s = contactSearch.toLowerCase();
      result = result.filter(c => c.name.toLowerCase().includes(s) || c.phone.includes(s));
    }
    return result;
  }, [waContacts, selectedSiteId, contactSearch]);

  const toggleSelectAll = () => {
    if (selectedContactIds.size === filteredContacts.length) {
      setSelectedContactIds(new Set());
    } else {
      setSelectedContactIds(new Set(filteredContacts.map(c => c.id)));
    }
  };

  const toggleContact = (id: string) => {
    const next = new Set(selectedContactIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedContactIds(next);
  };

  const handleSend = async () => {
    if (!selectedTemplateId) {
      toast.error("Please select a template");
      return;
    }
    if (selectedContactIds.size === 0) {
      toast.error("Please select at least one contact");
      return;
    }

    try {
      setSending(true);
      await sendInteractiveCampaign({
        templateId: selectedTemplateId,
        contactIds: Array.from(selectedContactIds),
        siteId: selectedSiteId
      });
      toast.success("Campaign started successfully");
      setSelectedContactIds(new Set());
      onRefresh();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to start campaign");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="card" style={{ width: "100%" }}>
      <div className="card-header">
        <h3>Interactive Campaign</h3>
      </div>

      <div className="card-body">
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
            <span className="spinner spinner-dark" style={{ width: 32, height: 32 }}></span>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20 }}>
            {/* Left: Contact Selection */}
            <div>
              <div className="card-header" style={{ marginBottom: 16 }}>
                <h4>Select Contacts</h4>
              </div>

              <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
                <div style={{ flex: 1, position: "relative" }}>
                  <Search size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Search contacts..."
                    value={contactSearch}
                    onChange={(e) => setContactSearch(e.target.value)}
                    style={{ paddingLeft: 36 }}
                  />
                </div>
                <select
                  className="form-input"
                  value={selectedSiteId}
                  onChange={(e) => setSelectedSiteId(e.target.value)}
                  style={{ width: 200 }}
                >
                  <option value="all">All Sites</option>
                  {sites.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ border: "1px solid var(--border-light)", borderRadius: 8, overflow: "hidden" }}>
                <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border-light)", backgroundColor: "var(--bg-hover)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={filteredContacts.length > 0 && selectedContactIds.size === filteredContacts.length}
                      onChange={toggleSelectAll}
                    />
                    <span style={{ fontSize: "0.85rem" }}>Select All ({filteredContacts.length})</span>
                  </label>
                  <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>{selectedContactIds.size} selected</span>
                </div>

                <div style={{ maxHeight: 400, overflowY: "auto" }}>
                  {filteredContacts.map(c => (
                    <div
                      key={c.id}
                      style={{
                        padding: "12px 16px",
                        borderBottom: "1px solid var(--border-light)",
                        backgroundColor: selectedContactIds.has(c.id) ? "var(--bg-hover)" : "transparent",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 12
                      }}
                      onClick={() => toggleContact(c.id)}
                    >
                      <input
                        type="checkbox"
                        checked={selectedContactIds.has(c.id)}
                        onChange={() => toggleContact(c.id)}
                        onClick={e => e.stopPropagation()}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 500, fontSize: "0.85rem" }}>{c.name}</div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{c.phone}</div>
                      </div>
                    </div>
                  ))}
                  {filteredContacts.length === 0 && (
                    <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>
                      No contacts found
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Template Selection */}
            <div>
              <div className="card-header" style={{ marginBottom: 16 }}>
                <h4>Select Template</h4>
              </div>

              <div className="form-group" style={{ marginBottom: 16 }}>
                <label>Template</label>
                <select
                  className="form-input"
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                >
                  <option value="" disabled>Select a template</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.type})</option>
                  ))}
                </select>
              </div>

              {selectedTemplate && (
                <div style={{ padding: 16, border: "1px solid var(--border-light)", borderRadius: 8, backgroundColor: "var(--bg-hover)", marginBottom: 16 }}>
                  <div style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: 8 }}>{selectedTemplate.name}</div>
                  <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: 8 }}>{selectedTemplate.type}</div>
                  {selectedTemplate.header && (
                    <div style={{ fontSize: "0.85rem", marginBottom: 8, fontWeight: 500 }}>{selectedTemplate.header}</div>
                  )}
                  <div style={{ fontSize: "0.85rem", marginBottom: 8 }}>{selectedTemplate.body}</div>
                  {selectedTemplate.footer && (
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{selectedTemplate.footer}</div>
                  )}
                  {selectedTemplate.pollOptions && selectedTemplate.pollOptions.length > 0 && (
                    <div style={{ marginTop: 8, fontSize: "0.8rem" }}>
                      <div style={{ fontWeight: 500, marginBottom: 4 }}>Options:</div>
                      {selectedTemplate.pollOptions.map((opt, i) => (
                        <div key={i} style={{ padding: "4px 8px", backgroundColor: "var(--bg-card)", borderRadius: 4, marginBottom: 4 }}>
                          {i + 1}. {opt.text}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {!selectedTemplate && (
                <div style={{ padding: 40, textAlign: "center", border: "1px dashed var(--border-light)", borderRadius: 8, color: "var(--text-muted)" }}>
                  <Info size={32} style={{ marginBottom: 8 }} />
                  <p>Select a template to preview</p>
                </div>
              )}

              <button
                className="btn btn-primary btn-block"
                onClick={handleSend}
                disabled={sending || !selectedTemplateId || selectedContactIds.size === 0}
                style={{ marginTop: 16 }}
              >
                {sending ? (
                  <>Sending...</>
                ) : (
                  <>
                    <Send size={16} style={{ marginRight: 8 }} />
                    Start Campaign
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
