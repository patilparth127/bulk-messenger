import React, { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { Toaster } from "react-hot-toast";
import {
  LayoutDashboard,
  Users,
  Mail,
  MessageCircle,
  RefreshCw,
  Smartphone,
  Settings as SettingsIcon,
  LogOut,
  Shield,
  Building2,
  TrendingUp,
} from "lucide-react";
import "./styles.css";
import { Contact, EmailCampaign, SmsCampaign, WhatsAppCampaign, User, UserRole } from "./types";
import {
  getContacts,
  getEmailCampaigns,
  getSmsCampaigns,
  getWhatsAppCampaigns,
  logout,
  getCurrentUser,
} from "./utils/api";
import Dashboard from "./components/Dashboard";
import ContactList from "./components/ContactList";
import EmailPortal from "./components/EmailPortal";
import WhatsAppPortal from "./components/WhatsAppPortal";
import SmsPortal from "./components/SmsPortal";
import Settings from "./components/Settings";
import Login from "./components/Login";
import UserManagement from "./components/UserManagement";
import AdminDashboard from "./components/AdminDashboard";
import CompanyManagement from "./components/CompanyManagement";
import SubscriptionManagement from "./components/SubscriptionManagement";

type Page = "dashboard" | "contacts" | "email" | "whatsapp" | "sms" | "settings" | "users" | "admin" | "companies" | "subscription";

export default function App() {
  const [page, setPage] = useState<Page>("dashboard");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [emailCampaigns, setEmailCampaigns] = useState<EmailCampaign[]>([]);
  const [waCampaigns, setWaCampaigns] = useState<WhatsAppCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [smsCampaigns, setSmsCampaigns] = useState<SmsCampaign[]>([]);
  const [user, setUser] = useState<User | null>(null);

  // Check for existing session on mount
  useEffect(() => {
    const storedEmail = localStorage.getItem("userEmail");
    const storedName = localStorage.getItem("userName");
    const storedToken = localStorage.getItem("authToken");
    if (storedEmail && storedName && storedToken) {
      // Verify the token with the backend
      getCurrentUser().then((currentUser) => {
        setUser(currentUser);
      }).catch(() => {
        // Token invalid, clear storage
        localStorage.removeItem("userEmail");
        localStorage.removeItem("userName");
        localStorage.removeItem("authToken");
        setUser(null);
      });
    }
  }, []);

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
    refresh();
  };

  const handleLogout = async () => {
    try {
      await logout();
      localStorage.removeItem("userEmail");
      localStorage.removeItem("userName");
      localStorage.removeItem("authToken");
      setUser(null);
      toast.success("Logged out successfully");
    } catch (error) {
      toast.error("Failed to logout");
    }
  };
  const refresh = useCallback(async () => {
    try {
      const [c, e, w, s] = await Promise.all([
        getContacts(),
        getEmailCampaigns(),
        getWhatsAppCampaigns(),
        getSmsCampaigns(),
      ]);
      setContacts(c);
      setEmailCampaigns(e);
      setWaCampaigns(w);
      setSmsCampaigns(s);
    } catch (err: any) {
      console.error("Fetch error:", err);
      toast.error("Failed to load data. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    refresh();
  }, [refresh]);

  const navItems: {
    id: Page;
    label: string;
    icon: React.ReactNode;
    badge?: number;
  }[] = [
      {
        id: "dashboard",
        label: "Dashboard",
        icon: <LayoutDashboard size={16} />,
      },
      {
        id: "contacts",
        label: "Contacts",
        icon: <Users size={16} />,
        badge: contacts.length,
      },
      {
        id: "email",
        label: "Email Portal",
        icon: <Mail size={16} />,
        badge: emailCampaigns.length || undefined,
      },
      {
        id: "whatsapp",
        label: "WhatsApp Portal",
        icon: <MessageCircle size={16} />,
        badge: waCampaigns.length || undefined,
      },
      {
        id: "sms",
        label: "SMS Portal",
        icon: <Smartphone size={16} />,
        badge: smsCampaigns.length || undefined,
      },
      {
        id: "settings",
        label: "Settings",
        icon: <SettingsIcon size={16} />,
      },
      ...(user?.role === UserRole.ADMIN ? [{
        id: "users" as Page,
        label: "User Management",
        icon: <Shield size={16} />,
      }] : []),
      ...(user?.email === "patilparth127@gmail.com" ? [
        {
          id: "companies" as Page,
          label: "Companies",
          icon: <Building2 size={16} />,
        },
        {
          id: "admin" as Page,
          label: "Admin Dashboard",
          icon: <LayoutDashboard size={16} />,
        },
      ] : []),
      ...(user?.companyId ? [{
        id: "subscription" as Page,
        label: "Subscription",
        icon: <TrendingUp size={16} />,
      }] : []),
    ];

  const activeClass = (id: Page) =>
    page === id
      ? id === "email"
        ? "active-email"
        : id === "whatsapp"
          ? "active-wa"
          : "active-neutral"
      : "";

  // Show login screen if not authenticated
  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h1>📨 BulkSend</h1>
          <p>Email & WhatsApp Messenger</p>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-section-label">Navigation</div>
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${activeClass(item.id)}`}
              onClick={() => setPage(item.id)}
            >
              {item.icon}
              <span>{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="nav-badge">{item.badge}</span>
              )}
            </button>
          ))}
        </div>

        <div
          className="sidebar-section"
          style={{ marginTop: "auto", paddingBottom: 20 }}
        >
          <div className="sidebar-section-label">System</div>
          <button className="nav-item" onClick={refresh}>
            <RefreshCw size={16} />
            <span>Refresh Data</span>
          </button>
          <button className="nav-item" onClick={handleLogout} style={{ color: "var(--accent-danger)" }}>
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>

        {/* Bottom info */}
        <div
          style={{
            padding: "12px 20px",
            borderTop: "1px solid var(--border-light)",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              marginBottom: 4,
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "var(--accent-wa)",
              }}
            />
            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
              API Connected
            </span>
          </div>
          <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
            localhost:3200
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="main-content">
        {loading ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "60vh",
              gap: 16,
            }}
          >
            <span
              className="spinner spinner-dark"
              style={{ width: 32, height: 32 }}
            />
            <span style={{ color: "var(--text-muted)" }}>Loading data…</span>
          </div>
        ) : (
          <>
            {page === "dashboard" && (
              <Dashboard
                contacts={contacts}
                emailCampaigns={emailCampaigns}
                whatsappCampaigns={waCampaigns}
                onNav={(p) => setPage(p as Page)}
              />
            )}
            {page === "contacts" && (
              <ContactList contacts={contacts} onRefresh={refresh} />
            )}
            {page === "email" && (
              <EmailPortal
                contacts={contacts}
                campaigns={emailCampaigns}
                onRefresh={refresh}
              />
            )}
            {page === "whatsapp" && (
              <WhatsAppPortal
                contacts={contacts}
                campaigns={waCampaigns}
                onRefresh={refresh}
              />
            )},{page === "sms" && (
              <SmsPortal
                contacts={contacts}
                campaigns={smsCampaigns}
                onRefresh={refresh}
              />
            )}
            {page === "settings" && (
              <Settings />
            )}
            {page === "users" && user && (
              <UserManagement currentUser={user} onRefresh={refresh} />
            )}
            {page === "admin" && user && (
              <AdminDashboard user={user} />
            )}
            {page === "companies" && user && (
              <CompanyManagement user={user} />
            )}
            {page === "subscription" && user && (
              <SubscriptionManagement companyId={user.companyId || undefined} user={user} />
            )}
          </>
        )}
      </main>

      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            fontFamily: "var(--font)",
            fontSize: "0.875rem",
            borderRadius: "var(--radius)",
            border: "1px solid var(--border)",
            boxShadow: "var(--shadow-md)",
          },
        }}
      />
    </div>
  );
}
