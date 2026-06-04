import React, { useState, useEffect } from "react";
import { Users, Plus, Edit, Trash2, Shield, User as UserIcon, Key, Mail } from "lucide-react";
import toast from "react-hot-toast";
import { User, UserRole, CreateUserPayload } from "../types";
import { getUsers, createUser, updateUser, deleteUser } from "../utils/api";
import TableControls, { Column, SortConfig, FilterConfig, PaginationConfig } from "./TableControls";

interface Props {
  currentUser: User;
  onRefresh: () => void;
}

export default function UserManagement({ currentUser, onRefresh }: Props) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState<CreateUserPayload>({
    username: "",
    password: "",
    email: "",
    name: "",
    role: UserRole.USER,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Table controls
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState<SortConfig<User>>({ key: null, direction: null });
  const [filterConfig, setFilterConfig] = useState<FilterConfig>({});
  const [pagination, setPagination] = useState<PaginationConfig>({ page: 1, pageSize: 10, total: 0 });

  const columns: Column<User>[] = [
    { key: "name", label: "Name", sortable: true, filterable: true, filterType: "text" },
    { key: "username", label: "Username", sortable: true, filterable: true, filterType: "text" },
    { key: "email", label: "Email", sortable: true, filterable: true, filterType: "text" },
    { key: "role", label: "Role", sortable: true, filterable: true, filterType: "select", filterOptions: [
      { value: UserRole.ADMIN, label: "Admin" },
      { value: UserRole.USER, label: "User" },
      { value: UserRole.VIEWER, label: "Viewer" },
    ]},
    { key: "authMethod", label: "Auth Method", sortable: true },
  ];

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await getUsers();
      setUsers(data);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const filteredAndSortedUsers = React.useMemo(() => {
    let result = [...users];

    if (searchQuery) {
      result = result.filter(
        (u) =>
          u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          u.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          u.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    Object.entries(filterConfig).forEach(([key, value]) => {
      if (value) {
        result = result.filter((u) => {
          const userValue = String(u[key as keyof User]).toLowerCase();
          return userValue.includes(String(value).toLowerCase());
        });
      }
    });

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
  }, [users, searchQuery, filterConfig, sortConfig]);

  const paginatedUsers = React.useMemo(() => {
    const start = (pagination.page - 1) * pagination.pageSize;
    const end = start + pagination.pageSize;
    return filteredAndSortedUsers.slice(start, end);
  }, [filteredAndSortedUsers, pagination.page, pagination.pageSize]);

  React.useEffect(() => {
    setPagination((prev) => ({ ...prev, total: filteredAndSortedUsers.length }));
  }, [filteredAndSortedUsers.length]);

  React.useEffect(() => {
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [searchQuery, filterConfig, sortConfig]);

  const handleOpenModal = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setForm({
        username: user.username || "",
        password: "",
        email: user.email,
        name: user.name,
        role: user.role,
      });
    } else {
      setEditingUser(null);
      setForm({
        username: "",
        password: "",
        email: "",
        name: "",
        role: UserRole.USER,
      });
    }
    setErrors({});
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingUser(null);
    setForm({
      username: "",
      password: "",
      email: "",
      name: "",
      role: UserRole.USER,
    });
    setErrors({});
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.username.trim()) errs.username = "Username is required";
    if (!editingUser && !form.password.trim()) errs.password = "Password is required";
    if (!form.email.trim()) errs.email = "Email is required";
    if (!form.name.trim()) errs.name = "Name is required";
    if (!form.email.includes("@")) errs.email = "Invalid email format";
    return errs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }

    try {
      if (editingUser) {
        await updateUser(editingUser.id, form);
        toast.success("User updated successfully");
      } else {
        await createUser(form);
        toast.success("User created successfully");
      }
      handleCloseModal();
      loadUsers();
      onRefresh();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to save user");
    }
  };

  const handleDelete = async (user: User) => {
    if (!confirm(`Are you sure you want to delete ${user.name}?`)) return;
    
    try {
      await deleteUser(user.id);
      toast.success("User deleted successfully");
      loadUsers();
      onRefresh();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to delete user");
    }
  };

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN: return "var(--accent-danger)";
      case UserRole.USER: return "var(--accent-email)";
      case UserRole.VIEWER: return "var(--accent-wa)";
      default: return "var(--text-secondary)";
    }
  };

  if (currentUser.role !== UserRole.ADMIN) {
    return (
      <div className="empty-state">
        <Shield size={48} style={{ color: "var(--accent-danger)" }} />
        <h3>Access Denied</h3>
        <p>You don't have permission to manage users</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>👥 User Management</h2>
          <p>Manage system users and their roles</p>
        </div>
        <button className="btn btn-primary-email" onClick={() => handleOpenModal()}>
          <Plus size={16} style={{ marginRight: 6 }} />
          Add User
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 40 }}>
          <span className="spinner" />
        </div>
      ) : users.length === 0 ? (
        <div className="empty-state">
          <Users size={48} />
          <h3>No users yet</h3>
          <p>Create your first user to get started</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <TableControls
            columns={columns}
            sortConfig={sortConfig}
            onSort={(key) => setSortConfig({
              key,
              direction: sortConfig.key === key && sortConfig.direction === "asc" ? "desc" : "asc",
            })}
            filterConfig={filterConfig}
            onFilterChange={(key, value) => setFilterConfig({ ...filterConfig, [key]: value })}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            pagination={pagination}
            onPageChange={(page) => setPagination({ ...pagination, page })}
            onPageSizeChange={(pageSize) => setPagination({ ...pagination, pageSize, page: 1 })}
          />
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Auth Method</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedUsers.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <UserIcon size={16} style={{ color: "var(--text-muted)" }} />
                        {user.name}
                      </div>
                    </td>
                    <td className="font-mono">{user.username || "—"}</td>
                    <td className="font-mono">{user.email}</td>
                    <td>
                      <span className="badge" style={{ background: getRoleBadgeColor(user.role), color: "white" }}>
                        {user.role.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                        {user.authMethod === "google" ? <Mail size={12} style={{ marginRight: 4 }} /> : <Key size={12} style={{ marginRight: 4 }} />}
                        {user.authMethod === "google" ? "Google" : "Password"}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 4 }}>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleOpenModal(user)}
                          title="Edit user"
                        >
                          <Edit size={14} />
                        </button>
                        {user.id !== currentUser.id && (
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => handleDelete(user)}
                            title="Delete user"
                            style={{ color: "var(--accent-danger)" }}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingUser ? "Edit User" : "Add New User"}</h3>
              <button className="btn btn-ghost btn-sm" onClick={handleCloseModal}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Name</label>
                  <input
                    className="form-input"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Full name"
                  />
                  {errors.name && <span className="form-error">{errors.name}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Username</label>
                  <input
                    className="form-input"
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    placeholder="Username"
                    disabled={!!editingUser}
                  />
                  {errors.username && <span className="form-error">{errors.username}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input
                    className="form-input"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="email@example.com"
                  />
                  {errors.email && <span className="form-error">{errors.email}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Password {editingUser && "(leave blank to keep current)"}</label>
                  <input
                    className="form-input"
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="Password"
                  />
                  {errors.password && <span className="form-error">{errors.password}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Role</label>
                  <select
                    className="form-select"
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
                  >
                    <option value={UserRole.VIEWER}>Viewer - Read-only access</option>
                    <option value={UserRole.USER}>User - Standard access</option>
                    <option value={UserRole.ADMIN}>Admin - Full access</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={handleCloseModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary-email">
                  {editingUser ? "Update User" : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
