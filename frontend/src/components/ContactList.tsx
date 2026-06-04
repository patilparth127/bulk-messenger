import React, { useState, useRef, useCallback, useMemo } from "react";
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
  Check,
  X,
  Shield,
} from "lucide-react";
import toast from "react-hot-toast";
import { Contact, Gender } from "../types";
import { createContact, deleteContact, deleteAllContacts, uploadExcel } from "../utils/api";
import { formatDate, formatPhone, genderLabel } from "../utils/helpers";
import TableControls, { Column, SortConfig, FilterConfig, PaginationConfig } from "./TableControls";

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
  
  // Multi-select
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Table controls
  const [sortConfig, setSortConfig] = useState<SortConfig<Contact>>({ key: null, direction: null });
  const [filterConfig, setFilterConfig] = useState<FilterConfig>({});
  const [pagination, setPagination] = useState<PaginationConfig>({ page: 1, pageSize: 25, total: 0 });
  
  // Current user for permission check
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const AUTHORIZED_EMAIL = "patilparth127@gmail.com";

  // Check for current user (in real app, this would come from auth context)
  React.useEffect(() => {
    const storedEmail = localStorage.getItem("userEmail");
    if (storedEmail) setCurrentUserEmail(storedEmail);
  }, []);

  const columns: Column<Contact>[] = [
    { key: "name", label: "Name", sortable: true, filterable: true, filterType: "text" },
    { key: "email", label: "Email", sortable: true, filterable: true, filterType: "text" },
    { key: "phone", label: "Phone", sortable: true, filterable: true, filterType: "text" },
    { 
      key: "gender", 
      label: "Gender", 
      sortable: true, 
      filterable: true, 
      filterType: "select",
      filterOptions: [
        { value: "male", label: "Male" },
        { value: "female", label: "Female" },
        { value: "other", label: "Other" },
      ]
    },
    { key: "emailSentCount", label: "Email Sent", sortable: true },
    { key: "whatsappSentCount", label: "WA Sent", sortable: true },
    { key: "createdAt", label: "Added", sortable: true },
  ];

  // Apply filters, search, and sorting
  const filteredAndSorted = useMemo(() => {
    let result = [...contacts];

    // Apply search
    if (search) {
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.email.toLowerCase().includes(search.toLowerCase()) ||
          (c.phone && c.phone.includes(search))
      );
    }

    // Apply filters
    Object.entries(filterConfig).forEach(([key, value]) => {
      if (value) {
        result = result.filter((c) => {
          const contactValue = String(c[key as keyof Contact]).toLowerCase();
          return contactValue.includes(String(value).toLowerCase());
        });
      }
    });

    // Apply sorting
    if (sortConfig.key && sortConfig.direction) {
      result.sort((a, b) => {
        const aVal = a[sortConfig.key!];
        const bVal = b[sortConfig.key!];
        
        if (typeof aVal === "number" && typeof bVal === "number") {
          return sortConfig.direction === "asc" ? aVal - bVal : bVal - aVal;
        }
        
        const aStr = String(aVal || "").toLowerCase();
        const bStr = String(bVal || "").toLowerCase();
        
        if (sortConfig.direction === "asc") {
          return aStr.localeCompare(bStr);
        } else {
          return bStr.localeCompare(aStr);
        }
      });
    }

    return result;
  }, [contacts, search, filterConfig, sortConfig]);

  // Apply pagination
  const paginatedData = useMemo(() => {
    const start = (pagination.page - 1) * pagination.pageSize;
    const end = start + pagination.pageSize;
    return filteredAndSorted.slice(start, end);
  }, [filteredAndSorted, pagination.page, pagination.pageSize]);

  // Update pagination total
  React.useEffect(() => {
    setPagination((prev) => ({ ...prev, total: filteredAndSorted.length }));
  }, [filteredAndSorted.length]);

  // Reset page when filters change
  React.useEffect(() => {
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [search, filterConfig, sortConfig]);

  const filtered = paginatedData;

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
    // Permission check
    if (currentUserEmail !== AUTHORIZED_EMAIL) {
      toast.error("You don't have permission to delete all contacts");
      return;
    }
    
    if (!window.confirm(`Delete all ${contacts.length} contacts? This cannot be undone.`)) return;
    try {
      await deleteAllContacts();
      toast.success("All contacts deleted");
      setSelectedIds(new Set());
      onRefresh();
    } catch {
      toast.error("Failed to delete contacts");
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) {
      toast.error("No contacts selected");
      return;
    }
    
    if (!window.confirm(`Delete ${selectedIds.size} selected contacts? This cannot be undone.`)) return;
    try {
      await Promise.all(Array.from(selectedIds).map(id => deleteContact(id)));
      toast.success(`${selectedIds.size} contacts deleted`);
      setSelectedIds(new Set());
      onRefresh();
    } catch {
      toast.error("Failed to delete contacts");
    }
  };

  const toggleAll = () => {
    if (selectedIds.size === paginatedData.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedData.map(c => c.id)));
    }
  };

  const toggle = (id: string) => {
    const s = new Set(selectedIds);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelectedIds(s);
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
          {selectedIds.size > 0 && (
            <button className="btn btn-danger btn-sm" onClick={handleDeleteSelected}>
              <Trash2 size={14} /> Delete Selected ({selectedIds.size})
            </button>
          )}
          {contacts.length > 0 && currentUserEmail === AUTHORIZED_EMAIL && (
            <button className="btn btn-danger btn-sm" onClick={handleDeleteAll}>
              <Shield size={14} /> Delete All
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

      {/* Table Controls */}
      <div className="card">
        <div className="card-header">
          <h3>All Contacts</h3>
          {selectedIds.size > 0 && (
            <span style={{ fontSize: "0.85rem", color: "var(--accent-email)", fontWeight: 600 }}>
              {selectedIds.size} selected
            </span>
          )}
        </div>
        <div className="card-body">
          <TableControls
            columns={columns}
            sortConfig={sortConfig}
            onSort={(key) => setSortConfig({
              key,
              direction: sortConfig.key === key && sortConfig.direction === "asc" ? "desc" : "asc",
            })}
            filterConfig={filterConfig}
            onFilterChange={(key, value) => setFilterConfig({ ...filterConfig, [key]: value })}
            searchQuery={search}
            onSearchChange={setSearch}
            pagination={pagination}
            onPageChange={(page) => setPagination({ ...pagination, page })}
            onPageSizeChange={(pageSize) => setPagination({ ...pagination, pageSize, page: 1 })}
          />
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
                  <th style={{ width: 40 }}>
                    <input
                      type="checkbox"
                      checked={selectedIds.size === paginatedData.length && paginatedData.length > 0}
                      onChange={toggleAll}
                    />
                  </th>
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
                  <tr key={c.id} style={{ background: selectedIds.has(c.id) ? "var(--bg-selected)" : undefined }}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(c.id)}
                        onChange={() => toggle(c.id)}
                      />
                    </td>
                    <td className="text-muted">{(pagination.page - 1) * pagination.pageSize + i + 1}</td>
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
