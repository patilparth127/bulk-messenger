import axios from "axios";
import {
  Contact,
  EmailCampaign,
  WhatsAppCampaign,
  UploadSession,
  SendEmailPayload,
  SendWhatsAppPayload,
  User,
  AuthResponse,
  AppSettings,
  DelaySettings,
  ContactStatus,
  Site,
  WhatsAppTemplate,
  SendInteractivePayload,
  InteractiveLog,
  InteractiveResponse,
  CampaignAnalytics,
} from "../types";

const BASE = "/api";

const api = axios.create({ baseURL: BASE });

// ─── Contacts ────────────────────────────────────────────────
export const getContacts = () =>
  api.get<Contact[]>("/contacts").then((r) => r.data);

export const createContact = (data: Partial<Contact>) =>
  api.post<Contact>("/contacts", data).then((r) => r.data);

export const deleteContact = (id: string) =>
  api.delete(`/contacts/${id}`).then((r) => r.data);

export const deleteAllContacts = () =>
  api.delete("/contacts").then((r) => r.data);

export const updateContactStatus = (id: string, status: ContactStatus) =>
  api.patch<Contact>(`/contacts/${id}/status`, { status }).then((r) => r.data);

// ─── Excel Upload ─────────────────────────────────────────────
export const uploadExcel = (file: File) => {
  const form = new FormData();
  form.append("file", file);
  return api
    .post<{ success: boolean; session: UploadSession; contacts: Contact[] }>(
      "/upload-excel",
      form,
      { headers: { "Content-Type": "multipart/form-data" } }
    )
    .then((r) => r.data);
};

// ─── Email ────────────────────────────────────────────────────
export const getEmailCampaigns = () =>
  api.get<EmailCampaign[]>("/email-campaigns").then((r) => r.data);

export const sendEmailCampaign = (payload: SendEmailPayload) =>
  api.post("/email-campaigns/send", payload).then((r) => r.data);

// ─── WhatsApp ─────────────────────────────────────────────────
export const getWhatsAppCampaigns = () =>
  api.get<WhatsAppCampaign[]>("/whatsapp-campaigns").then((r) => r.data);

export const sendWhatsAppCampaign = (payload: SendWhatsAppPayload) =>
  api.post("/whatsapp-campaigns/send", payload).then((r) => r.data);

// ─── Upload Sessions ──────────────────────────────────────────
export const getUploadSessions = () =>
  api.get<UploadSession[]>("/upload-sessions").then((r) => r.data);


// ─── Authentication ─────────────────────────────────────────────
export const login = (credentials: { email: string; password: string }) =>
  api.post<AuthResponse>("/auth/login", credentials).then((r) => r.data);

export const logout = () =>
  api.post("/auth/logout").then((r) => r.data);


// ─── Settings ─────────────────────────────────────────────────────
export const getSettings = () =>
  api.get<AppSettings>("/settings").then((r) => r.data);

export const updateSettings = (settings: Partial<AppSettings>) =>
  api.put<AppSettings>("/settings", settings).then((r) => r.data);

export const updateDelaySettings = (type: "whatsapp" | "email", settings: Partial<DelaySettings>) =>
  api.put<DelaySettings>(`/settings/delay/${type}`, settings).then((r) => r.data);

// ─── Sites ───────────────────────────────────────────────────────
export const getSites = () =>
  api.get<Site[]>("/sites").then((r) => r.data);

export const createSite = (data: Partial<Site>) =>
  api.post<Site>("/sites", data).then((r) => r.data);

export const updateSite = (id: string, data: Partial<Site>) =>
  api.put<Site>(`/sites/${id}`, data).then((r) => r.data);

export const deleteSite = (id: string) =>
  api.delete(`/sites/${id}`).then((r) => r.data);

// ─── WhatsApp Status ───────────────────────────────────────────────
export const getWhatsAppStatus = () =>
  api.get("/whatsapp-status").then((r) => r.data);

export const logoutWhatsApp = () =>
  api.post("/whatsapp-logout").then((r) => r.data);

// ─── WhatsApp Interactive ─────────────────────────────────────
export const getWhatsAppTemplates = () =>
  api.get<WhatsAppTemplate[]>("/whatsapp/templates").then((r) => r.data);

export const createWhatsAppTemplate = (data: Partial<WhatsAppTemplate>) =>
  api.post<WhatsAppTemplate>("/whatsapp/templates", data).then((r) => r.data);

export const updateWhatsAppTemplate = (id: string, data: Partial<WhatsAppTemplate>) =>
  api.put<WhatsAppTemplate>(`/whatsapp/templates/${id}`, data).then((r) => r.data);

export const deleteWhatsAppTemplate = (id: string) =>
  api.delete(`/whatsapp/templates/${id}`).then((r) => r.data);

export const sendInteractiveCampaign = (payload: SendInteractivePayload) =>
  api.post("/whatsapp/send-interactive", payload).then((r) => r.data);

export const getInteractiveLogs = () =>
  api.get<InteractiveLog[]>("/whatsapp/interactive-logs").then((r) => r.data);

export const getInteractiveResponses = () =>
  api.get<InteractiveResponse[]>("/whatsapp/responses").then((r) => r.data);

export const getCampaignAnalytics = (campaignId: string) =>
  api.get<CampaignAnalytics>(`/whatsapp/analytics/${campaignId}`).then((r) => r.data);



