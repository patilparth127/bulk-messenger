import React, { useState, useEffect } from "react";
import { Building2, Plus, Edit2, Trash2, MapPin, Phone, Mail } from "lucide-react";
import toast from "react-hot-toast";
import { Site } from "../types";
import { getSites, createSite, updateSite, deleteSite } from "../utils/api";

export default function Sites() {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSite, setEditingSite] = useState<Site | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    address: "",
    city: "",
    state: "",
    country: "",
    phone: "",
  });

  useEffect(() => {
    loadSites();
  }, []);

  const loadSites = async () => {
    try {
      const data = await getSites();
      setSites(data);
    } catch (error) {
      toast.error("Failed to load sites");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (site?: Site) => {
    if (site) {
      setEditingSite(site);
      setFormData({
        name: site.name,
        code: site.code,
        address: site.address,
        city: site.city,
        state: site.state,
        country: site.country,
        phone: site.phone,
      });
    } else {
      setEditingSite(null);
      setFormData({
        name: "",
        code: "",
        address: "",
        city: "",
        state: "",
        country: "",
        phone: "",
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingSite(null);
    setFormData({
      name: "",
      code: "",
      address: "",
      city: "",
      state: "",
      country: "",
      phone: "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.code) {
      toast.error("Name and Code are required");
      return;
    }

    try {
      if (editingSite) {
        await updateSite(editingSite.id, formData);
        toast.success("Site updated successfully");
      } else {
        await createSite(formData);
        toast.success("Site created successfully");
      }
      handleCloseModal();
      loadSites();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to save site");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this site?")) return;

    try {
      await deleteSite(id);
      toast.success("Site deleted successfully");
      loadSites();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to delete site");
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "60vh" }}>
        <span className="spinner spinner-dark" style={{ width: 32, height: 32 }} />
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>🏢 Site Management</h2>
          <p>Manage your sites and locations</p>
        </div>
        <button className="btn btn-primary" onClick={() => handleOpenModal()}>
          <Plus size={16} style={{ marginRight: 8 }} />
          Add Site
        </button>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>All Sites ({sites.length})</h3>
        </div>
        <div className="card-body">
          {sites.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
              <Building2 size={48} style={{ marginBottom: 16, opacity: 0.5 }} />
              <p>No sites found. Create your first site to get started.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
              {sites.map((site) => (
                <div
                  key={site.id}
                  style={{
                    background: "var(--bg)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius)",
                    padding: 16,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <div>
                      <h4 style={{ margin: 0, marginBottom: 4 }}>{site.name}</h4>
                      <span
                        style={{
                          fontSize: "0.75rem",
                          background: "var(--accent-wa-light)",
                          color: "var(--accent-wa)",
                          padding: "2px 8px",
                          borderRadius: 4,
                          fontWeight: 600,
                        }}
                      >
                        {site.code}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button
                        className="btn btn-secondary"
                        onClick={() => handleOpenModal(site)}
                        style={{ padding: "6px 8px", fontSize: "0.75rem" }}
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        className="btn btn-danger"
                        onClick={() => handleDelete(site.id)}
                        style={{ padding: "6px 8px", fontSize: "0.75rem" }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {site.address && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, fontSize: "0.85rem", color: "var(--text-muted)" }}>
                      <MapPin size={14} />
                      <span>{site.address}</span>
                    </div>
                  )}

                  {site.city && site.state && (
                    <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: 8 }}>
                      {site.city}, {site.state}
                    </div>
                  )}

                  {site.country && (
                    <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: 8 }}>
                      {site.country}
                    </div>
                  )}

                  {site.phone && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.85rem", color: "var(--text-muted)" }}>
                      <Phone size={14} />
                      <span>{site.phone}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
          onClick={handleCloseModal}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: 8,
              padding: 24,
              width: "100%",
              maxWidth: 500,
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 4px 20px rgba(0, 0, 0, 0.15)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginBottom: 20, color: "#1a1a1a", fontSize: "1.25rem", fontWeight: 600 }}>{editingSite ? "Edit Site" : "Add New Site"}</h3>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="form-group">
                <label className="form-label" style={{ color: "#333", fontWeight: 500, display: "block", marginBottom: 6 }}>
                  Site Name <span className="req" style={{ color: "#dc2626" }}>*</span>
                </label>
                <input
                  className="form-input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Main Office"
                  required
                  style={{ width: "100%", padding: "8px 12px", border: "1px solid #ddd", borderRadius: 4, fontSize: "14px" }}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ color: "#333", fontWeight: 500, display: "block", marginBottom: 6 }}>
                  Site Code <span className="req" style={{ color: "#dc2626" }}>*</span>
                </label>
                <input
                  className="form-input"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="HQ"
                  maxLength={10}
                  required
                  style={{ width: "100%", padding: "8px 12px", border: "1px solid #ddd", borderRadius: 4, fontSize: "14px" }}
                />
                <div style={{ fontSize: "0.75rem", color: "#666", marginTop: 4 }}>
                  Unique identifier for the site (e.g., HQ, BR1, BR2)
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ color: "#333", fontWeight: 500, display: "block", marginBottom: 6 }}>
                  Address
                </label>
                <input
                  className="form-input"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="123 Main Street"
                  style={{ width: "100%", padding: "8px 12px", border: "1px solid #ddd", borderRadius: 4, fontSize: "14px" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div className="form-group">
                  <label className="form-label" style={{ color: "#333", fontWeight: 500, display: "block", marginBottom: 6 }}>
                    City
                  </label>
                  <input
                    className="form-input"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="New York"
                    style={{ width: "100%", padding: "8px 12px", border: "1px solid #ddd", borderRadius: 4, fontSize: "14px" }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ color: "#333", fontWeight: 500, display: "block", marginBottom: 6 }}>
                    State
                  </label>
                  <input
                    className="form-input"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    placeholder="NY"
                    style={{ width: "100%", padding: "8px 12px", border: "1px solid #ddd", borderRadius: 4, fontSize: "14px" }}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ color: "#333", fontWeight: 500, display: "block", marginBottom: 6 }}>
                  Country
                </label>
                <input
                  className="form-input"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  placeholder="United States"
                  style={{ width: "100%", padding: "8px 12px", border: "1px solid #ddd", borderRadius: 4, fontSize: "14px" }}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ color: "#333", fontWeight: 500, display: "block", marginBottom: 6 }}>
                  Phone
                </label>
                <input
                  className="form-input"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+1 234 567 8900"
                  style={{ width: "100%", padding: "8px 12px", border: "1px solid #ddd", borderRadius: 4, fontSize: "14px" }}
                />
              </div>

              <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 8 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleCloseModal}
                  style={{ padding: "8px 16px", border: "1px solid #ddd", borderRadius: 4, background: "#f5f5f5", cursor: "pointer", fontSize: "14px" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ padding: "8px 16px", border: "none", borderRadius: 4, background: "#2563eb", color: "white", cursor: "pointer", fontSize: "14px" }}
                >
                  {editingSite ? "Update Site" : "Create Site"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
