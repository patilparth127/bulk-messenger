const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode");

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

waClient.on("message", async (msg) => {
  try {
    const whatsappInteractiveService = require("../services/whatsappInteractiveService");
    await whatsappInteractiveService.handleResponse(msg);
  } catch (error) {
    console.error("Error handling WhatsApp message:", error);
  }
});

waClient.on("vote_update", async (vote) => {
  try {
    const whatsappInteractiveService = require("../services/whatsappInteractiveService");
    await whatsappInteractiveService.handleVoteUpdate(vote);
  } catch (error) {
    console.error("Error handling WhatsApp vote:", error);
  }
});

waClient.initialize().catch((err) => {
  waReady = false;
  waStatus = "INIT_FAILED";
  waLastError = err.message;
  console.error("❌ WhatsApp initialize failed:", err.message);
});

function getStatus() {
  return {
    waReady,
    waStatus,
    hasQr: !!waLastQr,
    qrDataUrl: waLastQrDataUrl,
    lastError: waLastError,
  };
}

module.exports = {
  waClient,
  getStatus,
  isReady: () => waReady,
};
