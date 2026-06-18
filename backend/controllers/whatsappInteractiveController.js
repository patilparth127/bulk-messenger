const whatsappInteractiveService = require("../services/whatsappInteractiveService");

class WhatsappInteractiveController {
  async getTemplates(req, res) {
    try {
      const templates = await whatsappInteractiveService.getTemplates();
      res.json(templates);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async createTemplate(req, res) {
    try {
      const template = await whatsappInteractiveService.createTemplate(req.body);
      res.status(201).json(template);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async updateTemplate(req, res) {
    try {
      const template = await whatsappInteractiveService.updateTemplate(req.params.id, req.body);
      res.json(template);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async deleteTemplate(req, res) {
    try {
      await whatsappInteractiveService.deleteTemplate(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async sendInteractive(req, res) {
    try {
      const campaign = await whatsappInteractiveService.sendInteractive(req.body);
      res.json({ success: true, campaign });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async getLogs(req, res) {
    try {
      const logs = await whatsappInteractiveService.getLogs();
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async getResponses(req, res) {
    try {
      const responses = await whatsappInteractiveService.getResponses();
      res.json(responses);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async getAnalytics(req, res) {
    try {
      const analytics = await whatsappInteractiveService.getAnalytics(req.params.campaignId);
      res.json(analytics);
    } catch (error) {
      res.status(404).json({ error: error.message });
    }
  }
}

module.exports = new WhatsappInteractiveController();
