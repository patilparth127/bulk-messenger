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

// ─── WhatsApp Cloud API Configuration ───────────────────────────
const WHATSAPP_CONFIG = {
  accessToken: process.env.WHATSAPP_ACCESS_TOKEN || "",
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || "",
  wabaId: process.env.WHATSAPP_WABA_ID || "",
  graphApiVersion: process.env.WHATSAPP_GRAPH_API_VERSION || "v20.0",
  webhookVerifyToken: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || "",
  webhookUrl: process.env.WHATSAPP_WEBHOOK_URL || "",
};

// ─── WhatsApp Cloud API Service Functions ───────────────────────
async function sendWhatsAppCloudMessage(to, messageType, templateName, templateVariables, media, buttons, ctaUrl) {
  try {
    const apiUrl = `https://graph.facebook.com/${WHATSAPP_CONFIG.graphApiVersion}/${WHATSAPP_CONFIG.phoneNumberId}/messages`;
    
    let payload = {
      messaging_product: "whatsapp",
      to: to,
      type: messageType === MessageType.INTERACTIVE_TEMPLATE ? "interactive" : messageType === MessageType.MEDIA_MESSAGE ? media?.type : "text",
    };

    if (messageType === MessageType.INTERACTIVE_TEMPLATE) {
      // Interactive Template Message
      payload.interactive = {
        type: "template",
        template: {
          name: templateName,
          language: { code: "en_US" },
          components: [],
        },
      };

      // Add header with media if provided
      if (media && media.mediaId) {
        payload.interactive.template.components.push({
          type: "header",
          parameters: [
            {
              type: media.type === MediaType.IMAGE ? "image" : media.type === MediaType.VIDEO ? "video" : "document",
              [media.type === MediaType.IMAGE ? "image" : media.type === MediaType.VIDEO ? "video" : "document"]: {
                id: media.mediaId,
              },
            },
          ],
        });
      }

      // Add body with variables
      if (templateVariables) {
        const bodyParams = Object.entries(templateVariables).map(([key, value]) => ({
          type: "text",
          text: value,
        }));
        payload.interactive.template.components.push({
          type: "body",
          parameters: bodyParams,
        });
      }

      // Add buttons
      if (buttons && buttons.length > 0) {
        const buttonParams = buttons.map((btn, index) => {
          if (btn.type === "QUICK_REPLY") {
            return {
              type: "quick_reply",
              quick_reply: {
                type: "quick_reply",
                payload: btn.payload || `button_${index}`,
              },
            };
          } else if (btn.type === "CTA_URL") {
            return {
              type: "action",
              action: {
                type: "open_url",
                url: btn.url,
              },
            };
          }
        });
        payload.interactive.template.components.push({
          type: "button",
          parameters: buttonParams,
        });
      }

    } else if (messageType === MessageType.MEDIA_MESSAGE) {
      // Media Message
      payload[media.type] = {
        link: media.url,
        caption: media.caption || "",
      };
    }

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${WHATSAPP_CONFIG.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error?.message || "WhatsApp Cloud API error");
    }

    return {
      success: true,
      messageId: result.messages?.[0]?.id,
      data: result,
    };
  } catch (error) {
    console.error("WhatsApp Cloud API Error:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

async function uploadMediaToWhatsApp(mediaFile) {
  try {
    const apiUrl = `https://graph.facebook.com/${WHATSAPP_CONFIG.graphApiVersion}/${WHATSAPP_CONFIG.phoneNumberId}/media`;
    
    const formData = new FormData();
    formData.append("file", mediaFile.buffer, {
      filename: mediaFile.originalname,
      contentType: mediaFile.mimetype,
    });
    formData.append("messaging_product", "whatsapp");
    formData.append("type", mediaFile.mimetype.startsWith("image") ? MediaType.IMAGE : 
                    mediaFile.mimetype.startsWith("video") ? MediaType.VIDEO : MediaType.DOCUMENT);

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${WHATSAPP_CONFIG.accessToken}`,
      },
      body: formData,
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error?.message || "Media upload error");
    }

    return {
      success: true,
      mediaId: result.id,
      data: result,
    };
  } catch (error) {
    console.error("Media Upload Error:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// ─── Middleware ───────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ─── Multer (memory storage for Excel) ──────────────────────
const upload = multer({ storage: multer.memoryStorage() });

// ─── Enums (mirrored in frontend) ────────────────────────────
const Gender = { MALE: "male", FEMALE: "female", OTHER: "other" };
const SendStatus = { PENDING: "pending", SENT: "sent", FAILED: "failed" };
const PortalType = { EMAIL: "email", WHATSAPP: "whatsapp" };
const UserRole = { ADMIN: "admin", USER: "user", VIEWER: "viewer" };
const AuthMethod = { GOOGLE: "google", USERNAME_PASSWORD: "username_password" };
const ContactStatus = { ACTIVE: "active", INACTIVE: "inactive", DUMP: "dump" };

// ─── SaaS Enums ───────────────────────────────────────────────
const SubscriptionStatus = { ACTIVE: "active", EXPIRED: "expired", SUSPENDED: "suspended", TRIAL: "trial", PENDING: "pending" };
const SubscriptionPlan = { FREE: "free", BASIC_MONTHLY: "basic_monthly", BASIC_YEARLY: "basic_yearly", PRO_MONTHLY: "pro_monthly", PRO_YEARLY: "pro_yearly", ENTERPRISE_MONTHLY: "enterprise_monthly", ENTERPRISE_YEARLY: "enterprise_yearly" };
const ProductType = { SMS: "sms", EMAIL: "email", WHATSAPP: "whatsapp" };
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
      sms_campaigns: [],
      sms_logs: [],
      users: [],
      settings: [],
      companies: [],
      subscriptions: [],
      webhook_events: [],
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
    db.sms_campaigns = db.sms_campaigns || [];
    db.sms_logs = db.sms_logs || [];
    db.users = db.users || [];
    db.settings = db.settings || [];
    db.companies = db.companies || [];
    db.subscriptions = db.subscriptions || [];
    db.webhook_events = db.webhook_events || [];
    writeDB(db);
  }
}
ensureDB();

// ─── Authentication Middleware ─────────────────────────────────
const AUTHORIZED_EMAIL = "patilparth127@gmail.com";

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "Authorization header required" });
  }
  // For demo purposes, we'll skip actual token validation
  // In production, verify JWT token here
  next();
}

// ─── Authentication Endpoints ───────────────────────────────────
// POST /api/auth/login - Username/Password login
app.post("/api/auth/login", (req, res) => {
  const { username, password, authMethod } = req.body;
  
  if (authMethod === AuthMethod.USERNAME_PASSWORD) {
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }

    const db = readDB();
    const user = db.users.find((u) => u.username === username);
    
    if (!user) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    // In production, use bcrypt to compare hashed passwords
    // For demo, we'll do simple comparison (NOT SECURE FOR PRODUCTION)
    if (user.password !== password) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    user.lastLoginAt = new Date().toISOString();
    writeDB(db);

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      success: true,
      user: userWithoutPassword,
      token: "demo-jwt-token-" + uuidv4(), // In production, use real JWT
    });
  } else {
    return res.status(400).json({ error: "Invalid auth method" });
  }
});

// POST /api/auth/google
app.post("/api/auth/google", (req, res) => {
  const { token } = req.body;
  
  if (!token) {
    return res.status(400).json({ error: "Google token is required" });
  }

  // In production, verify the Google token with Google's API
  // For demo purposes, we'll create a user from the token
  const db = readDB();
  
  // Demo: Extract email from token (in production, verify with Google)
  // For now, we'll just create a demo user
  const demoUser = {
    id: uuidv4(),
    email: AUTHORIZED_EMAIL,
    name: "Demo User",
    picture: null,
    googleId: "demo-google-id",
    role: UserRole.ADMIN,
    authMethod: AuthMethod.GOOGLE,
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
  };

  // Check if user exists
  let user = db.users.find((u) => u.email === demoUser.email);
  if (!user) {
    user = demoUser;
    db.users.push(user);
    writeDB(db);
  } else {
    user.lastLoginAt = new Date().toISOString();
    writeDB(db);
  }

  // Remove password from response if exists
  const { password: _, ...userWithoutPassword } = user;

  res.json({
    success: true,
    user: userWithoutPassword,
    token: "demo-jwt-token-" + uuidv4(), // In production, use real JWT
  });
});

// GET /api/auth/me
app.get("/api/auth/me", (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "Authorization required" });
  }

  // In production, verify JWT and extract user
  // For demo, return the authorized user
  const db = readDB();
  const userEmail = authHeader.replace("Bearer ", "");
  const user = db.users.find((u) => u.email === userEmail || u.username === userEmail);
  
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  // Remove password from response
  const { password: _, ...userWithoutPassword } = user;

  res.json(userWithoutPassword);
});

// POST /api/auth/logout
app.post("/api/auth/logout", (req, res) => {
  // In production, invalidate JWT token
  res.json({ success: true, message: "Logged out successfully" });
});

// ─── User Management Endpoints (Admin only) ───────────────────────
// GET /api/users
app.get("/api/users", (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "Authorization required" });
  }

  const db = readDB();
  const requestingUser = db.users.find((u) => u.email === authHeader.replace("Bearer ", ""));
  
  if (!requestingUser || requestingUser.role !== UserRole.ADMIN) {
    return res.status(403).json({ error: "Admin access required" });
  }

  // Remove passwords from response
  const usersWithoutPasswords = db.users.map(({ password: _, ...user }) => user);
  res.json(usersWithoutPasswords);
});

// POST /api/users - Create new user (Admin only)
app.post("/api/users", (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "Authorization required" });
  }

  const db = readDB();
  const requestingUser = db.users.find((u) => u.email === authHeader.replace("Bearer ", ""));
  
  if (!requestingUser || requestingUser.role !== UserRole.ADMIN) {
    return res.status(403).json({ error: "Admin access required" });
  }

  const { username, password, email, name, role } = req.body;

  if (!username || !password || !email || !name) {
    return res.status(400).json({ error: "Username, password, email, and name are required" });
  }

  // Check if username or email already exists
  if (db.users.find((u) => u.username === username)) {
    return res.status(400).json({ error: "Username already exists" });
  }
  if (db.users.find((u) => u.email === email)) {
    return res.status(400).json({ error: "Email already exists" });
  }

  const newUser = {
    id: uuidv4(),
    username,
    password, // In production, hash this with bcrypt
    email: email.toLowerCase(),
    name,
    role: role || UserRole.USER,
    authMethod: AuthMethod.USERNAME_PASSWORD,
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
  };

  db.users.push(newUser);
  writeDB(db);

  // Remove password from response
  const { password: _, ...userWithoutPassword } = newUser;

  res.status(201).json(userWithoutPassword);
});

// PUT /api/users/:id - Update user (Admin only)
app.put("/api/users/:id", (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "Authorization required" });
  }

  const db = readDB();
  const requestingUser = db.users.find((u) => u.email === authHeader.replace("Bearer ", ""));
  
  if (!requestingUser || requestingUser.role !== UserRole.ADMIN) {
    return res.status(403).json({ error: "Admin access required" });
  }

  const userId = req.params.id;
  const userIndex = db.users.findIndex((u) => u.id === userId);

  if (userIndex === -1) {
    return res.status(404).json({ error: "User not found" });
  }

  const { name, role, password } = req.body;

  // Update user
  if (name) db.users[userIndex].name = name;
  if (role) db.users[userIndex].role = role;
  if (password) db.users[userIndex].password = password; // In production, hash this

  db.users[userIndex].updatedAt = new Date().toISOString();
  writeDB(db);

  // Remove password from response
  const { password: _, ...userWithoutPassword } = db.users[userIndex];

  res.json(userWithoutPassword);
});

// DELETE /api/users/:id - Delete user (Admin only)
app.delete("/api/users/:id", (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "Authorization required" });
  }

  const db = readDB();
  const requestingUser = db.users.find((u) => u.email === authHeader.replace("Bearer ", ""));
  
  if (!requestingUser || requestingUser.role !== UserRole.ADMIN) {
    return res.status(403).json({ error: "Admin access required" });
  }

  const userId = req.params.id;

  // Prevent deleting yourself
  if (userId === requestingUser.id) {
    return res.status(400).json({ error: "Cannot delete your own account" });
  }

  const userIndex = db.users.findIndex((u) => u.id === userId);

  if (userIndex === -1) {
    return res.status(404).json({ error: "User not found" });
  }

  db.users.splice(userIndex, 1);
  writeDB(db);

  res.json({ success: true, message: "User deleted successfully" });
});

// ═══════════════════════════════════════════════════════════════
// COMPANY MANAGEMENT (SaaS Multi-Company Architecture)
// ═══════════════════════════════════════════════════════════════

// GET /api/companies
app.get("/api/companies", (req, res) => {
  const db = readDB();
  res.json(db.companies || []);
});

// GET /api/companies/:id
app.get("/api/companies/:id", (req, res) => {
  const db = readDB();
  const company = db.companies?.find((c) => c.id === req.params.id);
  if (!company) {
    return res.status(404).json({ error: "Company not found" });
  }
  res.json(company);
});

// POST /api/companies
app.post("/api/companies", (req, res) => {
  const { name, domain, contactEmail, contactPhone, address } = req.body;

  if (!name || !contactEmail || !contactPhone) {
    return res.status(400).json({ error: "Name, contact email, and contact phone are required" });
  }

  const db = readDB();
  const company = {
    id: uuidv4(),
    name: String(name).trim(),
    domain: domain ? String(domain).trim() : undefined,
    contactEmail: String(contactEmail).trim().toLowerCase(),
    contactPhone: String(contactPhone).trim(),
    address: address || undefined,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.companies = db.companies || [];
  db.companies.push(company);
  writeDB(db);

  res.status(201).json(company);
});

// PUT /api/companies/:id
app.put("/api/companies/:id", (req, res) => {
  const { name, domain, contactEmail, contactPhone, address, isActive } = req.body;

  const db = readDB();
  const idx = db.companies?.findIndex((c) => c.id === req.params.id);

  if (idx === -1) {
    return res.status(404).json({ error: "Company not found" });
  }

  const company = db.companies[idx];
  if (name) company.name = String(name).trim();
  if (domain !== undefined) company.domain = domain ? String(domain).trim() : undefined;
  if (contactEmail) company.contactEmail = String(contactEmail).trim().toLowerCase();
  if (contactPhone) company.contactPhone = String(contactPhone).trim();
  if (address !== undefined) company.address = address;
  if (isActive !== undefined) company.isActive = isActive;
  company.updatedAt = new Date().toISOString();

  writeDB(db);
  res.json(company);
});

// DELETE /api/companies/:id
app.delete("/api/companies/:id", (req, res) => {
  const db = readDB();
  const idx = db.companies?.findIndex((c) => c.id === req.params.id);

  if (idx === -1) {
    return res.status(404).json({ error: "Company not found" });
  }

  db.companies.splice(idx, 1);
  writeDB(db);
  res.json({ success: true, message: "Company deleted successfully" });
});

// ═══════════════════════════════════════════════════════════════
// SUBSCRIPTION MANAGEMENT
// ═══════════════════════════════════════════════════════════════

// GET /api/subscriptions
app.get("/api/subscriptions", (req, res) => {
  const db = readDB();
  res.json(db.subscriptions || []);
});

// GET /api/subscriptions/:id
app.get("/api/subscriptions/:id", (req, res) => {
  const db = readDB();
  const subscription = db.subscriptions?.find((s) => s.id === req.params.id);
  if (!subscription) {
    return res.status(404).json({ error: "Subscription not found" });
  }
  res.json(subscription);
});

// GET /api/companies/:companyId/subscription
app.get("/api/companies/:companyId/subscription", (req, res) => {
  const db = readDB();
  const subscription = db.subscriptions?.find((s) => s.companyId === req.params.companyId);
  if (!subscription) {
    return res.status(404).json({ error: "Subscription not found for this company" });
  }
  res.json(subscription);
});

// POST /api/subscriptions
app.post("/api/subscriptions", (req, res) => {
  const { companyId, plan, products, autoRenew } = req.body;

  if (!companyId || !plan) {
    return res.status(400).json({ error: "Company ID and plan are required" });
  }

  const db = readDB();
  
  // Check if company exists
  const company = db.companies?.find((c) => c.id === companyId);
  if (!company) {
    return res.status(404).json({ error: "Company not found" });
  }

  // Calculate subscription dates based on plan
  const startDate = new Date();
  const endDate = new Date();
  
  if (plan.includes("yearly")) {
    endDate.setFullYear(endDate.getFullYear() + 1);
  } else {
    endDate.setMonth(endDate.getMonth() + 1);
  }

  // Add trial period for non-free plans
  let trialEndDate = undefined;
  if (plan !== SubscriptionPlan.FREE) {
    trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 14); // 14-day trial
  }

  // Initialize product licenses
  const productLicenses = [];
  if (products && Array.isArray(products)) {
    products.forEach((productType) => {
      if (Object.values(ProductType).includes(productType)) {
        productLicenses.push({
          productType,
          isEnabled: true,
          usageLimit: plan.includes("enterprise") ? 100000 : plan.includes("pro") ? 10000 : 1000,
          currentUsage: 0,
          resetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
        });
      }
    });
  }

  const subscription = {
    id: uuidv4(),
    companyId,
    plan,
    status: SubscriptionStatus.ACTIVE,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    trialEndDate: trialEndDate?.toISOString(),
    autoRenew: autoRenew !== undefined ? autoRenew : true,
    products: productLicenses,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.subscriptions = db.subscriptions || [];
  db.subscriptions.push(subscription);
  writeDB(db);

  res.status(201).json(subscription);
});

// PUT /api/subscriptions/:id
app.put("/api/subscriptions/:id", (req, res) => {
  const { plan, status, autoRenew, products } = req.body;

  const db = readDB();
  const idx = db.subscriptions?.findIndex((s) => s.id === req.params.id);

  if (idx === -1) {
    return res.status(404).json({ error: "Subscription not found" });
  }

  const subscription = db.subscriptions[idx];
  if (plan) subscription.plan = plan;
  if (status) subscription.status = status;
  if (autoRenew !== undefined) subscription.autoRenew = autoRenew;
  if (products) {
    subscription.products = products;
  }
  subscription.updatedAt = new Date().toISOString();

  writeDB(db);
  res.json(subscription);
});

// DELETE /api/subscriptions/:id
app.delete("/api/subscriptions/:id", (req, res) => {
  const db = readDB();
  const idx = db.subscriptions?.findIndex((s) => s.id === req.params.id);

  if (idx === -1) {
    return res.status(404).json({ error: "Subscription not found" });
  }

  db.subscriptions.splice(idx, 1);
  writeDB(db);
  res.json({ success: true, message: "Subscription deleted successfully" });
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
      smsDelay: {
        id: uuidv4(),
        type: "sms",
        delayMs: 600,
        randomDelayMin: 300,
        randomDelayMax: 1000,
        batchSize: 5,
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
  const validTypes = ["whatsapp", "email", "sms"];
  
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
    status: ContactStatus.ACTIVE,
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
  const authHeader = req.headers.authorization;
  const userEmail = authHeader ? authHeader.replace("Bearer ", "") : null;
  
  // Only allow authorized email to delete all contacts
  if (userEmail !== AUTHORIZED_EMAIL) {
    return res.status(403).json({ error: "You don't have permission to delete all contacts" });
  }
  
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
  const { message, contactIds, hasReplyButtons, replyOptions } = req.body;

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

// ═══════════════════════════════════════════════════════════════
//  SMS CAMPAIGNS — HTTP API based SMS Gateway (SMSForwarder/Android)
// ═══════════════════════════════════════════════════════════════

// SMS Gateway Configuration - Update these to match your SMS gateway
const SMS_GATEWAY_CONFIG = {
  enabled: true,
  apiUrl: process.env.SMS_GATEWAY_URL || "http://localhost:8080", // SMSForwarder default
  apiKey: process.env.SMS_GATEWAY_API_KEY || "", // Optional API key if your gateway requires it
  timeout: 10000, // 10 seconds timeout
};

// ── Helper: send single SMS via HTTP API ─────────────────────
async function sendSmsViaHttpApi(phone, message) {
  try {
    // SMSForwarder API format (adjust based on your gateway)
    const response = await fetch(`${SMS_GATEWAY_CONFIG.apiUrl}/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(SMS_GATEWAY_CONFIG.apiKey && { "X-API-Key": SMS_GATEWAY_CONFIG.apiKey }),
      },
      body: JSON.stringify({
        to: phone,
        message: message,
      }),
      signal: AbortSignal.timeout(SMS_GATEWAY_CONFIG.timeout),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`SMS Gateway error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    return {
      success: true,
      sid: result.sid || result.messageId || null,
      data: result,
    };
  } catch (err) {
    console.error("SMS Gateway Error:", err.message);
    return {
      success: false,
      error: err.message,
    };
  }
}

// ── Helper: check SMS Gateway status ─────────────────────────
async function checkSmsGatewayStatus() {
  try {
    const response = await fetch(`${SMS_GATEWAY_CONFIG.apiUrl}/status`, {
      method: "GET",
      headers: {
        ...(SMS_GATEWAY_CONFIG.apiKey && { "X-API-Key": SMS_GATEWAY_CONFIG.apiKey }),
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      throw new Error(`SMS Gateway not responding: ${response.status}`);
    }

    const result = await response.json();
    return {
      connected: true,
      device: result.device || result.phone || "SMS Gateway",
      message: "SMS Gateway is connected and ready",
      details: result,
    };
  } catch (err) {
    return {
      connected: false,
      device: null,
      message: `SMS Gateway not reachable: ${err.message}. Please ensure your SMS gateway app (e.g., SMSForwarder) is running and accessible at ${SMS_GATEWAY_CONFIG.apiUrl}`,
    };
  }
}

// ── Helper: format phone to E.164 ────────────────────────────
function formatPhone(phone) {
  let p = String(phone).replace(/\D/g, "");
  if (p.length === 10) return "+91" + p;
  if (p.length === 12 && p.startsWith("91")) return "+" + p;
  if (p.startsWith("+")) return phone.replace(/\s/g, "");
  return "+" + p;
}

// GET /api/sms/gateway-status  — check if SMS gateway is connected
app.get("/api/sms/gateway-status", async (req, res) => {
  const status = await checkSmsGatewayStatus();
  res.json(status);
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

  // Check SMS Gateway status
  const gatewayStatus = await checkSmsGatewayStatus();
  if (!gatewayStatus.connected) {
    return res.status(400).json({
      error: gatewayStatus.message || "SMS Gateway not connected. Please ensure your SMS gateway app (e.g., SMSForwarder) is running.",
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
    device: gatewayStatus.device || "SMS Gateway",
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

  // Get delay settings
  const settings = db.settings[0];
  const smsDelaySettings = settings?.smsDelay || {
    delayMs: 600,
    randomDelayMin: 300,
    randomDelayMax: 1000,
    enabled: false,
  };

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

    const result = await sendSmsViaHttpApi(phone, message);

    if (result.success) {
      log.status = "sent";
      log.sentAt = new Date().toISOString();
      log.sid = result.sid || null;

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

    // Apply delay based on settings
    if (smsDelaySettings.enabled) {
      const randomDelay = smsDelaySettings.randomDelayMin + Math.random() * (smsDelaySettings.randomDelayMax - smsDelaySettings.randomDelayMin);
      await new Promise((r) => setTimeout(r, smsDelaySettings.delayMs + randomDelay));
    } else {
      await new Promise((r) => setTimeout(r, 600)); // Default delay
    }
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

// ═══════════════════════════════════════════════════════════════
// WHATSAPP CLOUD API ENDPOINTS (Graph API v20.0)
// ═══════════════════════════════════════════════════════════════

// POST /api/whatsapp-cloud/send-message
app.post("/api/whatsapp-cloud/send-message", async (req, res) => {
  const { companyId, messageType, recipients, templateName, templateVariables, media, buttons, ctaUrl } = req.body;

  if (!companyId || !messageType || !recipients || !Array.isArray(recipients)) {
    return res.status(400).json({ error: "companyId, messageType, and recipients array are required" });
  }

  // Check if company has WhatsApp subscription
  const db = readDB();
  const subscription = db.subscriptions?.find((s) => s.companyId === companyId);
  if (!subscription) {
    return res.status(403).json({ error: "No subscription found for this company" });
  }

  const whatsappLicense = subscription.products?.find((p) => p.productType === ProductType.WHATSAPP);
  if (!whatsappLicense || !whatsappLicense.isEnabled) {
    return res.status(403).json({ error: "WhatsApp module not enabled for this company" });
  }

  // Check usage limit
  if (whatsappLicense.currentUsage >= whatsappLicense.usageLimit) {
    return res.status(429).json({ error: "WhatsApp usage limit exceeded" });
  }

  const results = [];
  let successCount = 0;
  let failedCount = 0;

  for (const recipient of recipients) {
    const result = await sendWhatsAppCloudMessage(
      recipient,
      messageType,
      templateName,
      templateVariables,
      media,
      buttons,
      ctaUrl
    );

    if (result.success) {
      successCount++;
      // Update usage
      whatsappLicense.currentUsage++;
    } else {
      failedCount++;
    }

    results.push({
      recipient,
      success: result.success,
      messageId: result.messageId,
      error: result.error,
    });

    // Small delay to avoid rate limiting
    await new Promise((r) => setTimeout(r, 1000));
  }

  // Update subscription in DB
  const subIdx = db.subscriptions.findIndex((s) => s.id === subscription.id);
  if (subIdx !== -1) {
    db.subscriptions[subIdx].products = subscription.products;
    db.subscriptions[subIdx].updatedAt = new Date().toISOString();
    writeDB(db);
  }

  res.json({
    success: true,
    totalRecipients: recipients.length,
    sentCount: successCount,
    failedCount,
    results,
  });
});

// POST /api/whatsapp-cloud/upload-media
app.post("/api/whatsapp-cloud/upload-media", upload.single("media"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Media file is required" });
  }

  const result = await uploadMediaToWhatsApp(req.file);

  if (result.success) {
    res.json({
      success: true,
      mediaId: result.mediaId,
      data: result.data,
    });
  } else {
    res.status(500).json({
      success: false,
      error: result.error,
    });
  }
});

// ═══════════════════════════════════════════════════════════════
// WHATSAPP WEBHOOK SYSTEM
// ═══════════════════════════════════════════════════════════════

// GET /api/whatsapp-webhook - Meta verification
app.get("/api/whatsapp-webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === WHATSAPP_CONFIG.webhookVerifyToken) {
    console.log("Webhook verified successfully");
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// POST /api/whatsapp-webhook - Event receiver
app.post("/api/whatsapp-webhook", async (req, res) => {
  try {
    const webhookEvent = req.body;

    // Store webhook event for processing
    const db = readDB();
    const event = {
      id: uuidv4(),
      event: webhookEvent,
      receivedAt: new Date().toISOString(),
      processed: false,
    };

    db.webhook_events = db.webhook_events || [];
    db.webhook_events.push(event);
    writeDB(db);

    console.log("Webhook event received:", JSON.stringify(webhookEvent, null, 2));

    // Process messages and button clicks
    if (webhookEvent.entry && webhookEvent.entry[0]?.changes) {
      for (const change of webhookEvent.entry[0].changes) {
        if (change.field === "messages" && change.value?.messages) {
          for (const message of change.value.messages) {
            // Handle button clicks
            if (message.interactive?.button_reply) {
              console.log("Button clicked:", message.interactive.button_reply);
              // Trigger automated follow-up flow based on payload
              await handleButtonReply(message, change.value.metadata.phone_number_id);
            }
            // Handle list replies
            else if (message.interactive?.list_reply) {
              console.log("List item selected:", message.interactive.list_reply);
              await handleListReply(message, change.value.metadata.phone_number_id);
            }
            // Handle text messages
            else if (message.text) {
              console.log("Text message received:", message.text.body);
              await handleTextMessage(message, change.value.metadata.phone_number_id);
            }
          }
        }
        // Handle message status updates
        else if (change.field === "messages" && change.value?.statuses) {
          for (const status of change.value.statuses) {
            console.log("Message status update:", status.status, "for message:", status.id);
            await updateMessageStatus(status);
          }
        }
      }
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Webhook processing error:", error);
    res.status(500).json({ error: "Webhook processing failed" });
  }
});

// ─── Webhook Handler Functions ───────────────────────────────────
async function handleButtonReply(message, phoneNumberId) {
  const db = readDB();
  const { from, interactive } = message;
  const { payload, title } = interactive.button_reply;

  // Store or process the button reply
  console.log(`Button reply from ${from}: ${title} (payload: ${payload})`);

  // You can trigger automated follow-up flows here based on payload
  // Example: if payload === "interested", send follow-up message
}

async function handleListReply(message, phoneNumberId) {
  const db = readDB();
  const { from, interactive } = message;
  const { id, title } = interactive.list_reply;

  console.log(`List reply from ${from}: ${title} (id: ${id})`);
}

async function handleTextMessage(message, phoneNumberId) {
  const db = readDB();
  const { from, text } = message;

  console.log(`Text message from ${from}: ${text.body}`);
}

async function updateMessageStatus(status) {
  const db = readDB();
  const { id: messageId, status: messageStatus, recipient_id } = status;

  // Update campaign log status based on WhatsApp message status
  // This would require mapping WhatsApp message IDs to campaign log IDs
  console.log(`Message ${messageId} status updated to ${messageStatus} for recipient ${recipient_id}`);
}

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