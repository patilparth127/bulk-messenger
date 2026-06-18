const express = require("express");
const cors = require("cors");
const multer = require("multer");
const xlsx = require("xlsx");
const nodemailer = require("nodemailer");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");
const path = require("path");
const { Client, LocalAuth, List } = require("whatsapp-web.js");
const qrcode = require("qrcode");

const app = express();
const PORT = 3200;
const DB_PATH = path.join(__dirname, "db.json");

// ─── Static Admin Configuration ───────────────────────────────────
const ADMIN_EMAIL = "admin@gmail.com";
const ADMIN_PASSWORD = "admin";

// ─── Middleware ───────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ─── Multer (memory storage for Excel) ──────────────────────
const upload = multer({ storage: multer.memoryStorage() });

// ─── Enums (mirrored in frontend) ────────────────────────────
const Gender = { MALE: "male", FEMALE: "female", OTHER: "other" };
const SendStatus = { PENDING: "pending", SENT: "sent", FAILED: "failed" };
const PortalType = { EMAIL: "email", WHATSAPP: "whatsapp" };
const ContactStatus = { ACTIVE: "active", INACTIVE: "inactive", DUMP: "dump" };
const MessageType = { INTERACTIVE_TEMPLATE: "interactive_template", MEDIA_MESSAGE: "media_message" };
const MediaType = { IMAGE: "image", VIDEO: "video", DOCUMENT: "document", AUDIO: "audio" };

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
      settings: [],
      sites: [],
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
    db.settings = db.settings || [];
    db.sites = db.sites || [];
    writeDB(db);
  }
}
ensureDB();


// ─── Authentication Endpoints ───────────────────────────────────
// POST /api/auth/login - Static credentials login
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    return res.json({
      success: true,
      user: {
        email: ADMIN_EMAIL,
        name: "Admin",
        isAdmin: true,
      },
    });
  }

  return res.status(401).json({ error: "Invalid credentials" });
});

// POST /api/auth/logout
app.post("/api/auth/logout", (req, res) => {
  res.json({ success: true, message: "Logged out successfully" });
});


// ─── Settings Endpoints ─────────────────────────────────────────
// GET /api/settings
app.get("/api/settings", (req, res) => {
  const db = readDB();
  
  // Get or create default settings
  let settings = db.settings[0];
  if (!settings) {
    settings = {
      id: uuidv4(),
      userId: null,
      whatsappDelay: {
        id: uuidv4(),
        type: "whatsapp",
        delayMs: 2000,
        randomDelayMin: 1000,
        randomDelayMax: 3000,
        batchSize: 10,
        enabled: false,
        updatedAt: new Date().toISOString(),
      },
      emailDelay: {
        id: uuidv4(),
        type: "email",
        delayMs: 1000,
        randomDelayMin: 500,
        randomDelayMax: 2000,
        batchSize: 50,
        enabled: false,
        updatedAt: new Date().toISOString(),
      },
      updatedAt: new Date().toISOString(),
    };
    db.settings.push(settings);
    writeDB(db);
  }

  res.json(settings);
});

// PUT /api/settings
app.put("/api/settings", (req, res) => {
  const db = readDB();
  
  if (db.settings.length === 0) {
    return res.status(404).json({ error: "Settings not found" });
  }

  const updatedSettings = { ...db.settings[0], ...req.body, updatedAt: new Date().toISOString() };
  db.settings[0] = updatedSettings;
  writeDB(db);

  res.json(updatedSettings);
});

// PUT /api/settings/delay/:type
app.put("/api/settings/delay/:type", (req, res) => {
  const { type } = req.params;
  const validTypes = ["whatsapp", "email"];
  
  if (!validTypes.includes(type)) {
    return res.status(400).json({ error: "Invalid delay type" });
  }

  const db = readDB();
  
  if (db.settings.length === 0) {
    return res.status(404).json({ error: "Settings not found" });
  }

  const delayKey = `${type}Delay`;
  const updatedDelay = { 
    ...db.settings[0][delayKey], 
    ...req.body, 
    updatedAt: new Date().toISOString() 
  };
  
  db.settings[0][delayKey] = updatedDelay;
  db.settings[0].updatedAt = new Date().toISOString();
  writeDB(db);

  res.json(updatedDelay);
});

