import axios from "axios";
import {
  Contact,
  EmailCampaign,
  WhatsAppCampaign,
  SmsCampaign,
  UploadSession,
  SendEmailPayload,
  SendWhatsAppPayload,
  SendSmsPayload,
  User,
  AuthResponse,
  AppSettings,
  DelaySettings,
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

// ─── SMS ──────────────────────────────────────────────────────
export const getSmsCampaigns = () =>
  api.get<SmsCampaign[]>("/sms-campaigns").then((r) => r.data);

export const sendSmsCampaign = (payload: SendSmsPayload) =>
  api.post("/sms-campaigns/send", payload).then((r) => r.data);

export const getAdbStatus = () =>
  api.get<{ connected: boolean; device: string | null; message: string }>("/sms/adb-status").then((r) => r.data);

// ─── Authentication ─────────────────────────────────────────────
export const googleLogin = (token: string) =>
  api.post<AuthResponse>("/auth/google", { token }).then((r) => r.data);

export const getCurrentUser = () =>
  api.get<User>("/auth/me").then((r) => r.data);

export const logout = () =>
  api.post("/auth/logout").then((r) => r.data);

// ─── Settings ─────────────────────────────────────────────────────
export const getSettings = () =>
  api.get<AppSettings>("/settings").then((r) => r.data);

export const updateSettings = (settings: Partial<AppSettings>) =>
  api.put<AppSettings>("/settings", settings).then((r) => r.data);

export const updateDelaySettings = (type: "whatsapp" | "email" | "sms", settings: Partial<DelaySettings>) =>
  api.put<DelaySettings>(`/settings/delay/${type}`, settings).then((r) => r.data);
