const express = require("express");
const cors = require("cors");
const multer = require("multer");
const xlsx = require("xlsx");
const nodemailer = require("nodemailer");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");
const path = require("path");
const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");

const app = express();
const PORT = 3200;
const DB_PATH = path.join(__dirname, "db.json");

// ─── Middleware ───────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ─── Multer (memory storage for Excel) ──────────────────────
const upload = multer({ storage: multer.memoryStorage() });

// ─── Enums (mirrored in frontend) ────────────────────────────
const Gender = { MALE: "male", FEMALE: "female", OTHER: "other" };
const SendStatus = { PENDING: "pending", SENT: "sent", FAILED: "failed" };
const PortalType = { EMAIL: "email", WHATSAPP: "whatsapp" };

// ─── DB Helpers ───────────────────────────────────────────────
function readDB() {
  const raw = fs.readFileSync(DB_PATH, "utf8");
  return JSON.parse(raw);
}

function writeDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// ─── Safe DB init ─────────────────────────────────────────────
function ensureDB() {
  if (!fs.existsSync(DB_PATH)) {
    const initialDB = {
      contacts: [],
      upload_sessions: [],
      email_campaigns: [],
      email_logs: [],
      whatsapp_campaigns: [],
      whatsapp_logs: [],
    };
    writeDB(initialDB);
  } else {
    const db = readDB();
    db.contacts = db.contacts || [];
    db.upload_sessions = db.upload_sessions || [];
    db.email_campaigns = db.email_campaigns || [];
    db.email_logs = db.email_logs || [];
    db.whatsapp_campaigns = db.whatsapp_campaigns || [];
    db.whatsapp_logs = db.whatsapp_logs || [];
    writeDB(db);
  }
}
ensureDB();

// ─── WhatsApp Setup ───────────────────────────────────────────
let waReady = false;
let waLastQr = null;
let waStatus = "INITIALIZING";
let waLastError = null;

const waClient = new Client({
  authStrategy: new LocalAuth({
    clientId: "bulk-messenger",
  }),
  takeoverOnConflict: true,
  takeoverTimeoutMs: 10000,
  authTimeoutMs: 60000,
  qrMaxRetries: 5,
  puppeteer: {
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
  },
});

waClient.on("qr", (qr) => {
  waReady = false;
  waStatus = "QR_RECEIVED";
  waLastQr = qr;
  console.log("📲 Scan WhatsApp QR");
  qrcode.generate(qr, { small: true });
});

waClient.on("authenticated", () => {
  waStatus = "AUTHENTICATED";
  waLastError = null;
  console.log("🔐 WhatsApp authenticated");
});

waClient.on("ready", async () => {
  waReady = true;
  waStatus = "READY";
  waLastError = null;
  console.log("✅ WhatsApp Ready!");
  try {
    const state = await waClient.getState();
    console.log("📶 WhatsApp state:", state);
  } catch (err) {
    console.log("⚠️ Could not read WA state:", err.message);
  }
});

waClient.on("auth_failure", (msg) => {
  waReady = false;
  waStatus = "AUTH_FAILURE";
  waLastError = msg || "Authentication failed";
  console.error("❌ WhatsApp auth failure:", msg);
});

waClient.on("disconnected", (reason) => {
  waReady = false;
  waStatus = "DISCONNECTED";
  waLastError = String(reason || "Disconnected");
  console.error("❌ WhatsApp disconnected:", reason);
});

waClient.on("change_state", (state) => {
  waStatus = state || waStatus;
  console.log("🔄 WhatsApp state changed:", state);
});

waClient.initialize().catch((err) => {
  waReady = false;
  waStatus = "INIT_FAILED";
  waLastError = err.message;
  console.error("❌ WhatsApp initialize failed:", err.message);
});

// ─── Helpers ──────────────────────────────────────────────────
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

function normalizeIndianNumber(number) {
  let n = String(number || "").replace(/\D/g, "");

  if (!n) return "";
  if (n.startsWith("0")) n = n.slice(1);
  if (n.length === 10) n = `91${n}`;

  return n;
}