// ─── WhatsApp Setup ───────────────────────────────────────────
let waReady = false;
let waLastQr = null;
let waLastQrDataUrl = null;
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

waClient.on("qr", async (qr) => {
  waReady = false;
  waStatus = "QR_RECEIVED";
  waLastQr = qr;
  console.log("📲 Scan WhatsApp QR");
  // Generate QR code as data URL for web display
  try {
    waLastQrDataUrl = await qrcode.toDataURL(qr);
  } catch (error) {
    console.error("Failed to generate QR code data URL:", error);
  }
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
// SITES
// ═══════════════════════════════════════════════════════════════

// GET /api/sites
app.get("/api/sites", (req, res) => {
  const db = readDB();
  res.json(db.sites);
});

// POST /api/sites
app.post("/api/sites", (req, res) => {
  const { name, code, address, city, state, country, phone } = req.body;

  if (!name || !code) {
    return res.status(400).json({ error: "Name and Code are required" });
  }

  const db = readDB();

  // Check if code is unique
  if (db.sites.some(s => s.code === code)) {
    return res.status(400).json({ error: "Site code must be unique" });
  }

  const site = {
    id: uuidv4(),
    name: String(name).trim(),
    code: String(code).trim().toUpperCase(),
    address: address ? String(address).trim() : "",
    city: city ? String(city).trim() : "",
    state: state ? String(state).trim() : "",
    country: country ? String(country).trim() : "",
    phone: phone ? String(phone).trim() : "",
    createdAt: new Date().toISOString(),
  };

  db.sites.push(site);
  writeDB(db);

  res.status(201).json(site);
});

// PUT /api/sites/:id
app.put("/api/sites/:id", (req, res) => {
  const { name, code, address, city, state, country, phone } = req.body;

  if (!name || !code) {
    return res.status(400).json({ error: "Name and Code are required" });
  }

  const db = readDB();
  const idx = db.sites.findIndex((s) => s.id === req.params.id);

  if (idx === -1) {
    return res.status(404).json({ error: "Site not found" });
  }

  // Check if code is unique (excluding current site)
  if (db.sites.some(s => s.code === code && s.id !== req.params.id)) {
    return res.status(400).json({ error: "Site code must be unique" });
  }

  db.sites[idx] = {
    ...db.sites[idx],
    name: String(name).trim(),
    code: String(code).trim().toUpperCase(),
    address: address ? String(address).trim() : "",
    city: city ? String(city).trim() : "",
    state: state ? String(state).trim() : "",
    country: country ? String(country).trim() : "",
    phone: phone ? String(phone).trim() : "",
  };

  writeDB(db);
  res.json(db.sites[idx]);
});

// DELETE /api/sites/:id
app.delete("/api/sites/:id", (req, res) => {
  const db = readDB();
  const idx = db.sites.findIndex((s) => s.id === req.params.id);

  if (idx === -1) {
    return res.status(404).json({ error: "Site not found" });
  }

  // Check if site has contacts
  const hasContacts = db.contacts.some(c => c.siteId === req.params.id);
  if (hasContacts) {
    return res.status(400).json({ error: "Cannot delete site with associated contacts" });
  }

  db.sites.splice(idx, 1);
  writeDB(db);

  res.json({ success: true });
});

// ═══════════════════════════════════════════════════════════════
// CONTACTS
// ═══════════════════════════════════════════════════════════════

// GET /api/contacts
app.get("/api/contacts", (req, res) => {
  const db = readDB();
  const { siteId } = req.query;
  
  let contacts = db.contacts;
  
  // Filter by siteId if provided
  if (siteId && siteId !== "all") {
    contacts = contacts.filter(c => c.siteId === siteId);
  }
  
  res.json(contacts);
});

// POST /api/contacts (single)
app.post("/api/contacts", (req, res) => {
  const { name, email, phone, gender, siteId } = req.body;

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
    status: ContactStatus.ACTIVE,
    siteId: siteId || null,
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

// PATCH /api/contacts/:id/status - Update contact status
app.patch("/api/contacts/:id/status", (req, res) => {
  const { status } = req.body;
  
  if (!status || !Object.values(ContactStatus).includes(status)) {
    return res.status(400).json({ error: "Invalid status. Must be active, inactive, or dump" });
  }

  const db = readDB();
  const idx = db.contacts.findIndex((c) => c.id === req.params.id);

  if (idx === -1) {
    return res.status(404).json({ error: "Contact not found" });
  }

  db.contacts[idx].status = status;
  writeDB(db);
  res.json(db.contacts[idx]);
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
        status: ContactStatus.ACTIVE,
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
    siteId,
  } = req.body;

  if (!subject || !body || !fromEmail || !fromPassword || !contactIds?.length) {
    return res.status(400).json({
      error: "subject, body, fromEmail, fromPassword, and contactIds are required.",
    });
  }

  const db = readDB();
  let targets = db.contacts.filter((c) => contactIds.includes(c.id));

  // Filter by siteId if provided (and not "all")
  if (siteId && siteId !== "all") {
    targets = targets.filter(c => c.siteId === siteId);
  }

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

  // Get delay settings
  const settings = db.settings[0];
  const emailDelaySettings = settings?.emailDelay || {
    delayMs: 1000,
    randomDelayMin: 500,
    randomDelayMax: 2000,
    enabled: false,
  };

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

      // Apply delay based on settings
      if (emailDelaySettings.enabled) {
        const randomDelay = emailDelaySettings.randomDelayMin + Math.random() * (emailDelaySettings.randomDelayMax - emailDelaySettings.randomDelayMin);
        await delay(emailDelaySettings.delayMs + randomDelay);
      }

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
    qrDataUrl: waLastQrDataUrl,
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

app.post("/api/whatsapp-logout", async (req, res) => {
  try {
    waReady = false;
    waStatus = "LOGGING_OUT";
    waLastQr = null;
    waLastQrDataUrl = null;

    await waClient.logout();

    waStatus = "LOGGED_OUT";
    
    // Reinitialize the client to generate a new QR code
    waStatus = "REINITIALIZING";
    waClient.initialize();

    res.json({ success: true, message: "WhatsApp logged out successfully" });
  } catch (err) {
    waStatus = "LOGOUT_FAILED";
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
  const { message, contactIds, hasReplyButtons, replyOptions, siteId } = req.body;

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
  let targets = db.contacts.filter((c) => contactIds.includes(c.id) && c.phone);

  // Filter by siteId if provided (and not "all")
  if (siteId && siteId !== "all") {
    targets = targets.filter(c => c.siteId === siteId);
  }

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
    hasReplyButtons: hasReplyButtons || false,
    replyOptions: hasReplyButtons && replyOptions ? replyOptions : undefined,
  };

  db.whatsapp_campaigns.push(campaign);
  writeDB(db);

  const logs = [];

  // Get delay settings
  const settings = db.settings[0];
  const waDelaySettings = settings?.whatsappDelay || {
    delayMs: 2000,
    randomDelayMin: 1000,
    randomDelayMax: 3000,
    enabled: false,
  };

  for (const contact of targets) {
    try {
      const finalMsg = message.replace(/\{name\}/gi, contact.name);
      await sendWhatsAppMessage(contact.phone, finalMsg);
      
      // Apply delay based on settings
      if (waDelaySettings.enabled) {
        const randomDelay = waDelaySettings.randomDelayMin + Math.random() * (waDelaySettings.randomDelayMax - waDelaySettings.randomDelayMin);
        await delay(waDelaySettings.delayMs + randomDelay);
      } else {
        await delay(2000); // Default delay
      }

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
  console.log(`   GET  /api/email-campaigns`);
  console.log(`   GET  /api/whatsapp-campaigns\n`);
});