const { v4: uuidv4 } = require("uuid");
const { Buttons, List, Poll } = require("whatsapp-web.js");
const { readDB, writeDB } = require("../utils/db");
const { waClient, isReady } = require("../utils/waClient");

class WhatsappInteractiveService {
  // Templates
  async getTemplates() {
    const db = readDB();
    return db.whatsapp_templates || [];
  }

  async createTemplate(templateData) {
    const db = readDB();
    const template = {
      id: uuidv4(),
      ...templateData,
      createdAt: new Date().toISOString(),
    };
    db.whatsapp_templates.push(template);
    writeDB(db);
    return template;
  }

  async updateTemplate(id, templateData) {
    const db = readDB();
    const idx = db.whatsapp_templates.findIndex((t) => t.id === id);
    if (idx === -1) throw new Error("Template not found");

    db.whatsapp_templates[idx] = {
      ...db.whatsapp_templates[idx],
      ...templateData,
    };
    writeDB(db);
    return db.whatsapp_templates[idx];
  }

  async deleteTemplate(id) {
    const db = readDB();
    db.whatsapp_templates = db.whatsapp_templates.filter((t) => t.id !== id);
    writeDB(db);
    return { success: true };
  }

  // Messaging
  async sendInteractive(payload) {
    const { templateId, contactIds, siteId } = payload;
    if (!isReady()) throw new Error("WhatsApp not ready");

    const db = readDB();
    const template = db.whatsapp_templates.find((t) => t.id === templateId);
    if (!template) throw new Error("Template not found");

    let targets = db.contacts.filter((c) => contactIds.includes(c.id) && c.phone);
    if (siteId && siteId !== "all") {
      targets = targets.filter((c) => c.siteId === siteId);
    }

    if (targets.length === 0) throw new Error("No valid contacts found");

    const campaign = {
      id: uuidv4(),
      templateId,
      message: template.body,
      totalTargets: targets.length,
      sentCount: 0,
      failedCount: 0,
      status: "pending",
      createdAt: new Date().toISOString(),
      completedAt: null,
      logs: [],
    };

    db.interactive_campaigns.push(campaign);
    writeDB(db);

    const logs = [];
    const settings = db.settings[0] || {};
    const delaySettings = settings.whatsappDelay || { delayMs: 2000, enabled: false };

    for (const contact of targets) {
      try {
        const normalized = this._normalizeNumber(contact.phone);
        const numberId = await waClient.getNumberId(normalized);
        if (!numberId) throw new Error("Number not registered");

        let messageObject;
        const body = template.body.replace(/\{name\}/gi, contact.name);

        if (template.type === "poll") {
          const options = template.pollOptions.slice(0, 12).map((b) => b.text);
          let pollName = body;
          if (template.header) pollName = `${template.header}\n${body}`;
          if (template.footer) pollName = `${pollName}\n${template.footer}`;

          messageObject = new Poll(pollName, options, { allowMultipleAnswers: false });
        } else if (template.type === "list") {
          let options = [];
          template.listSections.forEach(s => {
             s.rows.forEach(r => options.push(r.title));
          });
          options = options.slice(0, 12);

          let pollName = body;
          if (template.header) pollName = `${template.header}\n${body}`;
          if (template.footer) pollName = `${pollName}\n${template.footer}`;

          messageObject = new Poll(pollName, options, { allowMultipleAnswers: false });
        } else if (template.type === "cta") {
          // whatsapp-web.js doesn't natively support CTA URL buttons easily in all versions
          // We'll send it as a regular message with the link if it fails, or try a simulated button
          // For now, let's try a regular button if URL buttons aren't supported
          messageObject = `${body}\n\n${template.cta.text}: ${template.cta.url}`;
          if (template.footer) messageObject += `\n\n${template.footer}`;
        } else if (template.type === "quick_reply") {
          // Use Buttons class for quick reply messages
          const buttonBody = body;
          const buttons = template.quickReplyOptions.slice(0, 3).map((b, index) => ({
            body: b.text,
            id: b.id || `btn_${index}`
          }));

          let buttonMessage = buttonBody;
          if (template.header) buttonMessage = `${template.header}\n\n${buttonBody}`;
          if (template.footer) buttonMessage = `${buttonMessage}\n\n${template.footer}`;

          messageObject = new Buttons(buttonMessage, buttons, template.header || "", template.footer || "");
        }

        await waClient.sendMessage(numberId._serialized, messageObject);

        const sentAt = new Date().toISOString();
        logs.push({
          id: uuidv4(),
          campaignId: campaign.id,
          templateId,
          contactId: contact.id,
          contactName: contact.name,
          contactPhone: contact.phone,
          status: "sent",
          sentAt,
          error: null,
        });

        // Update contact stats
        const dbNow = readDB();
        const c = dbNow.contacts.find((x) => x.id === contact.id);
        if (c) {
          c.whatsappSentCount = (c.whatsappSentCount || 0) + 1;
          c.lastWhatsappSentAt = sentAt;
          writeDB(dbNow);
        }

        if (delaySettings.enabled) {
          await new Promise((r) => setTimeout(r, delaySettings.delayMs));
        } else {
          await new Promise((r) => setTimeout(r, 1000));
        }
      } catch (err) {
        logs.push({
          id: uuidv4(),
          campaignId: campaign.id,
          templateId,
          contactId: contact.id,
          contactName: contact.name,
          contactPhone: contact.phone,
          status: "failed",
          sentAt: null,
          error: err.message,
        });
      }
    }

    const dbFinal = readDB();
    logs.forEach((l) => dbFinal.interactive_logs.push(l));
    const camp = dbFinal.interactive_campaigns.find((c) => c.id === campaign.id);
    if (camp) {
      camp.sentCount = logs.filter((l) => l.status === "sent").length;
      camp.failedCount = logs.filter((l) => l.status === "failed").length;
      camp.status = "sent";
      camp.completedAt = new Date().toISOString();
      camp.logs = logs;
    }
    writeDB(dbFinal);

    this._updateAnalytics(campaign.id);

    return campaign;
  }