async function getWhatsAppRuntimeState() {
  try {
    return await waClient.getState();
  } catch (err) {
    return null;
  }
}

async function sendWhatsAppMessage(number, message) {
  if (!waReady) {
    throw new Error("WhatsApp client not ready");
  }

  const normalized = normalizeIndianNumber(number);
  if (!normalized) {
    throw new Error("Invalid phone number");
  }

  const numberId = await waClient.getNumberId(normalized);
  if (!numberId || !numberId._serialized) {
    throw new Error(`Number WhatsApp par registered nahi hai: ${number}`);
  }

  return waClient.sendMessage(numberId._serialized, message);
}

// ═══════════════════════════════════════════════════════════════
// CONTACTS
// ═══════════════════════════════════════════════════════════════

// GET /api/contacts
app.get("/api/contacts", (req, res) => {
  const db = readDB();
  res.json(db.contacts);
});

// POST /api/contacts (single)
app.post("/api/contacts", (req, res) => {
  const { name, email, phone, gender } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: "Name and Email are required" });
  }

  const db = readDB();

  const contact = {
    id: uuidv4(),
    name: String(name).trim(),
    email: String(email).trim().toLowerCase(),
    phone: phone ? String(phone).trim() : "",
    gender: gender || Gender.OTHER,
    createdAt: new Date().toISOString(),
    emailSentCount: 0,
    whatsappSentCount: 0,
    lastEmailSentAt: null,
    lastWhatsappSentAt: null,
  };

  db.contacts.push(contact);
  writeDB(db);

  res.status(201).json(contact);
});

// DELETE /api/contacts/:id
app.delete("/api/contacts/:id", (req, res) => {
  const db = readDB();
  const idx = db.contacts.findIndex((c) => c.id === req.params.id);

  if (idx === -1) {
    return res.status(404).json({ error: "Contact not found" });
  }

  db.contacts.splice(idx, 1);
  writeDB(db);
  res.json({ success: true });
});

// DELETE /api/contacts (all)
app.delete("/api/contacts", (req, res) => {
  const db = readDB();
  db.contacts = [];
  writeDB(db);
  res.json({ success: true, message: "All contacts deleted" });
});

// ═══════════════════════════════════════════════════════════════
// EXCEL UPLOAD
// ═══════════════════════════════════════════════════════════════

