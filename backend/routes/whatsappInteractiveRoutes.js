const express = require("express");
const router = express.Router();
const whatsappInteractiveController = require("../controllers/whatsappInteractiveController");

// Templates
router.get("/templates", whatsappInteractiveController.getTemplates);
router.post("/templates", whatsappInteractiveController.createTemplate);
router.put("/templates/:id", whatsappInteractiveController.updateTemplate);
router.delete("/templates/:id", whatsappInteractiveController.deleteTemplate);

// Interactive Messaging
router.post("/send-interactive", whatsappInteractiveController.sendInteractive);
router.get("/interactive-logs", whatsappInteractiveController.getLogs);
router.get("/responses", whatsappInteractiveController.getResponses);

// Analytics
router.get("/analytics/:campaignId", whatsappInteractiveController.getAnalytics);

module.exports = router;
