import React, { useState, useEffect } from "react";
import { Settings as SettingsIcon, Clock, Zap, Save, Mail, MessageCircle } from "lucide-react";
import toast from "react-hot-toast";
import { AppSettings, DelaySettings } from "../types";
import { getSettings, updateDelaySettings } from "../utils/api";

export default function Settings() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"whatsapp" | "email">("whatsapp");

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await getSettings();
      setSettings(data);
    } catch (error) {
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (type: "whatsapp" | "email") => {
    if (!settings) return;

    setSaving(true);
    try {
      const delayKey = `${type}Delay` as keyof AppSettings;
      const delaySettings = settings[delayKey] as DelaySettings;
      
      await updateDelaySettings(type, delaySettings);
      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} delay settings saved`);
      await loadSettings();
    } catch (error) {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const updateDelaySetting = (type: "whatsapp" | "email", field: keyof DelaySettings, value: any) => {
    if (!settings) return;
    
    const delayKey = `${type}Delay` as keyof AppSettings;
    const currentDelay = { ...settings[delayKey] as DelaySettings };
    (currentDelay as any)[field] = value;
    
    setSettings({
      ...settings,
      [delayKey]: currentDelay,
    });
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "60vh" }}>
        <span className="spinner spinner-dark" style={{ width: 32, height: 32 }} />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="empty-state">
        <div className="empty-icon">⚙️</div>
        <h3>Settings not available</h3>
      </div>
    );
  }

  const tabs = [
    { id: "whatsapp" as const, label: "WhatsApp", icon: <MessageCircle size={16} />, color: "var(--accent-wa)" },
    { id: "email" as const, label: "Email", icon: <Mail size={16} />, color: "var(--accent-email)" },
  ];

  const currentDelay = settings[`${activeTab}Delay` as keyof AppSettings] as DelaySettings;

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Settings</h2>
          <p>Configure delay settings for bulk messaging</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab ${activeTab === tab.id ? "active-neutral" : ""}`}
            style={activeTab === tab.id ? { color: tab.color, borderBottomColor: tab.color } : {}}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Settings Form */}
      <div className="card" style={{ maxWidth: 600 }}>
        <div style={{ height: 4, borderRadius: "14px 14px 0 0", background: `linear-gradient(90deg, ${tabs.find(t => t.id === activeTab)?.color}, #a78bfa)` }} />
        <div className="card-header">
          <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {tabs.find(t => t.id === activeTab)?.icon}
            {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Delay Settings
          </h3>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <label className="form-label" style={{ margin: 0 }}>
              <input
                type="checkbox"
                checked={currentDelay.enabled}
                onChange={(e) => updateDelaySetting(activeTab, "enabled", e.target.checked)}
                style={{ marginRight: 6 }}
              />
              Enabled
            </label>
          </div>
        </div>
        <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{
            background: currentDelay.enabled ? "var(--accent-wa-light)" : "#f3f4f6",
            border: `1px solid ${currentDelay.enabled ? "var(--accent-wa-border)" : "var(--border)"}`,
            borderRadius: "var(--radius)",
            padding: "12px 16px",
            fontSize: "0.85rem",
            color: currentDelay.enabled ? "#166534" : "var(--text-secondary)",
            display: "flex",
            gap: 8,
            alignItems: "flex-start",
          }}>
            <Clock size={16} style={{ marginTop: 1, flexShrink: 0 }} />
            <div>
              <strong>Delay Configuration:</strong> Configure the delay between messages to avoid rate limiting. When enabled, the system will apply these delays automatically.
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">
                Base Delay (ms)
                <span className="text-muted" style={{ fontWeight: 400, marginLeft: 8 }}>
                  Fixed delay between messages
                </span>
              </label>
              <input
                className="form-input"
                type="number"
                min="0"
                step="100"
                value={currentDelay.delayMs}
                onChange={(e) => updateDelaySetting(activeTab, "delayMs", Number(e.target.value))}
                disabled={!currentDelay.enabled}
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                Random Delay Min (ms)
                <span className="text-muted" style={{ fontWeight: 400, marginLeft: 8 }}>
                  Minimum random addition
                </span>
              </label>
              <input
                className="form-input"
                type="number"
                min="0"
                step="100"
                value={currentDelay.randomDelayMin}
                onChange={(e) => updateDelaySetting(activeTab, "randomDelayMin", Number(e.target.value))}
                disabled={!currentDelay.enabled}
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                Random Delay Max (ms)
                <span className="text-muted" style={{ fontWeight: 400, marginLeft: 8 }}>
                  Maximum random addition
                </span>
              </label>
              <input
                className="form-input"
                type="number"
                min="0"
                step="100"
                value={currentDelay.randomDelayMax}
                onChange={(e) => updateDelaySetting(activeTab, "randomDelayMax", Number(e.target.value))}
                disabled={!currentDelay.enabled}
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                Batch Size
                <span className="text-muted" style={{ fontWeight: 400, marginLeft: 8 }}>
                  Messages per batch
                </span>
              </label>
              <input
                className="form-input"
                type="number"
                min="1"
                value={currentDelay.batchSize}
                onChange={(e) => updateDelaySetting(activeTab, "batchSize", Number(e.target.value))}
                disabled={!currentDelay.enabled}
              />
            </div>
          </div>

          <div style={{
            background: "var(--bg)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            padding: "12px 16px",
            fontSize: "0.82rem",
            color: "var(--text-secondary)",
          }}>
            <strong>Total delay per message:</strong> {currentDelay.delayMs}ms + random({currentDelay.randomDelayMin}ms - {currentDelay.randomDelayMax}ms) = {currentDelay.delayMs + (currentDelay.randomDelayMin + currentDelay.randomDelayMax) / 2}ms average
          </div>

          <button
            className="btn btn-lg w-full"
            style={{ background: tabs.find(t => t.id === activeTab)?.color, color: "white", borderColor: tabs.find(t => t.id === activeTab)?.color }}
            onClick={() => handleSave(activeTab)}
            disabled={saving}
          >
            {saving ? <span className="spinner" /> : <Save size={16} />}
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}