// POST /api/upload-excel
app.post("/api/upload-excel", upload.single("file"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet, { defval: "" });

    if (rows.length === 0) {
      return res.status(400).json({ error: "Excel file is empty" });
    }

    const db = readDB();
    const imported = [];
    const errors = [];

    rows.forEach((row, i) => {
      const name =
        row["Name"] || row["name"] || row["NAME"] || row["Full Name"] || "";

      const email =
        row["Email"] ||
        row["email"] ||
        row["EMAIL"] ||
        row["Email Address"] ||
        "";

      const phone =
        row["Phone"] ||
        row["phone"] ||
        row["PHONE"] ||
        row["Mobile"] ||
        row["Number"] ||
        row["number"] ||
        String(row["Phone Number"] || "") ||
        "";

      const gender =
        row["Gender"] || row["gender"] || row["GENDER"] || Gender.OTHER;

      if (!name || !email) {
        errors.push({ row: i + 2, reason: "Missing Name or Email" });
        return;
      }

      const exists = db.contacts.find(
        (c) => c.email === String(email).trim().toLowerCase()
      );

      if (exists) {
        errors.push({ row: i + 2, reason: `Duplicate email: ${email}` });
        return;
      }

      const contact = {
        id: uuidv4(),
        name: String(name).trim(),
        email: String(email).trim().toLowerCase(),
        phone: String(phone).trim(),
        gender: Object.values(Gender).includes(String(gender).toLowerCase())
          ? String(gender).toLowerCase()
          : Gender.OTHER,
        createdAt: new Date().toISOString(),
        emailSentCount: 0,
        whatsappSentCount: 0,
        lastEmailSentAt: null,
        lastWhatsappSentAt: null,
      };

      db.contacts.push(contact);
      imported.push(contact);
    });

    const session = {
      id: uuidv4(),
      fileName: req.file.originalname,
      totalRows: rows.length,
      importedCount: imported.length,
      errorCount: errors.length,
      errors,
      uploadedAt: new Date().toISOString(),
    };

    db.upload_sessions.push(session);
    writeDB(db);

    res.json({
      success: true,
      session,
      contacts: imported,
    });
  } catch (err) {
    console.error("Excel parse error:", err);
    res.status(500).json({ error: "Failed to parse Excel file: " + err.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// EMAIL CAMPAIGNS
// ═══════════════════════════════════════════════════════════════

// GET /api/email-campaigns
app.get("/api/email-campaigns", (req, res) => {
  const db = readDB();
  res.json(db.email_campaigns);
});

// POST /api/email-campaigns/send
app.post("/api/email-campaigns/send", async (req, res) => {
  const {
    subject,
    body,
    fromEmail,
    fromPassword,
    smtpHost,
    smtpPort,
    contactIds,
  } = req.body;

  if (!subject || !body || !fromEmail || !fromPassword || !contactIds?.length) {
    return res.status(400).json({
      error: "subject, body, fromEmail, fromPassword, and contactIds are required",
    });
  }

  const db = readDB();
  const targets = db.contacts.filter((c) => contactIds.includes(c.id));

  if (targets.length === 0) {
    return res.status(400).json({ error: "No valid contacts found" });
  }

  const campaign = {
    id: uuidv4(),
    subject,
    body,
    fromEmail,
    smtpHost: smtpHost || "smtp.gmail.com",
    smtpPort: smtpPort || 587,
    totalTargets: targets.length,
    sentCount: 0,
    failedCount: 0,
    status: SendStatus.PENDING,
    createdAt: new Date().toISOString(),
    completedAt: null,
    logs: [],
  };

  db.email_campaigns.push(campaign);
  writeDB(db);

  let transporter;
  try {
    transporter = nodemailer.createTransport({
      host: smtpHost || "smtp.gmail.com",
      port: smtpPort || 587,
      secure: false,
      auth: { user: fromEmail, pass: fromPassword },
      tls: { rejectUnauthorized: false },
    });
  } catch (err) {
    const dbUpdated = readDB();
    const camp = dbUpdated.email_campaigns.find((c) => c.id === campaign.id);
    if (camp) {
      camp.status = SendStatus.FAILED;
      writeDB(dbUpdated);
    }
    return res.status(500).json({
      error: "Failed to create email transporter: " + err.message,
    });
  }

  const logs = [];

  for (const contact of targets) {
    const log = {
      id: uuidv4(),
      campaignId: campaign.id,
      contactId: contact.id,
      contactName: contact.name,
      contactEmail: contact.email,
      status: SendStatus.PENDING,
      sentAt: null,
      error: null,
    };

    try {
      await transporter.sendMail({
        from: `"Bulk Mailer" <${fromEmail}>`,
        to: contact.email,
        subject,
        html: body.replace(/\{name\}/gi, contact.name),
      });

      log.status = SendStatus.SENT;
      log.sentAt = new Date().toISOString();

      const dbNow = readDB();
      const c = dbNow.contacts.find((x) => x.id === contact.id);
      if (c) {
        c.emailSentCount = (c.emailSentCount || 0) + 1;
        c.lastEmailSentAt = log.sentAt;
        writeDB(dbNow);
      }
    } catch (err) {
      log.status = SendStatus.FAILED;
      log.error = err.message;
    }

    logs.push(log);
  }

  const dbFinal = readDB();
  logs.forEach((l) => dbFinal.email_logs.push(l));

  const camp = dbFinal.email_campaigns.find((c) => c.id === campaign.id);
  if (camp) {
    camp.sentCount = logs.filter((l) => l.status === SendStatus.SENT).length;
    camp.failedCount = logs.filter((l) => l.status === SendStatus.FAILED).length;
    camp.status = SendStatus.SENT;
    camp.completedAt = new Date().toISOString();
    camp.logs = logs;
  }

  writeDB(dbFinal);

  res.json({
    success: true,
    campaignId: campaign.id,
    sentCount: logs.filter((l) => l.status === SendStatus.SENT).length,
    failedCount: logs.filter((l) => l.status === SendStatus.FAILED).length,
    logs,
  });
});

// GET /api/email-logs
app.get("/api/email-logs", (req, res) => {
  const db = readDB();
  res.json(db.email_logs);
});

// ═══════════════════════════════════════════════════════════════
// WHATSAPP STATUS
// ═══════════════════════════════════════════════════════════════

app.get("/api/whatsapp-status", async (req, res) => {
  const state = await getWhatsAppRuntimeState();

  res.json({
    waReady,
    waStatus,
    state,
    hasQr: !!waLastQr,
    lastError: waLastError,
  });
});

app.post("/api/whatsapp-reset", async (req, res) => {
  try {
    waReady = false;
    waStatus = "RESETTING";

    await waClient.destroy();

    waStatus = "REINITIALIZING";
    waClient.initialize();

    res.json({ success: true, message: "WhatsApp client reset triggered" });
  } catch (err) {
    waStatus = "RESET_FAILED";
    waLastError = err.message;
    res.status(500).json({ error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// WHATSAPP CAMPAIGNS
// ═══════════════════════════════════════════════════════════════

// GET /api/whatsapp-campaigns
app.get("/api/whatsapp-campaigns", (req, res) => {
  const db = readDB();
  res.json(db.whatsapp_campaigns);
});

// POST /api/whatsapp-campaigns/send
app.post("/api/whatsapp-campaigns/send", async (req, res) => {
  const { message, contactIds } = req.body;

  if (!message || !contactIds?.length) {
    return res.status(400).json({ error: "message and contactIds are required" });
  }

  const state = await getWhatsAppRuntimeState();
  if (!waReady || !state || ["OPENING", "PAIRING", "TIMEOUT", "CONFLICT", "UNPAIRED", "UNPAIRED_IDLE"].includes(state)) {
    return res.status(400).json({
      error: "WhatsApp not ready. Please connect WhatsApp first.",
      waReady,
      waStatus,
      state,
      lastError: waLastError,
    });
  }

  const db = readDB();
  const targets = db.contacts.filter((c) => contactIds.includes(c.id) && c.phone);

  if (targets.length === 0) {
    return res.status(400).json({
      error: "No contacts with valid phone numbers found",
    });
  }

  const campaign = {
    id: uuidv4(),
    message,
    totalTargets: targets.length,
    sentCount: 0,
    failedCount: 0,
    status: SendStatus.PENDING,
    createdAt: new Date().toISOString(),
    completedAt: null,
    logs: [],
  };

  db.whatsapp_campaigns.push(campaign);
  writeDB(db);

  const logs = [];

  for (const contact of targets) {
    try {
      const finalMsg = message.replace(/\{name\}/gi, contact.name);
      await sendWhatsAppMessage(contact.phone, finalMsg);
      await delay(2000);

      const sentAt = new Date().toISOString();

      logs.push({
        id: uuidv4(),
        campaignId: campaign.id,
        contactId: contact.id,
        contactName: contact.name,
        contactPhone: contact.phone,
        message: finalMsg,
        status: SendStatus.SENT,
        sentAt,
        error: null,
      });

      const dbNow = readDB();
      const c = dbNow.contacts.find((x) => x.id === contact.id);
      if (c) {
        c.whatsappSentCount = (c.whatsappSentCount || 0) + 1;
        c.lastWhatsappSentAt = sentAt;
        writeDB(dbNow);
      }
    } catch (err) {
      logs.push({
        id: uuidv4(),
        campaignId: campaign.id,
        contactId: contact.id,
        contactName: contact.name,
        contactPhone: contact.phone,
        message,
        status: SendStatus.FAILED,
        sentAt: null,
        error: err.message,
      });
    }
  }

  const dbFinal = readDB();
  logs.forEach((l) => dbFinal.whatsapp_logs.push(l));

  const camp = dbFinal.whatsapp_campaigns.find((c) => c.id === campaign.id);
  if (camp) {
    camp.sentCount = logs.filter((l) => l.status === SendStatus.SENT).length;
    camp.failedCount = logs.filter((l) => l.status === SendStatus.FAILED).length;
    camp.status = SendStatus.SENT;
    camp.completedAt = new Date().toISOString();
    camp.logs = logs;
  }

  writeDB(dbFinal);

  res.json({
    success: true,
    campaignId: campaign.id,
    sentCount: camp ? camp.sentCount : 0,
    failedCount: camp ? camp.failedCount : 0,
    logs,
  });
});

// GET /api/whatsapp-logs
app.get("/api/whatsapp-logs", (req, res) => {
  const db = readDB();
  res.json(db.whatsapp_logs);
});

// ═══════════════════════════════════════════════════════════════
// UPLOAD SESSIONS
// ═══════════════════════════════════════════════════════════════
app.get("/api/upload-sessions", (req, res) => {
  const db = readDB();
  res.json(db.upload_sessions);
});

// ═══════════════════════════════════════════════════════════════
//  SMS CAMPAIGNS — ADB (Android USB, Free, Your SIM)
// ═══════════════════════════════════════════════════════════════

const { execSync, exec } = require("child_process");

// ── Helper: check ADB device connected ───────────────────────
function getAdbDevice() {
  try {
    const out = execSync('"C:\\adb\\adb.exe" devices', {
      timeout: 5000,
    }).toString();

    const lines = out
      .split("\n")
      .filter((l) => l.includes("\tdevice"));

    return lines.length > 0
      ? lines[0].split("\t")[0].trim()
      : null;
  } catch (err) {
    console.error("ADB Error:", err.message);
    return null;
  }
}

// ── Helper: send single SMS via ADB ──────────────────────────
const ADB = "C:\\adb\\adb.exe";

function sendSmsViaAdb(phone, message) {
  return new Promise((resolve) => {

    const adb = `"C:\\adb\\adb.exe"`;

    const cmd =
      `${adb} shell am start ` +
      `-a android.intent.action.SENDTO ` +
      `-d sms:${phone} ` +
      `--es sms_body "${message}"`;

    exec(cmd, (err) => {
      if (err) {
        resolve({
          success: false,
          error: err.message,
        });   
        resolve({
          success: true,
        });
      }
    });
  });
}

// ── Helper: format phone to E.164 ────────────────────────────
function formatPhone(phone) {
  let p = String(phone).replace(/\D/g, "");
  if (p.length === 10) return "+91" + p;
  if (p.length === 12 && p.startsWith("91")) return "+" + p;
  if (p.startsWith("+")) return phone.replace(/\s/g, "");
  return "+" + p;
}

// GET /api/sms/adb-status  — check if phone connected
app.get("/api/sms/adb-status", (req, res) => {
  const device = getAdbDevice();
  res.json({
    connected: !!device,
    device: device || null,
    message: device ? `Device connected: ${device}` : "No Android device found. Connect phone via USB with USB Debugging ON.",
  });
});

// GET /api/sms-campaigns
app.get("/api/sms-campaigns", (req, res) => {
  const db = readDB();
  res.json(db.sms_campaigns || []);
});

// GET /api/sms-logs
app.get("/api/sms-logs", (req, res) => {
  const db = readDB();
  res.json(db.sms_logs || []);
});

// POST /api/sms-campaigns/send
app.post("/api/sms-campaigns/send", async (req, res) => {
  const { template, contactIds } = req.body;

  if (!template || !template.trim()) {
    return res.status(400).json({ error: "SMS template is required" });
  }
  if (!contactIds || !contactIds.length) {
    return res.status(400).json({ error: "Select at least one contact" });
  }

  // Check ADB device
  const device = getAdbDevice();
  if (!device) {
    return res.status(400).json({
      error: "No Android device connected. Please connect your phone via USB and enable USB Debugging in Developer Options.",
    });
  }

  const db = readDB();
  const targets = db.contacts.filter(
    (c) => contactIds.includes(c.id) && c.phone && c.phone.trim()
  );

  if (targets.length === 0) {
    return res.status(400).json({ error: "No contacts with valid phone numbers found" });
  }

  // Create campaign
  const campaign = {
    id: uuidv4(),
    template,
    device,
    totalTargets: targets.length,
    sentCount: 0,
    failedCount: 0,
    status: "pending",
    createdAt: new Date().toISOString(),
    completedAt: null,
    logs: [],
  };

  if (!db.sms_campaigns) db.sms_campaigns = [];
  db.sms_campaigns.push(campaign);
  writeDB(db);

  const logs = [];

  for (const contact of targets) {
    const phone = formatPhone(contact.phone);

    // Build personalized message from template
    const message = template
      .replace(/\{name\}/gi, contact.name)
      .replace(/\{phone\}/gi, contact.phone)
      .replace(/\{email\}/gi, contact.email || "");

    const log = {
      id: uuidv4(),
      campaignId: campaign.id,
      contactId: contact.id,
      contactName: contact.name,
      contactPhone: phone,
      message,
      status: "pending",
      sentAt: null,
      error: null,
    };

    const result = await sendSmsViaAdb(phone, message);

    if (result.success) {
      log.status = "sent";
      log.sentAt = new Date().toISOString();

      const dbNow = readDB();
      const c = dbNow.contacts.find((x) => x.id === contact.id);
      if (c) {
        c.smsSentCount = (c.smsSentCount || 0) + 1;
        c.lastSmsSentAt = log.sentAt;
        writeDB(dbNow);
      }
    } else {
      log.status = "failed";
      log.error = result.error;
    }

    logs.push(log);

    // Small delay between SMS to avoid rate limiting by Android
    await new Promise((r) => setTimeout(r, 600));
  }

  // Finalize
  const dbFinal = readDB();
  if (!dbFinal.sms_logs) dbFinal.sms_logs = [];
  logs.forEach((l) => dbFinal.sms_logs.push(l));

  const camp = dbFinal.sms_campaigns.find((c) => c.id === campaign.id);
  if (camp) {
    camp.sentCount = logs.filter((l) => l.status === "sent").length;
    camp.failedCount = logs.filter((l) => l.status === "failed").length;
    camp.status = "sent";
    camp.completedAt = new Date().toISOString();
    camp.logs = logs;
  }
  writeDB(dbFinal);

  res.json({
    success: true,
    campaignId: campaign.id,
    device,
    sentCount: logs.filter((l) => l.status === "sent").length,
    failedCount: logs.filter((l) => l.status === "failed").length,
    logs,
  });
});

// ─── Health ──────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`\n🚀 Bulk Messenger API running on http://localhost:${PORT}`);
  console.log(`📋 Endpoints:`);
  console.log(`   GET  /api/health`);
  console.log(`   GET  /api/contacts`);
  console.log(`   POST /api/contacts`);
  console.log(`   POST /api/upload-excel`);
  console.log(`   POST /api/email-campaigns/send`);
  console.log(`   GET  /api/email-campaigns`);
  console.log(`   GET  /api/email-logs`);
  console.log(`   GET  /api/whatsapp-status`);
  console.log(`   POST /api/whatsapp-reset`);
  console.log(`   POST /api/whatsapp-campaigns/send`);
  console.log(`   GET  /api/whatsapp-campaigns`);
  console.log(`   GET  /api/whatsapp-logs\n`);
  console.log(`   POST /api/sms-campaigns/send`);
  console.log(`   GET  /api/sms-campaigns`);
  console.log(`   GET  /api/email-campaigns`);
  console.log(`   GET  /api/whatsapp-campaigns\n`);
});