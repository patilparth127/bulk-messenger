import React, { useState, useEffect } from "react";
import { Plus, Trash2, Save, Layout, List as ListIcon, Link as LinkIcon, MessageSquare, BarChart3, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";
import { WhatsAppTemplate, TemplateType, PollOption, ListSection, CTA, QuickReplyButton } from "../types";
import { getWhatsAppTemplates, createWhatsAppTemplate, updateWhatsAppTemplate, deleteWhatsAppTemplate } from "../utils/api";
import InteractivePreview from "./InteractivePreview";

export default function WhatsAppTemplateBuilder() {
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<WhatsAppTemplate>>({
    name: "",
    type: "poll",
    header: "",
    body: "",
    footer: "",
    pollOptions: [{ id: "1", text: "" }],
    buttonText: "View Options",
    listSections: [{ title: "Options", rows: [{ id: "1", title: "", description: "" }] }],
    cta: { text: "", url: "" },
    quickReplyOptions: [{ id: "1", text: "YES" }, { id: "2", text: "NO" }]
  });

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const data = await getWhatsAppTemplates();
      setTemplates(data);
    } catch (error) {
      toast.error("Failed to load templates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const handleReset = () => {
    setEditingId(null);
    setFormData({
      name: "",
      type: "poll",
      header: "",
      body: "",
      footer: "",
      pollOptions: [{ id: "1", text: "" }],
      buttonText: "View Options",
      listSections: [{ title: "Options", rows: [{ id: "1", title: "", description: "" }] }],
      cta: { text: "", url: "" },
      quickReplyOptions: [{ id: "1", text: "YES" }, { id: "2", text: "NO" }]
    });
  };

  const handleEdit = (template: WhatsAppTemplate) => {
    setEditingId(template.id);
    setFormData(template);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return;
    try {
      await deleteWhatsAppTemplate(id);
      toast.success("Template deleted");
      loadTemplates();
      if (editingId === id) handleReset();
    } catch (error) {
      toast.error("Failed to delete template");
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.body) {
      toast.error("Name and Body are required");
      return;
    }

    try {
      setLoading(true);
      if (editingId) {
        await updateWhatsAppTemplate(editingId, formData);
        toast.success("Template updated");
      } else {
        await createWhatsAppTemplate(formData);
        toast.success("Template created");
      }
      loadTemplates();
      handleReset();
    } catch (error) {
      toast.error("Failed to save template");
    } finally {
      setLoading(false);
    }
  };

  const addPollOption = () => {
    if ((formData.pollOptions?.length || 0) >= 12) {
      toast.error("Maximum 12 poll options allowed");
      return;
    }
    setFormData({
      ...formData,
      pollOptions: [...(formData.pollOptions || []), { id: Date.now().toString(), text: "" }]
    });
  };

  const removePollOption = (index: number) => {
    const opts = [...(formData.pollOptions || [])];
    opts.splice(index, 1);
    setFormData({ ...formData, pollOptions: opts });
  };

  const updatePollOption = (index: number, text: string) => {
    const opts = [...(formData.pollOptions || [])];
    opts[index].text = text;
    setFormData({ ...formData, pollOptions: opts });
  };

  const addListRow = (sectionIdx: number) => {
    const sections = [...(formData.listSections || [])];
    sections[sectionIdx].rows.push({ id: Date.now().toString(), title: "", description: "" });
    setFormData({ ...formData, listSections: sections });
  };

  const removeListRow = (sectionIdx: number, rowIdx: number) => {
    const sections = [...(formData.listSections || [])];
    sections[sectionIdx].rows.splice(rowIdx, 1);
    setFormData({ ...formData, listSections: sections });
  };

  const updateListRow = (sectionIdx: number, rowIdx: number, field: string, value: string) => {
    const sections = [...(formData.listSections || [])];
    (sections[sectionIdx].rows[rowIdx] as any)[field] = value;
    setFormData({ ...formData, listSections: sections });
  };

  const addQuickReplyButton = () => {
    if ((formData.quickReplyOptions?.length || 0) >= 3) {
      toast.error("Maximum 3 quick reply buttons allowed");
      return;
    }
    setFormData({
      ...formData,
      quickReplyOptions: [...(formData.quickReplyOptions || []), { id: Date.now().toString(), text: "" }]
    });
  };

  const removeQuickReplyButton = (index: number) => {
    const opts = [...(formData.quickReplyOptions || [])];
    opts.splice(index, 1);
    setFormData({ ...formData, quickReplyOptions: opts });
  };

  const updateQuickReplyButton = (index: number, text: string) => {
    const opts = [...(formData.quickReplyOptions || [])];
    opts[index].text = text;
    setFormData({ ...formData, quickReplyOptions: opts });
  };

  return (
    <div className="card" style={{ width: "100%" }}>
      <div className="card-header">
        <h3>WhatsApp Template Builder</h3>
        <button className="btn btn-primary" onClick={handleReset}>
          <Plus size={16} style={{ marginRight: 8 }} />
          New Template
        </button>
      </div>

      <div className="card-body">
        <div style={{ display: "grid", gridTemplateColumns: "280px 1fr 320px", gap: 20 }}>
          {/* Template List */}
          <div style={{ borderRight: "1px solid var(--border-light)", paddingRight: 20 }}>
            <h4 style={{ marginBottom: 16, fontSize: "0.9rem", color: "var(--text-muted)" }}>
              Saved Templates ({templates.length})
            </h4>
            {templates.length === 0 ? (
              <div className="empty-state" style={{ padding: "20px 0" }}>
                <div className="empty-icon">📋</div>
                <h4>No templates</h4>
                <p>Create your first template</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {templates.map((t) => (
                  <div
                    key={t.id}
                    className={`card ${editingId === t.id ? "card-selected" : ""}`}
                    style={{
                      padding: 12,
                      cursor: "pointer",
                      border: editingId === t.id ? "2px solid var(--accent-wa)" : "1px solid var(--border-light)",
                      backgroundColor: editingId === t.id ? "var(--bg-hover)" : "var(--bg-card)",
                    }}
                    onClick={() => handleEdit(t)}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>{t.name}</div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 4 }}>{t.type}</div>
                      </div>
                      <button
                        className="btn-icon danger"
                        onClick={(e) => { e.stopPropagation(); handleDelete(t.id); }}
                        style={{ padding: 4 }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Template Form */}
          <div>
            <div className="form-header" style={{ marginBottom: 20 }}>
              <h4>{editingId ? "Edit Template" : "Create Template"}</h4>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className={`btn ${formData.type === 'poll' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setFormData({ ...formData, type: 'poll' })}
                  style={{ fontSize: "0.85rem", padding: "6px 12px" }}
                >
                  <BarChart3 size={14} style={{ marginRight: 4 }} />
                  Poll
                </button>
                <button
                  className={`btn ${formData.type === 'list' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setFormData({ ...formData, type: 'list' })}
                  style={{ fontSize: "0.85rem", padding: "6px 12px" }}
                >
                  <ListIcon size={14} style={{ marginRight: 4 }} />
                  List
                </button>
                <button
                  className={`btn ${formData.type === 'cta' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setFormData({ ...formData, type: 'cta' })}
                  style={{ fontSize: "0.85rem", padding: "6px 12px" }}
                >
                  <LinkIcon size={14} style={{ marginRight: 4 }} />
                  CTA
                </button>
                <button
                  className={`btn ${formData.type === 'quick_reply' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setFormData({ ...formData, type: 'quick_reply' })}
                  style={{ fontSize: "0.85rem", padding: "6px 12px" }}
                >
                  <CheckCircle size={14} style={{ marginRight: 4 }} />
                  Quick Reply
                </button>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="form-group">
                <label>Template Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Marketing Campaign"
                />
              </div>

              <div className="form-group">
                <label>Header (Optional)</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.header}
                  onChange={(e) => setFormData({ ...formData, header: e.target.value })}
                  placeholder="Welcome to BulkSend"
                />
              </div>

              <div className="form-group">
                <label>Body Message</label>
                <textarea
                  className="form-input"
                  rows={4}
                  value={formData.body}
                  onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                  placeholder="Hello {name}, please choose an option below."
                />
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  Use {"{name}"} for personalization.
                </span>
              </div>

              <div className="form-group">
                <label>Footer (Optional)</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.footer}
                  onChange={(e) => setFormData({ ...formData, footer: e.target.value })}
                  placeholder="BulkSend Team"
                />
              </div>

              {/* Poll Specific Fields */}
              {formData.type === "poll" && (
                <div className="form-group">
                  <label>Poll Options (Max 12)</label>
                  {formData.pollOptions?.map((opt, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                      <input
                        type="text"
                        className="form-input"
                        value={opt.text}
                        onChange={(e) => updatePollOption(i, e.target.value)}
                        placeholder={`Option ${i + 1}`}
                      />
                      <button className="btn btn-danger" onClick={() => removePollOption(i)} style={{ padding: "8px 12px" }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  {(!formData.pollOptions || formData.pollOptions.length < 12) && (
                    <button className="btn btn-secondary" onClick={addPollOption} style={{ fontSize: "0.85rem" }}>
                      <Plus size={14} style={{ marginRight: 4 }} />
                      Add Option
                    </button>
                  )}
                </div>
              )}

              {/* List Specific Fields */}
              {formData.type === "list" && (
                <div className="form-group">
                  <div className="form-group">
                    <label>Menu Button Text</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.buttonText}
                      onChange={(e) => setFormData({ ...formData, buttonText: e.target.value })}
                      placeholder="View Options"
                    />
                  </div>
                  <label>List Sections & Rows</label>
                  {formData.listSections?.map((section, sIdx) => (
                    <div key={sIdx} style={{ marginBottom: 16, padding: 12, border: "1px solid var(--border-light)", borderRadius: 8 }}>
                      <input
                        className="form-input"
                        type="text"
                        value={section.title}
                        onChange={(e) => {
                          const s = [...(formData.listSections || [])];
                          s[sIdx].title = e.target.value;
                          setFormData({ ...formData, listSections: s });
                        }}
                        placeholder="Section Title"
                        style={{ marginBottom: 8 }}
                      />
                      {section.rows.map((row, rIdx) => (
                        <div key={rIdx} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                          <div style={{ flex: 1 }}>
                            <input
                              type="text"
                              className="form-input"
                              value={row.title}
                              onChange={(e) => updateListRow(sIdx, rIdx, "title", e.target.value)}
                              placeholder="Row Title"
                              style={{ marginBottom: 4 }}
                            />
                            <input
                              type="text"
                              className="form-input"
                              value={row.description}
                              onChange={(e) => updateListRow(sIdx, rIdx, "description", e.target.value)}
                              placeholder="Row Description (Optional)"
                            />
                          </div>
                          <button className="btn btn-danger" onClick={() => removeListRow(sIdx, rIdx)} style={{ padding: "8px 12px" }}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                      <button className="btn btn-secondary btn-sm" onClick={() => addListRow(sIdx)} style={{ fontSize: "0.85rem" }}>
                        <Plus size={14} style={{ marginRight: 4 }} />
                        Add Row
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* CTA Specific Fields */}
              {formData.type === "cta" && (
                <div className="form-group">
                  <label>Call to Action</label>
                  <div className="form-group">
                    <input
                      type="text"
                      className="form-input"
                      value={formData.cta?.text}
                      onChange={(e) => setFormData({ ...formData, cta: { ...formData.cta!, text: e.target.value } })}
                      placeholder="Button Text (e.g. Visit Website)"
                    />
                  </div>
                  <div className="form-group">
                    <input
                      type="text"
                      className="form-input"
                      value={formData.cta?.url}
                      onChange={(e) => setFormData({ ...formData, cta: { ...formData.cta!, url: e.target.value } })}
                      placeholder="URL (https://example.com)"
                    />
                  </div>
                </div>
              )}

              {/* Quick Reply Specific Fields */}
              {formData.type === "quick_reply" && (
                <div className="form-group">
                  <label>Quick Reply Buttons (Max 3)</label>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: 12 }}>
                    Add buttons for users to quickly respond (e.g., YES, NO)
                  </div>
                  {formData.quickReplyOptions?.map((btn, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                      <input
                        type="text"
                        className="form-input"
                        value={btn.text}
                        onChange={(e) => updateQuickReplyButton(i, e.target.value)}
                        placeholder={`Button ${i + 1} (e.g., ${i === 0 ? 'YES' : i === 1 ? 'NO' : 'MAYBE'})`}
                      />
                      <button className="btn btn-danger" onClick={() => removeQuickReplyButton(i)} style={{ padding: "8px 12px" }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  {(!formData.quickReplyOptions || formData.quickReplyOptions.length < 3) && (
                    <button className="btn btn-secondary" onClick={addQuickReplyButton} style={{ fontSize: "0.85rem" }}>
                      <Plus size={14} style={{ marginRight: 4 }} />
                      Add Button
                    </button>
                  )}
                </div>
              )}

              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}>
                <button className="btn btn-neutral" onClick={handleReset}>
                  Cancel
                </button>
                <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
                  <Save size={16} style={{ marginRight: 8 }} />
                  {editingId ? "Update Template" : "Save Template"}
                </button>
              </div>
            </div>
          </div>

          {/* Live WhatsApp Preview */}
          <div style={{ borderLeft: "1px solid var(--border-light)", paddingLeft: 20 }}>
            <h4 style={{ marginBottom: 16, fontSize: "0.9rem", color: "var(--text-muted)" }}>
              Live Preview
            </h4>
            <InteractivePreview template={formData} />
          </div>
        </div>
      </div>
    </div>
  );
}
