import React, { useState } from "react";
import { LogIn, Mail, Lock, Shield, User as UserIcon, Key } from "lucide-react";
import toast from "react-hot-toast";
import { googleLogin, login } from "../utils/api";
import { User, AuthMethod } from "../types";

interface Props {
  onLogin: (user: User) => void;
}

export default function Login({ onLogin }: Props) {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"google" | "password">("password");
  const [credentials, setCredentials] = useState({ username: "", password: "", companyCode: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      // Simulate Google OAuth flow
      // In production, this would use the actual Google Sign-In SDK
      const response = await googleLogin("demo-google-token");
      
      if (response.success && response.user) {
        localStorage.setItem("userEmail", response.user.email);
        localStorage.setItem("userName", response.user.name);
        localStorage.setItem("authToken", response.token || "");
        toast.success(`Welcome, ${response.user.name}!`);
        onLogin(response.user);
      } else {
        toast.error(response.error || "Login failed");
      }
    } catch (error) {
      toast.error("Failed to login");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    const errs: Record<string, string> = {};
    if (!credentials.username.trim()) errs.username = "Username is required";
    if (!credentials.password.trim()) errs.password = "Password is required";
    
    // Only require company code for non-master admin users
    if (credentials.username !== "patilparth127@gmail.com" && !credentials.companyCode.trim()) {
      errs.companyCode = "Company code is required";
    }
    
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }

    setLoading(true);
    try {
      const response = await login({
        username: credentials.username,
        password: credentials.password,
        companyCode: credentials.companyCode,
        authMethod: AuthMethod.USERNAME_PASSWORD,
      });
      
      if (response.success && response.user) {
        localStorage.setItem("userEmail", response.user.email);
        localStorage.setItem("userName", response.user.name);
        localStorage.setItem("authToken", response.token || "");
        toast.success(`Welcome, ${response.user.name}!`);
        onLogin(response.user);
      } else {
        toast.error(response.error || "Login failed");
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      minHeight: "100vh",
      background: "var(--bg)",
      padding: 20,
    }}>
      <div className="card" style={{ maxWidth: 400, width: "100%" }}>
        <div style={{
          height: 4,
          borderRadius: "14px 14px 0 0",
          background: "linear-gradient(90deg, var(--accent-email), var(--accent-wa))",
        }} />
        <div className="card-body" style={{ padding: "32px 24px" }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: "linear-gradient(135deg, var(--accent-email), var(--accent-wa))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}>
              <Mail size={32} style={{ color: "white" }} />
            </div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: 8 }}>
              Bulk Messenger
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
              Sign in to manage your bulk messaging campaigns
            </p>
          </div>

          <div style={{
            display: "flex",
            gap: 8,
            marginBottom: 24,
            borderBottom: "1px solid var(--border-light)",
          }}>
            <button
              className={`tab ${activeTab === "password" ? "active-neutral" : ""}`}
              onClick={() => setActiveTab("password")}
              style={{ flex: 1, padding: "12px", fontSize: "0.9rem" }}
            >
              <Key size={16} style={{ marginRight: 6 }} />
              Username/Password
            </button>
            <button
              className={`tab ${activeTab === "google" ? "active-neutral" : ""}`}
              onClick={() => setActiveTab("google")}
              style={{ flex: 1, padding: "12px", fontSize: "0.9rem" }}
            >
              <Mail size={16} style={{ marginRight: 6 }} />
              Google
            </button>
          </div>

          {activeTab === "password" && (
            <form onSubmit={handlePasswordLogin}>
              <div style={{ marginBottom: 16 }}>
                <label className="form-label">Username</label>
                <div style={{ position: "relative" }}>
                  <UserIcon
                    size={16}
                    style={{
                      position: "absolute",
                      left: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "var(--text-muted)",
                    }}
                  />
                  <input
                    className="form-input"
                    style={{ paddingLeft: 40 }}
                    placeholder="Enter your username"
                    value={credentials.username}
                    onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                    disabled={loading}
                  />
                </div>
                {errors.username && <span className="form-error">{errors.username}</span>}
              </div>

              <div style={{ marginBottom: 24 }}>
                <label className="form-label">Password</label>
                <div style={{ position: "relative" }}>
                  <Lock
                    size={16}
                    style={{
                      position: "absolute",
                      left: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "var(--text-muted)",
                    }}
                  />
                  <input
                    className="form-input"
                    type="password"
                    style={{ paddingLeft: 40 }}
                    placeholder="Enter your password"
                    value={credentials.password}
                    onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                    disabled={loading}
                  />
                </div>
                {errors.password && <span className="form-error">{errors.password}</span>}
              </div>

              <div style={{ marginBottom: 24 }}>
                <label className="form-label">Company Code</label>
                <div style={{ position: "relative" }}>
                  <Shield
                    size={16}
                    style={{
                      position: "absolute",
                      left: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "var(--text-muted)",
                    }}
                  />
                  <input
                    className="form-input"
                    style={{ paddingLeft: 40 }}
                    placeholder="Enter your company code"
                    value={credentials.companyCode}
                    onChange={(e) => setCredentials({ ...credentials, companyCode: e.target.value.toUpperCase() })}
                    disabled={loading}
                  />
                </div>
                {errors.companyCode && <span className="form-error">{errors.companyCode}</span>}
                <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 4 }}>
                  Not required for Master Admin (patilparth127@gmail.com)
                </p>
              </div>

              <button
                className="btn btn-primary-email btn-lg w-full"
                type="submit"
                disabled={loading}
              >
                {loading ? <span className="spinner" /> : <LogIn size={18} />}
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>
          )}

          {activeTab === "google" && (
            <button
              className="btn btn-lg w-full"
              style={{
                background: "white",
                color: "var(--text-primary)",
                border: "1px solid var(--border)",
                marginBottom: 16,
              }}
              onClick={handleGoogleLogin}
              disabled={loading}
            >
              {loading ? <span className="spinner spinner-dark" /> : <LogIn size={18} />}
              {loading ? "Signing in..." : "Sign in with Google"}
            </button>
          )}

          <div style={{
            background: "var(--bg)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            padding: "16px",
            fontSize: "0.85rem",
            color: "var(--text-secondary)",
            display: "flex",
            gap: 12,
            alignItems: "flex-start",
          }}>
            <Shield size={18} style={{ flexShrink: 0, marginTop: 2, color: "var(--accent-email)" }} />
            <div>
              <strong style={{ display: "block", marginBottom: 4, color: "var(--text-primary)" }}>
                Demo Authentication
              </strong>
              This is a demo implementation. In production, this would use the actual Google OAuth 2.0 flow with proper token validation.
            </div>
          </div>

          <div style={{
            marginTop: 24,
            paddingTop: 16,
            borderTop: "1px solid var(--border-light)",
            textAlign: "center",
            fontSize: "0.8rem",
            color: "var(--text-muted)",
          }}>
            <p style={{ marginBottom: 4 }}>
              Authorized users can delete all contacts
            </p>
            <p style={{ fontWeight: 600, color: "var(--text-secondary)" }}>
              patilparth127@gmail.com
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
