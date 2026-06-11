import React, { useState } from "react";
import { LogIn, Mail, Lock, User as UserIcon } from "lucide-react";
import toast from "react-hot-toast";
import { login } from "../utils/api";
import { User } from "../types";

interface Props {
  onLogin: (user: User) => void;
}

export default function Login({ onLogin }: Props) {
  const [loading, setLoading] = useState(false);
  const [credentials, setCredentials] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    const errs: Record<string, string> = {};
    if (!credentials.email.trim()) errs.email = "Email is required";
    if (!credentials.password.trim()) errs.password = "Password is required";
    
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }

    setLoading(true);
    try {
      const response = await login({
        email: credentials.email,
        password: credentials.password,
      });
      
      if (response.success && response.user) {
        localStorage.setItem("userEmail", response.user.email);
        localStorage.setItem("userName", response.user.name);
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

          <form onSubmit={handlePasswordLogin}>
            <div style={{ marginBottom: 16 }}>
              <label className="form-label">Email</label>
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
                  type="email"
                  style={{ paddingLeft: 40 }}
                  placeholder="Enter your email"
                  value={credentials.email}
                  onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
                  disabled={loading}
                />
              </div>
              {errors.email && <span className="form-error">{errors.email}</span>}
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

            <button
              className="btn btn-primary-email btn-lg w-full"
              type="submit"
              disabled={loading}
            >
              {loading ? <span className="spinner" /> : <LogIn size={18} />}
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