  async getLogs() {
    const db = readDB();
    return db.interactive_logs || [];
  }

  async getResponses() {
    const db = readDB();
    return db.interactive_responses || [];
  }

  async handleResponse(msg) {
    if (!msg.type || (msg.type !== "buttons_response" && msg.type !== "list_response")) return;

    const selectedOption = msg.type === "buttons_response" ? msg.selectedButtonId : msg.selectedRowId;
    const from = msg.from.split("@")[0];

    // For button responses, try to get the button text for better readability
    let displayOption = selectedOption;
    if (msg.type === "buttons_response") {
      const log = this._findLatestLogForNumber(from);
      if (log && log.templateId) {
        const db = readDB();
        const template = db.whatsapp_templates.find((t) => t.id === log.templateId);
        if (template && template.type === "quick_reply" && template.quickReplyOptions) {
          const button = template.quickReplyOptions.find((b) => b.id === selectedOption);
          if (button) displayOption = button.text;
        }
      }
    }

    await this._recordResponse(from, displayOption);
  }

  async handleVoteUpdate(vote) {
    if (!vote || !vote.selectedOptions || vote.selectedOptions.length === 0) return;
    
    // Using the first selected option
    const selectedOption = vote.selectedOptions[0].name;
    const from = vote.voter.split("@")[0];

    await this._recordResponse(from, displayOption);
  }

  _findLatestLogForNumber(phoneNumber) {
    const db = readDB();
    const logs = db.interactive_logs || [];
    return logs
      .filter((l) => l.contactPhone && this._normalizeNumber(l.contactPhone) === phoneNumber)
      .sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt))[0];
  }

  async _recordResponse(from, selectedOption) {
    const db = readDB();
    const contact = db.contacts.find((c) => this._normalizeNumber(c.phone) === from);
    
    // Find latest campaign for this contact
    const log = db.interactive_logs
      .filter((l) => l.contactPhone && this._normalizeNumber(l.contactPhone) === from)
      .sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt))[0];

    if (contact && log) {
      const response = {
        id: uuidv4(),
        campaignId: log.campaignId,
        contactId: contact.id,
        contactName: contact.name,
        contactPhone: contact.phone,
        selectedOption,
        responseAt: new Date().toISOString(),
      };
      db.interactive_responses.push(response);
      writeDB(db);
      this._updateAnalytics(log.campaignId);
    }
  }

  async getAnalytics(campaignId) {
    const db = readDB();
    let analytics = db.campaign_analytics.find((a) => a.campaignId === campaignId);
    if (!analytics) {
      analytics = this._updateAnalytics(campaignId);
    }
    return analytics;
  }

  _updateAnalytics(campaignId) {
    const db = readDB();
    const campaign = db.interactive_campaigns.find((c) => c.id === campaignId);
    if (!campaign) return null;

    const logs = db.interactive_logs.filter((l) => l.campaignId === campaignId);
    const responses = db.interactive_responses.filter((r) => r.campaignId === campaignId);

    const totalSent = logs.filter((l) => l.status === "sent").length;
    const delivered = totalSent; // Simplified
    const failed = logs.filter((l) => l.status === "failed").length;
    const responseCount = responses.length;
    const engagementRate = totalSent > 0 ? (responseCount / totalSent) * 100 : 0;

    const analytics = {
      campaignId,
      totalSent,
      delivered,
      failed,
      responseCount,
      engagementRate,
    };

    const idx = db.campaign_analytics.findIndex((a) => a.campaignId === campaignId);
    if (idx !== -1) {
      db.campaign_analytics[idx] = analytics;
    } else {
      db.campaign_analytics.push(analytics);
    }
    writeDB(db);
    return analytics;
  }

  _normalizeNumber(number) {
    let n = String(number || "").replace(/\D/g, "");
    if (!n) return "";
    if (n.startsWith("0")) n = n.slice(1);
    if (n.length === 10) n = `91${n}`;
    return n;
  }
}

module.exports = new WhatsappInteractiveService();
