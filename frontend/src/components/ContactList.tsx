import React, { useState, useRef, useCallback } from "react";
import {
  Upload,
  Trash2,
  UserPlus,
  Search,
  ChevronDown,
  Users,
  Mail,
  Phone,
  Download,
} from "lucide-react";
import toast from "react-hot-toast";
import { Contact, Gender } from "../types";
import { createContact, deleteContact, deleteAllContacts, uploadExcel } from "../utils/api";
import { formatDate, formatPhone, genderLabel } from "../utils/helpers";

interface Props {
  contacts: Contact[];
  onRefresh: () => void;
}

const GENDERS = [Gender.MALE, Gender.FEMALE, Gender.OTHER];

export default function ContactList({ contacts, onRefresh }: Props) {
  const [search, setSearch] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [addForm, setAddForm] = useState({
    name: "",
    email: "",
    phone: "",
    gender: Gender.OTHER,
  });
  const [addErrors, setAddErrors] = useState<Record<string, string>>({});
  const [adding, setAdding] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const filtered = contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      (c.phone && c.phone.includes(search))
  );

  // Validate add form
  const validate = () => {
    const errs: Record<string, string> = {};
    if (!addForm.name.trim()) errs.name = "Name is required";
    if (!addForm.email.trim()) errs.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addForm.email))
      errs.email = "Invalid email address";
    return errs;
  };

  const handleAdd = async () => {
    const errs = validate();
    if (Object.keys(errs).length) { setAddErrors(errs); return; }
    setAdding(true);
    try {
      await createContact(addForm);
      toast.success("Contact added!");
      setAddForm({ name: "", email: "", phone: "", gender: Gender.OTHER });
      setShowAddForm(false);
      setAddErrors({});
      onRefresh();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || "Failed to add contact");
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete ${name}?`)) return;
    try {
      await deleteContact(id);
      toast.success("Contact deleted");
      onRefresh();
    } catch {
      toast.error("Failed to delete");
    }
  };

  const handleDeleteAll = async () => {
    if (!window.confirm(`Delete all ${contacts.length} contacts? This cannot be undone.`)) return;
    try {
      await deleteAllContacts();
      toast.success("All contacts deleted");
      onRefresh();
    } catch {
      toast.error("Failed to delete contacts");
    }
  };

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      toast.error("Please upload an Excel (.xlsx or .xls) file");
      return;
    }
    setUploading(true);
    const tid = toast.loading("Parsing Excel file…");
    try {
      const result = await uploadExcel(file);
      toast.dismiss(tid);
      toast.success(
        `Imported ${result.session.importedCount} contacts` +
          (result.session.errorCount ? ` (${result.session.errorCount} skipped)` : "")
      );
      onRefresh();
    } catch (e: any) {
      toast.dismiss(tid);
      toast.error(e?.response?.data?.error || "Upload failed");
    } finally {
      setUploading(false);
    }
  }, [onRefresh]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h2>Contact List</h2>
          <p>{contacts.length} total contacts</p>
        </div>
        <div className="flex gap-8 flex-wrap">
          <button className="btn btn-secondary btn-sm" onClick={() => setShowAddForm(!showAddForm)}>
            <UserPlus size={14} /> Add Contact
          </button>
          {contacts.length > 0 && (
            <button className="btn btn-danger btn-sm" onClick={handleDeleteAll}>
              <Trash2 size={14} /> Clear All
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="stats-row" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", marginBottom: 20 }}>
        <div className="stat-card">
          <span className="stat-label">Total</span>
          <span className="stat-value">{contacts.length}</span>
          <span className="stat-sub">Contacts</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">With Email</span>
          <span className="stat-value">{contacts.filter((c) => c.email).length}</span>
          <span className="stat-sub">Ready to mail</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">With Phone</span>
          <span className="stat-value">{contacts.filter((c) => c.phone).length}</span>
          <span className="stat-sub">Ready for WA</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Emailed</span>
          <span className="stat-value" style={{ color: "var(--accent-email)" }}>
            {contacts.filter((c) => c.emailSentCount > 0).length}
          </span>
          <span className="stat-sub">At least once</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">WA Sent</span>
          <span className="stat-value" style={{ color: "var(--accent-wa)" }}>
            {contacts.filter((c) => c.whatsappSentCount > 0).length}
          </span>
          <span className="stat-sub">At least once</span>
        </div>
      </div>

      {/* Excel Upload */}
      <div
        className={`drop-zone mb-16${dragOver ? " drag-over" : ""}`}
        style={{ marginBottom: 20 }}
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls"
          style={{ display: "none" }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
        />
        <div className="drop-zone-icon">📊</div>
        {uploading ? (
          <h4>Uploading…</h4>
        ) : (
          <>
            <h4>Drop Excel file here or click to upload</h4>
            <p>Supported columns: <strong>Name, Email, Phone/Number, Gender</strong> — .xlsx / .xls</p>
          </>
        )}
      </div>

      {/* Add Contact Form */}
      {showAddForm && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="portal-band portal-band-email" />
          <div className="card-header">
            <h3>Add New Contact</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowAddForm(false)}>✕</button>
          </div>
          <div className="card-body">
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Name <span className="req">*</span></label>
                <input
                  className="form-input"
                  placeholder="Full name"
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                />
                {addErrors.name && <span className="form-error">{addErrors.name}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">Email <span className="req">*</span></label>
                <input
                  className="form-input"
                  type="email"
                  placeholder="email@example.com"
                  value={addForm.email}
                  onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                />
                {addErrors.email && <span className="form-error">{addErrors.email}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">Phone / WhatsApp Number</label>
                <input
                  className="form-input"
                  placeholder="+91 98765 43210"
                  value={addForm.phone}
                  onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Gender</label>
                <select
                  className="form-select"
                  value={addForm.gender}
                  onChange={(e) => setAddForm({ ...addForm, gender: e.target.value as Gender })}
                >
                  {GENDERS.map((g) => (
                    <option key={g} value={g}>{genderLabel(g)}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-8 mt-16">
              <button className="btn btn-primary-email" onClick={handleAdd} disabled={adding}>
                {adding ? <span className="spinner" /> : <UserPlus size={14} />}
                Save Contact
              </button>
              <button className="btn btn-secondary" onClick={() => setShowAddForm(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="card">
        <div className="card-header">
          <h3>All Contacts</h3>
          <div style={{ position: "relative" }}>
            <Search size={14} style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
            <input
              className="form-input"
              style={{ paddingLeft: 30, width: 220 }}
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">👥</div>
            <h3>{contacts.length === 0 ? "No contacts yet" : "No matches found"}</h3>
            <p>{contacts.length === 0 ? "Upload an Excel file or add contacts manually" : "Try a different search term"}</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Gender</th>
                  <th>Email Sent</th>
                  <th>Last Email</th>
                  <th>WA Sent</th>
                  <th>Last WA</th>
                  <th>Added</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, i) => (
                  <tr key={c.id}>
                    <td className="text-muted">{i + 1}</td>
                    <td style={{ fontWeight: 600 }}>{c.name}</td>
                    <td className="font-mono">{c.email}</td>
                    <td>{formatPhone(c.phone)}</td>
                    <td>
                      <span className="badge" style={{
                        background: c.gender === "male" ? "#eff6ff" : c.gender === "female" ? "#fdf2f8" : "#f3f4f6",
                        color: c.gender === "male" ? "#2563eb" : c.gender === "female" ? "#9333ea" : "#6b7280"
                      }}>
                        {genderLabel(c.gender)}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, color: c.emailSentCount > 0 ? "var(--accent-email)" : "var(--text-muted)" }}>
                        {c.emailSentCount}×
                      </span>
                    </td>
                    <td className="text-sm text-muted">{formatDate(c.lastEmailSentAt)}</td>
                    <td>
                      <span style={{ fontWeight: 700, color: c.whatsappSentCount > 0 ? "var(--accent-wa)" : "var(--text-muted)" }}>
                        {c.whatsappSentCount}×
                      </span>
                    </td>
                    <td className="text-sm text-muted">{formatDate(c.lastWhatsappSentAt)}</td>
                    <td className="text-sm text-muted">{formatDate(c.createdAt)}</td>
                    <td>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ color: "var(--accent-danger)" }}
                        onClick={() => handleDelete(c.id, c.name)}
                      >
                        <Trash2 size={13} />
                      </button>
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
